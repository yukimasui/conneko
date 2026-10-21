import { describe, expect, it } from 'vitest';
import type { DeviceDefinition, TerminalDef } from '../devices/types';
import type { Diagram, DiagramWire } from '../model/diagram';
import source3p from '../devices/catalog/power-source-3p200v';
import { checkDiagram } from './checkDiagram';

const t = (id: string, role: TerminalDef['role'], extra: Partial<TerminalDef> = {}): TerminalDef => ({
  id,
  x: 0,
  y: 0,
  side: 'top',
  role,
  ...extra,
});

const base = { name: '', model: '', labelPrefix: 'X', width: 10, height: 10, svg: '' };

const breaker: DeviceDefinition = {
  ...base,
  type: 'test.breaker',
  category: 'breaker',
  terminals: ['1', '3', '5'].map((id) => t(id, 'line')).concat(['2', '4', '6'].map((id) => t(id, 'load'))),
  links: [
    { from: '1', to: '2', directed: true, protects: true },
    { from: '3', to: '4', directed: true, protects: true },
    { from: '5', to: '6', directed: true, protects: true },
  ],
  params: [{ key: 'ratedCurrent', label: '定格', options: [{ value: 10 }, { value: 20 }, { value: 30 }], default: 20 }],
  protectionCurrent: { param: 'ratedCurrent' },
};

const ac200 = { system: 'AC', minVoltage: 200, maxVoltage: 220, conductors: ['R', 'S', 'T'] } as const;
const motor: DeviceDefinition = {
  ...base,
  type: 'test.motor',
  category: 'load',
  terminals: [
    t('U', 'input', { accepts: { ...ac200, conductors: [...ac200.conductors] } }),
    t('V', 'input', { accepts: { ...ac200, conductors: [...ac200.conductors] } }),
    t('W', 'input', { accepts: { ...ac200, conductors: [...ac200.conductors] } }),
    t('E', 'ground'),
  ],
  distinctGroups: [['U', 'V', 'W']],
  loadCurrent: 15,
};

const lamp: DeviceDefinition = {
  ...base,
  type: 'test.lamp',
  category: 'control',
  terminals: [
    t('X1', 'input', { accepts: { system: 'DC', minVoltage: 21, maxVoltage: 27, conductors: ['+'] } }),
    t('X2', 'input', { accepts: { system: 'DC', minVoltage: 21, maxVoltage: 27, conductors: ['-'] } }),
  ],
};

const dcSource: DeviceDefinition = {
  ...base,
  type: 'test.dc',
  category: 'power-supply',
  terminals: [
    t('+V', 'supply', { supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 2 } }),
    t('-V', 'supply', { supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 2 } }),
  ],
};

const mil = { kind: 'MIL40', pins: 2, width: 40 };
const outputUnit: DeviceDefinition = {
  ...base,
  type: 'test.output-unit',
  category: 'plc',
  terminals: [t('CN1', 'connector', { connector: mil, optional: true })],
  pins: [
    { id: 'CN1#1', label: '+V', role: 'input', accepts: { system: 'DC', minVoltage: 20, maxVoltage: 28, conductors: ['+'] }, optional: true },
    { id: 'CN1#2', label: 'COM', role: 'input', accepts: { system: 'DC', minVoltage: 20, maxVoltage: 28, conductors: ['-'] }, optional: true },
  ],
};

const milTb: DeviceDefinition = {
  ...base,
  type: 'test.mil-tb',
  category: 'terminal',
  terminals: [t('CN', 'connector', { connector: mil, optional: true }), t('1', 'pass', { optional: true }), t('2', 'pass', { optional: true })],
  pins: [
    { id: 'CN#1', role: 'pass', optional: true },
    { id: 'CN#2', role: 'pass', optional: true },
  ],
  links: [
    { from: 'CN#1', to: '1' },
    { from: 'CN#2', to: '2' },
  ],
};

const defs = new Map([source3p, breaker, motor, lamp, dcSource, outputUnit, milTb].map((d) => [d.type, d]));
const lookup = (type: string) => defs.get(type);

let wireSeq = 0;
const wire = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return {
    id: `W${++wireSeq}`,
    from: { device: fd, terminal: ft },
    to: { device: td, terminal: tt },
    color: 'black',
    sizeSq: 5.5,
    wireType: 'KIV',
    ...extra,
  };
};

/** 電源 → ブレーカー → モーター の正しい回路 */
function motorCircuit(): Diagram {
  return {
    devices: [
      { id: 'PS1', type: source3p.type, x: 0, y: 0 },
      { id: 'CB1', type: breaker.type, x: 0, y: 0, params: { ratedCurrent: 20 } },
      { id: 'M1', type: motor.type, x: 0, y: 0 },
    ],
    wires: [
      wire('PS1.R', 'CB1.1'),
      wire('PS1.S', 'CB1.3'),
      wire('PS1.T', 'CB1.5'),
      wire('CB1.2', 'M1.U'),
      wire('CB1.4', 'M1.V'),
      wire('CB1.6', 'M1.W'),
      wire('PS1.PE', 'M1.E', { color: 'green' }),
    ],
  };
}

const rules = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);

describe('checkDiagram', () => {
  it('正しい回路では警告が出ない', () => {
    expect(checkDiagram(motorCircuit(), lookup)).toEqual([]);
  });

  it('未接続の端子を検出する', () => {
    const d = motorCircuit();
    d.wires = d.wires.filter((w) => !(w.to.device === 'M1' && w.to.terminal === 'W'));
    const issues = checkDiagram(d, lookup);
    expect(issues.some((i) => i.rule === 'unconnected' && i.message.includes('W'))).toBe(true);
  });

  it('相間の短絡を検出する', () => {
    const d = motorCircuit();
    d.wires.push(wire('CB1.2', 'CB1.4'));
    expect(rules(d)).toContain('short-circuit');
  });

  it('同じ相が2端子に来ていることを検出する', () => {
    const d = motorCircuit();
    d.wires[2] = wire('PS1.R', 'CB1.5');
    // T相の代わりにR相を配線すると、モーターの U と W に同じR相が来る
    expect(rules(d)).toContain('same-phase');
  });

  it('保護機器がない負荷を検出する', () => {
    const d = motorCircuit();
    d.wires = [wire('PS1.R', 'M1.U'), wire('PS1.S', 'M1.V'), wire('PS1.T', 'M1.W'), wire('PS1.PE', 'M1.E', { color: 'green' })];
    d.devices = d.devices.filter((x) => x.id !== 'CB1');
    expect(rules(d)).toContain('no-protection');
  });

  it('電線が保護電流に対して細すぎることを検出する', () => {
    const d = motorCircuit();
    d.wires[3] = { ...d.wires[3], sizeSq: 0.75 };
    const issues = checkDiagram(d, lookup).filter((i) => i.rule === 'wire-too-thin');
    expect(issues).toHaveLength(1);
    expect(issues[0].wires).toEqual([d.wires[3].id]);
  });

  it('電源側（保護機器より上流）の電線は太さチェックの対象外', () => {
    const d = motorCircuit();
    d.wires[0] = { ...d.wires[0], sizeSq: 0.75 };
    expect(rules(d)).not.toContain('wire-too-thin');
  });

  it('負荷電流が保護電流を超えることを検出する', () => {
    const d = motorCircuit();
    d.devices[1].params = { ratedCurrent: 10 };
    expect(rules(d)).toContain('overload');
  });

  it('電圧・電源種別の不一致を検出する', () => {
    const d: Diagram = {
      devices: [
        { id: 'PS1', type: source3p.type, x: 0, y: 0 },
        { id: 'PL1', type: lamp.type, x: 0, y: 0 },
      ],
      wires: [wire('PS1.R', 'PL1.X1'), wire('PS1.S', 'PL1.X2')],
    };
    expect(rules(d)).toContain('system-mismatch');
  });

  it('接地端子と電源線の接続（地絡）を検出する', () => {
    const d = motorCircuit();
    d.wires.push(wire('CB1.2', 'M1.E'));
    expect(rules(d)).toContain('ground-fault');
  });

  it('存在しない端子への配線をエラーにする', () => {
    const d = motorCircuit();
    d.wires.push(wire('CB1.9', 'M1.U'));
    expect(rules(d)).toContain('unknown-terminal');
  });

  it('電位の異なる電線の線番重複を検出する', () => {
    const d = motorCircuit();
    d.wires[3].wireNo = 'U1';
    d.wires[4].wireNo = 'U1';
    expect(rules(d)).toContain('wire-no-duplicate');
  });

  describe('コネクタとケーブル', () => {
    const milDiagram = (plusTo: string, minusTo: string): Diagram => ({
      devices: [
        { id: 'PSU1', type: dcSource.type, x: 0, y: 0 },
        { id: 'OUT1', type: outputUnit.type, x: 0, y: 0 },
        { id: 'TB1', type: milTb.type, x: 0, y: 0 },
      ],
      wires: [
        wire('OUT1.CN1', 'TB1.CN', { wireType: 'CABLE' }),
        wire('PSU1.+V', plusTo, { color: 'blue', sizeSq: 0.75 }),
        wire('PSU1.-V', minusTo, { color: 'blue', sizeSq: 0.75 }),
      ],
    });

    it('ケーブルを通してピンの電源条件をチェックする', () => {
      expect(rules(milDiagram('TB1.1', 'TB1.2'))).toEqual([]);
      expect(rules(milDiagram('TB1.2', 'TB1.1'))).toContain('conductor-mismatch');
    });

    it('コネクタに普通の電線をつなぐとエラーにする', () => {
      const d = milDiagram('TB1.1', 'TB1.2');
      d.wires.push(wire('PSU1.+V', 'TB1.CN'));
      expect(rules(d)).toContain('connector-mismatch');
    });
  });
});

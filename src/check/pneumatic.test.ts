import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { DeviceDefinition, TerminalDef } from '../devices/types';
import { normalizeTubes } from '../model/air';
import type { Diagram, DiagramWire } from '../model/diagram';
import { splitCrossSheetWires } from '../model/ops';
import { checkDiagram } from './checkDiagram';
import { buildModel } from './model';
import { airPressures } from './pneumatic';

const port = (id: string, air: TerminalDef['air'], extra: Partial<TerminalDef> = {}): TerminalDef => ({ id, x: 0, y: 0, side: 'top', role: 'air', air, ...extra });
const base = { name: '', model: '', labelPrefix: 'X', width: 10, height: 10, svg: '' };

/** レギュレータ（IN → OUT、設定圧力 0.4MPa） */
const regulator: DeviceDefinition = {
  ...base,
  type: 'test.regulator',
  category: 'air-supply',
  terminals: [port('IN', { kind: 'in', tubeOD: 8, maxPressure: 1.0 }), port('OUT', { kind: 'out', tubeOD: 8 })],
  params: [{ key: 'set', label: '設定圧力', options: [{ value: 0.1 }, { value: 0.4 }, { value: 0.6 }], default: 0.4 }],
  airLinks: [{ from: 'IN', to: 'OUT', directed: true, regulate: { param: 'set' } }],
};
/** 複動シリンダ（ポート 2 つ、0.05〜0.7MPa） */
const cylinder: DeviceDefinition = {
  ...base,
  type: 'test.cylinder',
  category: 'actuator',
  terminals: [port('H', { kind: 'work', tubeOD: 6, minPressure: 0.05, maxPressure: 0.7 }), port('R', { kind: 'work', tubeOD: 6, minPressure: 0.05, maxPressure: 0.7 })],
};
/** 供給圧力の高いエア源（1.0MPa） */
const highSource: DeviceDefinition = {
  ...base,
  type: 'test.source',
  category: 'air-supply',
  terminals: [port('OUT', { kind: 'supply', pressure: 1.0, tubeOD: 8 })],
};
/** スピードコントローラ（IN ↔ OUT、向きなしで通す） */
const speedController: DeviceDefinition = {
  ...base,
  type: 'test.speed-controller',
  category: 'air-fitting',
  terminals: [port('IN', { kind: 'in', tubeOD: 6 }), port('OUT', { kind: 'out', tubeOD: 6 })],
  airLinks: [{ from: 'IN', to: 'OUT' }],
};
const tests = [regulator, cylinder, highSource, speedController];
const lookup = (type: string) => tests.find((d) => d.type === type) ?? getDeviceDefinition(type);

let n = 0;
const tube = (from: string, to: string, od = 6, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `T${++n}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od, ...extra };
};

/** エア源 → レギュレータ → 電磁弁 → シリンダ */
function circuit(): Diagram {
  return {
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
      { id: 'FR1', type: 'test.regulator', x: 0, y: 0 },
      { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
      { id: 'CY1', type: 'test.cylinder', x: 0, y: 0 },
    ],
    wires: [tube('AIR1.OUT', 'FR1.IN', 8), tube('FR1.OUT', 'SOL1.P', 8), tube('SOL1.A', 'CY1.H'), tube('SOL1.B', 'CY1.R')],
  };
}
const air = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule.startsWith('air') || i.rule.startsWith('tube'));

describe('エア回路のチェック', () => {
  it('圧力はエア源からレギュレータで下がって、電磁弁を通ってシリンダまで届く', () => {
    const p = airPressures(buildModel(circuit(), lookup, () => {}));
    expect(p.get('AIR1:OUT')).toBe(0.5);
    expect(p.get('FR1:OUT')).toBe(0.4);
    expect(p.get('SOL1:P')).toBe(0.4);
    expect(p.get('CY1:H')).toBe(0.4);
    expect(p.get('CY1:R')).toBe(0.4);
    // 排気ポートへは機器の中の通り道では届かない
    expect(p.has('SOL1:EA')).toBe(false);
  });

  it('チューブの外径と継手の外径が違えば警告する（電磁弁の P は φ6 用）', () => {
    expect(air(circuit()).map((i) => i.rule)).toEqual(['tube-od-mismatch']);
    const d = circuit();
    d.wires[1] = { ...d.wires[1], tubeOD: 6 };
    expect(air(d).map((i) => i.rule)).toEqual(['tube-od-mismatch']);
  });

  it('未接続のポート（排気ポートは除く）、エアの届かない機器を指摘する', () => {
    const d = circuit();
    d.wires = d.wires.filter((w) => w.to.terminal !== 'R');
    d.wires = d.wires.filter((w) => w.from.device !== 'FR1');
    const rules = air(d).map((i) => `${i.rule}:${i.devices.join(',')}`);
    expect(rules).toContain('air-unconnected:SOL1');
    expect(rules).toContain('air-unconnected:CY1');
    expect(rules).toContain('air-no-supply:SOL1');
    expect(rules).toContain('air-no-supply:CY1');
    expect(rules.filter((r) => r.includes('EA') || r.includes('EB'))).toEqual([]);
  });

  it('使用圧力範囲・チューブの最高使用圧力を超える圧力を指摘する', () => {
    const d: Diagram = {
      devices: [
        { id: 'AIR1', type: 'test.source', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
        { id: 'CY1', type: 'test.cylinder', x: 0, y: 0 },
      ],
      wires: [tube('AIR1.OUT', 'SOL1.P', 6), tube('SOL1.A', 'CY1.H'), tube('SOL1.B', 'CY1.R')],
    };
    const rules = air(d).map((i) => `${i.rule}:${i.devices.join(',')}`);
    expect(rules).toContain('air-over-pressure:SOL1');
    expect(rules).toContain('air-over-pressure:CY1');
    expect(rules.filter((r) => r.startsWith('tube-pressure'))).toHaveLength(3);
  });

  it('レギュレータの設定圧力が電磁弁の最低使用圧力（シングル 0.15MPa）より低ければ指摘する', () => {
    const d = circuit();
    d.devices[1] = { ...d.devices[1], params: { set: 0.1 } };
    expect(air(d).filter((i) => i.rule === 'air-under-pressure').map((i) => i.devices[0])).toEqual(['SOL1']);
  });

  it('排気ポートにエアを供給すると誤り', () => {
    const d = circuit();
    d.wires[1] = { ...d.wires[1], to: { device: 'SOL1', terminal: 'EA' }, tubeOD: 6 };
    const issues = air(d);
    expect(issues.find((i) => i.rule === 'air-exhaust-pressurized')?.severity).toBe('error');
  });

  it('レギュレータの IN と OUT を逆につなぐと指摘する', () => {
    const d = circuit();
    d.wires[0] = tube('AIR1.OUT', 'FR1.OUT', 8);
    d.wires[1] = tube('FR1.IN', 'SOL1.P', 6);
    expect(air(d).map((i) => i.rule)).toContain('air-reversed');
  });

  it('エアのポートと電気の端子をつなぐと誤り', () => {
    const d = circuit();
    d.wires.push({ id: 'W1', from: { device: 'SOL1', terminal: 'A' }, to: { device: 'SOL1', terminal: '+' }, color: 'black', sizeSq: 0.75, wireType: 'KIV' });
    const issue = checkDiagram(d, lookup).find((i) => i.rule === 'air-electric-mismatch');
    expect(issue?.severity).toBe('error');
    expect(issue?.wires).toEqual(['W1']);
  });

  it('電気のチェックはチューブを電線として扱わない（未接続の電気の端子だけを指摘する）', () => {
    const issues = checkDiagram(circuit(), lookup);
    expect(issues.filter((i) => i.rule === 'unconnected').map((i) => i.message)).toEqual(['SOL1: 端子 + が未接続です', 'SOL1: 端子 − が未接続です']);
    expect(issues.some((i) => i.rule.startsWith('wire-'))).toBe(false);
  });
});

describe('シリンダと電磁弁の A・B', () => {
  const rule = (d: Diagram) => air(d).filter((i) => i.rule === 'air-cylinder-valve');

  it('同じ電磁弁の A・B につないだシリンダは指摘しない（スピードコントローラを挟んでもよい）', () => {
    expect(rule(circuit())).toEqual([]);
    const d = circuit();
    d.devices.push({ id: 'SC1', type: 'test.speed-controller', x: 0, y: 0 });
    d.wires[2] = tube('SOL1.A', 'SC1.IN');
    d.wires.push(tube('SC1.OUT', 'CY1.H'));
    expect(rule(d)).toEqual([]);
  });

  it('2 つのポートを同じポートにつなぐと警告する', () => {
    const d = circuit();
    d.wires[3] = tube('SOL1.A', 'CY1.R');
    const issues = rule(d);
    expect(issues.map((i) => i.severity)).toEqual(['warning']);
    expect(issues[0].message).toContain('SOL1.4(A)');
  });

  it('別々の電磁弁につなぐと注意を出す', () => {
    const d = circuit();
    d.devices.push({ id: 'SOL2', type: 'smc.sy3120-5lz', x: 0, y: 0 });
    d.wires.push(tube('FR1.OUT', 'SOL2.P', 8));
    d.wires[3] = tube('SOL2.A', 'CY1.R');
    const issues = rule(d);
    expect(issues.map((i) => i.severity)).toEqual(['info']);
    expect(issues[0].devices).toEqual(['CY1', 'SOL1', 'SOL2']);
  });
});

describe('チューブの補完とエアのリンク', () => {
  it('エアのポートどうしの電線はチューブにそろえる（外径はポートの継手）', () => {
    const d: Diagram = {
      devices: [
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0, params: { portAB: 4 } },
        { id: 'CY1', type: 'test.cylinder', x: 0, y: 0 },
      ],
      wires: [{ id: 'W1', from: { device: 'SOL1', terminal: 'A' }, to: { device: 'CY1', terminal: 'H' }, color: 'black', sizeSq: 2, wireType: 'KIV' }],
    };
    expect(normalizeTubes(d, lookup).wires[0]).toMatchObject({ wireType: 'TU', tubeOD: 4, color: 'black', sizeSq: 0 });
  });

  it('シートをまたぐチューブはエアのリンクの組に置き換える', () => {
    const d: Diagram = {
      sheets: [
        { id: 'S1', name: 'エア源' },
        { id: 'S2', name: '装置' },
      ],
      devices: [
        { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0, sheet: 'S1' },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0, sheet: 'S2' },
      ],
      wires: [tube('AIR1.OUT', 'SOL1.P', 6, { wireNo: '主管' })],
    };
    const out = splitCrossSheetWires(d, getDeviceDefinition);
    const links = out.devices.filter((x) => x.type === 'generic.air-link');
    expect(links.map((l) => l.params?.name)).toEqual(['主管', '主管']);
    expect(out.wires.every((w) => w.wireType === 'TU' && w.tubeOD === 6)).toBe(true);
    // リンクを通って電磁弁までエアが届く
    const p = airPressures(buildModel(out, getDeviceDefinition, () => {}));
    expect(p.get('SOL1:P')).toBe(0.5);
    expect(checkDiagram(out, getDeviceDefinition).filter((i) => i.rule.startsWith('link-'))).toEqual([]);
  });
});

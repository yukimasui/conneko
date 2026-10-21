/**
 * 接点・出力の開閉、信号の種類、安全回路、装着（バス）、コネクタの変換・プロトコルのチェック。
 * 機器はテスト用の最小の定義を使う。
 */
import { describe, expect, it } from 'vitest';
import type { AcceptSpec, DeviceDefinition, TerminalDef } from '../devices/types';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import source3p from '../devices/catalog/power-source-3p200v';
import { checkDiagram } from './checkDiagram';

const t = (id: string, role: TerminalDef['role'], extra: Partial<TerminalDef> = {}): TerminalDef => ({ id, x: 0, y: 0, side: 'top', role, ...extra });
const base = { name: '', model: '', labelPrefix: 'X', width: 10, height: 10, svg: '' };
const dcPlus: AcceptSpec = { system: 'DC', minVoltage: 20, maxVoltage: 28, conductors: ['+'] };
const dcMinus: AcceptSpec = { system: 'DC', minVoltage: 20, maxVoltage: 28, conductors: ['-'] };
const dcBoth: AcceptSpec = { system: 'DC', minVoltage: 20, maxVoltage: 28, conductors: ['+', '-'] };

const psu: DeviceDefinition = {
  ...base,
  type: 't.psu',
  category: 'power-supply',
  terminals: [
    t('+V', 'supply', { supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 5 } }),
    t('-V', 'supply', { supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: 5 } }),
  ],
};
const plcIn: DeviceDefinition = {
  ...base,
  type: 't.in',
  category: 'plc',
  terminals: [
    t('X0', 'signal', { signal: { dir: 'in', kind: 'dc', common: 'COM' }, optional: true }),
    t('X1', 'signal', { signal: { dir: 'in', kind: 'dc', common: 'COM' }, optional: true }),
    t('COM', 'input', { accepts: dcBoth }),
  ],
};
const plcOut: DeviceDefinition = {
  ...base,
  type: 't.out',
  category: 'plc',
  terminals: [t('Y0', 'signal', { optional: true }), t('Y1', 'signal', { optional: true }), t('COM', 'input', { accepts: dcMinus })],
  links: [
    { from: 'Y0', to: 'COM', switch: 'output', ratedCurrent: 0.5 },
    { from: 'Y1', to: 'COM', switch: 'output', ratedCurrent: 0.5 },
  ],
  commonLimits: [{ common: 'COM', current: 0.8 }],
};
const lamp: DeviceDefinition = {
  ...base,
  type: 't.lamp',
  category: 'control',
  terminals: [t('X1', 'input', { accepts: dcPlus }), t('X2', 'input', { accepts: dcMinus })],
  params: [{ key: 'current', label: '', options: [{ value: 0.1 }, { value: 0.6 }], default: 0.1 }],
  loadCurrent: { param: 'current' },
};
const sensor = (kind: 'npn' | 'pnp' | 'analog-v'): DeviceDefinition => ({
  ...base,
  type: `t.sensor.${kind}`,
  category: 'sensor',
  terminals: [t('BN', 'input', { accepts: dcPlus }), t('BU', 'input', { accepts: dcMinus }), t('BK', 'signal', { signal: { dir: 'out', kind } })],
  links: kind === 'analog-v' ? [] : [{ from: 'BK', to: kind === 'npn' ? 'BU' : 'BN', switch: 'output' }],
});
const dryIn: DeviceDefinition = {
  ...base,
  type: 't.dry',
  category: 'plc',
  terminals: [t('IN', 'signal', { signal: { dir: 'in', kind: 'dry' } })],
};
const twoWire: DeviceDefinition = {
  ...base,
  type: 't.2wire',
  category: 'sensor',
  terminals: [t('BN', 'signal', { signal: { dir: 'out', kind: '2wire' } }), t('BU', 'signal', { signal: { dir: 'out', kind: '2wire' } })],
};
/** 三相の電磁接触器（主接点のみ） */
const mc3: DeviceDefinition = {
  ...base,
  type: 't.mc3',
  category: 'contactor',
  terminals: ['1', '3', '5'].map((id) => t(id, 'line')).concat(['2', '4', '6'].map((id) => t(id, 'load'))),
  links: [
    { from: '1', to: '2', switch: 'NO' },
    { from: '3', to: '4', switch: 'NO' },
    { from: '5', to: '6', switch: 'NO' },
  ],
};
/** ミラー接点付きの電磁接触器（DC コイル） */
const mcDc: DeviceDefinition = {
  ...base,
  type: 't.mcdc',
  category: 'contactor',
  terminals: [t('A1', 'input', { accepts: dcPlus }), t('A2', 'input', { accepts: dcMinus }), t('13', 'signal', { optional: true }), t('14', 'signal', { optional: true }), t('21', 'signal', { optional: true }), t('22', 'signal', { optional: true })],
  links: [
    { from: '13', to: '14', switch: 'NO' },
    { from: '21', to: '22', switch: 'NC', linked: 'mirror' },
  ],
};
/** ミラー接点ではない b 接点の接触器 */
const mcPlain: DeviceDefinition = { ...mcDc, type: 't.mcplain', links: [{ from: '13', to: '14', switch: 'NO' }, { from: '21', to: '22', switch: 'NC' }] };
const estop: DeviceDefinition = {
  ...base,
  type: 't.estop',
  category: 'safety',
  terminals: ['11', '12', '21', '22', '33', '34'].map((id) => t(id, 'signal', { optional: true })),
  links: [
    { from: '11', to: '12', switch: 'NC', directOpening: true },
    { from: '21', to: '22', switch: 'NC', directOpening: true },
    { from: '33', to: '34', switch: 'NO' },
  ],
};
const pushButton: DeviceDefinition = {
  ...base,
  type: 't.pb',
  category: 'control',
  terminals: ['1', '2', '3', '4'].map((id) => t(id, 'signal', { optional: true })),
  links: [
    { from: '1', to: '2', switch: 'NC' },
    { from: '3', to: '4', switch: 'NO' },
  ],
};
const test24 = () => ({ system: 'DC' as const, voltage: 24, conductor: '+' as const, kind: 'test' as const, limitCurrent: 0.1 });
/** セーフティリレー（テスト出力 T11/T21 → 入力 T12/T22、安全接点 13-14 / 23-24、EDM T31-T32、リセット S34） */
const relay: DeviceDefinition = {
  ...base,
  type: 't.relay',
  category: 'safety',
  safety: { pl: 'e', category: '4' },
  terminals: [
    t('A1', 'input', { accepts: dcPlus }),
    t('A2', 'input', { accepts: dcMinus }),
    t('T11', 'supply', { supply: test24(), function: 'test-output', channel: 1 }),
    t('T21', 'supply', { supply: test24(), function: 'test-output', channel: 2 }),
    t('T12', 'signal', { function: 'safety-input', channel: 1 }),
    t('T22', 'signal', { function: 'safety-input', channel: 2 }),
    t('T31', 'supply', { supply: test24(), function: 'edm', optional: true }),
    t('T32', 'signal', { function: 'edm' }),
    t('13', 'signal', { function: 'safety-contact', optional: true }),
    t('14', 'signal', { function: 'safety-contact', optional: true }),
    t('23', 'signal', { function: 'safety-contact', optional: true }),
    t('24', 'signal', { function: 'safety-contact', optional: true }),
  ],
  links: [
    { from: '13', to: '14', switch: 'NO' },
    { from: '23', to: '24', switch: 'NO' },
  ],
  safetyChannels: [
    { id: 'IN', kind: 'input', mode: 'nc-nc', channels: [{ source: 'T11', input: 'T12' }, { source: 'T21', input: 'T22' }] },
    { id: 'OUT', kind: 'output', channels: [{ output: '13' }, { output: '23' }] },
  ],
};
const ossd = (ch: 1 | 2): TerminalDef => t(`OSSD${ch}`, 'supply', { supply: { system: 'DC', voltage: 24, conductor: '+', kind: 'ossd', limitCurrent: 0.3 }, function: 'ossd', channel: ch });
const curtain: DeviceDefinition = {
  ...base,
  type: 't.curtain',
  category: 'safety',
  safety: { pl: 'c', category: '2', esType: 2 },
  terminals: [t('+V', 'input', { accepts: dcPlus }), t('0V', 'input', { accepts: dcMinus }), ossd(1), ossd(2), t('EDM', 'signal', { function: 'edm', optional: true })],
  safetyChannels: [{ id: 'OSSD', kind: 'output', channels: [{ output: 'OSSD1' }, { output: 'OSSD2' }] }],
};
/** OSSD 入力と手動リセット入力を持つ安全コントローラー */
const controller: DeviceDefinition = {
  ...base,
  type: 't.ctrl',
  category: 'safety',
  terminals: [
    t('+V', 'input', { accepts: dcPlus }),
    t('0V', 'input', { accepts: dcMinus }),
    t('SI0', 'signal', { function: 'safety-input', channel: 1 }),
    t('SI1', 'signal', { function: 'safety-input', channel: 2 }),
    t('RST', 'signal', { function: 'reset', optional: true }),
  ],
  safetyChannels: [{ id: 'SI', kind: 'input', mode: 'ossd', channels: [{ input: 'SI0' }, { input: 'SI1' }] }],
};
const lock: DeviceDefinition = {
  ...base,
  type: 't.lock',
  category: 'safety',
  terminals: [t('A2', 'input', { accepts: dcPlus, function: 'unlock-solenoid' }), t('A1', 'input', { accepts: dcMinus })],
};

// --- 装着 ---
const cpu: DeviceDefinition = {
  ...base,
  type: 't.cpu',
  category: 'plc',
  width: 60,
  terminals: [],
  bus: { kind: 'kv', host: { slots: 2, numbering: { mode: 'shared', unit: 16 } }, supply: { '5V': 1 } },
};
const unit = (io: { inputs?: number; outputs?: number }, load: number): DeviceDefinition => ({
  ...base,
  type: `t.unit.${io.inputs ?? 0}.${io.outputs ?? 0}`,
  category: 'plc',
  width: 20,
  terminals: [],
  pins: [],
  bus: { kind: 'kv', load: { '5V': load }, io: { ...io, format: 'kv' } },
});
const in32 = unit({ inputs: 32 }, 0.4);
const out16 = unit({ outputs: 16 }, 0.5);
const other = { ...unit({ inputs: 8 }, 0), type: 't.other', bus: { kind: 'fx5', io: { inputs: 8, format: 'octal' as const } } };

// --- コネクタ ---
const conn = (type: string, connector: NonNullable<TerminalDef['connector']>): DeviceDefinition => ({
  ...base,
  type,
  category: 'plc',
  terminals: [t('CN', 'connector', { connector })],
});
const fcn = conn('t.fcn', { kind: 'FCN40', pins: 40, width: 10, mates: ['MIL40'] });
const mil = conn('t.mil', { kind: 'MIL40', pins: 40, width: 10 });
const ecat = conn('t.ecat', { kind: 'RJ45', pins: 0, width: 10, protocols: ['ethercat'] });
const eth = conn('t.eth', { kind: 'RJ45', pins: 0, width: 10, protocols: ['ethernet'] });

/** AC/DC 両用のコモンと、入力モードで電圧範囲が変わる端子 */
const dual: DeviceDefinition = {
  ...base,
  type: 't.dual',
  category: 'plc',
  terminals: [
    t('COM', 'input', { accepts: [{ system: 'AC', minVoltage: 100, maxVoltage: 240 }, { system: 'DC', minVoltage: 5, maxVoltage: 30, conductors: ['+', '-'] }] }),
    t('IN', 'input', { accepts: { system: 'DC', minVoltage: { param: 'min' }, maxVoltage: { param: 'max' }, conductors: ['+'] } }),
  ],
  params: [
    { key: 'min', label: '', options: [{ value: 20 }, { value: 4.5 }], default: 20 },
    { key: 'max', label: '', options: [{ value: 28 }, { value: 5.5 }], default: 28 },
  ],
};

const defs = [psu, plcIn, plcOut, lamp, sensor('npn'), sensor('pnp'), sensor('analog-v'), dryIn, twoWire, mc3, mcDc, mcPlain, estop, pushButton, relay, curtain, controller, lock, cpu, in32, out16, other, fcn, mil, ecat, eth, dual, source3p];
const lookup = (type: string) => defs.find((d) => d.type === type);

let n = 0;
const w = (a: string, b: string): DiagramWire => {
  const [ad, at] = a.split('.');
  const [bd, bt] = b.split('.');
  return { id: `W${++n}`, from: { device: ad, terminal: at }, to: { device: bd, terminal: bt }, color: 'blue', sizeSq: 1.25, wireType: 'KIV' };
};
const dev = (id: string, type: string, extra: Partial<DiagramDevice> = {}): DiagramDevice => ({ id, type, x: 0, y: 0, ...extra });
const check = (d: Diagram) => checkDiagram(d, lookup);
const rulesOf = (d: Diagram) => check(d).map((i) => i.rule);

/** 電源 PS と、そこから + / - を配る */
const power = (...targets: [string, string][]) => targets.flatMap(([plus, minus]) => [w('PS.+V', plus), w('PS.-V', minus)]);

describe('接点・出力の開閉', () => {
  it('出力に +24V を直結すると、出力 ON のときの短絡として検出する', () => {
    const d: Diagram = { devices: [dev('PS', 't.psu'), dev('OUT', 't.out')], wires: [w('PS.-V', 'OUT.COM'), w('PS.+V', 'OUT.Y0')] };
    const issues = check(d).filter((i) => i.rule === 'short-circuit');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toContain('OUT が出力が ON になる');
  });

  it('出力から負荷を駆動するのは正常（電源が届く）', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('OUT', 't.out'), dev('L1', 't.lamp')],
      wires: [w('PS.-V', 'OUT.COM'), w('PS.+V', 'L1.X1'), w('L1.X2', 'OUT.Y0')],
    };
    expect(rulesOf(d)).toEqual([]);
  });

  it('インタロックした正逆転回路は短絡にならないが、1 台で相間短絡する配線は検出する', () => {
    const ok: Diagram = {
      devices: [dev('PS', source3p.type), dev('MC1', 't.mc3'), dev('MC2', 't.mc3')],
      wires: [
        w('PS.R', 'MC1.1'), w('PS.S', 'MC1.3'), w('PS.T', 'MC1.5'),
        w('PS.R', 'MC2.1'), w('PS.S', 'MC2.3'), w('PS.T', 'MC2.5'),
        w('MC1.2', 'MC2.6'), w('MC1.4', 'MC2.4'), w('MC1.6', 'MC2.2'),
      ],
    };
    expect(rulesOf(ok)).not.toContain('short-circuit');
    const bad: Diagram = { devices: [dev('PS', source3p.type), dev('MC1', 't.mc3')], wires: [w('PS.R', 'MC1.1'), w('PS.S', 'MC1.2')] };
    expect(check(bad).find((i) => i.rule === 'short-circuit')?.message).toContain('MC1 が動作する');
  });

  it('b 接点で電源の両極をつなぐと、通常時の短絡として検出する', () => {
    const d: Diagram = { devices: [dev('PS', 't.psu'), dev('PB', 't.pb')], wires: [w('PS.+V', 'PB.1'), w('PS.-V', 'PB.2')] };
    expect(check(d).find((i) => i.rule === 'short-circuit')?.message).toContain('通常時');
  });

  it('出力点ごとに別の線番を付けられる（出力どうしを同じネットとみなさない）', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('OUT', 't.out'), dev('L1', 't.lamp'), dev('L2', 't.lamp')],
      wires: [w('PS.-V', 'OUT.COM'), w('PS.+V', 'L1.X1'), w('PS.+V', 'L2.X1'), { ...w('L1.X2', 'OUT.Y0'), wireNo: '100' }, { ...w('L2.X2', 'OUT.Y1'), wireNo: '100' }],
    };
    expect(rulesOf(d)).toContain('wire-no-duplicate');
  });

  it('出力 1 点の定格とコモンあたりの上限を超える負荷を警告する', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('OUT', 't.out'), dev('L1', 't.lamp', { params: { current: 0.6 } }), dev('L2', 't.lamp', { params: { current: 0.6 } })],
      wires: [w('PS.-V', 'OUT.COM'), w('PS.+V', 'L1.X1'), w('PS.+V', 'L2.X1'), w('L1.X2', 'OUT.Y0'), w('L2.X2', 'OUT.Y1')],
    };
    const r = rulesOf(d);
    expect(r.filter((x) => x === 'output-overload')).toHaveLength(2);
    expect(r).toContain('common-overload');
  });
});

describe('受電条件', () => {
  it('AC/DC 両用の端子はどちらでもよく、パラメータで電圧範囲が変わる', () => {
    const d = (params?: Record<string, number>): Diagram => ({ devices: [dev('PS', 't.psu'), dev('D', 't.dual', { params })], wires: [w('PS.-V', 'D.COM'), w('PS.+V', 'D.IN')] });
    expect(rulesOf(d())).toEqual([]);
    expect(rulesOf(d({ min: 4.5, max: 5.5 }))).toContain('voltage-mismatch');
  });
});

describe('信号の種類', () => {
  const sensorDiagram = (kind: string, com: '+V' | '-V'): Diagram => ({
    devices: [dev('PS', 't.psu'), dev('IN', 't.in'), dev('S1', `t.sensor.${kind}`)],
    wires: [...power(['S1.BN', 'S1.BU']), w(`PS.${com}`, 'IN.COM'), w('S1.BK', 'IN.X0')],
  });

  it('NPN はプラスコモン、PNP はマイナスコモンなら正常', () => {
    expect(rulesOf(sensorDiagram('npn', '+V'))).toEqual([]);
    expect(rulesOf(sensorDiagram('pnp', '-V'))).toEqual([]);
  });

  it('NPN をマイナスコモン、PNP をプラスコモンにつなぐとエラー', () => {
    expect(rulesOf(sensorDiagram('npn', '-V'))).toContain('signal-polarity');
    expect(rulesOf(sensorDiagram('pnp', '+V'))).toContain('signal-polarity');
  });

  it('アナログ出力を DC 入力につなぐと警告', () => {
    expect(rulesOf(sensorDiagram('analog-v', '-V'))).toContain('signal-kind');
  });

  it('入力とコモンが同じ極だと警告、無電圧入力に電圧をかけるとエラー', () => {
    const same: Diagram = { devices: [dev('PS', 't.psu'), dev('IN', 't.in'), dev('PB', 't.pb')], wires: [w('PS.+V', 'IN.COM'), w('PS.+V', 'PB.3'), w('PB.4', 'IN.X0')] };
    expect(rulesOf(same)).toContain('input-same-polarity');
    const dry: Diagram = { devices: [dev('PS', 't.psu'), dev('D', 't.dry')], wires: [w('PS.+V', 'D.IN')] };
    expect(rulesOf(dry)).toContain('dry-input-voltage');
  });

  it('2線式センサーは入力と電源の間に直列に入れる', () => {
    const ok: Diagram = { devices: [dev('PS', 't.psu'), dev('IN', 't.in'), dev('S', 't.2wire')], wires: [w('PS.+V', 'IN.COM'), w('S.BN', 'IN.X0'), w('PS.-V', 'S.BU')] };
    expect(rulesOf(ok)).toEqual([]);
    const sameSide: Diagram = { devices: [dev('PS', 't.psu'), dev('IN', 't.in'), dev('S', 't.2wire')], wires: [w('PS.+V', 'IN.COM'), w('S.BN', 'IN.X0'), w('PS.+V', 'S.BU')] };
    expect(rulesOf(sameSide)).toContain('two-wire');
    const direct: Diagram = { devices: [dev('PS', 't.psu'), dev('S', 't.2wire')], wires: [w('PS.+V', 'S.BN'), w('PS.-V', 'S.BU')] };
    expect(rulesOf(direct)).toContain('two-wire');
  });
});

describe('安全回路', () => {
  /** 非常停止 ES の 2 つの b 接点をセーフティリレー SR の 2 チャンネルに入れ、KM1/KM2 を駆動して EDM に戻す */
  const estopCircuit = (opts: { mc?: string; ch2?: boolean; edm?: boolean; contact2?: [string, string]; km2?: boolean } = {}): Diagram => {
    const mc = opts.mc ?? 't.mcdc';
    const km2 = opts.km2 ?? true;
    const [c2a, c2b] = opts.contact2 ?? ['21', '22'];
    return {
      devices: [dev('PS', 't.psu'), dev('SR', 't.relay'), dev('ES', 't.estop'), dev('KM1', mc), ...(km2 ? [dev('KM2', mc)] : [])],
      wires: [
        ...power(['SR.A1', 'SR.A2']),
        w('PS.-V', 'KM1.A2'),
        ...(km2 ? [w('PS.-V', 'KM2.A2')] : []),
        w('SR.T11', 'ES.11'),
        w('ES.12', 'SR.T12'),
        ...(opts.ch2 === false ? [] : [w('SR.T21', `ES.${c2a}`), w(`ES.${c2b}`, 'SR.T22')]),
        w('PS.+V', 'SR.13'),
        w('SR.14', 'KM1.A1'),
        ...(km2 ? [w('PS.+V', 'SR.23'), w('SR.24', 'KM2.A1')] : []),
        ...(opts.edm === false
          ? []
          : km2
            ? [w('SR.T31', 'KM1.21'), w('KM1.22', 'KM2.21'), w('KM2.22', 'SR.T32')]
            : [w('SR.T31', 'KM1.21'), w('KM1.22', 'SR.T32')]),
      ],
    };
  };
  const safetyRules = (d: Diagram) => rulesOf(d).filter((r) => !['parallel-source', 'no-power', 'unconnected', 'wire-color'].includes(r));

  it('正しい非常停止回路では指摘がない', () => {
    expect(safetyRules(estopCircuit())).toEqual([]);
  });

  it('2 チャンネルの片側だけの配線はエラー', () => {
    expect(rulesOf(estopCircuit({ ch2: false }))).toContain('safety-channel-partial');
  });

  it('安全入力に a 接点を使うとエラー', () => {
    expect(rulesOf(estopCircuit({ contact2: ['33', '34'] }))).toContain('estop-not-nc');
  });

  it('直接開路動作でない汎用スイッチの b 接点は警告', () => {
    const d = estopCircuit();
    d.devices.push(dev('PB', 't.pb'));
    d.wires = d.wires.filter((x) => !(x.from.device === 'ES' && x.from.terminal === '12'));
    d.wires.push(w('ES.12', 'PB.1'), w('PB.2', 'SR.T12'));
    expect(rulesOf(d)).toContain('not-direct-opening');
  });

  it('2 チャンネルで同じ接点を共用するとエラー', () => {
    const d = estopCircuit({ ch2: false });
    d.wires.push(w('SR.T21', 'ES.11'), w('ES.12', 'SR.T22'));
    expect(rulesOf(d)).toContain('safety-channel-cross');
  });

  it('EDM の未配線、ミラー接点でない b 接点を警告', () => {
    expect(rulesOf(estopCircuit({ edm: false }))).toContain('edm-missing');
    expect(rulesOf(estopCircuit({ mc: 't.mcplain' }))).toContain('edm-not-linked');
  });

  it('カテゴリ 4 で接触器 1 台だけを駆動すると注意', () => {
    expect(rulesOf(estopCircuit({ km2: false }))).toContain('single-channel-output');
  });

  it('OSSD でコイルを直接駆動でき、OSSD どうしの短絡・電源への直結はエラー', () => {
    const base: Diagram = {
      devices: [dev('PS', 't.psu'), dev('LC', 't.curtain'), dev('KM1', 't.mcdc'), dev('KM2', 't.mcdc')],
      wires: [...power(['LC.+V', 'LC.0V']), w('LC.OSSD1', 'KM1.A1'), w('LC.OSSD2', 'KM2.A1'), w('PS.-V', 'KM1.A2'), w('PS.-V', 'KM2.A2')],
    };
    const r = rulesOf(base);
    expect(r).not.toContain('no-power');
    expect(r).not.toContain('ossd-short');
    expect(rulesOf({ ...base, wires: [...base.wires, w('LC.OSSD1', 'LC.OSSD2')] })).toContain('ossd-short');
    expect(rulesOf({ ...base, wires: [...base.wires, w('PS.+V', 'KM1.A1')] })).toContain('ossd-short');
  });

  it('OSSD と負荷の 0V が別の電源だと警告', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('PS2', 't.psu'), dev('LC', 't.curtain'), dev('KM1', 't.mcdc')],
      wires: [...power(['LC.+V', 'LC.0V']), w('LC.OSSD1', 'KM1.A1'), w('PS2.-V', 'KM1.A2')],
    };
    expect(rulesOf(d)).toContain('common-0v');
  });

  it('ライトカーテンからの入力で手動リセットがないと注意', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('LC', 't.curtain'), dev('C', 't.ctrl')],
      wires: [...power(['LC.+V', 'LC.0V'], ['C.+V', 'C.0V']), w('LC.OSSD1', 'C.SI0'), w('LC.OSSD2', 'C.SI1')],
    };
    expect(rulesOf(d)).toContain('reset-auto');
    d.devices.push(dev('PB', 't.pb'));
    d.wires.push(w('PS.+V', 'PB.3'), w('PB.4', 'C.RST'));
    expect(rulesOf(d)).not.toContain('reset-auto');
  });

  it('OSSD をテスト出力の入力につなぐと警告', () => {
    const d: Diagram = {
      devices: [dev('PS', 't.psu'), dev('LC', 't.curtain'), dev('SR', 't.relay')],
      wires: [...power(['LC.+V', 'LC.0V'], ['SR.A1', 'SR.A2']), w('LC.OSSD1', 'SR.T12'), w('LC.OSSD2', 'SR.T22')],
    };
    expect(rulesOf(d)).toContain('ossd-to-test-input');
  });

  it('スプリングロックの解錠ソレノイドを電源に直結すると警告', () => {
    const d: Diagram = { devices: [dev('PS', 't.psu'), dev('L', 't.lock')], wires: power(['L.A2', 'L.A1']) };
    expect(rulesOf(d)).toContain('lock-power-source');
  });

  it('要求 PL を下回る安全機器を警告する', () => {
    const d: Diagram = { devices: [dev('LC', 't.curtain'), dev('SR', 't.relay')], wires: [], settings: { requiredPL: 'd' } };
    const issues = check(d).filter((i) => i.rule === 'safety-rating');
    expect(issues.map((i) => i.devices[0])).toEqual(['LC']);
  });
});

describe('装着（バス）', () => {
  it('装着順に先頭番号を割り付け、内部電源の超過・スロット超過・機種違いを指摘する', () => {
    const d: Diagram = {
      devices: [dev('CPU', 't.cpu'), dev('U1', in32.type, { mount: { device: 'CPU', slot: 1 } }), dev('U2', out16.type, { mount: { device: 'CPU', slot: 2 } })],
      wires: [],
    };
    expect(rulesOf(d)).toEqual([]);
    const over = { ...d, devices: [...d.devices, dev('U3', out16.type, { mount: { device: 'CPU', slot: 3 } })] };
    const r = rulesOf(over);
    expect(r).toContain('bus-overload');
    expect(r).toContain('mount-slot-over');
    expect(rulesOf({ ...d, devices: [...d.devices, dev('U4', 't.other', { mount: { device: 'CPU', slot: 4 } })] })).toContain('mount-mismatch');
  });
});

describe('装着（iQ-R ベースユニット）', () => {
  it('空きスロットは 16 点を占有し、電源・CPU 専用の位置を守らないと警告する', async () => {
    const { getDeviceDefinition } = await import('../devices/registry');
    const { computeBus } = await import('../model/bus');
    const devices = [
      dev('BASE', 'mitsubishi.r35b'),
      dev('PW', 'mitsubishi.r61p', { mount: { device: 'BASE', slot: 1 } }),
      dev('CPU', 'mitsubishi.r04cpu', { mount: { device: 'BASE', slot: 2 } }),
      dev('X1', 'mitsubishi.rx40c7', { mount: { device: 'BASE', slot: 3 } }),
      // 位置 4（入出力スロット 1）は空き
      dev('Y1', 'mitsubishi.ry10r2', { mount: { device: 'BASE', slot: 5 } }),
    ];
    const bus = computeBus(devices, getDeviceDefinition);
    expect(bus.params.get('X1')).toMatchObject({ ioIn: 0 });
    expect(bus.params.get('Y1')).toMatchObject({ ioOut: 32 });
    expect(bus.problems).toEqual([]);
    const swapped = computeBus(
      devices.map((d) => (d.id === 'CPU' ? { ...d, mount: { device: 'BASE', slot: 3 } } : d.id === 'X1' ? { ...d, mount: { device: 'BASE', slot: 2 } } : d)),
      getDeviceDefinition,
    );
    expect(swapped.problems.map((p) => p.rule)).toContain('mount-slot-role');
  });
});

describe('コネクタ', () => {
  it('mates があれば種類の違うコネクタをケーブルでつなげる', () => {
    const d: Diagram = { devices: [dev('A', 't.fcn'), dev('B', 't.mil')], wires: [{ ...w('A.CN', 'B.CN'), wireType: 'CABLE' }] };
    expect(rulesOf(d)).not.toContain('connector-mismatch');
  });

  it('共通の通信方式がないポートどうしは警告', () => {
    const d: Diagram = { devices: [dev('A', 't.ecat'), dev('B', 't.eth')], wires: [{ ...w('A.CN', 'B.CN'), wireType: 'CABLE' }] };
    expect(rulesOf(d)).toContain('protocol-mismatch');
  });
});

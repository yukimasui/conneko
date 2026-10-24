import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { deviceModel, type DeviceDefinition, type TerminalDef } from '../devices/types';
import { resolveDevice } from '../devices/resolve';
import { airCandidates, normalizeTubes } from '../model/air';
import { applyMateCandidate } from '../model/mates';
import { deviceDefinitions } from '../devices/registry';
import type { Diagram, DiagramWire } from '../model/diagram';
import { splitCrossSheetWires } from '../model/ops';
import { checkDiagram } from './checkDiagram';
import { buildModel } from './model';
import { airGalleryPairs, airPressures } from './pneumatic';

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
// 開放排気の注意（air-exhaust-open）は、排気を省いた小さな回路で出るので、専用のテスト以外では見ない
const air = (d: Diagram) => checkDiagram(d, lookup).filter((i) => (i.rule.startsWith('air') && i.rule !== 'air-exhaust-open') || i.rule.startsWith('tube'));

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
    const ex = issues.find((i) => i.rule === 'air-exhaust-pressurized')!;
    expect(ex.severity).toBe('error');
    // 下流のシリンダの「届かない」は排気ポートへの給気の指摘にまとめる（#33）
    expect(ex.message).toContain('CY1 にもエアが届いていません');
    expect(ex.devices).toEqual(['SOL1', 'CY1']);
    expect(issues.filter((i) => i.rule === 'air-no-supply')).toEqual([]);
  });

  it('複動シリンダの速度制御がメータイン（給気を絞る）なら注意する（#33）', () => {
    const cm2 = (params: Record<string, string | number>): Diagram => ({
      devices: [
        { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
        { id: 'CY1', type: 'smc.cm2', x: 0, y: 0, params: { bore: 25, stroke: 100, ...params } },
      ],
      wires: [tube('AIR1.OUT', 'SOL1.P', 6), tube('SOL1.A', 'CY1.HEAD'), tube('SOL1.B', 'CY1.ROD')],
    });
    const meterIn = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule === 'air-meter-in');
    expect(meterIn(cm2({ speedController: 'meter-out' }))).toEqual([]);
    const direct = meterIn(cm2({ speedController: 'meter-in' }));
    expect(direct).toHaveLength(1);
    expect(direct[0].severity).toBe('info');
    // インラインのスピードコントローラを、自由流れの入口（IN）をシリンダ側にしてつなぐとメータイン
    const inline = cm2({});
    inline.devices.push({ id: 'SC1', type: 'smc.as-f.inline', x: 0, y: 0 });
    inline.wires = [tube('AIR1.OUT', 'SOL1.P', 6), tube('SOL1.A', 'SC1.OUT'), tube('SC1.IN', 'CY1.HEAD'), tube('SOL1.B', 'CY1.ROD')];
    expect(meterIn(inline).map((i) => i.message)[0]).toContain('SC1');
    // 逆向き（IN を電磁弁側）はメータアウトなので出ない
    inline.wires = [tube('AIR1.OUT', 'SOL1.P', 6), tube('SOL1.A', 'SC1.IN'), tube('SC1.OUT', 'CY1.HEAD'), tube('SOL1.B', 'CY1.ROD')];
    expect(meterIn(inline)).toEqual([]);
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

describe('装着した機器のポートを親のポートにつなぐ通路（bus.host.airGallery）', () => {
  /** 親: 供給 IN と排気 EXH を持つベース。装着した機器の P を IN に、R を EXH につなぐ */
  const baseDef: DeviceDefinition = {
    ...base,
    type: 'test.base',
    category: 'valve',
    terminals: [port('IN', { kind: 'in', tubeOD: 8 }), port('EXH', { kind: 'exhaust', tubeOD: 8 })],
    bus: { kind: 'test-base', host: { airGallery: { P: 'IN', R: 'EXH' } } },
  };
  /** 装着する機器: P・R は画面に出さないポート（pins）。P → OUT が通る */
  const unitDef: DeviceDefinition = {
    ...base,
    type: 'test.unit',
    category: 'valve',
    terminals: [port('OUT', { kind: 'work', tubeOD: 6 })],
    pins: [
      { id: 'P', role: 'air', air: { kind: 'in', minPressure: 0.3 } },
      { id: 'R', role: 'air', air: { kind: 'exhaust' } },
    ],
    airLinks: [
      { from: 'P', to: 'OUT', directed: true, valve: 'on' },
      { from: 'OUT', to: 'R', directed: true, valve: 'off' },
    ],
    bus: { kind: 'test-base' },
  };
  const lk = (type: string) => [baseDef, unitDef].find((d) => d.type === type) ?? lookup(type);
  const diagram = (mounted: boolean): Diagram => ({
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0, params: { tubeOD: 8, pressure: 0.4 } },
      { id: 'B1', type: 'test.base', x: 0, y: 0 },
      { id: 'U1', type: 'test.unit', x: 0, y: 0, ...(mounted ? { mount: { device: 'B1', slot: 1 } } : {}) },
      { id: 'CY1', type: 'test.cylinder', x: 0, y: 0 },
    ],
    wires: [tube('AIR1.OUT', 'B1.IN', 8), tube('U1.OUT', 'CY1.H', 6)],
  });

  it('親のポートから装着した機器の中を通ってエアが届く。排気の通路には送らない', () => {
    const m = buildModel(diagram(true), lk, () => {});
    expect(airGalleryPairs(m)).toEqual([
      ['U1:P', 'B1:IN'],
      ['U1:R', 'B1:EXH'],
    ]);
    const p = airPressures(m);
    expect(p.get('U1:P')).toBe(0.4);
    expect(p.get('CY1:H')).toBe(0.4);
    expect(p.has('B1:EXH')).toBe(false);
  });

  it('通路でつながったポートは未接続にしない。装着していなければ指摘する', () => {
    const rulesOf = (d: Diagram) => checkDiagram(d, lk).filter((i) => i.rule.startsWith('air') && i.rule !== 'air-exhaust-open').map((i) => `${i.rule}:${i.devices[0]}`);
    expect(rulesOf(diagram(true))).toEqual(['air-unconnected:CY1']);
    expect(rulesOf(diagram(false))).toEqual(expect.arrayContaining(['air-not-mounted:U1', 'air-no-supply:CY1']));
  });

  it('画面に出さないポートの使用圧力範囲も確かめる', () => {
    const d = diagram(true);
    d.devices[0].params = { tubeOD: 8, pressure: 0.2 };
    expect(checkDiagram(d, lk).filter((i) => i.rule === 'air-under-pressure').map((i) => i.devices[0])).toEqual(['U1']);
  });
});

describe('エアのポートから引いたときの候補', () => {
  it('エア源の出口からは一次側のポートを持つ機器、電磁弁の A からは作業ポートを持つ機器を出し、選ぶとチューブでつなぐ', () => {
    const d: Diagram = {
      devices: [
        { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3120-5lz', x: 300, y: 0 },
      ],
      wires: [],
    };
    const fromSource = airCandidates(d, { device: 'AIR1', terminal: 'OUT' }, deviceDefinitions, getDeviceDefinition);
    expect(fromSource[0]).toMatchObject({ device: 'SOL1', pairs: [{ from: 'OUT', to: 'P' }] });
    expect(fromSource.some((c) => !c.device && c.type === 'smc.sy3220-5lz')).toBe(true);
    const fromA = airCandidates(d, { device: 'SOL1', terminal: 'A' }, deviceDefinitions, getDeviceDefinition);
    expect(fromA.every((c) => c.pairs[0].to !== 'P')).toBe(true);
    const { diagram } = applyMateCandidate(d, { device: 'AIR1', terminal: 'OUT' }, fromSource[0], { x: 0, y: 0 }, getDeviceDefinition);
    expect(diagram.wires[0]).toMatchObject({ wireType: 'TU', tubeOD: 8, from: { device: 'AIR1', terminal: 'OUT' }, to: { device: 'SOL1', terminal: 'P' } });
  });
});

describe('ねじと直結', () => {
  const base = (silencer: string): Diagram => ({
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0, params: { tubeOD: 6 } },
      { id: 'SOL1', type: 'smc.sy3120-5lz', x: 0, y: 0 },
      { id: 'CY1', type: 'test.cylinder', x: 0, y: 0 },
      { id: 'SL1', type: 'smc.an', x: 0, y: 0, params: { thread: silencer } },
    ],
    wires: [tube('AIR1.OUT', 'SOL1.P'), tube('SOL1.A', 'CY1.H'), tube('SOL1.B', 'CY1.R'), tube('SL1.IN', 'SOL1.EA', 8)],
  });

  it('サイレンサを排気ポートにねじ込むのは直結（チューブの外径を問わない）。ねじの大きさが違えば指摘する', () => {
    expect(air(base('M5'))).toEqual([]);
    const issues = air(base('01'));
    expect(issues.map((i) => i.rule)).toEqual(['air-thread-mismatch']);
    expect(issues[0].message).toContain('ねじの大きさが合いません');
  });

  it('ねじのポートに付かない外径の継手を選ぶと指摘する（M5 に φ12 など）', () => {
    const m5: DeviceDefinition = {
      ...cylinder,
      type: 'test.m5',
      terminals: [port('H', { kind: 'work', tubeOD: 12, thread: 'M5' }), port('R', { kind: 'work', tubeOD: 12, thread: 'M5' })],
    };
    const look = (t: string) => (t === 'test.m5' ? m5 : lookup(t));
    const d: Diagram = { ...base('M5'), devices: base('M5').devices.map((x) => (x.id === 'CY1' ? { ...x, type: 'test.m5' } : x)) };
    const issues = checkDiagram(d, look).filter((i) => i.rule === 'air-fitting-thread');
    expect(issues.map((i) => i.message)).toEqual([
      'CY1: ポート H（M5）に φ12 のワンタッチ管継手は付きません（M5 に付くのは φ3.2・φ4・φ6）',
      'CY1: ポート R（M5）に φ12 のワンタッチ管継手は付きません（M5 に付くのは φ3.2・φ4・φ6）',
    ]);
  });
});

describe('開放排気・圧力計なし・ワンタッチ管継手形サイレンサ（#33）', () => {
  const exhaustOpen = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule === 'air-exhaust-open');

  it('電磁弁の排気ポートに何もつながなければ、開放排気の注意（info）を 1 件にまとめて出す', () => {
    const issues = exhaustOpen(circuit());
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toMatch(/^SOL1: 排気ポート .*・.* が開放です/);
  });

  it('排気ポートにサイレンサを付ければ注意しない。エアをつないでいない機器も対象外', () => {
    const exh = resolveDevice(getDeviceDefinition('smc.sy3120-5lz')!).terminals.filter((t) => t.air?.kind === 'exhaust');
    const d = circuit();
    exh.forEach((t, i) => {
      d.devices.push({ id: `SL${i + 1}`, type: 'smc.an', x: 0, y: 0, params: { thread: 'M5' } });
      d.wires.push(tube(`SL${i + 1}.IN`, `SOL1.${t.id}`));
    });
    expect(exhaustOpen(d)).toEqual([]);
    expect(exhaustOpen({ devices: [{ id: 'SOL9', type: 'smc.sy3120-5lz', x: 0, y: 0 }], wires: [] })).toEqual([]);
  });

  it('レギュレータの圧力計「なし」は型式に記号を付けず、空圧回路図の圧力計も描かない', () => {
    const aw = getDeviceDefinition('smc.aw')!;
    expect(deviceModel(aw, { gauge: '' })).toBe('AW20-02-B');
    expect(deviceModel(aw, { gauge: 'G' })).toBe('AW20-02G-B');
    expect(resolveDevice(aw, { gauge: '' }).pneumatic?.gauge).toBeFalsy();
    expect(resolveDevice(aw, { gauge: 'G' }).pneumatic?.gauge).toBe(true);
  });

  it('ワンタッチ管継手形サイレンサは、差込み側の外径で型式が決まる', () => {
    const an = getDeviceDefinition('smc.an-c')!;
    expect(deviceModel(an, { tubeOD: 8 })).toBe('AN15-C08');
    expect(deviceModel(an, { tubeOD: 12 })).toBe('AN30-C12');
  });
});

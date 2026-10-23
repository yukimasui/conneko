import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { buildModel } from '../check/model';
import { airPressures } from '../check/pneumatic';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import type { DeviceDefinition, TerminalDef } from '../devices/types';
import { computeBus, effectiveParams } from './bus';
import type { Diagram, DiagramWire } from './diagram';
import { addTerminalBlock } from './io';
import {
  addStation,
  airTargets,
  changeStationType,
  manifoldDevices,
  manifoldOf,
  manifoldRows,
  manifoldSummary,
  plcOutputs,
  setAllPorts,
  setPortTarget,
  setSolenoidOutput,
  stationTypes,
} from './manifold';
import { moveUnit, removeUnit } from './plc';
import { deviceModel } from '../devices/types';
import { bomRows } from '../export/reports';

const port = (id: string, air: TerminalDef['air']): TerminalDef => ({ id, x: 0, y: 0, side: 'top', role: 'air', air });
/** 複動シリンダ（テスト用） */
const cylinder: DeviceDefinition = {
  type: 'test.cylinder',
  name: 'シリンダ',
  model: 'CY',
  category: 'actuator',
  labelPrefix: 'CY',
  width: 10,
  height: 10,
  svg: '',
  terminals: [port('H', { kind: 'work', tubeOD: 6, minPressure: 0.05, maxPressure: 1 }), port('R', { kind: 'work', tubeOD: 6, minPressure: 0.05, maxPressure: 1 })],
};
const lookup = (type: string) => (type === cylinder.type ? cylinder : getDeviceDefinition(type));
const attrs = { color: 'blue', sizeSq: 0.75, wireType: 'KIV' };

const tube = (id: string, from: string, to: string, od = 8): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od };
};

/** エア源 → マニホールド（シングル・ダブル・ブランク）→ シリンダ */
function base(): Diagram {
  return {
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0, params: { tubeOD: 8 } },
      { id: 'MF1', type: 'smc.ss5y3-41', x: 200, y: 0 },
      { id: 'SOL1', type: 'smc.sy3140-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 1 } },
      { id: 'SOL2', type: 'smc.sy3240-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 2 } },
      { id: 'BP1', type: 'smc.sy3000-26-9a', x: 0, y: 0, mount: { device: 'MF1', slot: 3 } },
      { id: 'CY1', type: 'test.cylinder', x: 0, y: 300 },
      { id: 'CY2', type: 'test.cylinder', x: 200, y: 300 },
    ],
    wires: [tube('T1', 'AIR1.OUT', 'MF1.P')],
  };
}

describe('マニホールドの機器定義', () => {
  it('連数と A/B ポートの継手は装着した連から決まり、型式に入る', () => {
    const d = base();
    const bus = computeBus(d.devices, lookup);
    const host = d.devices.find((x) => x.id === 'MF1')!;
    const p = effectiveParams(host, bus);
    expect(p).toMatchObject({ stations: 3, portCode: 'C6' });
    expect(deviceModel(lookup('smc.ss5y3-41')!, p)).toBe('SS5Y3-41-03-C6');
    // 連ごとに継手が違えば M
    d.devices = d.devices.map((x) => (x.id === 'SOL2' ? { ...x, params: { portAB: 4 } } : x));
    expect(deviceModel(lookup('smc.ss5y3-41')!, effectiveParams(host, computeBus(d.devices, lookup)))).toBe('SS5Y3-41-03-M');
    // 何も装着していなければ連数 0
    const empty = { id: 'MF9', type: 'smc.ss5y5-41', x: 0, y: 0 };
    expect(deviceModel(lookup('smc.ss5y5-41')!, effectiveParams(empty, computeBus([empty], lookup)))).toBe('SS5Y5-41-00');
  });

  it('部品表にマニホールドの型式と各連の弁・ブランクプレートが載る', () => {
    const rows = bomRows(base(), lookup).filter((r) => r.category === 'valve');
    expect(rows.map((r) => [r.model, r.qty])).toEqual([
      ['SS5Y3-41-03-C6', 1],
      ['SY3000-26-9A', 1],
      ['SY3140-5LZ', 1],
      ['SY3240-5LZ', 1],
    ]);
  });

  it('同じシリーズの弁・ブランクプレートだけを連にできる', () => {
    const t = stationTypes(lookup('smc.ss5y3-41')!, deviceDefinitions);
    expect(t.valves.map((x) => x.model)).toEqual(['SY3140-5LZ', 'SY3240-5LZ', 'SY3340-5LZ', 'SY3440-5LZ', 'SY3540-5LZ']);
    expect(t.blanks.map((x) => x.model)).toEqual(['SY3000-26-9A']);
    // SY5000 の弁は SS5Y3 に装着できない
    const d = base();
    d.devices.push({ id: 'SOL9', type: 'smc.sy5140-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 4 } });
    expect(checkDiagram(d, lookup).some((i) => i.rule === 'mount-mismatch')).toBe(true);
  });
});

describe('マニホールドのエアの通路', () => {
  it('装着した電磁弁の P はマニホールドの P とつながり、A・B からシリンダまでエアが届く', () => {
    const d = base();
    d.wires.push(tube('T2', 'SOL1.A', 'CY1.H', 6), tube('T3', 'SOL1.B', 'CY1.R', 6));
    const p = airPressures(buildModel(d, lookup, () => {}));
    expect(p.get('MF1:P')).toBe(0.5);
    expect(p.get('SOL1:P')).toBe(0.5);
    expect(p.get('SOL2:P')).toBe(0.5);
    expect(p.get('CY1:H')).toBe(0.5);
    expect(p.get('CY1:R')).toBe(0.5);
    // 排気の通路にはエアを送らない
    expect(p.has('MF1:EA')).toBe(false);
    expect(p.has('SOL1:EA')).toBe(false);
  });

  it('マニホールドの中でつながるポートは未接続にせず、電磁弁ごとに使用圧力範囲を確かめる', () => {
    const d = base();
    d.devices.push({ id: 'SOL3', type: 'smc.sy3340-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 4 } });
    d.devices = d.devices.map((x) => (x.id === 'AIR1' ? { ...x, params: { tubeOD: 8, pressure: 0.4 } } : x));
    const air = checkDiagram(d, lookup).filter((i) => i.rule.startsWith('air'));
    expect(air.some((i) => i.message.includes('1(P)') || i.rule === 'air-no-supply' || i.rule === 'air-not-mounted')).toBe(false);
    // A・B は未接続
    expect(air.filter((i) => i.rule === 'air-unconnected' && i.devices[0] === 'SOL1').map((i) => i.message)).toEqual([
      'SOL1: ポート 4(A) が未接続です（チューブをつなぎます）',
      'SOL1: ポート 2(B) が未接続です（チューブをつなぎます）',
    ]);
    // 0.4MPa は 3 位置（0.2〜0.7MPa）にも足りる
    expect(air.some((i) => i.rule === 'air-under-pressure')).toBe(false);
  });

  it('使用圧力の下限に届かない電磁弁を指摘する（3 位置は 0.2MPa から）', () => {
    const d = base();
    d.devices.push({ id: 'SOL3', type: 'smc.sy3340-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 4 } });
    // レギュレータの代わりに、0.15MPa にしか届かない状態を作る（テスト用のエア源）
    const low: DeviceDefinition = { ...cylinder, type: 'test.low-source', category: 'air-supply', terminals: [port('OUT', { kind: 'supply', pressure: 0.15, tubeOD: 8 })] };
    const lk = (type: string) => (type === low.type ? low : lookup(type));
    d.devices = d.devices.map((x) => (x.id === 'AIR1' ? { ...x, type: low.type, params: {} } : x));
    const under = checkDiagram(d, lk).filter((i) => i.rule === 'air-under-pressure');
    expect(under.map((i) => i.devices[0]).sort()).toEqual(['SOL3']);
  });

  it('装着していないベース配管形の電磁弁は「マニホールドに装着されていません」と指摘する', () => {
    const d = base();
    d.devices.push({ id: 'SOL5', type: 'smc.sy3140-5lz', x: 0, y: 0 });
    const issues = checkDiagram(d, lookup).filter((i) => i.devices.includes('SOL5') && i.rule.startsWith('air'));
    expect(issues.map((i) => i.rule)).toContain('air-not-mounted');
    expect(issues.find((i) => i.rule === 'air-not-mounted')!.message).toBe(
      'SOL5: マニホールドに装着されていません（1(P)・5(EA)・3(EB) はマニホールドの中で SUP・EXH につながります）',
    );
  });

  it('マニホールドの排気ポートにエアを送ると指摘する', () => {
    const d = base();
    d.wires = [tube('T1', 'AIR1.OUT', 'MF1.EA')];
    const rules = checkDiagram(d, lookup).map((i) => i.rule);
    expect(rules).toContain('air-exhaust-pressurized');
  });
});

describe('バルブエディタの操作', () => {
  it('マニホールドと連を見分ける', () => {
    const d = base();
    expect(manifoldOf(d, 'SOL2', lookup)).toBe('MF1');
    expect(manifoldOf(d, 'MF1', lookup)).toBe('MF1');
    expect(manifoldOf(d, 'CY1', lookup)).toBeUndefined();
    expect([...manifoldDevices(d, lookup)].sort()).toEqual(['BP1', 'MF1', 'SOL1', 'SOL2']);
  });

  it('連を追加・並べ替え・削除する', () => {
    let d = base();
    const r = addStation(d, 'MF1', lookup('smc.sy3540-5lz')!, lookup, 1);
    d = r.diagram;
    expect(r.id).toBe('SOL3');
    expect(manifoldRows(d, 'MF1', lookup).map((x) => x.device.id)).toEqual(['SOL3', 'SOL1', 'SOL2', 'BP1']);
    d = moveUnit(d, 'MF1', 'BP1', 1, lookup);
    expect(manifoldRows(d, 'MF1', lookup).map((x) => `${x.slot}:${x.device.id}`)).toEqual(['1:BP1', '2:SOL3', '3:SOL1', '4:SOL2']);
    d = removeUnit(d, 'SOL3', lookup);
    expect(manifoldRows(d, 'MF1', lookup).map((x) => `${x.slot}:${x.device.id}`)).toEqual(['1:BP1', '2:SOL1', '3:SOL2']);
    expect(manifoldSummary(d, 'MF1', lookup)).toMatchObject({ model: 'SS5Y3-41-03-C6', stations: 3, solenoids: 3 });
  });

  it('連の機種を変えると、残る端子の電線とパラメータを引き継ぐ。ブランクプレートにすると名前を付け直す', () => {
    let d = base();
    d.devices = d.devices.map((x) => (x.id === 'SOL2' ? { ...x, params: { portAB: 4 } } : x));
    d.wires.push(
      { id: 'W1', from: { device: 'SOL2', terminal: 'A+' }, to: { device: 'SOL1', terminal: 'A+' }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' },
      { id: 'W2', from: { device: 'SOL2', terminal: 'B+' }, to: { device: 'SOL1', terminal: 'A-' }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' },
    );
    // ダブル → シングル: B 側の電線は外れる
    d = changeStationType(d, 'SOL2', 'smc.sy3140-5lz', lookup);
    expect(d.devices.find((x) => x.id === 'SOL2')).toMatchObject({ type: 'smc.sy3140-5lz', params: { portAB: 4 }, mount: { device: 'MF1', slot: 2 } });
    expect(d.wires.map((w) => w.id)).toEqual(['T1', 'W1']);
    // ブランクプレートへ: 名前は BP2、電線は外れる
    d = changeStationType(d, 'SOL2', 'smc.sy3000-26-9a', lookup);
    expect(d.devices.find((x) => x.mount?.slot === 2)).toMatchObject({ id: 'BP2', type: 'smc.sy3000-26-9a' });
    expect(d.devices.find((x) => x.id === 'BP2')!.params).toBeUndefined();
    expect(d.wires.map((w) => w.id)).toEqual(['T1']);
  });

  it('A・B ポートの継手をそろえる', () => {
    const d = setAllPorts(base(), 'MF1', 4, lookup);
    expect(d.devices.filter((x) => x.params?.portAB === 4).map((x) => x.id)).toEqual(['SOL1', 'SOL2']);
  });

  it('A・B のつなぎ先を選ぶとチューブを引き、別のシートならエアのリンクでつなぐ。つなぎ直すと前のチューブとリンクを消す', () => {
    let d: Diagram = { ...base(), sheets: [{ id: 'S1', name: 'エア' }, { id: 'S2', name: '機械' }] };
    d.devices = d.devices.map((x) => (x.id === 'CY2' ? { ...x, sheet: 'S2' } : x));
    expect(airTargets(d, 'MF1', lookup).map((t) => t.name)).toEqual(['CY1.H', 'CY1.R', 'CY2.H', 'CY2.R']);
    d = setPortTarget(d, 'SOL1', 'A', { device: 'CY1', terminal: 'H' }, lookup);
    const t = d.wires.find((w) => w.from.device === 'SOL1' && w.from.terminal === 'A')!;
    expect(t).toMatchObject({ to: { device: 'CY1', terminal: 'H' }, wireType: 'TU', tubeOD: 6 });
    expect(manifoldRows(d, 'MF1', lookup)[0].ports[0].peers.map((p) => p.name)).toEqual(['CY1.H']);

    // 別のシートのシリンダへ: エアのリンクを 2 つ置く
    d = setPortTarget(d, 'SOL1', 'A', { device: 'CY2', terminal: 'H' }, lookup);
    const links = d.devices.filter((x) => x.type === 'generic.air-link');
    expect(links.map((l) => [l.sheet, l.params?.name])).toEqual([
      ['S1', 'SOL1-A'],
      ['S2', 'SOL1-A'],
    ]);
    expect(d.wires.some((w) => w.to.device === 'CY1')).toBe(false);
    expect(manifoldRows(d, 'MF1', lookup)[0].ports[0].peers).toMatchObject([{ name: 'CY2.H', via: ['SOL1-A'] }]);

    // 外すと、リンクとチューブも消える
    d = setPortTarget(d, 'SOL1', 'A', null, lookup);
    expect(d.devices.some((x) => x.type === 'generic.air-link')).toBe(false);
    expect(d.wires.map((w) => w.id)).toEqual(['T1']);
  });

  it('ソレノイドに PLC の出力をつなぐ（シンク出力は − 側）。つなぎ直すと前の出力を外す', () => {
    let d = base();
    d.devices.push(
      { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 600 },
      { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0, mount: { device: 'PLC1', slot: 1 } },
    );
    d = addTerminalBlock(d, 'OUT1', 'CN1', deviceDefinitions, lookup);
    const outs = plcOutputs(d, lookup).filter((p) => p.endpoint);
    expect(outs[0]).toMatchObject({ address: 'R000', kind: 'npn' });
    d = setSolenoidOutput(d, 'SOL2', 'B', outs[0], attrs, lookup);
    let rows = manifoldRows(d, 'MF1', lookup);
    expect(rows[1].solenoids.map((s) => [s.side, s.outputs.map((p) => p.address)])).toEqual([
      ['A', []],
      ['B', ['R000']],
    ]);
    const w = d.wires.find((x) => x.to.device === 'SOL2' || x.from.device === 'SOL2')!;
    expect([w.from, w.to].find((r) => r.device === 'SOL2')!.terminal).toBe('B-');
    expect(w.wireNo).toBe('R000');
    expect(rows[1].solenoids[1].commonWired).toBe(false);

    // 別の出力へつなぎ直す
    d = setSolenoidOutput(d, 'SOL2', 'B', outs[1], attrs, lookup);
    rows = manifoldRows(d, 'MF1', lookup);
    expect(rows[1].solenoids[1].outputs.map((p) => p.address)).toEqual([outs[1].address]);
    expect(d.wires.filter((x) => x.from.device === 'SOL2' || x.to.device === 'SOL2')).toHaveLength(1);
    // 外す
    d = setSolenoidOutput(d, 'SOL2', 'B', null, attrs, lookup);
    expect(manifoldRows(d, 'MF1', lookup)[1].solenoids[1].outputs).toEqual([]);
  });
});

/**
 * 通信タイプ（SI ユニット付き）のマニホールド SS5Y□-10S と、プラグイン形の電磁弁 SY□□00-5U1 のテスト。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { buildModel } from '../check/model';
import { airPressures } from '../check/pneumatic';
import { deviceDefinitions, getDeviceDefinition, instantiateSvg } from '../devices/registry';
import { isLanPort, resolveDevice } from '../devices/resolve';
import { siUnitModel } from '../devices/smc/sy-serial';
import { deviceModel, type DeviceDefinition, type TerminalDef } from '../devices/types';
import { bomRows, ioRows } from '../export/reports';
import { buildSchematic } from '../schematic/layout';
import { computeBus, effectiveParams, serialOutputName } from './bus';
import type { Diagram, DiagramWire } from './diagram';
import { addStation, changeStationType, isSerialManifold, manifoldRows, manifoldSummary, stationTypes } from './manifold';
import { hasMateCandidates } from './mates';
import { isLanCable, splitCrossSheetWires } from './ops';
import { moveUnit, removeUnit } from './plc';
import { suggestConnections } from './suggest';

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
  pneumatic: { symbol: 'cylinder', ports: { head: 'H', rod: 'R' }, cylinder: { acting: 'double' } },
};
const lookup = (type: string) => (type === cylinder.type ? cylinder : getDeviceDefinition(type));

const ref = (s: string) => {
  const [device, terminal] = s.split('.');
  return { device, terminal };
};
const tube = (id: string, from: string, to: string, od = 8): DiagramWire => ({ id, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od });
const cable = (id: string, from: string, to: string): DiagramWire => ({ id, from: ref(from), to: ref(to), color: 'black', sizeSq: 0, wireType: 'CABLE' });
const wire = (id: string, from: string, to: string): DiagramWire => ({ id, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0.75, wireType: 'KIV' });

/** エア源 → SI ユニット付きのマニホールド（シングル・ダブル・ブランク・3 位置）。SI ユニットは KV-X の EtherCAT ポートと電源ケーブルにつなぐ */
function base(params: Record<string, string> = {}): Diagram {
  return {
    devices: [
      { id: 'AIR1', type: 'generic.air-source', x: 0, y: 0, params: { tubeOD: 8 } },
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'PLC1', type: 'keyence.kv-x530', x: 0, y: 0 },
      { id: 'MF1', type: 'smc.ss5y3-10s', x: 200, y: 0, params },
      { id: 'SOL1', type: 'smc.sy3100-5u1', x: 0, y: 0, mount: { device: 'MF1', slot: 1 }, note: 'プッシャ 前進' },
      { id: 'SOL2', type: 'smc.sy3200-5u1', x: 0, y: 0, mount: { device: 'MF1', slot: 2 }, note: 'チャック 閉 / 開' },
      { id: 'BP1', type: 'smc.sy30m-26-1a', x: 0, y: 0, mount: { device: 'MF1', slot: 3 } },
      { id: 'SOL3', type: 'smc.sy3300-5u1', x: 0, y: 0, mount: { device: 'MF1', slot: 4 } },
      { id: 'CBL1', type: 'smc.ex500-ap050-s', x: 0, y: 0 },
      { id: 'CY1', type: 'test.cylinder', x: 0, y: 300 },
    ],
    wires: [
      tube('T1', 'AIR1.OUT', 'MF1.P'),
      cable('C1', 'PLC1.PORT3', 'MF1.IN'),
      cable('C2', 'CBL1.CN', 'MF1.PWR'),
      wire('W1', 'PSU1.+V1', 'CBL1.BN'),
      wire('W2', 'PSU1.-V1', 'CBL1.WH'),
      wire('W3', 'PSU1.+V1', 'CBL1.BU'),
      wire('W4', 'PSU1.-V1', 'CBL1.BK'),
    ],
  };
}

const solParams = (d: Diagram) => {
  const bus = computeBus(d.devices, lookup);
  return Object.fromEntries(['SOL1', 'SOL2', 'BP1', 'SOL3'].map((id) => [id, bus.params.get(id) ?? {}]));
};

describe('通信タイプのマニホールドの機器定義', () => {
  it('型式は SI ユニットの記号・極性・連数から決まり、11 連からは P・E ポートが両側（B）になる', () => {
    const def = lookup('smc.ss5y3-10s')!;
    const d = base();
    const host = d.devices.find((x) => x.id === 'MF1')!;
    expect(deviceModel(def, effectiveParams(host, computeBus(d.devices, lookup)))).toBe('SS5Y3-10SDA-04D-C6');
    const pnp16 = { ...host, params: { protocol: 'F', points: 'B', polarity: 'PNP' } };
    expect(deviceModel(def, effectiveParams(pnp16, computeBus([pnp16], lookup)))).toBe('SS5Y3-10SFBN-00D');
    // 11 連
    const many: Diagram['devices'] = [host, ...Array.from({ length: 11 }, (_, i) => ({ id: `SOL${i + 1}`, type: 'smc.sy3100-5u1', x: 0, y: 0, mount: { device: 'MF1', slot: i + 1 } }))];
    expect(deviceModel(def, effectiveParams(host, computeBus(many, lookup)))).toBe('SS5Y3-10SDA-11B-C6');
    expect(lookup('smc.ss5y5-10s')!.model).toBe('SS5Y5-10S');
  });

  it('SI ユニットの型式は通信方式・出力点数・極性で決まる（EX260 カタログの記号）', () => {
    expect(siUnitModel({ protocol: 'D', points: 'A', polarity: 'NPN' })).toBe('EX260-SEC2');
    expect(siUnitModel({ protocol: 'D', points: 'A', polarity: 'PNP' })).toBe('EX260-SEC1');
    expect(siUnitModel({ protocol: 'E', points: 'B', polarity: 'NPN' })).toBe('EX260-SEN4');
    expect(siUnitModel({ protocol: 'F', points: 'B', polarity: 'PNP' })).toBe('EX260-SPN3');
  });

  it('通信ポートは M12 D コードで、通信方式のプロトコルを持ち、RJ-45 とつなげる。電源は M12 のコネクタ', () => {
    const def = lookup('smc.ss5y3-10s')!;
    for (const [protocol, protocols, pins] of [
      ['D', ['ethercat'], 5],
      ['E', ['ethernet-ip'], 4],
      ['F', ['profinet'], 5],
    ] as const) {
      const r = resolveDevice(def, { protocol });
      expect(r.terminal('IN')?.connector).toMatchObject({ kind: 'M12D', mates: ['RJ45'], protocols });
      expect(r.terminal('OUT')?.connector?.protocols).toEqual(protocols);
      expect(r.terminal('PWR')?.connector).toMatchObject({ kind: 'M12-5', pins });
      expect(isLanPort(r.terminal('IN')?.connector)).toBe(true);
      expect(hasMateCandidates(r.terminal('IN')?.connector)).toBe(false);
    }
    // プラグイン形の弁にはソレノイドの電気端子がない
    const v = resolveDevice(lookup('smc.sy3200-5u1')!);
    expect(v.terminals.map((t) => t.id)).toEqual(['A', 'B']);
    expect(isSerialManifold(def)).toBe(true);
    expect(isSerialManifold(lookup('smc.ss5y3-41'))).toBe(false);
  });

  it('タイプ 10 のプラグイン形の弁・ブランクプレートだけを連にできる', () => {
    const t = stationTypes(lookup('smc.ss5y3-10s')!, deviceDefinitions);
    expect(t.valves.map((x) => x.model)).toEqual(['SY3100-5U1', 'SY3200-5U1', 'SY3300-5U1', 'SY3400-5U1', 'SY3500-5U1']);
    expect(t.blanks.map((x) => x.model)).toEqual(['SY30M-26-1A']);
    const d = base();
    d.devices.push({ id: 'SOL9', type: 'smc.sy3140-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 5 } });
    expect(checkDiagram(d, lookup).some((i) => i.rule === 'mount-mismatch')).toBe(true);
  });
});

describe('SI ユニットの出力の割付け', () => {
  it('ダブル配線はどの連も 2 点（シングルの B 側・ブランクプレートは空き）', () => {
    const p = solParams(base());
    expect(p.SOL1).toEqual({ solA: 0 });
    expect(p.SOL2).toEqual({ solA: 2, solB: 3 });
    expect(p.BP1).toEqual({});
    expect(p.SOL3).toEqual({ solA: 6, solB: 7 });
    const bus = computeBus(base().devices, lookup);
    expect(bus.serial.get('MF1')?.points.map((x) => `${x.output}:${x.device}${x.side ?? '-'}`)).toEqual([
      '0:SOL1A',
      '1:SOL1-',
      '2:SOL2A',
      '3:SOL2B',
      '4:BP1-',
      '5:BP1-',
      '6:SOL3A',
      '7:SOL3B',
    ]);
    expect(serialOutputName(bus, 'SOL2', 'B')).toBe('MF1 出力3');
    expect(serialOutputName(bus, 'SOL1', 'B')).toBeUndefined();
  });

  it('配線指定はソレノイドの数だけ（ブランクプレートは 1 点）', () => {
    const p = solParams(base({ wiring: 'specified' }));
    expect(p.SOL1).toEqual({ solA: 0 });
    expect(p.SOL2).toEqual({ solA: 1, solB: 2 });
    expect(p.SOL3).toEqual({ solA: 4, solB: 5 });
  });

  it('連の並べ替え・機種の変更・削除で出力番号が付け直される', () => {
    let d = moveUnit(base(), 'MF1', 'SOL3', 1, lookup);
    expect(solParams(d).SOL3).toEqual({ solA: 0, solB: 1 });
    expect(solParams(d).SOL1).toEqual({ solA: 2 });
    d = changeStationType(d, 'SOL1', 'smc.sy3200-5u1', lookup);
    expect(solParams(d).SOL1).toEqual({ solA: 2, solB: 3 });
    d = removeUnit(d, 'SOL3', lookup);
    expect(solParams(d).SOL1).toEqual({ solA: 0, solB: 1 });
    const r = addStation(d, 'MF1', lookup('smc.sy3100-5u1')!, lookup);
    expect(computeBus(r.diagram.devices, lookup).params.get(r.id)).toEqual({ solA: 6 });
  });

  it('SI ユニットの点数を超えると指摘する（16 点でダブル配線 9 連）', () => {
    const d = base({ points: 'B' });
    for (let i = 5; i <= 9; i++) d.devices.push({ id: `SOL${i + 5}`, type: 'smc.sy3100-5u1', x: 0, y: 0, mount: { device: 'MF1', slot: i } });
    const issue = checkDiagram(d, lookup).find((i) => i.rule === 'manifold-outputs-over');
    expect(issue?.message).toContain('EX260-SEC4 の出力は 16 点まで');
    expect(issue?.message).toContain('18 点');
    // 配線指定なら 13 点で収まる
    d.devices = d.devices.map((x) => (x.id === 'MF1' ? { ...x, params: { points: 'B', wiring: 'specified' } } : x));
    expect(checkDiagram(d, lookup).some((i) => i.rule === 'manifold-outputs-over')).toBe(false);
  });

  it('弁の絵の札に出力番号を書く', () => {
    const d = base();
    const bus = computeBus(d.devices, lookup);
    const sol2 = d.devices.find((x) => x.id === 'SOL2')!;
    expect(instantiateSvg(lookup(sol2.type)!, 'x', effectiveParams(sol2, bus))).toContain('2・3');
  });
});

describe('通信タイプのマニホールドのチェック', () => {
  it('EtherCAT のポートと電源ケーブルにつなげば、通信・電源の指摘はない', () => {
    const issues = checkDiagram(base(), lookup).filter((i) => i.devices.includes('MF1') || i.devices.includes('CBL1'));
    expect(issues.filter((i) => !i.rule.startsWith('air')).map((i) => i.message)).toEqual([]);
  });

  it('PLC のポートとプロトコルが合わなければ警告する', () => {
    const d = base({ protocol: 'F' });
    expect(checkDiagram(d, lookup).some((i) => i.rule === 'protocol-mismatch' && i.devices.includes('MF1'))).toBe(true);
  });

  it('制御用の電源をつながなければ指摘し、EtherNet/IP の芯線の並びの違い（極性）も確かめる', () => {
    const d = base();
    d.wires = d.wires.filter((w) => w.id !== 'W3' && w.id !== 'W4');
    expect(checkDiagram(d, lookup).filter((i) => i.rule === 'no-power').map((i) => i.message)).toEqual([
      'MF1 の端子 3 SI24V に電源が来ていません',
      'MF1 の端子 4 SI0V に電源が来ていません',
    ]);
    // EtherNet/IP の SI ユニットは 2 白が電磁弁用 +24V
    expect(checkDiagram(base({ protocol: 'E' }), lookup).some((i) => i.rule === 'conductor-mismatch')).toBe(true);
  });

  it('電源ケーブル・通信のつなぎ忘れは、見えないピンごとではなくコネクタ 1 つで警告する（#32）', () => {
    const noPower = base();
    noPower.wires = noPower.wires.filter((w) => w.id !== 'C2');
    const issues = checkDiagram(noPower, lookup).filter((i) => i.devices.includes('MF1'));
    expect(issues.filter((i) => i.rule === 'unconnected')).toEqual([]);
    expect(issues.filter((i) => i.rule === 'connector-unconnected').map((i) => i.message)).toEqual(['MF1: コネクタ PWR（M12） がつながっていません']);
    const noBus = base();
    noBus.wires = noBus.wires.filter((w) => w.id !== 'C1');
    expect(checkDiagram(noBus, lookup).filter((i) => i.rule === 'connector-unconnected').map((i) => i.message)).toEqual(['MF1: コネクタ BUS IN がつながっていません']);
  });

  it('電源の消費電流に、装着した弁のソレノイドの電流を数える（#32）', () => {
    // SOL1 シングル 1・SOL2 ダブル 2・SOL3 3 位置 2 ＝ ソレノイド 5 個 × 0.017A ＋ 制御用 0.1A
    expect(computeBus(base().devices, lookup).params.get('MF1')?.loadCurrent).toBe(0.185);
  });

  it('シートをまたぐ SI ユニットと PLC の通信ケーブルは、ネットワークリンクに置き換える（#32）', () => {
    const d = base();
    const sheets = [{ id: 'S1', name: 'A' }, { id: 'S2', name: 'B' }];
    const moved: Diagram = { ...d, sheets, devices: d.devices.map((x) => ({ ...x, sheet: x.id === 'PLC1' ? 'S2' : 'S1' })) };
    expect(isLanCable(moved, moved.wires.find((w) => w.id === 'C1')!, lookup)).toBe(true);
    const split = splitCrossSheetWires(moved, lookup);
    expect(split.wires.some((w) => w.id === 'C1')).toBe(false);
    expect(split.devices.filter((x) => x.type === 'generic.network-link')).toHaveLength(2);
  });

  it('装着した弁の P はマニホールドの P とつながり、A・B からシリンダまでエアが届く', () => {
    const d = base();
    d.wires.push(tube('T2', 'SOL2.A', 'CY1.H', 6), tube('T3', 'SOL2.B', 'CY1.R', 6));
    const p = airPressures(buildModel(d, lookup, () => {}));
    expect(p.get('SOL1:P')).toBe(0.5);
    expect(p.get('CY1:H')).toBe(0.5);
    expect(p.get('CY1:R')).toBe(0.5);
    expect(checkDiagram(d, lookup).some((i) => i.rule === 'air-not-mounted' || (i.rule === 'air-no-supply' && i.devices.includes('SOL2')))).toBe(false);
  });
});

describe('通信タイプのマニホールドの一覧・図', () => {
  it('部品表にマニホールドの型式（SI ユニットの型式も）と各連の弁・ブランクプレート・電源ケーブルが載る', () => {
    const rows = bomRows(base(), lookup).filter((r) => r.category === 'valve');
    expect(rows.map((r) => [r.model, r.qty])).toEqual([
      ['EX500-AP050-S', 1],
      ['SS5Y3-10SDA-04D-C6', 1],
      ['SY30M-26-1A', 1],
      ['SY3100-5U1', 1],
      ['SY3200-5U1', 1],
      ['SY3300-5U1', 1],
    ]);
    expect(rows[1].spec).toContain('SI ユニット EX260-SEC2');
  });

  it('I/O 表に SI ユニットの出力（空きの点も）を載せる', () => {
    const rows = ioRows(base(), lookup).filter((r) => r.host === 'MF1');
    expect(rows.map((r) => [r.address, r.connections, r.comment])).toEqual([
      ['出力0', 'SOL1', 'プッシャ 前進'],
      ['出力1', '', '（空き）'],
      ['出力2', 'SOL2（SOL A）', 'チャック 閉 / 開'],
      ['出力3', 'SOL2（SOL B）', 'チャック 閉 / 開'],
      ['出力4', '', '（空き）'],
      ['出力5', '', '（空き）'],
      ['出力6', 'SOL3（SOL A）', ''],
      ['出力7', 'SOL3（SOL B）', ''],
    ]);
    expect(rows.every((r) => r.model === 'EX260-SEC2' && r.dir === '出力')).toBe(true);
  });

  it('空圧回路図のソレノイドの横にマニホールド名と出力番号を書く', () => {
    const d = base();
    d.wires.push(tube('T2', 'SOL2.A', 'CY1.H', 6), tube('T3', 'SOL2.B', 'CY1.R', 6));
    d.schematic = { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] };
    const texts = buildSchematic(d, lookup).doc.sheets[0].texts.map((t) => t.text);
    expect(texts).toContain('SOL1（MF1 出力0）');
    expect(texts).toContain('SOL2A（MF1 出力2）');
    expect(texts).toContain('SOL2B（MF1 出力3）');
  });

  it('バルブエディタの連の一覧に出力番号、概要に SI ユニットと使う点数が出る', () => {
    const d = base();
    const rows = manifoldRows(d, 'MF1', lookup);
    expect(rows.map((r) => r.serial.map((p) => `${p.output}${p.side ?? '-'}`).join(' '))).toEqual(['0A 1-', '2A 3B', '4- 5-', '6A 7B']);
    expect(rows.every((r) => r.solenoids.length === 0)).toBe(true);
    const s = manifoldSummary(d, 'MF1', lookup);
    expect(s).toMatchObject({ model: 'SS5Y3-10SDA-04D-C6', stations: 4, solenoids: 5, serial: { unitModel: 'EX260-SEC2', used: 8, outputs: 32, wiring: 'double' } });
  });

  it('通信ポートから引くと、ネットワークの候補を出す', () => {
    const d = base();
    d.wires = d.wires.filter((w) => w.id !== 'C1');
    expect(suggestConnections(d, { device: 'MF1', terminal: 'IN' }, lookup).networks).toEqual([]);
    expect(suggestConnections(d, { device: 'MF1', terminal: 'IN' }, lookup).defaultName).toBe('ECAT1');
  });
});

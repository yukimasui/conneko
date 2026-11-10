/**
 * 空圧の残り（GitHub issue #78・#33）で追加した機器・仕組みのテスト。
 * - SMC VQC1000 のプラグイン形マニホールド VV5QC11（D サブ 25 ピン・フラットケーブル 26 ピン）とプラグイン形の弁:
 *   コネクタのピンの割付け、PLC の出力 → ケーブル → ピン → コイル → COM の配線のチェック、バルブエディタの操作、I/O 表・空圧回路図
 * - SMC デジタル圧力スイッチ ISE30A（出力の形式とリード線）
 * - SMC ソフトスタート弁 AV2000（エアの通り道・コイル・空圧回路図の記号）
 * - M3 のポートに直付けするスピードコントローラ（AS1201F-M3）と、異径継手 KQ2R の空圧回路図の記号
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { buildModel } from '../check/model';
import { airPressures } from '../check/pneumatic';
import { bomRows, ioRows } from '../export/reports';
import { computeBus, effectiveParams, plugInPinOf } from '../model/bus';
import type { Diagram, DiagramWire } from '../model/diagram';
import { manifoldRows, manifoldSummary, setPlugInOutput } from '../model/manifold';
import { buildSchematic } from '../schematic/layout';
import { hasEstimates } from './estimates';
import { familyOf } from './families';
import { getDeviceDefinition } from './registry';
import { resolveDevice } from './resolve';
import { elbowModel } from './smc/speed-controller';
import { deviceModel, type DeviceDefinition, type ParamValues } from './types';

const lookup = getDeviceDefinition;
const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

let seq = 0;
const ref = (s: string) => ({ device: s.slice(0, s.indexOf('.')), terminal: s.slice(s.indexOf('.') + 1) });
const tube = (from: string, to: string, od = 6): DiagramWire => ({ id: `T${++seq}`, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od });
const wire = (from: string, to: string): DiagramWire => ({ id: `W${++seq}`, from: ref(from), to: ref(to), color: 'blue', sizeSq: 0.75, wireType: 'KIV' });
const cable = (from: string, to: string): DiagramWire => ({ id: `C${++seq}`, from: ref(from), to: ref(to), color: 'black', sizeSq: 0, wireType: 'CABLE' });
const dev = (id: string, type: string, params?: ParamValues, extra: object = {}) => ({ id, type, x: 0, y: 0, ...(params ? { params } : {}), ...extra });
const mount = (id: string, type: string, slot: number, params?: ParamValues, host = 'MF1') => dev(id, type, params, { mount: { device: host, slot } });
const issues = (d: Diagram) => checkDiagram(d, lookup);
const errorRules = (d: Diagram) =>
  issues(d)
    .filter((i) => i.severity === 'error')
    .map((i) => i.rule);

const VQC = ['smc.vv5qc11-f', 'smc.vv5qc11-p', 'smc.vqc1100-51', 'smc.vqc1200-51', 'smc.vqc1300-51', 'smc.vqc1400-51', 'smc.vqc1500-51', 'smc.vvq1000-10a-1', 'smc.axt100-ds25'];

/**
 * KV-B16TD（シンク出力。COM に 0V）→ D サブケーブル → VV5QC11（F キット）。
 * 連 1 = VQC1200（ダブル）、連 2 = VQC1100（シングル）、連 3 = ブランクプレート
 */
function plugInDiagram(opts: { com?: '+V1' | '-V1'; valveParams?: ParamValues; wiring?: string } = {}): Diagram {
  return {
    devices: [
      dev('PSU1', 'generic.psu.dc24v'),
      dev('OUT1', 'keyence.kv-b16td'),
      dev('MF1', 'smc.vv5qc11-f', opts.wiring ? { wiring: opts.wiring } : undefined),
      mount('SOL1', 'smc.vqc1200-51', 1, opts.valveParams),
      mount('SOL2', 'smc.vqc1100-51', 2, opts.valveParams),
      mount('BP1', 'smc.vvq1000-10a-1', 3),
      dev('CBL1', 'smc.axt100-ds25'),
      dev('AIR1', 'generic.air-source', { tubeOD: 8 }),
      dev('CY1', 'smc.cm2'),
    ],
    wires: [
      cable('MF1.CN', 'CBL1.CN'),
      wire('PSU1.-V1', 'OUT1.C0'),
      wire(`PSU1.${opts.com ?? '+V1'}`, 'CBL1.13'),
      wire('OUT1.0', 'CBL1.1'),
      wire('OUT1.1', 'CBL1.14'),
      wire('OUT1.2', 'CBL1.2'),
      tube('AIR1.OUT', 'MF1.P', 8),
      tube('SOL1.A', 'CY1.HEAD'),
      tube('SOL1.B', 'CY1.ROD'),
    ],
  };
}

describe('VQC1000 のプラグイン形マニホールド（VV5QC11）', () => {
  it('登録され、マニホールド・電磁弁・ブランクプレート・ケーブルのファミリーに入る', () => {
    for (const t of [...VQC, 'generic.mil-terminal-block.26p']) expect(getDeviceDefinition(t), t).toBeDefined();
    expect(familyOf('smc.vv5qc11-f')?.name).toBe('マニホールド');
    expect(familyOf('smc.vv5qc11-p')?.name).toBe('マニホールド');
    expect(familyOf('smc.vqc1200-51')?.name).toBe('電磁弁');
    expect(familyOf('smc.vvq1000-10a-1')?.name).toBe('ブランクプレート（マニホールド用）');
    expect(familyOf('smc.axt100-ds25')?.name).toBe('ケーブル（片側バラ線）');
    expect(familyOf('generic.mil-terminal-block.26p')?.name).toBe('MIL 変換端子台');
    for (const t of VQC) expect(hasEstimates(def(t)), t).toBe(true);
  });

  it('連の順にコネクタのピンを割り付ける（D サブ: 連 n の A は n、B は n + 13。ダブル配線はシングル・ブランクの連も 2 本）', () => {
    const d = plugInDiagram();
    const bus = computeBus(d.devices, lookup);
    expect(bus.plugIn.get('MF1')?.points.map((p) => `${p.pin}${p.side ?? '-'}`)).toEqual(['1A', '14B', '2A', '15-', '3-', '16-']);
    expect(plugInPinOf(bus, 'SOL1', 'B')).toEqual({ host: 'MF1', pinId: 'CN#14', pin: 14 });
    expect(bus.params.get('SOL2')).toMatchObject({ solA: 2 });
    // 型式は連数と A/B の継手（ケーブルなしの FD0）
    const mf = d.devices.find((x) => x.id === 'MF1')!;
    expect(deviceModel(def('smc.vv5qc11-f'), effectiveParams(mf, bus))).toBe('VV5QC11-03C6FD0');
    // ピン: ソレノイドのピンはコイル（プラスコモンは − 側）、COM は +、空きは信号
    const r = resolveDevice(def('smc.vv5qc11-f'), effectiveParams(mf, bus));
    expect(r.pin('CN#1')).toMatchObject({ role: 'input', label: '1 連1 SOL.A', loadCurrent: 0.017 });
    expect(r.accepts.get('CN#1')?.[0].conductors).toEqual(['-']);
    expect(r.pin('CN#13')).toMatchObject({ role: 'input', loadCurrent: 0.051 });
    expect(r.accepts.get('CN#13')?.[0].conductors).toEqual(['+']);
    expect(r.pin('CN#15')).toMatchObject({ role: 'signal', optional: true });
    // 弁の札にピン番号
    const sol1 = d.devices.find((x) => x.id === 'SOL1')!;
    expect(String(def('smc.vqc1200-51').svg instanceof Function ? (def('smc.vqc1200-51').svg as (p: ParamValues) => string)({ ...effectiveParams(sol1, bus), portAB: 6 }) : '')).toContain('1・14');
  });

  it('配線指定はシングルの連を 1 本にして詰める。ダブル配線で 12 連を超えるとピンが足りない', () => {
    const spec = computeBus(plugInDiagram({ wiring: 'specified' }).devices, lookup);
    expect(spec.plugIn.get('MF1')?.points.map((p) => `${p.pin}${p.side ?? '-'}`)).toEqual(['1A', '14B', '2A', '15-']);
    const many: Diagram = {
      devices: [dev('MF1', 'smc.vv5qc11-f'), ...Array.from({ length: 13 }, (_, i) => mount(`SOL${i + 1}`, 'smc.vqc1100-51', i + 1))],
      wires: [],
    };
    expect(computeBus(many.devices, lookup).problems.map((p) => p.rule)).toContain('manifold-pins-over');
    many.devices[0] = dev('MF1', 'smc.vv5qc11-f', { wiring: 'specified' });
    expect(computeBus(many.devices, lookup).problems.map((p) => p.rule)).not.toContain('manifold-pins-over');
  });

  it('シンク出力 → ケーブル → ピン → コイル → COM（+24V）でエラーがない。COM に 0V をつなぐと極性の誤り', () => {
    expect(errorRules(plugInDiagram())).toEqual([]);
    expect(errorRules(plugInDiagram({ com: '-V1' }))).toContain('conductor-mismatch');
    // マイナスコモンの弁（N）にすると、シンク出力・COM +24V は極性の誤り。型式は VQC1200N-51 と -N
    const neg = plugInDiagram({ valveParams: { common: 'N' } });
    expect(errorRules(neg)).toContain('conductor-mismatch');
    expect(deviceModel(def('smc.vqc1200-51'), { common: 'N', seal: '1' })).toBe('VQC1201N-51');
    const bus = computeBus(neg.devices, lookup);
    expect(deviceModel(def('smc.vv5qc11-f'), effectiveParams(neg.devices[2], bus))).toBe('VV5QC11-03C6FD0-N');
  });

  it('コネクタにケーブルをつながないと警告し、つないだのに出力がないソレノイドは電源が来ていない', () => {
    const d = plugInDiagram();
    expect(issues({ ...d, wires: d.wires.filter((w) => w.wireType !== 'CABLE') }).some((i) => i.rule === 'connector-unconnected' && i.devices.includes('MF1'))).toBe(true);
    // 出力 1 → 芯線 14（連 1 の SOL.B）の電線を外す
    const noOut = { ...d, wires: d.wires.filter((w) => !(w.from.device === 'OUT1' && w.from.terminal === '1')) };
    expect(issues(noOut).filter((i) => i.rule === 'no-power').map((i) => i.message)).toEqual(['MF1 の端子 14 連1 SOL.B に電源が来ていません']);
  });

  it('連の弁は SUP・EXH の通路で給気され、圧力が A・B へ届く', () => {
    const p = airPressures(buildModel(plugInDiagram(), lookup, () => {}));
    expect(p.get('SOL1:A')).toBe(p.get('MF1:P'));
    expect(p.get('CY1:HEAD')).toBeGreaterThan(0);
  });

  it('I/O 表・空圧回路図に、ソレノイドの出力がピンを通して出る', () => {
    const d = plugInDiagram();
    const rows = ioRows(d, lookup);
    const r0 = rows.find((r) => r.address.endsWith('000') || r.address === 'R000' || r.connections.includes('MF1.CN#1'));
    expect(r0?.connections).toContain('MF1.CN#1');
    const page = buildSchematic({ ...d, schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] } }, lookup).doc.sheets[0];
    const texts = page.texts.map((t) => t.text);
    expect(texts.some((t) => t.startsWith('SOL1A（') && t.includes(r0!.address))).toBe(true);
    expect(texts.some((t) => t.startsWith('VV5QC11-03C6FD0'))).toBe(true);
  });

  it('バルブエディタ: ピンと出力を表示し、出力を選ぶとケーブルの芯線へ電線を引く', () => {
    const d = plugInDiagram();
    const rows = manifoldRows(d, 'MF1', lookup);
    expect(rows.map((r) => r.plugIn.map((s) => `${s.side}${s.pin}:${s.endpoint?.device}.${s.endpoint?.terminal}:${s.outputs.length}`))).toEqual([
      ['A1:CBL1.1:1', 'B14:CBL1.14:1'],
      ['A2:CBL1.2:1'],
      [],
    ]);
    const summary = manifoldSummary(d, 'MF1', lookup);
    expect(summary.plugIn).toMatchObject({ used: 6, capacity: 24, wiring: 'double', common: ['13'], commonWired: true });
    // SOL2 の A を出力 3 に付け替える
    const out3 = rows[1].plugIn[0];
    const next = setPlugInOutput(d, 'MF1', 'SOL2', 'A', { device: 'OUT1', terminal: '3' }, { color: 'blue', sizeSq: 0.75, wireType: 'KIV' }, lookup);
    expect(next.wires.some((w) => w.from.device === 'OUT1' && w.from.terminal === '2' && w.to.terminal === out3.endpoint?.terminal)).toBe(false);
    expect(next.wires.some((w) => [w.from, w.to].some((x) => x.device === 'OUT1' && x.terminal === '3') && [w.from, w.to].some((x) => x.device === 'CBL1' && x.terminal === '2'))).toBe(true);
    expect(errorRules(next)).toEqual([]);
    // 外す
    const off = setPlugInOutput(next, 'MF1', 'SOL2', 'A', null, { color: 'blue', sizeSq: 0.75, wireType: 'KIV' }, lookup);
    expect(manifoldRows(off, 'MF1', lookup)[1].plugIn[0].outputs).toEqual([]);
  });

  it('フラットケーブル 26 ピン（P キット）は MIL 26 極の変換端子台でつなぐ（連 1 の A が 1、B が 2、COM が 25・26）', () => {
    const d: Diagram = {
      devices: [
        dev('PSU1', 'generic.psu.dc24v'),
        dev('OUT1', 'keyence.kv-b16td'),
        dev('MF1', 'smc.vv5qc11-p'),
        mount('SOL1', 'smc.vqc1200-51', 1),
        dev('TB1', 'generic.mil-terminal-block.26p'),
      ],
      wires: [cable('MF1.CN', 'TB1.CN'), wire('PSU1.-V1', 'OUT1.C0'), wire('PSU1.+V1', 'TB1.25'), wire('OUT1.0', 'TB1.1'), wire('OUT1.1', 'TB1.2')],
    };
    expect(computeBus(d.devices, lookup).plugIn.get('MF1')?.points.map((p) => p.pin)).toEqual([1, 2]);
    expect(errorRules(d)).toEqual([]);
    expect(manifoldRows(d, 'MF1', lookup)[0].plugIn.map((s) => s.endpoint?.terminal)).toEqual(['1', '2']);
    expect(deviceModel(def('smc.vv5qc11-p'), effectiveParams(d.devices[2], computeBus(d.devices, lookup)))).toBe('VV5QC11-01C6PD0');
  });

  it('部品表にマニホールド・弁・ブランクプレート・ケーブルが型式で載る', () => {
    const models = bomRows(plugInDiagram(), lookup).map((r) => r.model);
    for (const m of ['VV5QC11-03C6FD0', 'VQC1200-51', 'VQC1100-51', 'VVQ1000-10A-1', 'AXT100-DS25-030']) expect(models, m).toContain(m);
  });
});

describe('デジタル圧力スイッチ ISE30A', () => {
  it('型式・リード線（1 出力は 3 芯、2 出力・アナログ出力は白を足した 4 芯）と出力の信号', () => {
    const d = def('smc.ise30a');
    expect(familyOf('smc.ise30a')?.name).toBe('圧力スイッチ');
    expect(deviceModel(d, {})).toBe('ISE30A-01-N-L');
    expect(deviceModel(d, { piping: 'C6H', output: 'A' })).toBe('ISE30A-C6H-A-L');
    expect(resolveDevice(d).terminals.map((t) => t.id)).toEqual(['BN', 'BK', 'BU', 'P']);
    const two = resolveDevice(d, { output: 'B' });
    expect(two.terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'pnp' });
    expect(two.links.map((l) => `${l.from}>${l.to}`)).toEqual(['BK>BN', 'WH>BN']);
    expect(resolveDevice(d, { output: 'C' }).terminal('WH')?.signal).toEqual({ dir: 'out', kind: 'analog-v', ref: 'BU' });
    expect(resolveDevice(d, { output: 'D' }).terminal('WH')?.signal?.kind).toBe('analog-i');
    // R1/8 のおねじ（相手のめねじにねじ込む）、ワンタッチ管継手は外径
    expect(resolveDevice(d).air.get('P')).toMatchObject({ kind: 'in', thread: 'R1/8', male: true, maxPressure: 1.0 });
    expect(resolveDevice(d, { piping: 'C4H' }).air.get('P')).toMatchObject({ tubeOD: 4 });
    expect(hasEstimates(d)).toBe(true);
  });

  it('NPN 出力はプラスコモンの入力につなぐとエラーがない', () => {
    const d: Diagram = {
      devices: [dev('PSU1', 'generic.psu.dc24v'), dev('IN1', 'keyence.kv-b16xc'), dev('PS1', 'smc.ise30a', { piping: 'C6H' })],
      wires: [wire('PSU1.+V1', 'IN1.C0'), wire('PSU1.+V1', 'PS1.BN'), wire('PSU1.-V1', 'PS1.BU'), wire('PS1.BK', 'IN1.0')],
    };
    expect(errorRules(d)).toEqual([]);
  });
});

describe('ソフトスタート弁 AV2000', () => {
  /** エア源 → AV1 → 電磁弁。AV1 のコイルはシンク出力で駆動 */
  const avDiagram = (): Diagram => ({
    devices: [
      dev('PSU1', 'generic.psu.dc24v'),
      dev('OUT1', 'keyence.kv-b16td'),
      dev('AIR1', 'generic.air-source', { tubeOD: 8 }),
      dev('AV1', 'smc.av2000'),
      dev('SOL1', 'smc.sy3120-5lz'),
      dev('CY1', 'smc.cm2'),
    ],
    wires: [
      wire('PSU1.-V1', 'OUT1.C0'),
      wire('PSU1.+V1', 'AV1.1'),
      wire('OUT1.0', 'AV1.2'),
      wire('PSU1.+V1', 'SOL1.+'),
      wire('OUT1.1', 'SOL1.-'),
      tube('AIR1.OUT', 'AV1.IN', 8),
      tube('AV1.OUT', 'SOL1.P', 8),
      tube('SOL1.A', 'CY1.HEAD'),
      tube('SOL1.B', 'CY1.ROD'),
    ],
  });

  it('通電で IN → OUT へ通し、コイルは DC24V・1.8W。極性を逆にすると誤り', () => {
    const d = avDiagram();
    expect(familyOf('smc.av2000')?.name).toBe('ソフトスタート弁（残圧排気・電磁式）');
    expect(deviceModel(def('smc.av2000'), { port: '01' })).toBe('AV2000-01-5DZ');
    expect(errorRules(d)).toEqual([]);
    const p = airPressures(buildModel(d, lookup, () => {}));
    expect(p.get('SOL1:P')).toBe(p.get('AIR1:OUT'));
    expect(def('smc.av2000').loadCurrent).toBe(0.075);
    const swap = (t: string) => (t === '1' ? '2' : t === '2' ? '1' : t);
    const rev = { ...d, wires: d.wires.map((w) => (w.to.device === 'AV1' ? { ...w, to: { device: 'AV1', terminal: swap(w.to.terminal) } } : w)) };
    expect(errorRules(rev)).toContain('conductor-mismatch');
  });

  it('空圧回路図: エア源と電磁弁の間に、ソレノイドの PLC 出力と型式を付けて描く', () => {
    const page = buildSchematic({ ...avDiagram(), schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] } }, lookup).doc.sheets[0];
    const texts = page.texts.map((t) => t.text);
    expect(texts).toContain('AV2000-02-5DZ');
    expect(texts.some((t) => /^AV1（R\d+）$/.test(t))).toBe(true);
  });
});

describe('M3 のポートに直付けするスピードコントローラ・異径継手の記号', () => {
  it('AS1201F-M3（φ3.2・φ4）の型式。M3 に φ6 はない', () => {
    expect(elbowModel('M3', 4, 'meter-out')).toBe('AS1201F-M3-04A');
    expect(elbowModel('M3', 3.2, 'meter-out')).toBe('AS1201F-M3-23A');
    expect(elbowModel('M3', 6, 'meter-out')).toBeUndefined();
    expect(deviceModel(def('smc.as2201f'), { size: 'M3-04' })).toBe('AS1201F-M3-04A');
  });

  it('MSQ サイズ 1（M3）に直付けすると部品表に載り、空圧回路図に速度制御弁の型式が出る', () => {
    const d: Diagram = {
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6 }), dev('SOL1', 'smc.sy3120-5lz', { portAB: 4 }), dev('RT1', 'smc.msq', { size: 1, speedController: 'meter-out' })],
      wires: [tube('AIR1.OUT', 'SOL1.P'), tube('SOL1.A', 'RT1.A', 4), tube('SOL1.B', 'RT1.B', 4)],
    };
    expect(bomRows(d, lookup).find((r) => r.model === 'AS1201F-M3-04A')?.qty).toBe(2);
    const texts = buildSchematic({ ...d, schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] } }, lookup).doc.sheets[0].texts.map((t) => t.text);
    expect(texts).toContain('AS1201F');
  });

  it('KQ2R は異径継手の記号（reducer）で、作業ポートの配管の途中に名前・型式を付けて描く', () => {
    expect(resolveDevice(def('smc.kq2r')).pneumatic).toEqual({ symbol: 'reducer', ports: { a: 'TUBE', b: 'PLUG' } });
    const d: Diagram = {
      devices: [dev('AIR1', 'generic.air-source', { tubeOD: 6 }), dev('SOL1', 'smc.sy3120-5lz'), dev('J1', 'smc.kq2r', { size: '6-8' }), dev('CY1', 'smc.cm2')],
      wires: [tube('AIR1.OUT', 'SOL1.P'), tube('SOL1.A', 'J1.TUBE'), tube('J1.PLUG', 'CY1.HEAD', 8), tube('SOL1.B', 'CY1.ROD')],
    };
    const texts = buildSchematic({ ...d, schematic: { sheets: [{ id: 'D1', name: '空圧回路図', kind: 'pneumatic', items: [] }] } }, lookup).doc.sheets[0].texts.map((t) => t.text);
    expect(texts).toContain('J1');
    expect(texts).toContain('KQ2R06-08A');
  });
});

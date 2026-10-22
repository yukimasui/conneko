/**
 * IAI（アイエイアイ）のコントローラー・ケーブルの機器定義の整合性と、代表的な配線での電気チェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { busAccepts, computeBus } from '../model/bus';
import type { Diagram, DiagramWire } from '../model/diagram';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import { paramsWithDefaults, type DeviceDefinition, type ParamValues } from './types';
import { paramVariants, validateDefinition } from './validate';

const iai = deviceDefinitions.filter((d) => d.maker === 'IAI');

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

describe('IAI 機器定義', () => {
  it('type が一意で iai. で始まる', () => {
    expect(iai.length).toBeGreaterThan(0);
    const types = iai.map((d) => d.type);
    expect(new Set(types).size).toBe(types.length);
    for (const t of types) expect(t.startsWith('iai.')).toBe(true);
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: すべてのパラメーターの組で定義が整合している', (_, d) => {
    for (const v of paramVariants(d)) expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: コネクターのピンはすべて定義され、通信ポートには protocols がある', (_, d) => {
    for (const v of paramVariants(d)) {
      const r = resolveDevice(d, v);
      for (const t of r.terminals) {
        if (!t.connector) continue;
        if (t.connector.pins > 0) {
          const n = r.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length;
          expect(n, `${JSON.stringify(v)} ${t.id} のピン数`).toBe(t.connector.pins);
        }
        if (t.connector.kind === 'RJ45') expect(t.connector.protocols?.length, `${t.id} の protocols`).toBeGreaterThan(0);
      }
    }
  });

  it.each(iai.map((d) => [d.type, d] as const))('%s: 出力点から出る内部経路はすべて switch: output', (_, d) => {
    for (const v of paramVariants(d)) {
      const r = resolveDevice(d, v);
      for (const l of r.links) {
        const from = r.terminal(l.from) ?? r.pin(l.from);
        if (from?.signal?.dir === 'out' && from.signal.kind !== 'line-driver') expect(l.switch, `${l.from}`).toBe('output');
      }
    }
  });
});

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const cable = (from: string, to: string) => w(from, to, { wireType: 'CABLE' });
const lookup = (t: string) => getDeviceDefinition(t);
const errorsOf = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.severity === 'error');
const rulesOf = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);

describe('PCON-CB の PIO と PLC の出力', () => {
  /**
   * KEYENCE KV-C32TC（NPN 出力）→ MIL 34極 変換端子台 → PIO ケーブル CB-PAC-PIO のバラ線 → PCON-CB の PIO。
   * KV-C32TC の No.1（MIL 標準ピン 1 = 端子台 1）を PCON の IN0（5A）へ、COM0（No.17 = 標準ピン 33）を 0V へ。
   */
  const base = (pcon: ParamValues = {}): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0 },
      { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      { id: 'CBL1', type: 'iai.cb-pac-pio', x: 0, y: 0 },
      { id: 'PCON1', type: 'iai.pcon-cb', x: 0, y: 0, params: pcon },
    ],
    wires: [
      cable('OUT1.CN1', 'TB1.CN'),
      cable('PCON1.PIO', 'CBL1.CN'),
      w('PSU1.-V1', 'TB1.33'),
      // PLC の出力 R200 → PCON の IN0（PC1）
      w('TB1.1', 'CBL1.5A'),
      // PIO の I/O 電源
      w('PSU1.+V1', 'CBL1.1A'),
      w('PSU1.-V1', 'CBL1.19B'),
      // PCON の制御電源・非常停止
      w('PSU1.+V2', 'PCON1.24V'),
      w('PSU1.-V2', 'PCON1.0V'),
      w('PCON1.MPO', 'PCON1.MPI'),
      w('PSU1.+V2', 'PCON1.EMG-'),
    ],
  });

  it('NPN 出力 → NPN 仕様（プラスコモン）の入力はエラーなし', () => {
    const d = base();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('signal-polarity');
  });

  it('NPN 出力 → PNP 仕様（マイナスコモン）の入力は signal-polarity エラー', () => {
    const d = base({ io: 'PN' });
    expect(errorsOf(d).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('PIO の I/O 電源（1A）に 0V をつなぐと極性エラー', () => {
    const d = base();
    d.wires = d.wires.map((x) => (x.to.device === 'CBL1' && x.to.terminal === '1A' ? { ...x, from: { device: 'PSU1', terminal: '-V2' } } : x));
    expect(errorsOf(d).map((i) => i.rule)).toContain('conductor-mismatch');
  });
});

describe('フィールドネットワークのポートの通信方式', () => {
  const net = (pconIo: string, plc: string, port: string): Diagram => ({
    devices: [
      { id: 'PLC1', type: plc, x: 0, y: 0 },
      { id: 'PCON1', type: 'iai.pcon-cb', x: 0, y: 0, params: { io: pconIo } },
    ],
    wires: [cable(`PLC1.${port}`, 'PCON1.NET1')],
  });

  it('EtherCAT の PCON-CB を KV-8000 の Ethernet（EtherNet/IP）ポートにつなぐと protocol-mismatch', () => {
    expect(rulesOf(net('EC', 'keyence.kv-8000.cpu', 'ETH'))).toContain('protocol-mismatch');
  });

  it('EtherNet/IP の PCON-CB を KV-8000 の Ethernet ポートにつなぐと通信方式の警告はない', () => {
    expect(rulesOf(net('EP', 'keyence.kv-8000.cpu', 'ETH'))).not.toContain('protocol-mismatch');
  });

  it('EtherCAT の PCON-CB を KV-X550 の EtherCAT ポート（PORT3）につなぐと警告はない', () => {
    expect(rulesOf(net('EC', 'keyence.kv-x550', 'PORT3'))).not.toContain('protocol-mismatch');
  });

  it('通信ポートの端子ID は I/O 種類を変えても NET1 / NET2', () => {
    for (const io of ['EC', 'CIE', 'EP', 'PRT', 'ML3']) {
      const r = resolveDevice(def('iai.pcon-cb'), { io });
      expect(r.terminal('NET1')?.connector?.protocols?.length, io).toBeGreaterThan(0);
    }
    expect(resolveDevice(def('iai.pcon-cb'), { io: 'EC' }).terminal('NET2')?.label).toBe('EtherCAT OUT');
    expect(resolveDevice(def('iai.pcon-cb'), { io: 'EC' }).terminal('PIO')).toBeUndefined();
  });
});

describe('非常停止・STO', () => {
  it('PCON-CB の EMG- は安全入力で、+24V を加えて非常停止を解除する（DC24V の受電端子）', () => {
    const r = resolveDevice(def('iai.pcon-cb'));
    expect(r.terminal('EMG-')?.function).toBe('safety-input');
    expect(r.accepts.get('EMG-')?.[0]).toMatchObject({ system: 'DC', conductors: ['+'] });
  });

  it('SCON-CB の STO 仕様は /SRI1+・/SRI2+ が 2 チャンネルの安全入力', () => {
    const r = resolveDevice(def('iai.scon-cb'), { safety: 'STO' });
    expect(r.pin('STO#4')).toMatchObject({ function: 'safety-input', channel: 1 });
    expect(r.pin('STO#6')).toMatchObject({ function: 'safety-input', channel: 2 });
    expect(r.safetyChannels.find((g) => g.id === 'STO')?.channels.map((c) => c.input)).toEqual(['STO#4', 'STO#6']);
    expect(resolveDevice(def('iai.scon-cb')).terminal('STO')).toBeUndefined();
  });

  /** KEYENCE GC-S84 の安全出力（OSSD）So0/So1 を、安全機能用 I/O ケーブル経由で SCON-CB の STO へ */
  const sto = (both = true): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'GC1', type: 'keyence.gc-s84', x: 0, y: 0 },
      { id: 'SC1', type: 'iai.scon-cb', x: 0, y: 0, params: { safety: 'STO' } },
      { id: 'CBL1', type: 'iai.cb-sc-sto', x: 0, y: 0 },
    ],
    wires: [
      w('PSU1.+V1', 'GC1.+24V'),
      w('PSU1.-V1', 'GC1.0V'),
      cable('SC1.STO', 'CBL1.CN'),
      w('GC1.So0', 'CBL1./SRI1+'),
      ...(both ? [w('GC1.So1', 'CBL1./SRI2+')] : []),
      w('PSU1.-V2', 'CBL1./SRI1-'),
      w('PSU1.-V2', 'CBL1./SRI2-'),
    ],
  });

  it('安全コントローラーの OSSD 2 本を STO の /SRI1+・/SRI2+ につなぐとエラーなし', () => {
    const d = sto();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('safety-channel-partial');
  });

  it('STO の片側だけを配線すると片側配線の指摘（設定で使い方が決まる入力として注意）', () => {
    expect(rulesOf(sto(false))).toContain('safety-channel-partial');
  });
});

describe('プログラムコントローラー（MSEL・XSEL・PSEL）', () => {
  it('category は plc で、入出力点がポート番号のラベルを持つ', () => {
    const msel = resolveDevice(def('iai.msel'));
    expect(def('iai.msel').category).toBe('plc');
    expect(msel.pin('I/O1#9')?.label).toBe('IN000（5A）');
    expect(msel.pin('I/O1#2')?.label).toBe('OUT300（1B）');
    const xsel = resolveDevice(def('iai.xsel-ra'));
    expect(xsel.pin('I/O1#2')?.label).toBe('IN000（2）');
    expect(xsel.pin('I/O1#34')?.label).toBe('OUT300（34）');
    expect(xsel.pin('I/O1#1')?.role).toBe('input');
    expect(xsel.pin('I/O1#50')?.accepts).toMatchObject({ conductors: ['-'] });
  });

  it('XSEL の PIO ボード（MIL 50 極）は MIL 50 極変換端子台・CB-X-PIO とつながる', () => {
    const io1 = resolveDevice(def('iai.xsel-ra')).terminal('I/O1')!.connector!;
    expect(connectorsMate(io1, resolveDevice(def('generic.mil-terminal-block.50p')).terminal('CN')!.connector!)).toBe(true);
    expect(connectorsMate(io1, resolveDevice(def('iai.cb-x-pio')).terminal('CN')!.connector!)).toBe(true);
  });

  /** XSEL のシステム I/O を出荷時の短絡線どおりに配線し、非常停止スイッチ（b 接点）を EMG1 の後ろに入れる */
  const xsel = (estop = true): Diagram => ({
    devices: [
      { id: 'XSEL1', type: 'iai.xsel-ra', x: 0, y: 0 },
      { id: 'ES1', type: 'idec.xw1e-bv402mr', x: 0, y: 0 },
    ],
    wires: [
      w('XSEL1.EMG24V', 'XSEL1.EMG1+'),
      ...(estop ? [w('XSEL1.EMG1-', 'ES1.21'), w('ES1.22', 'XSEL1.EMGIN')] : [w('XSEL1.EMG1-', 'XSEL1.EMGIN')]),
      w('XSEL1.ENB24V', 'XSEL1.ENB1+'),
      w('XSEL1.ENB1-', 'XSEL1.ENBIN'),
    ],
  });

  it('XSEL の非常停止入力（EMGin）に内蔵 24V から非常停止スイッチの b 接点を通して戻すと、指摘なし', () => {
    const issues = checkDiagram(xsel(), lookup).filter((i) => i.devices.includes('XSEL1'));
    expect(issues.filter((i) => i.severity === 'error')).toEqual([]);
    // 内蔵 24V から戻す停止入力は電源の受電端子ではないので、制御電源の保護（overload）には数えない
    expect(issues.map((i) => i.rule)).not.toContain('overload');
    expect(issues.map((i) => i.rule)).not.toContain('estop-not-nc');
  });

  it('XSEL の非常停止のループに a 接点を入れると注意（estop-not-nc）', () => {
    const d = xsel(false);
    d.devices.push({ id: 'MC1', type: 'mitsubishi.s-t10.ac200v', x: 0, y: 0 });
    d.wires = d.wires.filter((x) => !(x.from.terminal === 'EMG1-' && x.to.terminal === 'EMGIN'));
    d.wires.push(w('XSEL1.EMG1-', 'MC1.13'), w('MC1.14', 'XSEL1.EMGIN'));
    expect(rulesOf(d)).toContain('estop-not-nc');
  });

  it('MSEL の出力（NPN）から KEYENCE の入力ユニット（プラスコモン）へつなぐとエラーなし、PNP 仕様の MSEL だと極性エラー', () => {
    const d = (io: string): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'MSEL1', type: 'iai.msel', x: 0, y: 0, params: { io } },
        { id: 'CBL1', type: 'iai.cb-pac-pio', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      ],
      wires: [
        cable('MSEL1.I/O1', 'CBL1.CN'),
        w('PSU1.+V1', 'CBL1.1A'),
        w('PSU1.-V1', 'CBL1.19B'),
        // MSEL の出力ポート 300（1B）→ KV-B16XC の入力 0、入力ユニットの COM は +24V（プラスコモン）
        w('CBL1.1B', 'IN1.0'),
        w('PSU1.+V2', 'IN1.C0'),
      ],
    });
    expect(rulesOf(d('NP'))).not.toContain('signal-polarity');
    expect(errorsOf(d('PN')).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('PSEL の PIO（34 極）は CB-DS-PIO とつながり、出力ポート 300（13B）から KEYENCE の入力（プラスコモン）へは NPN でエラーなし、PNP だと極性エラー', () => {
    const psel = resolveDevice(def('iai.psel'));
    expect(connectorsMate(psel.terminal('I/O')!.connector!, resolveDevice(def('iai.cb-ds-pio')).terminal('CN')!.connector!)).toBe(true);
    expect(psel.pin('I/O#2')?.label).toContain('IN016');
    expect(psel.pin('I/O#26')?.label).toContain('OUT300');
    const d = (io: string): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'PSEL1', type: 'iai.psel', x: 0, y: 0, params: { io } },
        { id: 'CBL1', type: 'iai.cb-ds-pio', x: 0, y: 0 },
        { id: 'IN1', type: 'keyence.kv-b16xc', x: 0, y: 0 },
      ],
      wires: [
        cable('PSEL1.I/O', 'CBL1.CN'),
        w('PSU1.+V1', 'CBL1.1A'),
        w('PSU1.-V1', 'CBL1.17B'),
        w('CBL1.13B', 'IN1.0'),
        w('PSU1.+V2', 'IN1.C0'),
      ],
    });
    expect(rulesOf(d('NPN'))).not.toContain('signal-polarity');
    expect(errorsOf(d('PNP')).map((i) => i.rule)).toContain('signal-polarity');
  });
});

describe('R-unit（RCON・RSEL・REC）の連結', () => {
  const dev = (id: string, type: string, slot?: number, params?: ParamValues) => ({ id, type, x: 0, y: 0, ...(slot ? { mount: { device: 'GW1', slot } } : {}), ...(params ? { params } : {}) });

  it('ゲートウェイユニットにドライバーユニット・EC 接続ユニット・PIO ユニット・ターミナルユニットを連結できる', () => {
    const gw = def('iai.rcon-gw');
    for (const t of ['iai.rcon-pc', 'iai.rcon-ac', 'iai.rcon-dc', 'iai.rcon-ec', 'iai.rcon-ps2', 'iai.rcon-sc', 'iai.rcon-np', 'iai.rcon-tr']) {
      expect(busAccepts(gw, def(t)), t).toBe(true);
      expect(busAccepts(def('iai.rsel'), def(t)), t).toBe(true);
    }
    expect(busAccepts(gw, def('keyence.kv-b16xc'))).toBe(false);
  });

  it('モーター電源（MP）の消費の合計がゲートウェイユニットの上限 37.5A を超えると bus-overload', () => {
    const devices = [dev('GW1', 'iai.rcon-gw'), ...Array.from({ length: 8 }, (_, i) => dev(`D${i}`, 'iai.rcon-pc', i + 1, { mpLoad: 4.6 }))];
    const layout = computeBus(devices, getDeviceDefinition);
    const mp = layout.groups.get('GW1')!.rails.find((r) => r.rail === 'MP')!;
    expect(mp.supply).toBeCloseTo(37.5);
    expect(mp.load).toBeCloseTo(8 * 4.6);
    expect(layout.problems.map((p) => p.rule)).not.toContain('bus-overload');
    const more = [...devices, dev('D8', 'iai.rcon-pc', 9, { mpLoad: 4.6 })];
    expect(computeBus(more, getDeviceDefinition).problems.map((p) => p.rule)).toContain('bus-overload');
  });
});

describe('IAI のケーブル・コネクター', () => {
  it('CB-PAC-PIO は PCON-CB の PIO コネクターにつながり、ピン 5A（CN#9）と芯線 5A が導通する', () => {
    const pcon = resolveDevice(def('iai.pcon-cb'));
    const cbl = resolveDevice(def('iai.cb-pac-pio'));
    expect(connectorsMate(pcon.terminal('PIO')!.connector!, cbl.terminal('CN')!.connector!)).toBe(true);
    expect(pcon.pin('PIO#9')?.label).toContain('IN0');
    expect(cbl.links).toContainEqual({ from: 'CN#9', to: '5A' });
    expect(paramsWithDefaults(def('iai.pcon-cb'), {}).io).toBe('NP');
  });
});

describe('アクチュエーター（ロボシリンダー・エレシリンダー）とコントローラーの接続', () => {
  const on = (d: Diagram, id: string) => checkDiagram(d, lookup).filter((i) => i.devices.includes(id));

  /** PCON-CB（電源・非常停止を配線済み）とアクチュエーターを 1 台ずつ、モーター・エンコーダー一体型ケーブルでつなぐ */
  const pcon = (axType: string, axParams: ParamValues = {}, ctrl = 'iai.pcon-cb', ctrlParams: ParamValues = {}): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'C1', type: ctrl, x: 0, y: 0, params: ctrlParams },
      { id: 'AX1', type: axType, x: 0, y: 0, params: axParams },
    ],
    wires: [
      w('PSU1.+V1', 'C1.24V'),
      w('PSU1.-V1', 'C1.0V'),
      w('C1.MPO', 'C1.MPI'),
      w('PSU1.+V1', 'C1.EMG-'),
      cable('C1.MPG', 'AX1.MPG'),
    ],
  });

  it('PCON-CB と RCP6（適応コントローラー P3）をケーブルでつなぐとエラーなし（スライダー・ロッドとも）', () => {
    for (const t of ['iai.rcp6-sa', 'iai.rcp6-ra']) {
      const d = pcon(t);
      expect(errorsOf(d), t).toEqual([]);
      expect(on(d, 'AX1'), t).toEqual([]);
    }
    // ブレーキ付きでも配線は変わらない
    expect(errorsOf(pcon('iai.rcp6-sa', { brake: 'B' }))).toEqual([]);
  });

  it('RCP6 の高推力タイプ（SA8C・RA8C、P4）は PCON-CB にはつながらず、PCON-CFB にはつながる', () => {
    expect(rulesOf(pcon('iai.rcp6-sa', { type: 'SA8C' }))).toContain('connector-mismatch');
    expect(rulesOf(pcon('iai.rcp6-ra', { type: 'RA8C' }))).toContain('connector-mismatch');
    expect(errorsOf(pcon('iai.rcp6-sa', { type: 'SA8C' }, 'iai.pcon-cfb'))).toEqual([]);
    expect(rulesOf(pcon('iai.rcp6-sa', {}, 'iai.pcon-cfb'))).toContain('connector-mismatch');
  });

  it('適応コントローラーの違うアクチュエーターをつなぐと connector-mismatch（RCP6 → ACON-CB、RCA2 → PCON-CB、RCD → PCON-CB）', () => {
    expect(rulesOf(pcon('iai.rcp6-sa', {}, 'iai.acon-cb'))).toContain('connector-mismatch');
    expect(rulesOf(pcon('iai.rca2-rn'))).toContain('connector-mismatch');
    expect(rulesOf(pcon('iai.rcd-ra1da'))).toContain('connector-mismatch');
    expect(errorsOf(pcon('iai.rca2-rn', {}, 'iai.acon-cb'))).toEqual([]);
    expect(errorsOf(pcon('iai.rcd-ra1da', {}, 'iai.dcon-cb'))).toEqual([]);
  });

  it('コネクターの種類の対応: RCP6 P3 は MSEL（PC）・MCON、P5 は RCON-PC、P6 は RCON-PCF、RCA2 A6 は RCON-AC、RCD D6 は RCON-DC', () => {
    const conn = (type: string, params: ParamValues, id: string) => resolveDevice(def(type), params).terminal(id)!.connector!;
    const mate = (a: [string, ParamValues, string], b: [string, ParamValues, string]) => connectorsMate(conn(...a), conn(...b));
    expect(mate(['iai.rcp6-sa', {}, 'MPG'], ['iai.msel', {}, 'MPG1'])).toBe(true);
    expect(mate(['iai.rcp6-sa', {}, 'MPG'], ['iai.msel', { model: 'PCF' }, 'MPG1'])).toBe(false);
    expect(mate(['iai.rcp6-sa', { type: 'SA8C' }, 'MPG'], ['iai.msel', { model: 'PGF' }, 'MPG1'])).toBe(true);
    expect(mate(['iai.rcp6-sa', {}, 'MPG'], ['iai.mcon-c', {}, 'AX0'])).toBe(true);
    expect(mate(['iai.rcp6-sa', {}, 'MPG'], ['iai.pcon-cyb', {}, 'MPG'])).toBe(true);
    expect(mate(['iai.rcp6-sa', { ctrl: 'rcon' }, 'MPG'], ['iai.rcon-pc', {}, 'MPG1'])).toBe(true);
    expect(mate(['iai.rcp6-sa', { ctrl: 'rcon' }, 'MPG'], ['iai.pcon-cb', {}, 'MPG'])).toBe(false);
    expect(mate(['iai.rcp6-ra', { type: 'RA8C', ctrl: 'rcon' }, 'MPG'], ['iai.rcon-pc', { model: 'RCON-PCF-1' }, 'MPG1'])).toBe(true);
    expect(mate(['iai.rcp6-ra', { ctrl: 'rcon' }, 'MPG'], ['iai.rcon-pc', { model: 'RCON-PCF-1' }, 'MPG1'])).toBe(false);
    expect(mate(['iai.rca2-rn', {}, 'MPG'], ['iai.acon-cyb', {}, 'MPG'])).toBe(true);
    expect(mate(['iai.rca2-rn', { ctrl: 'A6' }, 'MPG'], ['iai.rcon-ac', {}, 'MPG1'])).toBe(true);
    expect(mate(['iai.rcd-ra1da', { ctrl: 'D6' }, 'MPG'], ['iai.rcon-dc', {}, 'MPG1'])).toBe(true);
    // RCON-PC の端子ID はモデルを変えても同じ
    expect(resolveDevice(def('iai.rcon-pc'), { model: 'RCON-PCF-1' }).terminal('MPG1')).toBeDefined();
  });

  /** SCON-CB（または SCON2）と RCS4 をモーターケーブル・エンコーダーケーブルでつなぐ。bk: ブレーキ電源を配線するか */
  const scon = (axParams: ParamValues, bk: boolean, ctrl = 'iai.scon-cb'): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'C1', type: ctrl, x: 0, y: 0 },
      { id: 'AX1', type: 'iai.rcs4-sa', x: 0, y: 0, params: axParams },
    ],
    wires: [
      cable('C1.MOT', 'AX1.MOT'),
      cable('C1.PG', 'AX1.PG'),
      ...(bk ? [w('PSU1.+V1', 'C1.BK+'), w('PSU1.-V1', ctrl === 'iai.scon-cb' ? 'C1.PWR-' : 'C1.BK-')] : []),
    ],
  });

  it('RCS4（T2）は SCON-CB の MOT・PG につながり、T4 は SCON2 につながる（逆は connector-mismatch）', () => {
    expect(on(scon({}, false), 'AX1')).toEqual([]);
    expect(rulesOf(scon({ ctrl: 'T4' }, false))).toContain('connector-mismatch');
    expect(on(scon({ ctrl: 'T4' }, false, 'iai.scon2'), 'AX1')).toEqual([]);
    expect(rulesOf(scon({}, false, 'iai.scon2'))).toContain('connector-mismatch');
  });

  it('ブレーキ付きの RCS4 は、コントローラーのブレーキ電源（BK+）を配線しないと「電源が来ていません」', () => {
    expect(on(scon({ brake: 'B' }, false), 'AX1').map((i) => i.rule)).toContain('no-power');
    expect(on(scon({ brake: 'B' }, true), 'AX1')).toEqual([]);
    expect(on(scon({ brake: 'B', ctrl: 'T4' }, false, 'iai.scon2'), 'AX1').map((i) => i.rule)).toContain('no-power');
    expect(on(scon({ brake: 'B', ctrl: 'T4' }, true, 'iai.scon2'), 'AX1')).toEqual([]);
  });

  it('RCS4（T2）は XSEL-RA の M1・PG1 にもつながり、ブレーキ電源（BK PWR）の有無が同じようにチェックされる', () => {
    const d = (bk: boolean): Diagram => ({
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
        { id: 'C1', type: 'iai.xsel-ra', x: 0, y: 0 },
        { id: 'AX1', type: 'iai.rcs4-sa', x: 0, y: 0, params: { brake: 'B' } },
      ],
      wires: [cable('C1.M1', 'AX1.MOT'), cable('C1.PG1', 'AX1.PG'), ...(bk ? [w('PSU1.+V1', 'C1.BK+'), w('PSU1.-V1', 'C1.BK-')] : [])],
    });
    expect(rulesOf(d(true))).not.toContain('connector-mismatch');
    expect(on(d(true), 'AX1')).toEqual([]);
    expect(on(d(false), 'AX1').map((i) => i.rule)).toContain('no-power');
  });

  /** KEYENCE KV-C32TC（NPN 出力）→ MIL 34極 変換端子台 → 電源・I/O ケーブル CB-EC-PWBIO → エレシリンダー EC-S6 */
  const ec = (ecParams: ParamValues = {}): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0 },
      { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      { id: 'CBL1', type: 'iai.cb-ec-pwbio', x: 0, y: 0 },
      { id: 'EC1', type: 'iai.ec-s6', x: 0, y: 0, params: ecParams },
    ],
    wires: [
      cable('OUT1.CN1', 'TB1.CN'),
      cable('EC1.PWRIO', 'CBL1.CN'),
      w('PSU1.-V1', 'TB1.33'),
      w('PSU1.+V2', 'CBL1.B1'),
      w('PSU1.-V2', 'CBL1.A1'),
      // PLC の出力 R200 → ST1（前進）
      w('TB1.1', 'CBL1.B4'),
    ],
  });

  it('エレシリンダー（NPN 仕様）の ST1 を PLC の NPN 出力で駆動するとエラーなし、PNP 仕様だと極性エラー', () => {
    const d = ec();
    expect(errorsOf(d)).toEqual([]);
    expect(rulesOf(d)).not.toContain('signal-polarity');
    expect(errorsOf(ec({ io: 'PN' })).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('エレシリンダーの電源（B1）に 0V をつなぐと極性エラー、RCON-EC 接続仕様（ACR）は RCON-EC につながる', () => {
    const d = ec();
    d.wires = d.wires.map((x) => (x.to.device === 'CBL1' && x.to.terminal === 'B1' ? { ...x, from: { device: 'PSU1', terminal: '-V2' } } : x));
    expect(errorsOf(d).map((i) => i.rule)).toContain('conductor-mismatch');
    const acr = resolveDevice(def('iai.ec-s6'), { io: 'ACR' }).terminal('PWRIO')!.connector!;
    expect(connectorsMate(acr, resolveDevice(def('iai.rcon-ec')).terminal('EC1')!.connector!)).toBe(true);
    expect(connectorsMate(acr, resolveDevice(def('iai.cb-ec-pwbio')).terminal('CN')!.connector!)).toBe(false);
  });
});

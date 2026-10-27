/**
 * ファナック（FANUC）のロボット・ロボットコントローラー・ケーブルの機器定義の整合性と、
 * 代表的な配線での接続・I/O 表・安全回路のチェックの動作確認。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { bomRows, ioRows } from '../export/reports';
import type { Diagram, DiagramWire } from '../model/diagram';
import { ioSystem } from '../model/io';
import { mateCandidates } from '../model/mates';
import { deviceElements } from '../schematic/elements';
import { familyOf } from './families';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';
import { paramVariants, validateDefinition } from './validate';

const fanuc = deviceDefinitions.filter((d) => d.maker === 'ファナック');

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

let seq = 0;
const w = (from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', ...extra };
};
const cable = (from: string, to: string) => w(from, to, { wireType: 'CABLE' });
const lookup = (t: string) => getDeviceDefinition(t);
const issuesOf = (d: Diagram) => checkDiagram(d, lookup);
const errorsOf = (d: Diagram) => issuesOf(d).filter((i) => i.severity === 'error');
const rulesOf = (d: Diagram) => issuesOf(d).map((i) => i.rule);

describe('ファナック 機器定義', () => {
  it('ロボット・コントローラー・ティーチングペンダント・EE ケーブルがあり、type は fanuc. で始まる', () => {
    const types = fanuc.map((d) => d.type).sort();
    expect(types).toEqual(['fanuc.ee-cable', 'fanuc.ipendant', 'fanuc.lr-mate-200id', 'fanuc.r-30ib-mini-plus']);
  });

  it.each(fanuc.map((d) => [d.type, d] as const))('%s: すべてのパラメーターの組で定義が整合し、コネクターのピンがそろっている', (_, d) => {
    for (const v of paramVariants(d)) {
      expect(validateDefinition(d, v), JSON.stringify(v)).toEqual([]);
      const r = resolveDevice(d, v);
      for (const t of r.terminals) {
        if (!t.connector || t.connector.pins === 0) continue;
        expect(r.pins.filter((p) => p.id.startsWith(`${t.id}#`)).length, `${t.id} のピン数`).toBe(t.connector.pins);
      }
    }
  });

  it('出力点から出る内部経路はすべて switch: output', () => {
    const r = resolveDevice(def('fanuc.r-30ib-mini-plus'));
    for (const l of r.links) {
      const from = r.terminal(l.from) ?? r.pin(l.from);
      if (from?.signal?.dir === 'out') expect(l.switch, l.from).toBe('output');
    }
  });

  it('ロボットは「ロボット」、コントローラーは「ロボットコントローラー」のファミリーに入る', () => {
    expect(familyOf('fanuc.lr-mate-200id')?.name).toBe('ロボット');
    expect(familyOf('fanuc.r-30ib-mini-plus')?.name).toBe('ロボットコントローラー');
    expect(familyOf('fanuc.ee-cable')?.id).toBe('harness');
  });

  it('推定を含む機器は estimated に書いてある', () => {
    for (const d of fanuc) expect(d.estimated, d.type).toBeTruthy();
  });
});

/** コントローラー（電源つき）とロボット 1 台をロボット接続ケーブル 2 本でつなぎ、安全信号は短絡線でつなぐ */
const cell = (): Diagram => ({
  devices: [
    { id: 'SRC1', type: 'generic.power-source.3p200v', x: 0, y: 0 },
    { id: 'RC1', type: 'fanuc.r-30ib-mini-plus', x: 0, y: 0 },
    { id: 'RB1', type: 'fanuc.lr-mate-200id', x: 0, y: 0 },
    { id: 'TP1', type: 'fanuc.ipendant', x: 0, y: 0 },
  ],
  wires: [
    // 三相 200V の R・S 相から単相 200V を取る
    w('SRC1.R', 'RC1.L', { sizeSq: 2 }),
    w('SRC1.S', 'RC1.N', { sizeSq: 2 }),
    w('SRC1.PE', 'RC1.PE', { sizeSq: 2 }),
    cable('RC1.RM1', 'RB1.RM1'),
    cable('RC1.RP1', 'RB1.RP1'),
    cable('RC1.TP', 'TP1.TP'),
    w('RC1.EES1', 'RC1.EES11'),
    w('RC1.EES2', 'RC1.EES21'),
    w('RC1.EAS1', 'RC1.EAS11'),
    w('RC1.EAS2', 'RC1.EAS21'),
  ],
});

describe('ロボットとコントローラーの接続（ロボット接続ケーブル）', () => {
  it('LR Mate 200iD と R-30iB Mini Plus を RM1・RP1 でつなぐとエラー・コネクターの指摘はない', () => {
    const d = cell();
    expect(errorsOf(d)).toEqual([]);
    const rules = rulesOf(d);
    expect(rules).not.toContain('connector-mismatch');
    expect(rules).not.toContain('connector-unconnected');
  });

  it('RM1 と RP1 を取り違える・ほかのメーカーのコントローラーにつなぐと connector-mismatch', () => {
    const swapped = cell();
    swapped.wires = swapped.wires.filter((x) => x.wireType !== 'CABLE' || x.to.device === 'TP1');
    swapped.wires.push(cable('RC1.RM1', 'RB1.RP1'), cable('RC1.RP1', 'RB1.RM1'));
    expect(rulesOf(swapped)).toContain('connector-mismatch');

    const iai: Diagram = {
      devices: [
        { id: 'C1', type: 'iai.pcon-cb', x: 0, y: 0 },
        { id: 'RB1', type: 'fanuc.lr-mate-200id', x: 0, y: 0 },
      ],
      wires: [cable('C1.MPG', 'RB1.RM1')],
    };
    expect(rulesOf(iai)).toContain('connector-mismatch');
  });

  it('コネクターの種類: ロボットの RM1 はコントローラーの RM1 とだけ、RP1 は RP1 とだけ合う。TP は iPendant とだけ合う', () => {
    const rb = resolveDevice(def('fanuc.lr-mate-200id'));
    const rc = resolveDevice(def('fanuc.r-30ib-mini-plus'));
    const tp = resolveDevice(def('fanuc.ipendant'));
    const c = (r: typeof rb, id: string) => r.terminal(id)!.connector!;
    expect(connectorsMate(c(rb, 'RM1'), c(rc, 'RM1'))).toBe(true);
    expect(connectorsMate(c(rb, 'RP1'), c(rc, 'RP1'))).toBe(true);
    expect(connectorsMate(c(rb, 'RM1'), c(rc, 'RP1'))).toBe(false);
    expect(connectorsMate(c(rb, 'RP1'), c(rc, 'RM1'))).toBe(false);
    expect(connectorsMate(c(rb, 'RM1'), c(rc, 'TP'))).toBe(false);
    expect(connectorsMate(c(tp, 'TP'), c(rc, 'TP'))).toBe(true);
    expect(connectorsMate(c(tp, 'TP'), c(rc, 'RP1'))).toBe(false);
    // ほかの機器のコネクターとは合わない（IAI のアクチュエーターのモーター・エンコーダーなど）
    for (const d of deviceDefinitions.filter((x) => x.maker !== 'ファナック')) {
      for (const t of resolveDevice(d).terminals) {
        if (!t.connector) continue;
        for (const id of ['RM1', 'RP1']) expect(connectorsMate(c(rb, id), t.connector), `${d.type}.${t.id}`).toBe(false);
      }
    }
  });

  it('ロボットの RM1 から引くと、つなげる機器の候補は R-30iB Mini Plus だけで、RP1 もまとめてつなぐ', () => {
    const d: Diagram = { devices: [{ id: 'RB1', type: 'fanuc.lr-mate-200id', x: 0, y: 0 }], wires: [] };
    const found = mateCandidates(d, { device: 'RB1', terminal: 'RM1' }, deviceDefinitions, lookup);
    expect(found.map((c) => c.type)).toEqual(['fanuc.r-30ib-mini-plus']);
    expect(found[0].pairs).toEqual([
      { from: 'RM1', to: 'RM1' },
      { from: 'RP1', to: 'RP1' },
    ]);
    // コントローラーの TP から引くと iPendant、EE から引くと EE ケーブル
    const rc: Diagram = { devices: [{ id: 'RC1', type: 'fanuc.r-30ib-mini-plus', x: 0, y: 0 }], wires: [] };
    expect(mateCandidates(rc, { device: 'RC1', terminal: 'TP' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['fanuc.ipendant']);
    expect(mateCandidates(d, { device: 'RB1', terminal: 'EE' }, deviceDefinitions, lookup).map((c) => c.type)).toEqual(['fanuc.ee-cable']);
  });

  it('ロボット接続ケーブルをつなぎ忘れると、ロボット・コントローラーの両方に connector-unconnected', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => x.to.device !== 'RB1');
    const found = issuesOf(d).filter((i) => i.rule === 'connector-unconnected');
    expect(found.map((i) => i.key).sort()).toEqual(['unconnected:RB1:RM1', 'unconnected:RB1:RP1', 'unconnected:RC1:RM1', 'unconnected:RC1:RP1']);
  });

  it('部品表にロボット接続ケーブル RM1・RP1 が 1 本ずつ載る', () => {
    const rows = bomRows(cell(), lookup).filter((r) => r.maker === 'ファナック');
    const models = rows.map((r) => r.model);
    expect(models).toEqual(expect.arrayContaining(['LR Mate 200iD', 'R-30iB Mini Plus', 'iPendant', 'ロボット接続ケーブル RM1', 'ロボット接続ケーブル RP1']));
    expect(rows.find((r) => r.model === 'ロボット接続ケーブル RP1')?.qty).toBe(1);
  });

  it('電源に直流をつなぐと電源の種類の指摘になる', () => {
    const d = cell();
    d.devices.push({ id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 });
    d.wires = d.wires.filter((x) => !(x.to.device === 'RC1' && (x.to.terminal === 'L' || x.to.terminal === 'N')));
    d.wires.push(w('PSU1.+V1', 'RC1.L'), w('PSU1.-V1', 'RC1.N'));
    expect(errorsOf(d).length).toBeGreaterThan(0);
  });
});

describe('周辺機器 I/O（CRMA15・CRMA16）と PLC', () => {
  it('ピンの割付け: A01 は 24F、A05 は DI101、A15 は DO101（資料で確かめた点）。UOP の入出力も並ぶ', () => {
    const r = resolveDevice(def('fanuc.r-30ib-mini-plus'));
    expect(r.pin('CRMA15#1')).toMatchObject({ label: '24F（A01）', role: 'supply' });
    expect(r.pin('CRMA15#2')?.label).toBe('24F（B01）');
    expect(r.pin('CRMA15#9')).toMatchObject({ label: 'DI101（A05）', signal: { dir: 'in', kind: 'dc', common: 'CRMA15#5' } });
    expect(r.pin('CRMA15#29')).toMatchObject({ label: 'DO101（A15）', signal: { dir: 'out', kind: 'pnp' } });
    expect(r.pin('CRMA16#9')?.label).toBe('UI1 *IMSTP（A05）');
    expect(r.pin('CRMA16#29')?.label).toBe('UO1 CMDENBL（A15）');
    // 周辺機器 I/O は入力 28 点・出力 24 点
    const io = [...r.pins].filter((p) => /^CRMA1[56]#/.test(p.id));
    expect(io.filter((p) => p.signal?.dir === 'in').length).toBe(28);
    expect(io.filter((p) => p.signal?.dir === 'out').length).toBe(24);
  });

  it('CRMA15・CRMA16 は MIL 50 極の変換端子台とつながる', () => {
    const r = resolveDevice(def('fanuc.r-30ib-mini-plus'));
    const tb = resolveDevice(def('generic.mil-terminal-block.50p')).terminal('CN')!.connector!;
    expect(connectorsMate(r.terminal('CRMA15')!.connector!, tb)).toBe(true);
    expect(connectorsMate(r.terminal('CRMA16')!.connector!, tb)).toBe(true);
  });

  /**
   * KEYENCE KV-C32TC（NPN 出力）の R200（No.1 = MIL 1）→ 34 極の変換端子台 1 → 50 極の変換端子台 9（CRMA15 の DI101）。
   * PNP のセンサー（PZ-G41 の P 仕様）の出力 → 50 極の変換端子台 11（DI102）。電源は CRMA15 の 24F・0V から。
   */
  const plc = (sdicomTo: 'p24' | 'm0v'): Diagram => {
    const d = cell();
    d.devices.push(
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0 },
      { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      { id: 'TB2', type: 'generic.mil-terminal-block.50p', x: 0, y: 0 },
    );
    d.wires.push(
      cable('OUT1.CN1', 'TB1.CN'),
      cable('RC1.CRMA15', 'TB2.CN'),
      w('PSU1.-V1', 'TB1.33'),
      w('TB1.1', 'TB2.9'),
      // SDICOM1（A03 = 5）を 24F（A01 = 1）または 0V（A24 = 47）へ
      w('TB2.5', sdicomTo === 'p24' ? 'TB2.1' : 'TB2.47'),
      // 0V を PLC の 0V とそろえる
      w('TB2.48', 'PSU1.-V2'),
    );
    return d;
  };

  it('PLC の NPN 出力で DI101 を駆動: SDICOM を +24V につなぐ（プラスコモン）とエラーなし、0V につなぐと signal-polarity', () => {
    expect(errorsOf(plc('p24')).filter((i) => i.rule === 'signal-polarity')).toEqual([]);
    expect(errorsOf(plc('m0v')).map((i) => i.rule)).toContain('signal-polarity');
  });

  it('コントローラーの周辺機器 I/O が I/O 表に出て、PLC の出力とのつながりが分かる', () => {
    const d = plc('p24');
    const sys = ioSystem(d, 'RC1', lookup)!;
    expect(sys.host.id).toBe('RC1');
    const points = sys.units[0].points;
    const di101 = points.find((p) => p.address === 'DI101')!;
    expect(di101).toMatchObject({ dir: 'in', kind: 'dc' });
    // 電線をつなぐ端子は変換端子台のネジ端子
    expect(di101.endpoint?.device).toMatch(/^TB[12]$/);
    expect(di101.connections.map((c) => c.name)).toContain('OUT1.CN1#1');
    expect(points.find((p) => p.address === 'DO101')?.dir).toBe('out');
    expect(points.find((p) => p.address === 'UI1')?.label).toBe('UI1 *IMSTP（A05）');
    // I/O 表の行（CSV・印刷）にも出る
    const rows = ioRows(d, lookup).filter((r) => r.host === 'RC1');
    expect(rows.find((r) => r.address === 'DI101')?.connections).toContain('OUT1.CN1#1');
    expect(rows.filter((r) => r.dir === '入力').length).toBe(28 + 8);
    expect(rows.filter((r) => r.dir === '出力').length).toBe(24 + 8);
    // PLC 側の I/O 表にもロボットコントローラーの入力が出る
    const r200 = ioRows(d, lookup).find((r) => r.unit === 'OUT1' && r.connections.includes('RC1'));
    expect(r200?.connections).toContain('RC1.CRMA15#9');
  });

  it('出力 DO101 で負荷を駆動するとき、DOSRC に +24V を供給しないと負荷に電源が来ていない（no-power）', () => {
    const base = cell();
    base.devices.push({ id: 'TB2', type: 'generic.mil-terminal-block.50p', x: 0, y: 0 }, { id: 'K1', type: 'omron.my2n.dc24', x: 0, y: 0 });
    base.wires.push(cable('RC1.CRMA15', 'TB2.CN'), w('TB2.29', 'K1.14'), w('K1.13', 'TB2.47'));
    const withSrc: Diagram = { ...base, wires: [...base.wires, w('TB2.1', 'TB2.43')] };
    const coil = (d: Diagram) => issuesOf(d).filter((i) => i.devices.includes('K1') && (i.severity === 'error' || i.rule === 'no-power'));
    expect(coil(withSrc)).toEqual([]);
    expect(coil(base).map((i) => i.rule)).toContain('no-power');
    // DOSRC そのものにも「電源が来ていない」と出る
    const rc = (d: Diagram) => issuesOf(d).filter((i) => i.rule === 'no-power' && i.devices.includes('RC1')).map((i) => i.message).join('\n');
    expect(rc(base)).toMatch(/DOSRC1/);
    expect(rc(withSrc)).not.toMatch(/DOSRC1/);
  });
});

describe('ロボット I/O（エンドエフェクタ用コネクター EE）', () => {
  /** EE ケーブルの RI1 に PNP センサー、RO7 にリレー（ハンドの電磁弁の代わり）をつなぐ */
  const hand = (): Diagram => {
    const d = cell();
    d.devices.push(
      { id: 'CBL1', type: 'fanuc.ee-cable', x: 0, y: 0 },
      { id: 'S1', type: 'keyence.pz-g41', x: 0, y: 0, params: { output: 'P' } },
      { id: 'K1', type: 'omron.my2n.dc24', x: 0, y: 0 },
    );
    d.wires.push(
      cable('RB1.EE', 'CBL1.CN'),
      w('CBL1.24V-9', 'S1.BN'),
      w('CBL1.0V-11', 'S1.BU'),
      w('S1.BK', 'CBL1.RI1'),
      w('CBL1.RO7', 'K1.14'),
      w('K1.13', 'CBL1.0V-12'),
    );
    return d;
  };

  it('EE の 24V・0V はコントローラーの RP1 から来ていて、センサー・負荷に電源が届く', () => {
    const d = hand();
    expect(errorsOf(d)).toEqual([]);
  });

  it('EE につないだセンサー・負荷が、コントローラーの I/O 表の RI1・RO7 に出る', () => {
    const points = ioSystem(hand(), 'RC1', lookup)!.units[0].points;
    expect(points.find((p) => p.address === 'RI1')?.connections.map((c) => c.name)).toContain('S1.BK');
    expect(points.find((p) => p.address === 'RO7')?.connections.map((c) => c.name)).toContain('K1.14');
  });
});

describe('安全信号（外部非常停止 EES・安全柵 EAS・非常停止ボタンの接点 ESPB）', () => {
  /** EES に非常停止スイッチ（b 接点 2 回路）、EAS は短絡線 */
  const estop = (contacts: [string, string][] = [['21', '22'], ['41', '42']]): Diagram => {
    const d = cell();
    d.devices.push({ id: 'ES1', type: 'idec.xw1e-bv402mr', x: 0, y: 0 });
    d.wires = d.wires.filter((x) => !x.from.terminal.startsWith('EES'));
    d.wires.push(w('RC1.EES1', `ES1.${contacts[0][0]}`), w(`ES1.${contacts[0][1]}`, 'RC1.EES11'), w('RC1.EES2', `ES1.${contacts[1][0]}`), w(`ES1.${contacts[1][1]}`, 'RC1.EES21'));
    return d;
  };
  const safetyRules = (d: Diagram) => issuesOf(d).filter((i) => i.devices.includes('RC1') && /safety|estop|direct/.test(i.rule));

  it('非常停止スイッチの b 接点 2 回路を EES に入れるとエラー・注意なし', () => {
    expect(safetyRules(estop())).toEqual([]);
    expect(errorsOf(estop())).toEqual([]);
  });

  it('使わない安全信号を短絡線でつないでも指摘なし', () => {
    expect(safetyRules(cell())).toEqual([]);
  });

  it('外部非常停止の片側（EES2-EES21）だけを配線すると safety-channel-partial のエラー', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => !(x.from.terminal === 'EES1'));
    const found = issuesOf(d).filter((i) => i.rule === 'safety-channel-partial');
    expect(found.map((i) => i.severity)).toEqual(['error']);
    expect(found[0].message).toMatch(/EES11/);
  });

  it('チャンネルを取り違える（EES1 から EES21 へ戻す）と safety-channel-cross', () => {
    const d = cell();
    d.wires = d.wires.filter((x) => !x.from.terminal.startsWith('EES'));
    d.wires.push(w('RC1.EES1', 'RC1.EES21'), w('RC1.EES2', 'RC1.EES11'));
    expect(rulesOf(d)).toContain('safety-channel-cross');
  });

  it('安全柵のループに電磁接触器の a 接点を入れると estop-not-nc', () => {
    const d = cell();
    d.devices.push({ id: 'MC1', type: 'mitsubishi.s-t10.ac200v', x: 0, y: 0 });
    d.wires = d.wires.filter((x) => x.from.terminal !== 'EAS1');
    d.wires.push(w('RC1.EAS1', 'MC1.13'), w('MC1.14', 'RC1.EAS11'));
    expect(rulesOf(d)).toContain('estop-not-nc');
  });

  it('ESPB は機器の外（ペンダントの非常停止ボタン）で開く b 接点で、セーフティリレーの入力のループに入れても指摘なし', () => {
    const l = resolveDevice(def('fanuc.r-30ib-mini-plus')).links.filter((x) => x.from.startsWith('ESPB'));
    expect(l).toEqual([
      { from: 'ESPB1', to: 'ESPB11', switch: 'NC', safetyContact: true },
      { from: 'ESPB2', to: 'ESPB21', switch: 'NC', safetyContact: true },
    ]);
    const d = cell();
    d.devices.push({ id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 }, { id: 'SR1', type: 'omron.g9se-201', x: 0, y: 0 });
    d.wires.push(
      w('PSU1.+V1', 'SR1.A1'),
      w('PSU1.-V1', 'SR1.A2'),
      w('SR1.T11', 'RC1.ESPB1'),
      w('RC1.ESPB11', 'SR1.T12'),
      w('SR1.T21', 'RC1.ESPB2'),
      w('RC1.ESPB21', 'SR1.T22'),
    );
    const sr = issuesOf(d).filter((i) => i.devices.includes('SR1') && /safety-channel|estop|direct/.test(i.rule));
    expect(sr).toEqual([]);
  });
});

describe('展開図の記号', () => {
  it('周辺機器 I/O は PLC の入力・出力の記号、ESPB は非常停止の b 接点になる', () => {
    const els = deviceElements(def('fanuc.r-30ib-mini-plus'));
    const di = els.find((e) => e.key === 'CRMA15#9')!;
    expect(di).toMatchObject({ kind: 'plc-input', attributes: { ADDR: 'DI101', T1: 'A05' } });
    const dout = els.find((e) => e.key === 'CRMA15#29')!;
    expect(dout).toMatchObject({ kind: 'plc-output', symbol: 'plc-out-src', attributes: { ADDR: 'DO101' } });
    const espb = els.filter((e) => e.kind === 'contact');
    expect(espb.map((e) => e.key).sort()).toEqual(['ESPB1-ESPB11', 'ESPB2-ESPB21']);
    expect(espb.every((e) => /emergency/.test(e.symbol))).toBe(true);
    expect(els.filter((e) => e.kind === 'plc-input').length).toBe(28 + 8);
    expect(els.filter((e) => e.kind === 'plc-output').length).toBe(24 + 8);
  });
});

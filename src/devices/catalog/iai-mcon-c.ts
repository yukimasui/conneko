import { fieldbusBlock, ioTypeParam, type IoType } from '../iai/fieldbus';
import { DC24_MINUS, DC24_PLUS, dshellV, fins, groundMark, iaiDefs, led, miniDin, MM, n2, plugV, screw, slideSwitch, smallBlackConnector, text } from '../iai/parts';
import type { DeviceDefinition, InternalLink, ParamValues, TerminalDef } from '../types';

/**
 * IAI 多軸ポジションコントローラー MCON-C / CG（ロボシリンダー RCP6〜RCP2・RCA/RCA2/RCL・RCD を最大 8 軸、フィールドネットワーク専用）。
 *
 * 出典: 取扱説明書 MJ0341「MCON-C/CG」（1.2 基本仕様一覧・モーター消費電流、1.5 外形図、各部の名称と機能、2.2 展開接続図、
 *       2.3.1 電源入力コネクター、2.3.2 システム I/O コネクター、2.3.3 駆動源しゃ断・非常停止入力コネクター、2.3.4 アクチュエーター接続コネクター、
 *       2.3.6 外部ブレーキコネクター、2.3.7 SIO コネクター）。
 *
 * 外観: 幅 123mm × 高さ 115mm × 奥行 95mm（DIN レール取付け、樹脂ケース）。左に駆動源しゃ断・非常停止入力コネクター（16 極）・
 * 外部ブレーキコネクター（10 極）・電源入力コネクター（4 極）・FG 端子台、中央にスロット 0〜3（ドライバーボード 1 枚で 2 軸。
 * 上側が軸 No.0/2/4/6、下側が軸 No.1/3/5/7 のアクチュエーター接続コネクター）、右上にファンユニット、動作モード設定スイッチ、
 * SIO コネクター、システム I/O コネクター（8 極）、フィールドネットワークのコネクター。各部の配置は「各部の名称と機能」の図にならった。
 *
 * 電源入力（MSTBA2.5HC/4、4 極）: 1 0V・2 CP+24V（制御電源 DC24V ±10%、1.0A）、3 0V・4 MP+24V（モーター電源 DC24V ±10%）。
 * システム I/O（MCDN1.5/4、8 極。左列 1〜4・右列 5〜8）: 1 EMG+24V（非常停止用 +24V 出力）、2 S2・3 S1（ティーチングツールの非常停止接点。
 *   MCON-C は SIO 未接続時に内部で短絡、CG はダミープラグ DP-5）、4 EMG-（全軸の非常停止入力。DC24V 10mA 以下）、
 *   5 AUTO/MANU+・6 AUTO/MANU−（動作モード切替え）、7 RB+・8 RB−（回生抵抗ユニット RER-1）。
 * 駆動源しゃ断・非常停止入力（MCDN1.5/8、16 極）: スロットごとに MPI（モーター電源外部入力）・MPO（外部出力）、EMG+24V・EMGIN。
 *   通常は付属の短絡線で MPO-MPI・EMG+24V-EMGIN を短絡する。外部で駆動源をしゃ断するときは MPO-MPI 間に接触器の接点を入れる。
 * 外部ブレーキ（MCDN1.5/5、10 極）: 軸ごとのブレーキ解除入力 BKRLS（DC24V 150mA/軸）と GND。
 */

const W = 123 * MM;
const H = 115 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);

const IO_TYPES: IoType[] = ['CC', 'CIE', 'CN', 'DV', 'EC', 'EP', 'PR', 'PRT', 'ML3'];
const axesOf = (p: ParamValues) => Math.max(1, Math.min(8, Number(p.axes ?? 4) || 4));
const slotsOf = (p: ParamValues) => Math.ceil(axesOf(p) / 2);
const ioOf = (p: ParamValues) => String(p.io ?? 'CC') as IoType;

/** 駆動源しゃ断・非常停止入力コネクター（左列が上から 16〜9、右列が 8〜1） */
const CUT: { pin: number; id: string; slot: number; kind: 'MPO' | 'MPI' | 'EMG' | 'EMGIN' }[] = [
  { pin: 1, id: 'MPO1', slot: 1, kind: 'MPO' },
  { pin: 2, id: 'MPI1', slot: 1, kind: 'MPI' },
  { pin: 3, id: 'MPO0', slot: 0, kind: 'MPO' },
  { pin: 4, id: 'MPI0', slot: 0, kind: 'MPI' },
  { pin: 5, id: 'EMG+24V1', slot: 1, kind: 'EMG' },
  { pin: 6, id: 'EMGIN1', slot: 1, kind: 'EMGIN' },
  { pin: 7, id: 'EMG+24V0', slot: 0, kind: 'EMG' },
  { pin: 8, id: 'EMGIN0', slot: 0, kind: 'EMGIN' },
  { pin: 9, id: 'MPO3', slot: 3, kind: 'MPO' },
  { pin: 10, id: 'MPI3', slot: 3, kind: 'MPI' },
  { pin: 11, id: 'MPO2', slot: 2, kind: 'MPO' },
  { pin: 12, id: 'MPI2', slot: 2, kind: 'MPI' },
  { pin: 13, id: 'EMG+24V3', slot: 3, kind: 'EMG' },
  { pin: 14, id: 'EMGIN3', slot: 3, kind: 'EMGIN' },
  { pin: 15, id: 'EMG+24V2', slot: 2, kind: 'EMG' },
  { pin: 16, id: 'EMGIN2', slot: 2, kind: 'EMGIN' },
];
const byPin = (pins: number[]) => pins.map((n) => CUT.find((c) => c.pin === n)!.id);
const cutL = plugV({ x: X(5), y: Y(19), ids: byPin([16, 15, 14, 13, 12, 11, 10, 9]), pitch: 3.5 * MM, w: 4.5 * MM, wire: 'left' });
const cutR = plugV({ x: X(9.75), y: Y(19), ids: byPin([8, 7, 6, 5, 4, 3, 2, 1]), pitch: 3.5 * MM, w: 4.5 * MM, wire: 'right' });

/** 外部ブレーキコネクター（左列が上から 10〜6、右列が 5〜1） */
const BK_IDS: Record<number, string> = { 1: 'BKRLS3', 2: 'BKRLS2', 3: 'BKRLS1', 4: 'BKRLS0', 5: 'BKGND1', 6: 'BKRLS7', 7: 'BKRLS6', 8: 'BKRLS5', 9: 'BKRLS4', 10: 'BKGND2' };
const bkL = plugV({ x: X(5), y: Y(54), ids: [10, 9, 8, 7, 6].map((n) => BK_IDS[n]), pitch: 3.5 * MM, w: 4.5 * MM, wire: 'left' });
const bkR = plugV({ x: X(9.75), y: Y(54), ids: [5, 4, 3, 2, 1].map((n) => BK_IDS[n]), pitch: 3.5 * MM, w: 4.5 * MM, wire: 'right' });

const pwr = plugV({
  x: X(5),
  y: Y(78),
  ids: ['CP0V', 'CP24V', 'MP0V', 'MP24V'],
  pitch: 5.08 * MM,
  w: 6 * MM,
  wire: 'left',
  labels: { CP0V: '0V', CP24V: 'CP +24V', MP0V: '0V', MP24V: 'MP +24V' },
  labelColor: '#2b2d30',
  labelSize: 2.4,
});

/** システム I/O（左列 1〜4、右列 5〜8） */
const sysL = plugV({ x: X(100), y: Y(50), ids: ['EMG+24V', 'S2', 'S1', 'EMG-'], pitch: 3.5 * MM, w: 4.5 * MM, wire: 'left' });
const sysR = plugV({ x: X(104.75), y: Y(50), ids: ['AM+', 'AM-', 'RB+', 'RB-'], pitch: 3.5 * MM, w: 4.5 * MM, wire: 'right' });

const FG = { x: X(4), y: Y(107) };
const SIO = { x: X(116), y: Y(42) };
const FB_AREA = { x: X(100), y: Y(70), w: 20 * MM, h: 42 * MM };
const slotX = (n: number) => X(38 + 13.5 * (n + 0.5));
const AX_Y = (upper: boolean) => Y(upper ? 45 : 79);

const svg = (p: ParamValues) => {
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.2) => text(x, y, t, size, '#2b2d30', anchor);
  const slots = slotsOf(p);
  const axes = axesOf(p);
  const fb = fieldbusBlock(ioOf(p), FB_AREA, 'right', '#2b2d30', true);
  const slot = (n: number) => {
    const cx = slotX(n);
    const x0 = X(38 + 13.5 * n);
    const frame = `<rect x="${n2(x0 + 1)}" y="${Y(4)}" width="${X(11.5)}" height="${Y(107)}" rx="1.2" fill="${n < slots ? '#d3d6da' : '#c4c7cb'}" stroke="#8d9297" stroke-width="0.5"/>`;
    if (n >= slots) return `${frame}${screw(cx, Y(9), 2)}${screw(cx, Y(106), 2)}${lbl(cx, Y(58), `SLOT${n}`, 'middle', 2)}`;
    const ledCol = (dx: number, nm: string) =>
      `${led(cx + dx, Y(9), 'off', 3, 2)}${lbl(cx + dx, Y(13), nm, 'middle', 1.8)}${[0, 1, 2].map((i) => led(cx + dx, Y(16 + i * 2.6), 'off', 2.4, 1.6)).join('')}`;
    const ax = (upper: boolean) => {
      const no = n * 2 + (upper ? 0 : 1);
      if (no >= axes) return `<rect x="${n2(cx - 8)}" y="${n2(AX_Y(upper) - 26)}" width="16" height="52" rx="1" fill="#bfc3c7" stroke="#8d9297" stroke-width="0.4"/>`;
      return `${dshellV(cx, AX_Y(upper), 52, 17)}${lbl(cx, AX_Y(upper) + 31, `AX${no}`, 'middle', 2.4)}`;
    };
    return `${frame}${ledCol(-4, 'SYS Ⅰ')}${ledCol(4, 'SYS Ⅱ')}${ax(true)}${ax(false)}${lbl(cx, Y(109), `SLOT${n}`, 'middle', 1.8)}`;
  };
  return `
  ${iaiDefs(['#e4e6e8', '#c9ccd0'])}
  <rect x="${X(0.5)}" y="${Y(0.5)}" width="${X(122)}" height="${Y(114)}" rx="3" fill="url(#iaipanel-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  ${text(X(3), Y(8), 'IAI', 6, '#d2232a', 'start', 'bold', ' font-style="italic"')}${lbl(X(3), Y(13), `MCON-${String(p.model ?? 'C')}`, 'start', 2.6)}
  <!-- 駆動源しゃ断・非常停止入力 -->
  ${lbl(X(10), Y(17.5), 'EMG / MP SLOT', 'middle', 1.8)}
  ${cutL.svg}${cutR.svg}
  ${[16, 15, 14, 13, 12, 11, 10, 9].map((n, i) => text(X(3.8), Y(21.5 + i * 3.5), String(n), 1.6, '#555', 'end')).join('')}
  ${[8, 7, 6, 5, 4, 3, 2, 1].map((n, i) => text(X(15.6), Y(21.5 + i * 3.5), String(n), 1.6, '#555', 'start')).join('')}
  <!-- 外部ブレーキ -->
  ${lbl(X(10), Y(52.5), 'BK', 'middle', 1.8)}
  ${bkL.svg}${bkR.svg}
  <!-- 型式記入カード -->
  <rect x="${X(21)}" y="${Y(52)}" width="${X(14)}" height="${Y(46)}" rx="1" fill="#fbfbfb" stroke="#9aa0a6" stroke-width="0.5"/>
  ${Array.from({ length: 8 }, (_, i) => `<path d="M${X(22.5)} ${Y(57 + i * 5)} h${X(11)}" stroke="#c4c8cc" stroke-width="0.5"/>${text(X(23), Y(56.2 + i * 5), `AX${i}`, 1.5, '#666', 'start')}`).join('')}
  <!-- 電源入力 -->
  ${pwr.svg}
  <!-- FG 端子台 -->
  <rect x="${X(2)}" y="${Y(103)}" width="${X(9)}" height="${Y(8)}" rx="0.8" fill="#2b2d30"/>${screw(FG.x + 4, FG.y, 2.6)}${groundMark(X(13), Y(105), '#2b2d30')}${lbl(X(15.5), Y(108), 'FG')}
  <!-- スロット 0〜3 -->
  ${[0, 1, 2, 3].map(slot).join('')}
  <!-- ファンユニット -->
  <rect x="${X(93)}" y="${Y(3)}" width="${X(28)}" height="${Y(24)}" rx="1.5" fill="#3a3d42" stroke="#1f2124" stroke-width="0.5"/>
  ${fins(X(95), Y(5), X(24), Y(20), 9)}
  <!-- アブソバッテリーコネクター -->
  ${smallBlackConnector(X(94), Y(30), X(5), Y(10), 4)}${lbl(X(96.5), Y(43), 'BAT', 'middle', 1.6)}
  <!-- 動作モード -->
  ${slideSwitch(X(105), Y(33), 12, 5)}${lbl(X(101), Y(38.5), 'AUTO', 'start', 1.6)}${lbl(X(109), Y(38.5), 'MANU', 'start', 1.6)}
  ${miniDin(SIO.x, SIO.y, 5.5)}${lbl(SIO.x, Y(48.5), 'SIO', 'middle', 2)}
  <!-- システム I/O -->
  ${sysL.svg}${sysR.svg}
  ${[1, 2, 3, 4].map((n, i) => text(X(98.8), Y(52.5 + i * 3.5), String(n), 1.6, '#555', 'end')).join('')}
  ${[5, 6, 7, 8].map((n, i) => text(X(110.6), Y(52.5 + i * 3.5), String(n), 1.6, '#555', 'start')).join('')}
  ${lbl(X(117), Y(64.5), 'SYS I/O', 'middle', 1.6)}
  ${fb.svg}`;
};

const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
const test24: TerminalDef['supply'] = { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' };

const terminals = (p: ParamValues): TerminalDef[] => {
  const slots = slotsOf(p);
  const cutPos = { ...cutL.pos, ...cutR.pos };
  const bkPos = { ...bkL.pos, ...bkR.pos };
  const ts: TerminalDef[] = [
    { id: 'CP0V', label: '0V（制御電源）', note: '制御電源入力 0V', ...at(pwr.pos.CP0V), role: 'input', accepts: DC24_MINUS },
    { id: 'CP24V', label: 'CP +24V', note: '制御電源入力 DC24V ±10%（1.0A。ブレーキ付きは + 0.15A/軸）', ...at(pwr.pos.CP24V), role: 'input', accepts: DC24_PLUS },
    { id: 'MP0V', label: '0V（モーター電源）', note: 'モーター電源入力 0V（制御電源の 0V と内部で共通）', ...at(pwr.pos.MP0V), role: 'input', accepts: DC24_MINUS },
    { id: 'MP24V', label: 'MP +24V', note: 'モーター駆動電源入力 DC24V ±10%。+24V 側を片切りで入り切りする', ...at(pwr.pos.MP24V), role: 'input', accepts: DC24_PLUS },
    { id: 'FG', label: 'FG', note: 'FG 端子台（樹脂ケースのため必ずここで接地。D 種接地）', x: FG.x, y: FG.y, side: 'left', role: 'ground' },
    { id: 'EMG+24V', label: 'EMG+24V（1）', note: '非常停止用 +24V 電源出力', ...at(sysL.pos['EMG+24V']), role: 'supply', supply: test24, optional: true },
    { id: 'S2', label: 'S2（2）', note: '外部非常停止信号入力用（S1-S2 間がティーチングツールの非常停止接点）', ...at(sysL.pos.S2), role: 'signal', optional: true },
    { id: 'S1', label: 'S1（3）', note: '外部非常停止信号出力用', ...at(sysL.pos.S1), role: 'signal', optional: true },
    { id: 'EMG-', label: 'EMG-（4）', note: '全軸の非常停止入力（+24V を加えると非常停止解除。DC24V 10mA 以下）', ...at(sysL.pos['EMG-']), role: 'input', accepts: DC24_PLUS, function: 'safety-input' },
    { id: 'AM+', label: 'AUTO/MANU+（5）', note: '動作モード切替え用の電源', ...at(sysR.pos['AM+']), role: 'supply', supply: test24, optional: true },
    { id: 'AM-', label: 'AUTO/MANU−（6）', note: '動作モード切替え信号入力（開放で ON = AUTO 側）', ...at(sysR.pos['AM-']), role: 'signal', optional: true },
    { id: 'RB+', label: 'RB+（7）', note: '回生抵抗ユニット RER-1 の接続 +', ...at(sysR.pos['RB+']), role: 'signal', optional: true },
    { id: 'RB-', label: 'RB−（8）', note: '回生抵抗ユニット RER-1 の接続 −', ...at(sysR.pos['RB-']), role: 'signal', optional: true },
    { id: 'SIO', label: 'SIO（ティーチング）', note: 'ティーチングボックス・パソコン対応ソフト用（RS485）。MCON-CG は未使用時にダミープラグ DP-5 を差す', x: n2(SIO.x + 7), y: SIO.y, side: 'right', role: 'connector', connector: { kind: 'MINIDIN8', pins: 0, width: 16, length: 14, facing: 'front', protocols: ['iai-sio'] }, optional: true },
    { id: 'BAT', label: 'アブソバッテリー', note: '簡易アブソ仕様のとき、アブソバッテリーボックスと専用ケーブル CB-MSEP-AB005 でつなぐ', x: X(94), y: Y(35), side: 'left', role: 'connector', connector: { kind: 'IAI-MCON-ABS', pins: 0, width: 20, length: 10, facing: 'front' }, optional: true },
  ];
  for (const c of CUT) {
    const used = c.slot < slots;
    const sl = `スロット ${c.slot}（軸 No.${c.slot * 2}・${c.slot * 2 + 1}）`;
    const base = { id: c.id, ...at(cutPos[c.id]) };
    if (c.kind === 'MPO') ts.push({ ...base, label: `MPO SLOT${c.slot}（${c.pin}）`, note: `${sl} のモーター電源外部出力（MP +24V から内部で出ている）`, role: 'signal', optional: true });
    else if (c.kind === 'MPI')
      ts.push({ ...base, label: `MPI SLOT${c.slot}（${c.pin}）`, note: `${sl} のモーター電源外部入力。通常は MPO と短絡し、外部で遮断する場合は接触器の接点を入れる`, role: 'input', accepts: DC24_PLUS, optional: !used });
    else if (c.kind === 'EMG') ts.push({ ...base, label: `EMG+24V SLOT${c.slot}（${c.pin}）`, note: `${sl} の非常停止用 +24V 電源出力`, role: 'supply', supply: test24, optional: true });
    else ts.push({ ...base, label: `EMGIN SLOT${c.slot}（${c.pin}）`, note: `${sl} の非常停止入力（EMG+24V と短絡で運転可。切るとこのスロットだけ非常停止）`, role: 'signal', function: 'safety-input', optional: !used });
  }
  for (const [pin, id] of Object.entries(BK_IDS)) {
    const isGnd = id.startsWith('BKGND');
    ts.push(
      isGnd
        ? { id, label: `GND（${pin}）`, note: '外部ブレーキ解除電源の 0V', ...at(bkPos[id]), role: 'input', accepts: DC24_MINUS, optional: true }
        : { id, label: `BKRLS 軸 No.${id.slice(5)}（${pin}）`, note: `軸 No.${id.slice(5)} のブレーキ解除入力（DC24V 150mA/軸。主電源なしでも解除できる）`, ...at(bkPos[id]), role: 'input', accepts: DC24_PLUS, optional: true },
    );
  }
  for (let a = 0; a < axesOf(p); a++) {
    const n = Math.floor(a / 2);
    const upper = a % 2 === 0;
    ts.push({
      id: `AX${a}`,
      label: `AX${a}（${a + 1} 軸目 アクチュエーター）`,
      note: 'アクチュエーターのモーター・エンコーダー一体ケーブル（24 ピン）をつなぐ',
      x: n2(slotX(n) + 8.5),
      y: AX_Y(upper),
      side: 'right',
      role: 'connector',
      connector: { kind: 'IAI-MCON-MOT', pins: 0, width: 52, length: 14, facing: 'front' },
      optional: true,
    });
  }
  ts.push(...fieldbusBlock(ioOf(p), FB_AREA, 'right', '#2b2d30', true).terminals);
  return ts;
};

const links = (): InternalLink[] => {
  const ls: InternalLink[] = [
    { from: 'CP0V', to: 'MP0V' },
    // SIO にティーチングツールの非常停止接点（MCON-C は未接続時に内部で短絡）。Conneko では常に閉の導通として扱う
    { from: 'S1', to: 'S2' },
  ];
  for (let n = 0; n < 4; n++) ls.push({ from: 'MP24V', to: `MPO${n}`, directed: true });
  return ls;
};

const def: DeviceDefinition = {
  type: 'iai.mcon-c',
  name: '多軸ポジションコントローラー（ロボシリンダー 最大 8 軸、ネットワーク専用）',
  model: 'MCON-C/CG',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の多軸ポジションコントローラー MCON-C / CG（ロボシリンダーのパルスモーター RCP6〜RCP2・サーボ RCA/RCA2/RCL・DC ブラシレス RCD を混在で最大 8 軸。フィールドネットワーク専用）。' +
    '電源入力: CP +24V・0V に制御電源（DC24V ±10%、1.0A）、MP +24V・0V にモーター電源（DC24V ±10%、軸の合計）。' +
    '非常停止: システム I/O の EMG- に +24V を加えると運転可（非常停止回路のリレー接点 CR1 で入り切り。DC24V 10mA 以下）。S1-S2 はティーチングツールの非常停止接点（外部の非常停止回路に入れる）。' +
    '駆動源しゃ断・非常停止入力: スロット（2 軸）ごとに MPO-MPI（モーター電源）と EMG+24V-EMGIN（非常停止）を付属の短絡線でつなぐ。外部しゃ断のときは MPO-MPI 間に接触器の接点を入れる。' +
    'フィールドネットワーク: CC-Link・CC-Link IE Field・CompoNet・DeviceNet・EtherCAT・EtherNet/IP・PROFIBUS-DP・PROFINET IO・MECHATROLINK-Ⅲ（EtherCAT モーション・SSCNETⅢ/H もある）。MCON-CG は安全カテゴリー対応タイプ。',
  labelPrefix: 'MCON',
  width: W,
  height: H,
  svg,
  terminals,
  links,
  params: [
    {
      key: 'model',
      label: 'タイプ',
      options: [
        { value: 'C', label: 'C: 標準タイプ' },
        { value: 'CG', label: 'CG: 安全カテゴリー対応タイプ' },
      ],
      default: 'C',
    },
    { key: 'axes', label: '接続軸数', options: [1, 2, 3, 4, 5, 6, 7, 8].map((n) => ({ value: n, label: `${n} 軸` })), default: 4 },
    ioTypeParam(IO_TYPES, 'CC', 'フィールドネットワーク'),
    {
      key: 'loadCurrent',
      label: 'モーター電源の電流（全軸の定格の合計）',
      unit: 'A',
      // 既定は接続軸数から求める（1 軸あたり約 2A）。モーターの容量に合わせて手で選ぶこともできる
      options: [
        { value: 'auto', label: '接続軸数から（1 軸あたり約 2A）' },
        { value: 2, label: '約 2A（1 軸）' },
        { value: 4, label: '約 4A（2 軸）' },
        { value: 8, label: '約 8A（4 軸）' },
        { value: 12, label: '約 12A（6 軸）' },
        { value: 16, label: '約 16A（8 軸）' },
      ],
      default: 'auto',
    },
  ],
  loadCurrent: (p) => (p.loadCurrent === 'auto' ? axesOf(p) * 2 : Number(p.loadCurrent)),
};

export default def;

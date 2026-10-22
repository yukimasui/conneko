import { controllerEncoderPins } from './actuator';
import { fieldbusBlock, IO_TYPE_LABELS, type IoType } from './fieldbus';
import {
  dsub9V,
  dshellV,
  groundMark,
  iaiDefs,
  led,
  milConnectorSide,
  milHeaderV,
  MM,
  n2,
  plugV,
  rj45Side,
  rj45V,
  screw,
  sevenSeg,
  slideSwitch,
  smallPort,
  text,
} from './parts';
import { XSEL_PIO_OPTIONS, XSEL_PQ_SYS_IO, XSEL_SYS_IO, xselBoardPins, xselSystemIo, type XselPioBoard } from './xsel';
import type { AcceptSpec, DeviceDefinition, InternalLink, ParamDef, ParamValues, PinDef, TerminalDef } from '../types';
import { DC24_MINUS, DC24_PLUS, stopLoop } from './parts';

/**
 * IAI プログラムコントローラー XSEL（RA/SA/RAX/SAX 系と、前の世代の P/Q 系）の 1〜4 軸仕様の正面の作り。
 *
 * 出典: IAI 総合カタログ CJ9005「XSEL-RA/SA」（型式項目・基本仕様・外形寸法図・各部の名称・製品写真）、
 *       取扱説明書 MJ0359「XSEL-RA/SA/RAX/SAX/RAXD/SAXD」（1.4 各部の名称と機能、3.2 電源回路、3.3 システム I/O、3.5 PIO 回路）、
 *       MJ0148「XSEL-P/Q」（第 4 章 各部の名称及び機能）。
 *
 * 外観: 1〜4 軸仕様は幅 290mm（取付け部込み 304mm）× 高さ 195mm、奥行 125.3mm。アルミ色の正面パネルに緑のコネクター。
 * 左から 電源部（AC 電源入力 PWR・回生抵抗 RB・FG 端子）、ドライバー部（エンコーダー PG1〜4、モーター M1〜M4、ブレーキ電源 BK PWR、
 * ブレーキ解除スイッチ BK1〜4）、CPU 部（システム I/O・ティーチング TP・ネットワークボード・Ethernet・MST（拡張モーション）・USB・
 * 7 セグメント表示・I/O1・I/O2）。5〜8 軸仕様は幅 358mm（図は 1〜4 軸仕様で描く）。
 *
 * AC 電源入力（GMSTB2.5/6-STF-7.62）: 6 PE、5 CP_L・4 CP_N（制御電源 単相 AC200〜230V ±10%）、
 *   3 MP_R・2 MP_S・1 MP_T（モーター電源 三相 AC200〜230V）。単相仕様は 3 NC・2 MP_L・1 MP_N。（P/Q も同じ）
 * ブレーキ電源入力（BK PWR）: +24V・0V（DC24V ±10%、1 軸あたり約 0.4A。ブレーキ付きのとき）。
 * システム I/O は iai/xsel.ts。PIO ボード（I/O1・I/O2）は 50 極 MIL フラットコネクター（1 が +24V、50 が 0V）。
 */

export interface XselFrontSpec {
  type: string;
  model: string;
  name: string;
  description: string;
  /** 世代（RA: XSEL-RA/SA 系、PQ: XSEL-P/Q 系） */
  generation: 'RA' | 'PQ';
  /** タイプの選択肢と、安全カテゴリー対応タイプか */
  models: { value: string; label: string; safety: boolean }[];
  /** ネットワークボード位置 1・2 の選択肢（空なら位置なし） */
  net1Types: (IoType | 'none')[];
  net2Types: (IoType | 'none')[];
  /** 内蔵 Ethernet・拡張モーション（MST）・USB があるか */
  hasEth: boolean;
  hasMst: boolean;
  hasUsb: boolean;
}

const W = 304 * MM;
const H = 195 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);


const axesOf = (p: ParamValues) => Math.max(1, Math.min(4, Number(p.axes ?? 4) || 4));
const isSafety = (spec: XselFrontSpec, p: ParamValues) => !!spec.models.find((m) => m.value === String(p.model))?.safety;
const threePhase = (p: ParamValues) => Number(p.phase ?? 3) === 3;
const board = (p: ParamValues, k: 'io1' | 'io2') => String(p[k] ?? (k === 'io1' ? 'N1' : 'none')) as XselPioBoard;
const net = (p: ParamValues, k: 'net1' | 'net2') => String(p[k] ?? 'none') as IoType | 'none';

const PWR_IDS = ['PE', 'CP_L', 'CP_N', 'MP_R', 'MP_S', 'MP_T'];
const pwr = plugV({ x: X(17), y: Y(108), ids: PWR_IDS, pitch: 7.62 * MM, w: 7 * MM, wire: 'left' });
const bk = plugV({ x: X(152.5), y: Y(76), ids: ['BK+', 'BK-'], pitch: 3.5 * MM, w: 5 * MM, wire: 'left' });
const sys = (spec: XselFrontSpec, p: ParamValues) => xselSystemIo(X(178), Y(70), 3.5 * MM, isSafety(spec, p), spec.generation === 'PQ' ? XSEL_PQ_SYS_IO : XSEL_SYS_IO);

/** エンコーダー（PG）・モーター（M）コネクターの位置。軸 1 が右 */
const PG = (i: number) => ({ x: X(140 - i * 19), y: Y(35) });
const MOT = (i: number) => ({ x: X(i % 2 === 0 ? 130 : 130) - (Math.floor(i / 2) * 40 * MM) + 0, y: Y(i % 2 === 0 ? 90 : 135) });
const RB = { x: X(46), y: Y(117) };
const FG = { x: X(46), y: Y(172) };
const TP = { x: X(185), y: Y(143) };
const ETH = { x: X(208), y: Y(108) };
const MST = { x: X(228), y: Y(42) };
const USB = { x: X(228), y: Y(62) };
const RS = { x: X(228), y: Y(160) };
const IO1 = { x: X(258), y: Y(122) };
const IO2 = { x: X(283), y: Y(122) };
const NET1_AREA = { x: X(199), y: Y(22), w: 18 * MM, h: 72 * MM };
const NET2_AREA = { x: X(199), y: Y(120), w: 18 * MM, h: 66 * MM };

/** ネットワークボード 2 の端子ID（ボード 1 と重ならないよう NET3 / NET4 にする） */
const net2Terminals = (p: ParamValues) =>
  net(p, 'net2') === 'none' ? [] : fieldbusBlock(net(p, 'net2') as IoType, NET2_AREA, 'right', '#333', true).terminals.map((t) => (t.id === 'NET1' ? { ...t, id: 'NET3' } : t.id === 'NET2' ? { ...t, id: 'NET4' } : t));

const svgOf = (spec: XselFrontSpec) => (p: ParamValues) => {
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.6) => text(x, y, t, size, '#2b2d30', anchor);
  const axes = axesOf(p);
  const n1 = net(p, 'net1');
  const n2t = net(p, 'net2');
  const s = sys(spec, p);
  const three = threePhase(p);
  const ioBoard = (b: XselPioBoard, c: { x: number; y: number }, name: string) =>
    b === 'none'
      ? `<rect x="${n2(c.x - 11)}" y="${n2(c.y - 76)}" width="22" height="152" rx="1" fill="#c3c7cb" stroke="#8a8f94" stroke-width="0.5"/>${lbl(c.x, c.y - 80, name, 'middle')}`
      : `${milHeaderV(c.x, c.y, 50)}${lbl(c.x, c.y - 80, name, 'middle')}${lbl(c.x, c.y + 86, b, 'middle', 2.4)}`;
  return `
  ${iaiDefs(['#dfe2e5', '#c3c7cb'])}
  <!-- 上の取付けフランジ -->
  <rect x="${X(4)}" y="0" width="${X(296)}" height="${Y(11)}" rx="1.5" fill="url(#iaitab-{{uid}})" stroke="#7d8287" stroke-width="0.6"/>
  ${[30, 152, 274].map((x) => `<circle cx="${X(x)}" cy="${Y(5)}" r="4" fill="#fff" stroke="#6f7478" stroke-width="0.6"/>`).join('')}
  <!-- 本体 -->
  <rect x="${X(1)}" y="${Y(9)}" width="${X(302)}" height="${Y(185)}" rx="3" fill="url(#iaibody-{{uid}})" stroke="#6f7478" stroke-width="0.8"/>
  <rect x="${X(3)}" y="${Y(11)}" width="${X(57)}" height="${Y(181)}" rx="1.5" fill="url(#iaipanel-{{uid}})" stroke="#9aa0a6" stroke-width="0.5"/>
  <rect x="${X(61)}" y="${Y(11)}" width="${X(109)}" height="${Y(181)}" rx="1.5" fill="url(#iaipanel-{{uid}})" stroke="#9aa0a6" stroke-width="0.5"/>
  <rect x="${X(171)}" y="${Y(11)}" width="${X(130)}" height="${Y(181)}" rx="1.5" fill="url(#iaipanel-{{uid}})" stroke="#9aa0a6" stroke-width="0.5"/>
  ${[[6, 15], [56, 15], [6, 188], [56, 188], [64, 15], [166, 188], [174, 15], [297, 188]].map(([x, y]) => screw(X(x), Y(y), 2.2)).join('')}
  ${text(X(10), Y(22), 'IAI', 9, '#d2232a', 'start', 'bold', ' font-style="italic"')}
  <!-- 電源部 -->
  ${pwr.svg}
  ${lbl(X(25.5), Y(112), 'PE')}${lbl(X(25.5), Y(119.6), 'L')}${lbl(X(25.5), Y(127.2), 'N')}${lbl(X(25.5), Y(134.8), three ? 'R' : 'NC')}${lbl(X(25.5), Y(142.4), three ? 'S' : 'L')}${lbl(X(25.5), Y(150), three ? 'T' : 'N')}
  <path d="M${X(29)} ${Y(117)} h1.5 v${Y(11)} h-1.5 M${X(29)} ${Y(132)} h1.5 v${Y(19)} h-1.5" stroke="#2b2d30" stroke-width="0.5" fill="none"/>
  ${lbl(X(31.5), Y(124), 'CP')}${lbl(X(31.5), Y(143), 'MP')}${lbl(X(12), Y(130), 'PWR', 'end')}
  <rect x="${X(42.5)}" y="${Y(106)}" width="${X(7)}" height="${X(23)}" rx="1" fill="url(#iaigreen-{{uid}})" stroke="#0d3317" stroke-width="0.5"/>
  ${[0, 1, 2].map((i) => `<rect x="${X(44)}" y="${Y(109 + i * 6.5)}" width="${X(3.6)}" height="${X(4)}" rx="0.4" fill="#06140a"/>`).join('')}
  ${lbl(X(41.5), Y(111.5), 'RB+', 'end', 2.2)}${lbl(X(41.5), Y(118), 'RB-', 'end', 2.2)}${lbl(X(41.5), Y(124.5), 'PE', 'end', 2.2)}${lbl(X(46), Y(134), 'RB', 'middle')}
  ${screw(FG.x, FG.y, 4)}${groundMark(FG.x, FG.y + 8, '#2b2d30')}
  <!-- ドライバー部 -->
  <rect x="${X(68)}" y="${Y(18)}" width="${X(84)}" height="${X(34)}" rx="1" fill="#f1f2f3" stroke="#9aa0a6" stroke-width="0.5"/>
  <rect x="${X(63)}" y="${Y(20)}" width="${X(4)}" height="${X(14)}" rx="0.5" fill="#f8f8f8" stroke="#888" stroke-width="0.4"/>
  ${Array.from({ length: 4 }, (_, i) => {
    const pg = PG(i);
    return i < axes ? `${dshellV(pg.x, pg.y, 50, 16)}${lbl(pg.x, Y(57), `PG${i + 1}`, 'middle')}` : `<rect x="${n2(pg.x - 8)}" y="${n2(pg.y - 25)}" width="16" height="50" rx="1" fill="#d6d9dc" stroke="#9aa0a6" stroke-width="0.4"/>`;
  }).join('')}
  ${Array.from({ length: 4 }, (_, i) => {
    const m = MOT(i);
    if (i >= axes) return `<rect x="${n2(m.x - 7)}" y="${n2(m.y - 34)}" width="14" height="68" rx="1" fill="#d6d9dc" stroke="#9aa0a6" stroke-width="0.4"/>`;
    const pl = plugV({ x: m.x - 7, y: m.y - 32, ids: ['PE', 'U', 'V', 'W'], pitch: 7.62 * MM, w: 14, labels: { PE: 'PE', U: 'U', V: 'V', W: 'W' }, labelColor: '#2b2d30', labelSize: 2.6, wire: 'left' });
    return `${screw(m.x, m.y - 36, 1.8)}${screw(m.x, m.y + 36, 1.8)}${pl.svg}${lbl(m.x - 10, m.y + 1, `M${i + 1}`, 'end')}`;
  }).join('')}
  ${bk.svg}${lbl(X(155), Y(73.5), 'BK PWR', 'middle', 2.4)}${lbl(X(159), Y(79.5), '+', 'start', 3)}${lbl(X(159), Y(86.5), '−', 'start', 3)}
  ${Array.from({ length: axes }, (_, i) => `${slideSwitch(X(158), Y(96 + i * 7), 9, 4.4)}${lbl(X(152.5), Y(97 + i * 7), `BK${i + 1}`, 'end', 2.6)}${lbl(X(163), Y(97 + i * 7), 'NOM', 'start', 1.8)}`).join('')}
  <rect x="${X(154)}" y="${Y(128)}" width="${X(8)}" height="${X(8)}" rx="0.6" fill="#141518"/>${lbl(X(153), Y(133), 'BK RMT', 'end', 2)}
  <!-- CPU 部 -->
  ${text(X(232), Y(22), '<tspan font-style="italic" font-size="9">X</tspan>-SEL', 6.5, '#1f3f8a', 'start', 'bold')}${lbl(X(262), Y(22), 'CONTROLLER', 'start', 3)}
  ${lbl(X(186), Y(66.5), 'SYSTEM IO', 'middle', 2.4)}
  ${s.svg}
  ${dshellV(TP.x, TP.y, 60, 18)}${lbl(X(195), Y(143), 'TP')}
  ${!spec.net1Types.length ? '' : n1 === 'none' ? `<rect x="${X(200)}" y="${Y(24)}" width="${X(16)}" height="${X(70)}" rx="1" fill="#c3c7cb" stroke="#8a8f94" stroke-width="0.5"/>${lbl(X(208), Y(60), 'NETWORK1', 'middle', 2)}` : fieldbusBlock(n1 as IoType, NET1_AREA, 'right', '#333', true).svg}
  ${spec.hasEth ? `${rj45V(ETH.x, ETH.y)}${lbl(ETH.x, Y(117), 'Ethernet', 'middle', 2.2)}` : ''}
  <rect x="${X(205)}" y="${Y(119)}" width="${X(6)}" height="${X(3)}" rx="0.4" fill="#333"/>${slideSwitch(X(210), Y(123), 7, 3.6)}${lbl(X(214.5), Y(124), 'MODE', 'start', 2)}
  ${!spec.net2Types.length ? '' : n2t === 'none' ? `<rect x="${X(200)}" y="${Y(127)}" width="${X(16)}" height="${X(58)}" rx="1" fill="#c3c7cb" stroke="#8a8f94" stroke-width="0.5"/>${lbl(X(208), Y(158), 'NETWORK2', 'middle', 2)}` : fieldbusBlock(n2t as IoType, NET2_AREA, 'right', '#333', true).svg}
  ${spec.hasMst ? `${smallPort(MST.x, MST.y, 12, 14)}${lbl(MST.x, Y(51), 'MST', 'middle', 2.2)}` : ''}
  ${['LK', 'ER', 'SD', 'RUN'].map((nm, i) => `${led(X(221), Y(30 + i * 3), 'off', 2, 1.6)}${lbl(X(219.5), Y(30.8 + i * 3), nm, 'end', 1.8)}`).join('')}
  ${spec.hasUsb ? `<rect x="${n2(USB.x - 6)}" y="${n2(USB.y - 4)}" width="12" height="8" rx="0.6" fill="#d0d3d6" stroke="#555" stroke-width="0.4"/><rect x="${n2(USB.x - 4)}" y="${n2(USB.y - 2)}" width="8" height="4" rx="0.4" fill="#2a2c30"/>${lbl(USB.x, Y(68), 'USB', 'middle', 2.2)}` : ''}
  ${['RDY', 'ALM', 'EMG', 'PSE', 'CLK', 'OPL'].map((nm, i) => `${led(X(240 + i * 8.6), Y(68), i === 0 ? 'g' : 'off', 3, 2)}${lbl(X(240 + i * 8.6), Y(72), nm, 'middle', 2)}`).join('')}
  <rect x="${X(236)}" y="${Y(32)}" width="${X(56)}" height="${X(32)}" rx="1.5" fill="#cfd8de" stroke="#8a9096" stroke-width="0.5"/>${lbl(X(238), Y(36), 'CODE', 'start', 2.2)}
  ${sevenSeg(X(240), Y(39), 48 * MM, 20 * MM)}
  ${lbl(X(222), Y(150), 'RS-232C', 'end', 2.2)}${dsub9V(RS.x, RS.y)}
  ${['3', '2', '1', '0'].map((nm, i) => `${led(X(222), Y(128 + i * 3), 'off', 2, 1.6)}${lbl(X(220.5), Y(128.8 + i * 3), nm, 'end', 1.8)}`).join('')}${lbl(X(225), Y(126), 'CPU STATUS', 'start', 1.8)}
  ${ioBoard(board(p, 'io1'), IO1, 'I/O1')}
  ${ioBoard(board(p, 'io2'), IO2, 'I/O2')}
  ${lbl(X(238), Y(186), `XSEL-${String(p.model)}`, 'start', 2.8)}`;
};

const acCp: AcceptSpec = { system: 'AC', minVoltage: 180, maxVoltage: 253 };

const terminalsOf = (spec: XselFrontSpec) => (p: ParamValues): TerminalDef[] => {
  const three = threePhase(p);
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  const ts: TerminalDef[] = [
    { id: 'PE', label: 'PE', note: '保護接地', ...at(pwr.pos.PE), role: 'ground' },
    { id: 'CP_L', label: 'CP L', note: '制御電源 単相 AC200〜230V ±10%（L 相）', ...at(pwr.pos.CP_L), role: 'input', accepts: acCp },
    { id: 'CP_N', label: 'CP N', note: '制御電源 単相 AC200〜230V ±10%（N 相）', ...at(pwr.pos.CP_N), role: 'input', accepts: acCp },
    three
      ? { id: 'MP_R', label: 'MP R', note: 'モーター電源 三相 AC200〜230V（R 相）', ...at(pwr.pos.MP_R), role: 'input', accepts: acCp }
      : { id: 'MP_R', label: 'NC', note: '単相仕様では未接続', ...at(pwr.pos.MP_R), role: 'signal', optional: true },
    { id: 'MP_S', label: three ? 'MP S' : 'MP L', note: three ? 'モーター電源 三相 AC200〜230V（S 相）' : 'モーター電源 単相 AC200〜230V（L 相）', ...at(pwr.pos.MP_S), role: 'input', accepts: acCp },
    { id: 'MP_T', label: three ? 'MP T' : 'MP N', note: three ? 'モーター電源 三相 AC200〜230V（T 相）' : 'モーター電源 単相 AC200〜230V（N 相）', ...at(pwr.pos.MP_T), role: 'input', accepts: acCp },
    { id: 'FG', label: 'FG', note: 'FG 接続端子（フレームグラウンド）', x: FG.x, y: FG.y, side: 'right', role: 'ground', optional: true },
    { id: 'RB', label: 'RB（回生抵抗ユニット）', note: '外部回生抵抗ユニット（RESU-1 など）の接続', x: RB.x, y: RB.y, side: 'right', role: 'connector', connector: { kind: 'IAI-RB', pins: 0, width: 40, length: 14, facing: 'front' }, optional: true },
    { id: 'BK+', label: 'BK PWR +', note: 'ブレーキ電源 DC24V ±10%（1 軸あたり約 0.4A。ブレーキ付きのとき）', ...at(bk.pos['BK+']), role: 'input', accepts: DC24_PLUS, optional: true },
    { id: 'BK-', label: 'BK PWR −', note: 'ブレーキ電源 0V', ...at(bk.pos['BK-']), role: 'input', accepts: DC24_MINUS, optional: true },
    ...sys(spec, p).terminals,
    { id: 'TP', label: 'TP（ティーチング D-sub 25 ピン）', note: 'ティーチングボックス・パソコン（RS-232C）の接続用。使わない場合はダミープラグ DP-2 を差す（非常停止の回路が TP を通るため）', x: TP.x, y: TP.y, side: 'left', role: 'connector', connector: { kind: 'DSUB25', pins: 0, width: 60, length: 18, facing: 'front', protocols: ['iai-sel-sio'] }, optional: true },
    ...(spec.hasEth ? [{ id: 'ETH', label: 'Ethernet（RJ-45）', note: '内蔵の Ethernet ポート（10/100BASE-T、ソケット通信・ティーチング）', x: ETH.x, y: ETH.y, side: 'right' as const, role: 'connector' as const, connector: rj45Side(['ethernet']), optional: true }] : []),
    ...(spec.hasMst ? [{ id: 'MST', label: 'MST（拡張モーション制御マスター）', note: 'MECHATROLINK-Ⅲ 対応の PCON/ACON/DCON/SCON-CB・MCON を最大 32 軸までプログラムで制御する（マスター）', x: MST.x, y: MST.y, side: 'right' as const, role: 'connector' as const, connector: { kind: 'MECHATROLINK3', pins: 0, width: 16, length: 12, facing: 'front' as const, protocols: ['mechatrolink-iii'] }, optional: true }] : []),
    ...(spec.hasUsb ? [{ id: 'USB', label: 'USB（Mini-B）', note: 'パソコンのティーチングソフト用', x: USB.x, y: USB.y, side: 'right' as const, role: 'connector' as const, connector: { kind: 'USB-MINIB', pins: 0, width: 10, length: 10, facing: 'front' as const, protocols: ['usb'] }, optional: true }] : []),
    { id: 'RS232', label: 'RS-232C（D-sub 9 ピン）', note: '汎用 RS-232C ポート', x: RS.x, y: RS.y, side: 'right', role: 'connector', connector: { kind: 'DSUB9', pins: 0, width: 32, length: 14, facing: 'front', protocols: ['rs-232c'] }, optional: true },
  ];
  for (let i = 0; i < axesOf(p); i++) {
    const pg = PG(i);
    const m = MOT(i);
    ts.push(
      {
        id: `PG${i + 1}`,
        label: `PG${i + 1}（${i + 1} 軸目 エンコーダー）`,
        note: 'アクチュエーターのエンコーダーケーブル（26 ピン）。ピン 21 BK+・20 BK− はブレーキ付きアクチュエーターのブレーキ電源（BK PWR から出る）',
        x: pg.x,
        y: pg.y,
        side: 'left',
        role: 'connector',
        connector: { kind: 'IAI-XSEL-PG', pins: 26, width: 50, length: 16, facing: 'front', style: 'lan' },
        optional: true,
      },
      { id: `M${i + 1}`, label: `M${i + 1}（${i + 1} 軸目 モーター PE/U/V/W）`, note: 'アクチュエーターのモーターケーブル', x: n2(m.x - 7), y: m.y, side: 'left', role: 'connector', connector: { kind: 'IAI-XSEL-MOT', pins: 0, width: 62, length: 16, facing: 'front' }, optional: true },
    );
  }
  if (net(p, 'net1') !== 'none') ts.push(...fieldbusBlock(net(p, 'net1') as IoType, NET1_AREA, 'right', '#333', true).terminals);
  ts.push(...net2Terminals(p));
  for (const [k, c, side] of [
    ['io1', IO1, 'left'],
    ['io2', IO2, 'right'],
  ] as const) {
    const b = board(p, k);
    if (b === 'none') continue;
    ts.push({
      id: k === 'io1' ? 'I/O1' : 'I/O2',
      label: `${k === 'io1' ? 'I/O1' : 'I/O2'}（PIO ${b}、MIL 50 極）`,
      note: `PIO ボード（${b}）。PIO ケーブル CB-X-PIO（片側バラ線）または MIL 50 極の変換端子台でつなぐ。1 に +24V、50 に 0V を供給する`,
      x: c.x,
      y: c.y,
      side,
      role: 'connector',
      connector: milConnectorSide(50),
      optional: true,
    });
  }
  return ts;
};

const pins = (p: ParamValues): PinDef[] => [
  // エンコーダーコネクター（PG1〜）の 26 ピン。20 BK−・21 BK+ がブレーキの電源
  ...Array.from({ length: axesOf(p) }, (_, i) => controllerEncoderPins(`PG${i + 1}`)).flat(),
  ...xselBoardPins('I/O1', board(p, 'io1'), 1).pins,
  ...xselBoardPins('I/O2', board(p, 'io2'), 2).pins,
];

const linksOf = (spec: XselFrontSpec) => (p: ParamValues): InternalLink[] => [
  { from: 'PE', to: 'FG' },
  // ブレーキ電源（BK PWR）から各軸のエンコーダーコネクターのブレーキ開放出力（21 BK+・20 BK−）へ。ブレーキ解除中（運転中）は導通しているものとして扱う
  ...Array.from({ length: axesOf(p) }, (_, i): InternalLink[] => [
    { from: 'BK+', to: `PG${i + 1}#21`, directed: true },
    { from: 'BK-', to: `PG${i + 1}#20` },
  ]).flat(),
  ...sys(spec, p).links,
  ...xselBoardPins('I/O1', board(p, 'io1'), 1).links,
  ...xselBoardPins('I/O2', board(p, 'io2'), 2).links,
];

/** XSEL（RA/SA 系・P/Q 系）の機器定義を作る */
export function buildXselFront(spec: XselFrontSpec): DeviceDefinition {
  const params: ParamDef[] = [
    { key: 'model', label: 'タイプ', options: spec.models.map((m) => ({ value: m.value, label: m.label })), default: spec.models[0].value },
    { key: 'axes', label: '接続軸数', options: [1, 2, 3, 4].map((n) => ({ value: n, label: `${n} 軸` })), default: 4 },
    {
      key: 'phase',
      label: 'モーター電源',
      options: [
        { value: 3, label: '三相 AC200〜230V' },
        { value: 1, label: '単相 AC200〜230V' },
      ],
      default: 3,
    },
    { key: 'io1', label: spec.generation === 'PQ' ? '標準 I/O（I/O1）' : 'I/O スロット 1（I/O1）', options: XSEL_PIO_OPTIONS, default: 'N1' },
    { key: 'io2', label: spec.generation === 'PQ' ? '拡張 I/O（I/O2）' : 'I/O スロット 2（I/O2）', options: XSEL_PIO_OPTIONS, default: 'none' },
    ...(spec.net1Types.length ? [{ key: 'net1', label: 'ネットワークボード 位置 1', options: spec.net1Types.map((t) => ({ value: t, label: t === 'none' ? 'なし' : IO_TYPE_LABELS[t] })), default: 'none' }] : []),
    ...(spec.net2Types.length ? [{ key: 'net2', label: spec.net1Types.length ? 'ネットワークボード 位置 2' : 'フィールドネットワーク', options: spec.net2Types.map((t) => ({ value: t, label: t === 'none' ? 'なし' : IO_TYPE_LABELS[t] })), default: 'none' }] : []),
    {
      key: 'loadCurrent',
      label: '入力電流の目安（モーター合計）',
      unit: 'A',
      options: [
        { value: 3, label: '〜400W（約 3A）' },
        { value: 6, label: '〜800W（約 6A）' },
        { value: 12, label: '〜1600W（約 12A）' },
        { value: 18, label: '〜2400W（約 18A、三相）' },
      ],
      default: 6,
    },
  ];
  return {
    type: spec.type,
    name: spec.name,
    model: spec.model,
    maker: 'IAI',
    category: 'plc',
    description: spec.description,
    labelPrefix: 'XSEL',
    width: W,
    height: H,
    svg: svgOf(spec),
    terminals: terminalsOf(spec),
    pins,
    links: linksOf(spec),
    safetyChannels: [stopLoop('EMG', '非常停止（EMGin +24V → EMGin IN）', 'EMGIN'), stopLoop('ENB', 'イネーブル（ENBin +24V → ENBin IN）', 'ENBIN')],
    distinctGroups: [['CP_L', 'CP_N'], ['MP_R', 'MP_S', 'MP_T']],
    params,
    loadCurrent: { param: 'loadCurrent' },
  };
}

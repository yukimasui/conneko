import { controllerEncoderPins } from '../iai/actuator';
import { fieldbusBlock, IO_TYPE_LABELS, ioOf, isPio, polarityOf, type IoType } from '../iai/fieldbus';
import {
  DC24_MINUS,
  DC24_PLUS,
  groundMark,
  hif6Connector,
  hif6HeaderV,
  iaiLogo,
  led,
  miniDin,
  MM,
  mountTab,
  n2,
  plugV,
  rotarySwitch,
  screw,
  slideSwitch,
  smallBlackConnector,
  stopLoop,
  text,
} from '../iai/parts';
import { iaiDefs } from '../iai/parts';
import { patternOf, pioLinks, pioPins, positionerPio40 } from '../iai/pio';
import type { AcceptSpec, DeviceDefinition, InternalLink, ParamValues, PinDef, SafetyChannelGroup, TerminalDef } from '../types';

/**
 * IAI ポジションコントローラー SCON-CB / SCON-CGB（AC サーボモーター 750W 以下用。RCS2/RCS3/RCS4・単軸ロボット・直交ロボット・リニアサーボ）。
 *
 * 出典: IAI 総合カタログ CJ9005「SCON-CB」（型式項目・基本仕様・安全機能用 I/O コネクター・外形寸法図・各部名称・製品写真）、
 *       取扱説明書 MJ0340「SCON-CB/CGB」（1.3 各部の名称と機能、3.5 配線方法、9.2.7 安全機能用 I/O コネクター）。
 *
 * 外観: 幅 58mm（400W 未満。400〜750W は左に放熱部が広がり幅 72mm だが、図は 58mm の筐体で描く）、高さ 194mm（取付けタブ込み 200.5mm）。シルバーの正面パネルに赤い IAI ロゴ。
 * 左の列に状態 LED・軸番号スイッチ・システム I/O（緑 4 極）・回生抵抗（RB）・モーター（MOT、緑 4 極ねじ式）・電源（PWR、緑 6 極ねじ式）・接地ねじ、
 * 右の列に安全機能用 I/O（STO/SS1-t 仕様のみ）・パルス列（PULSE）・PIO（40 極 HIF6）・MANU/AUTO・SIO・BK RLS・ブレーキ電源（BK PWR）・
 * エンコーダー（PG）・アブソバッテリー。
 *
 * 電源コネクター（MSTB2.5/6-STF-5.08）: 1 L1・2 L2（モーター電源 AC）、3 L1C・4 L2C（制御電源 AC）、5 NC、6 PE。
 *   単相 AC100〜115V ±10%（100V 仕様）または 単相 AC200〜230V ±10%（200V 仕様）。購入後は変更できない。
 * システム I/O（FMC1.5/4-ST-3.5）: 1 S1・2 S2（ティーチングボックスの停止スイッチ。CB は TB 未接続時に内部で短絡）、
 *   3 EMG+（非常停止回路専用の内蔵 24V 出力）、4 EMG-（非常停止入力。EMG+ から非常停止スイッチを通して戻す）。
 *   CB は内部にモーター電源の遮断リレーがあり、CGB はない（外部に駆動源遮断回路が必要）。
 * ブレーキ電源（MC1.5/2-ST-3.5）: BK+（DC24V ±10%、最大 1A）、PWR-（0V）。
 * 安全機能用 I/O（TE 2294417-1、STO/SS1-t 仕様）: 3 /SRI1-・4 /SRI1+、5 /SRI2-・6 /SRI2+（安全要求入力 2 チャンネル。
 *   DC24V で ON = 安全機能の要求を解除、OFF = STO 要求）、7 EDM-・8 EDM+（外部機器モニター出力 24V 100mA）。
 *   STO: ISO 13849-1 カテゴリー3 PL e、IEC 61508 SIL3（上位で EDM を監視する場合）。
 * PIO は PCON-CB と同じ 40 極（1A・2A が +24V、19B・20B が 0V、IN0〜15 が 5A〜20A、OUT0〜15 が 1B〜16B）。OUT15 は *BALM。
 */

const SCON_IO_TYPES: IoType[] = ['NP', 'PN', 'DV', 'CC', 'CIE', 'PR', 'CN', 'ML', 'ML3', 'EC', 'EP', 'PRT'];

const H = 201 * MM;
/** 筐体の幅（400W 未満の 58mm。400〜750W の筐体は左に放熱部が広がり幅 72mm になるが、機器の幅はパラメーターで変えられないため 58mm で描く） */
const W0 = 58 * MM;
const widthOf = (_p: ParamValues) => W0;

const POWER_IDS = ['L1', 'L2', 'L1C', 'L2C', 'NC', 'PE'];
const SYS_IDS = ['S1', 'S2', 'EMG+', 'EMG-'];
const MOT_IDS = ['M-PE', 'U', 'V', 'W'];

/** 各部の位置（パネル左端 = x0 からの mm） */
function layout(p: ParamValues) {
  const W = widthOf(p);
  const x0 = W - 58 * MM;
  const X = (mm: number) => n2(x0 + mm * MM);
  const Y = (mm: number) => n2(mm * MM);
  return {
    W,
    X,
    Y,
    sys: plugV({ x: X(12.5), y: Y(42.5), ids: SYS_IDS, pitch: 3.5 * MM, w: 7 * MM, labels: { S1: 'S1', S2: 'S2', 'EMG+': 'EMG+', 'EMG-': 'EMG-' }, labelColor: '#222', labelSize: 2.8 }),
    mot: plugV({ x: X(12), y: Y(94), ids: MOT_IDS, pitch: 7.62 * MM, w: 11 * MM, labels: { 'M-PE': 'PE', U: 'U', V: 'V', W: 'W' }, labelColor: '#222', labelSize: 3 }),
    pwr: plugV({ x: X(12), y: Y(137), ids: POWER_IDS, pitch: 5.08 * MM, w: 9.5 * MM, labels: { L1: 'L1', L2: 'L2', L1C: 'L1C', L2C: 'L2C', NC: '', PE: 'PE' }, labelColor: '#222', labelSize: 3 }),
    bk: { x: X(40.5), y: Y(123.5) },
    pio: { x: X(43.5), y: Y(73) },
    sio: { x: X(43.5), y: Y(108.5) },
    pg: { x: X(43.5), y: Y(153) },
    sto: { x: X(29), y: Y(25) },
    pulse: { x: X(43.5), y: Y(30) },
    rb: { x: X(18.5), y: Y(76) },
    fg: { x: X(5), y: Y(181) },
    fbArea: { x: X(36), y: Y(12), w: 16 * MM, h: 86 * MM },
  };
}

/** 電源電圧（100V / 200V 仕様）の受電条件 */
const acAccepts = (p: ParamValues): AcceptSpec =>
  Number(p.voltage ?? 200) === 100 ? { system: 'AC', minVoltage: 90, maxVoltage: 126.5 } : { system: 'AC', minVoltage: 180, maxVoltage: 253 };

const hasSto = (p: ParamValues) => String(p.safety ?? 'none') !== 'none';

const svg = (p: ParamValues) => {
  const L = layout(p);
  const { W, X, Y } = L;
  const io = ioOf(p);
  const pio = isPio(io);
  const fb = pio ? undefined : fieldbusBlock(io, L.fbArea, 'right', '#222', true);
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start') => text(x, y, t, 2.6, '#2a2a2a', anchor);
  // 放熱フィン（大きい筐体は左側に放熱部が広がる）
  const finsW = W - 58 * MM;
  return `
  ${iaiDefs(['#d7d9dc', '#b9bdc1'])}
  ${mountTab(X(28), 0, 13 * MM, 7 * MM, true)}
  ${mountTab(X(29), Y(194), 13 * MM, 7 * MM, false)}
  <rect x="0.5" y="${Y(5)}" width="${W - 1}" height="${Y(190)}" rx="2" fill="url(#iaibody-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  ${finsW > 0 ? Array.from({ length: Math.floor(finsW / 5) }, (_, i) => `<rect x="${n2(2 + i * 5)}" y="${Y(8)}" width="3" height="${Y(184)}" rx="1" fill="#9ea3a8"/>`).join('') : ''}
  <rect x="${X(1.5)}" y="${Y(6.5)}" width="${n2(55 * MM)}" height="${Y(187)}" rx="1.6" fill="url(#iaipanel-{{uid}})" stroke="#8a8f94" stroke-width="0.6"/>
  ${iaiLogo(X(14), Y(12.5), 7, '#d2232a')}
  ${led(X(14.5), Y(17.5), 'g')}${led(X(19.5), Y(17.5), 'off')}${led(X(14.5), Y(21.5), 'off')}${led(X(19.5), Y(21.5), 'off')}
  ${lbl(X(12), Y(18.2), 'PWR', 'end')}${lbl(X(22), Y(18.2), 'SV')}${lbl(X(12), Y(22.2), 'ALM', 'end')}${lbl(X(22), Y(22.2), 'EMG')}
  ${rotarySwitch(X(16.5), Y(30), 3.2)}${lbl(X(21.5), Y(31), 'ADRS')}
  <rect x="${X(18)}" y="${Y(35.5)}" width="${6 * MM}" height="${4 * MM}" rx="0.5" fill="#d9381e"/>
  <rect x="${X(19)}" y="${Y(36.3)}" width="3" height="${2.4 * MM}" fill="#f0f0f0"/><rect x="${X(21.4)}" y="${Y(36.3)}" width="3" height="${2.4 * MM}" fill="#f0f0f0"/>
  ${lbl(X(25), Y(38.4), 'SW')}
  <!-- システム I/O -->
  ${L.sys.svg}${lbl(X(12), Y(41.5), 'SYS I/O', 'start')}
  <!-- 回生抵抗 -->
  <rect x="${X(13)}" y="${Y(64)}" width="${11 * MM}" height="${24 * MM}" rx="1" fill="url(#iaiwhite-{{uid}})" stroke="#7d8287" stroke-width="0.6"/>
  ${[0, 1, 2].map((i) => `<rect x="${X(17.5)}" y="${Y(69 + i * 6.5)}" width="${2 * MM}" height="${3 * MM}" fill="#5a5f64"/>`).join('')}
  ${lbl(X(25.5), Y(77), 'RB')}
  <!-- モーター -->
  ${L.mot.svg}${lbl(X(12), Y(93), 'MOT')}
  <!-- 電源 -->
  ${L.pwr.svg}${lbl(X(12), Y(136), 'PWR')}
  ${screw(L.fg.x, Y(181), 3)}${screw(L.fg.x, Y(188), 3)}${groundMark(L.fg.x, Y(176.5), '#333')}
  <!-- 右の列 -->
  ${
    hasSto(p)
      ? `<rect x="${X(25)}" y="${Y(20.5)}" width="${8 * MM}" height="${9 * MM}" rx="1" fill="url(#iaiblack-{{uid}})" stroke="#000" stroke-width="0.5"/>
  <rect x="${X(26.3)}" y="${Y(22)}" width="${5.4 * MM}" height="${6 * MM}" rx="0.8" fill="#0b0b0c" stroke="#666" stroke-width="0.4"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="${X(27.2)}" y="${Y(22.7 + i * 1.3)}" width="1.4" height="1.2" fill="#c9a43a"/><rect x="${X(29.6)}" y="${Y(22.7 + i * 1.3)}" width="1.4" height="1.2" fill="#c9a43a"/>`).join('')}
  ${text(X(29), Y(32.3), 'STO', 2.6, '#222', 'middle')}`
      : ''
  }
  ${
    pio
      ? `<!-- パルス列 -->
  <rect x="${X(38)}" y="${Y(15)}" width="${11 * MM}" height="${30 * MM}" rx="1" fill="url(#iaiblack-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <rect x="${X(40.5)}" y="${Y(21)}" width="${6 * MM}" height="${18 * MM}" rx="1.5" fill="#0b0b0c" stroke="#777" stroke-width="0.5"/>
  ${screw(X(43.5), Y(17.5), 1.8)}${screw(X(43.5), Y(42.3), 1.8)}
  ${lbl(X(37.2), Y(30.5), 'PULSE', 'end')}
  <!-- PIO -->
  ${hif6HeaderV(L.pio.x, L.pio.y, 40)}
  ${lbl(X(37.5), Y(73.5), 'PIO', 'end')}
  <rect x="${X(51)}" y="${Y(64)}" width="${4.4 * MM}" height="${3 * MM}" rx="0.4" fill="#f4f4ef" stroke="#999" stroke-width="0.4"/>
  ${text(X(53.2), Y(66.2), polarityOf(io) === 'pnp' ? 'PNP' : 'NPN', 2.3, '#1a1a1a', 'middle', 'bold')}`
      : fb!.svg
  }
  ${slideSwitch(X(43.5), Y(100), 8, 4.4)}${lbl(X(38), Y(100.8), 'MANU', 'end')}${lbl(X(49), Y(100.8), 'AUTO')}
  <rect x="${X(37.5)}" y="${Y(103)}" width="${12 * MM}" height="${11 * MM}" rx="1.2" fill="#141518" stroke="#000" stroke-width="0.5"/>
  ${miniDin(L.sio.x, L.sio.y, 6)}${lbl(X(50.5), Y(109.3), 'SIO')}
  ${slideSwitch(X(43.5), Y(118), 8, 4.4)}${lbl(X(38), Y(118.8), 'BK RLS', 'end')}${lbl(X(49), Y(118.8), 'NOM')}
  <rect x="${X(41)}" y="${Y(121)}" width="${5 * MM}" height="${8 * MM}" rx="0.8" fill="url(#iaigreen-{{uid}})" stroke="#0d3317" stroke-width="0.5"/>
  ${[0, 1].map((i) => `<rect x="${X(42)}" y="${Y(122.2 + i * 3.5)}" width="${3 * MM}" height="${2.4 * MM}" rx="0.3" fill="#06140a"/>`).join('')}
  ${lbl(X(47), Y(124.2), 'BK+')}${lbl(X(47), Y(127.8), 'PWR-')}
  <!-- エンコーダー -->
  <rect x="${X(38)}" y="${Y(135)}" width="${11 * MM}" height="${36 * MM}" rx="1" fill="url(#iaiblack-{{uid}})" stroke="#000" stroke-width="0.6"/>
  <rect x="${X(40.5)}" y="${Y(142)}" width="${6 * MM}" height="${22 * MM}" rx="1.5" fill="#0b0b0c" stroke="#777" stroke-width="0.5"/>
  ${screw(X(43.5), Y(137.8), 1.8)}${screw(X(43.5), Y(168.3), 1.8)}
  ${lbl(X(50), Y(153.5), 'PG')}
  ${smallBlackConnector(X(41.5), Y(173.5), 4 * MM, 4 * MM)}${lbl(X(50), Y(176.5), 'BAT')}
  ${text(X(51), Y(187.5), '<tspan font-size="5" font-style="italic">S</tspan>CON-CB', 3.2, '#d2232a', 'middle', 'bold')}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const L = layout(p);
  const io = ioOf(p);
  const ac = acAccepts(p);
  const ts: TerminalDef[] = [];
  const pw = L.pwr.pos;
  const sy = L.sys.pos;
  const mo = L.mot.pos;
  ts.push(
    { id: 'L1', label: 'L1', note: 'モーター電源 AC 入力', x: pw.L1.x, y: pw.L1.y, side: 'left', role: 'input', accepts: ac },
    { id: 'L2', label: 'L2', note: 'モーター電源 AC 入力', x: pw.L2.x, y: pw.L2.y, side: 'left', role: 'input', accepts: ac },
    { id: 'L1C', label: 'L1C', note: '制御電源 AC 入力', x: pw.L1C.x, y: pw.L1C.y, side: 'left', role: 'input', accepts: ac },
    { id: 'L2C', label: 'L2C', note: '制御電源 AC 入力', x: pw.L2C.x, y: pw.L2C.y, side: 'left', role: 'input', accepts: ac },
    { id: 'PE', label: 'PE', note: '保護接地（接地用ねじと内部で接続）', x: pw.PE.x, y: pw.PE.y, side: 'left', role: 'ground' },
    { id: 'FG', label: '⏚', note: '接地用ねじ', x: L.fg.x, y: L.fg.y, side: 'left', role: 'ground', optional: true },
    { id: 'S1', label: 'S1', note: 'ティーチングボックスの停止スイッチ接続（CB は TB 未接続時に内部で S1-S2 を短絡）', x: sy.S1.x, y: sy.S1.y, side: 'left', role: 'signal', optional: true },
    { id: 'S2', label: 'S2', note: 'ティーチングボックスの停止スイッチ接続', x: sy.S2.x, y: sy.S2.y, side: 'left', role: 'signal', optional: true },
    {
      id: 'EMG+',
      label: 'EMG+',
      note: '非常停止回路専用の内蔵 24V 出力（EMG- へは必ずこの電源から非常停止スイッチを通して戻す）',
      x: sy['EMG+'].x,
      y: sy['EMG+'].y,
      side: 'left',
      role: 'supply',
      supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' },
    },
    {
      id: 'EMG-',
      label: 'EMG-',
      note: '非常停止入力（EMG+ の 24V が来ていれば非常停止解除）',
      x: sy['EMG-'].x,
      y: sy['EMG-'].y,
      side: 'left',
      role: 'signal',
      function: 'safety-input',
    },
    { id: 'MOT', label: 'MOT（モーター U/V/W/PE）', note: 'アクチュエーターのモーターケーブル（GIC2.5/4-STF-7.62）', x: mo.V.x, y: n2((mo.U.y + mo.V.y) / 2), side: 'left', role: 'connector', connector: { kind: 'IAI-SCON-MOT', pins: 0, width: 4 * 7.62 * MM, length: 16, facing: 'front', required: true }, optional: true },
    { id: 'RB', label: 'RB（回生抵抗ユニット）', note: '回生抵抗ユニット RESU-2 などの接続', x: L.rb.x, y: L.rb.y, side: 'left', role: 'connector', connector: { kind: 'IAI-RB', pins: 0, width: 40, length: 14, facing: 'front' }, optional: true },
    { id: 'BK+', label: 'BK+', note: 'ブレーキ電源 DC24V ±10%（最大 1A。ブレーキ付きアクチュエーターのとき）', x: L.bk.x, y: n2(L.bk.y - 2), side: 'left', role: 'input', accepts: DC24_PLUS, optional: true },
    { id: 'PWR-', label: 'PWR-', note: 'ブレーキ電源 0V', x: L.bk.x, y: n2(L.bk.y + 5), side: 'left', role: 'input', accepts: DC24_MINUS, optional: true },
    {
      id: 'SIO',
      label: 'SIO（ミニ DIN 8 ピン）',
      note: 'ティーチングボックス・パソコン（RS-485）・ゲートウェイの接続用',
      x: L.sio.x,
      y: L.sio.y,
      side: 'right',
      role: 'connector',
      connector: { kind: 'MINIDIN8', pins: 0, width: 16, length: 14, facing: 'front', protocols: ['iai-sio'] },
      optional: true,
    },
    {
      id: 'PG',
      label: 'PG（エンコーダー）',
      note: 'アクチュエーターのエンコーダーケーブル（10226-6202JL、26 ピン）。ピン 21 BK+・20 BK− はブレーキ付きアクチュエーターのブレーキ電源（BK+・PWR− から出る）',
      x: L.pg.x,
      y: L.pg.y,
      side: 'right',
      role: 'connector',
      connector: { kind: 'IAI-SCON-PG', pins: 26, width: 44, length: 14, facing: 'front', style: 'lan', required: true },
      optional: true,
    },
  );
  if (isPio(io)) {
    ts.push(
      {
        id: 'PIO',
        label: 'PIO（40極 HIF6）',
        note: 'PIO コネクター。付属の PIO ケーブル CB-PAC-PIO（片側バラ線）で PLC などへつなぐ',
        x: L.pio.x,
        y: L.pio.y,
        side: 'right',
        role: 'connector',
        connector: hif6Connector(40),
        optional: true,
      },
      {
        id: 'PULSE',
        label: 'PULSE（パルス列・フィードバックパルス）',
        note: 'パルス列制御モードの指令パルス入力とフィードバックパルス出力（10114-3000PE、14 ピン）',
        x: L.pulse.x,
        y: L.pulse.y,
        side: 'right',
        role: 'connector',
        connector: { kind: 'IAI-SCON-PULSE14', pins: 0, width: 36, length: 14, facing: 'front' },
        optional: true,
      },
    );
  } else {
    ts.push(...fieldbusBlock(io, L.fbArea, 'right', '#222', true).terminals);
  }
  if (hasSto(p)) {
    ts.push({
      id: 'STO',
      label: '安全機能用 I/O（STO/SS1-t）',
      note: 'TE 2294417-1（8 極）。安全機能用 I/O ケーブル CB-SC-STO030（片側バラ線）で安全コントローラー・セーフティリレーへつなぐ。使わない場合はダミープラグ DP-6 を差す',
      x: L.sto.x,
      y: L.sto.y,
      side: 'top',
      role: 'connector',
      connector: { kind: 'IAI-STO8', pins: 8, width: 18, length: 18, facing: 'front' },
      optional: true,
    });
  }
  return ts;
};

const pins = (p: ParamValues): PinDef[] => {
  // エンコーダーコネクター（PG）の 26 ピン。20 BK−・21 BK+ がブレーキの電源
  const ps: PinDef[] = [...controllerEncoderPins('PG')];
  const io = ioOf(p);
  if (isPio(io)) ps.push(...pioPins(positionerPio40('PIO', patternOf(p), '*BALM'), polarityOf(io)));
  if (hasSto(p)) {
    ps.push(
      { id: 'STO#1', label: 'NC（1）', role: 'signal', optional: true, note: '配線しない' },
      { id: 'STO#2', label: 'NC（2）', role: 'signal', optional: true, note: '配線しない' },
      { id: 'STO#3', label: '/SRI1-（3）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 1 の −側（0V）' },
      { id: 'STO#4', label: '/SRI1+（4）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 1, note: '安全要求入力 1（+24V で安全機能の要求を解除、開放で STO 要求。7.6mA）' },
      { id: 'STO#5', label: '/SRI2-（5）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 2 の −側（0V）' },
      { id: 'STO#6', label: '/SRI2+（6）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 2, note: '安全要求入力 2（+24V で安全機能の要求を解除、開放で STO 要求。7.6mA）' },
      { id: 'STO#7', label: 'EDM-（7）', role: 'signal', optional: true, note: '外部機器モニター出力 −側' },
      { id: 'STO#8', label: 'EDM+（8）', role: 'signal', signal: { dir: 'out', kind: 'contact' }, optional: true, note: '外部機器モニター出力 +側（安全機能が正常に動作していると導通。24V 100mA）' },
    );
  }
  return ps;
};

const links = (p: ParamValues): InternalLink[] => {
  const io = ioOf(p);
  const ls: InternalLink[] = [
    // ティーチングボックス未接続時は内部で S1-S2 を短絡（CGB はダミープラグ DP-5）。TB 接続時は TB の停止スイッチ（b 接点）。Conneko では機器の外のもので開く b 接点（safetyContact）として扱い、安全入力のループの接点に数える
    { from: 'S1', to: 'S2', switch: 'NC', safetyContact: true },
    { from: 'PE', to: 'FG' },
    // ブレーキ電源（BK+・PWR−）からエンコーダーコネクターのブレーキ開放出力（PG の 21 BK+・20 BK−）へ。ブレーキ解除中（運転中）は導通しているものとして扱う
    { from: 'BK+', to: 'PG#21', directed: true },
    { from: 'PWR-', to: 'PG#20' },
  ];
  if (isPio(io)) ls.push(...pioLinks(positionerPio40('PIO', patternOf(p), '*BALM'), polarityOf(io)));
  if (hasSto(p)) ls.push({ from: 'STO#8', to: 'STO#7', switch: 'output', ratedCurrent: 0.1 });
  return ls;
};

const safetyChannels = (p: ParamValues): SafetyChannelGroup[] => [
  stopLoop('EMG', '非常停止（EMG+ → EMG-）', 'EMG-'),
  ...(hasSto(p)
    ? [
        {
          id: 'STO',
          label: 'STO（安全要求入力 /SRI1・/SRI2）',
          kind: 'input' as const,
          mode: ['nc-nc' as const, 'ossd' as const],
          // セーフティリレーの a 接点（安全出力）で駆動することも多いため、接点の種類の指摘は注意にとどめる
          configurable: true,
          channels: [{ input: 'STO#4' }, { input: 'STO#6' }],
        },
      ]
    : []),
];

const def: DeviceDefinition = {
  type: 'iai.scon-cb',
  name: 'ポジションコントローラー（AC サーボ用）',
  model: 'SCON-CB',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の AC サーボモーター（750W 以下）用 1 軸ポジションコントローラー（RCS2/RCS3/RCS4・単軸ロボット・直交ロボット・リニアサーボ用）。' +
    '電源コネクター: L1・L2（モーター電源）、L1C・L2C（制御電源）、PE。単相 AC100〜115V ±10%（100V 仕様）または単相 AC200〜230V ±10%（200V 仕様）。ノイズフィルター・漏電ブレーカー・サーキットブレーカーを通して供給する。' +
    'システム I/O: EMG+（内蔵 24V）から非常停止スイッチの b 接点を通して EMG- へ戻す。S1・S2 はティーチングボックスの停止スイッチ。CB はモーター電源の遮断リレー内蔵、CGB（安全カテゴリー対応）は外部に駆動源遮断回路が必要。' +
    'ブレーキ付きアクチュエーターは BK+・PWR- に DC24V（最大 1A）を供給する。' +
    'I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6。付属の PIO ケーブル CB-PAC-PIO でつなぐ。1A・2A に +24V、19B・20B に 0V）、フィールドネットワーク（DeviceNet・CC-Link・CC-Link IE Field・PROFIBUS-DP・CompoNet・MECHATROLINK・EtherCAT・EtherNet/IP・PROFINET IO）。' +
    'パルス列制御は PULSE コネクター（差動、最大 2.5Mpps）。STO/SS1-t 仕様は安全機能用 I/O コネクター（/SRI1・/SRI2 の 2 チャンネル、EDM 出力。カテゴリー3 PL e / SIL3）。',
  labelPrefix: 'SCON',
  width: W0,
  height: H,
  svg,
  terminals,
  pins,
  links,
  safetyChannels,
  distinctGroups: [
    ['L1', 'L2'],
    ['L1C', 'L2C'],
  ],
  params: [
    {
      key: 'model',
      label: 'タイプ',
      options: [
        { value: 'CB', label: 'SCON-CB（標準）' },
        { value: 'CGB', label: 'SCON-CGB（安全カテゴリー対応）' },
      ],
      default: 'CB',
    },
    { key: 'io', label: 'I/O 種類', options: SCON_IO_TYPES.map((t) => ({ value: t, label: IO_TYPE_LABELS[t] })), default: 'NP' },
    {
      key: 'pattern',
      label: 'PIO パターン（パラメーター No.25）',
      options: [
        { value: 0, label: '0: 位置決めモード（64点）' },
        { value: 1, label: '1: 教示モード（64点）' },
        { value: 2, label: '2: 256点モード' },
        { value: 3, label: '3: 512点モード' },
        { value: 4, label: '4: 電磁弁モード1（7点）' },
        { value: 5, label: '5: 電磁弁モード2（3点）' },
      ],
      default: 0,
    },
    {
      key: 'voltage',
      label: '電源電圧',
      unit: 'V',
      options: [
        { value: 100, label: '単相 AC100〜115V' },
        { value: 200, label: '単相 AC200〜230V' },
      ],
      default: 200,
    },
    {
      key: 'safety',
      label: '安全タイプ',
      options: [
        { value: 'none', label: '標準' },
        { value: 'STO', label: 'STO タイプ' },
        { value: 'SS', label: 'SS1-t タイプ' },
      ],
      default: 'none',
    },
    {
      key: 'loadCurrent',
      label: 'モーター（AC200V 時の入力電流の目安）',
      unit: 'A',
      options: [
        { value: 0.5, label: '12〜30W（約 0.5A）' },
        { value: 1, label: '60W（約 1A）' },
        { value: 1.5, label: '100W（約 1.5A）' },
        { value: 2.5, label: '200W（約 2.5A）' },
        { value: 5, label: '400W（約 5A）' },
        { value: 8, label: '750W（約 8A）' },
      ],
      default: 1.5,
    },
  ],
  loadCurrent: { param: 'loadCurrent' },
};

export default def;

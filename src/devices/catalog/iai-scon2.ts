import { fieldbusBlock, IO_TYPE_LABELS, ioOf, isPio, polarityOf, type IoType } from '../iai/fieldbus';
import {
  DC24_MINUS,
  DC24_PLUS,
  groundMark,
  hif6Connector,
  hif6HeaderV,
  iaiDefs,
  led,
  miniDin,
  MM,
  mountTab,
  n2,
  plugV,
  screw,
  slideSwitch,
  smallBlackConnector,
  stopLoop,
  text,
} from '../iai/parts';
import { patternOf, pioLinks, pioPins, positionerPio40 } from '../iai/pio';
import type { AcceptSpec, DeviceDefinition, InternalLink, ParamValues, PinDef, SafetyChannelGroup, TerminalDef } from '../types';

/**
 * IAI ポジションコントローラー SCON2-CG（200V サーボ。RCS2/RCS3/RCS4・単軸ロボット・直交ロボット・リニアサーボ用、60〜750W）。
 *
 * 出典: IAI 総合カタログ CJ9005「SCON2/SU-S」（型式項目・システム構成・各部詳細・製品写真）、
 *       取扱説明書 MJ0458「SCON2」（1.3 各部の名称と機能、2.4 外形図、3.3 配線方法、第 9 章 安全回路の構成）。
 *
 * 外観: 幅 40mm × 高さ 160mm（上の取付けタブ込みで約 165mm）、奥行 143mm。白い本体に銅色の IAI ロゴ、明るいグレーの正面パネルに
 * 黒いコネクター。左の列: 状態 LED（PWR・SV・ALM・WRG・STOP・SAFE）、ジョグスイッチ、MANU/AUTO、SIO（ミニ DIN）、
 * システム I/O（2 列 × 4 段のプッシュイン）、電源（5 極）、モーター（2×2）、接地ねじ。右の列: PIO（40 極 HIF6）または
 * フィールドネットワーク、USB、安全機能用 I/O（SAFE）、マルチファンクション（MF）、エンコーダー（PG）、BK RLS、アブソバッテリー。
 *
 * 電源コネクター（MPS 7S/05）: 1 L1c・2 L2c（制御電源）、3 L1・4 L2（モーター電源）、5 PE。単相 AC100〜115V または AC200〜230V ±10%。
 * システム I/O（B2CF 3.50/08）: 1 S1・2 S2（ティーチングボックスの停止スイッチ。TB 未接続時はダミープラグ DP-5 を SIO に差す）、
 *   3 STOP+（停止専用の内蔵 24V 出力）・4 STOP-（停止入力）、5 ENB+（イネーブル用の内蔵 24V 出力）・6 ENB-（イネーブル入力）、
 *   7 BK+・8 BK-（ブレーキ電源 DC24V ±10%、最大 1A）。
 * 安全機能用 I/O（SAFE、TE 2294417-1）: 3 /SRI1-・4 /SRI1+・5 /SRI2-・6 /SRI2+（安全要求入力 2 チャンネル、SS1-t）、7 EDM-・8 EDM+。
 * PIO は PCON-CB と同じ 40 極（1A・2A が +24V、19B・20B が 0V）。OUT15 は *BALM。
 */

const SCON2_IO_TYPES: IoType[] = ['NP', 'PN', 'DV', 'CC', 'CIE', 'ML3', 'EC', 'EP', 'PRT'];

const W = 40 * MM;
const TOP = 5 * MM;
const H = n2(TOP + 160 * MM);
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(TOP + mm * MM);

const SYS_L = ['S1', 'STOP+', 'ENB+', 'BK+'];
const SYS_R = ['S2', 'STOP-', 'ENB-', 'BK-'];
const PWR_IDS = ['L1C', 'L2C', 'L1', 'L2', 'PE'];

const sysL = plugV({ x: X(3.5), y: Y(67), ids: SYS_L, pitch: 4.5 * MM, w: 5 * MM, color: 'black', wire: 'left' });
const sysR = plugV({ x: X(8.5), y: Y(67), ids: SYS_R, pitch: 4.5 * MM, w: 5 * MM, color: 'black', wire: 'right' });
const pwr = plugV({ x: X(3.5), y: Y(90), ids: PWR_IDS, pitch: 7.5 * MM, w: 9 * MM, color: 'black', wire: 'left', labels: { L1C: 'L1c', L2C: 'L2c', L1: 'L1', L2: 'L2', PE: 'PE' }, labelColor: '#333', labelSize: 2.7 });
const PIO = { x: X(22.5), y: Y(26) };
const SIO = { x: X(8), y: Y(59) };
const SAFE = { x: X(24), y: Y(64) };
const PG = { x: X(24), y: Y(112.5) };
const MOT = { x: X(3.5), y: Y(138) };
const FG = { x: X(6), y: Y(149) };
const FB_AREA = { x: X(15), y: Y(4), w: 17 * MM, h: 44 * MM };

const acAccepts = (p: ParamValues): AcceptSpec =>
  Number(p.voltage ?? 200) === 100 ? { system: 'AC', minVoltage: 90, maxVoltage: 126.5 } : { system: 'AC', minVoltage: 180, maxVoltage: 253 };

const svg = (p: ParamValues) => {
  const io = ioOf(p);
  const pio = isPio(io);
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 2.4) => text(x, y, t, size, '#3a3a3a', anchor);
  const fb = pio ? undefined : fieldbusBlock(io, FB_AREA, 'right', '#333', true);
  return `
  ${iaiDefs(['#e4e6e8', '#cfd2d5'])}
  ${mountTab(X(33), 0, 9 * MM, 7 * MM, true)}
  <rect x="0.5" y="${Y(0)}" width="${W - 1}" height="${n2(160 * MM - 1)}" rx="2" fill="#f4f5f6" stroke="#9aa0a6" stroke-width="0.8"/>
  <rect x="${X(14.5)}" y="${Y(2)}" width="${X(24)}" height="${n2(154 * MM)}" rx="1" fill="url(#iaipanel-{{uid}})" stroke="#b5b9bd" stroke-width="0.5"/>
  <rect x="${X(1.5)}" y="${Y(50.5)}" width="${X(13.5)}" height="${n2(102 * MM)}" rx="1" fill="url(#iaipanel-{{uid}})" stroke="#b5b9bd" stroke-width="0.5"/>
  ${text(X(5.5), Y(5.5), 'IAI', 5.2, '#a8754d', 'middle', 'bold', ' font-style="italic"')}
  ${[0, 1, 2].map((i) => `${led(X(4), Y(10 + i * 3.2), i === 0 ? 'g' : 'off', 2.6, 2)}${led(X(7), Y(10 + i * 3.2), 'off', 2.6, 2)}`).join('')}
  ${lbl(X(9), Y(10.6), 'PWR SV', 'start', 2)}${lbl(X(9), Y(13.8), 'ALM WRG', 'start', 2)}${lbl(X(9), Y(17), 'STOP SAFE', 'start', 2)}
  <rect x="${X(4)}" y="${Y(25)}" width="${X(4.5)}" height="${X(6)}" rx="0.6" fill="#1f9aa0" stroke="#0e5c60" stroke-width="0.4"/>
  ${lbl(X(9.5), Y(27), 'JOG+', 'start', 2)}${lbl(X(9.5), Y(31), 'JOG-', 'start', 2)}
  <rect x="${X(4)}" y="${Y(37)}" width="${X(4.5)}" height="${X(6)}" rx="0.6" fill="#d9dbdd" stroke="#666" stroke-width="0.4"/>
  ${lbl(X(9.5), Y(39), 'MANU', 'start', 2)}${lbl(X(9.5), Y(43), 'AUTO', 'start', 2)}
  <!-- SIO -->
  <rect x="${X(3)}" y="${Y(53)}" width="${X(10)}" height="${X(12)}" rx="1" fill="#141518"/>
  ${miniDin(SIO.x, SIO.y, 6.4)}
  <!-- システム I/O -->
  ${sysL.svg}${sysR.svg}
  ${lbl(X(14.4), Y(70), 'S', 'start', 2.2)}${lbl(X(14.4), Y(74.5), 'STOP', 'start', 2.2)}${lbl(X(14.4), Y(79), 'ENB', 'start', 2.2)}${lbl(X(14.4), Y(83.5), 'BK', 'start', 2.2)}
  <!-- 電源 -->
  ${pwr.svg}
  ${led(X(14), Y(88), 'off', 2, 2)}${lbl(X(12.6), Y(88.7), 'CHARGE', 'end', 1.8)}
  <!-- モーター（2×2） -->
  <rect x="${MOT.x}" y="${n2(MOT.y - 4 * MM)}" width="${X(10)}" height="${X(8)}" rx="1" fill="url(#iaiblack-{{uid}})"/>
  ${[0, 1].map((r) => [0, 1].map((c) => `<rect x="${X(5 + c * 4.5)}" y="${n2(MOT.y - 2.6 * MM + r * 3.6 * MM)}" width="4" height="2.4" fill="#e3c070"/>`).join('')).join('')}
  ${screw(FG.x, FG.y, 2.8)}${groundMark(X(10.5), FG.y, '#333')}
  <!-- 右の列 -->
  ${
    pio
      ? `${hif6HeaderV(PIO.x, PIO.y, 40)}
  <rect x="${X(30)}" y="${Y(20)}" width="${X(6.4)}" height="${X(3.2)}" rx="0.4" fill="#f4f4ef" stroke="#999" stroke-width="0.4"/>
  ${text(X(33.2), Y(22.3), polarityOf(io) === 'pnp' ? 'PNP' : 'NPN', 2.3, '#1a1a1a', 'middle', 'bold')}
  ${lbl(X(30), Y(17.5), 'PIO')}`
      : fb!.svg
  }
  <rect x="${X(22)}" y="${Y(50.5)}" width="${X(4)}" height="${X(4.5)}" rx="0.5" fill="#202124"/>${lbl(X(27), Y(53.5), 'USB')}
  <rect x="${X(20.5)}" y="${Y(59.5)}" width="${X(7)}" height="${X(9)}" rx="0.8" fill="url(#iaiblack-{{uid}})"/>
  <rect x="${X(21.8)}" y="${Y(61)}" width="${X(4.4)}" height="${X(6)}" rx="0.6" fill="#0b0b0c" stroke="#666" stroke-width="0.4"/>
  ${lbl(X(28.5), Y(64.8), 'SAFE')}
  <rect x="${X(21)}" y="${Y(73.5)}" width="${X(6)}" height="${X(20)}" rx="0.8" fill="#d8d2c2" stroke="#8a857a" stroke-width="0.4"/>
  <rect x="${X(22.4)}" y="${Y(77)}" width="${X(3.2)}" height="${X(13)}" rx="0.6" fill="#1a1b1d"/>
  ${screw(X(24), Y(75.2), 1.3)}${screw(X(24), Y(91.8), 1.3)}
  ${lbl(X(28.5), Y(84), 'MF')}
  <rect x="${X(20.5)}" y="${Y(96)}" width="${X(7)}" height="${X(33)}" rx="0.8" fill="#e7e1cf" stroke="#8a857a" stroke-width="0.4"/>
  <rect x="${X(22)}" y="${Y(101)}" width="${X(4)}" height="${X(23)}" rx="1" fill="#1a1b1d"/>
  ${screw(X(24), Y(98.3), 1.4)}${screw(X(24), Y(126.7), 1.4)}
  ${lbl(X(28.5), Y(113), 'PG')}
  ${slideSwitch(X(26), Y(137), 6, 4)}${lbl(X(26), Y(133.5), 'BK RLS', 'middle', 1.9)}
  <rect x="${X(23)}" y="${Y(146)}" width="${X(5)}" height="${X(4.5)}" rx="0.5" fill="#d9772b"/>${smallBlackConnector(X(23.8), Y(146.7), X(3.4), X(3))}
  ${text(X(12), Y(157.5), '<tspan font-size="5" font-style="italic">S</tspan>CON2', 3.4, '#a8754d', 'middle', 'bold')}
  <!-- 側面の通風スリット -->
  ${Array.from({ length: 22 }, (_, i) => `<rect x="${X(37.2)}" y="${Y(8 + i * 6.6)}" width="${X(1.6)}" height="${X(3.6)}" rx="0.4" fill="#c5c9cd"/>`).join('')}`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const io = ioOf(p);
  const ac = acAccepts(p);
  const ts: TerminalDef[] = [];
  const at = (pos: { x: number; y: number; side: 'left' | 'right' }) => ({ x: pos.x, y: pos.y, side: pos.side });
  ts.push(
    { id: 'L1C', label: 'L1c', note: '制御電源 AC 入力', ...at(pwr.pos.L1C), role: 'input', accepts: ac },
    { id: 'L2C', label: 'L2c', note: '制御電源 AC 入力', ...at(pwr.pos.L2C), role: 'input', accepts: ac },
    { id: 'L1', label: 'L1', note: 'モーター電源 AC 入力', ...at(pwr.pos.L1), role: 'input', accepts: ac },
    { id: 'L2', label: 'L2', note: 'モーター電源 AC 入力', ...at(pwr.pos.L2), role: 'input', accepts: ac },
    { id: 'PE', label: 'PE', note: '保護接地（接地用ねじと内部で接続）', ...at(pwr.pos.PE), role: 'ground' },
    { id: 'FG', label: '⏚', note: '接地用ねじ', x: FG.x, y: FG.y, side: 'left', role: 'ground', optional: true },
    { id: 'S1', label: 'S1', note: 'ティーチングボックスの停止スイッチ接続（TB 未接続時はダミープラグ DP-5 で短絡）', ...at(sysL.pos.S1), role: 'signal', optional: true },
    { id: 'S2', label: 'S2', note: 'ティーチングボックスの停止スイッチ接続', ...at(sysR.pos.S2), role: 'signal', optional: true },
    { id: 'STOP+', label: 'STOP+', note: '停止回路専用の内蔵 24V 出力（STOP- へは必ずこの電源から停止スイッチを通して戻す）', ...at(sysL.pos['STOP+']), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } },
    { id: 'STOP-', label: 'STOP-', note: '停止入力（STOP+ の 24V が来ていれば停止解除）', ...at(sysR.pos['STOP-']), role: 'signal', function: 'safety-input' },
    { id: 'ENB+', label: 'ENB+', note: 'イネーブル回路専用の内蔵 24V 出力', ...at(sysL.pos['ENB+']), role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' } },
    { id: 'ENB-', label: 'ENB-', note: 'イネーブル入力（イネーブルスイッチを使わない場合は ENB+ と短絡）', ...at(sysR.pos['ENB-']), role: 'signal', function: 'safety-input' },
    { id: 'BK+', label: 'BK+', note: 'ブレーキ電源 DC24V ±10%（最大 1A。ブレーキ付きアクチュエーターのとき）', ...at(sysL.pos['BK+']), role: 'input', accepts: DC24_PLUS, optional: true },
    { id: 'BK-', label: 'BK-', note: 'ブレーキ電源 0V', ...at(sysR.pos['BK-']), role: 'input', accepts: DC24_MINUS, optional: true },
    {
      id: 'SIO',
      label: 'SIO（ミニ DIN 8 ピン）',
      note: 'ティーチングボックス・パソコン・R-unit の接続用（未使用時はダミープラグ DP-5）',
      x: SIO.x,
      y: SIO.y,
      side: 'left',
      role: 'connector',
      connector: { kind: 'MINIDIN8', pins: 0, width: 16, length: 14, facing: 'front', protocols: ['iai-sio'] },
      optional: true,
    },
    { id: 'MOT', label: 'MOT（モーター U/V/W/PE）', note: 'アクチュエーターのモーターケーブル（F35FDC-04V-K）', x: MOT.x, y: MOT.y, side: 'left', role: 'connector', connector: { kind: 'IAI-SCON2-MOT', pins: 0, width: 16, length: 20, facing: 'front' }, optional: true },
    { id: 'PG', label: 'PG（エンコーダー）', note: 'アクチュエーターのエンコーダーケーブル（10226-6202JL、26 ピン）', x: PG.x, y: PG.y, side: 'right', role: 'connector', connector: { kind: 'IAI-SCON-PG', pins: 0, width: 40, length: 14, facing: 'front' }, optional: true },
    {
      id: 'STO',
      label: '安全機能用 I/O（SAFE）',
      note: 'TE 2294417-1（8 極）。安全機能用 I/O ケーブル CB-SC-STO030 で安全機器へつなぐ。使わない場合はダミープラグ DP-6 を差す',
      x: SAFE.x,
      y: SAFE.y,
      side: 'right',
      role: 'connector',
      connector: { kind: 'IAI-STO8', pins: 8, width: 14, length: 14, facing: 'front' },
      optional: true,
    },
  );
  if (isPio(io)) {
    ts.push({
      id: 'PIO',
      label: 'PIO（40極 HIF6）',
      note: 'PIO コネクター。付属の PIO ケーブル CB-PAC-PIO（片側バラ線）で PLC などへつなぐ',
      x: PIO.x,
      y: PIO.y,
      side: 'right',
      role: 'connector',
      connector: hif6Connector(40),
      optional: true,
    });
  } else {
    ts.push(...fieldbusBlock(io, FB_AREA, 'right', '#333', true).terminals);
  }
  return ts;
};

const pins = (p: ParamValues): PinDef[] => {
  const io = ioOf(p);
  return [
    ...(isPio(io) ? pioPins(positionerPio40('PIO', patternOf(p), '*BALM'), polarityOf(io)) : []),
    { id: 'STO#1', label: 'NC（1）', role: 'signal', optional: true, note: '配線しない' },
    { id: 'STO#2', label: 'NC（2）', role: 'signal', optional: true, note: '配線しない' },
    { id: 'STO#3', label: '/SRI1-（3）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 1 の −側（0V）' },
    { id: 'STO#4', label: '/SRI1+（4）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 1, note: '安全要求入力 1（+24V で安全機能の要求を解除、開放で安全停止）' },
    { id: 'STO#5', label: '/SRI2-（5）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 2 の −側（0V）' },
    { id: 'STO#6', label: '/SRI2+（6）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 2, note: '安全要求入力 2（+24V で安全機能の要求を解除、開放で安全停止）' },
    { id: 'STO#7', label: 'EDM-（7）', role: 'signal', optional: true, note: '外部機器モニター出力 −側' },
    { id: 'STO#8', label: 'EDM+（8）', role: 'signal', signal: { dir: 'out', kind: 'contact' }, optional: true, note: '外部機器モニター出力 +側（安全機能が正常に動作していると導通）' },
  ];
};

const links = (p: ParamValues): InternalLink[] => {
  const io = ioOf(p);
  return [
    { from: 'PE', to: 'FG' },
    { from: 'STO#8', to: 'STO#7', switch: 'output', ratedCurrent: 0.1 },
    ...(isPio(io) ? pioLinks(positionerPio40('PIO', patternOf(p), '*BALM'), polarityOf(io)) : []),
  ];
};

const safetyChannels: SafetyChannelGroup[] = [
  stopLoop('STOP', '停止（STOP+ → STOP-）', 'STOP-'),
  stopLoop('ENB', 'イネーブル（ENB+ → ENB-）', 'ENB-'),
  {
    id: 'SAFE',
    label: '安全機能（安全要求入力 /SRI1・/SRI2）',
    kind: 'input',
    mode: ['nc-nc', 'ossd'],
    // セーフティリレーの a 接点（安全出力）で駆動することも多いため、接点の種類の指摘は注意にとどめる
    configurable: true,
    channels: [{ input: 'STO#4' }, { input: 'STO#6' }],
  },
];

const def: DeviceDefinition = {
  type: 'iai.scon2',
  name: 'ポジションコントローラー（200V サーボ用）',
  model: 'SCON2-CG',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の 200V サーボ（60〜750W）用 1 軸ポジションコントローラー SCON2（安全カテゴリー対応タイプ CG。RCS2/RCS3/RCS4・単軸ロボット・直交ロボット・リニアサーボ用）。' +
    '電源コネクター: L1c・L2c（制御電源）、L1・L2（モーター電源）、PE。単相 AC100〜115V（30W のみ）または単相 AC200〜230V ±10%。ノイズフィルターを通して供給する。' +
    'システム I/O: STOP+（内蔵 24V）から停止スイッチの b 接点を通して STOP- へ、ENB+ からイネーブルスイッチを通して ENB- へ戻す（使わない場合は短絡）。S1・S2 はティーチングボックスの停止スイッチ。BK+・BK- はブレーキ電源 DC24V（最大 1A）。' +
    '安全機能用 I/O（SAFE）: /SRI1+・/SRI2+ の 2 チャンネルの安全要求入力（+24V で解除、開放で SS1-t による安全停止）、EDM 出力。安全コントローラーの OSSD やセーフティリレーの安全接点を CB-SC-STO030 でつなぐ。' +
    'I/O 種類: PIO（NPN / PNP、入力 16 点・出力 16 点、40 極 HIF6。CB-PAC-PIO で PLC とつなぐ。1A・2A に +24V、19B・20B に 0V）、フィールドネットワーク（DeviceNet・CC-Link・CC-Link IE Field・MECHATROLINK-Ⅲ・EtherCAT・EtherNet/IP・PROFINET IO）。',
  labelPrefix: 'SCON',
  width: W,
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
    { key: 'io', label: 'I/O 種類', options: SCON2_IO_TYPES.map((t) => ({ value: t, label: IO_TYPE_LABELS[t] })), default: 'NP' },
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
        { value: 100, label: '単相 AC100〜115V（30W のみ）' },
        { value: 200, label: '単相 AC200〜230V' },
      ],
      default: 200,
    },
    {
      key: 'loadCurrent',
      label: 'モーター（AC200V 時の入力電流の目安）',
      unit: 'A',
      options: [
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

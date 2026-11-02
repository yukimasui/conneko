import { n2, text, yaskawaLogo, YRC_CTRL_KIND, YRC_PP_KIND } from '../yaskawa/parts';
import { IO_PINS, yrcIo } from '../yaskawa/yrc-io';
import type { AcceptSpec, ConnectorSpec, DeviceDefinition, SupplySpec, TerminalDef } from '../types';

/**
 * 安川電機 ロボットコントローラー YRC1000micro（MOTOMAN-GP7・GP8・MotoMINI など小形ロボット用）。
 *
 * 仕様（安川電機 e-mechatronics「YRC1000micro 仕様」）: 外形 425（幅）× 280（奥行）× 125（高さ）mm（15L）、概略質量 10.5kg、
 * 電源 単相 AC200V / 230V（+10%〜−15%）または三相 AC200V / 220V、50/60Hz。19 インチラックや装置の中にも置ける。
 * 入出力: 専用信号 入力 7・出力 1、汎用信号 入力 8・出力 8（トランジスタ出力 8、100mA）。機能安全（オプション）。
 * マニピュレータとは動力・信号の 1 本のケーブル（X1）でつなぐ。プログラミングペンダント（PP）またはスマートペンダントで教示する。
 *
 * Conneko での端子:
 * - 電源入力 L・N・PE（単相 AC200〜230V）。消費電流は GP7 との組合せの電源容量 1kVA から 5A と推定
 * - マニピュレータケーブル X1（適合するロボット GP7 とだけつながる）、プログラミングペンダントのコネクタ PP
 * - 入出力 IO（Conneko では MIL 40 極とした。ピンの並びは推定。src/devices/yaskawa/yrc-io.ts）
 * - 安全信号（2 チャンネル）: 外部非常停止 EXESP1+→EXESP1-・EXESP2+→EXESP2-、安全柵 SAF_F1+→SAF_F1-・SAF_F2+→SAF_F2-
 *   （使わないときは短絡する。実機は安全信号のコネクタのピン。端子の名前と並びは YRC1000 の資料からの推定）
 * - Ethernet（LAN2）
 *
 * 見た目: 横長の箱の正面を描き、上に安全信号、左に電源入力、右に入出力と Ethernet、下にマニピュレータケーブルと PP のコネクタをまとめた
 * （配線の見やすさを優先した配置で、実機の配置とは異なる）。1mm ≒ 0.85px。
 */

const W = 380;
const H = 210;
const BODY = { x: 6, y: 28, w: 368, h: 166 };
const BOTTOM_Y = BODY.y + BODY.h;

const SAFETY = [
  { id: 'EXESP1+', x: 176 },
  { id: 'EXESP1-', x: 192 },
  { id: 'EXESP2+', x: 208 },
  { id: 'EXESP2-', x: 224 },
  { id: 'SAF_F1+', x: 246 },
  { id: 'SAF_F1-', x: 262 },
  { id: 'SAF_F2+', x: 278 },
  { id: 'SAF_F2-', x: 294 },
];
const SAFETY_Y = 18;

const POWER = [
  { id: 'L', y: 104 },
  { id: 'N', y: 120 },
  { id: 'PE', y: 136 },
];
const POWER_X = 13;

const IO_X = 354;
const IO_Y = 92;
const IO_W = 50;
const IO_L = 16;
const LAN_Y = 160;

const X_PP = 74;
const X_X1 = 196;

/** MIL 40 極のボックスヘッダ（正面から見た縦長の形） */
const milHeader = (cx: number, cy: number, name: string) => {
  const x0 = cx - IO_L / 2;
  const y0 = cy - IO_W / 2;
  const holes = Array.from({ length: 20 }, (_, i) =>
    [cx - 2.2, cx + 2.2].map((x) => `<rect x="${n2(x - 0.8)}" y="${n2(y0 + 5.4 + i * 2)}" width="1.6" height="1.1" fill="#c8a54a"/>`).join(''),
  ).join('');
  return `
  <rect x="${n2(x0 - 2)}" y="${n2(y0 - 3)}" width="${IO_L + 4}" height="${IO_W + 6}" rx="1.5" fill="#1a1c1f" stroke="#000" stroke-width="0.6"/>
  <rect x="${n2(x0)}" y="${n2(y0 + 2)}" width="${IO_L}" height="${IO_W - 4}" rx="1" fill="#2c2f33" stroke="#4b4f55" stroke-width="0.5"/>
  ${holes}
  <path d="M${n2(x0 + 1.5)} ${n2(y0 + 3.6)} l2.4 2.6 l-2.4 0 z" fill="#e8e9eb"/>
  ${text(x0 - 5, cy, name, 5, '#2a2c2f', 'middle', 'bold', ` transform="rotate(-90 ${n2(x0 - 5)} ${cy})"`)}`;
};

const screw = (x: number, y: number, r = 4.2) => `
  <circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="url(#yrc-screw-{{uid}})" stroke="#4d5156" stroke-width="0.5"/>
  <path d="M${n2(x - r * 0.6)} ${n2(y)} H${n2(x + r * 0.6)} M${n2(x)} ${n2(y - r * 0.6)} V${n2(y + r * 0.6)}" stroke="#41454a" stroke-width="0.8"/>`;

const svg = `
  <defs>
    <linearGradient id="yrc-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f4f4"/>
      <stop offset="0.1" stop-color="#e3e5e6"/>
      <stop offset="1" stop-color="#c9ccce"/>
    </linearGradient>
    <linearGradient id="yrc-panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3e44"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
    <linearGradient id="yrc-tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#5b6067"/>
      <stop offset="1" stop-color="#3a3e44"/>
    </linearGradient>
    <linearGradient id="yrc-plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b7077"/>
      <stop offset="0.5" stop-color="#a7acb2"/>
      <stop offset="1" stop-color="#5a5f65"/>
    </linearGradient>
    <radialGradient id="yrc-screw-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="0.6" stop-color="#bfc3c7"/>
      <stop offset="1" stop-color="#8b9095"/>
    </radialGradient>
  </defs>

  <!-- 脚 -->
  ${[22, 342].map((x) => `<rect x="${x}" y="${BOTTOM_Y - 2}" width="16" height="8" rx="1.5" fill="#2a2c2f"/>`).join('')}

  <!-- 本体（明るいグレーの板金。正面に黒いコネクタパネル） -->
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="5" fill="url(#yrc-body-{{uid}})" stroke="#7f8387" stroke-width="1"/>
  <rect x="${BODY.x + 4}" y="${BODY.y + 4}" width="${BODY.w - 8}" height="5" rx="2" fill="#0068b7"/>
  <rect x="34" y="62" width="300" height="114" rx="3" fill="url(#yrc-panel-{{uid}})" stroke="#15171a" stroke-width="0.7"/>

  <!-- ロゴ・型式 -->
  ${yaskawaLogo(40, 54, 12)}
  ${text(144, 54, 'YRC1000<tspan font-style="italic">micro</tspan>', 10, '#2a2c2f', 'start', 'bold')}

  <!-- 電源スイッチ・ランプ・USB -->
  <rect x="44" y="72" width="34" height="44" rx="2" fill="#c7cbcf" stroke="#6c7176" stroke-width="0.6"/>
  <rect x="53" y="80" width="16" height="26" rx="2" fill="#1d1f22"/>
  <rect x="55" y="82" width="12" height="11" rx="1.4" fill="#d22a1d"/>
  ${text(61, 113, 'POWER', 4, '#222', 'middle', 'bold')}
  <circle cx="92" cy="80" r="2.6" fill="#36d04a" stroke="#0d3a13" stroke-width="0.5"/>${text(98, 82, 'READY', 4.4, '#d6d9dc', 'start')}
  <circle cx="92" cy="92" r="2.6" fill="#5a2620" stroke="#2a0e0b" stroke-width="0.5"/>${text(98, 94, 'ALARM', 4.4, '#d6d9dc', 'start')}
  <rect x="88" y="104" width="16" height="7" rx="1" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="91" y="106" width="10" height="2.4" fill="#5b88d6"/>${text(108, 110, 'USB', 4.4, '#d6d9dc', 'start')}

  <!-- 通風口 -->
  ${Array.from({ length: 8 }, (_, i) => `<rect x="140" y="${n2(74 + i * 9)}" width="150" height="3.4" rx="1.6" fill="#16181b" opacity="0.85"/>`).join('')}

  <!-- 安全信号（外部非常停止 EXESP・安全柵 SAF_F）の端子台 -->
  <rect x="166" y="8" width="138" height="30" rx="2" fill="url(#yrc-tb-{{uid}})" stroke="#2a2d31" stroke-width="0.7"/>
  <line x1="235" y1="10" x2="235" y2="36" stroke="#2a2d31" stroke-width="0.8"/>
  ${SAFETY.map((s) => `${screw(s.x, SAFETY_Y)}${text(s.x, 30, s.id.replace('SAF_F', 'SF').replace('EXESP', 'ES'), 3.4, '#f1f2f4', 'middle', 'bold')}`).join('')}
  ${text(200, 25 + 20, '外部非常停止', 4.6, '#2a2c2f', 'middle', 'bold')}
  ${text(270, 25 + 20, '安全柵', 4.6, '#2a2c2f', 'middle', 'bold')}

  <!-- 電源入力（単相 AC200V） -->
  <rect x="${POWER_X - 7}" y="92" width="22" height="54" rx="2" fill="#f1ede2" stroke="#6e6a5e" stroke-width="0.7"/>
  ${POWER.map((p) => `${screw(POWER_X, p.y)}${text(POWER_X + 9.5, p.y + 2, p.id === 'PE' ? '⏚' : p.id, 5.2, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${text(16, 88, 'AC IN', 4.6, '#2a2c2f', 'start', 'bold')}

  <!-- 入出力（IO）と Ethernet（LAN2） -->
  ${milHeader(IO_X, IO_Y, 'I/O')}
  <rect x="${IO_X - 11}" y="${LAN_Y - 9.5}" width="22" height="19" rx="1.2" fill="#c3c7cb" stroke="#5f646a" stroke-width="0.6"/>
  <rect x="${IO_X - 7}" y="${LAN_Y - 6}" width="12" height="12" rx="0.6" fill="#16181b"/>
  <rect x="${IO_X + 5}" y="${LAN_Y - 3}" width="3" height="6" fill="#16181b"/>
  <rect x="${IO_X - 10}" y="${LAN_Y - 9}" width="3" height="2" fill="#3ccf52"/>
  ${text(IO_X - 16, LAN_Y, 'LAN2', 4.6, '#2a2c2f', 'middle', 'bold', ` transform="rotate(-90 ${IO_X - 16} ${LAN_Y})"`)}

  <!-- 下: プログラミングペンダント（PP）・マニピュレータケーブル（X1） -->
  <circle cx="${X_PP}" cy="${BOTTOM_Y - 13}" r="9" fill="url(#yrc-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <circle cx="${X_PP}" cy="${BOTTOM_Y - 13}" r="5.5" fill="#1b1d20"/>
  ${text(X_PP + 13, BOTTOM_Y - 9, 'PP', 6, '#2a2c2f', 'start', 'bold')}
  <rect x="${X_X1 - 22}" y="${BOTTOM_Y - 24}" width="44" height="21" rx="2" fill="url(#yrc-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <rect x="${X_X1 - 17}" y="${BOTTOM_Y - 20}" width="34" height="13" rx="1" fill="#1b1d20"/>
  ${text(X_X1 + 28, BOTTOM_Y - 8, 'X1', 6, '#2a2c2f', 'start', 'bold')}
  ${text(X_X1, BOTTOM_Y - 28, 'MANIPULATOR', 4, '#c9cdd1', 'middle', 'bold')}`;

/** 単相 AC200〜230V（+10%〜−15%: 170〜253V） */
const AC_IN: AcceptSpec = { system: 'AC', minVoltage: 170, maxVoltage: 253 };
/** 安全信号の入力へ戻す 24V（コントローラーの内部電源） */
const SAFETY_SRC: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

const SAFETY_SPEC: Record<string, Partial<TerminalDef>> = {
  'EXESP1+': { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 1, hint: '非常停止1+', note: '外部非常停止 チャンネル 1 の出力側（EXESP1- へ b 接点を通して戻す）' },
  'EXESP1-': { role: 'signal', function: 'safety-input', channel: 1, hint: '非常停止1', note: '外部非常停止 チャンネル 1 の入力（開くと非常停止。使わないときは EXESP1+ と短絡）' },
  'EXESP2+': { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 2, hint: '非常停止2+', note: '外部非常停止 チャンネル 2 の出力側（EXESP2- へ b 接点を通して戻す）' },
  'EXESP2-': { role: 'signal', function: 'safety-input', channel: 2, hint: '非常停止2', note: '外部非常停止 チャンネル 2 の入力（開くと非常停止。使わないときは EXESP2+ と短絡）' },
  'SAF_F1+': { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 1, hint: '安全柵1+', note: '安全柵 チャンネル 1 の出力側（SAF_F1- へ安全柵のドアスイッチの b 接点を通して戻す）' },
  'SAF_F1-': { role: 'signal', function: 'safety-input', channel: 1, hint: '安全柵1', note: '安全柵 チャンネル 1 の入力（再生モードで開くとサーボ電源を切る。使わないときは SAF_F1+ と短絡）' },
  'SAF_F2+': { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 2, hint: '安全柵2+', note: '安全柵 チャンネル 2 の出力側（SAF_F2- へ安全柵のドアスイッチの b 接点を通して戻す）' },
  'SAF_F2-': { role: 'signal', function: 'safety-input', channel: 2, hint: '安全柵2', note: '安全柵 チャンネル 2 の入力（再生モードで開くとサーボ電源を切る。使わないときは SAF_F2+ と短絡）' },
};

const ioConnector: ConnectorSpec = { kind: 'MIL40', pins: IO_PINS, width: IO_W, length: IO_L, facing: 'front' };
const io = yrcIo('IO');

const terminals: TerminalDef[] = [
  ...SAFETY.map((s): TerminalDef => ({ id: s.id, label: s.id, x: s.x, y: SAFETY_Y, side: 'top', role: 'signal', ...SAFETY_SPEC[s.id] })),
  ...POWER.map((p): TerminalDef =>
    p.id === 'PE'
      ? { id: 'PE', label: '⏚ PE（保護接地）', x: POWER_X, y: p.y, side: 'left', role: 'ground' }
      : { id: p.id, label: `${p.id}（AC200〜230V）`, note: '電源入力（単相 AC200 / 230V、50/60Hz）', x: POWER_X, y: p.y, side: 'left', role: 'input', accepts: AC_IN },
  ),
  {
    id: 'IO',
    label: 'IO（入出力、MIL 40 極）',
    hint: '入出力',
    note: '専用入力 SIN1〜SIN7・汎用入力 IN01〜IN08・汎用出力 OUT01〜OUT08・専用出力 SOUT1・+24VU・0VU。MIL 40 極のフラットケーブルで変換端子台へ（コネクタの形・ピンの並びは推定）',
    x: IO_X,
    y: IO_Y,
    side: 'right',
    role: 'connector',
    connector: ioConnector,
  },
  {
    id: 'LAN2',
    label: 'LAN2（Ethernet）',
    hint: 'Ethernet',
    note: '100BASE-TX。パソコン（MotoSim など）や PLC（EtherNet/IP などはオプション）とつなぐ',
    x: IO_X,
    y: LAN_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'ethernet-ip'] },
  },
  {
    id: 'PP',
    label: 'PP（プログラミングペンダント）',
    hint: 'ペンダント',
    note: 'プログラミングペンダントのケーブルをつなぐ。ペンダントの非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
    x: X_PP,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: YRC_PP_KIND, pins: 0, width: 12, style: 'lan' },
  },
  {
    id: 'X1',
    label: 'X1（マニピュレータケーブル）',
    hint: 'ロボット X1',
    note: 'ロボットの X1 へ、マニピュレータケーブル（動力・エンコーダー）でつなぐ。適合ロボット: MOTOMAN-GP7',
    x: X_X1,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: YRC_CTRL_KIND.micro, pins: 0, width: 18, style: 'lan', required: true },
  },
];

const def: DeviceDefinition = {
  type: 'yaskawa.yrc1000micro',
  name: 'ロボットコントローラー',
  model: 'YRC1000micro',
  maker: '安川電機',
  category: 'plc',
  labelPrefix: 'RC',
  width: W,
  height: H,
  svg,
  terminals,
  pins: io.pins,
  links: io.links,
  loadCurrent: 5,
  distinctGroups: [['L', 'N']],
  safetyChannels: [
    { id: 'EXESP', label: '外部非常停止（EXESP1+→EXESP1-、EXESP2+→EXESP2-）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'EXESP1+', input: 'EXESP1-' }, { source: 'EXESP2+', input: 'EXESP2-' }] },
    { id: 'SAF_F', label: '安全柵（SAF_F1+→SAF_F1-、SAF_F2+→SAF_F2-）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'SAF_F1+', input: 'SAF_F1-' }, { source: 'SAF_F2+', input: 'SAF_F2-' }] },
  ],
  estimated:
    '入出力のコネクタの形（MIL 40 極とした）とピンの並び、専用入出力の割付け、入力の共通の極性（プラスコモン）、安全信号の端子の名前（EXESP・SAF_F）と並び、' +
    '消費電流（GP7 との組合せの電源容量 1kVA から 5A）、端子の配置は推定',
  description:
    '安川電機のロボットコントローラー YRC1000micro（MOTOMAN-GP7 などの小形ロボット用。外形 425 × 280 × 125mm、約 10.5kg。単相 AC200 / 230V で動く）。' +
    'ロボットとは X1 のマニピュレータケーブル（動力・エンコーダー）1 本でつなぐ（適合するロボットとだけつながる）。教示はプログラミングペンダントを PP につないで行う。' +
    '入出力（PLC との受け渡し）: 専用入力 7 点（外部起動・外部ホールド・マスタ呼出・アラームリセットなど）、専用出力 1 点（運転中）、汎用入力 IN01〜IN08、汎用出力 OUT01〜OUT08（NPN トランジスタ 0.1A）。' +
    '入力は +24VU（内部電源）を共通にしたプラスコモンで、入力と 0V の間を接点か PLC の NPN 出力で閉じて ON。出力は NPN で、負荷を +24V と出力の間につなぐ。' +
    'Conneko では入出力のコネクタを MIL 40 極として、変換端子台・フラットケーブルにつなげるようにした（I/O 表に専用入出力・汎用入出力が並ぶ）。' +
    '安全信号: 外部非常停止 EXESP1±・EXESP2±、安全柵 SAF_F1±・SAF_F2± に、非常停止スイッチ・安全柵のドアスイッチの b 接点を 2 チャンネルで入れる（使わないときは短絡線でつなぐ）。' +
    'LAN2 でパソコン・PLC とつなぐ。',
};

export default def;

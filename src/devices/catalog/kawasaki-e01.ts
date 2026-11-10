import { controllerDefs, headerFront, lanPort, plugBottom, roundPlugBottom, screw } from '../generic/robot-art';
import { safetyGroups, safetyTerminalSpecs, type RobotSafetyLoop } from '../generic/robot-safety';
import { DSUB37, e01Inputs, e01Outputs, IO_PINS, KAWASAKI_CTRL_KIND, KAWASAKI_TP_KIND, kawasakiLogo, n2, text } from '../kawasaki/parts';
import type { AcceptSpec, DeviceDefinition, TerminalDef } from '../types';

/**
 * 川崎重工業 ロボットコントローラー E01（RS シリーズの小形・中形ロボット用）。
 *
 * 仕様（川崎重工業の標準仕様書 90152-0080・カタログ）: 外形 W550 × D580 × H278mm、質量 約 40kg、電源容量 最大 5.6kVA、
 * 接地は 100Ω 以下（ロボット専用）。汎用 I/O ボード（入力 32 点・出力 32 点。NPN（シンク）・PNP（ソース）を選べる）、
 * 外部非常停止・外部ホールドなどの外部信号、安全回路はカテゴリー 4・PL e まで。
 *
 * Conneko での端子:
 * - 電源入力 L1・L2・L3・PE（三相 AC200〜220V。許容範囲 ±10% は推定）。消費電流は電源容量 5.6kVA から 16A
 * - ロボット接続 X1（モーター動力・ブレーキ）・X2（エンコーダー信号）。適合するロボット（RS007N）とだけつながる
 * - ティーチペンダントのコネクター TP
 * - 汎用入力 CN2（D-sub 37 ピン。入力 1001〜1032）・汎用出力 CN4（D-sub 37 ピン。出力 1〜32）。NPN 仕様。ピンの並びは推定
 *   （src/devices/kawasaki/parts.ts）
 * - 安全信号（2 チャンネル）: 外部非常停止 EMS1+→EMS1-・EMS2+→EMS2-、安全柵 SFS1+→SFS1-・SFS2+→SFS2-（使わないときは短絡する。端子の名前は推定）
 * - Ethernet（LAN）
 *
 * 見た目: 横長の低いキャビネットの正面を描き、上に安全信号、左に電源入力、右に汎用入出力と Ethernet、下にロボット接続と TP のコネクターをまとめた
 * （配線の見やすさを優先した配置で、実機の配置とは異なる）。
 */

const W = 404;
const H = 226;
const P = 'e01';
const BODY = { x: 6, y: 30, w: 392, h: 178 };
const BOTTOM_Y = BODY.y + BODY.h;

const LOOPS: RobotSafetyLoop[] = [
  { id: 'EMS', name: '外部非常停止', hint: '非常停止', channels: [['EMS1+', 'EMS1-'], ['EMS2+', 'EMS2-']], action: '非常停止', contact: '非常停止スイッチの b 接点' },
  { id: 'SFS', name: '安全柵', hint: '安全柵', channels: [['SFS1+', 'SFS1-'], ['SFS2+', 'SFS2-']], action: '再生（自動運転）中ならモーターの電源を切る', contact: '安全柵のドアスイッチの b 接点' },
];
const SAFETY_IDS = LOOPS.flatMap((l) => l.channels.flat());
const safetyX = (i: number) => 196 + i * 18 + (i >= 4 ? 8 : 0);
const SAFETY_Y = 18;

const POWER = [
  { id: 'L1', y: 108 },
  { id: 'L2', y: 124 },
  { id: 'L3', y: 140 },
  { id: 'PE', y: 156 },
];
const POWER_X = 13;

const IO_X = 376;
const IN_Y = 82;
const OUT_Y = 144;
const IO_W = 54;
const IO_L = 16;
const LAN_Y = 186;

const X_TP = 66;
const X_X1 = 200;
const X_X2 = 250;

const svg = `
  <defs>
    <linearGradient id="${P}-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f1f1ee"/>
      <stop offset="0.08" stop-color="#e2e2dd"/>
      <stop offset="1" stop-color="#c3c4bf"/>
    </linearGradient>
    <linearGradient id="${P}-panel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3b3f45"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
    <radialGradient id="${P}-knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#5b5f65"/>
      <stop offset="1" stop-color="#16181b"/>
    </radialGradient>
    ${controllerDefs(P, ['#5b6067', '#3a3e44'])}
  </defs>

  <!-- 脚 -->
  ${[24, 362].map((x) => `<rect x="${x}" y="${BOTTOM_Y - 2}" width="18" height="10" rx="1.5" fill="#2a2c2f"/>`).join('')}

  <!-- 本体（明るいグレーのキャビネット。前面の扉と取っ手） -->
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="5" fill="url(#${P}-body-{{uid}})" stroke="#7f8387" stroke-width="1"/>
  <rect x="${BODY.x + 26}" y="${BODY.y + 8}" width="${BODY.w - 74}" height="${BODY.h - 50}" rx="3" fill="none" stroke="#9a9b96" stroke-width="0.8"/>
  <rect x="${BODY.x + BODY.w - 64}" y="${BODY.y + 60}" width="5" height="34" rx="2" fill="#8d8f8b" stroke="#5f615e" stroke-width="0.5"/>

  <!-- ロゴ・型式 -->
  ${kawasakiLogo(44, 62, 15, '#d7000f', 'start')}
  ${text(44, 76, 'ROBOT CONTROLLER  E01', 6, '#3a3c3f', 'start', 'bold', ' letter-spacing="0.4"')}

  <!-- 主電源スイッチ（回転操作ハンドル） -->
  <rect x="44" y="90" width="52" height="52" rx="3" fill="#d6d7d2" stroke="#7d7f7b" stroke-width="0.7"/>
  <circle cx="70" cy="116" r="18" fill="#f2c200" stroke="#7a6100" stroke-width="0.7"/>
  <circle cx="70" cy="116" r="13" fill="url(#${P}-knob-{{uid}})" stroke="#000" stroke-width="0.7"/>
  <rect x="57" y="112" width="26" height="8" rx="3" fill="#c8211a" stroke="#5c0a04" stroke-width="0.6" transform="rotate(-40 70 116)"/>
  ${text(48, 98, 'OFF', 4.6, '#222', 'start', 'bold')}
  ${text(92, 98, 'ON', 4.6, '#222', 'end', 'bold')}
  ${text(70, 152, 'CONTROL POWER', 4.4, '#3a3c3f', 'middle', 'bold')}

  <!-- 操作パネル（ランプ・ボタン） -->
  <rect x="110" y="90" width="82" height="52" rx="3" fill="url(#${P}-panel-{{uid}})" stroke="#15171a" stroke-width="0.7"/>
  ${[
    { x: 124, c: '#f2f2f2', l: 'CONTROL' },
    { x: 151, c: '#36d04a', l: 'MOTOR' },
    { x: 178, c: '#5a2620', l: 'ERROR' },
  ]
    .map((b) => `<circle cx="${b.x}" cy="108" r="6" fill="${b.c}" stroke="#111" stroke-width="0.6"/><circle cx="${b.x - 1.5}" cy="106.5" r="2" fill="#fff" opacity="0.4"/>${text(b.x, 124, b.l, 4, '#d6d9dc', 'middle', 'bold')}`)
    .join('')}
  <rect x="140" y="128" width="22" height="8" rx="1.5" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="144" y="130.6" width="14" height="2.8" fill="#5b88d6"/>

  <!-- 通風口 -->
  ${Array.from({ length: 9 }, (_, i) => `<rect x="206" y="${n2(52 + i * 9)}" width="110" height="3.4" rx="1.6" fill="#8f918c" opacity="0.8"/>`).join('')}

  <!-- 安全信号（外部非常停止 EMS・安全柵 SFS）の端子台 -->
  <rect x="${safetyX(0) - 11}" y="7" width="${safetyX(7) - safetyX(0) + 22}" height="22" rx="2" fill="url(#${P}-tb-{{uid}})" stroke="#2a2d31" stroke-width="0.7"/>
  <line x1="${safetyX(4) - 13}" y1="9" x2="${safetyX(4) - 13}" y2="27" stroke="#2a2d31" stroke-width="0.8"/>
  ${SAFETY_IDS.map((id, i) => `${screw(P, safetyX(i), SAFETY_Y, 4.2)}${text(safetyX(i), 27.5, id, 3.4, '#f1f2f4', 'middle', 'bold')}`).join('')}
  ${LOOPS.map((l, k) => text((safetyX(k * 4) + safetyX(k * 4 + 3)) / 2, BODY.y + 10, l.name, 4.8, '#2a2c2f', 'middle', 'bold')).join('')}

  <!-- 電源入力（三相 AC200V） -->
  <rect x="${POWER_X - 7}" y="98" width="22" height="68" rx="2" fill="#f1ede2" stroke="#6e6a5e" stroke-width="0.7"/>
  ${POWER.map((p) => `${screw(P, POWER_X, p.y, 4.2)}${text(POWER_X + 9.5, p.y + 2, p.id === 'PE' ? '⏚' : p.id.slice(1), 5, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${text(10, 94, 'AC IN', 4.6, '#2a2c2f', 'start', 'bold')}

  <!-- 汎用入出力（D-sub 37 ピン）と Ethernet -->
  <rect x="352" y="${BODY.y + 18}" width="40" height="${BODY.h - 26}" rx="2" fill="url(#${P}-panel-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${headerFront(IO_X, IN_Y, IO_W, IO_L, 19, 'CN2 IN', '#e9ebed', '#8d9298', true)}
  ${headerFront(IO_X, OUT_Y, IO_W, IO_L, 19, 'CN4 OUT', '#e9ebed', '#8d9298', true)}
  ${lanPort(IO_X, LAN_Y, 'LAN')}

  <!-- 下: ティーチペンダント（TP）・ロボット接続（X1・X2） -->
  ${roundPlugBottom(P, X_TP, BOTTOM_Y, 'TP', '#2a2c2f')}
  ${plugBottom(P, X_X1, BOTTOM_Y, 32, 'X1', '#2a2c2f')}
  ${plugBottom(P, X_X2, BOTTOM_Y, 26, 'X2', '#2a2c2f')}`;

/** 三相 AC200〜220V（±10%: 180〜242V は推定） */
const AC_IN: AcceptSpec = { system: 'AC', minVoltage: 180, maxVoltage: 242 };
const SAFETY_SPEC = safetyTerminalSpecs(LOOPS);
const ctrl = KAWASAKI_CTRL_KIND.e01;
const ins = e01Inputs('CN2');
const outs = e01Outputs('CN4');

const terminals: TerminalDef[] = [
  ...SAFETY_IDS.map((id, i): TerminalDef => ({ id, label: id, x: safetyX(i), y: SAFETY_Y, side: 'top', role: 'signal', ...SAFETY_SPEC[id] })),
  ...POWER.map((p): TerminalDef =>
    p.id === 'PE'
      ? { id: 'PE', label: '⏚ PE（保護接地）', note: 'ロボット専用の接地（100Ω 以下）', x: POWER_X, y: p.y, side: 'left', role: 'ground' }
      : { id: p.id, label: `${p.id}（三相 AC200〜220V）`, note: '電源入力（三相 AC200〜220V、50/60Hz）', x: POWER_X, y: p.y, side: 'left', role: 'input', accepts: AC_IN },
  ),
  {
    id: 'CN2',
    label: 'CN2（汎用入力、D-sub 37 ピン）',
    hint: '汎用入力',
    note: '汎用入力 1001〜1032・+24V・0V。D-sub 37 ピンの I/O ケーブル（片側バラ線）で端子台・PLC へ（ピンの並びは推定）',
    x: IO_X,
    y: IN_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: DSUB37, pins: IO_PINS, width: IO_W, length: IO_L, facing: 'front' },
  },
  {
    id: 'CN4',
    label: 'CN4（汎用出力、D-sub 37 ピン）',
    hint: '汎用出力',
    note: '汎用出力 1〜32・+24V・0V。D-sub 37 ピンの I/O ケーブル（片側バラ線）で端子台・負荷へ（ピンの並びは推定）',
    x: IO_X,
    y: OUT_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: DSUB37, pins: IO_PINS, width: IO_W, length: IO_L, facing: 'front' },
  },
  {
    id: 'LAN',
    label: 'LAN（Ethernet）',
    hint: 'Ethernet',
    note: '100BASE-TX。パソコン（K-ROSET など）や PLC（EtherNet/IP などはオプション）とつなぐ',
    x: IO_X,
    y: LAN_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'ethernet-ip'] },
  },
  {
    id: 'TP',
    label: 'TP（ティーチペンダント）',
    hint: 'ペンダント',
    note: 'ティーチペンダントのケーブルをつなぐ。ペンダントの非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
    x: X_TP,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: KAWASAKI_TP_KIND, pins: 0, width: 12, style: 'lan' },
  },
  {
    id: 'X1',
    label: 'X1（ロボット接続 モーター動力・ブレーキ）',
    hint: '動力 X1',
    note: 'ロボットの X1 へ、モーターハーネスでつなぐ。適合ロボット: RS007N',
    x: X_X1,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: ctrl.x1, pins: 0, width: 18, style: 'lan', required: true },
  },
  {
    id: 'X2',
    label: 'X2（ロボット接続 エンコーダー信号）',
    hint: '信号 X2',
    note: 'ロボットの X2 へ、信号ハーネスでつなぐ',
    x: X_X2,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: ctrl.x2, pins: 0, width: 14, style: 'lan', required: true },
  },
];

const def: DeviceDefinition = {
  type: 'kawasaki.e01',
  name: 'ロボットコントローラー',
  model: 'E01',
  maker: '川崎重工業',
  category: 'plc',
  labelPrefix: 'RC',
  width: W,
  height: H,
  svg,
  terminals,
  pins: [...ins.pins, ...outs.pins],
  links: [...ins.links, ...outs.links],
  loadCurrent: 16,
  distinctGroups: [['L1', 'L2', 'L3']],
  safetyChannels: safetyGroups(LOOPS),
  estimated:
    '汎用入出力のコネクターの名前（CN2・CN4）とピンの並び、内部電源（+24V・0V）をコネクターに出したこと、出力 1 点の定格 0.1A、' +
    '安全信号の端子の名前（EMS・SFS）と並び、ロボット接続コネクターの名前（X1・X2）、電源電圧の許容範囲、消費電流（電源容量 5.6kVA から 16A）、端子の配置は推定',
  description:
    '川崎重工業のロボットコントローラー E01（RS シリーズの小形・中形ロボット用。外形 W550 × D580 × H278mm、約 40kg。三相 AC200V 級、電源容量 最大 5.6kVA）。' +
    'ロボットとは X1（モーター動力・ブレーキ）・X2（エンコーダー信号）の 2 本のハーネスでつなぐ（適合するロボットとだけつながる）。教示はティーチペンダントを TP につないで行う。' +
    '汎用入出力（PLC との受け渡し）: 入力 32 点（信号番号 1001〜1032）・出力 32 点（信号番号 1〜32）。外部モーター電源 ON・外部サイクルスタート・外部ホールドなどの専用信号は、設定で汎用入出力に割り当てる。' +
    'NPN 仕様で、入力は +24V を共通にしたプラスコモン（入力と 0V の間を接点・PLC の NPN 出力で閉じて ON）、出力は NPN（負荷を +24V と出力の間につなぐ）。PNP 仕様も選べる。' +
    'Conneko では汎用入力を CN2、汎用出力を CN4 の D-sub 37 ピンとし、I/O ケーブル（片側バラ線）で配線する。' +
    '安全信号（カテゴリー 4・PL e まで）: 外部非常停止 EMS1±・EMS2±、安全柵 SFS1±・SFS2± に、非常停止スイッチ・安全柵のドアスイッチの b 接点を 2 チャンネルで入れる（使わないときは短絡線でつなぐ）。' +
    '接地はロボット専用で 100Ω 以下にする。LAN でパソコン・PLC とつなぐ。',
};

export default def;

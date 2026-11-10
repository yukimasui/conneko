import { DENSO_CTRL_KIND, DENSO_TP_KIND, densoLogo, ENC_PINS, n2, text } from '../denso/parts';
import { controllerEncoder, MINI_IO_PINS, miniIo } from '../denso/rc8a-io';
import { controllerDefs, headerFront, lanPort, plugBottom, roundPlugBottom, screw } from '../generic/robot-art';
import { safetyGroups, safetyTerminalSpecs, type RobotSafetyLoop } from '../generic/robot-safety';
import type { AcceptSpec, DeviceDefinition, TerminalDef } from '../types';

/**
 * デンソーウェーブ ロボットコントローラー RC8A（VS・VP・HS・HSR などの小形ロボット用）。
 *
 * 仕様（デンソーウェーブの製品ページ・カタログの引用）: 外形 356.5 × 319.6 × 93.8mm、質量 約 10kg（セーフティモーション仕様は約 11kg）、IP20。
 * 電源 三相 AC200V（−15%）〜AC240V（+10%）、電源容量 1.8kVA（100V 仕様は単相 AC100〜110V、1kVA）。
 * 入出力: ミニ I/O 入力 ユーザー開放 8 点 + システム固定 14 点、出力 ユーザー開放 8 点 + システム固定 18 点（RC8 のデータシートでは 16 点）、
 * ハンド I/O 入力 8 点・出力 8 点。安全 I/O は標準でカテゴリー 4・PL e（非常停止・防護停止・自動運転許可の 2 チャンネル）。
 * Ethernet（100BASE-TX）・RS-232C・USB が標準。安全 I/O は実機ではミニ I/O のケーブルを通る。
 *
 * Conneko での端子:
 * - 電源入力 L1・L2・L3・PE（三相 AC200〜240V）。消費電流は電源容量 1.8kVA から 5.2A
 * - ロボット接続 MOTOR（モーター動力・ブレーキ）・ENCODER（エンコーダー・ハンド I/O）。適合するロボット（VS-060）とだけつながる
 * - ティーチングペンダントのコネクター TP
 * - ミニ I/O（Conneko では MIL 50 極とした。ピンの並びは推定。src/devices/denso/rc8a-io.ts）
 * - 安全 I/O（2 チャンネル）: 外部非常停止 ES1+→ES1-・ES2+→ES2-、防護停止 PS1+→PS1-・PS2+→PS2-、自動運転許可 EA1+→EA1-・EA2+→EA2-
 *   （実機ではミニ I/O のケーブルの芯線。端子の名前は推定。配線しやすいようにねじ端子として描いた）
 * - Ethernet（LAN）
 *
 * 見た目: 薄い箱の正面を描き、上に安全 I/O、左に電源入力、右にミニ I/O と Ethernet、下にロボット接続と TP のコネクターをまとめた
 * （配線の見やすさを優先した配置で、実機の配置とは異なる）。
 */

const W = 392;
const H = 196;
const P = 'rc8';
const BODY = { x: 6, y: 34, w: 380, h: 146 };
const BOTTOM_Y = BODY.y + BODY.h;

const LOOPS: RobotSafetyLoop[] = [
  { id: 'ES', name: '外部非常停止', hint: '非常停止', channels: [['ES1+', 'ES1-'], ['ES2+', 'ES2-']], action: '非常停止', contact: '非常停止スイッチの b 接点' },
  { id: 'PS', name: '防護停止', hint: '防護停止', channels: [['PS1+', 'PS1-'], ['PS2+', 'PS2-']], action: 'ロボットを止める（防護停止）', contact: '安全柵のドアスイッチ・ライトカーテンの安全出力の b 接点' },
  { id: 'EA', name: '自動運転許可', hint: '自動許可', channels: [['EA1+', 'EA1-'], ['EA2+', 'EA2-']], action: '自動運転ができない', contact: '安全柵のドアスイッチの b 接点' },
];
const SAFETY_IDS = LOOPS.flatMap((l) => l.channels.flat());
const SAFETY_X0 = 138;
const SAFETY_PITCH = 17;
const safetyX = (i: number) => SAFETY_X0 + i * SAFETY_PITCH + Math.floor(i / 4) * 6;
const SAFETY_Y = 18;

const POWER = [
  { id: 'L1', y: 96 },
  { id: 'L2', y: 112 },
  { id: 'L3', y: 128 },
  { id: 'PE', y: 144 },
];
const POWER_X = 13;

const IO_X = 364;
const IO_Y = 92;
const IO_W = 60;
const IO_L = 18;
const LAN_Y = 156;

const X_TP = 66;
const X_MOTOR = 196;
const X_ENC = 244;

const svg = `
  <defs>
    <linearGradient id="${P}-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4b4f55"/>
      <stop offset="0.06" stop-color="#383c42"/>
      <stop offset="1" stop-color="#202327"/>
    </linearGradient>
    <linearGradient id="${P}-top-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#e9ebec"/>
      <stop offset="1" stop-color="#c3c7ca"/>
    </linearGradient>
    ${controllerDefs(P)}
  </defs>

  <!-- 脚 -->
  ${[22, 354].map((x) => `<rect x="${x}" y="${BOTTOM_Y - 2}" width="16" height="8" rx="1.5" fill="#15171a"/>`).join('')}

  <!-- 本体（薄い箱。上面の明るい板金と、黒い正面） -->
  <path d="M${BODY.x + 10} ${BODY.y - 8} H${BODY.x + BODY.w - 10} L${BODY.x + BODY.w} ${BODY.y} H${BODY.x} Z" fill="url(#${P}-top-{{uid}})" stroke="#7f8387" stroke-width="0.8"/>
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="4" fill="url(#${P}-body-{{uid}})" stroke="#0f1012" stroke-width="1"/>
  <rect x="${BODY.x + 6}" y="${BODY.y + 6}" width="${BODY.w - 56}" height="${BODY.h - 46}" rx="2.5" fill="none" stroke="#5a5f66" stroke-width="0.6"/>

  <!-- ロゴ・型式（白い銘板に赤い DENSO） -->
  <rect x="30" y="46" width="62" height="16" rx="1.5" fill="#f4f5f6" stroke="#9a9fa4" stroke-width="0.5"/>
  ${densoLogo(61, 58.5, 11)}
  ${text(100, 59, 'RC8A', 11, '#f1f2f4', 'start', 'bold', ' letter-spacing="0.6"')}
  ${text(30, 72, 'ROBOT CONTROLLER', 5, '#b9bdc2', 'start')}

  <!-- 電源スイッチ・LED・USB -->
  <rect x="34" y="82" width="26" height="36" rx="2" fill="#c7cbcf" stroke="#6c7176" stroke-width="0.6"/>
  <rect x="40" y="87" width="14" height="22" rx="2" fill="#1d1f22"/>
  <rect x="42" y="89" width="10" height="9" rx="1.2" fill="#c8211a"/>
  ${text(47, 116, 'POWER', 3.8, '#222', 'middle', 'bold')}
  <circle cx="74" cy="88" r="2.4" fill="#36d04a" stroke="#0d3a13" stroke-width="0.5"/>${text(80, 90, 'POWER', 4.4, '#d6d9dc', 'start')}
  <circle cx="74" cy="99" r="2.4" fill="#5a2620" stroke="#2a0e0b" stroke-width="0.5"/>${text(80, 101, 'ERROR', 4.4, '#d6d9dc', 'start')}
  <rect x="70" y="108" width="16" height="7" rx="1" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="73" y="110" width="10" height="2.4" fill="#5b88d6"/>${text(90, 114, 'USB', 4.4, '#d6d9dc', 'start')}

  <!-- 通風口 -->
  ${Array.from({ length: 7 }, (_, i) => `<rect x="150" y="${n2(68 + i * 9)}" width="160" height="3.4" rx="1.6" fill="#121417" opacity="0.9"/>`).join('')}

  <!-- 安全 I/O（外部非常停止 ES・防護停止 PS・自動運転許可 EA）の端子台 -->
  <rect x="${SAFETY_X0 - 10}" y="7" width="${safetyX(11) - SAFETY_X0 + 20}" height="22" rx="2" fill="url(#${P}-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  ${[4, 8].map((i) => `<line x1="${safetyX(i) - 11.5}" y1="9" x2="${safetyX(i) - 11.5}" y2="27" stroke="#6e6a5e" stroke-width="0.8"/>`).join('')}
  ${SAFETY_IDS.map((id, i) => `${screw(P, safetyX(i), SAFETY_Y, 4.2)}${text(safetyX(i), 27.5, id, 3.4, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${LOOPS.map((l, k) => text((safetyX(k * 4) + safetyX(k * 4 + 3)) / 2, BODY.y + 10, l.name, 4.8, '#e9ebed', 'middle', 'bold')).join('')}

  <!-- 電源入力（三相 AC200V） -->
  <rect x="${POWER_X - 7}" y="86" width="22" height="68" rx="2" fill="url(#${P}-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  ${POWER.map((p) => `${screw(P, POWER_X, p.y, 4.2)}${text(POWER_X + 9.5, p.y + 2, p.id === 'PE' ? '⏚' : p.id.slice(1), 5, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${text(10, 82, 'AC IN', 4.6, '#e9ebed', 'start', 'bold')}

  <!-- ミニ I/O と Ethernet -->
  <rect x="340" y="${BODY.y + 6}" width="40" height="${BODY.h - 12}" rx="2" fill="#2a2d32" stroke="#555a61" stroke-width="0.6"/>
  ${headerFront(IO_X, IO_Y, IO_W, IO_L, 25, 'MINI I/O')}
  ${lanPort(IO_X, LAN_Y, 'LAN')}

  <!-- 下: ティーチングペンダント（TP）・ロボット接続（MOTOR・ENCODER） -->
  ${roundPlugBottom(P, X_TP, BOTTOM_Y, 'TP')}
  ${plugBottom(P, X_MOTOR, BOTTOM_Y, 30, 'MOTOR')}
  ${plugBottom(P, X_ENC, BOTTOM_Y, 26, 'ENCODER')}`;

/** 三相 AC200〜240V（−15%〜+10%: 170〜264V） */
const AC_IN: AcceptSpec = { system: 'AC', minVoltage: 170, maxVoltage: 264 };
const SAFETY_SPEC = safetyTerminalSpecs(LOOPS);
const ctrl = DENSO_CTRL_KIND.rc8a;
const io = miniIo('MINIIO');
const enc = controllerEncoder('ENCODER');

const terminals: TerminalDef[] = [
  ...SAFETY_IDS.map((id, i): TerminalDef => ({ id, label: id, x: safetyX(i), y: SAFETY_Y, side: 'top', role: 'signal', ...SAFETY_SPEC[id] })),
  ...POWER.map((p): TerminalDef =>
    p.id === 'PE'
      ? { id: 'PE', label: '⏚ PE（保護接地）', x: POWER_X, y: p.y, side: 'left', role: 'ground' }
      : { id: p.id, label: `${p.id}（三相 AC200〜240V）`, note: '電源入力（三相 AC200〜240V、50/60Hz）', x: POWER_X, y: p.y, side: 'left', role: 'input', accepts: AC_IN },
  ),
  {
    id: 'MINIIO',
    label: 'MINI I/O（ミニ I/O、MIL 50 極）',
    hint: 'ミニ I/O',
    note: 'ユーザー入力 IN0〜IN7・システム入力 14 点・ユーザー出力 OUT0〜OUT7・システム出力 16 点・+24V・0V。MIL 50 極のフラットケーブルで変換端子台へ（コネクターの形・ピンの並びは推定）',
    x: IO_X,
    y: IO_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'MIL50', pins: MINI_IO_PINS, width: IO_W, length: IO_L, facing: 'front' },
  },
  {
    id: 'LAN',
    label: 'LAN（Ethernet）',
    hint: 'Ethernet',
    note: '100BASE-TX。パソコン（WINCAPS III など）や PLC とつなぐ',
    x: IO_X,
    y: LAN_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'ethernet-ip'] },
  },
  {
    id: 'TP',
    label: 'TP（ティーチングペンダント）',
    hint: 'ペンダント',
    note: 'ティーチングペンダントのケーブルをつなぐ。ペンダントの非常停止ボタン・イネーブルスイッチの信号もこのケーブルを通る',
    x: X_TP,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: DENSO_TP_KIND, pins: 0, width: 12, style: 'lan' },
  },
  {
    id: 'MOTOR',
    label: 'MOTOR（ロボット接続 モーター動力・ブレーキ）',
    hint: '動力 MOTOR',
    note: 'ロボットの MOTOR へ、ロボット接続ケーブル（モーター）でつなぐ。適合ロボット: VS-060',
    x: X_MOTOR,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: ctrl.motor, pins: 0, width: 16, style: 'lan', required: true },
  },
  {
    id: 'ENCODER',
    label: 'ENCODER（ロボット接続 エンコーダー・ハンド I/O）',
    hint: '信号 ENC',
    note: 'ロボットの ENCODER へ、ロボット接続ケーブル（エンコーダー）でつなぐ。ハンド I/O（HI0〜HI7・HO0〜HO7）とその電源もここを通る（推定）',
    x: X_ENC,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: ctrl.encoder, pins: ENC_PINS, width: 14, style: 'lan', required: true },
  },
];

const def: DeviceDefinition = {
  type: 'denso.rc8a',
  name: 'ロボットコントローラー',
  model: 'RC8A',
  maker: 'デンソーウェーブ',
  category: 'plc',
  labelPrefix: 'RC',
  width: W,
  height: H,
  svg,
  terminals,
  pins: [...io.pins, ...enc.pins],
  links: [...io.links, ...enc.links],
  loadCurrent: 5.2,
  distinctGroups: [['L1', 'L2', 'L3']],
  safetyChannels: safetyGroups(LOOPS),
  estimated:
    'ミニ I/O のコネクターの形（MIL 50 極とした）とピンの並び、システム入出力の割付け（ステップストップ・一時停止・ストローブ・割込みスキップのほか）、' +
    'システム出力の点数（16 点とした）、出力 1 点の定格 0.1A、ハンド I/O がロボット接続ケーブル（エンコーダー）を通ることとそのピン番号、' +
    '安全 I/O の端子の名前（ES・PS・EA）と、ねじ端子として描いたこと、端子の配置は推定',
  description:
    'デンソーウェーブのロボットコントローラー RC8A（VS・VP・HS・HSR などの小形ロボット用。外形 356.5 × 319.6 × 93.8mm、約 10kg。三相 AC200〜240V、電源容量 1.8kVA）。' +
    'ロボットとは MOTOR（モーター動力・ブレーキ）・ENCODER（エンコーダー）の 2 本のロボット接続ケーブルでつなぐ（適合するロボットとだけつながる）。教示はティーチングペンダントを TP につないで行う。' +
    'ミニ I/O（PLC との受け渡し）: ユーザー入力 IN0〜IN7・システム入力（ステップストップ・一時停止・ストローブ・割込みスキップ・コマンドなど）・ユーザー出力 OUT0〜OUT7・システム出力（運転中・ロボット異常・サーボオンなど）。' +
    'NPN 仕様で、入力は内部の +24V を共通にしたプラスコモン（入力と 0V の間を接点・PLC の NPN 出力で閉じて ON）、出力は NPN（負荷を +24V と出力の間につなぐ）。' +
    'Conneko ではミニ I/O を MIL 50 極として、変換端子台・フラットケーブルにつなげるようにした。ハンド I/O（HI0〜HI7・HO0〜HO7）はロボットの手先のハンド I/O コネクターに出る。' +
    '安全 I/O（カテゴリー 4・PL e）: 外部非常停止 ES1±・ES2±、防護停止 PS1±・PS2±、自動運転許可 EA1±・EA2± に、非常停止スイッチ・安全柵のドアスイッチの b 接点を 2 チャンネルで入れる' +
    '（使わないときは短絡線でつなぐ。実機ではミニ I/O のケーブルの芯線）。LAN でパソコン・PLC とつなぐ。',
};

export default def;

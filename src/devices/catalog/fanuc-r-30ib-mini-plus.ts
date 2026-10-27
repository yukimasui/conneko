import { CTRL_KIND, fanucLogo, IPENDANT_KIND, n2, rm1Connector, rp1Connector, screw, screwDefs, text } from '../fanuc/parts';
import { controllerRp1, CRMA15_ROWS, CRMA16_ROWS, crmaIo } from '../fanuc/peripheral-io';
import type { AcceptSpec, ConnectorSpec, DeviceDefinition, InternalLink, SupplySpec, TerminalDef } from '../types';

/**
 * ファナック ロボットコントローラー R-30iB Mini Plus（LR Mate・CRX 用の小形キャビネット）。
 *
 * 仕様（ファナックの製品ページ・取扱説明書）: 単相 AC200〜240V 入力、外形 410 × 277 × 370mm、質量 19kg。
 * 入力部にサージアブソーバ・ノイズフィルタ・電磁接触器、正面にブレーカーを持つ。メインボードに USB・Ethernet（CD38A）・
 * 周辺機器 I/O（CRMA15・CRMA16）・非常停止の接続がある。ティーチングペンダントは iPendant。
 *
 * Conneko での端子:
 * - 電源入力 L・N・PE（単相 AC200〜230V。許容範囲 −15%/+10% は推定）。消費電流は電源容量 1.2kVA（LR Mate 200iD との組合せ、
 *   販売店の掲載値）から 6A と推定
 * - ロボット接続 RM1（モーター動力・ブレーキ）・RP1（パルスコーダ・ロボット I/O）。適合するロボット（LR Mate 200iD）とだけつながる
 * - ティーチングペンダント（iPendant）のコネクター TP
 * - 周辺機器 I/O: CRMA15（DI101〜DI120・DO101〜DO110）、CRMA16（UOP 入力 8 点・UOP 出力 4 点・DO111〜DO120）。
 *   50 極（MIL 規格のフラットケーブル・変換端子台とつながる）。ピンの並びの一部は推定（src/devices/fanuc/peripheral-io.ts）
 * - 安全信号（2 チャンネル）: 外部非常停止 EES1-EES11・EES2-EES21、安全柵 EAS1-EAS11・EAS2-EAS21（使わないときは短絡する）、
 *   非常停止ボタンの接点出力 ESPB1-ESPB11・ESPB2-ESPB21（ティーチングペンダントの非常停止ボタンで開く b 接点。推定）
 * - Ethernet CD38A（100BASE-TX。EtherNet/IP はソフトウェアオプション）
 *
 * 見た目: 濃いグレーの箱の正面を描き、上に安全信号の端子台、右に周辺機器 I/O と Ethernet、下にロボット接続と TP のコネクター、
 * 左に電源入力をまとめた（配線の見やすさを優先した配置で、実機の配置とは異なる）。1mm ≒ 0.85px。
 */

const W = 360;
const H = 250;

const BODY = { x: 6, y: 14, w: 348, h: 226 };

/** 上の安全信号の端子台（端子 ID・印字・チャンネル） */
const SAFETY = [
  { id: 'EES1', x: 160 },
  { id: 'EES11', x: 175 },
  { id: 'EES2', x: 190 },
  { id: 'EES21', x: 205 },
  { id: 'EAS1', x: 223 },
  { id: 'EAS11', x: 238 },
  { id: 'EAS2', x: 253 },
  { id: 'EAS21', x: 268 },
  { id: 'ESPB1', x: 286 },
  { id: 'ESPB11', x: 301 },
  { id: 'ESPB2', x: 316 },
  { id: 'ESPB21', x: 331 },
];
const SAFETY_Y = 18;

/** 左の電源入力の端子 */
const POWER = [
  { id: 'L', y: 152 },
  { id: 'N', y: 168 },
  { id: 'PE', y: 184 },
];
const POWER_X = 13;

/** 右の周辺機器 I/O（MIL 50 極）と Ethernet */
const IO_X = 334;
const CRMA15_Y = 86;
const CRMA16_Y = 156;
const LAN_Y = 213;
const CRMA_W = 60;
const CRMA_L = 18;

/** 下のコネクター */
const BOTTOM_Y = BODY.y + BODY.h;
const X_TP = 62;
const X_RM1 = 168;
const X_RP1 = 214;

/** MIL 50 極のボックスヘッダ（正面から見た縦長の形） */
const milHeader = (cx: number, cy: number, name: string) => {
  const x0 = cx - CRMA_L / 2;
  const y0 = cy - CRMA_W / 2;
  const holes = Array.from({ length: 25 }, (_, i) =>
    [cx - 2.4, cx + 2.4].map((x) => `<rect x="${n2(x - 0.8)}" y="${n2(y0 + 6.4 + i * 1.95)}" width="1.6" height="1.1" fill="#c8a54a"/>`).join(''),
  ).join('');
  return `
  <rect x="${n2(x0 - 2)}" y="${n2(y0 - 3)}" width="${CRMA_L + 4}" height="${CRMA_W + 6}" rx="1.5" fill="#1a1c1f" stroke="#000" stroke-width="0.6"/>
  <rect x="${n2(x0)}" y="${n2(y0 + 2)}" width="${CRMA_L}" height="${CRMA_W - 4}" rx="1" fill="#2c2f33" stroke="#4b4f55" stroke-width="0.5"/>
  ${holes}
  <path d="M${n2(x0 + 1.5)} ${n2(y0 + 4)} l2.4 2.6 l-2.4 0 z" fill="#e8e9eb"/>
  ${text(x0 - 5, cy, name, 5.2, '#e9ebed', 'middle', 'bold', ` transform="rotate(-90 ${n2(x0 - 5)} ${cy})"`)}`;
};

const svg = `
  <defs>
    <linearGradient id="r30-body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4f56"/>
      <stop offset="0.08" stop-color="#3a3e44"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
    <linearGradient id="r30-front-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#30343a"/>
      <stop offset="0.5" stop-color="#383c42"/>
      <stop offset="1" stop-color="#2d3136"/>
    </linearGradient>
    <linearGradient id="r30-tb-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f1ede2"/>
      <stop offset="1" stop-color="#cfc9b8"/>
    </linearGradient>
    <linearGradient id="r30-plug-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6b7077"/>
      <stop offset="0.5" stop-color="#a7acb2"/>
      <stop offset="1" stop-color="#5a5f65"/>
    </linearGradient>
    <radialGradient id="r30-knob-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#5b5f65"/>
      <stop offset="1" stop-color="#16181b"/>
    </radialGradient>
    ${screwDefs}
  </defs>

  <!-- 脚 -->
  ${[24, 320].map((x) => `<rect x="${x}" y="${BOTTOM_Y - 2}" width="16" height="9" rx="1.5" fill="#15171a"/>`).join('')}

  <!-- 本体（濃いグレーの板金） -->
  <rect x="${BODY.x}" y="${BODY.y}" width="${BODY.w}" height="${BODY.h}" rx="6" fill="url(#r30-body-{{uid}})" stroke="#0f1012" stroke-width="1"/>
  <rect x="${BODY.x + 6}" y="${BODY.y + 28}" width="${BODY.w - 52}" height="${BODY.h - 62}" rx="3" fill="url(#r30-front-{{uid}})" stroke="#555a61" stroke-width="0.6"/>

  <!-- ロゴ・型式 -->
  ${fanucLogo(20, 50, 58, 13)}
  ${text(20, 80, 'R-30<tspan font-style="italic">i</tspan>B Mini Plus', 9, '#f1f2f4', 'start', 'bold')}
  ${text(20, 90, 'ROBOT CONTROLLER', 5.2, '#b9bdc2', 'start')}

  <!-- ブレーカー（回転操作ハンドル） -->
  <rect x="34" y="102" width="50" height="50" rx="3" fill="#c7cbcf" stroke="#6c7176" stroke-width="0.7"/>
  <circle cx="59" cy="127" r="17" fill="url(#r30-knob-{{uid}})" stroke="#000" stroke-width="0.8"/>
  <rect x="45" y="123" width="28" height="8" rx="3" fill="#25282c" stroke="#5c6066" stroke-width="0.6" transform="rotate(-35 59 127)"/>
  ${text(38, 110, 'OFF', 5, '#222', 'start', 'bold')}
  ${text(80, 110, 'ON', 5, '#222', 'end', 'bold')}
  ${text(59, 162, 'BREAKER', 5, '#c9cdd1', 'middle', 'bold')}

  <!-- LED・USB -->
  <circle cx="100" cy="112" r="2.6" fill="#36d04a" stroke="#0d3a13" stroke-width="0.5"/>
  ${text(106, 114, 'POWER', 4.8, '#d6d9dc', 'start')}
  <circle cx="100" cy="124" r="2.6" fill="#5a2620" stroke="#2a0e0b" stroke-width="0.5"/>
  ${text(106, 126, 'ALARM', 4.8, '#d6d9dc', 'start')}
  <rect x="96" y="138" width="16" height="7" rx="1" fill="#15171a" stroke="#7d8287" stroke-width="0.5"/>
  <rect x="99" y="140" width="10" height="2.4" fill="#5b88d6"/>
  ${text(116, 144, 'USB', 4.8, '#d6d9dc', 'start')}

  <!-- 通風口 -->
  ${Array.from({ length: 14 }, (_, i) => `<rect x="150" y="${n2(70 + i * 9.5)}" width="140" height="3.4" rx="1.6" fill="#16181b" opacity="0.85"/>`).join('')}

  <!-- 安全信号の端子台（外部非常停止 EES・安全柵 EAS・非常停止ボタンの接点出力 ESPB） -->
  <rect x="150" y="8" width="190" height="32" rx="2" fill="url(#r30-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  ${[214, 277].map((x) => `<line x1="${x}" y1="10" x2="${x}" y2="38" stroke="#6e6a5e" stroke-width="0.8"/>`).join('')}
  ${SAFETY.map((s) => `${screw(s.x, SAFETY_Y, 4.4)}${text(s.x + 1.4, 24.5, s.id, 3.8, '#2a2b2d', 'start', 'bold', ` transform="rotate(90 ${s.x + 1.4} 24.5)" dominant-baseline="middle"`)}`).join('')}
  ${text(182, 47, '外部非常停止', 5, '#e9ebed', 'middle', 'bold')}
  ${text(245, 47, '安全柵', 5, '#e9ebed', 'middle', 'bold')}
  ${text(308, 47, '非常停止ボタン', 5, '#e9ebed', 'middle', 'bold')}

  <!-- 電源入力（単相 AC200〜230V） -->
  <rect x="${POWER_X - 7}" y="140" width="22" height="54" rx="2" fill="url(#r30-tb-{{uid}})" stroke="#6e6a5e" stroke-width="0.7"/>
  ${POWER.map((p) => `${screw(POWER_X, p.y, 4.4)}${text(POWER_X + 9.5, p.y + 2, p.id === 'PE' ? '⏚' : p.id, 5.4, '#2a2b2d', 'middle', 'bold')}`).join('')}
  ${text(16, 135, 'AC IN', 5, '#e9ebed', 'start', 'bold')}

  <!-- 周辺機器 I/O（CRMA15・CRMA16）と Ethernet（CD38A） -->
  <rect x="312" y="48" width="38" height="186" rx="2" fill="#2a2d32" stroke="#555a61" stroke-width="0.6"/>
  ${milHeader(IO_X, CRMA15_Y, 'CRMA15')}
  ${milHeader(IO_X, CRMA16_Y, 'CRMA16')}
  <rect x="${IO_X - 11}" y="${LAN_Y - 9.5}" width="22" height="19" rx="1.2" fill="#c3c7cb" stroke="#5f646a" stroke-width="0.6"/>
  <rect x="${IO_X - 7}" y="${LAN_Y - 6}" width="12" height="12" rx="0.6" fill="#16181b"/>
  <rect x="${IO_X + 5}" y="${LAN_Y - 3}" width="3" height="6" fill="#16181b"/>
  <rect x="${IO_X - 10}" y="${LAN_Y - 9}" width="3" height="2" fill="#3ccf52"/>
  ${text(IO_X - 16, LAN_Y, 'CD38A', 5, '#e9ebed', 'middle', 'bold', ` transform="rotate(-90 ${IO_X - 16} ${LAN_Y})"`)}

  <!-- 下: ティーチングペンダント（TP）・ロボット接続（RM1・RP1） -->
  <circle cx="${X_TP}" cy="${BOTTOM_Y - 12}" r="9" fill="url(#r30-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <circle cx="${X_TP}" cy="${BOTTOM_Y - 12}" r="5.5" fill="#1b1d20"/>
  ${text(X_TP + 13, BOTTOM_Y - 10, 'TP', 6, '#e9ebed', 'start', 'bold')}
  ${[
    { x: X_RM1, w: 32, name: 'RM1' },
    { x: X_RP1, w: 26, name: 'RP1' },
  ]
    .map(
      (c) => `
  <rect x="${c.x - c.w / 2}" y="${BOTTOM_Y - 22}" width="${c.w}" height="20" rx="2" fill="url(#r30-plug-{{uid}})" stroke="#2b2e32" stroke-width="0.8"/>
  <rect x="${c.x - c.w / 2 + 4}" y="${BOTTOM_Y - 18}" width="${c.w - 8}" height="12" rx="1" fill="#1b1d20"/>
  ${text(c.x, BOTTOM_Y - 26, c.name, 6, '#e9ebed', 'middle', 'bold')}`,
    )
    .join('')}`;

/** 単相 AC200〜230V（−15%〜+10% の 170〜253V は推定） */
const AC_IN: AcceptSpec = { system: 'AC', minVoltage: 170, maxVoltage: 253 };

/** 安全信号の入力へ戻す 24V（コントローラーの内部電源） */
const SAFETY_SRC: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

const SAFETY_SPEC: Record<string, Partial<TerminalDef>> = {
  EES1: { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 1, hint: '非常停止1+', note: '外部非常停止 チャンネル 1 の出力側（EES11 へ b 接点を通して戻す）' },
  EES11: { role: 'signal', function: 'safety-input', channel: 1, hint: '非常停止1', note: '外部非常停止 チャンネル 1 の入力（開くと非常停止。使わないときは EES1 と短絡）' },
  EES2: { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 2, hint: '非常停止2+', note: '外部非常停止 チャンネル 2 の出力側（EES21 へ b 接点を通して戻す）' },
  EES21: { role: 'signal', function: 'safety-input', channel: 2, hint: '非常停止2', note: '外部非常停止 チャンネル 2 の入力（開くと非常停止。使わないときは EES2 と短絡）' },
  EAS1: { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 1, hint: '安全柵1+', note: '安全柵 チャンネル 1 の出力側（EAS11 へ安全柵のドアスイッチの b 接点を通して戻す）' },
  EAS11: { role: 'signal', function: 'safety-input', channel: 1, hint: '安全柵1', note: '安全柵 チャンネル 1 の入力（AUTO モードで開くと停止。使わないときは EAS1 と短絡）' },
  EAS2: { role: 'supply', supply: SAFETY_SRC, function: 'test-output', channel: 2, hint: '安全柵2+', note: '安全柵 チャンネル 2 の出力側（EAS21 へ安全柵のドアスイッチの b 接点を通して戻す）' },
  EAS21: { role: 'signal', function: 'safety-input', channel: 2, hint: '安全柵2', note: '安全柵 チャンネル 2 の入力（AUTO モードで開くと停止。使わないときは EAS2 と短絡）' },
  ESPB1: { role: 'signal', optional: true, hint: '非常停止接点1', note: '非常停止ボタンの接点出力 チャンネル 1（ESPB1-ESPB11。ティーチングペンダントの非常停止ボタンで開く b 接点。推定）' },
  ESPB11: { role: 'signal', optional: true, hint: '非常停止接点1', note: '非常停止ボタンの接点出力 チャンネル 1（推定）' },
  ESPB2: { role: 'signal', optional: true, hint: '非常停止接点2', note: '非常停止ボタンの接点出力 チャンネル 2（ESPB2-ESPB21。推定）' },
  ESPB21: { role: 'signal', optional: true, hint: '非常停止接点2', note: '非常停止ボタンの接点出力 チャンネル 2（推定）' },
};

const crmaConnector: ConnectorSpec = { kind: 'MIL50', pins: 50, width: CRMA_W, length: CRMA_L, facing: 'front' };
const ctrl = CTRL_KIND.miniPlus;

const terminals: TerminalDef[] = [
  ...SAFETY.map((s): TerminalDef => ({ id: s.id, label: s.id, x: s.x, y: SAFETY_Y, side: 'top', role: 'signal', ...SAFETY_SPEC[s.id] })),
  ...POWER.map((p): TerminalDef =>
    p.id === 'PE'
      ? { id: 'PE', label: '⏚ PE（保護接地）', x: POWER_X, y: p.y, side: 'left', role: 'ground' }
      : { id: p.id, label: `${p.id}（AC200〜230V）`, note: '電源入力（単相 AC200〜230V、50/60Hz）', x: POWER_X, y: p.y, side: 'left', role: 'input', accepts: AC_IN },
  ),
  {
    id: 'CRMA15',
    label: 'CRMA15（周辺機器 I/O 1、50 極）',
    hint: '周辺I/O 1',
    note: 'DI101〜DI120・DO101〜DO110・24F・0V・SDICOM・DOSRC。MIL 50 極のフラットケーブルで変換端子台へ',
    x: IO_X,
    y: CRMA15_Y,
    side: 'right',
    role: 'connector',
    connector: crmaConnector,
  },
  {
    id: 'CRMA16',
    label: 'CRMA16（周辺機器 I/O 2、50 極）',
    hint: '周辺I/O 2',
    note: 'UOP 入力（*IMSTP・*HOLD・*SFSPD・CSTOPI・FAULT RESET・START・HOME・ENBL）・UOP 出力（CMDENBL・FAULT・BATALM・BUSY）・DO111〜DO120',
    x: IO_X,
    y: CRMA16_Y,
    side: 'right',
    role: 'connector',
    connector: crmaConnector,
  },
  {
    id: 'CD38A',
    label: 'CD38A（Ethernet）',
    hint: 'Ethernet',
    note: '100BASE-TX。パソコン（ROBOGUIDE など）や PLC（EtherNet/IP はソフトウェアオプション）とつなぐ',
    x: IO_X,
    y: LAN_Y,
    side: 'right',
    role: 'connector',
    connector: { kind: 'RJ45', pins: 0, width: 19, length: 22, facing: 'front', protocols: ['ethernet', 'ethernet-ip'] },
  },
  {
    id: 'TP',
    label: 'TP（ティーチングペンダント）',
    hint: 'iPendant',
    note: 'ティーチングペンダント iPendant のケーブルをつなぐ。ペンダントの非常停止ボタン・イネーブルスイッチもこのケーブルを通る',
    x: X_TP,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: { kind: IPENDANT_KIND, pins: 0, width: 12, style: 'lan' },
  },
  {
    id: 'RM1',
    label: 'RM1（ロボット接続 モーター動力・ブレーキ）',
    hint: '動力 RM1',
    note: 'ロボットの RM1 へ、ロボット接続ケーブル（RM1）でつなぐ。適合ロボット: LR Mate 200iD',
    x: X_RM1,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: rm1Connector(ctrl.rm1),
  },
  {
    id: 'RP1',
    label: 'RP1（ロボット接続 パルスコーダ・ロボット I/O）',
    hint: '信号 RP1',
    note: 'ロボットの RP1 へ、ロボット接続ケーブル（RP1）でつなぐ。ロボット I/O（RI1〜RI8・RO1〜RO8）とその電源もここを通る',
    x: X_RP1,
    y: BOTTOM_Y,
    side: 'bottom',
    role: 'connector',
    connector: rp1Connector(ctrl.rp1),
  },
];

const io15 = crmaIo('CRMA15', CRMA15_ROWS);
const io16 = crmaIo('CRMA16', CRMA16_ROWS);
const rp1 = controllerRp1('RP1');

/** 非常停止ボタンの接点出力（ティーチングペンダントの非常停止ボタンで開く。コントローラー自身の動作では切り換わらない） */
const espb: InternalLink[] = [
  { from: 'ESPB1', to: 'ESPB11', switch: 'NC', safetyContact: true },
  { from: 'ESPB2', to: 'ESPB21', switch: 'NC', safetyContact: true },
];

const def: DeviceDefinition = {
  type: 'fanuc.r-30ib-mini-plus',
  name: 'ロボットコントローラー',
  model: 'R-30iB Mini Plus',
  maker: 'ファナック',
  category: 'plc',
  labelPrefix: 'RC',
  width: W,
  height: H,
  svg,
  terminals,
  pins: [...io15.pins, ...io16.pins, ...rp1.pins],
  links: [...io15.links, ...io16.links, ...rp1.links, ...espb],
  loadCurrent: 6,
  distinctGroups: [['L', 'N']],
  safetyChannels: [
    { id: 'EES', label: '外部非常停止（EES1→EES11、EES2→EES21）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'EES1', input: 'EES11' }, { source: 'EES2', input: 'EES21' }] },
    { id: 'EAS', label: '安全柵（EAS1→EAS11、EAS2→EAS21）', kind: 'input', mode: 'nc-nc', channels: [{ source: 'EAS1', input: 'EAS11' }, { source: 'EAS2', input: 'EAS21' }] },
  ],
  schematic: { actuator: 'emergency' },
  estimated:
    '周辺機器 I/O（CRMA15・CRMA16）のピンの並びは一部（A01・A02・B01・B02 の 24F、A05 の DI101、A15 の DO101）だけ資料で確認し、ほかは推定。' +
    'Mini Plus の周辺機器 I/O の点数は R-30iB Mate のメインボード（入力 28 点・出力 24 点）と同じと推定。出力 1 点の定格 0.2A、入力のコモンの切換え、' +
    'ロボット I/O（RP1）のピン番号、非常停止ボタンの接点出力（ESPB）の有無、電源電圧の許容範囲と消費電流（電源容量 1.2kVA から 6A）、端子の配置は推定',
  description:
    'ファナックのロボットコントローラー R-30iB Mini Plus（LR Mate 200iD・CRX 用の小形キャビネット。単相 AC200〜230V、外形 410 × 277 × 370mm、質量 19kg）。' +
    'ロボットとは RM1（モーター動力・ブレーキ）・RP1（パルスコーダ・ロボット I/O）の 2 本のロボット接続ケーブルでつなぐ（適合するロボットとだけつながる）。' +
    '周辺機器 I/O（PLC との受け渡し）: CRMA15 に汎用入力 DI101〜DI120 と汎用出力 DO101〜DO110、CRMA16 に周辺機器（UOP）入力 *IMSTP・*HOLD・*SFSPD・CSTOPI・FAULT RESET・START・HOME・ENBL、' +
    'UOP 出力 CMDENBL・FAULT・BATALM・BUSY と汎用出力 DO111〜DO120。どちらも 50 極で、MIL 50 極の変換端子台につなぐ。' +
    '入力は DC24V で、コモン SDICOM を 0V につなぐと +24V で ON（PLC のソース出力・接点）、+24V につなぐと 0V で ON（PLC のシンク出力）。出力はソース形で、出力の電源 DOSRC に +24V（内蔵の 24F でもよい）を供給する。' +
    '*IMSTP・*HOLD・*SFSPD は b 接点入力（OFF で停止）なので、使わないときも ON にしておく。' +
    '安全信号: 外部非常停止 EES1-EES11・EES2-EES21、安全柵 EAS1-EAS11・EAS2-EAS21 に、非常停止スイッチ・安全柵のドアスイッチの b 接点を 2 チャンネルで入れる（使わないときは短絡線でつなぐ）。' +
    'ESPB1-ESPB11・ESPB2-ESPB21 はティーチングペンダントの非常停止ボタンの接点で、セーフティリレーなどの非常停止のループに入れられる。' +
    'ロボット I/O（RI1〜RI8・RO1〜RO8）はロボットのエンドエフェクタ用コネクター EE に出る。Ethernet CD38A でパソコン・PLC とつなぐ。ティーチングペンダント iPendant は TP につなぐ。',
};

export default def;

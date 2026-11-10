import { DENSO_CTRL_KIND, DENSO_HAND_KIND, DENSO_ROBOT_KIND, DENSO_WHITE, densoLogo, ENC_PINS, HAND_IO, HAND_PINS, robotEncoderPins, text } from '../denso/parts';
import { airPortSide, airPortTop, bolt, cautionLabel, jointCap, namePlate, robotDefs, roundConnectorTop, squareConnector } from '../generic/robot-art';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * デンソーウェーブ 垂直多関節ロボット VS-060（6 軸、可搬 4kg）。
 *
 * 仕様（デンソーウェーブの仕様表・カタログの引用）: 制御軸 6、可搬質量 4kg、アーム長 305 + 300mm（最大動作範囲 605mm）、
 * 位置繰返し精度 ±0.02mm、J1 の動作範囲 ±170°、J2 ±120°、位置検出はアブソリュートエンコーダー。
 * 腕の中にユーザー信号線 10 本とエア配管 5 系統（φ4 × 4・φ4 × 1。電磁弁内蔵の仕様もある）が通る。IP67 の仕様もある。
 * コントローラーは RC8A（RC8）。本体質量は資料によって 27〜30kg と分かれ、確かめられなかった。
 *
 * Conneko での端子:
 * - ベース背面: MOTOR（モーター動力・ブレーキ）・ENCODER（エンコーダー・ハンド I/O）のロボット接続コネクター、エア供給口 AIR1・AIR2
 * - 第 3 軸のケーシングの上: ハンド I/O コネクター（HI0〜HI7・HO0〜HO7・+24V・0V。20 ピンは推定）、エア出口 AIR1・AIR2
 * - ハンド I/O はロボットの中の配線とロボット接続ケーブル ENCODER でコントローラーのハンド I/O へ通じる（推定。ファナックの EE と同じ扱い）
 * - エアは 5 系統のうち 2 系統だけを描いた（簡略化）
 *
 * 見た目: 横から見た姿（第 2 アームを立て、第 3 アームを前へ水平に伸ばし、手首のフランジを下へ向けた姿勢）。1mm ≒ 0.3px に縮めて描いた。
 * 白い塗装、ベースの上に低い旋回胴、肩と肘の丸いカバー、赤い DENSO のロゴ。形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 240;
const H = 292;
const P = 'vs';
const C = DENSO_WHITE;

/** J2・J3・J5 の軸の中心 */
const J2 = { x: 104, y: 176 };
const J3 = { x: 104, y: 84 };
const J5 = { x: 196, y: 84 };

/** ベース背面のコネクターパネル */
const PANEL_X = 36;
const Y_MOTOR = 236;
const Y_ENC = 250;
const Y_AIR1 = 263;
const Y_AIR2 = 273;
/** 第 3 軸のケーシングの上面 */
const TOP_Y = 58;
const X_HAND = 68;
const X_AIR1_OUT = 82;
const X_AIR2_OUT = 92;

const svg = `
  <defs>${robotDefs(P, C)}</defs>

  <!-- 床の影 -->
  <ellipse cx="100" cy="285" rx="76" ry="5" fill="#000" opacity="0.13"/>

  <!-- 取付けベース（底板） -->
  <path d="M50 275 H150 L152 283 H48 Z" fill="url(#${P}-dark-{{uid}})" stroke="#16181a" stroke-width="0.7"/>
  ${bolt(P, 58, 279, 1.9)}${bolt(P, 142, 279, 1.9)}

  <!-- ベース（固定部）: 角の丸い箱。上の縁に面取り、前に銘板 -->
  <path d="M56 275 V232 Q56 222 66 222 H134 Q144 222 144 232 V275 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M57 230 Q100 226 143 230" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M57 262 H143" stroke="${C.edge}" stroke-width="0.5" opacity="0.45"/>
  ${namePlate(P, 114, 265, 22, 7.5)}
  ${cautionLabel(76, 272, 9)}
  ${text(100, 255, 'VS-060', 6.4, '#5d646b', 'middle', 'bold', ' letter-spacing="0.5"')}

  <!-- ベース背面のコネクターパネル（MOTOR・ENCODER・エア供給口） -->
  <path d="M${PANEL_X + 7} 227 H57 V278 H${PANEL_X + 7} Z" fill="url(#${P}-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${squareConnector(P, PANEL_X, Y_MOTOR, 10)}
  ${squareConnector(P, PANEL_X, Y_ENC, 9)}
  ${text(PANEL_X + 18.5, Y_MOTOR + 1.5, 'M', 4, '#e9eaec', 'middle', 'bold')}
  ${text(PANEL_X + 18.5, Y_ENC + 1.5, 'E', 4, '#e9eaec', 'middle', 'bold')}
  ${airPortSide(P, PANEL_X, Y_AIR1)}${airPortSide(P, PANEL_X, Y_AIR2)}
  ${text(PANEL_X + 18.5, Y_AIR1 + 1.4, '1', 3.8, '#e9eaec', 'middle', 'bold')}
  ${text(PANEL_X + 18.5, Y_AIR2 + 1.4, '2', 3.8, '#e9eaec', 'middle', 'bold')}

  <!-- J1 旋回胴: 低い円筒。上は肩の軸受けへ丸く盛り上がる。ベースとの合わせ目は暗い溝 -->
  <path d="M64 224 V200 Q64 182 84 178 H122 Q138 182 138 200 V224 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <rect x="60" y="221" width="82" height="3" rx="1.2" fill="#4a4f55"/>
  <path d="M70 216 V194" stroke="url(#${P}-gloss-{{uid}})" stroke-width="4" opacity="0.6"/>

  <!-- 第 2 アーム（下腕）: 中ほどが少しくびれた形。肩と肘の丸い端 -->
  <path d="M${J2.x - 23} ${J2.y + 4}
           C${J2.x - 20} ${J2.y - 30} ${J3.x - 13} ${J3.y + 50} ${J3.x - 17} ${J3.y + 6}
           A17 17 0 0 1 ${J3.x + 17} ${J3.y + 6}
           C${J3.x + 13} ${J3.y + 50} ${J2.x + 20} ${J2.y - 30} ${J2.x + 23} ${J2.y + 4}
           A23 23 0 0 1 ${J2.x - 23} ${J2.y + 4} Z"
        fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <!-- 側面のカバーの合わせ目・光沢 -->
  <path d="M${J2.x - 14} ${J2.y - 28} C${J2.x - 12} ${J2.y - 52} ${J3.x - 8} ${J3.y + 52} ${J3.x - 10} ${J3.y + 26}
           Q${J3.x} ${J3.y + 21} ${J3.x + 10} ${J3.y + 26}
           C${J3.x + 8} ${J3.y + 52} ${J2.x + 12} ${J2.y - 52} ${J2.x + 14} ${J2.y - 28}
           Q${J2.x} ${J2.y - 34} ${J2.x - 14} ${J2.y - 28} Z" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M${J2.x - 11} ${J2.y - 34} C${J2.x - 9} ${J2.y - 56} ${J3.x - 6} ${J3.y + 52} ${J3.x - 7} ${J3.y + 30}" fill="none" stroke="url(#${P}-gloss-{{uid}})" stroke-width="3" opacity="0.9" stroke-linecap="round"/>
  ${densoLogo(J2.x + 2, 130, 10, 'middle', ` transform="rotate(-90 ${J2.x + 2} 130)"`)}

  <!-- 肩（J2）の丸いカバー -->
  ${jointCap(P, C, J2.x, J2.y, 25, 8, { inner: 10 })}
  <circle cx="${J2.x}" cy="${J2.y}" r="25.8" fill="none" stroke="#9aa1a7" stroke-width="1.2" opacity="0.7"/>

  <!-- 第 3 軸のケーシング（肘。後ろに手首のモーターの張り出し。上にハンド I/O・エア出口） -->
  <path d="M${J3.x + 8} ${J3.y - 22} H70 Q54 ${J3.y - 22} 52 ${J3.y - 8} V${J3.y + 6} Q54 ${J3.y + 20} 70 ${J3.y + 20} H${J3.x + 8} Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M66 ${J3.y - 22} V${J3.y + 20}" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  ${bolt(P, 59, J3.y - 14, 1.1)}${bolt(P, 59, J3.y + 12, 1.1)}
  <path d="M70 ${J3.y - 17} H${J3.x - 4}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2.2" opacity="0.8" stroke-linecap="round"/>
  <!-- 上面の台（ハンド I/O コネクター・エア出口） -->
  <path d="M${X_HAND - 8} ${TOP_Y + 4.5} H${X_AIR2_OUT + 5} V${J3.y - 22} H${X_HAND - 8} Z" fill="url(#${P}-dark-{{uid}})"/>
  ${roundConnectorTop(P, X_HAND, TOP_Y, 12)}
  ${airPortTop(P, X_AIR1_OUT, TOP_Y)}${airPortTop(P, X_AIR2_OUT, TOP_Y)}

  <!-- 第 3 アーム（前腕。根元は太い筒、J4 の境目から先は細い） -->
  <path d="M${J3.x + 10} ${J3.y - 17} H${J3.x + 44} V${J3.y + 15} H${J3.x + 10} Z" fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${J3.x + 44} ${J3.y - 13} L${J5.x - 13} ${J5.y - 10} V${J5.y + 10} L${J3.x + 44} ${J3.y + 12} Z" fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${J3.x + 44} ${J3.y - 14} V${J3.y + 13}" stroke="#4a4f55" stroke-width="2.2"/>
  <path d="M${J3.x + 50} ${J3.y - 7} H${J5.x - 20}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2.2" opacity="0.85" stroke-linecap="round"/>

  <!-- 肘（J3）の丸いカバー -->
  ${jointCap(P, C, J3.x, J3.y, 18, 6, { inner: 7, boltR: 1.1 })}
  <circle cx="${J3.x}" cy="${J3.y}" r="18.8" fill="none" stroke="#9aa1a7" stroke-width="1" opacity="0.7"/>

  <!-- 手首（J5）。フランジ（J6）は下向き -->
  <path d="M${J5.x - 14} ${J5.y - 11} H${J5.x + 2} Q${J5.x + 13} ${J5.y - 11} ${J5.x + 13} ${J5.y} Q${J5.x + 13} ${J5.y + 11} ${J5.x + 2} ${J5.y + 11} H${J5.x - 14} Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="7.5" fill="url(#${P}-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.6"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="3" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.6"/>
  <path d="M${J5.x - 6.5} ${J5.y + 11} H${J5.x + 6.5} V${J5.y + 19} H${J5.x - 6.5} Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>
  <rect x="${J5.x - 8.5}" y="${J5.y + 19}" width="17" height="4.2" rx="0.8" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <path d="M${J5.x - 4.5} ${J5.y + 19.6} V${J5.y + 22.6} M${J5.x + 4.5} ${J5.y + 19.6} V${J5.y + 22.6}" stroke="#5a5f65" stroke-width="0.6"/>
  `;

const ctrl = DENSO_CTRL_KIND.rc8a;
const kind = DENSO_ROBOT_KIND.vs060;

const terminals: TerminalDef[] = [
  {
    id: 'MOTOR',
    label: 'MOTOR（モーター動力・ブレーキ）',
    hint: '動力 MOTOR',
    note: 'ベース背面のロボット接続コネクター。コントローラー RC8A の MOTOR へ、ロボット接続ケーブル（モーター）でつなぐ',
    x: PANEL_X,
    y: Y_MOTOR,
    side: 'left',
    role: 'connector',
    connector: { kind: kind.motor, pins: 0, width: 14, style: 'lan', required: true, mates: [ctrl.motor], defaultCable: 'denso.robot-cable-motor.vs060-rc8a' },
  },
  {
    id: 'ENCODER',
    label: 'ENCODER（エンコーダー・ハンド I/O）',
    hint: '信号 ENC',
    note: 'ベース背面のロボット接続コネクター。コントローラー RC8A の ENCODER へ、ロボット接続ケーブル（エンコーダー）でつなぐ。ハンド I/O（HI・HO・+24V・0V）もここを通る（推定）',
    x: PANEL_X,
    y: Y_ENC,
    side: 'left',
    role: 'connector',
    connector: { kind: kind.encoder, pins: ENC_PINS, width: 12, style: 'lan', required: true, mates: [ctrl.encoder], defaultCable: 'denso.robot-cable-encoder.vs060-rc8a' },
  },
  {
    id: 'AIR1',
    label: 'AIR1（エア供給口 1、φ4）',
    hint: 'エア供給 1',
    note: 'ベース背面のエア供給口。腕の中の φ4 の配管を通って第 3 軸のケーシングのエア出口 1 へ通じる',
    x: PANEL_X,
    y: Y_AIR1,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', tubeOD: 4 },
  },
  {
    id: 'AIR2',
    label: 'AIR2（エア供給口 2、φ4）',
    hint: 'エア供給 2',
    note: 'ベース背面のエア供給口。腕の中の φ4 の配管を通って第 3 軸のケーシングのエア出口 2 へ通じる',
    x: PANEL_X,
    y: Y_AIR2,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', tubeOD: 4 },
  },
  {
    id: 'HAND',
    label: 'HAND I/O（ハンド I/O、20 ピン）',
    hint: 'ハンド I/O',
    note: '第 3 軸のケーシングのハンド I/O コネクター。HI0〜HI7（ハンド入力）・HO0〜HO7（ハンド出力）・+24V・0V。ハンドのセンサー・電磁弁へ、ハンド I/O ケーブル（片側バラ線）でつなぐ',
    x: X_HAND,
    y: TOP_Y,
    side: 'top',
    role: 'connector',
    connector: { kind: DENSO_HAND_KIND, pins: HAND_PINS, width: 10, style: 'round' },
  },
  {
    id: 'AIR1-OUT',
    label: 'AIR1 出口（φ4）',
    hint: 'エア出口 1',
    note: '第 3 軸のケーシングのエア出口 1（ベースのエア供給口 AIR1 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR1_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', tubeOD: 4 },
  },
  {
    id: 'AIR2-OUT',
    label: 'AIR2 出口（φ4）',
    hint: 'エア出口 2',
    note: '第 3 軸のケーシングのエア出口 2（ベースのエア供給口 AIR2 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR2_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', tubeOD: 4 },
  },
];

const handPins: PinDef[] = HAND_IO.map((h) => ({ id: `HAND#${h.pin}`, label: `${h.pin} ${h.name}`, note: h.note, role: 'pass', optional: true }));
const pins: PinDef[] = [...robotEncoderPins('ENCODER'), ...handPins];
/** ハンド I/O のピンは、ロボットの中の配線でエンコーダーコネクターの同じ番号のピンへ通じる */
const links: InternalLink[] = HAND_IO.map((h) => ({ from: `HAND#${h.pin}`, to: `ENCODER#${h.pin}` }));

const def: DeviceDefinition = {
  type: 'denso.vs-060',
  name: '垂直多関節ロボット',
  model: 'VS-060',
  maker: 'デンソーウェーブ',
  category: 'load',
  labelPrefix: 'RB',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  airLinks: [
    { from: 'AIR1', to: 'AIR1-OUT' },
    { from: 'AIR2', to: 'AIR2-OUT' },
  ],
  estimated:
    'ハンド I/O コネクターのピン数（20）と割付け、ハンド I/O がロボット接続ケーブル（エンコーダー）を通ること、そのピン番号（Conneko の中の番号）、' +
    'ロボット接続コネクターの名前（MOTOR・ENCODER）、エアの配管の口の形、外形の寸法は推定',
  description:
    'デンソーウェーブの小形の垂直多関節ロボット VS-060（6 軸、可搬質量 4kg、アーム長 305 + 300mm・最大動作範囲 605mm、位置繰返し精度 ±0.02mm、J1 ±170°）。' +
    'コントローラーは RC8A。ベース背面の MOTOR（モーター動力・ブレーキ）と ENCODER（エンコーダー）を、ロボット接続ケーブルでコントローラーの MOTOR・ENCODER へつなぐ（適合しないコントローラーにはつながらない）。' +
    '腕の中にユーザー信号線とエア配管（φ4 × 5 系統）が通る。第 3 軸のケーシングのハンド I/O コネクターにハンド入力 HI0〜HI7・ハンド出力 HO0〜HO7・+24V・0V が出ており、' +
    'ハンドのセンサー・電磁弁はハンド I/O ケーブル（片側バラ線）で配線する（コントローラーの I/O 表にハンド入出力として出る）。' +
    'エアはベース背面の供給口から第 3 軸のケーシングの出口へ出る（Conneko では 2 系統を表した）。' +
    '動作範囲の内側に人が入らないよう、安全柵・ドアスイッチを設けてコントローラーの自動運転許可（EA）・防護停止（PS）の入力につなぐ。',
};

export default def;

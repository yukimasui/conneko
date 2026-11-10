import { airPortSide, airPortTop, bolt, cautionLabel, jointCap, namePlate, robotDefs, roundConnectorTop, squareConnector } from '../generic/robot-art';
import { KAWASAKI_CTRL_KIND, KAWASAKI_ORANGE, KAWASAKI_ROBOT_KIND, kawasakiLogo, RS_USER_KIND, RS_USER_PINS, text } from '../kawasaki/parts';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * 川崎重工業 垂直多関節ロボット RS007N（6 軸、可搬 7kg）。
 *
 * 仕様（川崎重工業の標準仕様書 RS007N-B・カタログ）: 制御軸 6、最大可搬質量 7kg、最大リーチ 730mm、位置繰返し精度 ±0.02mm（手首フランジ面、ISO 9283）、
 * 本体質量 35kg（オプションを除く）。動作範囲 JT1 ±180°、JT2 ±135°、JT3 ±155°、JT4 ±200°、JT5 ±125°、JT6 ±360°。
 * コントローラーは F60（2.0kVA）・E01（5.6kVA）など（Conneko では E01 とつなぐ）。
 *
 * Conneko での端子:
 * - ベース背面: X1（モーター動力・ブレーキ）・X2（エンコーダー信号）のロボット接続コネクター、アプリケーション用の信号線のコネクター（ベース側 UB）、エア供給口 AIR1・AIR2
 * - 第 3 軸のケーシングの上: アプリケーション用の信号線のコネクター（アーム側 UA）、エア出口 AIR1・AIR2
 * - 信号線は UB と UA の同じ番号のピンが腕の中の電線でつながる（本数 10 は推定）。ハンドの信号はコントローラーの汎用入出力か PLC へ自分で配線する
 *
 * 見た目: 横から見た姿（第 2 アームを立て、第 3 アームを前へ水平に伸ばし、手首のフランジを下へ向けた姿勢）。1mm ≒ 0.3px に縮めて描いた。
 * 橙の塗装、角を落とした箱形のベースと旋回胴、ボルトで留めた腕の側面のカバー、肘の後ろの手首のモーター、黒い Kawasaki のロゴ。
 * 形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 256;
const H = 306;
const P = 'rs';
const C = KAWASAKI_ORANGE;

/** JT2・JT3・JT5 の軸の中心 */
const J2 = { x: 106, y: 188 };
const J3 = { x: 106, y: 80 };
const J5 = { x: 220, y: 80 };

/** ベース背面のコネクターパネル */
const PANEL_X = 32;
const Y_X1 = 243;
const Y_X2 = 257;
const Y_UB = 269;
const Y_AIR1 = 280;
const Y_AIR2 = 290;
/** 第 3 軸のケーシングの上面 */
const TOP_Y = 53;
const X_UA = 66;
const X_AIR1_OUT = 80;
const X_AIR2_OUT = 90;

const svg = `
  <defs>${robotDefs(P, C)}</defs>

  <!-- 床の影 -->
  <ellipse cx="104" cy="300" rx="82" ry="5.5" fill="#000" opacity="0.14"/>

  <!-- 取付けベース（底板） -->
  <path d="M46 292 H162 L165 300 H43 Z" fill="url(#${P}-dark-{{uid}})" stroke="#16181a" stroke-width="0.7"/>
  ${bolt(P, 54, 296, 2)}${bolt(P, 154, 296, 2)}

  <!-- JT1 ベース（固定部）: 角を落とした箱 -->
  <path d="M52 292 V244 L62 232 H146 L156 244 V292 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M53 244 H155" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M60 248 V286" stroke="url(#${P}-gloss-{{uid}})" stroke-width="4" opacity="0.55"/>
  ${namePlate(P, 124, 276, 22, 8)}
  ${cautionLabel(76, 287, 9)}
  ${text(106, 266, 'RS007N', 6.4, C.edge, 'middle', 'bold', ' letter-spacing="0.5"')}

  <!-- ベース背面のコネクターパネル（X1・X2・信号線・エア供給口） -->
  <path d="M${PANEL_X + 7} 236 H53 V294 H${PANEL_X + 7} Z" fill="url(#${P}-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${squareConnector(P, PANEL_X, Y_X1, 11)}
  ${squareConnector(P, PANEL_X, Y_X2, 9)}
  <rect x="${PANEL_X + 1}" y="${Y_UB - 4}" width="11" height="8" rx="4" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <circle cx="${PANEL_X + 6.5}" cy="${Y_UB}" r="2.3" fill="#26292c"/>
  ${airPortSide(P, PANEL_X, Y_AIR1)}${airPortSide(P, PANEL_X, Y_AIR2)}
  ${text(PANEL_X + 18.5, Y_UB + 1.4, 'UB', 3.6, '#e9eaec', 'middle', 'bold')}

  <!-- JT1 旋回胴: 角を落とした箱。上の肩は JT2 の軸受けへ丸くなる。ベースとの合わせ目は暗い溝 -->
  <path d="M60 234 V206 Q60 190 76 186 H136 Q152 190 152 206 V234 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <rect x="56" y="231.5" width="100" height="3.2" rx="1.2" fill="#2c2f33"/>
  <path d="M62 226 Q106 230 150 226" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <!-- 旋回胴の側面のリブ -->
  ${[140, 145].map((x) => `<path d="M${x} 200 V228" stroke="${C.edge}" stroke-width="0.6" opacity="0.5"/>`).join('')}

  <!-- 第 2 アーム（下腕）: まっすぐに細くなる腕。側面にボルトで留めたカバー -->
  <path d="M${J2.x - 26} ${J2.y + 4} L${J3.x - 18} ${J3.y + 4} A18 18 0 0 1 ${J3.x + 18} ${J3.y + 4} L${J2.x + 26} ${J2.y + 4} A26 26 0 0 1 ${J2.x - 26} ${J2.y + 4} Z"
        fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <rect x="${J2.x - 15}" y="${J3.y + 28}" width="30" height="${J2.y - J3.y - 62}" rx="6" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.6"/>
  ${[
    [J2.x - 10.5, J3.y + 33],
    [J2.x + 10.5, J3.y + 33],
    [J2.x - 10.5, J2.y - 39],
    [J2.x + 10.5, J2.y - 39],
  ]
    .map(([x, y]) => bolt(P, x, y, 1.1))
    .join('')}
  <path d="M${J2.x - 11} ${J3.y + 40} V${J2.y - 46}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="3" opacity="0.8" stroke-linecap="round"/>
  ${kawasakiLogo(J2.x + 2, 131, 8.4, '#1b1b1b', 'middle', ` transform="rotate(-90 ${J2.x + 2} 131)"`)}

  <!-- JT2 の丸いカバー（モーター・減速機） -->
  ${jointCap(P, C, J2.x, J2.y, 26, 10, { inner: 12 })}
  <circle cx="${J2.x}" cy="${J2.y}" r="5" fill="#2c2f33" opacity="0.85"/>

  <!-- 第 3 軸のケーシング（肘）: 後ろに手首のモーター（黒い端のふた） -->
  <path d="M${J3.x + 8} ${J3.y - 24} H64 Q50 ${J3.y - 24} 50 ${J3.y - 10} V${J3.y + 8} Q50 ${J3.y + 21} 64 ${J3.y + 21} H${J3.x + 8} Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <rect x="42" y="${J3.y - 14}" width="10" height="28" rx="3" fill="url(#${P}-dark-{{uid}})" stroke="#111" stroke-width="0.6"/>
  ${[J3.y - 9, J3.y + 9].map((y) => bolt(P, 47, y, 1)).join('')}
  <path d="M66 ${J3.y - 24} V${J3.y + 21}" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M68 ${J3.y - 18} H${J3.x - 6}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2.2" opacity="0.8" stroke-linecap="round"/>
  <!-- 上面の台（信号線のコネクター・エア出口） -->
  <path d="M${X_UA - 8} ${TOP_Y + 4.5} H${X_AIR2_OUT + 5} V${J3.y - 24} H${X_UA - 8} Z" fill="url(#${P}-dark-{{uid}})"/>
  ${roundConnectorTop(P, X_UA, TOP_Y, 11)}
  ${airPortTop(P, X_AIR1_OUT, TOP_Y)}${airPortTop(P, X_AIR2_OUT, TOP_Y)}

  <!-- 第 3 アーム（前腕。JT4 で回る長い筒。根元に黒い境目） -->
  <path d="M${J3.x + 10} ${J3.y - 17} L${J5.x - 14} ${J5.y - 11} V${J5.y + 11} L${J3.x + 10} ${J3.y + 16} Z" fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${J3.x + 30} ${J3.y - 16.2} V${J3.y + 15.2}" stroke="#2c2f33" stroke-width="2.4"/>
  <path d="M${J3.x + 36} ${J3.y - 8} H${J5.x - 22}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2.2" opacity="0.8" stroke-linecap="round"/>
  <path d="M${J5.x - 30} ${J5.y - 11.6} V${J5.y + 11.6}" stroke="${C.edge}" stroke-width="0.6" opacity="0.6"/>

  <!-- JT3 の丸いカバー -->
  ${jointCap(P, C, J3.x, J3.y, 18, 6, { inner: 7, boltR: 1.1 })}

  <!-- 手首（JT5）。二股のハウジングの間で回る。フランジ（JT6）は下向き -->
  <path d="M${J5.x - 15} ${J5.y - 12} H${J5.x + 2} Q${J5.x + 14} ${J5.y - 12} ${J5.x + 14} ${J5.y} Q${J5.x + 14} ${J5.y + 12} ${J5.x + 2} ${J5.y + 12} H${J5.x - 15} Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="8" fill="url(#${P}-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.6"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="3.2" fill="#2c2f33" opacity="0.8"/>
  <path d="M${J5.x - 7} ${J5.y + 12} H${J5.x + 7} V${J5.y + 20} H${J5.x - 7} Z" fill="url(#${P}-dark-{{uid}})" stroke="#111" stroke-width="0.6"/>
  <rect x="${J5.x - 9}" y="${J5.y + 20}" width="18" height="4.5" rx="0.8" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <path d="M${J5.x - 5} ${J5.y + 20.6} V${J5.y + 23.9} M${J5.x + 5} ${J5.y + 20.6} V${J5.y + 23.9}" stroke="#5a5f65" stroke-width="0.6"/>
  `;

const ctrl = KAWASAKI_CTRL_KIND.e01;
const kind = KAWASAKI_ROBOT_KIND.rs007n;

const terminals: TerminalDef[] = [
  {
    id: 'X1',
    label: 'X1（モーター動力・ブレーキ）',
    hint: '動力 X1',
    note: 'ベース背面のロボット接続コネクター。コントローラー E01 の X1 へ、モーターハーネスでつなぐ',
    x: PANEL_X,
    y: Y_X1,
    side: 'left',
    role: 'connector',
    connector: { kind: kind.x1, pins: 0, width: 16, style: 'lan', required: true, mates: [ctrl.x1], defaultCable: 'kawasaki.harness-x1.rs007n-e01' },
  },
  {
    id: 'X2',
    label: 'X2（エンコーダー信号）',
    hint: '信号 X2',
    note: 'ベース背面のロボット接続コネクター。コントローラー E01 の X2 へ、信号ハーネスでつなぐ',
    x: PANEL_X,
    y: Y_X2,
    side: 'left',
    role: 'connector',
    connector: { kind: kind.x2, pins: 0, width: 14, style: 'lan', required: true, mates: [ctrl.x2], defaultCable: 'kawasaki.harness-x2.rs007n-e01' },
  },
  {
    id: 'UB',
    label: 'UB（信号線 ベース側）',
    hint: '信号線',
    note: 'ベース背面のアプリケーション用の信号線のコネクター。アーム側 UA の同じ番号のピンと腕の中の電線でつながる。コントローラーの汎用入出力・中継の端子台へ配線する',
    x: PANEL_X,
    y: Y_UB,
    side: 'left',
    role: 'connector',
    connector: { kind: RS_USER_KIND, pins: RS_USER_PINS, width: 9, style: 'round' },
  },
  {
    id: 'AIR1',
    label: 'AIR1（エア供給口 1）',
    hint: 'エア供給 1',
    note: 'ベース背面のエア供給口。腕の中のエアホースを通って第 3 軸のケーシングのエア出口 1 へ通じる。使わないときはプラグでふさぐ',
    x: PANEL_X,
    y: Y_AIR1,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/4', tubeOD: 6 },
  },
  {
    id: 'AIR2',
    label: 'AIR2（エア供給口 2）',
    hint: 'エア供給 2',
    note: 'ベース背面のエア供給口。腕の中のエアホースを通って第 3 軸のケーシングのエア出口 2 へ通じる。使わないときはプラグでふさぐ',
    x: PANEL_X,
    y: Y_AIR2,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/4', tubeOD: 6 },
  },
  {
    id: 'UA',
    label: 'UA（信号線 アーム側）',
    hint: 'ハンド配線',
    note: '第 3 軸のケーシングのアプリケーション用の信号線のコネクター。ベース側 UB の同じ番号のピンとつながる。ハンドのセンサー・電磁弁へ、信号線ケーブル（片側バラ線）で配線する',
    x: X_UA,
    y: TOP_Y,
    side: 'top',
    role: 'connector',
    connector: { kind: RS_USER_KIND, pins: RS_USER_PINS, width: 9, style: 'round' },
  },
  {
    id: 'AIR1-OUT',
    label: 'AIR1 出口',
    hint: 'エア出口 1',
    note: '第 3 軸のケーシングのエア出口 1（ベースのエア供給口 AIR1 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR1_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'Rc1/8', tubeOD: 6 },
  },
  {
    id: 'AIR2-OUT',
    label: 'AIR2 出口',
    hint: 'エア出口 2',
    note: '第 3 軸のケーシングのエア出口 2（ベースのエア供給口 AIR2 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR2_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'Rc1/8', tubeOD: 6 },
  },
];

const pins: PinDef[] = [];
const links: InternalLink[] = [];
for (let i = 1; i <= RS_USER_PINS; i++) {
  pins.push(
    { id: `UB#${i}`, label: `信号線 ${i}`, note: `アプリケーション用の信号線 ${i}（アーム側 UA の ${i} へ）`, role: 'pass', optional: true },
    { id: `UA#${i}`, label: `信号線 ${i}`, note: `アプリケーション用の信号線 ${i}（ベース側 UB の ${i} へ）`, role: 'pass', optional: true },
  );
  links.push({ from: `UB#${i}`, to: `UA#${i}` });
}

const def: DeviceDefinition = {
  type: 'kawasaki.rs007n',
  name: '垂直多関節ロボット',
  model: 'RS007N',
  maker: '川崎重工業',
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
    'ロボット接続コネクターの名前（X1・X2）、アプリケーション用の信号線の本数（10）・コネクターの名前（UB・UA）と形、エアの配管の系統数（2）・ねじと適合チューブの外径、外形の寸法は推定',
  description:
    '川崎重工業の小形の垂直多関節ロボット RS007N（6 軸、最大可搬質量 7kg、最大リーチ 730mm、位置繰返し精度 ±0.02mm、本体質量 35kg。JT1 ±180°）。' +
    'コントローラーは E01（F60 も選べる）。ベース背面の X1（モーター動力・ブレーキ）と X2（エンコーダー信号）を、ロボットに付属するハーネスでコントローラーの X1・X2 へつなぐ（適合しないコントローラーにはつながらない）。' +
    '腕の中にアプリケーション用の信号線とエアホースが通っていて、ベース側のコネクター UB と第 3 軸のケーシングのコネクター UA の同じ番号のピンがつながる。' +
    'ハンドのセンサー・電磁弁は UA から信号線ケーブル（片側バラ線）で配線し、ベース側の UB からも信号線ケーブルでコントローラーの汎用入出力（または PLC）へ配線する。' +
    'エアはベースの供給口から第 3 軸のケーシングの出口へ出る。動作範囲の内側に人が入らないよう、安全柵・ドアスイッチを設けてコントローラーの安全柵の入力につなぐ。',
};

export default def;

import { GP7_USER_KIND, GP7_USER_PINS, text, YRC_CTRL_KIND, YRC_ROBOT_KIND } from '../yaskawa/parts';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * 安川電機 垂直多関節ロボット MOTOMAN-GP7（6 軸、可搬 7kg）。
 *
 * 仕様（安川電機 e-mechatronics・Motoman の製品ページ）: 制御軸 6、可搬質量 7kg（手首部）、最大リーチ 927mm、位置繰返し精度 ±0.01mm、
 * 本体質量 34kg（37kg とする資料もある）、保護構造 IP67（全軸）。床置き・天吊り・壁掛け・傾斜の設置ができる。
 * コントローラーは YRC1000micro（単相 AC200V でも動く）または YRC1000。
 *
 * Conneko での端子:
 * - ベース背面: マニピュレータケーブルのコネクタ X1（動力・エンコーダー。YRC1000micro の X1 へ専用ケーブル 1 本）、
 *   内部ユーザ配線のコネクタ（ベース側）、エア供給口
 * - U アームのケーシング: 内部ユーザ配線のコネクタ（U アーム側）、エア出口
 * - 内部ユーザ配線は、ベース側と U アーム側の同じ番号のピンが腕の中の電線でつながっている（ハンドのセンサー・電磁弁の配線に使う。
 *   芯数 17 は推定）。エアもベースの供給口から U アームの出口へ通じる。
 *
 * 見た目: 横から見た姿（L アームを立て、U アームを前へ水平に伸ばし、手首のフランジを下へ向けた姿勢）。1mm ≒ 0.3px に縮めて描いた。
 * 安川電機のロボットの青（ヤスカワブルー）、L 軸の丸いモーターのカバー、U アームの後ろの U 軸モーター、筒形の U アームと手首。
 * 各部の形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 270;
const H = 310;

/** L 軸・U 軸・B 軸の中心 */
const JL = { x: 104, y: 196 };
const JU = { x: 104, y: 78 };
const JB = { x: 222, y: 78 };

/** ベース背面のコネクタパネル */
const PANEL_X = 30;
const Y_X1 = 254;
const Y_USER_B = 270;
const Y_AIR_IN = 284;
/** U アームのケーシングの上面 */
const TOP_Y = 44;
const X_USER_U = 66;
const X_AIR_OUT = 82;

const C = { light: '#5a9fe8', base: '#1a68c4', dark: '#0c4a92', edge: '#073a73' };

/** 六角穴付きボルトの頭 */
const bolt = (x: number, y: number, r = 1.5) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#gp-bolt-{{uid}})" stroke="#00000066" stroke-width="0.35"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#1c2a3a" opacity="0.8"/>`;
const boltRing = (cx: number, cy: number, r: number, n: number, start = 0, br = 1.3) =>
  Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return bolt(Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10, br);
  }).join('');

/** 円筒・丸みのある面の陰影 */
const cyl = (id: string, x2: number, y2: number) => `
    <linearGradient id="${id}-{{uid}}" x1="0" y1="0" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="${C.dark}"/>
      <stop offset="0.16" stop-color="${C.base}"/>
      <stop offset="0.34" stop-color="${C.light}"/>
      <stop offset="0.5" stop-color="${C.base}"/>
      <stop offset="0.85" stop-color="${C.base}"/>
      <stop offset="1" stop-color="${C.dark}"/>
    </linearGradient>`;

const svg = `
  <defs>
    ${cyl('gp-h', 1, 0)}
    ${cyl('gp-v', 0, 1)}
    <radialGradient id="gp-cap-{{uid}}" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="${C.light}"/>
      <stop offset="0.55" stop-color="${C.base}"/>
      <stop offset="1" stop-color="${C.dark}"/>
    </radialGradient>
    <radialGradient id="gp-ao-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="#000" stop-opacity="0.3"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="gp-bolt-{{uid}}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="1" stop-color="#7d8288"/>
    </radialGradient>
    <linearGradient id="gp-steel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d9298"/>
      <stop offset="0.4" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#767b81"/>
    </linearGradient>
    <linearGradient id="gp-steel-h-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7c8187"/>
      <stop offset="0.35" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="gp-dark-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4e5359"/>
      <stop offset="1" stop-color="#1d2024"/>
    </linearGradient>
    <linearGradient id="gp-gloss-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.5"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 床の影 -->
  <ellipse cx="104" cy="300" rx="84" ry="5.5" fill="#000" opacity="0.14"/>

  <!-- 取付けベース（底板。四隅にアンカーボルト） -->
  <path d="M44 286 H164 L167 297 H41 Z" fill="url(#gp-dark-{{uid}})" stroke="#16181a" stroke-width="0.7"/>
  ${[52, 156].map((x) => bolt(x, 291.5, 2.1)).join('')}

  <!-- S 軸ベース（固定部）: 低い円筒 -->
  <path d="M54 286 V270 Q54 262 62 262 H146 Q154 262 154 270 V286 Z" fill="url(#gp-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <!-- 銘板・注意ラベル -->
  <rect x="122" y="272" width="22" height="9" rx="0.8" fill="url(#gp-steel-{{uid}})" stroke="#6b7076" stroke-width="0.4"/>
  <path d="M125 275 H141 M125 277.6 H136" stroke="#5a5f65" stroke-width="0.5"/>
  <path d="M68 282 L73 273 L78 282 Z" fill="#ffd400" stroke="#111" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M73 276 V279.2" stroke="#111" stroke-width="0.9" stroke-linecap="round"/><circle cx="73" cy="280.6" r="0.5" fill="#111"/>
  ${text(100, 280, 'MOTOMAN', 4.4, '#ffffff', 'middle', 'bold', ' letter-spacing="0.5" opacity="0.9"')}

  <!-- ベース背面のコネクタボックス（X1・内部ユーザ配線・エア供給口） -->
  <path d="M${PANEL_X + 8} 246 H58 Q60 246 60 248 V290 H${PANEL_X + 8} Z" fill="url(#gp-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  <rect x="${PANEL_X}" y="${Y_X1 - 6.5}" width="14" height="13" rx="2" fill="#1a1c1f" stroke="#000" stroke-width="0.5"/>
  <rect x="${PANEL_X + 12}" y="${Y_X1 - 8}" width="5" height="16" rx="1" fill="url(#gp-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  ${text(PANEL_X + 23, Y_X1 + 1.6, 'X1', 4.4, '#e9eaec', 'middle', 'bold')}
  <rect x="${PANEL_X + 1}" y="${Y_USER_B - 4.5}" width="11" height="9" rx="4.5" fill="url(#gp-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <circle cx="${PANEL_X + 6.5}" cy="${Y_USER_B}" r="2.6" fill="#26292c"/>
  ${text(PANEL_X + 22, Y_USER_B + 1.5, 'BC', 4, '#e9eaec', 'middle', 'bold')}
  <rect x="${PANEL_X + 2}" y="${Y_AIR_IN - 2.8}" width="10" height="5.6" rx="0.8" fill="#2c2f33" stroke="#0e0f10" stroke-width="0.45"/>
  <path d="M${PANEL_X + 10} ${Y_AIR_IN - 3.6} h4 v7.2 h-4 z" fill="url(#gp-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  ${text(PANEL_X + 22, Y_AIR_IN + 1.5, 'AIR', 3.8, '#e9eaec', 'middle', 'bold')}

  <!-- S 軸の旋回部: 縦の円筒の胴。上の肩は丸く、L 軸の軸受けが張り出す。ベースとの合わせ目は暗い溝 -->
  <path d="M62 262 V214 Q62 196 76 190 H132 Q146 196 146 214 V262 Z" fill="url(#gp-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <rect x="58" y="259.5" width="92" height="3.4" rx="1.4" fill="#1b2633"/>
  <path d="M64 246 Q104 251 144 246" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M70 252 V206" stroke="url(#gp-gloss-{{uid}})" stroke-width="4" opacity="0.5"/>

  <!-- L アーム（下腕）: 下の端は L 軸の大きな丸、上の端は U 軸の丸。間はまっすぐに細くなる -->
  <circle cx="${JL.x}" cy="${JL.y}" r="36" fill="url(#gp-ao-{{uid}})"/>
  <path d="M${JL.x - 30} ${JL.y + 2} L${JU.x - 19} ${JU.y + 6} A19.5 19.5 0 0 1 ${JU.x + 19} ${JU.y + 6} L${JL.x + 30} ${JL.y + 2} A30 30 0 0 1 ${JL.x - 30} ${JL.y + 2} Z"
        fill="url(#gp-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <!-- 側面のカバーの合わせ目と光沢 -->
  <path d="M${JL.x - 20} ${JL.y - 30} L${JU.x - 12} ${JU.y + 30} Q${JU.x} ${JU.y + 25} ${JU.x + 12} ${JU.y + 30} L${JL.x + 20} ${JL.y - 30} Q${JL.x} ${JL.y - 37} ${JL.x - 20} ${JL.y - 30} Z"
        fill="none" stroke="${C.edge}" stroke-width="0.55" opacity="0.6"/>
  <path d="M${JL.x - 16} ${JL.y - 34} L${JU.x - 9} ${JU.y + 34}" stroke="url(#gp-gloss-{{uid}})" stroke-width="3.2" opacity="0.8" stroke-linecap="round"/>
  ${text(JL.x + 1, 141, 'YASKAWA', 9.5, '#ffffff', 'middle', 'bold', ` transform="rotate(-90 ${JL.x + 1} 141)" font-style="italic" letter-spacing="0.8"`)}
  <!-- L 軸のカバー（ボルトで留めた丸いふた） -->
  <circle cx="${JL.x}" cy="${JL.y}" r="22" fill="url(#gp-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <circle cx="${JL.x}" cy="${JL.y}" r="11" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.65"/>
  ${boltRing(JL.x, JL.y, 18.5, 8, Math.PI / 8)}
  <path d="M${JL.x - 13} ${JL.y - 13} A18 18 0 0 1 ${JL.x + 6} ${JL.y - 17}" fill="none" stroke="#fff" stroke-width="1.5" opacity="0.4" stroke-linecap="round"/>

  <!-- U アームのケーシング: U 軸の後ろに手首のモーターを収めた丸い箱（後ろに大きく張り出す） -->
  <path d="M${JU.x + 24} ${JU.y - 25} H58 Q38 ${JU.y - 25} 38 ${JU.y - 5} V${JU.y + 5} Q38 ${JU.y + 25} 58 ${JU.y + 25} H${JU.x + 24} Z"
        fill="url(#gp-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <!-- 後ろのモーターのカバー（合わせ目とボルト） -->
  <path d="M58 ${JU.y - 25} Q46 ${JU.y - 25} 44 ${JU.y - 12} V${JU.y + 12} Q46 ${JU.y + 25} 58 ${JU.y + 25}" fill="none" stroke="${C.edge}" stroke-width="0.6" opacity="0.7"/>
  <path d="M58 ${JU.y - 25} V${JU.y + 25}" stroke="${C.edge}" stroke-width="0.6" opacity="0.6"/>
  ${[JU.y - 17, JU.y + 17].map((y) => bolt(52, y, 1.15)).join('')}
  <path d="M60 ${JU.y - 19} H${JU.x + 20}" stroke="url(#gp-gloss-{{uid}})" stroke-width="2.4" opacity="0.7" stroke-linecap="round"/>
  <!-- 内部ユーザ配線のコネクタ・エア出口（ケーシングの上面） -->
  <path d="M${X_USER_U - 9} ${TOP_Y + 5.5} H${X_AIR_OUT + 7} L${X_AIR_OUT + 7} ${JU.y - 25} H${X_USER_U - 9} Z" fill="url(#gp-dark-{{uid}})"/>
  <rect x="${X_USER_U - 6}" y="${TOP_Y + 0.5}" width="12" height="5" rx="2" fill="url(#gp-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <rect x="${X_USER_U - 4.5}" y="${TOP_Y - 1.2}" width="9" height="2.6" rx="1" fill="#26292c"/>
  <rect x="${X_AIR_OUT - 2.8}" y="${TOP_Y + 0.5}" width="5.6" height="5" rx="0.6" fill="url(#gp-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <circle cx="${X_AIR_OUT}" cy="${TOP_Y + 1.6}" r="1.3" fill="#16181a"/>

  <!-- U アーム（R 軸で回る筒。根元は太く、R 軸の境目から先は細い） -->
  <path d="M${JU.x + 22} ${JU.y - 18} H${JU.x + 56} V${JU.y + 18} H${JU.x + 22} Z" fill="url(#gp-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${JU.x + 56} ${JU.y - 14} L${JB.x - 14} ${JB.y - 11} V${JB.y + 11} L${JU.x + 56} ${JU.y + 14} Z" fill="url(#gp-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${JU.x + 56} ${JU.y - 15} V${JU.y + 15}" stroke="#1b2633" stroke-width="2.4"/>
  <path d="M${JU.x + 62} ${JU.y - 8} H${JB.x - 22}" stroke="url(#gp-gloss-{{uid}})" stroke-width="2.2" opacity="0.75" stroke-linecap="round"/>
  ${text(JU.x + 86, JU.y + 4, 'GP7', 7.5, '#ffffff', 'middle', 'bold', ' letter-spacing="0.6"')}

  <!-- U 軸のカバー -->
  <circle cx="${JU.x}" cy="${JU.y}" r="20" fill="url(#gp-ao-{{uid}})"/>
  <circle cx="${JU.x}" cy="${JU.y}" r="16.5" fill="url(#gp-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <circle cx="${JU.x}" cy="${JU.y}" r="8" fill="none" stroke="${C.edge}" stroke-width="0.5" opacity="0.6"/>
  ${boltRing(JU.x, JU.y, 13, 6, Math.PI / 6, 1.15)}
  <path d="M${JU.x - 9} ${JU.y - 9} A13 13 0 0 1 ${JU.x + 5} ${JU.y - 12}" fill="none" stroke="#fff" stroke-width="1.3" opacity="0.4" stroke-linecap="round"/>

  <!-- 手首（B 軸）。二股のハウジングの間で回る。フランジ（T 軸）は下向き -->
  <path d="M${JB.x - 16} ${JB.y - 13} H${JB.x + 2} Q${JB.x + 15} ${JB.y - 13} ${JB.x + 15} ${JB.y} Q${JB.x + 15} ${JB.y + 13} ${JB.x + 2} ${JB.y + 13} H${JB.x - 16} Z"
        fill="url(#gp-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <circle cx="${JB.x}" cy="${JB.y}" r="9" fill="url(#gp-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.6"/>
  ${boltRing(JB.x, JB.y, 6, 4, Math.PI / 4, 0.8)}
  <path d="M${JB.x - 8} ${JB.y + 13} H${JB.x + 8} V${JB.y + 22} H${JB.x - 8} Z" fill="url(#gp-h-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>
  <rect x="${JB.x - 10}" y="${JB.y + 22}" width="20" height="4.5" rx="0.8" fill="url(#gp-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <path d="M${JB.x - 6} ${JB.y + 22.6} V${JB.y + 25.9} M${JB.x + 6} ${JB.y + 22.6} V${JB.y + 25.9}" stroke="#5a5f65" stroke-width="0.6"/>
  `;

const ctrl = YRC_CTRL_KIND.micro;

const terminals: TerminalDef[] = [
  {
    id: 'X1',
    label: 'X1（マニピュレータケーブル）',
    hint: 'ロボット X1',
    note: 'ベース背面のマニピュレータケーブルのコネクタ（モーター動力・ブレーキ・エンコーダー）。コントローラー YRC1000micro の X1 へ、専用のマニピュレータケーブルでつなぐ',
    x: PANEL_X,
    y: Y_X1,
    side: 'left',
    role: 'connector',
    connector: { kind: YRC_ROBOT_KIND.gp7, pins: 0, width: 16, style: 'lan', required: true, mates: [ctrl], defaultCable: 'yaskawa.manipulator-cable.gp7-micro' },
  },
  {
    id: 'BC',
    label: 'BC（内部ユーザ配線 ベース側）',
    hint: 'ユーザ配線',
    note: 'ベース背面の内部ユーザ配線のコネクタ。U アームの同じ番号のピンと腕の中の電線でつながる。コントローラーの入出力・中継の端子台へ配線する',
    x: PANEL_X,
    y: Y_USER_B,
    side: 'left',
    role: 'connector',
    connector: { kind: GP7_USER_KIND, pins: GP7_USER_PINS, width: 10, style: 'round' },
  },
  {
    id: 'AIR',
    label: 'AIR（エア供給口、Rc1/4）',
    hint: 'エア供給',
    note: 'ベース背面のエア供給口。腕の中のエアホースを通って U アームのエア出口へ通じる。使わないときはプラグでふさぐ',
    x: PANEL_X,
    y: Y_AIR_IN,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/4', tubeOD: 8 },
  },
  {
    id: 'UC',
    label: 'UC（内部ユーザ配線 U アーム側）',
    hint: 'ハンド配線',
    note: 'U アームの内部ユーザ配線のコネクタ。ベース側（BC）の同じ番号のピンとつながる。ハンドのセンサー・電磁弁へ、ユーザケーブル（片側バラ線）で配線する',
    x: X_USER_U,
    y: TOP_Y,
    side: 'top',
    role: 'connector',
    connector: { kind: GP7_USER_KIND, pins: GP7_USER_PINS, width: 10, style: 'round' },
  },
  {
    id: 'AIR-OUT',
    label: 'AIR 出口（Rc1/8）',
    hint: 'エア出口',
    note: 'U アームのエア出口（ベースのエア供給口から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'Rc1/8', tubeOD: 6 },
  },
];

const pins: PinDef[] = [];
const links: InternalLink[] = [];
for (let i = 1; i <= GP7_USER_PINS; i++) {
  pins.push(
    { id: `BC#${i}`, label: `ユーザ配線 ${i}`, note: `内部ユーザ配線 ${i}（U アーム側 UC の ${i} へ）`, role: 'pass', optional: true },
    { id: `UC#${i}`, label: `ユーザ配線 ${i}`, note: `内部ユーザ配線 ${i}（ベース側 BC の ${i} へ）`, role: 'pass', optional: true },
  );
  links.push({ from: `BC#${i}`, to: `UC#${i}` });
}

const def: DeviceDefinition = {
  type: 'yaskawa.gp7',
  name: '垂直多関節ロボット',
  model: 'MOTOMAN-GP7',
  maker: '安川電機',
  category: 'load',
  labelPrefix: 'RB',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  airLinks: [{ from: 'AIR', to: 'AIR-OUT' }],
  estimated:
    '内部ユーザ配線の芯数（17）・コネクタの名前（BC・UC）と形、エア供給口・出口のねじと適合チューブの外径、マニピュレータケーブルのコネクタの名前（X1）、外形の寸法は推定',
  description:
    '安川電機の小形の垂直多関節ロボット MOTOMAN-GP7（ハンドリング用。6 軸、可搬質量 7kg、最大リーチ 927mm、位置繰返し精度 ±0.01mm、本体質量 34kg、全軸 IP67）。' +
    'コントローラーは YRC1000micro（単相 AC200V でも動く）。ベース背面の X1 を、ロボットに付属するマニピュレータケーブル（動力・エンコーダー）でコントローラーの X1 へつなぐ（適合しないコントローラーにはつながらない）。' +
    '腕の中に内部ユーザ配線とエアホースが通っていて、ベース側のコネクタ BC と U アームのコネクタ UC の同じ番号のピンがつながる。' +
    'ハンドのセンサー・電磁弁は U アームの UC からユーザケーブル（片側バラ線）で配線し、ベース側の BC からもユーザケーブルでコントローラーの入出力（または PLC）へ配線する。' +
    'エアはベースの供給口から U アームの出口へ出る。動作範囲の内側に人が入らないよう、安全柵・ドアスイッチを設けてコントローラーの安全柵の入力（SAF_F）につなぐ。',
};

export default def;

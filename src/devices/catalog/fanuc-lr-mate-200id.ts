import { CTRL_KIND, EE12_KIND, EE12_PINS, PAINTS, ROBOT_KIND, robotRp1Pins, rm1Connector, rp1Connector, text, type PaintKey } from '../fanuc/parts';
import type { DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * ファナック 垂直多関節ロボット LR Mate 200iD（標準 6 軸、可搬 7kg）。
 *
 * 仕様（ファナックのカタログ・製品ページ）: 制御軸 6、可搬質量 7kg（手首部）、リーチ 717mm、繰返し位置決め精度 ±0.01mm
 * （旧資料では ±0.02mm）、機構部質量 25kg、J1 の動作範囲 340°・最高速度 450°/s、設置は床置き・天吊り・傾斜角。
 * 適合コントローラーは R-30iB Mate / Mate Plus / Mini Plus（Conneko では R-30iB Mini Plus とつなぐ）。
 * 塗装はファナックイエローが標準（クリーン仕様 /7C などは白塗装）。
 *
 * 端子（LR Mate 200iD 機構部取扱説明書 B-83494 の外部配線の図の項目名による）:
 * - ベース背面の J1 コネクターパネル: RM1（モーター動力・ブレーキ）、RP1（パルスコーダ・ロボット I/O）、エア供給口 2 個（Rc1/4）
 * - J3 ケーシング: エンドエフェクタ用 I/O コネクター EE（12 ピン。RI1〜RI6・RO7・RO8・+24V・0V）、エア出口 2 個（M5）
 * - エアはベースの供給口から腕の中の φ6 チューブ（AIR1 黒・AIR2 白）を通って J3 ケーシングの出口へ通じる（電磁弁なしの仕様）
 *
 * 見た目: 横から見た姿（J2 の腕を立て、J3 の腕を前へ水平に伸ばし、手首のフランジを下へ向けた姿勢）。盤外の大型機器なので 1mm ≒ 0.3px に縮めて描いた。
 * 各部の形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 250;
const H = 300;

/** J2・J3・J5 の軸の中心 */
const J2 = { x: 100, y: 184 };
const J3 = { x: 100, y: 70 };
const J5 = { x: 205, y: 70 };

/** ベース背面のコネクターパネルの端子の位置 */
const PANEL_X = 34;
const Y_RM1 = 224;
const Y_RP1 = 240;
const Y_AIR1 = 256;
const Y_AIR2 = 268;
/** J3 ケーシングの上面の端子の位置 */
const TOP_Y = 40;
const X_EE = 62;
const X_AIR1_OUT = 75;
const X_AIR2_OUT = 86;

const paintOf = (p: ParamValues) => PAINTS[(String(p.paint) in PAINTS ? String(p.paint) : 'yellow') as PaintKey];

/** 六角穴付きボルトの頭 */
const bolt = (x: number, y: number, r = 1.6) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#lrm-bolt-{{uid}})" stroke="#00000055" stroke-width="0.35"/><circle cx="${x}" cy="${y}" r="${r * 0.45}" fill="#2a2a2a" opacity="0.75"/>`;

/** 円周上に並べたボルト */
const boltRing = (cx: number, cy: number, r: number, n: number, start = 0, br = 1.4) =>
  Array.from({ length: n }, (_, i) => {
    const a = start + (i * 2 * Math.PI) / n;
    return bolt(Math.round((cx + r * Math.cos(a)) * 10) / 10, Math.round((cy + r * Math.sin(a)) * 10) / 10, br);
  }).join('');

const svg = (p: ParamValues) => {
  const c = paintOf(p);
  // 円筒・丸みのある面の陰影（縁を暗く、少し手前に明るい帯）
  const cyl = (id: string, x1: number, y1: number, x2: number, y2: number) => `
    <linearGradient id="${id}-{{uid}}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">
      <stop offset="0" stop-color="${c.dark}"/>
      <stop offset="0.18" stop-color="${c.base}"/>
      <stop offset="0.36" stop-color="${c.light}"/>
      <stop offset="0.5" stop-color="${c.base}"/>
      <stop offset="0.86" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </linearGradient>`;
  return `
  <defs>
    ${cyl('lrm-h', 0, 0, 1, 0)}
    ${cyl('lrm-v', 0, 0, 0, 1)}
    <radialGradient id="lrm-cap-{{uid}}" cx="0.38" cy="0.32" r="0.8">
      <stop offset="0" stop-color="${c.light}"/>
      <stop offset="0.55" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </radialGradient>
    <radialGradient id="lrm-ao-{{uid}}" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0.7" stop-color="#000" stop-opacity="0.28"/>
      <stop offset="1" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lrm-bolt-{{uid}}" cx="0.35" cy="0.3" r="0.8">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="1" stop-color="#7d8288"/>
    </radialGradient>
    <linearGradient id="lrm-steel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d9298"/>
      <stop offset="0.4" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#767b81"/>
    </linearGradient>
    <linearGradient id="lrm-steel-h-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7c8187"/>
      <stop offset="0.35" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#6f747a"/>
    </linearGradient>
    <linearGradient id="lrm-dark-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#55595f"/>
      <stop offset="1" stop-color="#202326"/>
    </linearGradient>
    <linearGradient id="lrm-gloss-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity="0"/>
      <stop offset="0.5" stop-color="#fff" stop-opacity="0.55"/>
      <stop offset="1" stop-color="#fff" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <!-- 床の影 -->
  <ellipse cx="100" cy="290" rx="78" ry="5.5" fill="#000" opacity="0.14"/>

  <!-- 取付けベース（底板） -->
  <path d="M48 277 H152 L155 287 H45 Z" fill="url(#lrm-dark-{{uid}})" stroke="#16181a" stroke-width="0.7"/>
  ${[57, 143].map((x) => bolt(x, 282, 2)).join('')}

  <!-- J1 ベース（固定部）: 下へ少し広がる丸みのある胴 -->
  <path d="M58 277 L61 236 Q62 226 72 225 H128 Q138 226 139 236 L142 277 Z" fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <path d="M60 262 H140" stroke="${c.edge}" stroke-width="0.5" opacity="0.45"/>
  <!-- 銘板 -->
  <rect x="112" y="265" width="20" height="8" rx="0.8" fill="url(#lrm-steel-{{uid}})" stroke="#6b7076" stroke-width="0.4"/>
  <path d="M115 268 H129 M115 270.5 H125" stroke="#5a5f65" stroke-width="0.5"/>
  <!-- 注意ラベル -->
  <path d="M72 274 L77 265 L82 274 Z" fill="#ffd400" stroke="#111" stroke-width="0.7" stroke-linejoin="round"/>
  <path d="M77 268 V271.2" stroke="#111" stroke-width="0.9" stroke-linecap="round"/><circle cx="77" cy="272.6" r="0.5" fill="#111"/>

  <!-- ベース背面のコネクターパネル（RM1・RP1・エア供給口） -->
  <path d="M${PANEL_X + 7} 214 H62 L60 276 H${PANEL_X + 7} Z" fill="url(#lrm-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${[Y_RM1, Y_RP1].map((y, i) => `
  <rect x="${PANEL_X}" y="${y - 5.5}" width="12" height="11" rx="1.6" fill="#1a1c1f" stroke="#000" stroke-width="0.5"/>
  <rect x="${PANEL_X + 10}" y="${y - 7}" width="5" height="14" rx="1" fill="url(#lrm-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  ${bolt(PANEL_X + 18.5, y - 5, 0.9)}${bolt(PANEL_X + 18.5, y + 5, 0.9)}
  ${text(PANEL_X + 22.5, y + 1.8, i === 0 ? 'RM1' : 'RP1', 4.2, '#e9eaec', 'middle', 'bold')}`).join('')}
  ${[Y_AIR1, Y_AIR2].map((y, i) => `
  <rect x="${PANEL_X + 2}" y="${y - 2.8}" width="10" height="5.6" rx="0.8" fill="#2c2f33" stroke="#0e0f10" stroke-width="0.45"/>
  <path d="M${PANEL_X + 10} ${y - 3.6} h4 v7.2 h-4 z" fill="url(#lrm-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  ${text(PANEL_X + 22, y + 1.5, `${i + 1}`, 4, '#e9eaec', 'middle', 'bold')}`).join('')}

  <!-- J1 旋回部（J2 の軸受けの胴）。ベースとの合わせ目は暗い溝 -->
  <path d="M64 226 V200 Q64 160 100 156 Q136 160 136 200 V226 Z" fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <rect x="61" y="224" width="78" height="3.2" rx="1.2" fill="#3b3e42"/>
  <path d="M70 214 Q100 219 130 214" fill="none" stroke="${c.edge}" stroke-width="0.5" opacity="0.5"/>

  <!-- J2 アーム（下腕）: 上へ少し細くなる。J2 側は軸受けの陰に入る -->
  <path d="M${J2.x - 18} ${J2.y - 4} L${J3.x - 14} ${J3.y + 6} Q${J3.x} ${J3.y - 9} ${J3.x + 14} ${J3.y + 6} L${J2.x + 18} ${J2.y - 4} Z"
        fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <!-- 側面のカバーの合わせ目 -->
  <path d="M${J2.x - 12} ${J2.y - 36} L${J3.x - 9} ${J3.y + 30} Q${J3.x} ${J3.y + 24} ${J3.x + 9} ${J3.y + 30} L${J2.x + 12} ${J2.y - 36} Q${J2.x} ${J2.y - 31} ${J2.x - 12} ${J2.y - 36} Z"
        fill="none" stroke="${c.edge}" stroke-width="0.5" opacity="0.55"/>
  <path d="M${J2.x - 8} ${J2.y - 40} L${J3.x - 6} ${J3.y + 34}" stroke="url(#lrm-gloss-{{uid}})" stroke-width="3" opacity="0.8" stroke-linecap="round"/>
  ${text(J2.x + 2, 128, 'FANUC', 11.5, c.logo, 'middle', 'bold', ` transform="rotate(-90 ${J2.x + 2} 128)" letter-spacing="1.2"`)}

  <!-- J2 軸のカバー（モーターの丸いふた）と、腕の付け根の陰 -->
  <circle cx="${J2.x}" cy="${J2.y}" r="31" fill="url(#lrm-ao-{{uid}})"/>
  <circle cx="${J2.x}" cy="${J2.y}" r="26" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <circle cx="${J2.x}" cy="${J2.y}" r="20.5" fill="none" stroke="${c.edge}" stroke-width="0.55" opacity="0.6"/>
  <circle cx="${J2.x}" cy="${J2.y}" r="11" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.5" opacity="0.9"/>
  ${boltRing(J2.x, J2.y, 23.3, 8, Math.PI / 8)}
  <path d="M${J2.x - 15} ${J2.y - 16} A22 22 0 0 1 ${J2.x + 8} ${J2.y - 21}" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.45" stroke-linecap="round"/>

  <!-- J3 ケーシング（肘。後ろに J3 モーターの張り出し。上面に EE コネクター・エア出口） -->
  <path d="M${J3.x + 6} ${J3.y - 26} H64 Q48 ${J3.y - 26} 48 ${J3.y - 10} V${J3.y + 6} Q48 ${J3.y + 21} 63 ${J3.y + 21} H${J3.x + 6} Z"
        fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <path d="M62 ${J3.y - 26} V${J3.y + 21}" stroke="${c.edge}" stroke-width="0.5" opacity="0.5"/>
  ${[J3.y - 18, J3.y + 13].map((y) => bolt(55, y, 1.2)).join('')}
  <!-- EE コネクター（丸形 12 ピン、キャップ付き） -->
  <rect x="${X_EE - 6}" y="${TOP_Y + 0.5}" width="12" height="4" rx="1" fill="url(#lrm-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <rect x="${X_EE - 4.5}" y="${TOP_Y - 1.2}" width="9" height="2.6" rx="0.8" fill="#26292c"/>
  <!-- エア出口（M5） -->
  ${[X_AIR1_OUT, X_AIR2_OUT].map((x) => `
  <rect x="${x - 2.6}" y="${TOP_Y + 0.5}" width="5.2" height="4" rx="0.6" fill="url(#lrm-steel-{{uid}})" stroke="#4d5257" stroke-width="0.45"/>
  <circle cx="${x}" cy="${TOP_Y + 1.4}" r="1.2" fill="#16181a"/>`).join('')}
  ${text(74, TOP_Y + 11, 'EE  1  2', 4.2, c.logo, 'middle', 'bold', ' opacity="0.75"')}

  <!-- J3 アーム（前腕。J4 で回る筒。手首側が細い） -->
  <path d="M${J3.x + 8} ${J3.y - 15} L${J5.x - 14} ${J5.y - 11} V${J5.y + 11} L${J3.x + 8} ${J3.y + 15} Z" fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <!-- J4 の回転部との境目（暗い溝） -->
  <path d="M${J3.x + 46} ${J3.y - 13.6} V${J3.y + 13.6}" stroke="#3b3e42" stroke-width="2.2"/>
  <path d="M${J3.x + 30} ${J3.y - 9} H${J5.x - 22}" stroke="url(#lrm-gloss-{{uid}})" stroke-width="2.2" opacity="0.75" stroke-linecap="round"/>
  ${text(J3.x + 72, J3.y + 9, 'LR Mate 200<tspan font-style="italic">i</tspan>D', 4.8, c.logo, 'middle', 'bold')}

  <!-- J3 軸のカバー -->
  <circle cx="${J3.x}" cy="${J3.y}" r="25" fill="url(#lrm-ao-{{uid}})"/>
  <circle cx="${J3.x}" cy="${J3.y}" r="21" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <circle cx="${J3.x}" cy="${J3.y}" r="16" fill="none" stroke="${c.edge}" stroke-width="0.5" opacity="0.6"/>
  ${boltRing(J3.x, J3.y, 18.5, 6, Math.PI / 6, 1.2)}
  <path d="M${J3.x - 12} ${J3.y - 12} A17 17 0 0 1 ${J3.x + 6} ${J3.y - 16}" fill="none" stroke="#fff" stroke-width="1.4" opacity="0.45" stroke-linecap="round"/>

  <!-- 手首（J5）。フランジ（J6）は下向き -->
  <path d="M${J5.x - 15} ${J5.y - 12} H${J5.x + 3} Q${J5.x + 14} ${J5.y - 12} ${J5.x + 14} ${J5.y} Q${J5.x + 14} ${J5.y + 12} ${J5.x + 3} ${J5.y + 12} H${J5.x - 15} Z"
        fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="8" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.6"/>
  ${boltRing(J5.x, J5.y, 5.2, 4, Math.PI / 4, 0.8)}
  <path d="M${J5.x - 7} ${J5.y + 12} H${J5.x + 7} V${J5.y + 21} H${J5.x - 7} Z" fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.7"/>
  <rect x="${J5.x - 9}" y="${J5.y + 21}" width="18" height="4.5" rx="0.8" fill="url(#lrm-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <path d="M${J5.x - 5} ${J5.y + 21.6} V${J5.y + 24.9} M${J5.x + 5} ${J5.y + 21.6} V${J5.y + 24.9}" stroke="#5a5f65" stroke-width="0.6"/>
  `;
};

const ctrl = CTRL_KIND.miniPlus;
const kind = ROBOT_KIND.lrMate200iD;

const terminals: TerminalDef[] = [
  {
    id: 'RM1',
    label: 'RM1（モーター動力・ブレーキ）',
    hint: '動力 RM1',
    note: 'ベース背面のロボット接続コネクター。コントローラー R-30iB Mini Plus の RM1 へ、ロボット接続ケーブル（RM1）でつなぐ',
    x: PANEL_X,
    y: Y_RM1,
    side: 'left',
    role: 'connector',
    connector: rm1Connector(kind.rm1, { mates: [ctrl.rm1], defaultCable: 'fanuc.robot-cable-rm1.lrm200id-mini' }),
  },
  {
    id: 'RP1',
    label: 'RP1（パルスコーダ・ロボット I/O）',
    hint: '信号 RP1',
    note: 'ベース背面のロボット接続コネクター。コントローラー R-30iB Mini Plus の RP1 へ、ロボット接続ケーブル（RP1）でつなぐ。EE のロボット I/O（RI/RO・24V・0V）もここを通る',
    x: PANEL_X,
    y: Y_RP1,
    side: 'left',
    role: 'connector',
    connector: rp1Connector(kind.rp1, { mates: [ctrl.rp1], defaultCable: 'fanuc.robot-cable-rp1.lrm200id-mini' }),
  },
  {
    id: 'AIR1',
    label: 'AIR1（エア供給口 1、Rc1/4）',
    hint: 'エア供給 1',
    note: 'ベース背面のエア供給口。腕の中の φ6 チューブ（AIR1、黒）を通って J3 ケーシングのエア出口 1 へ通じる。使わないときはプラグでふさぐ',
    x: PANEL_X,
    y: Y_AIR1,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/4', tubeOD: 6 },
  },
  {
    id: 'AIR2',
    label: 'AIR2（エア供給口 2、Rc1/4）',
    hint: 'エア供給 2',
    note: 'ベース背面のエア供給口。腕の中の φ6 チューブ（AIR2、白）を通って J3 ケーシングのエア出口 2 へ通じる。使わないときはプラグでふさぐ',
    x: PANEL_X,
    y: Y_AIR2,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/4', tubeOD: 6 },
  },
  {
    id: 'EE',
    label: 'EE（エンドエフェクタ用 I/O、12 ピン）',
    hint: 'ハンド I/O',
    note: 'J3 ケーシングのエンドエフェクタ用 I/O コネクター。RI1〜RI6・RO7・RO8・+24V・0V。ハンドのセンサー・電磁弁へ、EE ケーブル（片側バラ線）でつなぐ',
    x: X_EE,
    y: TOP_Y,
    side: 'top',
    role: 'connector',
    connector: { kind: EE12_KIND, pins: 12, width: 10, style: 'round' },
  },
  {
    id: 'AIR1-OUT',
    label: 'AIR1 出口（M5）',
    hint: 'エア出口 1',
    note: 'J3 ケーシングのエア出口 1（ベースのエア供給口 AIR1 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR1_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'M5', tubeOD: 4 },
  },
  {
    id: 'AIR2-OUT',
    label: 'AIR2 出口（M5）',
    hint: 'エア出口 2',
    note: 'J3 ケーシングのエア出口 2（ベースのエア供給口 AIR2 から）。ハンドの電磁弁・エアチャックへ',
    x: X_AIR2_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'M5', tubeOD: 4 },
  },
];

const eePins: PinDef[] = EE12_PINS.map((e) => ({ id: `EE#${e.pin}`, label: `${e.pin} ${e.name}`, note: e.note, role: 'pass', optional: true }));
const pins: PinDef[] = [...robotRp1Pins('RP1'), ...eePins];
/** EE のピンは、ロボットの中の配線で RP1 の同じ信号のピンへ通じる */
const links: InternalLink[] = EE12_PINS.map((e) => ({ from: `EE#${e.pin}`, to: `RP1#${e.rp1}` }));

const def: DeviceDefinition = {
  type: 'fanuc.lr-mate-200id',
  name: '垂直多関節ロボット',
  model: 'LR Mate 200iD',
  modelOf: (p) => (String(p.paint) === 'white' ? 'LR Mate 200iD（白塗装）' : 'LR Mate 200iD'),
  maker: 'ファナック',
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
  params: [
    {
      key: 'paint',
      label: '塗装',
      options: [
        { value: 'yellow', label: '標準（ファナックイエロー）' },
        { value: 'white', label: '白塗装（クリーン仕様・食品向けなど）' },
      ],
      default: 'yellow',
    },
  ],
  estimated:
    'ロボット接続ケーブル RP1 の中のロボット I/O（RI/RO・24V・0V）のピン番号は Conneko の中だけの番号（実機のピン番号は未確認）。' +
    'EE（12 ピン）の割付けは販売店の掲載（機構部取扱説明書の図の引用）による。エア出口のねじ（M5）・適合チューブの外径と、外形の寸法は推定',
  description:
    'ファナックの小形の垂直多関節ロボット LR Mate 200iD（標準タイプ。6 軸、可搬質量 7kg、リーチ 717mm、繰返し位置決め精度 ±0.01mm、機構部質量 25kg、' +
    'J1 の動作範囲 340°・最高速度 450°/s。床置き・天吊り・傾斜角の設置ができる）。コントローラーは R-30iB Mini Plus（単相 AC200〜230V）につなぐ。' +
    'ベース背面の RM1（モーター動力・ブレーキ）と RP1（パルスコーダ・ロボット I/O）を、ロボットに付属するロボット接続ケーブルでコントローラーの RM1・RP1 へつなぐ（適合しないコントローラーにはつながらない）。' +
    'J3 ケーシングのエンドエフェクタ用 I/O コネクター EE（12 ピン）に RI1〜RI6（ロボット入力）・RO7・RO8（ロボット出力、+24V を出すソース形）・+24V・0V が出ており、' +
    'ハンドのセンサー・電磁弁は EE ケーブル（片側バラ線）で配線する（RI/RO はコントローラーの I/O 表に RI・RO として出る）。' +
    'エアはベース背面の供給口 AIR1・AIR2（Rc1/4）から腕の中のチューブを通り、J3 ケーシングのエア出口へ出る。' +
    '動作範囲の内側に人が入らないよう、安全柵・ドアスイッチを設けてコントローラーの安全柵入力（EAS）につなぐ。',
};

export default def;

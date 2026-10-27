import { CTRL_KIND, EE12_KIND, EE12_PINS, fanucLogo, PAINTS, ROBOT_KIND, robotRp1Pins, rm1Connector, rp1Connector, text, type PaintKey } from '../fanuc/parts';
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
 * 見た目: 横から見た姿（J2 の腕を立て、J3 の腕を前へ水平に伸ばした姿勢）。盤外の大型機器なので 1mm ≒ 0.3px に縮めて描いた。
 * 各部の形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 250;
const H = 300;

/** J2・J3・J5 の軸の中心 */
const J2 = { x: 100, y: 186 };
const J3 = { x: 100, y: 68 };
const J5 = { x: 207, y: 68 };

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

const svg = (p: ParamValues) => {
  const c = paintOf(p);
  const white = String(p.paint) === 'white';
  return `
  <defs>
    <linearGradient id="lrm-h-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.dark}"/>
      <stop offset="0.3" stop-color="${c.light}"/>
      <stop offset="0.7" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </linearGradient>
    <linearGradient id="lrm-v-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${c.light}"/>
      <stop offset="0.45" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </linearGradient>
    <radialGradient id="lrm-cap-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="${c.light}"/>
      <stop offset="0.7" stop-color="${c.base}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </radialGradient>
    <radialGradient id="lrm-gray-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#9da2a8"/>
      <stop offset="1" stop-color="#4a4e54"/>
    </radialGradient>
    <linearGradient id="lrm-steel-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d9298"/>
      <stop offset="0.4" stop-color="#e9ebed"/>
      <stop offset="1" stop-color="#7c8187"/>
    </linearGradient>
    <linearGradient id="lrm-dark-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4b4f55"/>
      <stop offset="1" stop-color="#25282c"/>
    </linearGradient>
  </defs>

  <!-- 床の影 -->
  <ellipse cx="100" cy="291" rx="74" ry="5" fill="#000" opacity="0.12"/>

  <!-- 取付けベース（J1 ベースの底板） -->
  <rect x="46" y="272" width="108" height="15" rx="2" fill="url(#lrm-dark-{{uid}})" stroke="#1b1d20" stroke-width="0.8"/>
  ${[54, 82, 118, 146].map((x) => `<circle cx="${x}" cy="279.5" r="2.6" fill="url(#lrm-steel-{{uid}})" stroke="#3a3d41" stroke-width="0.5"/>`).join('')}

  <!-- J1 ベース（固定部） -->
  <path d="M60 222 Q60 212 72 212 H134 Q146 212 146 222 V272 H60 Z" fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <line x1="60" y1="230" x2="146" y2="230" stroke="${c.edge}" stroke-width="0.6" opacity="0.6"/>
  ${text(103, 256, 'LR Mate 200<tspan font-style="italic">i</tspan>D', 6.4, c.logo, 'middle', 'bold')}

  <!-- ベース背面のコネクターパネル（RM1・RP1・エア供給口） -->
  <rect x="${PANEL_X + 6}" y="214" width="26" height="58" rx="2" fill="#c9cdd1" stroke="#6e7378" stroke-width="0.7"/>
  ${[Y_RM1, Y_RP1].map((y, i) => `
  <rect x="${PANEL_X}" y="${y - 6}" width="13" height="12" rx="1.5" fill="url(#lrm-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  <rect x="${PANEL_X + 11}" y="${y - 7.5}" width="5" height="15" rx="1" fill="url(#lrm-steel-{{uid}})" stroke="#555a60" stroke-width="0.5"/>
  ${text(PANEL_X + 25, y + 2.2, i === 0 ? 'RM1' : 'RP1', 5.2, '#1d1f22', 'middle', 'bold')}`).join('')}
  ${[Y_AIR1, Y_AIR2].map((y, i) => `
  <rect x="${PANEL_X + 2}" y="${y - 3.2}" width="10" height="6.4" rx="1" fill="#2a2c2f" stroke="#111" stroke-width="0.5"/>
  <rect x="${PANEL_X + 10}" y="${y - 4}" width="5" height="8" rx="0.8" fill="url(#lrm-steel-{{uid}})" stroke="#555a60" stroke-width="0.5"/>
  ${text(PANEL_X + 25, y + 1.8, `AIR${i + 1}`, 4.2, '#1d1f22', 'middle', 'bold')}`).join('')}

  <!-- J1 旋回部・J2 ハウジング -->
  <path d="M66 214 V184 Q66 160 92 158 H112 Q140 160 140 188 V214 Z" fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <path d="M66 214 H140" stroke="${c.edge}" stroke-width="1.2"/>

  <!-- J2 アーム（上腕） -->
  <path d="M${J2.x - 19} ${J2.y} L${J3.x - 16} ${J3.y + 8} Q${J3.x} ${J3.y - 6} ${J3.x + 16} ${J3.y + 8} L${J2.x + 19} ${J2.y} Z"
        fill="url(#lrm-h-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <path d="M${J2.x - 10} ${J2.y - 26} L${J3.x - 8} ${J3.y + 30}" stroke="#ffffff" stroke-width="2" opacity="${white ? 0.5 : 0.35}" stroke-linecap="round"/>
  ${text(J2.x + 4, 132, 'FANUC', 10, c.logo, 'middle', 'bold', ` transform="rotate(-90 ${J2.x + 4} 132)" letter-spacing="0.6"`)}

  <!-- J2 軸のカバー -->
  <circle cx="${J2.x}" cy="${J2.y}" r="25" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <circle cx="${J2.x}" cy="${J2.y}" r="18" fill="none" stroke="${c.edge}" stroke-width="0.6" opacity="0.7"/>
  <circle cx="${J2.x}" cy="${J2.y}" r="8.5" fill="url(#lrm-gray-{{uid}})" stroke="#2b2e32" stroke-width="0.6"/>
  ${text(J2.x, J2.y + 2.3, 'J2', 6, '#f2f3f4', 'middle', 'bold')}

  <!-- J3 ケーシング（後ろに J3 モーターの張り出し。上面に EE コネクター・エア出口） -->
  <path d="M${J3.x} ${J3.y - 26} H62 Q48 ${J3.y - 26} 48 ${J3.y - 12} V${J3.y + 8} Q48 ${J3.y + 22} 62 ${J3.y + 22} H${J3.x} A24 24 0 0 0 ${J3.x} ${J3.y - 26} Z"
        fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <!-- EE コネクター（丸形 12 ピン） -->
  <rect x="${X_EE - 6.5}" y="${TOP_Y}" width="13" height="4" rx="1" fill="url(#lrm-steel-{{uid}})" stroke="#555a60" stroke-width="0.5"/>
  <rect x="${X_EE - 5}" y="${TOP_Y - 1}" width="10" height="2.5" rx="0.6" fill="#2a2c2f"/>
  ${text(X_EE, TOP_Y + 12, 'EE', 5.4, c.logo, 'middle', 'bold')}
  <!-- エア出口（M5） -->
  ${[X_AIR1_OUT, X_AIR2_OUT].map((x, i) => `
  <rect x="${x - 3}" y="${TOP_Y}" width="6" height="4" rx="0.6" fill="url(#lrm-steel-{{uid}})" stroke="#555a60" stroke-width="0.5"/>
  <circle cx="${x}" cy="${TOP_Y + 1.6}" r="1.4" fill="#1d1f22"/>
  ${text(x, TOP_Y + 11, `${i + 1}`, 4.6, c.logo, 'middle', 'bold')}`).join('')}

  <!-- J3 アーム（前腕。J4 軸） -->
  <path d="M${J3.x + 4} ${J3.y - 15} L${J5.x - 12} ${J5.y - 11} Q${J5.x - 6} ${J5.y - 11} ${J5.x - 6} ${J5.y - 5} V${J5.y + 5} Q${J5.x - 6} ${J5.y + 11} ${J5.x - 12} ${J5.y + 11} L${J3.x + 4} ${J3.y + 15} Z"
        fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <line x1="${J3.x + 52}" y1="${J3.y - 13}" x2="${J3.x + 52}" y2="${J3.y + 13}" stroke="${c.edge}" stroke-width="0.7" opacity="0.7"/>
  ${text(J3.x + 74, J3.y + 2.4, 'J4', 5.4, c.logo, 'middle', 'bold', ' opacity="0.7"')}

  <!-- J3 軸のカバー -->
  <circle cx="${J3.x}" cy="${J3.y}" r="20" fill="url(#lrm-cap-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <circle cx="${J3.x}" cy="${J3.y}" r="7.5" fill="url(#lrm-gray-{{uid}})" stroke="#2b2e32" stroke-width="0.6"/>
  ${text(J3.x, J3.y + 2.2, 'J3', 5.6, '#f2f3f4', 'middle', 'bold')}

  <!-- 手首（J5）と J6 のフランジ -->
  <rect x="${J5.x - 8}" y="${J5.y - 14}" width="18" height="28" rx="7" fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.9"/>
  <circle cx="${J5.x}" cy="${J5.y}" r="6.5" fill="url(#lrm-gray-{{uid}})" stroke="#2b2e32" stroke-width="0.6"/>
  ${text(J5.x, J5.y + 2, 'J5', 5, '#f2f3f4', 'middle', 'bold')}
  <rect x="${J5.x + 10}" y="${J5.y - 10}" width="8" height="20" rx="1.5" fill="url(#lrm-v-{{uid}})" stroke="${c.edge}" stroke-width="0.8"/>
  <rect x="${J5.x + 18}" y="${J5.y - 8}" width="5" height="16" rx="1" fill="url(#lrm-steel-{{uid}})" stroke="#555a60" stroke-width="0.6"/>
  ${text(J5.x + 20.5, J5.y + 18, 'J6', 4.8, '#55595e', 'middle', 'bold')}

  <!-- J1 の印 -->
  ${text(124, 240, 'J1', 6, c.logo, 'middle', 'bold', ' opacity="0.7"')}
  ${white ? '' : fanucLogo(112, 262, 28, 7)}`;
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

import { CTRL_KIND, EE12_KIND, EE12_PINS, PAINTS, ROBOT_KIND, robotRp1Pins, rm1Connector, rp1Connector, text } from '../fanuc/parts';
import { airPortSide, airPortTop, bolt, boltRing, cautionLabel, namePlate, robotDefs, roundConnectorTop, squareConnector } from '../generic/robot-art';
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';

/**
 * ファナック スカラロボット SR-3iA（4 軸、可搬 3kg）。
 *
 * 仕様（ファナックのデータシート・フライヤー）: 制御軸 4（J1・J2 の水平旋回、J3 の上下、J4 の回転）、可搬質量 3kg、水平リーチ 400mm、
 * 繰返し位置決め精度 ±0.01mm、機構部質量 19kg。I/O・DC24V・電磁弁・エアの配管を腕の中に通している。
 * 適合コントローラーは R-30iB Compact Plus（SR-3iA/U などは R-30iB Mate Plus も）。Conneko では R-30iB Compact Plus とつなぐ。
 *
 * Conneko での端子:
 * - ベース背面: RM1（モーター動力・ブレーキ）、RP1（パルスコーダ・ロボット I/O）、エア供給口 AIR1・AIR2
 * - 第 2 アームの先のカバーの上: エンドエフェクタ用 I/O コネクター EE（LR Mate と同じ 12 ピンの割付けとした。推定）、エア出口 AIR1・AIR2
 * - 電磁弁内蔵の仕様は表していない（エアは供給口から出口へそのまま通じる）
 *
 * 見た目: 横から見た姿。ベースの上で第 1 アームが水平に旋回し、その先の第 2 アームの先端を上下・回転するシャフト（ボールねじスプライン）が貫く、
 * スカラロボットとひと目で分かる形にした。1mm ≒ 0.35px。ファナックイエロー。形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 240;
const H = 248;
const P = 'sr3';
const C = PAINTS.yellow;

/** J1・J2 の旋回軸と、J3/J4 のシャフトの x */
const X_J1 = 64;
const X_J2 = 128;
const X_SH = 200;

/** ベース背面のコネクターパネル */
const PANEL_X = 18;
const Y_RM1 = 182;
const Y_RP1 = 196;
const Y_AIR1 = 210;
const Y_AIR2 = 221;
/** 第 2 アームの先のカバーの上面 */
const TOP_Y = 36;
const X_EE = 181;
const X_AIR1_OUT = 211;
const X_AIR2_OUT = 218;

const svg = `
  <defs>${robotDefs(P, C)}</defs>

  <!-- 床の影 -->
  <ellipse cx="${X_J1}" cy="240" rx="54" ry="4.5" fill="#000" opacity="0.14"/>

  <!-- 取付けベース（底板） -->
  <path d="M26 230 H102 L104 238 H24 Z" fill="url(#${P}-dark-{{uid}})" stroke="#16181a" stroke-width="0.7"/>
  ${bolt(P, 32, 234, 1.8)}${bolt(P, 96, 234, 1.8)}

  <!-- ベース: 下が少し広い箱。上で第 1 アームを支える -->
  <path d="M34 231 L37 116 Q38 102 50 101 H78 Q90 102 91 116 L94 231 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M36 214 H92" stroke="${C.edge}" stroke-width="0.5" opacity="0.45"/>
  <path d="M43 118 V206" stroke="url(#${P}-gloss-{{uid}})" stroke-width="4" opacity="0.6"/>
  ${namePlate(P, 66, 218, 20, 8)}
  ${cautionLabel(52, 227, 8)}
  ${text(X_J1, 140, 'SR-3<tspan font-style="italic">i</tspan>A', 6.4, C.logo, 'middle', 'bold', ' letter-spacing="0.3"')}

  <!-- ベース背面のコネクターパネル（RM1・RP1・エア供給口） -->
  <path d="M${PANEL_X + 7} 174 H37 V229 H${PANEL_X + 7} Z" fill="url(#${P}-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${squareConnector(P, PANEL_X, Y_RM1, 10)}
  ${squareConnector(P, PANEL_X, Y_RP1, 9)}
  ${airPortSide(P, PANEL_X, Y_AIR1)}${airPortSide(P, PANEL_X, Y_AIR2)}

  <!-- 第 1 アーム（J1 で水平に旋回する厚い板。両端は丸い）。ベースとの合わせ目は暗い溝 -->
  <rect x="38" y="99" width="52" height="3.2" rx="1.2" fill="#3b3e42"/>
  <path d="M${X_J1 - 30} 80 H${X_J2 + 14} Q${X_J2 + 24} 80 ${X_J2 + 24} 90 Q${X_J2 + 24} 100 ${X_J2 + 14} 100 H${X_J1 - 30} Q${X_J1 - 38} 100 ${X_J1 - 38} 90 Q${X_J1 - 38} 80 ${X_J1 - 30} 80 Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${X_J1 - 24} 84 H${X_J2 + 8}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2" opacity="0.9" stroke-linecap="round"/>
  <!-- J1 の上のふた（ボルト留め） -->
  <path d="M${X_J1 - 18} 80 V76 Q${X_J1 - 18} 72 ${X_J1 - 14} 72 H${X_J1 + 14} Q${X_J1 + 18} 72 ${X_J1 + 18} 76 V80 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>
  ${[X_J1 - 13, X_J1, X_J1 + 13].map((x) => bolt(P, x, 76, 1)).join('')}

  <!-- J2 の継ぎ目（暗い溝）と第 2 アーム -->
  <rect x="${X_J2 - 16}" y="76.5" width="32" height="4" rx="1.4" fill="#3b3e42"/>
  <path d="M${X_J2 - 16} 58 H${X_SH - 30} V77 H${X_J2 - 16} Q${X_J2 - 24} 77 ${X_J2 - 24} 67.5 Q${X_J2 - 24} 58 ${X_J2 - 16} 58 Z"
        fill="url(#${P}-v-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${X_J2 - 14} 62 H${X_SH - 34}" stroke="url(#${P}-gloss-{{uid}})" stroke-width="2" opacity="0.9" stroke-linecap="round"/>
  ${boltRing(P, X_J2, 67.5, 6.5, 6, 0, 0.9)}
  ${text(X_J2 + 23, 71.5, 'FANUC', 8, C.logo, 'middle', 'bold', ' letter-spacing="0.8"')}

  <!-- 第 2 アームの先のカバー（J3・J4 のモーターを収める。上に EE・エア出口） -->
  <path d="M${X_SH - 30} 77 V48 Q${X_SH - 30} 40 ${X_SH - 22} 40 H${X_SH + 16} Q${X_SH + 24} 40 ${X_SH + 24} 48 V77 Q${X_SH + 24} 86 ${X_SH + 14} 86 H${X_SH - 20} Q${X_SH - 30} 86 ${X_SH - 30} 77 Z"
        fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${X_SH - 26} 54 H${X_SH + 20}" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M${X_SH - 24} 58 V80" stroke="url(#${P}-gloss-{{uid}})" stroke-width="3.4" opacity="0.6"/>
  ${[
    [X_SH - 25, 49],
    [X_SH + 19, 49],
    [X_SH - 25, 81],
    [X_SH + 19, 81],
  ]
    .map(([x, y]) => bolt(P, x, y, 1))
    .join('')}
  ${roundConnectorTop(P, X_EE, TOP_Y, 11)}
  ${airPortTop(P, X_AIR1_OUT, TOP_Y)}${airPortTop(P, X_AIR2_OUT, TOP_Y)}

  <!-- J3/J4 のシャフト（ボールねじスプライン）: カバーの上下に突き出る。先端にツールフランジ -->
  <rect x="${X_SH - 4}" y="20" width="8" height="21" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <rect x="${X_SH - 5.5}" y="17" width="11" height="4" rx="1" fill="url(#${P}-dark-{{uid}})" stroke="#111" stroke-width="0.5"/>
  <rect x="${X_SH - 4}" y="86" width="8" height="86" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  ${Array.from({ length: 9 }, (_, i) => `<path d="M${X_SH - 4} ${92 + i * 8.5} H${X_SH + 4}" stroke="#7d8288" stroke-width="0.35" opacity="0.7"/>`).join('')}
  <rect x="${X_SH - 8}" y="86" width="16" height="5" rx="1" fill="url(#${P}-dark-{{uid}})" stroke="#111" stroke-width="0.5"/>
  <rect x="${X_SH - 9}" y="172" width="18" height="5" rx="1" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  <path d="M${X_SH - 5} 172.6 V176.4 M${X_SH + 5} 172.6 V176.4" stroke="#5a5f65" stroke-width="0.6"/>
  `;

const ctrl = CTRL_KIND.compactPlus;
const kind = ROBOT_KIND.sr3iA;

const terminals: TerminalDef[] = [
  {
    id: 'RM1',
    label: 'RM1（モーター動力・ブレーキ）',
    hint: '動力 RM1',
    note: 'ベース背面のロボット接続コネクター。コントローラー R-30iB Compact Plus の RM1 へ、ロボット接続ケーブル（RM1）でつなぐ',
    x: PANEL_X,
    y: Y_RM1,
    side: 'left',
    role: 'connector',
    connector: rm1Connector(kind.rm1, { mates: [ctrl.rm1], defaultCable: 'fanuc.robot-cable-rm1.sr3ia-compact' }),
  },
  {
    id: 'RP1',
    label: 'RP1（パルスコーダ・ロボット I/O）',
    hint: '信号 RP1',
    note: 'ベース背面のロボット接続コネクター。コントローラー R-30iB Compact Plus の RP1 へ、ロボット接続ケーブル（RP1）でつなぐ。EE のロボット I/O もここを通る',
    x: PANEL_X,
    y: Y_RP1,
    side: 'left',
    role: 'connector',
    connector: rp1Connector(kind.rp1, { mates: [ctrl.rp1], defaultCable: 'fanuc.robot-cable-rp1.sr3ia-compact' }),
  },
  {
    id: 'AIR1',
    label: 'AIR1（エア供給口 1）',
    hint: 'エア供給 1',
    note: 'ベース背面のエア供給口。腕の中のチューブを通って第 2 アームの先のエア出口 1 へ通じる',
    x: PANEL_X,
    y: Y_AIR1,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/8', tubeOD: 6 },
  },
  {
    id: 'AIR2',
    label: 'AIR2（エア供給口 2）',
    hint: 'エア供給 2',
    note: 'ベース背面のエア供給口。腕の中のチューブを通って第 2 アームの先のエア出口 2 へ通じる',
    x: PANEL_X,
    y: Y_AIR2,
    side: 'left',
    role: 'air',
    optional: true,
    air: { kind: 'in', thread: 'Rc1/8', tubeOD: 6 },
  },
  {
    id: 'EE',
    label: 'EE（エンドエフェクタ用 I/O、12 ピン）',
    hint: 'ハンド I/O',
    note: '第 2 アームの先のエンドエフェクタ用 I/O コネクター。RI1〜RI6・RO7・RO8・+24V・0V（LR Mate と同じ割付けとした。推定）。ハンドのセンサー・電磁弁へ、EE ケーブル（片側バラ線）でつなぐ',
    x: X_EE,
    y: TOP_Y,
    side: 'top',
    role: 'connector',
    connector: { kind: EE12_KIND, pins: 12, width: 10, style: 'round' },
  },
  {
    id: 'AIR1-OUT',
    label: 'AIR1 出口',
    hint: 'エア出口 1',
    note: '第 2 アームの先のエア出口 1（ベースのエア供給口 AIR1 から）。シャフトの先のハンドへ',
    x: X_AIR1_OUT,
    y: TOP_Y,
    side: 'top',
    role: 'air',
    optional: true,
    air: { kind: 'out', thread: 'M5', tubeOD: 4 },
  },
  {
    id: 'AIR2-OUT',
    label: 'AIR2 出口',
    hint: 'エア出口 2',
    note: '第 2 アームの先のエア出口 2（ベースのエア供給口 AIR2 から）。シャフトの先のハンドへ',
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
  type: 'fanuc.sr-3ia',
  name: 'スカラロボット',
  model: 'SR-3iA',
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
  estimated:
    'EE の有無・ピン数・割付け（LR Mate 200iD と同じ 12 ピンとした）、ロボット接続ケーブル RP1 の中のロボット I/O のピン番号（Conneko の中の番号）、' +
    'エアの配管の系統数・ねじ・適合チューブの外径、コネクターの位置、外形の寸法は推定',
  description:
    'ファナックのスカラロボット SR-3iA（4 軸、可搬質量 3kg、水平リーチ 400mm、繰返し位置決め精度 ±0.01mm、機構部質量 19kg）。' +
    'コントローラーは R-30iB Compact Plus（単相 AC200〜240V）。ベース背面の RM1（モーター動力・ブレーキ）と RP1（パルスコーダ・ロボット I/O）を、ロボット接続ケーブルでコントローラーの RM1・RP1 へつなぐ（適合しないコントローラーにはつながらない）。' +
    '第 2 アームの先のエンドエフェクタ用 I/O コネクター EE（RI1〜RI6・RO7・RO8・+24V・0V）から、シャフトの先のハンドのセンサー・電磁弁へ EE ケーブル（片側バラ線）で配線する（RI/RO はコントローラーの I/O 表に出る）。' +
    'エアはベース背面の供給口から腕の中を通って第 2 アームの先の出口へ出る。動作範囲の内側に人が入らないよう、安全柵・ドアスイッチを設けてコントローラーの安全柵入力（EAS）につなぐ。',
};

export default def;

import { CTRL_KIND, fanucLogo, PAINTS, ROBOT_KIND, robotRp1Pins, rm1Connector, rp1Connector, text } from '../fanuc/parts';
import { bolt, jointCap, namePlate, robotDefs, squareConnector } from '../generic/robot-art';
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * ファナック パラレルリンクロボット M-1iA/0.5A（6 軸、可搬 0.5kg）。
 *
 * 仕様（ファナックのデータシート）: 制御軸 6（パラレルリンクの 3 軸 + 手首 3 軸）、可搬質量 0.5kg（オプションで 1kg）、
 * 動作範囲 φ280mm × 高さ 100mm、繰返し位置決め精度 ±0.02mm（ISO 9283）、機構部質量 23kg（架台なし。2024 年のカタログ）。
 * 架台の天井側に吊り下げて取り付ける。適合コントローラーは R-30iB Mate Plus（R-30iB Plus Mate キャビネット）。
 *
 * Conneko での端子: 本体の上の RM1（モーター動力・ブレーキ）・RP1（パルスコーダ・ロボット I/O）。
 * 手首のハンドへの配線・エアは機種のオプションによって違うため表していない（簡略化）。
 *
 * 見た目: 正面から見た姿。架台の梁に吊った黄色の本体（3 つのモーターのカバー）から 3 本の上腕が斜め下へ伸び、
 * 2 本ずつ平行な細いロッド（下腕）が小さな可動板へ集まる、パラレルリンクロボットとひと目で分かる形にした。
 * 手首は本体の中央から伸びる伸縮する駆動軸で回す。1mm ≒ 0.35px。形・寸法は製品写真の印象から描いたもので、寸法は推定。
 */

const W = 240;
const H = 230;
const P = 'm1';
const C = PAINTS.yellow;
const CX = 120;

/** 本体の上のコネクター */
const PANEL_X = 30;
const Y_RM1 = 13;
const Y_RP1 = 28;

/** ひじ（上腕と下腕のつなぎ目）と可動板 */
const ELBOW_L = { x: 36, y: 118 };
const ELBOW_R = { x: 204, y: 118 };
const ELBOW_C = { x: CX, y: 104 };
const PLATE_Y = 184;

/** 平行な 2 本のロッド（下腕）。端に球面継手 */
const rods = (x1: number, y1: number, x2: number, y2: number, gap: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = (-dy / len) * gap;
  const ny = (dx / len) * gap;
  return [-1, 1]
    .map((s) => {
      const a = { x: x1 + nx * s, y: y1 + ny * s };
      const b = { x: x2 + nx * s, y: y2 + ny * s };
      return `
  <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#1f2226" stroke-width="3.4" stroke-linecap="round"/>
  <line x1="${a.x.toFixed(1)}" y1="${a.y.toFixed(1)}" x2="${b.x.toFixed(1)}" y2="${b.y.toFixed(1)}" stroke="#6b7178" stroke-width="1.2" stroke-linecap="round" opacity="0.8"/>
  <circle cx="${a.x.toFixed(1)}" cy="${a.y.toFixed(1)}" r="2.6" fill="url(#${P}-steel-{{uid}})" stroke="#3d4146" stroke-width="0.5"/>
  <circle cx="${b.x.toFixed(1)}" cy="${b.y.toFixed(1)}" r="2.6" fill="url(#${P}-steel-{{uid}})" stroke="#3d4146" stroke-width="0.5"/>`;
    })
    .join('');
};

/** 上腕（本体のモーターからひじへ。黄色の太い腕） */
const upperArm = (x1: number, y1: number, x2: number, y2: number, w1: number, w2: number) => {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  const nx = -dy / len;
  const ny = dx / len;
  const pts = [
    [x1 + nx * w1, y1 + ny * w1],
    [x2 + nx * w2, y2 + ny * w2],
    [x2 - nx * w2, y2 - ny * w2],
    [x1 - nx * w1, y1 - ny * w1],
  ];
  return `<path d="M${pts.map((q) => `${q[0].toFixed(1)} ${q[1].toFixed(1)}`).join(' L')} Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8" stroke-linejoin="round"/>
  <circle cx="${x2}" cy="${y2}" r="${w2 + 1.5}" fill="url(#${P}-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>`;
};

const svg = `
  <defs>${robotDefs(P, C)}</defs>

  <!-- 架台の梁（天井側。ロボットを吊り下げる） -->
  <rect x="64" y="4" width="166" height="12" rx="1" fill="url(#${P}-steel-{{uid}})" stroke="#5d6268" stroke-width="0.6"/>
  <path d="M64 10 H230" stroke="#8d9298" stroke-width="0.5"/>
  ${[78, 104, 186, 214].map((x) => bolt(P, x, 10, 1.6)).join('')}
  <!-- 取付けフランジ -->
  <rect x="${CX - 48}" y="16" width="96" height="6" rx="1" fill="url(#${P}-dark-{{uid}})" stroke="#111" stroke-width="0.6"/>

  <!-- 手首の駆動軸（本体の中央から可動板へ。伸縮する 2 本の軸と自在継手）: 腕より奥 -->
  ${[CX - 10, CX + 10]
    .map(
      (x, i) => `
  <line x1="${x}" y1="70" x2="${x + (i ? -4 : 4)}" y2="${PLATE_Y - 4}" stroke="#868c93" stroke-width="3.2"/>
  <line x1="${x}" y1="70" x2="${x + (i ? -1.4 : 1.4)}" y2="128" stroke="#c9cdd1" stroke-width="4.4"/>
  <rect x="${x - 3}" y="126" width="6" height="5" rx="1" fill="#55595f"/>`,
    )
    .join('')}

  <!-- 上腕（左・右は斜め下へ、中央は手前へ伸びるので短く見える） -->
  ${upperArm(76, 58, ELBOW_L.x, ELBOW_L.y, 7.5, 5.5)}
  ${upperArm(164, 58, ELBOW_R.x, ELBOW_R.y, 7.5, 5.5)}

  <!-- 本体（3 つのモーターを収めた黄色のハウジング） -->
  <path d="M${CX - 52} 22 H${CX + 52} V44 Q${CX + 52} 62 ${CX + 36} 70 Q${CX} 82 ${CX - 36} 70 Q${CX - 52} 62 ${CX - 52} 44 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  <path d="M${CX - 51} 34 H${CX + 51}" stroke="${C.edge}" stroke-width="0.5" opacity="0.5"/>
  <path d="M${CX - 44} 38 V60" stroke="url(#${P}-gloss-{{uid}})" stroke-width="4" opacity="0.6"/>
  <!-- 左右のモーターのカバー（斜めに張り出す） -->
  ${[-1, 1]
    .map(
      (s) => `
  <g transform="rotate(${s * 34} ${CX + s * 46} 50)">
    <rect x="${CX + s * 46 - 11}" y="38" width="22" height="26" rx="5" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
    <rect x="${CX + s * 46 - 8}" y="62" width="16" height="5" rx="1.5" fill="url(#${P}-dark-{{uid}})"/>
  </g>`,
    )
    .join('')}
  ${fanucLogo(CX - 20, 25, 40, 8)}
  ${namePlate(P, CX + 26, 25, 18, 6.5)}

  <!-- 中央の上腕（手前へ伸びる。モーターの丸いふたが正面に見える） -->
  <path d="M${CX - 9} 66 L${ELBOW_C.x - 7} ${ELBOW_C.y} H${ELBOW_C.x + 7} L${CX + 9} 66 Z" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.8"/>
  ${jointCap(P, C, CX, 54, 14, 6, { inner: 5.5, boltR: 1 })}
  <circle cx="${ELBOW_C.x}" cy="${ELBOW_C.y}" r="7" fill="url(#${P}-cap-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>

  <!-- 下腕（平行な 2 本のロッド） -->
  ${rods(ELBOW_L.x, ELBOW_L.y, CX - 18, PLATE_Y, 4.5)}
  ${rods(ELBOW_R.x, ELBOW_R.y, CX + 18, PLATE_Y, 4.5)}
  ${rods(ELBOW_C.x, ELBOW_C.y + 6, CX, PLATE_Y - 2, 6)}

  <!-- 可動板と手首（3 軸）・ツールフランジ -->
  <path d="M${CX - 24} ${PLATE_Y - 3} H${CX + 24} L${CX + 20} ${PLATE_Y + 6} H${CX - 20} Z" fill="url(#${P}-steel-{{uid}})" stroke="#4d5257" stroke-width="0.6"/>
  <rect x="${CX - 10}" y="${PLATE_Y + 6}" width="20" height="11" rx="3" fill="url(#${P}-h-{{uid}})" stroke="${C.edge}" stroke-width="0.7"/>
  <rect x="${CX - 6}" y="${PLATE_Y + 17}" width="12" height="6" rx="1.5" fill="url(#${P}-dark-{{uid}})"/>
  <rect x="${CX - 8}" y="${PLATE_Y + 23}" width="16" height="4" rx="0.8" fill="url(#${P}-steel-h-{{uid}})" stroke="#4d5257" stroke-width="0.5"/>
  ${text(CX + 34, PLATE_Y + 18, 'M-1<tspan font-style="italic">i</tspan>A', 6.4, '#4b5056', 'start', 'bold')}

  <!-- 本体の上のコネクター（RM1・RP1） -->
  <path d="M${PANEL_X + 7} 4 H${CX - 54} V24 L${CX - 50} 30 V36 H${PANEL_X + 7} Z" fill="url(#${P}-dark-{{uid}})" stroke="#15171a" stroke-width="0.6"/>
  ${squareConnector(P, PANEL_X, Y_RM1, 10)}
  ${squareConnector(P, PANEL_X, Y_RP1, 9)}
  `;

const ctrl = CTRL_KIND.matePlus;
const kind = ROBOT_KIND.m1iA;

const terminals: TerminalDef[] = [
  {
    id: 'RM1',
    label: 'RM1（モーター動力・ブレーキ）',
    hint: '動力 RM1',
    note: '本体の上のコネクターボックスのロボット接続コネクター。コントローラー R-30iB Mate Plus の RM1 へ、ロボット接続ケーブル（RM1）でつなぐ',
    x: PANEL_X,
    y: Y_RM1,
    side: 'left',
    role: 'connector',
    connector: rm1Connector(kind.rm1, { mates: [ctrl.rm1], defaultCable: 'fanuc.robot-cable-rm1.m1ia-mate' }),
  },
  {
    id: 'RP1',
    label: 'RP1（パルスコーダ・ロボット I/O）',
    hint: '信号 RP1',
    note: '本体の上のコネクターボックスのロボット接続コネクター。コントローラー R-30iB Mate Plus の RP1 へ、ロボット接続ケーブル（RP1）でつなぐ',
    x: PANEL_X,
    y: Y_RP1,
    side: 'left',
    role: 'connector',
    connector: rp1Connector(kind.rp1, { mates: [ctrl.rp1], defaultCable: 'fanuc.robot-cable-rp1.m1ia-mate' }),
  },
];

const def: DeviceDefinition = {
  type: 'fanuc.m-1ia',
  name: 'パラレルリンクロボット',
  model: 'M-1iA/0.5A',
  maker: 'ファナック',
  category: 'load',
  labelPrefix: 'RB',
  width: W,
  height: H,
  svg,
  terminals,
  pins: robotRp1Pins('RP1'),
  estimated: 'ロボット接続コネクターの位置、ロボット接続ケーブル RP1 の中のロボット I/O のピン番号（Conneko の中の番号。M-1iA では手首へ出していない）、外形の寸法は推定',
  description:
    'ファナックのパラレルリンクロボット M-1iA/0.5A（6 軸。パラレルリンク 3 軸と手首 3 軸、可搬質量 0.5kg（オプションで 1kg）、動作範囲 φ280mm × 高さ 100mm、' +
    '繰返し位置決め精度 ±0.02mm、機構部質量 23kg）。架台に吊り下げて、コンベヤ上の小物の高速なピッキング・整列・組立てに使う。' +
    'コントローラーは R-30iB Mate Plus（単相 AC200〜230V）。本体の上の RM1（モーター動力・ブレーキ）と RP1（パルスコーダ）を、ロボット接続ケーブルでコントローラーの RM1・RP1 へつなぐ' +
    '（適合しないコントローラーにはつながらない）。ハンドへの配線・エアは架台に沿わせて別に引く（Conneko では表していない）。' +
    '動作範囲の内側に人が入らないよう、カバー・安全柵のドアスイッチをコントローラーの安全柵入力（EAS）につなぐ。',
};

export default def;

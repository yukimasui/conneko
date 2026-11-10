import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { sensorCable, type Lead } from '../keyence/sensor-parts';

/**
 * エー・アンド・デイ シングルポイントロードセル LCB03 シリーズ（アルミ製のはかり用ロードセル、4 線式ケーブル + シールド）。
 * 定格容量は params の capacity で選ぶ（型式 LCB03K□□□L / M）。
 *
 * 出典: A&D LCB03 製品ページ・取扱説明書（m_lcb03）、販売店の型式表（モノタロウ・ミスミ・オレンジブック）
 *   ケーブルの芯線: 赤 = 電源（印加電圧）+、白 = 電源 −、緑 = 出力 +、青 = 出力 −、黄 = シールド
 *   定格出力 2mV/V ±10%、推奨印加電圧 DC5〜12V、最大印加電圧 DC15V
 * 入出力抵抗（ブリッジの抵抗）は資料で確かめられず、指示計からの電流は 350Ω 相当（印加電圧 10V で 29mA）とした（推定）。
 * 見た目（梁形のアルミのブロック、ひずみゲージ部の保護、取付ねじ穴）は写真からの概略。
 *
 * 電気の表し方:
 * - 赤・白は指示計のブリッジ電源（EXC+ / EXC−）から受ける電源（role: 'input'、DC2.5〜15V）。DC24V の電源へ直接つなぐと電圧の不一致になる
 * - 緑・青は mV の微小なブリッジ出力。PLC の入力・アナログ入力へは直接つながず、指示計（AD-4402 など）の SIG+ / SIG− へつなぐ
 *   （信号の種類に当てはまるものがないので signal の種類は書いていない。信号線は未接続の指摘の対象外）
 */

const W = 150;
const H = 168;

interface Cap {
  code: string;
  kg: number;
}
const CAPS: Cap[] = [
  { code: 'K003M', kg: 3 },
  { code: 'K006M', kg: 6 },
  { code: 'K010M', kg: 10 },
  { code: 'K030L', kg: 30 },
  { code: 'K035L', kg: 35 },
  { code: 'K060L', kg: 60 },
];
const capOf = (p: ParamValues) => CAPS.find((c) => c.code === String(p.capacity)) ?? CAPS[2];

const leads: Lead[] = [
  { color: 'RD', label: '電源+（EXC+）', role: 'plus' },
  { color: 'WH', label: '電源−（EXC−）', role: 'minus' },
  { color: 'GN', label: '出力+（SIG+）', role: 'out' },
  { color: 'BU', label: '出力−（SIG−）', role: 'out' },
  { color: 'YE', label: 'シールド', role: 'shield' },
];
const cable = sensorCable({ cx: 128, y0: 70, yFan: 128, yEnd: H - 3, pitch: 13, centerX: 92, vmin: 2.5, vmax: 15, leads });

const NOTES: Record<string, string> = {
  RD: '電源（印加電圧）+。指示計の EXC+ へ（4 線式なので指示計側で EXC+ と SEN+ を短絡する）。推奨 DC5〜12V、最大 DC15V',
  WH: '電源（印加電圧）−。指示計の EXC− へ（指示計側で EXC− と SEN− を短絡する）',
  GN: 'ブリッジ出力 +（定格出力 2mV/V）。指示計の SIG+ へ。PLC の入力へは直接つながない',
  BU: 'ブリッジ出力 −。指示計の SIG− へ',
  YE: 'ケーブルのシールド。指示計の SHLD（シールド・フレームグランド）へ',
};

function svg(p: ParamValues) {
  const c = capOf(p);
  return `
  <defs>
    <linearGradient id="lcb-al-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f3f5f7"/>
      <stop offset="0.45" stop-color="#c9ced3"/>
      <stop offset="1" stop-color="#8e959c"/>
    </linearGradient>
  </defs>
  <!-- 取付け面の目安（下側の台・上側の荷重受け） -->
  <rect x="6" y="66" width="50" height="6" fill="#9a8f7e" opacity="0.5"/>
  <rect x="88" y="22" width="56" height="6" fill="#9a8f7e" opacity="0.5"/>
  <text x="8" y="80" font-family="sans-serif" font-size="3.4" fill="#6a604f">固定側</text>
  <text x="104" y="19" font-family="sans-serif" font-size="3.4" fill="#6a604f">荷重（皿）側</text>
  <!-- ロードセル本体（アルミの梁。中央に 2 つの穴をつないだ起歪部） -->
  <rect x="6" y="30" width="138" height="36" rx="2" fill="url(#lcb-al-{{uid}})" stroke="#5e656c" stroke-width="0.9"/>
  <path d="M52 41 H98 A7 7 0 0 1 98 55 H52 A7 7 0 0 1 52 41 Z" fill="#f7f8f9" stroke="#6d747b" stroke-width="0.8"/>
  <circle cx="52" cy="48" r="7" fill="#f7f8f9" stroke="#6d747b" stroke-width="0.8"/>
  <circle cx="98" cy="48" r="7" fill="#f7f8f9" stroke="#6d747b" stroke-width="0.8"/>
  <!-- 取付けねじ穴 -->
  ${[16, 30, 120, 134].map((x) => `<circle cx="${x}" cy="48" r="3" fill="#3a3d40" stroke="#6d747b" stroke-width="0.5"/>`).join('')}
  <!-- ひずみゲージの保護（シリコーン） -->
  <rect x="66" y="31" width="18" height="6" rx="1.5" fill="#e9e2c2" stroke="#a69c70" stroke-width="0.5"/>
  <!-- 銘板 -->
  <rect x="40" y="58" width="70" height="7" rx="0.8" fill="#2a3d6b"/>
  <text x="75" y="63.3" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#fff">A&amp;D LCB03${c.code} ${c.kg}kg</text>
  <!-- ケーブルの出口 -->
  <rect x="122" y="62" width="12" height="9" rx="1.5" fill="#1f2022"/>
  ${cable.svg}
  <text x="${W / 2}" y="8" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">シングルポイントロードセル LCB03・${c.kg}kg・2mV/V</text>`;
}

const terminals = (p: ParamValues): TerminalDef[] =>
  cable.terminals(p).map((t) => {
    const note = NOTES[t.id];
    if (t.id === 'GN' || t.id === 'BU') return { ...t, note, role: 'signal' as const, optional: false };
    if (t.id === 'YE') return { ...t, note, role: 'signal' as const, optional: true };
    return { ...t, note };
  });

const def: DeviceDefinition = {
  type: 'aandd.lcb03',
  name: 'ロードセル（シングルポイント）',
  model: 'LCB03K010M',
  modelOf: (p) => `LCB03${capOf(p).code}`,
  maker: 'エー・アンド・デイ',
  category: 'sensor',
  description:
    'エー・アンド・デイのシングルポイントロードセル LCB03（アルミ製、はかり・計量コンベヤ用）。定格容量は params の capacity（3〜60kg）。定格出力 2mV/V ±10%、推奨印加電圧 DC5〜12V、最大 DC15V。' +
    'ケーブルの芯線は 赤 電源+、白 電源−、緑 出力+、青 出力−、黄 シールド。ウェイングインジケータ（AD-4402 など）の EXC+・EXC−・SIG+・SIG−・SHLD へつなぎ、4 線式なので指示計側で EXC+ と SEN+、EXC− と SEN− を短絡する。' +
    '出力は mV の微小な信号なので、PLC の入力・アナログ入力へ直接つながない（指示計のアナログ出力・比較出力を PLC へ入れる）。DC24V の電源へ直接つながない。',
  labelPrefix: 'LC',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    {
      key: 'capacity',
      label: '定格容量',
      options: CAPS.map((c) => ({ value: c.code, label: `${c.kg}kg（LCB03${c.code}）` })),
      default: 'K010M',
    },
  ],
  // 指示計のブリッジ電源（EXC+ 10V）から 350Ω 相当で流れる電流（推定）
  loadCurrent: 0.029,
  estimated: 'ブリッジの入出力抵抗（350Ω 相当として、印加電圧 10V での電流 29mA とした）と、本体の外形・寸法（写真からの概略）',
};

export default def;

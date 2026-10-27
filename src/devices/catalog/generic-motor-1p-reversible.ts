import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';

/**
 * 単相レバーシブルモーター（コンデンサ運転形の単相誘導電動機、ギヤヘッド付きの小形モーター）。
 * コンベヤ・ターンテーブル・シャッターなど、正転・逆転を頻繁に切り換える小形の駆動に使う（出力 6〜90W 程度）。
 *
 * 結線（コンデンサ運転形の一般的な 3 線式）:
 * - COM（共通）を電源の一方（N）へ、もう一方（L）を正転なら CW、逆転なら CCW へ切り換えてつなぐ。
 * - 運転用のコンデンサ（モーターに付属）は CW-CCW 間につなぐ。この定義ではコンデンサをつないだ状態で描き、端子は COM・CW・CCW・接地の 4 つにする。
 * - CW と CCW へ同時に電源を入れてはいけない（電磁接触器・リレーで切り換えるときはインタロックを取る）。
 * リード線の色はメーカーで違うため、端子は役割の名前（COM・CW・CCW）で表す。
 *
 * 定格電流は出力ごとの代表値（推定）。メーカー・機種で違うため銘板で確かめる。
 */

const W = 230;
const H = 130;
const CY = 70;

/** 出力ごとの定格電流（100V 50Hz の代表値[A]。200V はおよそ半分） */
const RATINGS = [
  { w: 6, amp100: 0.2 },
  { w: 15, amp100: 0.4 },
  { w: 25, amp100: 0.6 },
  { w: 40, amp100: 0.9 },
  { w: 60, amp100: 1.3 },
  { w: 90, amp100: 1.8 },
];
const ratingOf = (p: ParamValues) => RATINGS.find((r) => r.w === Number(p.output)) ?? RATINGS[2];
const volt = (p: ParamValues) => (String(p.voltage) === '200' ? 200 : 100);
const amp = (p: ParamValues) => {
  const r = ratingOf(p);
  return volt(p) === 200 ? +(r.amp100 / 2).toFixed(2) : r.amp100;
};

/** リード線の先の端子（下に出す） */
const LEADS = [
  { id: 'COM', x: 140, color: '#f4f4f4' },
  { id: 'CW', x: 160, color: '#222' },
  { id: 'CCW', x: 180, color: '#c8322a' },
  { id: 'E', x: 200, color: '#3a9a3a' },
];
const LEAD_Y = H - 8;

const svg = (p: ParamValues) => {
  const r = ratingOf(p);
  const v = volt(p);
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#6d7277"/>
      <stop offset="0.35" stop-color="#c9cdd1"/>
      <stop offset="0.6" stop-color="#aab0b5"/>
      <stop offset="1" stop-color="#5c6166"/>
    </linearGradient>
    <linearGradient id="gear-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3d4248"/>
      <stop offset="0.4" stop-color="#7a8087"/>
      <stop offset="1" stop-color="#2e3237"/>
    </linearGradient>
    <linearGradient id="shaft-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8d8d8d"/>
      <stop offset="0.4" stop-color="#f2f2f2"/>
      <stop offset="1" stop-color="#7a7a7a"/>
    </linearGradient>
    <linearGradient id="cap-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#2a3a6a"/>
      <stop offset="0.5" stop-color="#4a63a8"/>
      <stop offset="1" stop-color="#25335c"/>
    </linearGradient>
  </defs>
  <ellipse cx="${W / 2}" cy="${H - 2}" rx="${W / 2 - 20}" ry="2.5" fill="#000" fill-opacity="0.1"/>
  <!-- 出力軸とギヤヘッド -->
  <rect x="6" y="${CY - 5}" width="24" height="10" rx="1.5" fill="url(#shaft-{{uid}})" stroke="#555" stroke-width="0.8"/>
  <rect x="28" y="${CY - 34}" width="40" height="68" rx="3" fill="url(#gear-{{uid}})" stroke="#1d2024" stroke-width="1"/>
  <text x="48" y="${CY + 3}" text-anchor="middle" font-family="sans-serif" font-size="5" font-weight="bold" fill="#e6e6e6" transform="rotate(-90 48 ${CY})">GEAR HEAD</text>
  <!-- モーター（フィン付きの胴） -->
  <rect x="68" y="${CY - 32}" width="96" height="64" rx="4" fill="url(#body-{{uid}})" stroke="#3a3e42" stroke-width="1"/>
  <g stroke="#53585d" stroke-opacity="0.5" stroke-width="1.2">${Array.from({ length: 9 }, (_, i) => `<line x1="74" y1="${CY - 26 + i * 6.5}" x2="158" y2="${CY - 26 + i * 6.5}"/>`).join('')}</g>
  <rect x="164" y="${CY - 28}" width="12" height="56" rx="3" fill="url(#body-{{uid}})" stroke="#3a3e42" stroke-width="1"/>
  <!-- 銘板 -->
  <rect x="78" y="${CY - 15}" width="62" height="30" rx="1.2" fill="#f1f1ee" stroke="#777" stroke-width="0.6"/>
  <text x="109" y="${CY - 7}" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">REVERSIBLE MOTOR</text>
  <text x="109" y="${CY + 2}" text-anchor="middle" font-family="sans-serif" font-size="7" font-weight="bold" fill="#111">${r.w}W 1φ${v}V</text>
  <text x="109" y="${CY + 10}" text-anchor="middle" font-family="sans-serif" font-size="4.4" fill="#333">${amp(p)}A 50/60Hz</text>
  <!-- リード線の口出し -->
  <rect x="150" y="${CY + 28}" width="16" height="8" rx="2" fill="#333"/>
  ${LEADS.map((l) => `<path d="M158 ${CY + 34} C 158 ${CY + 44}, ${l.x} ${CY + 38}, ${l.x} ${LEAD_Y - 6}" stroke="${l.color}" stroke-width="2.4" fill="none"/><path d="M158 ${CY + 34} C 158 ${CY + 44}, ${l.x} ${CY + 38}, ${l.x} ${LEAD_Y - 6}" stroke="#444" stroke-width="0.4" fill="none"/>
  <rect x="${l.x - 3}" y="${LEAD_Y - 6}" width="6" height="8" rx="1" fill="#c8a33e" stroke="#6b5520" stroke-width="0.5"/>`).join('')}
  ${LEADS.map((l) => `<text x="${l.x}" y="${LEAD_Y + 7.5}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#222">${l.id === 'E' ? '⏚' : l.id}</text>`).join('')}
  <!-- 運転用コンデンサ（CW-CCW 間） -->
  <rect x="186" y="16" width="34" height="22" rx="4" fill="url(#cap-{{uid}})" stroke="#1a2440" stroke-width="0.8"/>
  <text x="203" y="26" text-anchor="middle" font-family="sans-serif" font-size="4" font-weight="bold" fill="#fff">CAPACITOR</text>
  <text x="203" y="33" text-anchor="middle" font-family="sans-serif" font-size="3.6" fill="#dde">CW-CCW</text>
  <path d="M195 38 C 195 70, 160 80, 160 ${LEAD_Y - 14}" stroke="#555" stroke-width="1" fill="none" stroke-dasharray="2 1.5"/>
  <path d="M211 38 C 211 70, 180 80, 180 ${LEAD_Y - 14}" stroke="#555" stroke-width="1" fill="none" stroke-dasharray="2 1.5"/>
`;
};

const terminals = (p: ParamValues): TerminalDef[] => {
  const v = volt(p);
  const accepts = { system: 'AC' as const, minVoltage: v * 0.9, maxVoltage: v * 1.1 };
  return [
    { id: 'COM', hint: '共通', note: `共通（電源の N 側へ。単相 AC${v}V）`, x: LEADS[0].x, y: LEAD_Y, side: 'bottom', role: 'input', accepts },
    { id: 'CW', hint: '正転', note: `正転（時計方向）。電源の L 側を入れると正転する（単相 AC${v}V）`, x: LEADS[1].x, y: LEAD_Y, side: 'bottom', role: 'input', accepts },
    {
      id: 'CCW',
      hint: '逆転',
      note: `逆転（反時計方向）。電源の L 側を入れると逆転する（単相 AC${v}V）。一方向だけで使うときはつながなくてよい（コンデンサだけがつながる）`,
      x: LEADS[2].x,
      y: LEAD_Y,
      side: 'bottom',
      role: 'input',
      accepts,
      optional: true,
    },
    { id: 'E', label: '⏚', hint: '接地', note: '保護接地', x: LEADS[3].x, y: LEAD_Y, side: 'bottom', role: 'ground' },
  ] satisfies TerminalDef[];
};

const def: DeviceDefinition = {
  type: 'generic.motor.1p-reversible',
  name: '単相誘導電動機（レバーシブル）',
  model: '1φ レバーシブルモーター',
  modelOf: (p) => `1φ${volt(p)}V ${ratingOf(p).w}W レバーシブルモーター`,
  category: 'load',
  description:
    '単相のレバーシブルモーター（コンデンサ運転形の誘導電動機、ギヤヘッド付き）。COM を電源の N 側、L 側を正転なら CW、逆転なら CCW へつなぎ替えて回す。' +
    '運転用のコンデンサ（付属品）は CW-CCW 間につないだ状態で描いている。CW と CCW に同時に電源を入れてはいけない（切り換えのリレー・電磁接触器にはインタロックを取る）。' +
    '止めた位置で保持するにはブレーキパック・電磁ブレーキ付きの機種を使う。電圧（100V / 200V）と出力（W）は params で選ぶ。',
  labelPrefix: 'M',
  width: W,
  height: H,
  svg,
  terminals,
  params: [
    { key: 'voltage', label: '電圧', options: [{ value: '100', label: '単相 100V' }, { value: '200', label: '単相 200V' }], default: '100' },
    { key: 'output', label: '出力', unit: 'W', options: RATINGS.map((r) => ({ value: r.w, label: `${r.w}W` })), default: 25 },
  ],
  loadCurrent: amp,
  distinctGroups: [
    ['COM', 'CW'],
    ['COM', 'CCW'],
  ],
  schematic: { elements: [{ kind: 'motor', terminals: ['COM', 'CW', 'CCW'] }] },
  estimated: '出力ごとの定格電流は代表値（推定）。リード線の色はメーカーで違うため、端子は役割の名前（COM・CW・CCW）で表した',
};

export default def;

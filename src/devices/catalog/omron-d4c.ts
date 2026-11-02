import type { DeviceDefinition, ParamValues } from '../types';
import { sensorCable } from '../keyence/sensor-parts';
import { text } from '../generic/parts';

/**
 * オムロン 小形リミットスイッチ D4C（シール形、コード引出し VCTF 耐油ケーブル 3m、1c 接点（SPDT）、IP67）。
 * 操作部は params の actuator で選ぶ: D4C-1201（ピン・プランジャ形）/ D4C-1202（ローラ・プランジャ形）/ D4C-1220（ローラ・レバー形）。
 * 図は本体正面（1mm ≒ 1.8px）。上に操作部、下からケーブルが出て、先端の 3 本の芯線を端子にする。
 *
 * 出典: オムロン D4C データシート（CSM_D4C_DS、英文 C123 のコピー）と販売店の型式表
 *   定格: AC250V 5A（抵抗負荷）、DC30V 4A（抵抗負荷）。接点形式 SPDT（1NO / 1NC）、機械的耐久 1000 万回、使用周囲温度 −10〜+70℃
 *   D4C-1202: ローラ・プランジャ（金属ローラ）、OF 11.77N、ケーブル 3m（VCTF 耐油）
 *   線色: 黒 = COM、赤 = NC、白 = NO（オムロンのコード付きリミットスイッチの線色。表示灯付き D4C の配線図・ZC のコード付きと同じ）
 */

const W = 90;
const H = 214;

/** 本体（アルミダイカスト、幅 34mm → 60px） */
const BX = 15;
const BY = 62;
const BW = 60;
const BH = 92;

const ACTUATORS: Record<string, { label: string; svg: string }> = {
  '01': {
    label: 'ピン・プランジャ形',
    svg: `
  <rect x="${BX + BW / 2 - 6}" y="${BY - 18}" width="12" height="20" rx="1" fill="url(#d4cmetal-{{uid}})" stroke="#4a4f54" stroke-width="0.6"/>
  <rect x="${BX + BW / 2 - 3}" y="${BY - 34}" width="6" height="18" rx="2.4" fill="#e9ecef" stroke="#55595e" stroke-width="0.6"/>`,
  },
  '02': {
    label: 'ローラ・プランジャ形',
    svg: `
  <rect x="${BX + BW / 2 - 6}" y="${BY - 18}" width="12" height="20" rx="1" fill="url(#d4cmetal-{{uid}})" stroke="#4a4f54" stroke-width="0.6"/>
  <rect x="${BX + BW / 2 - 4}" y="${BY - 30}" width="8" height="14" fill="#c9cdd1" stroke="#55595e" stroke-width="0.6"/>
  <circle cx="${BX + BW / 2}" cy="${BY - 36}" r="10" fill="url(#d4croller-{{uid}})" stroke="#3a3d40" stroke-width="0.7"/>
  <circle cx="${BX + BW / 2}" cy="${BY - 36}" r="2.4" fill="#5f656b"/>`,
  },
  '20': {
    label: 'ローラ・レバー形',
    svg: `
  <rect x="${BX + BW / 2 - 9}" y="${BY - 16}" width="18" height="18" rx="2" fill="url(#d4cmetal-{{uid}})" stroke="#4a4f54" stroke-width="0.6"/>
  <circle cx="${BX + BW / 2}" cy="${BY - 8}" r="5" fill="#5a6066" stroke="#2c2f32" stroke-width="0.6"/>
  <path d="M${BX + BW / 2} ${BY - 8} L${BX + BW / 2 - 30} ${BY - 40}" stroke="#3a3d40" stroke-width="6" stroke-linecap="round"/>
  <path d="M${BX + BW / 2} ${BY - 8} L${BX + BW / 2 - 30} ${BY - 40}" stroke="#9aa0a6" stroke-width="3.6" stroke-linecap="round"/>
  <circle cx="${BX + BW / 2 - 30}" cy="${BY - 40}" r="11" fill="url(#d4croller-{{uid}})" stroke="#3a3d40" stroke-width="0.7"/>
  <circle cx="${BX + BW / 2 - 30}" cy="${BY - 40}" r="2.6" fill="#5f656b"/>`,
  },
};

const RATING = 'AC250V 5A / DC30V 4A（抵抗負荷）';

const cable = sensorCable({
  cx: BX + BW / 2,
  y0: BY + BH + 8,
  yFan: 176,
  yEnd: H - 4,
  pitch: 14,
  vmin: 0,
  vmax: 250,
  leads: [
    { id: 'COM', color: 'BK', label: 'COM', role: 'out', note: `共通（黒）。COM-NC が b 接点、COM-NO が a 接点。${RATING}` },
    { id: 'NC', color: 'RD', label: 'NC', role: 'out', note: `b 接点（赤）。レバー・プランジャを押していないとき COM と導通。${RATING}` },
    { id: 'NO', color: 'WH', label: 'NO', role: 'out', note: `a 接点（白）。押すと COM と導通。${RATING}` },
  ],
});

const svg = (p: ParamValues) => {
  const a = ACTUATORS[String(p.actuator)] ?? ACTUATORS['02'];
  return `
  <defs>
    <linearGradient id="d4cmetal-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7f858b"/>
      <stop offset="0.3" stop-color="#d3d7db"/>
      <stop offset="0.7" stop-color="#aab0b5"/>
      <stop offset="1" stop-color="#6c7277"/>
    </linearGradient>
    <radialGradient id="d4croller-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#f4f4f4"/>
      <stop offset="0.6" stop-color="#9aa0a6"/>
      <stop offset="1" stop-color="#4f555b"/>
    </radialGradient>
  </defs>
  ${cable.svg}
  ${a.svg}
  <!-- 本体（アルミダイカスト）と取付穴 -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4" fill="url(#d4cmetal-{{uid}})" stroke="#4a4f54" stroke-width="0.9"/>
  ${[BY + 12, BY + BH - 12].map((y) => `<circle cx="${BX + 9}" cy="${y}" r="3.4" fill="#2e3033" stroke="#4a4f54" stroke-width="0.5"/><circle cx="${BX + BW - 9}" cy="${y}" r="3.4" fill="#2e3033" stroke="#4a4f54" stroke-width="0.5"/>`).join('')}
  <rect x="${BX + 14}" y="${BY + 22}" width="${BW - 28}" height="40" rx="1.5" fill="#e8eaec" stroke="#8a8f94" stroke-width="0.4"/>
  ${text(BX + BW / 2, BY + 31, 'OMRON', 5, '#1b3f8f')}
  ${text(BX + BW / 2, BY + 39, `D4C-12${p.actuator}`, 4.4, '#222')}
  ${text(BX + BW / 2, BY + 46, '5A 250VAC', 3.2, '#444', 'normal')}
  ${text(BX + BW / 2, BY + 51, '4A 30VDC', 3.2, '#444', 'normal')}
  ${text(BX + BW / 2, BY + 57, 'IP67', 3.2, '#444', 'normal')}
  <!-- ケーブル引出し口 -->
  <rect x="${BX + BW / 2 - 7}" y="${BY + BH - 1}" width="14" height="10" rx="1.5" fill="#2a2c2f" stroke="#0b0b0c" stroke-width="0.5"/>
  ${text(W / 2, 7, `D4C ${a.label}・1c 接点`, 4.4, '#333', 'normal')}`;
};

const def: DeviceDefinition = {
  type: 'omron.d4c',
  name: 'リミットスイッチ',
  model: 'D4C-1201 / 1202 / 1220（コード 3m）',
  modelOf: (p) => `D4C-12${p.actuator}`,
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの小形リミットスイッチ D4C（シール形、IP67、VCTF 耐油ケーブル 3m の引出し、1c 接点）。操作部は params の actuator（D4C-1201 ピン・プランジャ / D4C-1202 ローラ・プランジャ / D4C-1220 ローラ・レバー）。' +
    `芯線は 黒 = COM、赤 = NC（b 接点）、白 = NO（a 接点）。定格 ${RATING}。` +
    'PLC の入力に使うときは、黒（COM）を +24V（プラスコモンの入力なら 0V）につなぎ、白（NO。検出で ON）か赤（NC。検出で OFF、断線も OFF になる）を入力へつなぐ。使わない芯線は先端を絶縁する。' +
    '安全回路のドアスイッチには直接開路動作の安全リミットスイッチ（D4N など）を使う。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: cable.terminals,
  // 押していない状態で COM-NC が閉、COM-NO が開
  links: [
    { from: 'COM', to: 'NC', switch: 'NC', ratedCurrent: 4 },
    { from: 'COM', to: 'NO', switch: 'NO', ratedCurrent: 4 },
  ],
  params: [
    {
      key: 'actuator',
      label: '操作部（型式）',
      options: [
        { value: '01', label: 'D4C-1201 ピン・プランジャ形' },
        { value: '02', label: 'D4C-1202 ローラ・プランジャ形' },
        { value: '20', label: 'D4C-1220 ローラ・レバー形' },
      ],
      default: '02',
    },
  ],
  schematic: { actuator: 'limit' },
  estimated: '線色（黒 COM・赤 NC・白 NO）は表示灯付きの配線図とオムロンのコード付きリミットスイッチの線色から。D4C-1201・1220 の操作部の形は販売店の型式表による',
};

export default def;

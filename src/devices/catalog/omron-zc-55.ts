import type { DeviceDefinition, ParamValues } from '../types';
import { SCREW_GRADIENT, ncSymbol, noSymbol, screw, text } from '../generic/parts';

/**
 * オムロン 一般用リミットスイッチ ZC（ZC-□55 シリーズ、1c 接点のスナップアクション、ネジ端子、IP67）。
 * 操作部は params の actuator で選ぶ: ZC-Q55（パネル取付けプランジャ形）/ ZC-Q2155（パネル取付けローラ・プランジャ形）。
 * 上に操作部、下にアルミダイカストのスイッチボックスを描き、ボックスのカバーを外して中の端子 COM・NC・NO が見える概念図（1mm ≒ 1.6px）。
 *
 * 出典: オムロン ZC-□55 データシート（CSM_ZC-_55_DS_E）の接点形式図と販売店の型式表
 *   接点形式: SPDT（COM・NC・NO。データシートの図では COM 1・NC 2・NO 4）
 *   定格: AC250V 10A（RS の型式表）。IP67
 *   コード付きの機種の線色は COM 黒・NO 白・NC 赤（ここではネジ端子の機種を定義する）
 */

const W = 110;
const H = 196;

const BX = 20;
const BY = 74;
const BW = 70;
const BH = 112;

/** 端子（上段に COM、下段の左に NC・右に NO。並びは推定） */
const POS: Record<'COM' | 'NC' | 'NO', { x: number; y: number; side: 'left' | 'right' }> = {
  COM: { x: 55, y: 102, side: 'left' },
  NC: { x: 40, y: 152, side: 'left' },
  NO: { x: 70, y: 152, side: 'right' },
};

const ACTUATORS: Record<string, { model: string; label: string; svg: string }> = {
  Q55: {
    model: 'ZC-Q55',
    label: 'パネル取付けプランジャ形',
    svg: `
  <rect x="44" y="40" width="22" height="14" rx="1" fill="url(#zchead-{{uid}})" stroke="#40454a" stroke-width="0.7"/>
  <rect x="40" y="30" width="30" height="7" rx="1" fill="#8d9297" stroke="#40454a" stroke-width="0.6"/>
  <rect x="49" y="16" width="12" height="16" rx="2" fill="#e9ecef" stroke="#55595e" stroke-width="0.7"/>`,
  },
  Q2155: {
    model: 'ZC-Q2155',
    label: 'パネル取付けローラ・プランジャ形',
    svg: `
  <rect x="44" y="40" width="22" height="14" rx="1" fill="url(#zchead-{{uid}})" stroke="#40454a" stroke-width="0.7"/>
  <rect x="40" y="30" width="30" height="7" rx="1" fill="#8d9297" stroke="#40454a" stroke-width="0.6"/>
  <rect x="49" y="24" width="12" height="8" fill="#c9cdd1" stroke="#55595e" stroke-width="0.6"/>
  <circle cx="55" cy="20" r="8.5" fill="url(#zcroller-{{uid}})" stroke="#3a3d40" stroke-width="0.7"/>
  <circle cx="55" cy="20" r="2.2" fill="#5f656b"/>`,
  },
};

const RATING = 'AC250V 10A';

const svg = (p: ParamValues) => {
  const a = ACTUATORS[String(p.actuator)] ?? ACTUATORS.Q2155;
  return `
  <defs>
    <linearGradient id="zcalu-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#7f858b"/>
      <stop offset="0.25" stop-color="#c9cdd1"/>
      <stop offset="0.7" stop-color="#aab0b5"/>
      <stop offset="1" stop-color="#6c7277"/>
    </linearGradient>
    <linearGradient id="zchead-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#6f757b"/>
      <stop offset="0.3" stop-color="#bfc4c8"/>
      <stop offset="1" stop-color="#666c72"/>
    </linearGradient>
    <radialGradient id="zcroller-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#f4f4f4"/>
      <stop offset="0.6" stop-color="#9aa0a6"/>
      <stop offset="1" stop-color="#4f555b"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>
  ${a.svg}
  <!-- ヘッド（取付けナット） -->
  <rect x="32" y="52" width="46" height="24" rx="3" fill="url(#zchead-{{uid}})" stroke="#40454a" stroke-width="0.8"/>
  ${text(55, 67, a.model, 4.4, '#1f2124')}
  <!-- スイッチボックス（カバーを外した状態） -->
  <rect x="${BX}" y="${BY}" width="${BW}" height="${BH}" rx="4" fill="url(#zcalu-{{uid}})" stroke="#4a4f54" stroke-width="0.9"/>
  <rect x="${BX + 6}" y="${BY + 8}" width="${BW - 12}" height="${BH - 24}" rx="2" fill="#1f2022" stroke="#0a0a0b" stroke-width="0.6"/>
  <rect x="${BX + 10}" y="${BY + 13}" width="${BW - 20}" height="${BH - 34}" rx="1.5" fill="#2e3033"/>
  ${screw(POS.COM.x, POS.COM.y, 5, '#b9b4a4')}
  ${screw(POS.NC.x, POS.NC.y, 5, '#b9b4a4')}
  ${screw(POS.NO.x, POS.NO.y, 5, '#b9b4a4')}
  ${text(POS.COM.x, POS.COM.y + 14, 'COM', 4.6, '#f2f2f2')}
  ${text(POS.NC.x, POS.NC.y - 9, 'NC', 4.6, '#ff8a80')}
  ${text(POS.NO.x, POS.NO.y - 9, 'NO', 4.6, '#9be7a6')}
  ${ncSymbol(POS.NC.x - 11, POS.COM.y + 20, '#e8e8e8')}
  ${noSymbol(POS.NO.x + 11, POS.COM.y + 20, '#e8e8e8')}
  <!-- 電線管の口 -->
  <rect x="45" y="${BY + BH - 2}" width="20" height="8" rx="1" fill="#8d9297" stroke="#4a4f54" stroke-width="0.6"/>
  ${text(55, BY + BH - 6, 'OMRON ZC 10A 250VAC', 3.6, '#2a2c2f')}
  ${text(W / 2, 7, `ZC ${a.label}`, 4.2, '#333', 'normal')}`;
};

const def: DeviceDefinition = {
  type: 'omron.zc-55',
  name: 'リミットスイッチ',
  model: 'ZC-Q55 / ZC-Q2155',
  modelOf: (p) => (ACTUATORS[String(p.actuator)] ?? ACTUATORS.Q2155).model,
  maker: 'オムロン',
  category: 'sensor',
  description:
    'オムロンの一般用リミットスイッチ ZC（ZC-□55 シリーズ、スナップアクションの 1c 接点、ネジ端子、IP67）。操作部は params の actuator（ZC-Q55 パネル取付けプランジャ / ZC-Q2155 パネル取付けローラ・プランジャ）。' +
    `端子は COM・NC（b 接点）・NO（a 接点）。定格 ${RATING}（抵抗負荷）。プランジャが押されると COM-NC が開き COM-NO が閉じる。` +
    'PLC の入力には COM を +24V（プラスコモンの入力なら 0V）、NO か NC を入力へつなぐ。安全回路のドアスイッチには直接開路動作の安全リミットスイッチ（D4N など）を使う。',
  labelPrefix: 'LS',
  width: W,
  height: H,
  svg,
  terminals: (['COM', 'NC', 'NO'] as const).map((id) => ({
    id,
    label: id,
    note: id === 'COM' ? `共通。COM-NC が b 接点、COM-NO が a 接点。${RATING}` : `${id === 'NC' ? 'b' : 'a'} 接点（COM と組）。${RATING}`,
    x: POS[id].x,
    y: POS[id].y,
    side: POS[id].side,
    role: 'signal' as const,
    optional: true,
    wire: { methods: ['ring', 'fork', 'ferrule', 'bare'], minSq: 0.5, maxSq: 2 },
  })),
  links: [
    { from: 'COM', to: 'NC', switch: 'NC', ratedCurrent: 10 },
    { from: 'COM', to: 'NO', switch: 'NO', ratedCurrent: 10 },
  ],
  params: [
    {
      key: 'actuator',
      label: '操作部（型式）',
      options: [
        { value: 'Q55', label: 'ZC-Q55 パネル取付けプランジャ形' },
        { value: 'Q2155', label: 'ZC-Q2155 パネル取付けローラ・プランジャ形' },
      ],
      default: 'Q2155',
    },
  ],
  schematic: { actuator: 'limit' },
  estimated: 'スイッチボックスの中の端子 COM・NC・NO の位置、適合電線の太さ（データシートは接点形式のみ）。DC の定格は確かめられず書いていない',
};

export default def;

/**
 * パトライト 積層信号灯 LR シリーズ（LR6 = Φ60、LR4 = Φ40。DC24V、直付け・ケーブル引出し）の機器定義を作る。
 *
 * 横から見た姿で、上から キャップ・（ブザーユニット）・光る段・本体（白）・ケーブルを描き、ケーブルの先で
 * リード線がばらけて下に並ぶ（端子はリード線の先端）。盤の外の機器なので縮小して描く（1mm ≒ 0.8px）。
 *
 * 段数と色は params の colors（型式の末尾の色記号。先頭が最上段）、ブザーの有無は params の buzzer（型式の B / N）で選ぶ。
 * 段数で端子（リード線）の数と高さが変わる。展開図では端子を並べた箱になる（段ごとの表示灯の記号にすると、
 * 共通のコモンが複数の記号に入り「端子は 1 つの要素にだけ入る」の決まりに合わないため）。
 *
 * 出典:
 *   PATLITE LR6 / LR4 の型式構成（販売店・カタログの型式説明）: LR6-[段数][02 = DC24V][WJ = 直付け・ケーブル][B = 点滅・ブザー付き / N = なし][W = 本体色 オフホワイト]-[LED 色 R/Y/G/B/C]
 *   PATLITE カタログの消費電力: LR4-302WJNW・LR6-302WJNW（3 段）とも 3.0W → 1 段あたり約 1W（DC24V で約 42mA）
 *   LR6-WC カタログ: NPN・PNP のどちらの出力でも駆動できる（No polarity）
 *   PATLITE の取扱説明書: リード線の色は LED の発光色を表さない
 * 推定: リード線の色と機能の対応（段 1〜5 = 赤・橙・緑・青・白、ブザー = 紫、コモン = 黒）、段 1 が最上段であること、ブザーの消費電流。
 *   メーカーの資料（取扱説明書の結線図）を入手できず確かめられなかった。点滅を選ぶ線（点滅付きの B 形）は描いていない。
 */
import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { text } from './parts';

export type LrSeries = 'LR6' | 'LR4';

/** LED ユニットの色（型式の色記号） */
const LED: Record<string, { label: string; hi: string; mid: string; dark: string }> = {
  R: { label: '赤', hi: '#ff8f80', mid: '#e3241b', dark: '#7d0d08' },
  Y: { label: '黄', hi: '#ffe08a', mid: '#f5a400', dark: '#8a5600' },
  G: { label: '緑', hi: '#9af0a8', mid: '#1aa83a', dark: '#0a5a1c' },
  B: { label: '青', hi: '#9cc4ff', mid: '#1f62d6', dark: '#0b2f78' },
  C: { label: '白（クリア）', hi: '#ffffff', mid: '#eef1f4', dark: '#a9b0b8' },
};

/** 選べる段数と色の組み合わせ（先頭が最上段） */
const COLOR_SETS = ['R', 'RG', 'RY', 'RYG', 'RGB', 'RYGB', 'RYGBC'];

/** リード線（推定の色）。段 1〜5、ブザー、コモン */
const LEADS: Record<string, { color: string; name: string }> = {
  L1: { color: '#d42020', name: '赤' },
  L2: { color: '#f08020', name: '橙' },
  L3: { color: '#20a040', name: '緑' },
  L4: { color: '#2050c0', name: '青' },
  L5: { color: '#f4f4f4', name: '白' },
  BZ: { color: '#8040a8', name: '紫' },
  COM: { color: '#1a1a1a', name: '黒' },
};

/** DC24V ±10%。NPN（コモン = +24V）・PNP（コモン = 0V）のどちらの配線でもよいので極性は問わない */
const ACC = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };

/** 1 段あたりの電流[A]（カタログの 3 段 3.0W から）とブザーの電流[A]（推定） */
const TIER_CURRENT = 0.042;
const BUZZER_CURRENT = 0.05;

const SERIES = {
  LR6: { dia: 48, tier: 32, cap: 12, buzzer: 20, body: 34, label: 'Φ60' },
  LR4: { dia: 34, tier: 24, cap: 10, buzzer: 16, body: 28, label: 'Φ40' },
};

const PITCH = 16;
const TOP = 4;
const CABLE = 22;
const FAN = 34;
const BOTTOM = 14;

const tiersOf = (p: ParamValues) => String(p.colors ?? 'RYG').split('');
const hasBuzzer = (p: ParamValues) => p.buzzer === 'B';
const leadIds = (p: ParamValues) => ['COM', ...tiersOf(p).map((_, i) => `L${i + 1}`), ...(hasBuzzer(p) ? ['BZ'] : [])];

export function buildPatliteLr(series: LrSeries): DeviceDefinition {
  const s = SERIES[series];
  const towerH = (p: ParamValues) => s.cap + (hasBuzzer(p) ? s.buzzer : 0) + tiersOf(p).length * s.tier + s.body;
  const size = (p: ParamValues) => {
    const n = leadIds(p).length;
    return { width: Math.max(s.dia + 40, n * PITCH + 12), height: TOP + towerH(p) + CABLE + FAN + BOTTOM };
  };
  const leadX = (p: ParamValues, i: number) => {
    const n = leadIds(p).length;
    const w = size(p).width;
    return w / 2 + (i - (n - 1) / 2) * PITCH;
  };

  const svg = (p: ParamValues) => {
    const { width: W, height: H } = size(p);
    const cx = W / 2;
    const r = s.dia / 2;
    const tiers = tiersOf(p);
    const ids = leadIds(p);
    let y = TOP;
    const parts: string[] = [];
    // キャップ（丸い頭）
    parts.push(`<path d="M${cx - r + 2} ${y + s.cap} Q${cx - r + 2} ${y} ${cx} ${y} Q${cx + r - 2} ${y} ${cx + r - 2} ${y + s.cap} Z" fill="url(#body-{{uid}})" stroke="#8d8a80" stroke-width="0.7"/>`);
    y += s.cap;
    // ブザーユニット（音の出るスリット）
    if (hasBuzzer(p)) {
      parts.push(`<rect x="${cx - r}" y="${y}" width="${s.dia}" height="${s.buzzer}" fill="url(#body-{{uid}})" stroke="#8d8a80" stroke-width="0.7"/>`);
      for (let k = 0; k < 3; k++) {
        const sy = y + s.buzzer * (0.3 + k * 0.2);
        parts.push(`<rect x="${cx - r * 0.7}" y="${sy}" width="${r * 1.4}" height="1.4" rx="0.7" fill="#5a5a55"/>`);
      }
      y += s.buzzer;
    }
    // 光る段（色付きの半透明のグローブと中の LED）
    tiers.forEach((c) => {
      parts.push(`<rect x="${cx - r}" y="${y}" width="${s.dia}" height="${s.tier}" fill="url(#led-${c}-{{uid}})" stroke="#555" stroke-width="0.5"/>`);
      parts.push(`<rect x="${cx - r * 0.25}" y="${y + s.tier * 0.18}" width="${r * 0.5}" height="${s.tier * 0.64}" rx="1.5" fill="#fff" opacity="0.28"/>`);
      for (let k = 1; k < 4; k++) parts.push(`<line x1="${cx - r + 3}" y1="${y + (s.tier * k) / 4}" x2="${cx + r - 3}" y2="${y + (s.tier * k) / 4}" stroke="#fff" stroke-opacity="0.16" stroke-width="0.8"/>`);
      parts.push(`<rect x="${cx - r}" y="${y + s.tier - 2}" width="${s.dia}" height="2" fill="#000" opacity="0.18"/>`);
      y += s.tier;
    });
    // 本体と直付けのベース
    parts.push(`<rect x="${cx - r}" y="${y}" width="${s.dia}" height="${s.body - 6}" fill="url(#body-{{uid}})" stroke="#8d8a80" stroke-width="0.7"/>`);
    parts.push(text(cx, y + 10, 'PATLITE', s.dia > 40 ? 5.2 : 4.2, '#444'));
    parts.push(text(cx, y + 17, series, 4.4, '#666', 'normal'));
    parts.push(`<rect x="${cx - r - 4}" y="${y + s.body - 6}" width="${s.dia + 8}" height="6" rx="1.5" fill="url(#body-{{uid}})" stroke="#8d8a80" stroke-width="0.7"/>`);
    y += s.body;
    // ケーブル（黒いシース）とリード線
    const split = y + CABLE;
    parts.push(`<rect x="${cx - 3.5}" y="${y}" width="7" height="${CABLE + 2}" rx="2" fill="#2a2a2a"/>`);
    const tipY = H - BOTTOM;
    const leads = ids
      .map((id, i) => {
        const x = leadX(p, i);
        const c = LEADS[id];
        return `<path d="M${cx} ${split} C${cx} ${split + FAN * 0.5} ${x} ${tipY - FAN * 0.5} ${x} ${tipY}" fill="none" stroke="#555" stroke-width="3.6"/>
  <path d="M${cx} ${split} C${cx} ${split + FAN * 0.5} ${x} ${tipY - FAN * 0.5} ${x} ${tipY}" fill="none" stroke="${c.color}" stroke-width="2.4"/>
  <rect x="${x - 1.6}" y="${tipY - 1}" width="3.2" height="5" fill="#c8a24a" stroke="#7a6220" stroke-width="0.3"/>
  ${text(x, tipY + 11, c.name, 4.4, '#333')}`;
      })
      .join('');
    parts.push(`<rect x="${cx - 4.5}" y="${split - 3}" width="9" height="6" rx="1.5" fill="#1a1a1a"/>`);
    // 段の番号（左）
    let ty = TOP + s.cap + (hasBuzzer(p) ? s.buzzer : 0);
    const tierLabels = tiers
      .map((c, i) => {
        const t = text(cx - r - 3, ty + s.tier / 2 + 2, `${i + 1}`, 5, '#555', 'bold', 'end') + text(cx + r + 3, ty + s.tier / 2 + 2, c, 5, '#555', 'bold', 'start');
        ty += s.tier;
        return t;
      })
      .join('');
    const bzLabel = hasBuzzer(p) ? text(cx + r + 3, TOP + s.cap + s.buzzer / 2 + 2, 'BZ', 4.6, '#555', 'bold', 'start') : '';
    const gradients = Object.entries(LED)
      .map(
        ([k, c]) => `
    <linearGradient id="led-${k}-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${c.dark}"/>
      <stop offset="0.35" stop-color="${c.mid}"/>
      <stop offset="0.55" stop-color="${c.hi}"/>
      <stop offset="0.8" stop-color="${c.mid}"/>
      <stop offset="1" stop-color="${c.dark}"/>
    </linearGradient>`,
      )
      .join('');
    return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#b9b5a8"/>
      <stop offset="0.4" stop-color="#f2efe6"/>
      <stop offset="0.6" stop-color="#fbf9f3"/>
      <stop offset="1" stop-color="#b3afa2"/>
    </linearGradient>${gradients}
  </defs>
  ${parts.join('\n  ')}
  ${leads}
  ${tierLabels}
  ${bzLabel}`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const tipY = size(p).height - BOTTOM;
    return leadIds(p).map((id, i) => {
      const c = LEADS[id];
      const x = leadX(p, i);
      const base = { id, label: c.name, x, y: tipY, side: 'bottom' as const, role: 'input' as const, accepts: ACC };
      if (id === 'COM') return { ...base, hint: 'コモン', note: `コモン（${c.name}線。推定）。NPN 出力で駆動するときは +24V、PNP 出力で駆動するときは 0V につなぐ` };
      if (id === 'BZ') return { ...base, hint: 'ブザー', note: `ブザー（${c.name}線。推定）。コモンとの間に DC24V をかけると鳴る`, optional: true };
      const n = Number(id.slice(1));
      const color = LED[tiersOf(p)[n - 1]].label;
      return { ...base, hint: `${n}段 ${color.slice(0, 1)}`, note: `${n} 段目（上から）の ${color}（${c.name}線。推定）。コモンとの間に DC24V をかけると点灯` };
    });
  };

  const def0: ParamValues = { colors: 'RYG', buzzer: 'N' };
  const { width, height } = size(def0);
  return {
    type: `patlite.${series.toLowerCase()}`,
    name: `積層信号灯（${s.label}）`,
    model: `${series}-□02WJ□W-□`,
    modelOf: (p) => `${series}-${tiersOf(p).length}02WJ${hasBuzzer(p) ? 'B' : 'N'}W-${tiersOf(p).join('')}`,
    maker: 'パトライト',
    category: 'control',
    description:
      `パトライトの積層信号灯 ${series}（${s.label}、LED、DC24V ±10%、直付け・ケーブル引出し、本体オフホワイト）。` +
      '段ごとのリード線とコモンの間に DC24V をかけるとその段が点灯する。PLC のトランジスタ出力（NPN・PNP のどちらでも）やリレー接点で駆動する。' +
      '段数と色は params の colors（先頭が最上段）、ブザー（点滅・ブザー付きの B 形）は params の buzzer で選ぶ。消費電流は 1 段あたり約 42mA（3 段 3.0W から）。' +
      'リード線の色と機能の対応（段 1〜5 = 赤・橙・緑・青・白、ブザー = 紫、コモン = 黒）とブザーの電流は推定（リード線の色は LED の色を表さない）。',
    labelPrefix: 'SL',
    width,
    height,
    size,
    svg,
    terminals,
    params: [
      {
        key: 'colors',
        label: '段数・色（上から）',
        options: COLOR_SETS.map((c) => ({ value: c, label: `${c.length} 段 ${c.split('').map((x) => LED[x].label.slice(0, 1)).join('・')}（${c}）` })),
        default: 'RYG',
      },
      {
        key: 'buzzer',
        label: 'ブザー',
        options: [
          { value: 'N', label: 'なし（N）' },
          { value: 'B', label: '点滅・ブザー付き（B）' },
        ],
        default: 'N',
      },
    ],
    loadCurrent: (p) => +(tiersOf(p).length * TIER_CURRENT + (hasBuzzer(p) ? BUZZER_CURRENT : 0)).toFixed(3),
    estimated: 'リード線の色と機能の対応（段 1〜5 = 赤・橙・緑・青・白、ブザー = 紫、コモン = 黒）、段 1 が最上段であること、ブザーの消費電流（約 50mA）は推定',
  };
}

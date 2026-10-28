/**
 * DIN レール取付の筒形ヒューズ用ヒューズホルダ（10×38mm、1 極幅 18mm）の機器定義を作る。
 * 前面の開閉式キャリア（ヒューズを入れる引出し）を手前に倒すとヒューズが切り離される形。
 * 端子は上が電源側、下が負荷側。端子記号はサーキットプロテクタとそろえ、1P は 1/2、2P は 1・3 / 2・4。
 * 遮断の定格（ヒューズの定格電流）は params の ratedCurrent で選ぶ。
 */
import { poleHint } from '../mitsubishi/pole-hint';
import type { DeviceDefinition, ParamValues } from '../types';
import { SCREW_GRADIENT } from './parts';
import { esc, fitSize, screwTerminal, vShade } from './power-parts';

const POLE_W = 36; // 1 極の幅（18mm × 2px）
const H = 162; // 高さ（81mm × 2px）
const TY_LINE = 17;
const TY_LOAD = H - 17;

/** ヒューズの定格電流[A]（10×38mm の gG / 一般用の代表的な系列） */
export const FUSE_RATINGS = [0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25, 32];
const DEFAULT_RATING = 5;

interface Pole {
  line: string;
  load: string;
  x: number;
}

const polesOf = (n: number): Pole[] =>
  Array.from({ length: n }, (_, i) => ({ line: String(i * 2 + 1), load: String(i * 2 + 2), x: POLE_W * i + POLE_W / 2 }));

/** 1 極分の絵（本体・キャリア・ヒューズの窓・端子） */
const pole = (p: Pole, rating: string) => {
  const x0 = p.x - POLE_W / 2;
  const fs = fitSize(rating, 15, 5.2, 0.6);
  return `
  <!-- 本体 -->
  <rect x="${x0 + 0.75}" y="0.75" width="${POLE_W - 1.5}" height="${H - 1.5}" rx="2.5" fill="url(#body-{{uid}})" stroke="#7f8388" stroke-width="1"/>
  <!-- 端子部（上・下） -->
  <rect x="${x0 + 3}" y="3" width="${POLE_W - 6}" height="28" rx="1.5" fill="#2f3236"/>
  <rect x="${x0 + 3}" y="${H - 31}" width="${POLE_W - 6}" height="28" rx="1.5" fill="#2f3236"/>
  ${screwTerminal(p.x, TY_LINE, 5.6, '#1b1d20')}
  ${screwTerminal(p.x, TY_LOAD, 5.6, '#1b1d20')}
  <text x="${x0 + 5}" y="40" font-family="sans-serif" font-size="6" font-weight="bold" fill="#333">${p.line}</text>
  <text x="${x0 + 5}" y="${H - 34}" font-family="sans-serif" font-size="6" font-weight="bold" fill="#333">${p.load}</text>
  <!-- 開閉式キャリア -->
  <rect x="${x0 + 4}" y="43" width="${POLE_W - 8}" height="${H - 86}" rx="3" fill="url(#carrier-{{uid}})" stroke="#4b4f55" stroke-width="0.8"/>
  <rect x="${x0 + 9}" y="46" width="${POLE_W - 18}" height="7" rx="2" fill="#2a2d31"/>
  <path d="M${x0 + 11} 49.5 H${x0 + POLE_W - 11}" stroke="#6a6f75" stroke-width="1.2" stroke-linecap="round"/>
  <!-- ヒューズの窓（筒形ヒューズが見える） -->
  <rect x="${x0 + 8}" y="57" width="${POLE_W - 16}" height="${H - 108}" rx="2" fill="#1d2024" stroke="#111" stroke-width="0.6"/>
  <rect x="${x0 + 11}" y="59" width="${POLE_W - 22}" height="8" rx="1" fill="url(#cap-{{uid}})"/>
  <rect x="${x0 + 11}" y="${H - 59}" width="${POLE_W - 22}" height="8" rx="1" fill="url(#cap-{{uid}})"/>
  <rect x="${x0 + 11}" y="66" width="${POLE_W - 22}" height="${H - 124}" fill="url(#ceramic-{{uid}})"/>
  <text x="${p.x}" y="${H / 2 + 2}" text-anchor="middle" font-family="sans-serif" font-size="${fs}" font-weight="bold" fill="#222" transform="rotate(-90 ${p.x} ${H / 2})">${rating}</text>
  <!-- 定格の表示 -->
  <text x="${p.x}" y="${H - 38}" text-anchor="middle" font-family="sans-serif" font-size="4.4" font-weight="bold" fill="#4a4e53">10×38</text>`;
};

const svg = (n: number) => (p: ParamValues) => {
  const rating = `${esc(p.ratedCurrent)}A`;
  return `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#a9adb2"/>
      <stop offset="0.15" stop-color="#d9dcdf"/>
      <stop offset="0.85" stop-color="#d6d9dc"/>
      <stop offset="1" stop-color="#a3a7ac"/>
    </linearGradient>
    ${vShade('carrier', '#70757c', '#555a61')}
    <linearGradient id="cap-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8d9196"/>
      <stop offset="0.45" stop-color="#f1f2f3"/>
      <stop offset="1" stop-color="#8d9196"/>
    </linearGradient>
    <linearGradient id="ceramic-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#cfc9b8"/>
      <stop offset="0.45" stop-color="#fbf8ef"/>
      <stop offset="1" stop-color="#c8c1ad"/>
    </linearGradient>
    ${SCREW_GRADIENT}
  </defs>
  ${polesOf(n)
    .map((x) => pole(x, rating))
    .join('')}
`;
};

/** 1P・2P のヒューズホルダ */
export function buildFuseHolder(n: 1 | 2): DeviceDefinition {
  const poles = polesOf(n);
  return {
    type: `generic.fuse-holder.${n}p`,
    name: 'ヒューズホルダ',
    model: `筒形ヒューズ 10×38 ${n}P`,
    modelOf: (p) => `筒形ヒューズ 10×38 ${n}P ${p.ratedCurrent}A`,
    category: 'breaker',
    description:
      n === 1
        ? 'DIN レール取付のヒューズホルダ（1 極）に筒形ヒューズ 10×38mm を入れたもの。制御回路・計器・SPD の分岐などの短絡保護に使う。上が電源側（1）、下が負荷側（2）。キャリアを手前に倒すと回路を切り離せる。'
        : 'DIN レール取付のヒューズホルダ（2 極）に筒形ヒューズ 10×38mm を入れたもの。単相・DC 回路の両極を保護する。上が電源側（1/3）、下が負荷側（2/4）。キャリアを手前に倒すと回路を切り離せる。',
    labelPrefix: 'F',
    width: POLE_W * n,
    height: H,
    svg: svg(n),
    terminals: [
      ...poles.map((p, i) => ({ id: p.line, hint: poleHint(n, i, '一次'), x: p.x, y: TY_LINE, side: 'top' as const, role: 'line' as const })),
      ...poles.map((p, i) => ({ id: p.load, hint: poleHint(n, i, '二次'), x: p.x, y: TY_LOAD, side: 'bottom' as const, role: 'load' as const })),
    ],
    links: poles.map((p) => ({ from: p.line, to: p.load, directed: true, protects: true })),
    params: [
      {
        key: 'ratedCurrent',
        label: 'ヒューズの定格電流',
        unit: 'A',
        options: FUSE_RATINGS.map((v) => ({ value: v, label: `${v}A` })),
        default: DEFAULT_RATING,
      },
    ],
    protectionCurrent: { param: 'ratedCurrent' },
    schematic: { fuse: true },
  };
}

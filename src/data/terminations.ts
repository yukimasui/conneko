/**
 * 電線の端末処理（電線の端を端子につなぐための処理）。
 * 端子の wire.methods（受け入れる端末処理）と比べて、合わない組み合わせを警告する（プッシュイン端子に丸形圧着端子など）。
 */
import type { Termination } from '../devices/types';

export const TERMINATIONS: { id: Termination; name: string; short: string }[] = [
  { id: 'ferrule', name: 'フェルール（棒端子）', short: 'フェルール' },
  { id: 'ring', name: '丸形圧着端子（R 形）', short: '丸形' },
  { id: 'fork', name: 'Y 形圧着端子', short: 'Y 形' },
  { id: 'bare', name: 'むき線（より線・単線をそのまま）', short: 'むき線' },
];

export const terminationName = (id: Termination | undefined) => TERMINATIONS.find((t) => t.id === id)?.name ?? '';
export const terminationShort = (id: Termination | undefined) => TERMINATIONS.find((t) => t.id === id)?.short ?? '';

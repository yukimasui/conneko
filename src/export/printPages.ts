/**
 * 印刷（ブラウザの印刷・PDF）のページの大きさ。
 *
 * 概念図のシートと一覧は印刷の画面で選んだ用紙（余白 8mm）に、展開図のページはそのシートの用紙（余白なし。図面枠は図の中に描いてある）に印刷する。
 * 用紙が混ざるときは、用紙ごとに名前付きのページ（@page 名前 { size: … }）を作り、各ページの CSS の page で選ぶ。
 */
import { PAPER_SIZES } from '../schematic/format';
import type { PaperSize } from '../schematic/model';

export interface Paper {
  width: number;
  height: number;
}

/** 概念図・一覧のページの余白[mm] */
export const PRINT_MARGIN = 8;

/** 用紙（横向き）の印刷できる範囲[mm] */
export function printableArea(paper: PaperSize): { w: number; h: number } {
  const p = PAPER_SIZES[paper];
  return { w: p.width - 2 * PRINT_MARGIN, h: p.height - 2 * PRINT_MARGIN };
}

/** 展開図のページの名前付きページの名前（大きさで決める） */
export const pageNameOf = (p: Paper) => `conneko-${Math.round(p.width)}x${Math.round(p.height)}`;

/** 印刷用の @page の CSS。paper は概念図・一覧の用紙、sheets は展開図のページの用紙 */
export function printPageCss(paper: PaperSize, sheets: Paper[]): string {
  const rules = [`@page { size: ${paper} landscape; margin: ${PRINT_MARGIN}mm; }`];
  const seen = new Set<string>();
  for (const p of sheets) {
    const name = pageNameOf(p);
    if (seen.has(name)) continue;
    seen.add(name);
    rules.push(`@page ${name} { size: ${p.width}mm ${p.height}mm; margin: 0; }`);
  }
  return rules.join('\n');
}

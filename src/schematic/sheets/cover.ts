/**
 * 表紙・図面目次（kind: 'cover'）。図面名・作成者・版と、全ページの目次（ページ・図面名・種類）を書く。
 * 目次はほかのシートのページが決まってから作る。
 */
import type { DiagramSettings } from '../../model/diagram';
import type { SchematicSheetOut } from '../format';
import { flowTables, pageMaker, putLine, putText, type Column } from './table';

export interface CoverEntry {
  page: number;
  name: string;
  kind: string;
}

const COLUMNS: Column[] = [
  { title: 'ページ', width: 18, align: 'center' },
  { title: '図面名', width: 90 },
  { title: '種類', width: 50 },
];

/** 表紙のページ。entries は表紙を含む全ページ（表紙のページ番号も含めて数えたもの） */
export function coverPages(
  sheet: { id: string; name: string },
  settings: DiagramSettings | undefined,
  entries: CoverEntry[],
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const make = pageMaker(sheet, paper);
  const page = make.newPage();
  const { width: W } = paper;
  putText(page, W / 2, 40, settings?.title || '（図面名）', { height: 10, align: 'center', layer: 'TAG' });
  putLine(page, [[W / 2 - 120, 50], [W / 2 + 120, 50]]);
  const info: [string, string][] = [
    ['作成者', settings?.author ?? ''],
    ['版', settings?.revision ?? ''],
    ['ページ数', String(entries.length)],
  ];
  info.forEach(([k, v], i) => {
    putText(page, W / 2 - 60, 60 + i * 8, k, { height: 3.5 });
    putText(page, W / 2 - 25, 60 + i * 8, v, { height: 3.5 });
  });
  flowTables(
    make,
    [{ title: '図面目次', columns: COLUMNS, rows: entries.map((e) => [String(e.page), e.name, e.kind]) }],
    { top: 92, left: (W - COLUMNS.reduce((a, c) => a + c.width, 0)) / 2 },
  );
  return make.pages;
}

/** 表紙が何ページになるか（目次のページ番号を決めるため。目次の行数から求める） */
export function coverPageCount(entryCount: number, paper: { width: number; height: number }): number {
  const firstRows = Math.floor((paper.height - 40 - 92 - 8 - 6) / 6);
  if (entryCount <= firstRows) return 1;
  const perPage = Math.floor((paper.height - 40 - 20 - 8 - 6) / 6);
  return 1 + Math.ceil((entryCount - firstRows) / perPage);
}

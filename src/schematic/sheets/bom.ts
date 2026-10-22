/**
 * 部品表（kind: 'bom'）。図面の機器を型式・仕様ごとにまとめた表（出力の「部品表（CSV）」と同じ内容）。
 */
import type { DefLookup } from '../../check/model';
import { bomRows } from '../../export/reports';
import type { Diagram } from '../../model/diagram';
import type { SchematicSheetOut } from '../format';
import { flowTables, pageMaker, type Column } from './table';

const COLUMNS: Column[] = [
  { title: 'No.', width: 10, align: 'center' },
  { title: '機器名', width: 44 },
  { title: '名称', width: 50 },
  { title: 'メーカー', width: 26 },
  { title: '型式', width: 50 },
  { title: '仕様', width: 60 },
  { title: '数量', width: 12, align: 'center' },
];

export function bomPages(
  sheet: { id: string; name: string },
  diagram: Diagram,
  lookup: DefLookup,
  paper: { width: number; height: number },
): SchematicSheetOut[] {
  const make = pageMaker(sheet, paper);
  const rows = bomRows(diagram, lookup)
    // リンクは部品ではないので入れない
    .filter((r) => r.category !== 'link')
    .map((r, i) => [String(i + 1), r.ids.join(', '), `${r.name}${r.estimated ? '（推定を含む）' : ''}`, r.maker, r.model, r.spec, String(r.qty)]);
  flowTables(make, [{ title: '部品表', columns: COLUMNS, rows }]);
  return make.pages;
}

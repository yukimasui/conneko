/**
 * 東洋技研 PCXV シリーズ（縦型、スプリングロック式 3.5mm ピッチ）の 1:1 コネクタ端子台。
 *
 * レールに対して縦向きに付け、設置幅を小さくしたもの（40 極で幅 43mm × 長さ 75mm）。
 * 左側にコネクタが縦向き（▲のピン 1 が下端）に付き、その右に端子が 2 列（中央の列 TB2 = B1〜B20、右の列 TB1 = A1〜A20）、
 * どちらも下端が 1 番で上へ番号が増える。各端子は左に橙色の開閉ボタン、右に電線挿入孔。
 * 出典: https://www.togi.co.jp/series/interface/213/ （カタログ PCX-1□40-□ / PCXV-1□40-□、PCX-4F40 / PCXV-4F40）
 */
import type { DeviceDefinition, InternalLink, PinDef, TerminalDef } from '../types';
import { SERIES, type Rows } from './connector-block';
import { defs, fcnHeaderH, markerCell, MARK_COLORS, milHeaderH, r2, togiLogo } from './parts';
import { cnMakerParam, fcnAbRows, fcnPinLabel, markerParam, milAbRows } from './rows';

export function buildPcxv(connector: 'MIL' | 'FCN'): DeviceDefinition {
  const W = 86;
  const H = 150;
  const P = 7;
  const CN = { x: 13, y: 74 };
  /** 列（TB2 = B 列、TB1 = A 列）の左端 */
  const COL = { B: 29, A: 56 };
  const holeX = (col: 'A' | 'B') => COL[col] + 19;
  const y1 = 141;
  const rowY = (k: number) => r2(y1 - (k - 1) * P);
  const header = connector === 'MIL' ? milHeaderH(CN.x, CN.y, 40) : fcnHeaderH(CN.x, CN.y);
  const rowsOf = (marker: string): Rows => (connector === 'MIL' ? milAbRows(40, marker) : fcnAbRows());

  const place = (rows: Rows) => [
    ...rows.upper.map((t, i) => ({ t, col: 'B' as const, k: i + 1 })),
    ...rows.lower.map((t, i) => ({ t, col: 'A' as const, k: i + 1 })),
  ];

  const svg = (p: Record<string, number | string>) => {
    const items = place(rowsOf(String(p.marker ?? 'AB')));
    const term = (col: 'A' | 'B', k: number, label: string, mark?: string) => {
      const y = rowY(k);
      const L = COL[col];
      return `${markerCell(L + 5, y - 2.6, 8, 5.2, label, label.length > 2 ? 2 : 2.4, mark)}
    <rect x="${L + 10}" y="${r2(y - 1.8)}" width="4.6" height="3.6" rx="0.6" fill="#f39a2b" stroke="#b8650f" stroke-width="0.3"/>
    <circle cx="${holeX(col)}" cy="${y}" r="2.3" fill="#3b3d40" stroke="#8e9195" stroke-width="0.5"/>`;
    };
    return `${defs}
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="2" fill="#ece6d4" stroke="#aaa391" stroke-width="0.8"/>
  <rect x="${COL.B - 1}" y="${r2(y1 - 19 * P - 4.5)}" width="25" height="${r2(19 * P + 9)}" rx="1" fill="#c9cbc8" stroke="#8b8d8a" stroke-width="0.6"/>
  <rect x="${COL.A - 1}" y="${r2(y1 - 19 * P - 4.5)}" width="25" height="${r2(19 * P + 9)}" rx="1" fill="#c3c5c2" stroke="#8b8d8a" stroke-width="0.6"/>
  <g transform="rotate(-90 ${CN.x} ${CN.y})">${header.svg}</g>
  ${items.map((q) => term(q.col, q.k, q.t.label, q.t.mark ? MARK_COLORS[q.t.mark] : undefined)).join('')}
  ${togiLogo(3, H - 3, 3)}`;
  };

  const terminals = (p: Record<string, number | string>): TerminalDef[] => [
    {
      id: 'CN',
      label: connector === 'MIL' ? 'CN（MIL 40P）' : 'CN（FCN 40P）',
      x: CN.x,
      y: CN.y,
      side: 'left',
      role: 'connector',
      connector:
        connector === 'MIL'
          ? { kind: 'MIL40', pins: 40, width: header.width, facing: 'front', length: 16 }
          : { kind: 'FCN40', pins: 40, width: header.width, facing: 'front', length: 18 },
    },
    ...place(rowsOf(String(p.marker ?? 'AB'))).map(
      (q): TerminalDef => ({
        id: q.t.id,
        label: q.t.label,
        note: `${q.t.note}［${SERIES.pcx.wireShort}］`,
        x: holeX(q.col),
        y: rowY(q.k),
        side: 'right',
        role: 'pass',
        optional: true,
      }),
    ),
  ];

  const pins: PinDef[] = Array.from({ length: 40 }, (_, i) => ({
    id: `CN#${i + 1}`,
    label: connector === 'MIL' ? `MIL ピン ${i + 1}` : fcnPinLabel(i + 1),
    role: 'pass',
    optional: true,
  }));
  const rows = rowsOf('AB');
  const links: InternalLink[] = [...rows.upper, ...rows.lower].flatMap((t) => (t.pins ?? []).map((n) => ({ from: `CN#${n}`, to: t.id })));

  return {
    type: connector === 'MIL' ? 'toyogiken.pcxv-1h40' : 'toyogiken.pcxv-4f40',
    name: connector === 'MIL' ? 'MILコネクタ変換端子台' : 'FCNコネクタ変換端子台',
    model: connector === 'MIL' ? 'PCXV-1H40' : 'PCXV-4F40',
    maker: '東洋技研',
    category: 'terminal',
    description:
      `東洋技研 PCXV シリーズ（縦型）の標準品（1:1）コネクタ端子台、${connector === 'MIL' ? 'MIL 40 極（ヒロセ電機 HIF3BA-40PA / オムロン XG4A-4031。搭載コネクタはパラメータ）' : 'FCN 40 極（タイコエレクトロニクス 1747053-1、三菱電機の 40 ピンコネクタと同じ系列）'}。` +
      'レールに縦向きに付けて設置幅を 43mm に抑えたもの（長さ 75mm）。左側のコネクタから、中央の列 TB2（B1〜B20）と右の列 TB1（A1〜A20）へ 1 対 1 でつながる（下端が 1 番）。' +
      `${connector === 'MIL' ? 'A_k は MIL ピン 2k−1、B_k は 2k。記名板「-M」は 1〜数字連番（MIL ピン番号）。' : 'A・B の番号は三菱電機の I/O ユニットのピン番号と同じ。'}` +
      `定格 AC/DC125V 1A。結線方式: ${SERIES.pcx.method}。出典: https://www.togi.co.jp/series/interface/213/`,
    labelPrefix: 'TB',
    width: W,
    height: H,
    svg,
    terminals,
    pins,
    links,
    ...(connector === 'MIL' ? { params: [cnMakerParam(['H', 'T']), markerParam] } : {}),
  };
}

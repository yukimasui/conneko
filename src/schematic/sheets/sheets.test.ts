import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../../devices/registry';
import { sampleDiagram } from '../../model/sample';
import { buildSchematic } from '../layout';
import { parseSchematic, type Schematic, type SchematicSheet } from '../model';

const build = (extra: SchematicSheet[], settings = { title: '搬送コンベア制御盤', author: 'ユキ', revision: 'A' }) => {
  const schematic: Schematic = { sheets: [...sampleDiagram.schematic!.sheets, ...extra] };
  return buildSchematic({ ...sampleDiagram, settings, schematic }, getDeviceDefinition).doc;
};
const textsOf = (doc: ReturnType<typeof build>, source: string) => doc.sheets.filter((s) => s.source === source).flatMap((s) => s.texts.map((t) => t.text));

describe('内容を自動で作るシート', () => {
  it('I/O 図: ユニットごとに端子・アドレス・コメントの表と、相手の機器、母線を描く', () => {
    const doc = build([{ id: 'IO', name: 'I/O 図', kind: 'io', rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' }, items: [] }]);
    const pages = doc.sheets.filter((s) => s.source === 'IO');
    // IN1・OUT1 の 34 ピンを 1 ページ 20 行ほどで分ける
    expect(pages.length).toBe(4);
    const texts = textsOf(doc, 'IO');
    expect(texts).toEqual(expect.arrayContaining(['R000', 'PH1 ワーク検出', 'R200', 'P24', 'N24']));
    // PH1 は信号の端子を左、BN・BU を右に並べ替えた箱になり、記号の定義が展開図 JSON に入る
    const box = pages[0].inserts.find((i) => i.symbol.startsWith('iobox_PH1'));
    expect(box).toBeDefined();
    expect(doc.symbols[box!.symbol].pins).toHaveProperty('BK');
    // 出力 R200 は表示灯 PL2 を通って P24 へ
    const outPage = pages.find((p) => p.texts.some((t) => t.text.includes('OUT1')))!;
    expect(outPage.inserts.some((i) => i.symbol === 'lamp' && i.attributes?.TAG === 'PL2')).toBe(true);
  });

  it('I/O 図: 1 つの点に相手の機器が複数あるときは、1 つ目を記号で描き、残りの名前を添える', () => {
    const diagram = {
      ...sampleDiagram,
      devices: [...sampleDiagram.devices, { id: 'PL3', type: 'generic.pilot-lamp.dc24v', x: 480, y: 140, sheet: 'S4' }],
      wires: [
        ...sampleDiagram.wires,
        { id: 'WPL3a', from: { device: 'PSU1', terminal: '+V1' }, to: { device: 'PL3', terminal: 'X1' }, wireNo: 'P24', color: 'blue', sizeSq: 0.75, wireType: 'KIV' },
        { id: 'WPL3b', from: { device: 'TB4', terminal: '1' }, to: { device: 'PL3', terminal: 'X2' }, wireNo: 'R200', color: 'blue', sizeSq: 0.75, wireType: 'KIV' },
      ],
      schematic: { sheets: [...sampleDiagram.schematic!.sheets, { id: 'IO', name: 'I/O 図', kind: 'io' as const, rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' }, items: [] }] },
    };
    const doc = buildSchematic(diagram, getDeviceDefinition).doc;
    const texts = textsOf(doc, 'IO');
    expect(texts).toContain('ほかに PL3');
  });

  it('I/O 図: 入るなら次のユニットの表を同じページに続ける（大きい用紙）。入らなければ次のページから', () => {
    const big = build([{ id: 'IO', name: 'I/O 図', kind: 'io', paper: 'A0', rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' }, items: [] }]);
    const pages = big.sheets.filter((s) => s.source === 'IO');
    expect(pages).toHaveLength(1);
    const titles = pages[0].texts.filter((t) => t.layer === 'TAG' && t.height === 3).map((t) => t.text);
    expect(titles.some((t) => t.includes('IN1'))).toBe(true);
    expect(titles.some((t) => t.includes('OUT1'))).toBe(true);
    // A3 では 1 ユニットが 2 ページに分かれ、同じページに別のユニットは入らない
    const a3 = build([{ id: 'IO', name: 'I/O 図', kind: 'io', rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' }, items: [] }]).sheets.filter((s) => s.source === 'IO');
    for (const p of a3) expect(new Set(p.texts.filter((t) => t.layer === 'TAG' && t.height === 3).map((t) => t.text.split('  ')[1])).size).toBe(1);
  });

  it('ユニット構成図: 位置の順のユニット、入出力番号の範囲、内部電源の収支', () => {
    const texts = textsOf(build([{ id: 'R', name: 'ユニット構成', kind: 'rack', items: [] }]), 'R');
    expect(texts).toEqual(expect.arrayContaining(['PLC1', 'IN1', 'OUT1', 'R000〜R115（32 点）', 'R200〜R315（32 点）']));
    expect(texts.some((t) => t.startsWith('内部電源'))).toBe(true);
  });

  it('部品表: 型式・仕様ごとの数量', () => {
    const texts = textsOf(build([{ id: 'B', name: '部品表', kind: 'bom', items: [] }]), 'B');
    expect(texts).toEqual(expect.arrayContaining(['CP1, CP2', 'CP30-BA 2P', '2']));
  });

  it('表紙: 図面名・作成者・版と、全ページの目次（表紙のページも数える）', () => {
    const doc = build([{ id: 'C', name: '表紙', kind: 'cover', items: [] }]);
    const texts = textsOf(doc, 'C');
    expect(texts).toEqual(expect.arrayContaining(['搬送コンベア制御盤', 'ユキ', 'A', '図面目次', '主回路', '展開接続図（主回路）', '展開接続図（制御回路）']));
    expect(texts).toContain(String(doc.sheets.length));
  });

  it('用紙はシートごとに変えられ、行番号はシートの段の数を足して数える', () => {
    const s: Schematic = {
      settings: { paper: 'A3' },
      sheets: [
        { id: 'A', name: 'A4 のシート', paper: 'A4', items: [] },
        { id: 'B', name: 'A3 のシート', items: [{ element: 'MC1:A1-A2', x: 200, y: 30 }] },
      ],
    };
    const b = buildSchematic({ ...sampleDiagram, schematic: s }, getDeviceDefinition);
    expect(b.doc.sheets[0].paper).toEqual({ width: 297, height: 210 });
    expect(b.doc.sheets[1].paper).toEqual({ width: 420, height: 297 });
    expect(b.rows.get('MC1:A1-A2')).toBe(b.rowsOf('A') + 1);
    expect(b.rowsOf('A')).toBeLessThan(b.rowsOf('B'));
  });

  it('シートの種類・用紙・PLC の指定を保存して読み戻す', () => {
    const back = parseSchematic({
      sheets: [
        { id: 'IO', name: 'I/O', kind: 'io', plc: 'PLC1', units: ['IN1'], paper: 'A4', items: [] },
        { id: 'X', name: '不明', kind: 'unknown', items: [] },
      ],
    });
    expect(back?.sheets[0]).toEqual({ id: 'IO', name: 'I/O', kind: 'io', plc: 'PLC1', units: ['IN1'], paper: 'A4', items: [] });
    expect(back?.sheets[1].kind).toBeUndefined();
  });
});

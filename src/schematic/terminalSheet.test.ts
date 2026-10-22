import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { sampleDiagram } from '../model/sample';
import { buildSchematic } from './layout';
import type { Schematic } from './model';

const withTerminalSheet = (blocks?: string[]): Schematic => ({
  sheets: [...sampleDiagram.schematic!.sheets, { id: 'D3', name: '端子台接続図', kind: 'terminal', ...(blocks ? { blocks } : {}), items: [] }],
});

describe('端子台接続図', () => {
  it('端子台ごとに、端子の両側の接続先と線番の表を作る', () => {
    const b = buildSchematic({ ...sampleDiagram, schematic: withTerminalSheet() }, getDeviceDefinition);
    const pages = b.doc.sheets.filter((s) => s.source === 'D3');
    expect(pages.length).toBeGreaterThanOrEqual(1);
    const texts = pages.flatMap((p) => p.texts.map((t) => t.text));
    expect(texts).toContain('TB3  MILコネクタ変換端子台（' + getDeviceDefinition('generic.mil-terminal-block.34p')!.model + '）');
    // TB3 の 1 番: ネジ側は光電センサーへのリンク「R000」（センサーは別のシート。線番 R000）、コネクタ側は MIL ケーブルで入力ユニットの R000
    expect(texts).toContain('リンク「R000」');
    expect(texts).toContain('R000');
    expect(texts.some((t) => t.startsWith('IN1.CN1#1'))).toBe(true);
    expect(texts).toContain('CBL-IN1');
    // 表の罫線は FRAME レイヤー
    expect(pages[0].polylines.filter((p) => p.layer === 'FRAME').length).toBeGreaterThan(10);
    // 記号は置かない
    expect(pages.every((p) => p.inserts.length === 0)).toBe(true);
  });

  it('表にする端子台を選べる。行番号は展開接続図のシートだけで数える', () => {
    const s: Schematic = { sheets: [{ id: 'D0', name: '端子台', kind: 'terminal', blocks: ['TB4'], items: [] }, ...sampleDiagram.schematic!.sheets] };
    const b = buildSchematic({ ...sampleDiagram, schematic: s }, getDeviceDefinition);
    const texts = b.doc.sheets.filter((x) => x.source === 'D0').flatMap((p) => p.texts.map((t) => t.text));
    expect(texts.some((t) => t.startsWith('TB4'))).toBe(true);
    expect(texts.some((t) => t.startsWith('TB3'))).toBe(false);
    // 主回路（D1）は 1 段目から
    expect(b.rows.get('ELB1:main')).toBe(1);
    // 図面枠のページ番号は全ページの通し
    const count = b.doc.sheets.length;
    expect(b.doc.sheets[0].texts.map((t) => t.text)).toContain(`1 / ${count}`);
  });

  it('多い端子は列とページに流す', () => {
    const many = {
      ...sampleDiagram,
      devices: [
        ...sampleDiagram.devices,
        ...Array.from({ length: 4 }, (_, i) => ({ id: `TBX${i + 1}`, type: 'generic.mil-terminal-block.40p', x: 0, y: 0 })),
      ],
      schematic: withTerminalSheet(),
    };
    const pages = buildSchematic(many, getDeviceDefinition).doc.sheets.filter((s) => s.source === 'D3');
    expect(pages.length).toBeGreaterThan(1);
    expect(pages[1].id).toBe('D3-2');
    expect(pages.flatMap((p) => p.texts.map((t) => t.text)).some((t) => t.endsWith('（続き）'))).toBe(true);
  });
});

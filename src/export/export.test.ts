import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { hasEstimates } from '../devices/estimates';
import { sampleDiagram } from '../model/sample';
import { bomCsv, bomRows, ioRows, toCsv, wireCsv, wireRows } from './reports';
import { renderSheetSvg } from './sheetSvg';

const lookup = getDeviceDefinition;

describe('部品表・線番表・I/O 表', () => {
  it('部品表は同じ型式・仕様をまとめて数え、リンクは入れない', () => {
    const rows = bomRows(sampleDiagram, lookup);
    const cp = rows.find((r) => r.model === 'CP30-BA 2P')!;
    expect(cp.qty).toBe(2);
    expect(cp.ids).toEqual(['CP1', 'CP2']);
    expect(rows.some((r) => r.category === 'link')).toBe(false);
    expect(rows.reduce((n, r) => n + r.qty, 0)).toBe(sampleDiagram.devices.filter((d) => lookup(d.type)?.category !== 'link').length);
  });

  it('線番表は全シートの電線を含み、I/O 表は I/O ごとのコメントと接続先を持つ', () => {
    expect(wireRows(sampleDiagram, lookup).rows).toHaveLength(sampleDiagram.wires.length);
    const r000 = ioRows(sampleDiagram, lookup).find((r) => r.address === 'R000')!;
    expect(r000).toMatchObject({ dir: '入力', comment: 'PH1 ワーク検出', connections: 'PH1.BK' });
  });

  it('CSV は Excel 向けに BOM 付き・CRLF で、カンマや引用符を含む値をくくる', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'he said "hi"']])).toBe('﻿a,b\r\n"x,y","he said ""hi"""\r\n');
    expect(bomCsv(sampleDiagram, lookup).split('\r\n')[0]).toBe('﻿メーカー,型式,名称,仕様,数量,機器名,備考');
    expect(wireCsv(sampleDiagram, lookup).split('\r\n').length).toBe(sampleDiagram.wires.length + 2);
  });
});

describe('シートの画像', () => {
  it('シートの機器と電線を SVG にする', () => {
    const { svg, width, height } = renderSheetSvg(sampleDiagram, 'S4', lookup);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(width).toBeGreaterThan(200);
    expect(height).toBeGreaterThan(200);
    expect(svg).toContain('PH1');
    expect(svg).toContain('R000');
    expect(svg).not.toMatch(/undefined|NaN/);
    // 別のシートの機器は入らない
    expect(svg).not.toContain('>ELB1<');
  });
});

describe('推定の値', () => {
  it('推定を含む機器が関わる指摘に印が付く', () => {
    const est = deviceDefinitions.find((d) => hasEstimates(d) && d.category !== 'link');
    expect(est).toBeDefined();
    const issues = checkDiagram({ devices: [{ id: 'X1', type: est!.type, x: 0, y: 0 }], wires: [] }, lookup);
    const mine = issues.filter((i) => i.devices.includes('X1'));
    if (mine.length) expect(mine.every((i) => i.estimated)).toBe(true);
    const plain = checkDiagram(sampleDiagram, lookup).filter((i) => i.devices.includes('FAN1'));
    expect(plain.some((i) => i.estimated)).toBe(false);
  });
});

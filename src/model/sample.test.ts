import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import { buildSchematic } from '../schematic/layout';
import { sampleDiagram } from './sample';

describe('サンプル図面', () => {
  it('意図的に未配線にしたファン（FAN1）以外に指摘がない', () => {
    const issues = checkDiagram(sampleDiagram, getDeviceDefinition);
    const others = issues.filter((i) => !i.devices.includes('FAN1'));
    expect(others.map((i) => `${i.rule}: ${i.message}`)).toEqual([]);
    expect(issues.length).toBeGreaterThan(0);
  });

  it('展開図の見本の配置は、すべて実在する要素を指す', () => {
    const b = buildSchematic(sampleDiagram, getDeviceDefinition);
    const items = sampleDiagram.schematic!.sheets.flatMap((s) => s.items.map((i) => i.element));
    expect(items.filter((id) => !b.byId.get(id)?.placed)).toEqual([]);
    expect(b.doc.sheets.map((s) => s.inserts.length)).toEqual(sampleDiagram.schematic!.sheets.map((s) => s.items.length));
  });
});

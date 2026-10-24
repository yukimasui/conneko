import { describe, expect, it } from 'vitest';
import { buildModel } from '../check/model';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramWire } from '../model/diagram';
import { bomRows } from '../export/reports';
import { cablePin, cableSpecsFor, getCableSpec } from './cables';

const lookup = getDeviceDefinition;
const cable = (extra: Partial<DiagramWire> = {}): DiagramWire => ({
  id: 'C1',
  from: { device: 'X1', terminal: 'CN1' },
  to: { device: 'TB1', terminal: 'CN' },
  color: 'black',
  sizeSq: 0,
  wireType: 'CABLE',
  ...extra,
});
/** RX41C4（三菱の FCN 40 ピン）と端子台 tb をケーブルでつないだとき、RX41C4 のピン（CN1#n）がつながる端子台の端子 */
function reach(tb: string, pin: number, extra: Partial<DiagramWire> = {}): string[] {
  const d: Diagram = { devices: [{ id: 'X1', type: 'mitsubishi.rx41c4', x: 0, y: 0 }, { id: 'TB1', type: tb, x: 0, y: 0 }], wires: [cable(extra)] };
  const m = buildModel(d, lookup, () => {});
  const group = m.fixedMembers.get(m.fixed.find(`X1:CN1#${pin}`)) ?? [];
  return group.filter((k) => k.startsWith('TB1:') && !k.includes('#')).map((k) => k.slice(4));
}

describe('変換ケーブルのピン対応（#4）', () => {
  it('FCN40⇔MIL40 のケーブルは、ミスミ（同じ番号）と東洋技研 KB40N-4F1H（41 − 番号）がある', () => {
    expect(cableSpecsFor('MIL40', 'FCN40').map((c) => c.model)).toEqual(['PTHAS-F40-M40', 'KB40N-4F1H']);
    const kb = getCableSpec('toyogiken.kb40n-4f1h');
    expect(cablePin(kb, 'FCN40', 'MIL40', 1, 40)).toBe(40);
    expect(cablePin(kb, 'MIL40', 'FCN40', 40, 40)).toBe(1);
    expect(cablePin(undefined, 'FCN40', 'MIL40', 7, 40)).toBe(7);
  });

  it('汎用の MIL 40 極端子台は、ケーブルを選ばなければ同じ番号、KB40N-4F1H なら逆順のピンにつながる', () => {
    // RX41C4 の X00 は三菱の B20（CN1#1）
    expect(reach('generic.mil-terminal-block.40p', 1)).toEqual(['1']);
    expect(reach('generic.mil-terminal-block.40p', 1, { cable: 'toyogiken.kb40n-4f1h' })).toEqual(['40']);
  });

  it('東洋技研の三菱用 MIL 40 極端子台は KB40N-4F1H を前提にし、X00 が記名板の 00 に出る（ほかのケーブルを選ぶとずれる）', () => {
    expect(reach('toyogiken.pcn7-1h40-tb34-m1', 1)).toContain('00');
    expect(reach('toyogiken.pcn7-1h40-tb34-m1', 1, { cable: 'misumi.pthas-f40-m40' })).not.toContain('00');
  });

  it('種類の決まった変換ケーブルは部品表に載る', () => {
    const d: Diagram = {
      devices: [{ id: 'X1', type: 'mitsubishi.rx41c4', x: 0, y: 0 }, { id: 'TB1', type: 'toyogiken.pcn7-1h40-tb34-m1', x: 0, y: 0 }],
      wires: [cable()],
    };
    expect(bomRows(d, lookup).find((r) => r.model === 'KB40N-4F1H')).toMatchObject({ maker: '東洋技研', qty: 1 });
  });
});

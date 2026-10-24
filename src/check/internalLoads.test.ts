import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';

const lookup = getDeviceDefinition;
const w = (id: string, from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};
const base = (wires: DiagramWire[]): Diagram => ({
  devices: [
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
    { id: 'RT1', type: 'generic.relay-terminal.8p', x: 0, y: 0 },
  ],
  wires: [w('W1', 'PSU1.+V1', 'RT1.COM+'), ...wires],
});
const shorts = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule === 'short-circuit');

describe('機器の中のコイルと接点（リレーターミナル、#6）', () => {
  it('リレーごとに動作させて短絡を調べる（1 個のリレーの接点で +24V と 0V をつなぐと、そのリレーの名前で指摘する）', () => {
    const d = base([w('W2', 'PSU1.+V1', 'RT1.C1'), w('W3', 'RT1.A1', 'PSU1.-V1')]);
    const s = shorts(d);
    expect(s).toHaveLength(1);
    expect(s[0].message).toContain('RT1 の リレー K1 が動作する');
  });

  it('別々のリレーの接点で片側ずつつないでも、同時には動作しないので短絡とみなさない', () => {
    // K1: +24V → X、K2: X → 0V。K1 と K2 が同時に動作したときだけ短絡する（インタロックの考え方と同じ）
    const d = base([w('W2', 'PSU1.+V1', 'RT1.C1'), w('W3', 'RT1.A1', 'RT1.C2'), w('W4', 'RT1.A2', 'PSU1.-V1')]);
    expect(shorts(d)).toEqual([]);
  });
});

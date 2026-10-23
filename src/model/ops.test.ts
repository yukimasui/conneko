import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramWire } from './diagram';
import { replaceDeviceType } from './ops';

const wire = (id: string, from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'KIV' };
};

describe('機種の差し替え', () => {
  it('機器名・位置・コメントを保ち、同じ端子の電線はつないだまま、ない端子の電線は外す', () => {
    const d: Diagram = {
      devices: [
        { id: 'NF1', type: 'mitsubishi.nf32-sv.3p', x: 10, y: 20, params: { ratedCurrent: 20 }, note: '主幹', comments: { '3': 'S 相' } },
        { id: 'TB1', type: 'generic.terminal-block.6p', x: 300, y: 20 },
      ],
      wires: [{ ...wire('W1', 'NF1.1', 'TB1.1T'), bend: 12 }, wire('W2', 'NF1.3', 'TB1.2T'), wire('W3', 'NF1.5', 'TB1.3T')],
    };
    const r = replaceDeviceType(d, 'NF1', 'mitsubishi.nf32-sv.2p', getDeviceDefinition);
    const nf = r.diagram.devices.find((x) => x.id === 'NF1')!;
    expect(nf).toMatchObject({ type: 'mitsubishi.nf32-sv.2p', x: 10, y: 20, note: '主幹' });
    expect(nf.params?.ratedCurrent).toBe(20);
    const kept = new Set(r.diagram.wires.map((w) => w.id));
    // 2P にない端子の電線だけが外れる
    const def2p = getDeviceDefinition('mitsubishi.nf32-sv.2p')!;
    const ids2p = new Set((typeof def2p.terminals === 'function' ? def2p.terminals({}) : def2p.terminals).map((t) => t.id));
    for (const w of d.wires) expect(kept.has(w.id)).toBe(ids2p.has(w.from.terminal));
    expect(r.droppedWires.length).toBe(d.wires.length - kept.size);
    // つないだままの電線の経路は自動に戻す
    expect(r.diagram.wires.find((w) => w.id === 'W1')?.bend).toBeUndefined();
  });

  it('選べない値のパラメータは引き継がない', () => {
    const d: Diagram = { devices: [{ id: 'SOL1', type: 'smc.sy5120-5lz', x: 0, y: 0, params: { portAB: 8 } }], wires: [] };
    const r = replaceDeviceType(d, 'SOL1', 'smc.sy3120-5lz', getDeviceDefinition);
    const p = r.diagram.devices[0].params?.portAB;
    const def = getDeviceDefinition('smc.sy3120-5lz')!;
    expect(p === undefined || def.params!.find((x) => x.key === 'portAB')!.options.some((o) => o.value === p)).toBe(true);
  });

  it('装着できない機種にしたら装着を外す', () => {
    const d: Diagram = {
      devices: [
        { id: 'MF1', type: 'smc.ss5y3-41', x: 0, y: 0 },
        { id: 'SOL1', type: 'smc.sy3140-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 1 } },
      ],
      wires: [],
    };
    const same = replaceDeviceType(d, 'SOL1', 'smc.sy3240-5lz', getDeviceDefinition);
    expect(same.diagram.devices[1].mount).toEqual({ device: 'MF1', slot: 1 });
    expect(same.unmounted).toEqual([]);
    const other = replaceDeviceType(d, 'SOL1', 'smc.sy5140-5lz', getDeviceDefinition);
    expect(other.diagram.devices[1].mount).toBeUndefined();
    expect(other.unmounted).toEqual(['SOL1']);
    // 親を別のシリーズにすると、装着していた連が外れる
    const host = replaceDeviceType(d, 'MF1', 'smc.ss5y5-41', getDeviceDefinition);
    expect(host.unmounted).toEqual(['SOL1']);
  });
});

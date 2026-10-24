/**
 * 機器名のラベルの位置（上から来る線を避ける、#34）。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { DiagramWire } from '../model/diagram';
import { labelOffset } from './DeviceNode';
import { wireLayout } from './geometry';
import { labelLefts, type LabelDevice } from './labelPlace';

const w = (id: string, from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'IV' };
};
const place = (devices: LabelDevice[], wires: DiagramWire[]) => {
  const { geometry, lanes } = wireLayout(devices, wires, () => undefined, getDeviceDefinition);
  return labelLefts(devices, wires, geometry, lanes, getDeviceDefinition, () => undefined);
};

describe('機器名のラベルの位置', () => {
  it('上の端子が左端にない機器・端子が上にしかない機器は動かさない', () => {
    expect(labelOffset([{ side: 'top', x: 200 }], 120)).toBe(0);
    expect(labelOffset([{ side: 'top', x: 10 }], 120)).toBe(0);
    expect(labelOffset([{ side: 'top', x: 10 }, { side: 'bottom', x: 10 }], 120)).toBe(20);
  });

  it('上から来る線がラベルを横切る機器は、線の来ない位置へずらす（上の端子の右が空いていればそこ）', () => {
    // 一次電源の真下に漏電遮断器。R・S・T が遮断器の上の端子へまっすぐ下りる
    const devices: LabelDevice[] = [
      { id: 'PS1', type: 'generic.power-source.3p200v', x: 0, y: 0 },
      { id: 'ELB1', type: 'mitsubishi.nv32-sv.3p', x: 0, y: 300 },
    ];
    const lefts = place(devices, [w('W1', 'PS1.R', 'ELB1.1'), w('W2', 'PS1.S', 'ELB1.3'), w('W3', 'PS1.T', 'ELB1.5')]);
    expect(lefts.get('ELB1')).toBeGreaterThan(100);
    // 上の端子の右に別の機器や線があれば、左の外へ
    const more = place(
      [...devices, { id: 'M1', type: 'generic.motor.3p', x: 200, y: 285 }],
      [w('W1', 'PS1.R', 'ELB1.1'), w('W2', 'PS1.S', 'ELB1.3'), w('W3', 'PS1.T', 'ELB1.5'), w('W4', 'PS1.PE', 'M1.E')],
    );
    expect(more.get('ELB1')).toBeLessThan(0);
  });

  it('線のつながっていない機器は左端のまま', () => {
    expect(place([{ id: 'ELB1', type: 'mitsubishi.nv32-sv.3p', x: 0, y: 300 }], []).has('ELB1')).toBe(false);
  });
});

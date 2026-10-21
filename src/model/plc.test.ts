import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import type { Diagram } from './diagram';
import { ioSystem } from './io';
import { addUnit, currentSlots, freeUnits, mountUnit, moveUnit, renumberIoNames, unmountUnit } from './plc';
import { sampleDiagram } from './sample';

const lookup = getDeviceDefinition;
const linkNames = (d: Diagram) => d.devices.filter((x) => x.type === 'generic.link').map((x) => String(x.params?.name)).sort();
const address = (d: Diagram, unit: string) => ioSystem(d, 'PLC1', lookup)!.units.find((u) => u.device.id === unit)!.points[0].address;

describe('PLC エディタの操作', () => {
  it('ユニットの順番を入れ替えると番号が変わり、線番とリンク名も新しい番号に付け替わる', () => {
    const before = sampleDiagram;
    expect(address(before, 'IN1')).toBe('R000');
    expect(address(before, 'OUT1')).toBe('R200');
    const moved = moveUnit(before, 'PLC1', 'OUT1', 1, lookup);
    expect([...currentSlots(moved, 'PLC1')]).toEqual([
      [1, 'OUT1'],
      [2, 'IN1'],
    ]);
    expect(address(moved, 'OUT1')).toBe('R000');
    expect(address(moved, 'IN1')).toBe('R200');
    const out = renumberIoNames(before, moved, 'PLC1', lookup);
    // R000（センサー）と R200（表示灯）が入れ替わっても、名前がぶつからずに付け替わる
    expect(linkNames(out).filter((n) => /^R\d/.test(n))).toEqual(['R000', 'R000', 'R200', 'R200']);
    const sensorWire = out.wires.find((w) => w.to.device === 'PH1' && w.to.terminal === 'BK') ?? out.wires.find((w) => w.from.device === 'PH1' && w.from.terminal === 'BK');
    expect(sensorWire?.wireNo).toBe('R200');
    expect(checkDiagram(out, lookup).filter((i) => !i.devices.includes('FAN1'))).toEqual([]);
  });

  it('ユニットの追加・取り外し・図面の未装着ユニットの装着', () => {
    const def = deviceDefinitions.find((x) => x.type === 'keyence.kv-c32xc.input')!;
    let d = addUnit(sampleDiagram, 'PLC1', def, lookup);
    const added = d.devices.at(-1)!;
    expect(added.mount).toEqual({ device: 'PLC1', slot: 3 });
    d = unmountUnit(d, 'IN1', lookup);
    expect([...currentSlots(d, 'PLC1')]).toEqual([
      [1, 'OUT1'],
      [2, added.id],
    ]);
    expect(freeUnits(d, 'PLC1', lookup).map((x) => x.id)).toEqual(['IN1']);
    d = mountUnit(d, 'PLC1', 'IN1', lookup);
    expect(d.devices.find((x) => x.id === 'IN1')!.mount).toEqual({ device: 'PLC1', slot: 3 });
  });

  it('スロットの位置が決まったベースユニットでは、空きを残して動かし、ほかのユニットと入れ替える', () => {
    const d: Diagram = {
      devices: [
        { id: 'BASE', type: 'mitsubishi.r35b', x: 0, y: 0 },
        { id: 'PW', type: 'mitsubishi.r61p', x: 0, y: 0, mount: { device: 'BASE', slot: 1 } },
        { id: 'CPU', type: 'mitsubishi.r04cpu', x: 0, y: 0, mount: { device: 'BASE', slot: 2 } },
        { id: 'X1', type: 'mitsubishi.rx40c7', x: 0, y: 0, mount: { device: 'BASE', slot: 3 } },
        { id: 'Y1', type: 'mitsubishi.ry10r2', x: 0, y: 0, mount: { device: 'BASE', slot: 5 } },
      ],
      wires: [],
    };
    const moved = moveUnit(d, 'BASE', 'X1', 6, lookup);
    expect([...currentSlots(moved, 'BASE')].sort((a, b) => a[0] - b[0])).toEqual([
      [1, 'PW'],
      [2, 'CPU'],
      [5, 'Y1'],
      [6, 'X1'],
    ]);
    const swapped = moveUnit(d, 'BASE', 'X1', 5, lookup);
    expect(swapped.devices.find((x) => x.id === 'Y1')!.mount!.slot).toBe(3);
    // 新しい入出力ユニットは、電源・CPU 専用の位置を避けて最初の空きへ
    const added = addUnit(d, 'BASE', deviceDefinitions.find((x) => x.type === 'mitsubishi.rx40c7')!, lookup);
    expect(added.devices.at(-1)!.mount!.slot).toBe(4);
  });
});

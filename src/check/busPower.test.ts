/**
 * 装着（バス）の内部電源と電源の容量のチェック（#8）。
 * - 親の電源端子から内部電源を供給する機器（bus.feeds）は、装着したユニットの消費を親の消費電流に加える
 * - 電源の容量（limitCurrent）と、受電している機器の消費の合計（supply-overload）。FX5U のサービス電源は増設ユニットの DC24V と共用（busRail）
 * - 番号を占有するだけのユニット（io.reserve）と、相対番号の親（numbering.relative）に装着したユニットの先頭番号の手入力
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { computeBus, effectiveParams } from '../model/bus';
import type { Diagram, DiagramDevice, DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' };
};
const lookup = (t: string) => getDeviceDefinition(t);
const issuesOf = (d: Diagram, rule: string) => checkDiagram(d, lookup).filter((i) => i.rule === rule);

describe('親の消費電流に装着したユニットの消費を加える（bus.feeds）', () => {
  /** 2 極のサーキットプロテクタ（定格 rated）から KV-8000 へ給電し、入力ユニットを n 台装着する */
  const kv = (rated: number, units: number): Diagram => ({
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0, params: { outputCurrent: 10 } },
      { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0, params: { ratedCurrent: rated } },
      { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 },
      ...Array.from({ length: units }, (_, i): DiagramDevice => ({ id: `IN${i + 1}`, type: 'keyence.kv-c32xc.input', x: 0, y: 0, mount: { device: 'PLC1', slot: i + 1 } })),
    ],
    wires: [w('PSU1.+V1', 'CP1.1'), w('CP1.2', 'PLC1.24V+'), w('PSU1.-V1', 'CP1.3'), w('CP1.4', 'PLC1.24V-')],
  });

  it('CPU 単体（0.4A）は 0.5A の保護で足りる', () => {
    expect(issuesOf(kv(0.5, 0), 'overload')).toEqual([]);
  });

  it('ユニットを装着すると、その消費を加えて上流の保護と比べる', () => {
    const issues = issuesOf(kv(0.5, 6), 'overload');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/PLC1: 定格電流（装着したユニットの消費を含む） 0.55A が上流の保護電流 0.5A/);
  });
});

describe('電源の容量（supply-overload）', () => {
  const lamps = (n: number, from: string, to: string): { devices: DiagramDevice[]; wires: DiagramWire[] } => ({
    devices: Array.from({ length: n }, (_, i) => ({ id: `PL${i + 1}`, type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 })),
    wires: Array.from({ length: n }, (_, i) => [w(from, `PL${i + 1}.X1`), w(`PL${i + 1}.X2`, to)]).flat(),
  });

  it('電源ユニットの容量を超える負荷をつなぐと注意', () => {
    const l = lamps(3, 'PSU1.+V1', 'PSU1.-V1');
    const d = (outputCurrent: number): Diagram => ({
      devices: [{ id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0, params: { outputCurrent } }, { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 }, ...l.devices],
      wires: [w('PSU1.+V2', 'PLC1.24V+'), w('PSU1.-V2', 'PLC1.24V-'), ...l.wires],
    });
    expect(issuesOf(d(1.3), 'supply-overload')).toEqual([]);
    // 30W（1.3A）の電源に CPU（0.4A）とランプ 50 個（1.0A）
    const many = lamps(50, 'PSU1.+V1', 'PSU1.-V1');
    const big: Diagram = {
      devices: [{ id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0, params: { outputCurrent: 1.3 } }, { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 }, ...many.devices],
      wires: [w('PSU1.+V2', 'PLC1.24V+'), w('PSU1.-V2', 'PLC1.24V-'), ...many.wires],
    };
    const issues = issuesOf(big, 'supply-overload');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/受電している機器の消費電流の合計 1.4A（/);
    expect(issues[0].message).toMatch(/PLC1 0.4A/);
    expect(issues[0].message).toMatch(/容量 1.3A を超えています/);
  });

  /** FX5U のサービス電源（24V / 0V、400mA）からランプを点け、出力ユニットを n 台装着する */
  const fx = (lampCount: number, units: number): Diagram => {
    const l = lamps(lampCount, 'PLC1.24V', 'PLC1.0V');
    return {
      devices: [
        { id: 'PLC1', type: 'mitsubishi.fx5u-32mr-es', x: 0, y: 0 },
        ...Array.from({ length: units }, (_, i): DiagramDevice => ({ id: `OUT${i + 1}`, type: 'mitsubishi.fx5-16eyr-es', x: 0, y: 0, mount: { device: 'PLC1', slot: i + 1 } })),
        ...l.devices,
      ],
      wires: l.wires,
    };
  };

  it('FX5U のサービス電源は、増設ユニットへの DC24V（0.4A）と容量を共用する', () => {
    // 出力ユニット 2 台で 0.25A、ランプ 7 個で 0.14A → 0.39A は容量内
    expect(issuesOf(fx(7, 2), 'supply-overload')).toEqual([]);
    expect(issuesOf(fx(7, 2), 'bus-overload')).toEqual([]);
    // ランプ 8 個で 0.41A → 容量 0.4A を超える（どちらか単独では超えない）
    const issues = issuesOf(fx(8, 2), 'supply-overload');
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/装着したユニット 0.25A/);
    expect(issues[0].message).toMatch(/内部電源 24V と容量を共用/);
    expect(issuesOf(fx(8, 2), 'bus-overload')).toEqual([]);
  });

  it('増設ユニットだけで内部電源の容量を超える場合は bus-overload だけを出す', () => {
    const d = fx(1, 4);
    expect(issuesOf(d, 'bus-overload')).toHaveLength(1);
    expect(issuesOf(d, 'supply-overload')).toEqual([]);
  });
});

describe('入出力番号の占有と相対番号', () => {
  const mount = (id: string, type: string, host: string, slot: number, params?: DiagramDevice['params']): DiagramDevice => ({
    id,
    type,
    x: 0,
    y: 0,
    mount: { device: host, slot },
    ...(params ? { params } : {}),
  });

  it('KV-XH04ML はリレー 576 点を占有し、後ろのユニットの先頭番号がその分ずれる（入力ではない）', () => {
    const devices: DiagramDevice[] = [
      { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 },
      mount('MC1', 'keyence.kv-xh04ml', 'PLC1', 1),
      mount('IN1', 'keyence.kv-c32xc.input', 'PLC1', 2),
    ];
    const bus = computeBus(devices, lookup);
    expect(bus.params.get('MC1')).toMatchObject({ ioIn: 0 });
    expect(bus.params.get('IN1')).toMatchObject({ ioIn: 576 });
    expect(getDeviceDefinition('keyence.kv-xh04ml')!.bus!.io).toMatchObject({ reserve: 576 });
    expect(getDeviceDefinition('keyence.kv-xh04ml')!.bus!.io!.inputs).toBeUndefined();
  });

  it('KV-EC01 に装着したユニットは先頭番号を手で指定でき、後ろのユニットはその続きから数える', () => {
    const devices: DiagramDevice[] = [
      { id: 'EC1', type: 'keyence.kv-ec01', x: 0, y: 0 },
      mount('U1', 'keyence.kv-nc16ex', 'EC1', 1),
      mount('U2', 'keyence.kv-nc16ex', 'EC1', 2, { ioIn: 1000 }),
      mount('U3', 'keyence.kv-nc16ex', 'EC1', 3),
    ];
    const bus = computeBus(devices, lookup);
    const p = (id: string) => effectiveParams(devices.find((d) => d.id === id)!, bus);
    expect(p('U1')).toMatchObject({ ioIn: 0 });
    expect(p('U2')).toMatchObject({ ioIn: 1000 });
    expect(p('U3')).toMatchObject({ ioIn: 1016 });
  });

  it('相対番号でない親（KV-8000）では、後ろのユニットは装着位置の順の番号のまま', () => {
    const devices: DiagramDevice[] = [
      { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0 },
      mount('IN1', 'keyence.kv-c32xc.input', 'PLC1', 1, { ioIn: 1000 }),
      mount('IN2', 'keyence.kv-c32xc.input', 'PLC1', 2),
    ];
    const bus = computeBus(devices, lookup);
    expect(bus.params.get('IN2')).toMatchObject({ ioIn: 32 });
  });
});

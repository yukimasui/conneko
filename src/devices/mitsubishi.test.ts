/**
 * 三菱電機の機器定義の構造（接点・出力の注記、信号の種類、バスへの装着と入出力番号、コネクタの変換）の確認。
 */
import { describe, expect, it } from 'vitest';
import type { DiagramDevice } from '../model/diagram';
import { computeBus, effectiveParams } from '../model/bus';
import { deviceDefinitions, getDeviceDefinition } from './registry';
import { connectorsMate, resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';

/** 安全機器の担当ファイル以外の三菱電機の機器 */
const SAFETY_OWNED = new Set(['mitsubishi.s-t12', 'mitsubishi.sd-t12', 'mitsubishi.sd-t21', 'mitsubishi.ws0-cpu0-xtio']);
const mitsubishi = deviceDefinitions.filter((d) => d.maker === '三菱電機' && ![...SAFETY_OWNED].some((t) => d.type.startsWith(t)));

const def = (type: string): DeviceDefinition => {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  return d;
};

const dev = (id: string, type: string, mount?: [string, number]): DiagramDevice => ({
  id,
  type,
  x: 0,
  y: 0,
  ...(mount ? { mount: { device: mount[0], slot: mount[1] } } : {}),
});

/** 装着を解析し、機器ごとの確定済み定義を返す */
function mountAll(devices: DiagramDevice[]) {
  const layout = computeBus(devices, getDeviceDefinition);
  const resolved = new Map(devices.map((d) => [d.id, resolveDevice(def(d.type), effectiveParams(d, layout))]));
  return { layout, resolved };
}

describe('三菱電機 機器定義', () => {
  it('type が mitsubishi. で始まる', () => {
    expect(mitsubishi.length).toBeGreaterThan(20);
    for (const d of mitsubishi) expect(d.type.startsWith('mitsubishi.')).toBe(true);
  });

  it.each(mitsubishi.map((d) => [d.type, d] as const))('%s: 出力・入力の注記が整合している', (_, d) => {
    const r = resolveDevice(d, d.bus?.io ? { ioIn: 32, ioOut: 48 } : undefined);
    const all = [...r.terminals, ...r.pins];
    const byId = new Map(all.map((t) => [t.id, t]));
    // 出力は 1 点の定格を持ち、コモン側は受電端子
    for (const l of r.links.filter((x) => x.switch === 'output')) {
      expect(l.ratedCurrent, `${l.from} の ratedCurrent`).toBeDefined();
      expect(byId.get(l.to)?.role, `${l.to} の role`).toBe('input');
      expect(byId.get(l.from)?.signal?.dir, `${l.from} の signal`).toBe('out');
    }
    // コモンあたりの上限は出力のコモンに付ける
    for (const c of d.commonLimits ?? []) {
      expect(r.links.some((l) => l.switch === 'output' && l.to === c.common), `commonLimits ${c.common}`).toBe(true);
    }
    // DC 入力点のコモンは受電端子（+/− 共用）
    for (const t of all.filter((x) => x.signal?.dir === 'in')) {
      expect(t.signal?.kind).toBe('dc');
      const com = byId.get(t.signal!.common!);
      expect(com?.role, `${t.id} のコモン`).toBe('input');
    }
    // 入出力の点数と、ラベルが付いた入出力点の数が一致する
    if (d.bus?.io && r.terminals.length) {
      const n = all.filter((t) => t.signal && t.role === 'signal').length;
      expect(n).toBe((d.bus.io.inputs ?? 0) + (d.bus.io.outputs ?? 0));
    }
  });

  it('電磁接触器・サーマルリレーの接点の種類', () => {
    const mc = resolveDevice(def('mitsubishi.s-t10.ac200v'));
    expect(mc.links.map((l) => `${l.from}-${l.to}:${l.switch}`)).toEqual(['1/L1-2/T1:NO', '3/L2-4/T2:NO', '5/L3-6/T3:NO', '13-14:NO']);
    const th = resolveDevice(def('mitsubishi.th-t18'));
    expect(th.links.find((l) => l.from === '95')?.switch).toBe('NC');
    expect(th.links.find((l) => l.from === '97')?.switch).toBe('NO');
    expect(th.links.filter((l) => l.protects).every((l) => l.switch === undefined)).toBe(true);
    // ブレーカーは常時導通のまま
    for (const t of ['mitsubishi.nv32-sv.3p', 'mitsubishi.nf32-sv.3p', 'mitsubishi.nf32-sv.2p']) {
      const d = getDeviceDefinition(t);
      if (d) expect(resolveDevice(d).links.every((l) => l.switch === undefined)).toBe(true);
    }
  });

  it('iQ-R: ベースユニットへの装着で入出力番号（16 進・共通の並び）と DC5V の収支が決まる', () => {
    const devices = [
      dev('BASE1', 'mitsubishi.r35b'),
      dev('PS1', 'mitsubishi.r61p', ['BASE1', 1]),
      dev('CPU1', 'mitsubishi.r04cpu', ['BASE1', 2]),
      dev('IN1', 'mitsubishi.rx40c7', ['BASE1', 3]),
      dev('IN2', 'mitsubishi.rx41c4', ['BASE1', 4]),
      dev('BL1', 'mitsubishi.rg60', ['BASE1', 5]),
      dev('OUT1', 'mitsubishi.ry10r2', ['BASE1', 6]),
      dev('OUT2', 'mitsubishi.ry41nt2p', ['BASE1', 7]),
    ];
    const { layout, resolved } = mountAll(devices);
    expect(layout.problems).toEqual([]);
    expect(layout.params.get('IN1')).toMatchObject({ ioIn: 0x00 });
    expect(layout.params.get('IN2')).toMatchObject({ ioIn: 0x10 });
    expect(layout.params.get('OUT1')).toMatchObject({ ioOut: 0x40 });
    expect(layout.params.get('OUT2')).toMatchObject({ ioOut: 0x50 });
    expect(resolved.get('IN1')!.terminal('X0F')?.label).toBe('X0F');
    expect(resolved.get('IN2')!.pin('CN1#1')?.label).toBe('X10 (B20)');
    expect(resolved.get('IN2')!.pin('CN1#2')?.label).toBe('X20 (A20)');
    expect(resolved.get('OUT1')!.terminal('Y00')?.label).toBe('Y40');
    expect(resolved.get('OUT2')!.pin('CN1#40')?.label).toBe('COM (0V) (A01)');
    expect(resolved.get('OUT2')!.pin('CN1#2')?.label).toBe('Y60 (A20)');
    const rail = layout.groups.get('BASE1')!.rails.find((r) => r.rail === '5V')!;
    expect(rail.supply).toBe(6.5);
    expect(rail.load).toBeCloseTo(0.58 + 0.67 + 0.12 + 0.15 + 0.45 + 0.18);
  });

  it('iQ-R: スロット数を超える装着と DC5V の不足を検出できる', () => {
    const devices = [dev('BASE1', 'mitsubishi.r35b'), dev('PS1', 'mitsubishi.r62p', ['BASE1', 1]), dev('CPU1', 'mitsubishi.r04cpu', ['BASE1', 2])];
    for (let i = 0; i < 6; i++) devices.push(dev(`OUT${i}`, 'mitsubishi.ry10r2', ['BASE1', 3 + i]));
    const rules = computeBus(devices, getDeviceDefinition).problems.map((p) => p.rule);
    expect(rules).toContain('mount-slot-over');
    expect(rules).toContain('bus-overload');
  });

  it('FX5: CPU ユニットへの増設で入力・出力を別々に 8 進で割り付ける', () => {
    const devices = [
      dev('PLC1', 'mitsubishi.fx5u-32mr-es'),
      dev('EX1', 'mitsubishi.fx5-16ex-es', ['PLC1', 1]),
      dev('EY1', 'mitsubishi.fx5-16eyr-es', ['PLC1', 2]),
      dev('EX2', 'mitsubishi.fx5-16ex-es', ['PLC1', 3]),
    ];
    const { layout, resolved } = mountAll(devices);
    expect(layout.problems).toEqual([]);
    expect(resolved.get('EX1')!.terminal('X0')?.label).toBe('X20');
    expect(resolved.get('EX1')!.terminal('X17')?.label).toBe('X37');
    expect(resolved.get('EY1')!.terminal('Y0')?.label).toBe('Y20');
    expect(resolved.get('EX2')!.terminal('X10')?.label).toBe('X50');
    const rails = Object.fromEntries(layout.groups.get('PLC1')!.rails.map((r) => [r.rail, r]));
    expect(rails['5V'].supply).toBe(0.9);
    expect(rails['24V'].load).toBeCloseTo(0.085 * 2 + 0.125);
  });

  it('FX5: 増設ユニットは iQ-R のベースには装着できない', () => {
    const devices = [dev('BASE1', 'mitsubishi.r35b'), dev('EX1', 'mitsubishi.fx5-16ex-es', ['BASE1', 3])];
    expect(computeBus(devices, getDeviceDefinition).problems.map((p) => p.rule)).toContain('mount-mismatch');
  });

  it('40 ピンコネクタ（FCN40）は MIL 40 極の変換端子台へつなげ、ピンは変換ケーブルの結線にそろう', () => {
    const mil = resolveDevice(def('generic.mil-terminal-block.40p'));
    const milConn = mil.terminals.find((t) => t.connector?.kind === 'MIL40')!.connector!;
    for (const type of ['mitsubishi.rx41c4', 'mitsubishi.ry41nt2p']) {
      const r = resolveDevice(def(type));
      const cn = r.terminal('CN1')!.connector!;
      expect(cn.kind).toBe('FCN40');
      expect(connectorsMate(cn, milConn)).toBe(true);
      expect(r.pins).toHaveLength(40);
      // 三菱のピン番号 B_k → MIL(41−2k)、A_k → MIL(42−2k)
      expect(r.pin('CN1#1')?.label).toMatch(/\(B20\)$/);
      expect(r.pin('CN1#2')?.label).toMatch(/\(A20\)$/);
      expect(r.pin('CN1#39')?.label).toMatch(/\(B01\)$/);
      expect(r.pin('CN1#40')?.label).toMatch(/\(A01\)$/);
    }
  });
});

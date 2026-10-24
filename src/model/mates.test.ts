import { describe, expect, it } from 'vitest';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import type { Diagram, DiagramDevice, DiagramWire } from './diagram';
import { applyMateCandidate, mateCandidates } from './mates';

const diagram = (devices: DiagramDevice[], wires: DiagramWire[] = []): Diagram => ({ devices, wires }) as unknown as Diagram;
const dev = (id: string, type: string, extra: Partial<DiagramDevice> = {}): DiagramDevice => ({ id, type, x: 0, y: 0, ...extra });
const candidates = (d: Diagram, device: string, terminal: string) => mateCandidates(d, { device, terminal }, deviceDefinitions, getDeviceDefinition);
const cable = (id: string, a: string, at: string, b: string, bt: string): DiagramWire =>
  ({ id, from: { device: a, terminal: at }, to: { device: b, terminal: bt }, color: 'black', sizeSq: 0, wireType: 'CABLE' }) as DiagramWire;

describe('mateCandidates', () => {
  it('ロボシリンダーからは適応コントローラーが出て、ほかのアクチュエーターは出ない', () => {
    const c = candidates(diagram([dev('AX1', 'iai.rcp6-sa')]), 'AX1', 'MPG');
    const types = c.map((x) => x.type);
    expect(types).toContain('iai.pcon-cb');
    expect(types).toContain('iai.msel');
    expect(types).not.toContain('iai.rcp6-ra');
    expect(types).not.toContain('iai.rcp6-sa');
    expect(c.find((x) => x.type === 'iai.pcon-cb')?.sourceChange).toBeUndefined();
  });

  it('引いた側の設定を変えればつながる機種は、変更点つきで後ろに出す', () => {
    const c = candidates(diagram([dev('AX1', 'iai.rcp6-sa')]), 'AX1', 'MPG');
    const rcon = c.find((x) => x.type === 'iai.rcon-pc')!;
    expect(rcon.sourceChange).toMatchObject({ key: 'ctrl', value: 'rcon' });
    expect(rcon.sourceChange!.label).toContain('P5');
    // ゲートウェイへの装着が必要。図面にゲートウェイがなければ一緒に置く
    expect(rcon.needsMount).toBe(true);
    expect(getDeviceDefinition(rcon.hostType!)?.bus?.host).toBeTruthy();
    const firstChanged = c.findIndex((x) => x.sourceChange);
    expect(c.slice(firstChanged).every((x) => x.sourceChange)).toBe(true);
  });

  it('モーターとエンコーダーのように 2 台の間でつなげるコネクタはまとめてつなぐ', () => {
    const c = candidates(diagram([dev('AX1', 'iai.rcs4-sa')]), 'AX1', 'MOT');
    expect(c.find((x) => x.type === 'iai.scon-cb')?.pairs).toEqual([
      { from: 'MOT', to: 'MOT' },
      { from: 'PG', to: 'PG' },
    ]);
  });

  it('コントローラーからはアクチュエーターが出て、ほかのコントローラーは出ない', () => {
    const types = candidates(diagram([dev('C1', 'iai.pcon-cb')]), 'C1', 'MPG').map((x) => x.type);
    expect(types).toContain('iai.rcp6-sa');
    expect(types).not.toContain('iai.pcon-ca');
  });

  it('PLC の MIL コネクタからは変換端子台が出て、PLC のユニットは出ない', () => {
    const c = candidates(diagram([dev('IN1', 'keyence.kv-c32xc.input')]), 'IN1', 'CN1');
    expect(c.length).toBeGreaterThan(0);
    expect(c.every((x) => getDeviceDefinition(x.type)!.category === 'terminal')).toBe(true);
    // 汎用品が先頭
    expect(getDeviceDefinition(c[0].type)!.maker).toBeUndefined();
  });

  it('センサーのコネクタからは、同じ分類でもケーブルを出す（ほかのセンサーは出さない）', () => {
    const sensor = deviceDefinitions.find((d) => d.category === 'sensor' && !d.cable && resolveDevice(d).terminals.some((t) => t.connector?.kind === 'M12-4'))!;
    const t = resolveDevice(sensor).terminals.find((x) => x.connector?.kind === 'M12-4')!;
    const types = candidates(diagram([dev('S1', sensor.type)]), 'S1', t.id).map((x) => x.type);
    expect(types).toEqual(['generic.m12-4p-cable']);
  });

  it('図面にある機器の空いているコネクタを先に出し、使用中のコネクタには出さない', () => {
    const d = diagram([dev('AX1', 'iai.rcp6-sa'), dev('AX2', 'iai.rcp6-sa'), dev('C1', 'iai.pcon-cb'), dev('C2', 'iai.pcon-cb')], [cable('W1', 'AX2', 'MPG', 'C2', 'MPG')]);
    const c = candidates(d, 'AX1', 'MPG');
    expect(c[0]).toMatchObject({ device: 'C1', type: 'iai.pcon-cb' });
    expect(c.some((x) => x.device === 'C2')).toBe(false);
  });

  it('別のシートの機器は出さない', () => {
    const d = { ...diagram([dev('AX1', 'iai.rcp6-sa', { sheet: 'S1' }), dev('C1', 'iai.pcon-cb', { sheet: 'S2' })]), sheets: [{ id: 'S1', name: '1' }, { id: 'S2', name: '2' }] } as Diagram;
    expect(candidates(d, 'AX1', 'MPG').some((x) => x.device === 'C1')).toBe(false);
  });

  it('LAN ポート・コネクタ以外の端子では出さない', () => {
    const lan = deviceDefinitions.find((d) => resolveDevice(d).terminals.some((t) => t.connector?.kind === 'RJ45'))!;
    const port = resolveDevice(lan).terminals.find((t) => t.connector?.kind === 'RJ45')!;
    expect(candidates(diagram([dev('X1', lan.type)]), 'X1', port.id)).toEqual([]);
    expect(candidates(diagram([dev('PS1', 'generic.psu.dc24v')]), 'PS1', '+V1')).toEqual([]);
  });
});

describe('applyMateCandidate', () => {
  it('新しい機器を引いたコネクタの位置に置き、ケーブルでつなぎ、引いた側の設定を変える', () => {
    const d = diagram([dev('AX1', 'iai.rcp6-sa', { sheet: 'S1' })]);
    const c = candidates(d, 'AX1', 'MPG').find((x) => x.type === 'iai.rcon-pc')!;
    const { diagram: out, device } = applyMateCandidate(d, { device: 'AX1', terminal: 'MPG' }, c, { x: 300, y: 200 }, getDeviceDefinition);
    const placed = out.devices.find((x) => x.id === device)!;
    expect(placed).toMatchObject({ type: 'iai.rcon-pc', sheet: 'S1' });
    const hit = resolveDevice(getDeviceDefinition('iai.rcon-pc')!, placed.params).terminal(c.pairs[0].to)!;
    expect({ x: placed.x + hit.x, y: placed.y + hit.y }).toEqual({ x: 300, y: 200 });
    expect(out.devices.find((x) => x.id === 'AX1')!.params).toMatchObject({ ctrl: 'rcon' });
    expect(out.wires).toEqual([expect.objectContaining({ from: { device: 'AX1', terminal: 'MPG' }, to: { device, terminal: c.pairs[0].to }, wireType: 'CABLE', wireNo: 'CBL-AX1' })]);
  });

  it('組が複数あればケーブルを組の数だけ張り、図面の機器にはそのままつなぐ', () => {
    const d = diagram([dev('AX1', 'iai.rcs4-sa'), dev('C1', 'iai.scon-cb')]);
    const c = candidates(d, 'AX1', 'MOT').find((x) => x.device === 'C1')!;
    const { diagram: out, device } = applyMateCandidate(d, { device: 'AX1', terminal: 'MOT' }, c, { x: 0, y: 0 }, getDeviceDefinition);
    expect(device).toBe('C1');
    expect(out.devices).toHaveLength(2);
    expect(out.wires.map((w) => [w.from.terminal, w.to.terminal, w.wireNo])).toEqual([
      ['MOT', 'MOT', 'CBL-AX1'],
      ['PG', 'PG', 'CBL-AX1-2'],
    ]);
  });

  it('装着が必要な機器を選ぶと、ゲートウェイも置いて装着する。図面に空きのあるゲートウェイがあればそこに装着する', () => {
    const d = diagram([dev('AX1', 'iai.rcp6-sa')]);
    const rcon = candidates(d, 'AX1', 'MPG').find((x) => x.type === 'iai.rcon-pc')!;
    const r = applyMateCandidate(d, { device: 'AX1', terminal: 'MPG' }, rcon, { x: 400, y: 200 }, getDeviceDefinition);
    const placed = r.diagram.devices.find((x) => x.id === r.device)!;
    const gw = r.diagram.devices.find((x) => x.type === rcon.hostType)!;
    expect(placed.mount).toEqual({ device: gw.id, slot: 1 });
    // 2 台目は同じゲートウェイに装着する
    const d2: Diagram = { ...r.diagram, devices: [...r.diagram.devices, dev('AX2', 'iai.rcp6-sa')] };
    const rcon2 = candidates(d2, 'AX2', 'MPG').find((x) => x.type === 'iai.rcon-pc' && !x.device)!;
    expect(rcon2.host).toBe(gw.id);
    const r2 = applyMateCandidate(d2, { device: 'AX2', terminal: 'MPG' }, rcon2, { x: 600, y: 200 }, getDeviceDefinition);
    expect(r2.diagram.devices.filter((x) => x.type === rcon.hostType)).toHaveLength(1);
    expect(r2.diagram.devices.find((x) => x.id === r2.device)!.mount).toEqual({ device: gw.id, slot: 2 });
  });
});

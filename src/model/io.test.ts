import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import type { Diagram } from './diagram';
import { addTerminalBlock, connectIo, disconnectIo, ioHosts, ioSystem, setComment } from './io';
import { moveToSheet, splitCrossSheetWires, splitWireWithLinks } from './ops';

const lookup = getDeviceDefinition;
const attrs = { color: 'blue', sizeSq: 0.75, wireType: 'KIV' };

/** PLC（シート S1）と、センサー・接触器（シート S2） */
const base = (): Diagram => ({
  sheets: [
    { id: 'S1', name: 'PLC' },
    { id: 'S2', name: '現場' },
  ],
  devices: [
    { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 0, y: 0, sheet: 'S1' },
    { id: 'IN1', type: 'keyence.kv-c32xc.input', x: 0, y: 0, sheet: 'S1', mount: { device: 'PLC1', slot: 1 } },
    { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0, sheet: 'S1', mount: { device: 'PLC1', slot: 2 } },
    { id: 'S1', type: 'keyence.pz-g41', x: 0, y: 0, sheet: 'S2' },
    { id: 'KM1', type: 'mitsubishi.sd-t12.dc24v', x: 300, y: 0, sheet: 'S1' },
  ],
  wires: [],
});

describe('I/O の一覧と接続', () => {
  it('PLC の親と装着したユニットの I/O 点を、装着位置の番号で一覧にする', () => {
    const d = base();
    expect(ioHosts(d, lookup)).toEqual(['PLC1']);
    const sys = ioSystem(d, 'OUT1', lookup)!;
    expect(sys.host.id).toBe('PLC1');
    expect(sys.units.map((u) => u.device.id)).toEqual(['IN1', 'OUT1']);
    const inputs = sys.units[0].points;
    expect(inputs).toHaveLength(32);
    expect(inputs[0]).toMatchObject({ dir: 'in', address: 'R000', kind: 'dc' });
    expect(sys.units[1].points[0]).toMatchObject({ dir: 'out', address: 'R200' });
    // MIL コネクタにはまだ端子台がない
    expect(inputs[0].endpoint).toBeUndefined();
    expect(sys.units[0].bareConnectors).toEqual(['CN1']);
  });

  it('変換端子台を追加すると、端子台のネジ端子が電線をつなぐ端子になる', () => {
    const d = addTerminalBlock(base(), 'IN1', 'CN1', deviceDefinitions, lookup);
    const tb = d.devices.find((x) => x.type === 'generic.mil-terminal-block.34p')!;
    expect(tb.sheet).toBe('S1');
    const p = ioSystem(d, 'PLC1', lookup)!.units[0].points[0];
    expect(p.endpoint?.device).toBe(tb.id);
  });

  it('別のシートのセンサーへは入出力番号のリンクでつなぎ、コメントにセンサーの名前を入れる。外すとリンクも消える', () => {
    let d = addTerminalBlock(base(), 'IN1', 'CN1', deviceDefinitions, lookup);
    const p = ioSystem(d, 'PLC1', lookup)!.units[0].points[0];
    d = connectIo(d, p, { device: 'S1', terminal: 'BK' }, attrs, lookup);
    const links = d.devices.filter((x) => x.type === 'generic.link');
    expect(links.map((l) => [l.sheet, l.params?.name])).toEqual([
      ['S1', 'R000'],
      ['S2', 'R000'],
    ]);
    const after = ioSystem(d, 'PLC1', lookup)!.units[0].points[0];
    expect(after.connections.map((c) => c.name)).toEqual(['S1.BK']);
    expect(after.comment).toContain('S1');
    expect(d.wires.filter((w) => w.wireNo === 'R000')).toHaveLength(2);
    // リンクの導通がチェックに反映される（リンクの指摘が出ない）
    expect(checkDiagram(d, lookup).filter((i) => i.rule.startsWith('link-'))).toEqual([]);

    const removed = disconnectIo(d, after, after.connections[0].ref, lookup);
    expect(removed.devices.filter((x) => x.type === 'generic.link')).toEqual([]);
    expect(ioSystem(removed, 'PLC1', lookup)!.units[0].points[0].connections).toEqual([]);
  });

  it('同じシートの負荷へは電線 1 本でつなぐ', () => {
    let d = addTerminalBlock(base(), 'OUT1', 'CN1', deviceDefinitions, lookup);
    const p = ioSystem(d, 'PLC1', lookup)!.units[1].points[0];
    d = connectIo(d, p, { device: 'KM1', terminal: 'A2' }, attrs, lookup);
    expect(d.devices.some((x) => x.type === 'generic.link')).toBe(false);
    expect(ioSystem(d, 'PLC1', lookup)!.units[1].points[0].connections.map((c) => c.name)).toEqual(['KM1.A2']);
  });

  it('コメントを設定・削除できる', () => {
    let d = setComment(base(), 'IN1', 'CN1#1', '原点センサー');
    expect(ioSystem(d, 'PLC1', lookup)!.units[0].points[0].comment).toBe('原点センサー');
    d = setComment(d, 'IN1', 'CN1#1', '');
    expect(d.devices.find((x) => x.id === 'IN1')!.comments).toBeUndefined();
  });
});

describe('シート', () => {
  it('機器を別のシートへ移すと、装着したユニットも一緒に移り、またがる電線はリンクに置き換わる', () => {
    let d = base();
    d = { ...d, wires: [{ id: 'W1', from: { device: 'KM1', terminal: 'A1' }, to: { device: 'S1', terminal: 'BN' }, wireNo: '24', ...attrs }] };
    d = moveToSheet(d, ['IN1'], 'S2', lookup);
    expect(d.devices.filter((x) => x.sheet === 'S2' && x.type !== 'generic.link').map((x) => x.id).sort()).toEqual(['IN1', 'OUT1', 'PLC1', 'S1']);
    // KM1（S1）と S1（S2）の電線がリンク「24」の組になる
    expect(d.wires.some((w) => w.from.device === 'KM1' && w.to.device === 'S1')).toBe(false);
    expect(d.devices.filter((x) => x.type === 'generic.link').map((x) => x.params?.name)).toEqual(['24', '24']);
  });

  it('読み込んだデータのシートをまたぐ電線もリンクに置き換える', () => {
    const d: Diagram = { ...base(), wires: [{ id: 'W1', from: { device: 'KM1', terminal: 'A1' }, to: { device: 'S1', terminal: 'BN' }, ...attrs }] };
    const out = splitCrossSheetWires(d, lookup);
    expect(out.devices.filter((x) => x.type === 'generic.link').map((x) => x.params?.name)).toEqual(['L1', 'L1']);
  });

  it('同じシートの電線をリンクで分けられる（線番がリンクの名前になる）', () => {
    const d: Diagram = { ...base(), wires: [{ id: 'W1', from: { device: 'KM1', terminal: 'A1' }, to: { device: 'PLC1', terminal: '24V+' }, wireNo: 'P24', ...attrs }] };
    const out = splitWireWithLinks(d, 'W1', lookup);
    const links = out.devices.filter((x) => x.type === 'generic.link');
    expect(links.map((l) => [l.sheet, l.params?.name])).toEqual([
      ['S1', 'P24'],
      ['S1', 'P24'],
    ]);
    expect(out.wires).toHaveLength(2);
    expect(checkDiagram(out, lookup).filter((i) => i.rule.startsWith('link-'))).toEqual([]);
  });
});

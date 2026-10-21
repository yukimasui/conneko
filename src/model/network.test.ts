import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramWire } from './diagram';
import { NET_LINK_TYPE, splitCrossSheetWires, splitWireWithLinks } from './ops';
import { applyNetwork, suggestConnections } from './suggest';

const lookup = getDeviceDefinition;
const cable = (id: string, a: string, b: string): DiagramWire => {
  const [ad, at] = a.split('.');
  const [bd, bt] = b.split('.');
  return { id, from: { device: ad, terminal: at }, to: { device: bd, terminal: bt }, color: 'black', sizeSq: 0, wireType: 'CABLE' };
};
const rules = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);
const netLinks = (d: Diagram) => d.devices.filter((x) => x.type === NET_LINK_TYPE);

/** PLC（シート S1）とタッチパネル 2 台（シート S2） */
const base = (): Diagram => ({
  sheets: [
    { id: 'S1', name: '制御盤' },
    { id: 'S2', name: '操作盤' },
  ],
  devices: [
    { id: 'PLC1', type: 'keyence.kv-x550', x: 0, y: 0, sheet: 'S1' },
    { id: 'HMI1', type: 'keyence.vt5-w07', x: 0, y: 0, sheet: 'S2' },
    { id: 'HMI2', type: 'keyence.vt5-w07', x: 400, y: 0, sheet: 'S2' },
  ],
  wires: [],
});

describe('ネットワークリンク', () => {
  it('シートをまたぐ LAN ケーブルはネットワークリンクの組に置き換わり、リンクの指摘が出ない', () => {
    const d = splitCrossSheetWires({ ...base(), wires: [cable('C1', 'PLC1.PORT1', 'HMI1.LAN')] }, lookup);
    expect(netLinks(d).map((x) => [x.sheet, x.params?.name])).toEqual([
      ['S1', 'LAN1'],
      ['S2', 'LAN1'],
    ]);
    expect(d.wires.every((w) => w.wireType === 'CABLE')).toBe(true);
    expect(rules(d).filter((r) => r.startsWith('link-') || r === 'protocol-mismatch')).toEqual([]);
  });

  it('同じ名前のネットワークに、通信方式の合わないポートがあると警告する（EtherCAT と Ethernet）', () => {
    let d = base();
    d = applyNetwork(d, { device: 'PLC1', terminal: 'PORT3' }, '制御LAN', { x: 0, y: 300 }, lookup);
    d = applyNetwork(d, { device: 'HMI1', terminal: 'LAN' }, '制御LAN', { x: 0, y: 300 }, lookup);
    expect(rules(d)).toContain('protocol-mismatch');
    // Ethernet のポート（PORT1）なら合う。HMI2 も同じネットワークに何台でもつなげる
    let ok = base();
    ok = applyNetwork(ok, { device: 'PLC1', terminal: 'PORT1' }, '制御LAN', { x: 0, y: 300 }, lookup);
    ok = applyNetwork(ok, { device: 'HMI1', terminal: 'LAN' }, '制御LAN', { x: 0, y: 300 }, lookup);
    ok = applyNetwork(ok, { device: 'HMI2', terminal: 'LAN' }, '制御LAN', { x: 400, y: 300 }, lookup);
    expect(rules(ok).filter((r) => r.startsWith('link-') || r === 'protocol-mismatch')).toEqual([]);
  });

  it('電線用のリンクとは名前の空間が別', () => {
    let d = base();
    d = applyNetwork(d, { device: 'PLC1', terminal: 'PORT1' }, 'P24', { x: 0, y: 300 }, lookup);
    d = { ...d, devices: [...d.devices, { id: 'LK1', type: 'generic.link', x: 0, y: 0, sheet: 'S2', params: { name: 'P24' } }] };
    // どちらも相手がいない
    expect(rules(d).filter((r) => r === 'link-alone')).toHaveLength(2);
  });

  it('LAN ポートから離したときはネットワーク名を候補に出し、LAN ケーブルもリンクで分けられる', () => {
    let d = applyNetwork(base(), { device: 'PLC1', terminal: 'PORT1' }, '制御LAN', { x: 0, y: 300 }, lookup);
    expect(suggestConnections(d, { device: 'HMI1', terminal: 'LAN' }, lookup).networks).toEqual(['制御LAN']);
    d = { ...base(), sheets: undefined, devices: base().devices.map((x) => ({ ...x, sheet: undefined })), wires: [cable('C1', 'PLC1.PORT1', 'HMI1.LAN')] };
    const split = splitWireWithLinks(d, 'C1', lookup);
    expect(netLinks(split)).toHaveLength(2);
    expect(rules(split).filter((r) => r.startsWith('link-'))).toEqual([]);
  });

  it('スイッチングハブ: Ethernet の機器はつながり、EtherCAT のポートをつなぐと通信方式の不一致', () => {
    const d: Diagram = {
      devices: [
        { id: 'PLC1', type: 'keyence.kv-x550', x: 0, y: 0 },
        { id: 'HMI1', type: 'keyence.vt5-w07', x: 0, y: 0 },
        { id: 'HUB1', type: 'generic.ethernet-switch.8p', x: 0, y: 0 },
      ],
      wires: [cable('C1', 'PLC1.PORT1', 'HUB1.P1'), cable('C2', 'HMI1.LAN', 'HUB1.P2')],
    };
    expect(rules(d)).not.toContain('protocol-mismatch');
    expect(rules({ ...d, wires: [...d.wires, cable('C3', 'PLC1.PORT3', 'HUB1.P3')] })).toContain('protocol-mismatch');
  });

  it('LAN ポートから離したときのリンク名の案は、EtherCAT なら ECAT1、ほかは LAN1 から空いている番号', () => {
    let d = base();
    expect(suggestConnections(d, { device: 'HMI1', terminal: 'LAN' }, lookup).defaultName).toBe('LAN1');
    expect(suggestConnections(d, { device: 'PLC1', terminal: 'PORT3' }, lookup).defaultName).toBe('ECAT1');
    d = applyNetwork(d, { device: 'HMI1', terminal: 'LAN' }, 'LAN1', { x: 0, y: 300 }, lookup);
    expect(suggestConnections(d, { device: 'HMI2', terminal: 'LAN' }, lookup).defaultName).toBe('LAN2');
  });
});

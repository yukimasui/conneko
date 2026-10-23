import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram } from './diagram';
import { sampleDiagram } from './sample';
import { applyIoCandidate, applyPowerCandidate, suggestConnections } from './suggest';

const lookup = getDeviceDefinition;
const base = { color: 'black', sizeSq: 2, wireType: 'KIV' };

/** サンプル図面の入出力機器シートに、表示灯 PL9 とセンサー PH9 を置いたもの */
const withNew = (): Diagram => ({
  ...sampleDiagram,
  devices: [
    ...sampleDiagram.devices,
    { id: 'PL9', type: 'generic.pilot-lamp.dc24v', x: 700, y: 400, sheet: 'S4' },
    { id: 'PH9', type: 'keyence.pz-g41', x: 900, y: 400, sheet: 'S4' },
    { id: 'MC9', type: 'mitsubishi.s-t10.ac200v', x: 900, y: 600, sheet: 'S4' },
  ],
});

describe('何もないところで離したときの接続先の候補', () => {
  it('DC24V の + を受ける端子には P24 を出し、NPN 出力（0V 側につなぐ）は出さない', () => {
    const s = suggestConnections(withNew(), { device: 'PL9', terminal: 'X1' }, lookup);
    expect(s.power.map((p) => p.name)).toContain('P24');
    expect(s.power.map((p) => p.name)).not.toContain('N24');
    expect(s.io).toEqual([]);
  });

  it('負荷の 0V 側には空いている NPN 出力を出す。センサーの電源線には出さない', () => {
    expect(suggestConnections(withNew(), { device: 'PL9', terminal: 'X2' }, lookup).io[0].point).toMatchObject({ dir: 'out', address: 'R204' });
    expect(suggestConnections(withNew(), { device: 'PH9', terminal: 'BU' }, lookup).io).toEqual([]);
  });

  it('センサーの出力線には空いている PLC 入力を出す（電源の候補は出さない）', () => {
    const s = suggestConnections(withNew(), { device: 'PH9', terminal: 'BK' }, lookup);
    expect(s.power).toEqual([]);
    expect(s.io[0].point).toMatchObject({ dir: 'in', address: 'R005' });
  });

  it('既存のリンクの名前を選ぶと、離した位置に同じ名前のリンクを置く', () => {
    const d = withNew();
    const s = suggestConnections(d, { device: 'PL9', terminal: 'X2' }, lookup);
    const n24 = s.power.find((p) => p.name === 'N24')!;
    const out = applyPowerCandidate(d, { device: 'PL9', terminal: 'X2' }, n24, { x: 650, y: 500 }, base, lookup);
    const added = out.devices.filter((x) => !d.devices.includes(x));
    expect(added.map((x) => [x.type, x.params?.name, x.sheet])).toEqual([['generic.link', 'N24', 'S4']]);
    expect(out.wires.at(-1)).toMatchObject({ color: 'blue', wireNo: 'N24' });
  });

  it('リンクのない電源（AC200V の操作回路）を選ぶと、電源側にもリンクを置いてつなぐ', () => {
    const d = withNew();
    const s = suggestConnections(d, { device: 'MC9', terminal: 'A1' }, lookup);
    const c = s.power.find((p) => p.attach?.device === 'CP1')!;
    expect(c).toBeDefined();
    const out = applyPowerCandidate(d, { device: 'MC9', terminal: 'A1' }, c, { x: 850, y: 560 }, base, lookup);
    const links = out.devices.filter((x) => !d.devices.includes(x));
    expect(links.map((x) => x.sheet).sort()).toEqual(['S1', 'S4']);
    expect(new Set(links.map((x) => x.params?.name)).size).toBe(1);
    const issues = checkDiagram(out, lookup).filter((i) => i.devices.includes('MC9') && i.rule !== 'unconnected');
    expect(issues.filter((i) => i.rule.startsWith('link-'))).toEqual([]);
  });

  it('PLC 入力を選ぶと、入出力番号のリンクでつなぐ', () => {
    const d = withNew();
    const s = suggestConnections(d, { device: 'PH9', terminal: 'BK' }, lookup);
    const out = applyIoCandidate(d, { device: 'PH9', terminal: 'BK' }, s.io[0], base, lookup);
    expect(out.devices.filter((x) => !d.devices.includes(x) && x.type === 'generic.link').map((x) => x.params?.name)).toEqual(['R005', 'R005']);
  });
});

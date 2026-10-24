/**
 * 接点（a 接点・b 接点）の定格電流のチェック（contact-overload、#10）。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import type { Diagram, DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'IV' };
};
const lookup = (t: string) => getDeviceDefinition(t);
const contactIssues = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule === 'contact-overload');

describe('接点の定格電流（contact-overload）', () => {
  /** 三相 200V から電磁接触器 S-T12（主接点 AC-3 13A）でモーターを開閉する */
  const motor = (ratedCurrent: number): Diagram => ({
    devices: [
      { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 },
      { id: 'MC1', type: 'mitsubishi.s-t12.ac200v', x: 0, y: 0 },
      { id: 'M1', type: 'generic.motor.3p', x: 0, y: 0, params: { ratedCurrent } },
    ],
    wires: [w('SRC.R', 'MC1.1/L1'), w('SRC.S', 'MC1.3/L2'), w('SRC.T', 'MC1.5/L3'), w('MC1.2/T1', 'M1.U'), w('MC1.4/T2', 'M1.V'), w('MC1.6/T3', 'M1.W')],
  });

  it('主接点の定格（13A）以内のモーター（9.6A）は指摘なし', () => {
    expect(contactIssues(motor(9.6))).toEqual([]);
  });

  it('主接点の定格を超えるモーター（15.4A）を開閉すると、極ごとに注意', () => {
    const issues = contactIssues(motor(15.4));
    expect(issues).toHaveLength(3);
    expect(issues[0].message).toMatch(/MC1 の接点 1\/L1-2\/T1: 開閉する負荷（M1）の定格電流の合計 15.4A が接点の定格 13A を超えています/);
  });

  it('向きのない接点は、電源の来ていない側の負荷で比べる（リレーの a 接点でモーターの 1 相を開閉）', () => {
    const d: Diagram = {
      devices: [
        { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 },
        { id: 'CR1', type: 'omron.my2n.ac100', x: 0, y: 0 },
        { id: 'M1', type: 'generic.motor.3p', x: 0, y: 0, params: { ratedCurrent: 6.6 } },
      ],
      wires: [w('SRC.R', 'CR1.9'), w('CR1.5', 'M1.U')],
    };
    const issues = contactIssues(d);
    expect(issues).toHaveLength(1);
    expect(issues[0].message).toMatch(/CR1 の接点 9-5: .*6.6A が接点の定格 5A/);
  });

  it('リレーの接点に定格電流がある（MY2N 5A・MY4N 3A・RU2S 10A・RJ2S 8A）', () => {
    const rated = (type: string) => [...new Set(resolveDevice(getDeviceDefinition(type)!).links.filter((l) => l.switch === 'NO' || l.switch === 'NC').map((l) => l.ratedCurrent))];
    expect(rated('omron.my2n.dc24')).toEqual([5]);
    expect(rated('omron.my4n.dc24')).toEqual([3]);
    expect(rated('idec.ru2s-d24')).toEqual([10]);
    expect(rated('idec.rj2s-cl-d24')).toEqual([8]);
  });
});

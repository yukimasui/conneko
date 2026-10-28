/**
 * まとめてつなぐ: 2 台の機器のあいだで、相・極・接地を合わせた接続案。
 */
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import { applyProposals, proposeConnections } from './bulkConnect';
import type { Diagram, DiagramWire } from './diagram';

const lookup = (t: string) => getDeviceDefinition(t);
let seq = 0;
const w = (from: string, to: string, wireNo?: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'IV', ...(wireNo ? { wireNo } : {}) };
};
const pairs = (d: Diagram, a: string, b: string) => {
  const p = proposeConnections(d, a, b, lookup);
  return { source: p.source, pairs: p.proposals.map((x) => `${x.from.device}.${x.from.terminal}-${x.to.device}.${x.to.terminal}`) };
};
const base = { color: 'black', sizeSq: 2, wireType: 'IV' };

describe('まとめてつなぐの接続案', () => {
  const devices: Diagram['devices'] = [
    { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 },
    { id: 'ELB1', type: 'mitsubishi.nv32-sv.3p', x: 0, y: 0 },
    { id: 'MC1', type: 'mitsubishi.s-t12.ac200v', x: 0, y: 0 },
    { id: 'M1', type: 'generic.motor.3p', x: 0, y: 0 },
    { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0 },
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
    { id: 'TB1', type: 'generic.terminal-block.6p', x: 0, y: 0 },
  ];

  it('一次電源の R・S・T を遮断器の一次側 1・3・5 へ（端子の番号で相を合わせる）', () => {
    expect(pairs({ devices, wires: [] }, 'SRC', 'ELB1')).toEqual({ source: 'SRC', pairs: ['SRC.R-ELB1.1', 'SRC.S-ELB1.3', 'SRC.T-ELB1.5'] });
  });

  it('遮断器の二次側から電磁接触器の主接点へ。逆の順にクリックしても、電源を出す側から引く', () => {
    const d: Diagram = { devices, wires: [w('SRC.R', 'ELB1.1', 'R'), w('SRC.S', 'ELB1.3', 'S'), w('SRC.T', 'ELB1.5', 'T')] };
    const expected = { source: 'ELB1', pairs: ['ELB1.2-MC1.1/L1', 'ELB1.4-MC1.3/L2', 'ELB1.6-MC1.5/L3'] };
    expect(pairs(d, 'ELB1', 'MC1')).toEqual(expected);
    expect(pairs(d, 'MC1', 'ELB1')).toEqual(expected);
  });

  it('電磁接触器の二次側からモーターの U・V・W へ。一次電源の接地はモーターの E へ', () => {
    expect(pairs({ devices, wires: [] }, 'MC1', 'M1').pairs).toEqual(['MC1.2/T1-M1.U', 'MC1.4/T2-M1.V', 'MC1.6/T3-M1.W']);
    expect(pairs({ devices, wires: [] }, 'SRC', 'M1').pairs).toEqual(['SRC.R-M1.U', 'SRC.S-M1.V', 'SRC.T-M1.W', 'SRC.PE-M1.E']);
  });

  it('S・T 相から取ったサーキットプロテクタの二次側は、電源ユニットの L・N へ並び順で合わせる。接地は合わせない', () => {
    const d: Diagram = { devices, wires: [w('SRC.S', 'CP1.1'), w('SRC.T', 'CP1.3')] };
    expect(pairs(d, 'CP1', 'PSU1').pairs).toEqual(['CP1.2-PSU1.L', 'CP1.4-PSU1.N']);
  });

  it('すでに電線のある受ける側の端子にはつながない', () => {
    const d: Diagram = { devices, wires: [w('SRC.R', 'ELB1.1')] };
    expect(pairs(d, 'SRC', 'ELB1').pairs).toEqual(['SRC.S-ELB1.3', 'SRC.T-ELB1.5']);
  });

  it('端子台へは、空いている上下の組の片側へ並び順で', () => {
    expect(pairs({ devices, wires: [] }, 'ELB1', 'TB1').pairs).toEqual(['ELB1.2-TB1.1a', 'ELB1.4-TB1.2a', 'ELB1.6-TB1.3a']);
  });

  it('同じ種類のコネクタはケーブルでつなぐ（PLC の入力ユニットと MIL 変換端子台）', () => {
    const d: Diagram = {
      devices: [
        { id: 'IN1', type: 'keyence.kv-c32xc.input', x: 0, y: 0 },
        { id: 'TB3', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      ],
      wires: [],
    };
    const p = proposeConnections(d, 'IN1', 'TB3', lookup);
    expect(p.proposals).toEqual([{ from: { device: 'IN1', terminal: 'CN1' }, to: { device: 'TB3', terminal: 'CN' }, reason: 'ケーブル', cable: true }]);
  });

  it('選んだ案の電線を足す。出す側の線番を引き継ぎ、色は回路に合わせる。足した図面はチェックで地絡・短絡にならない', () => {
    const d: Diagram = { devices: devices.filter((x) => ['SRC', 'ELB1', 'M1'].includes(x.id)), wires: [w('SRC.R', 'ELB1.1', 'R'), w('SRC.S', 'ELB1.3', 'S'), w('SRC.T', 'ELB1.5', 'T')] };
    const plan = proposeConnections(d, 'ELB1', 'M1', lookup);
    const next = applyProposals(d, plan.proposals, base);
    const added = next.wires.slice(3);
    expect(added.map((x) => [x.from.terminal, x.to.terminal])).toEqual([
      ['2', 'U'],
      ['4', 'V'],
      ['6', 'W'],
    ]);
    expect(new Set(added.map((x) => x.id)).size).toBe(3);
    // 遮断器の二次側なので、許容電流が遮断器の定格以上の太さにする（新しく引く電線の 2sq より太く）
    expect(added.every((x) => x.sizeSq >= 3.5)).toBe(true);
    expect(added.map((x) => x.wireNo)).toEqual([undefined, undefined, undefined]);
    const rules = checkDiagram(next, lookup).map((i) => i.rule);
    expect(rules).not.toContain('short-circuit');
    expect(rules).not.toContain('ground-fault');
    expect(rules).not.toContain('same-phase');
    expect(rules).not.toContain('wire-too-thin');
    expect(rules).not.toContain('wire-size-terminal');
  });

  it('向きを決めて出すこともできる（fixed）', () => {
    expect(proposeConnections({ devices, wires: [] }, 'M1', 'MC1', lookup, true).proposals).toEqual([]);
  });

});

describe('電源の種類・電圧から推定する', () => {
  const devices: Diagram['devices'] = [
    { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 },
    { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0 },
    { id: 'MC1', type: 'mitsubishi.s-t12.ac200v', x: 0, y: 0 },
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
    { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
    { id: 'CR1', type: 'omron.my2n.ac100', x: 0, y: 0 },
    { id: 'CR2', type: 'omron.my2n.dc24', x: 0, y: 0 },
  ];
  const fed: Diagram = { devices, wires: [w('SRC.S', 'CP1.1'), w('SRC.T', 'CP1.3')] };

  it('単相 2 線のサーキットプロテクタから電磁接触器へは、主接点ではなくコイル A1・A2 へ', () => {
    expect(pairs(fed, 'CP1', 'MC1').pairs).toEqual(['CP1.2-MC1.A1', 'CP1.4-MC1.A2']);
  });

  it('DC24V 電源から表示灯へは、名前で極の分からない X1・X2 に + と − を並び順で', () => {
    expect(pairs(fed, 'PSU1', 'PL1').pairs).toEqual(['PSU1.+V1-PL1.X1', 'PSU1.-V1-PL1.X2']);
  });

  it('電圧・種類の合わない組は出さない（AC200V → AC100V のコイル、DC24V → AC200V のコイル）', () => {
    expect(pairs(fed, 'CP1', 'CR1').pairs).toEqual([]);
    expect(pairs(fed, 'PSU1', 'MC1').pairs).toEqual([]);
    expect(pairs(fed, 'PSU1', 'CR2').pairs.length).toBe(2);
  });

  it('推定した電線をつないだ図面は、電圧・極性・同相のエラーにならない', () => {
    let d = fed;
    for (const [a, b] of [
      ['CP1', 'MC1'],
      ['PSU1', 'PL1'],
      ['PSU1', 'CR2'],
    ]) {
      d = applyProposals(d, proposeConnections(d, a, b, lookup).proposals, base);
    }
    const rules = checkDiagram(d, lookup).filter((i) => i.severity === 'error').map((i) => i.rule);
    expect(rules).toEqual([]);
  });
});

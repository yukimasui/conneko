import type { Diagram, DiagramWire } from './diagram';

/**
 * 起動時に表示するサンプル図面。
 * 三相200V → 漏電遮断器 → 電磁接触器 → サーマルリレー → モーター の主回路と、
 * サーキットプロテクタから取る操作回路・DC24V 回路。
 * PLC（KEYENCE KV-8000）と入出力ユニットは MIL ケーブルで変換端子台へ、タッチパネル VT5 とは LAN でつなぐ。
 * 盤用ファン（FAN1）は「配置済み・未配線」の例として配線していない（AI 連携の練習用）。
 */

let n = 0;
function w(from: string, to: string, wireNo: string, color: string, sizeSq: number): DiagramWire {
  const [fd, ft] = from.split(':');
  const [td, tt] = to.split(':');
  return {
    id: `W${++n}`,
    from: { device: fd, terminal: ft },
    to: { device: td, terminal: tt },
    wireNo,
    color,
    sizeSq,
    wireType: 'KIV',
  };
}

export const sampleDiagram: Diagram = {
  devices: [
    { id: 'PS1', type: 'generic.power-source.3p200v', x: 100, y: 0 },
    { id: 'ELB1', type: 'mitsubishi.nv32-sv.3p', x: 40, y: 180, params: { ratedCurrent: 20 } },
    { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 300, y: 470, params: { ratedCurrent: 3 } },
    { id: 'CP2', type: 'mitsubishi.cp30-ba.2p', x: 420, y: 470, params: { ratedCurrent: 3 } },
    { id: 'MC1', type: 'mitsubishi.s-t10.ac200v', x: 60, y: 680 },
    { id: 'THR1', type: 'mitsubishi.th-t18', x: 60, y: 860, params: { heater: 3.6 } },
    { id: 'M1', type: 'generic.motor.3p', x: 84, y: 1060, params: { ratedCurrent: 3.6 } },
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 420, y: 680, params: { outputCurrent: 5 } },
    { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 300, y: 900 },
    { id: 'FAN1', type: 'generic.panel-fan.ac200v', x: 600, y: 470 },
    { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 820, y: 700 },
    { id: 'IN1', type: 'keyence.kv-c32xc.input', x: 933, y: 700, mount: { device: 'PLC1', slot: 1 } },
    { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 979, y: 700, mount: { device: 'PLC1', slot: 2 } },
    { id: 'TB3', type: 'generic.mil-terminal-block.34p', x: 800, y: 1000 },
    { id: 'TB4', type: 'generic.mil-terminal-block.34p', x: 1080, y: 1000 },
    { id: 'HMI1', type: 'keyence.vt5-w07', x: 1100, y: 330 },
  ],
  wires: [
    // 一次側
    w('PS1:R', 'ELB1:1', 'R', 'black', 3.5),
    w('PS1:S', 'ELB1:3', 'S', 'black', 3.5),
    w('PS1:T', 'ELB1:5', 'T', 'black', 3.5),
    // 主回路
    w('ELB1:2', 'MC1:1/L1', 'R1', 'black', 3.5),
    w('ELB1:4', 'MC1:3/L2', 'S1', 'black', 3.5),
    w('ELB1:6', 'MC1:5/L3', 'T1', 'black', 3.5),
    w('MC1:2/T1', 'THR1:1/L1', 'U1', 'black', 3.5),
    w('MC1:4/T2', 'THR1:3/L2', 'V1', 'black', 3.5),
    w('MC1:6/T3', 'THR1:5/L3', 'W1', 'black', 3.5),
    w('THR1:2/T1', 'M1:U', 'U', 'black', 2),
    w('THR1:4/T2', 'M1:V', 'V', 'black', 2),
    w('THR1:6/T3', 'M1:W', 'W', 'black', 2),
    // 操作回路（電磁接触器のコイル）
    w('ELB1:2', 'CP1:1', 'R1', 'black', 3.5),
    w('ELB1:4', 'CP1:3', 'S1', 'black', 3.5),
    w('CP1:2', 'MC1:A1', 'R2', 'red', 1.25),
    w('CP1:4', 'MC1:A2', 'S2', 'red', 1.25),
    // DC24V 電源
    w('ELB1:4', 'CP2:1', 'S1', 'black', 3.5),
    w('ELB1:6', 'CP2:3', 'T1', 'black', 3.5),
    w('CP2:2', 'PSU1:L', 'S3', 'black', 1.25),
    w('CP2:4', 'PSU1:N', 'T3', 'black', 1.25),
    w('PSU1:+V1', 'PL1:X1', 'P24', 'blue', 0.75),
    w('PSU1:-V1', 'PL1:X2', 'N24', 'blue', 0.75),
    // PLC・タッチパネルの電源（DC24V）
    w('PSU1:+V2', 'PLC1:24V+', 'P24', 'blue', 1.25),
    w('PSU1:-V2', 'PLC1:24V-', 'N24', 'blue', 1.25),
    w('PLC1:24V+', 'HMI1:24V+', 'P24', 'blue', 1.25),
    w('PLC1:24V-', 'HMI1:24V-', 'N24', 'blue', 1.25),
    // 入力ユニットのコモン（+24V）、出力ユニットのコモン（0V）
    w('PLC1:24V+', 'TB3:33', 'P24', 'blue', 0.75),
    w('PLC1:24V-', 'TB4:33', 'N24', 'blue', 0.75),
    // MIL ケーブル・LAN ケーブル
    { id: 'C1', from: { device: 'IN1', terminal: 'CN1' }, to: { device: 'TB3', terminal: 'CN' }, wireNo: 'CBL-IN1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C2', from: { device: 'OUT1', terminal: 'CN1' }, to: { device: 'TB4', terminal: 'CN' }, wireNo: 'CBL-OUT1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C3', from: { device: 'PLC1', terminal: 'ETH' }, to: { device: 'HMI1', terminal: 'LAN' }, wireNo: 'LAN1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    // 接地
    w('PS1:PE', 'M1:E', 'E', 'green', 3.5),
    w('PS1:PE', 'PSU1:PE', 'E', 'green', 2),
    w('PSU1:PE', 'PLC1:FG', 'E', 'green', 2),
    w('PLC1:FG', 'HMI1:FG', 'E', 'green', 2),
  ],
};

import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramWire } from './diagram';
import { alignLinks, alignLinksAs } from './alignLinks';
import { mountedPositions } from './bus';
import { splitCrossSheetWires } from './ops';

/**
 * 起動時に表示するサンプル図面。
 * 三相200V → 漏電遮断器 → 電磁接触器 → サーマルリレー → モーター の主回路と、
 * サーキットプロテクタから取る操作回路・DC24V 回路。
 * PLC（KEYENCE KV-8000）と入出力ユニットは MIL ケーブルで変換端子台へ、タッチパネル VT5 とは LAN でつなぐ。
 * 盤用ファン（FAN1）は「配置済み・未配線」の例として配線していない（AI 連携の練習用）。
 *
 * 回路の意味ごとに 4 枚のシートに分け、シートをまたぐ電線はリンク（同じ名前どうしがつながる記号）に置き換える。
 * 入出力機器のシートには、入力 R000 の光電センサー（PH1）と、出力 R200 の表示灯（PL2）を置く。
 * エア回路のシートには、エア源・フィルタレギュレータ・残圧排気弁・マニホールド（電磁弁 2 連）・スピードコントローラ・
 * オートスイッチ付きのシリンダ・エアチャックを置き、ソレノイドを出力 R201〜R203、オートスイッチを入力 R001〜R004 へつなぐ。
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

/** エアのチューブ（ポリウレタン、青） */
function t(from: string, to: string, od: number): DiagramWire {
  const [fd, ft] = from.split(':');
  const [td, tt] = to.split(':');
  return { id: `W${++n}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0, wireType: 'TU', tubeOD: od };
}

const base: Diagram = {
  sheets: [
    { id: 'S1', name: '主回路' },
    { id: 'S2', name: 'DC24V電源' },
    { id: 'S3', name: 'PLC' },
    { id: 'S4', name: '入出力機器' },
    { id: 'S5', name: 'エア回路' },
  ],
  devices: [
    { id: 'PS1', type: 'generic.power-source.3p200v', x: 100, y: 0 },
    { id: 'ELB1', type: 'mitsubishi.nv32-sv.3p', x: 40, y: 180, params: { ratedCurrent: 20 } },
    { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 300, y: 470, params: { ratedCurrent: 3 } },
    { id: 'CP2', type: 'mitsubishi.cp30-ba.2p', x: 420, y: 470, params: { ratedCurrent: 3 } },
    { id: 'MC1', type: 'mitsubishi.s-t10.ac200v', x: 60, y: 680 },
    { id: 'THR1', type: 'mitsubishi.th-t18', x: 60, y: 860, params: { heater: 3.6 } },
    { id: 'M1', type: 'generic.motor.3p', x: 84, y: 1060, params: { ratedCurrent: 3.6 }, note: 'コンベア駆動' },
    { id: 'PSU1', type: 'generic.psu.dc24v', x: 300, y: 120, params: { outputCurrent: 5 }, sheet: 'S2' },
    { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 120, y: 380, sheet: 'S2', note: 'DC24V 電源表示' },
    { id: 'FAN1', type: 'generic.panel-fan.ac200v', x: 600, y: 470, note: '盤内換気' },
    { id: 'PLC1', type: 'keyence.kv-8000.cpu', x: 200, y: 260, sheet: 'S3' },
    { id: 'IN1', type: 'keyence.kv-c32xc.input', x: 0, y: 0, mount: { device: 'PLC1', slot: 1 }, sheet: 'S3', comments: { 'CN1#1': 'PH1 ワーク検出', 'CN1#3': 'CY1 後退端', 'CN1#5': 'CY1 前進端', 'CN1#7': 'CY2 開', 'CN1#9': 'CY2 閉' } },
    { id: 'OUT1', type: 'keyence.kv-c32tc.output', x: 0, y: 0, mount: { device: 'PLC1', slot: 2 }, sheet: 'S3', comments: { 'CN1#1': 'PL2 運転中表示', 'CN1#3': 'SOL1 プッシャ前進', 'CN1#5': 'SOL2A チャック閉', 'CN1#7': 'SOL2B チャック開' } },
    { id: 'TB3', type: 'generic.mil-terminal-block.34p', x: 120, y: 690, sheet: 'S3' },
    { id: 'TB4', type: 'generic.mil-terminal-block.34p', x: 420, y: 690, sheet: 'S3' },
    { id: 'HMI1', type: 'keyence.vt5-w07', x: 520, y: 0, sheet: 'S3' },
    { id: 'SW1', type: 'generic.ethernet-switch.5p', x: 900, y: 420, sheet: 'S3', note: '制御 LAN（PLC・タッチパネル・SI ユニット）' },
    { id: 'PH1', type: 'keyence.pz-g41', x: 120, y: 120, sheet: 'S4', note: 'ワーク検出（コンベア入口）' },
    { id: 'PL2', type: 'generic.pilot-lamp.dc24v', x: 420, y: 140, sheet: 'S4', note: '運転中表示' },
    // エア回路: エア源 → フィルタレギュレータ → 残圧排気弁 → マニホールド（2 連）→ スピードコントローラ → シリンダ・エアチャック
    { id: 'AIR1', type: 'generic.air-source', x: 0, y: 560, sheet: 'S5' },
    { id: 'FR1', type: 'smc.aw', x: 170, y: 700, params: { setPressure: 0.4 }, sheet: 'S5', note: '装置の元圧 0.4MPa' },
    { id: 'VHS1', type: 'smc.vhs', x: 380, y: 740, params: { tubeOD: 8 }, sheet: 'S5' },
    { id: 'MF1', type: 'smc.ss5y3-41', x: 640, y: 720, sheet: 'S5' },
    { id: 'SOL1', type: 'smc.sy3140-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 1 }, sheet: 'S5', note: 'プッシャ 前進' },
    { id: 'SOL2', type: 'smc.sy3240-5lz', x: 0, y: 0, mount: { device: 'MF1', slot: 2 }, params: { portAB: 4 }, sheet: 'S5', note: 'チャック 閉 / 開' },
    { id: 'SC1', type: 'smc.as-f.inline', x: 760, y: 200, sheet: 'S5' },
    { id: 'SC2', type: 'smc.as-f.inline', x: 760, y: 90, sheet: 'S5' },
    { id: 'CY1', type: 'smc.cm2', x: 960, y: 300, params: { bore: 25, stroke: 100, switch: 'M9N' }, sheet: 'S5', note: 'ワーク押出し' },
    { id: 'CY2', type: 'smc.mhz2', x: 150, y: 110, params: { size: 16, switch: 'M9N', speedController: 'meter-out' }, sheet: 'S5', note: 'ワーク把持（スピコンをポートに直付け）' },
    { id: 'SL1', type: 'smc.an', x: 500, y: 900, params: { thread: '01' }, sheet: 'S5' },
    { id: 'SL2', type: 'smc.an', x: 590, y: 900, params: { thread: '01' }, sheet: 'S5' },
    { id: 'SL3', type: 'smc.an', x: 406, y: 900, params: { thread: '01' }, sheet: 'S5' },
    // 通信タイプのマニホールド（SI ユニット EX260 の EtherNet/IP。ソレノイドは SI ユニットの出力番号で動かす）
    { id: 'J1', type: 'smc.kq2t', x: 560, y: 800, params: { tubeOD: 8 }, sheet: 'S5' },
    { id: 'MF2', type: 'smc.ss5y3-10s', x: 1330, y: 760, params: { protocol: 'E', points: 'B' }, sheet: 'S5', note: 'ストッパ用（EtherNet/IP）' },
    { id: 'SOL4', type: 'smc.sy3200-5u1', x: 0, y: 0, mount: { device: 'MF2', slot: 1 }, sheet: 'S5', note: 'ストッパ 上昇 / 下降' },
    { id: 'CY3', type: 'smc.cq2', x: 1580, y: 1080, sheet: 'S5', note: 'ストッパ' },
    { id: 'CBL2', type: 'smc.ex500-ap050-s', x: 1250, y: 1010, sheet: 'S5' },
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
    // 入出力機器（R000: 光電センサー、R200: 表示灯）
    w('PSU1:+V1', 'PH1:BN', 'P24', 'blue', 0.75),
    w('PSU1:-V1', 'PH1:BU', 'N24', 'blue', 0.75),
    w('TB3:1', 'PH1:BK', 'R000', 'blue', 0.75),
    w('PSU1:+V1', 'PL2:X1', 'P24', 'blue', 0.75),
    w('TB4:1', 'PL2:X2', 'R200', 'blue', 0.75),
    // エア回路: ソレノイド（+ は P24、− は出力ユニットのシンク出力）・オートスイッチ（出力は入力ユニットへ）
    w('PSU1:+V1', 'SOL1:A+', 'P24', 'blue', 0.75),
    w('TB4:3', 'SOL1:A-', 'R201', 'blue', 0.75),
    w('PSU1:+V1', 'SOL2:A+', 'P24', 'blue', 0.75),
    w('TB4:5', 'SOL2:A-', 'R202', 'blue', 0.75),
    w('PSU1:+V1', 'SOL2:B+', 'P24', 'blue', 0.75),
    w('TB4:7', 'SOL2:B-', 'R203', 'blue', 0.75),
    ...(['CY1:SW1', 'CY1:SW2', 'CY2:SW1', 'CY2:SW2'] as const).flatMap((sw, i) => [
      w('PSU1:+V1', `${sw}.BN`, 'P24', 'blue', 0.75),
      w('PSU1:-V1', `${sw}.BU`, 'N24', 'blue', 0.75),
      w(`TB3:${i * 2 + 3}`, `${sw}.BK`, `R00${i + 1}`, 'blue', 0.75),
    ]),
    // エア配管（チューブ）
    t('AIR1:OUT', 'FR1:IN', 8),
    t('FR1:OUT', 'VHS1:IN', 8),
    t('VHS1:OUT', 'J1:A', 8),
    t('J1:B', 'MF1:P', 8),
    t('J1:C', 'MF2:P', 8),
    t('SOL4:A', 'CY3:HEAD', 6),
    t('SOL4:B', 'CY3:ROD', 6),
    t('SOL1:A', 'SC1:IN', 6),
    t('SC1:OUT', 'CY1:HEAD', 6),
    t('SOL1:B', 'SC2:IN', 6),
    t('SC2:OUT', 'CY1:ROD', 6),
    t('SOL2:A', 'CY2:CLOSE', 4),
    t('SOL2:B', 'CY2:OPEN', 4),
    // サイレンサ（排気ポートに直接ねじ込む）
    t('SL1:IN', 'MF1:EA', 8),
    t('SL2:IN', 'MF1:EB', 8),
    t('SL3:IN', 'VHS1:EXH', 8),
    // MIL ケーブル・LAN ケーブル
    { id: 'C1', from: { device: 'IN1', terminal: 'CN1' }, to: { device: 'TB3', terminal: 'CN' }, wireNo: 'CBL-IN1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C2', from: { device: 'OUT1', terminal: 'CN1' }, to: { device: 'TB4', terminal: 'CN' }, wireNo: 'CBL-OUT1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C3', from: { device: 'PLC1', terminal: 'ETH' }, to: { device: 'SW1', terminal: 'P1' }, wireNo: 'LAN1', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C4', from: { device: 'HMI1', terminal: 'LAN' }, to: { device: 'SW1', terminal: 'P2' }, wireNo: 'LAN2', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    // SI ユニットの通信（エア回路のシートの MF2 へ。シートをまたぐのでネットワークリンクに置き換わる）と電源ケーブル
    { id: 'C5', from: { device: 'SW1', terminal: 'P3' }, to: { device: 'MF2', terminal: 'IN' }, wireNo: '制御LAN', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    { id: 'C6', from: { device: 'CBL2', terminal: 'CN' }, to: { device: 'MF2', terminal: 'PWR' }, wireNo: 'CBL-MF2', color: 'black', sizeSq: 0, wireType: 'CABLE' },
    // EtherNet/IP の SI ユニットの電源ケーブル: 1 茶 = 制御用 24V、2 白 = 電磁弁用 24V、3 青 = 制御用 0V、4 黒 = 電磁弁用 0V
    w('PSU1:+V1', 'CBL2:BN', 'P24', 'blue', 0.75),
    w('PSU1:+V1', 'CBL2:WH', 'P24', 'blue', 0.75),
    w('PSU1:-V1', 'CBL2:BU', 'N24', 'blue', 0.75),
    w('PSU1:-V1', 'CBL2:BK', 'N24', 'blue', 0.75),
    // スイッチングハブの電源
    w('PLC1:24V+', 'SW1:V1+', 'P24', 'blue', 1.25),
    w('PLC1:24V-', 'SW1:0V', 'N24', 'blue', 1.25),
    // 接地
    w('PS1:PE', 'M1:E', 'E', 'green', 3.5),
    w('PS1:PE', 'PSU1:PE', 'E', 'green', 2),
    w('PSU1:PE', 'PLC1:FG', 'E', 'green', 2),
    w('PLC1:FG', 'HMI1:FG', 'E', 'green', 2),
    w('PLC1:FG', 'SW1:FG', 'E', 'green', 2),
  ],
  // 展開図の見本（主回路と、DC24V の表示灯・PLC の出力）
  schematic: {
    sheets: [
      {
        id: 'D1',
        name: '主回路',
        items: [
          { element: 'PS1:main', x: 60, y: 22.5, vertical: true },
          { element: 'ELB1:main', x: 60, y: 35, vertical: true },
          { element: 'CP1:main', x: 100, y: 52.5 },
          { element: 'CP2:main', x: 100, y: 67.5 },
          { element: 'MC1:main', x: 60, y: 85, vertical: true },
          { element: 'THR1:main', x: 60, y: 105, vertical: true },
          { element: 'M1:U-V-W', x: 60, y: 125, vertical: true },
          { element: 'MC1:A1-A2', x: 200, y: 52.5 },
        ],
      },
      {
        id: 'D2',
        name: '表示・出力',
        rails: { supply: 'PSU1.+V1', common: 'PSU1.-V1' },
        items: [
          { element: 'PL1:X1-X2', x: 330, y: 30 },
          { element: 'PL2:X1-X2', x: 60, y: 45 },
          { element: 'OUT1:CN1#1', x: 330, y: 45 },
        ],
      },
      { id: 'D9', name: '空圧回路図', kind: 'pneumatic', items: [] },
    ],
  },
};

/**
 * シートをまたぐ電線をリンクにし、エア回路のシートの機器のリンクを端子のそばにそろえる（装着した電磁弁はマニホールドに並べた位置で）。
 * シリンダ・エアチャックの下に出るリード線のリンクは、縦にして端子の下に一列に並べる
 */
function build(): Diagram {
  const lookup = getDeviceDefinition;
  let d = splitCrossSheetWires(base, lookup);
  const pos = mountedPositions(d.devices, lookup);
  d = { ...d, devices: d.devices.map((x) => (pos.has(x.id) ? { ...x, ...pos.get(x.id)! } : x)) };
  for (const id of ['CY1', 'CY2']) d = alignLinksAs(d, id, true, lookup);
  // マニホールドは上にチューブが来るので、ソレノイドのリンクは横にして左右に並べる
  d = alignLinks(d, 'MF1', lookup);
  return d;
}

export const sampleDiagram: Diagram = build();

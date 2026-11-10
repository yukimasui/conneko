/**
 * オムロン マシンオートメーションコントローラ NX102 の CPU ユニット NX102-9000（内蔵 I/O なし、DC24V 電源）。
 *
 * 外形 W72 × H100 × D90 mm（オムロンの NX102 の仕様。1mm ≒ 2px）。
 * 正面（概略）: 左上に型式と OMRON のロゴ、動作表示 LED、その下に SD メモリカード・バッテリのカバー、
 *   下部に内蔵 EtherNet/IP ポート PORT1・PORT2 と内蔵 EtherCAT ポート PORT3（RJ-45、正面に差す）、
 *   右上にユニット電源のスクリューレス・クランプ端子台（プッシュイン、着脱式）。右側面の NX バスコネクタで NX ユニットを最大 32 台連結する。
 * 端子台の並び（上段 + − ⏚、下段 + −。上段・下段の + どうし・− どうしは内部で接続）と正面の配置は推定
 *   （ハードウェアユーザーズマニュアル W593 の端子配列を確かめられなかった）。
 *
 * 出典: オムロン NX102 の仕様（https://www.ia.omron.com/products/family/3705/specification.html。ユニット電源 DC24V（20.4〜28.8V）、
 *       消費電力 5.80W 以下（SD メモリカードを含み、NX ユニットへの供給を除く）、突入電流 10A 以下/0.1ms 以下、
 *       EtherNet/IP 用 RJ-45 × 2・EtherCAT 用 RJ-45 × 1、NX ユニット 32 台、外形 72 × 100 × 90mm）、
 *       オムロン EU の製品ページ（NX102-9000: サーボ軸 0、PTP 軸 4、EtherCAT のノード 64）
 */
import { NX_BUS, UNIT_POWER, led, nxDefs, omronLogo, pushIn, r2, rj45, text } from '../omron/nx-parts';
import type { DeviceDefinition, TerminalDef } from '../types';

const W = 144;
const H = 200;
/** ユニット電源の端子台（上段・下段、左から） */
const TB = { x0: 96, pitch: 12, y: [16, 36] };
const TOP = ['+', '-', 'FG'];
const BOTTOM = ['+2', '-2'];
const tbX = (i: number) => TB.x0 + i * TB.pitch;
const PRINT: Record<string, string> = { '+': '+', '-': '−', FG: '⏚', '+2': '+', '-2': '−' };

const PORTS = [
  { id: 'PORT1', x: 24, title: 'PORT1', sub: 'EtherNet/IP', protocols: ['ethernet', 'ethernet-ip'] },
  { id: 'PORT2', x: 60, title: 'PORT2', sub: 'EtherNet/IP', protocols: ['ethernet', 'ethernet-ip'] },
  { id: 'PORT3', x: 96, title: 'PORT3', sub: 'EtherCAT', protocols: ['ethercat'] },
];
const PORT_Y = 176;

const svg = `${nxDefs()}
  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="2.5" fill="url(#nxbody-{{uid}})" stroke="#8e918d" stroke-width="1"/>
  <!-- 右側面の NX バスコネクタ・ユニット連結ガイド -->
  <rect x="${W - 6}" y="60" width="4" height="80" rx="1" fill="#c3c5c2" stroke="#9a9d99" stroke-width="0.5"/>
  <rect x="${W - 5}" y="${H - 22}" width="3" height="14" rx="1" fill="#b8bab7"/>

  ${text(8, 14, 'NX102', 7, '#3a3c3f', 'start')}
  ${text(8, 21, 'CPU UNIT', 3.2, '#55585b', 'start', 'normal')}
  ${omronLogo(40, 36, 9)}

  <!-- ユニット電源の端子台 -->
  <rect x="${tbX(0) - 8}" y="2" width="${(TOP.length - 1) * TB.pitch + 16}" height="46" rx="1.6" fill="url(#nxtb-{{uid}})" stroke="#5f6367" stroke-width="0.7"/>
  ${TOP.map((_, i) => pushIn(tbX(i), TB.y[0], 'up')).join('')}
  ${BOTTOM.map((_, i) => pushIn(tbX(i), TB.y[1], 'down')).join('')}
  <rect x="${tbX(0) - 8}" y="50" width="${(TOP.length - 1) * TB.pitch + 16}" height="13" rx="1" fill="#f4f5f3" stroke="#b9bcb8" stroke-width="0.4"/>
  ${TOP.map((id, i) => text(tbX(i), 55.6, PRINT[id], id === 'FG' ? 4.2 : 3.4)).join('')}
  ${BOTTOM.map((id, i) => text(tbX(i), 61.4, PRINT[id], 3.4)).join('')}
  ${text(tbX(1), 69, 'DC24V', 3, '#55585b', 'middle', 'normal')}

  <!-- 動作表示 -->
  ${[
    ['POWER', true],
    ['RUN', true],
    ['ERROR', false],
    ['BUSY', false],
    ['SHTDWN', false],
    ['SD PWR', false],
    ['SD BUSY', false],
    ['NET RUN', true],
  ]
    .map(([t, on], i) => {
      const x = i < 4 ? 8 : 48;
      const y = 48 + (i % 4) * 7;
      return led(x + 2, y, on as boolean, 3.4, 2) + text(x + 6, y + 1.2, String(t), 3, '#2b2d30', 'start', 'normal');
    })
    .join('')}

  <!-- SD メモリカード・バッテリのカバー -->
  <rect x="6" y="80" width="${W - 18}" height="60" rx="2" fill="url(#nxcover-{{uid}})" stroke="#9a9d99" stroke-width="0.7"/>
  <rect x="${r2(W / 2 - 12)}" y="82" width="12" height="2.4" rx="1" fill="#a7aaa6"/>
  ${text(14, 112, 'SD', 3.4, '#55585b', 'start')}
  ${text(W - 18, 134, 'BATTERY', 3, '#6a6d70', 'end', 'normal')}

  <!-- 内蔵 EtherNet/IP・EtherCAT ポート -->
  ${PORTS.map((p) => `${text(p.x, 151, p.title, 3.2, '#2b2d30')}${text(p.x, 156, p.sub, 2.6, '#2b2d30', 'middle', 'normal')}${rj45(p.x, PORT_Y)}`).join('')}
  ${text(W - 8, H - 3, 'NX102-9000', 3.2, '#55585b', 'end', 'normal')}
`;

const terminal = (id: string, x: number, y: number): TerminalDef => {
  const base = { id, x, y, side: 'top' as const, label: PRINT[id] };
  if (id === 'FG') return { ...base, hint: '機能接地', note: '機能接地（DIN レールの接触板と内部で接続。100Ω 以下で接地）', role: 'ground' };
  const second = id.endsWith('2');
  const c = id.startsWith('+') ? '+' : '-';
  return {
    ...base,
    hint: c === '+' ? 'ユニット電源+' : 'ユニット電源−',
    note: second ? `ユニット電源 ${c}（上段の ${c} と内部で接続。渡り配線用）` : `ユニット電源 DC24V ${c}（20.4〜28.8V）`,
    role: 'input',
    accepts: UNIT_POWER(c),
    ...(second ? { optional: true } : {}),
  };
};

const terminals: TerminalDef[] = [
  ...TOP.map((id, i) => terminal(id, tbX(i), TB.y[0])),
  ...BOTTOM.map((id, i) => terminal(id, tbX(i), TB.y[1])),
  ...PORTS.map(
    (p): TerminalDef => ({
      id: p.id,
      label: `${p.title} ${p.sub} (RJ45)`,
      note: p.id === 'PORT3' ? '内蔵 EtherCAT ポート（マスタ、スレーブ 64 台まで）' : `内蔵 EtherNet/IP ポート（${p.id}、1000BASE-T。CIP・OPC UA・Modbus/TCP・FINS など）`,
      x: p.x,
      y: PORT_Y,
      side: 'bottom',
      role: 'connector',
      connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: p.protocols },
      optional: true,
    }),
  ),
];

const def: DeviceDefinition = {
  type: 'omron.nx102-9000',
  name: 'PLC CPUユニット（内蔵 I/O なし）',
  model: 'NX102-9000',
  maker: 'オムロン',
  category: 'plc',
  description:
    'オムロン マシンオートメーションコントローラ NX102 の CPU ユニット NX102-9000（内蔵 I/O なし、モーション制御のサーボ軸なし・単軸位置制御軸 4 軸、DC24V 電源）。' +
    'ユニット電源 DC24V（20.4〜28.8V）を電源端子台の + / − に入れる（上段・下段の + どうし・− どうしは内部で接続。下段は渡り配線用）。⏚ は機能接地。消費電力 5.80W 以下（SD メモリカードを含み、NX ユニットへの供給分を除く）、突入電流 10A 以下/0.1ms 以下。' +
    '内蔵 EtherNet/IP ポート 2 個（PORT1・PORT2、1Gbps、EtherNet/IP・OPC UA・FINS など）と内蔵 EtherCAT ポート（PORT3、スレーブ 64 台まで）。' +
    '右側に NX ユニット（入出力ユニットなど）を最大 32 台連結できる（NX バスの I/O 電源を使うユニットの前には増設 I/O 電源ユニット NX-PF0630 を連結して I/O 電源を入れる）。入出力の番号は Sysmac Studio のデバイス変数で扱う。' +
    '外形 W72×H100×D90mm。端子台の並び（上段 + − ⏚、下段 + −）と正面の配置は推定。',
  estimated: 'ユニット電源の端子台の並び（上段 + − ⏚、下段 + −）と正面の配置（ポート・カバー・LED の位置）',
  labelPrefix: 'PLC',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    { from: '+', to: '+2' },
    { from: '-', to: '-2' },
  ],
  // CPU 単体の消費電流（消費電力 5.80W / 24V）。NX ユニットへの NX バス電源の供給分は含まない
  loadCurrent: 0.24,
  bus: {
    kind: NX_BUS,
    host: { slots: 32 },
  },
};

export default def;

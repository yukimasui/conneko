/**
 * KEYENCE KV-X シリーズ CPU ユニット（KV-X550 / X530 / X520 / X500）の共通描画。
 *
 * 外形 W77.9 × H92.5（DINレール部 90）× D119.3 mm（KEYENCE 外形寸法図より、1mm ≒ 2px）。
 * 正面左に Ethernet ポートが縦に 3 個（上から PORT1・PORT2 = Ethernet/EtherNet/IP、PORT3 = EtherCAT。KV-X500 は PORT3 なし）、
 * 左上に状態表示 LED、右上に液晶のアクセスウィンドウと KEYENCE ロゴ、その下に操作キー 6 個、
 * 下段に通風スリット・中央カバー・ダイヤル・USB Type-C・メモリカードカバー。
 * 電源は底面のプラグイン端子（約 14.3mm 下に突き出す）から DC24V を入れる。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { KV_BUS, KV_RAIL, PROTO, kvDefs, rj45, rj45Connector, screw, text } from './kv-parts';

export interface KvXCpuSpec {
  model: 'KV-X550' | 'KV-X530' | 'KV-X520' | 'KV-X500';
  /** 制御軸数（内蔵モーション） */
  axes: number;
}

const W = 156;
const BODY_H = 185;
const H = 214;

/** ポート（RJ45 差込口の中心） */
const PORTS = [
  { id: 'PORT1', y: 48, label: 'PORT1' },
  { id: 'PORT2', y: 104, label: 'PORT2' },
  { id: 'PORT3', y: 158, label: 'PORT3' },
];
const PORT_X = 29;

/** 電源プラグ（底面、左から +・−・FG と仮定） */
const PWR_Y = 204;
const PWR = [
  { id: '24V+', label: '+', x: 22 },
  { id: '24V-', label: '−', x: 32 },
  { id: 'FG', label: 'FG', hint: '機能接地', x: 42 },
];

export function buildKvXCpu(s: KvXCpuSpec): DeviceDefinition {
  const ports = s.model === 'KV-X500' ? PORTS.slice(0, 2) : PORTS;
  const portSvg = ports
    .map(
      (p, i) => `
  <rect x="3" y="${p.y - 22}" width="52" height="48" rx="2" fill="url(#xport-{{uid}})" stroke="#0c0c0d" stroke-width="0.8"/>
  ${text(7, p.y - 15, p.label, 3.2, '#d0d3d6', 'start', 'normal')}
  ${i === 1 ? text(51, p.y - 15, 'EtherNet/IP', 2.8, '#9fc4ff', 'end', 'normal') : ''}
  ${i === 2 ? text(51, p.y - 15, 'EtherCAT', 2.8, '#ffb46b', 'end', 'normal') : ''}
  ${rj45(PORT_X, p.y + 2, 22, 19)}`,
    )
    .join('');

  const svg = `
  ${kvDefs(`
    <linearGradient id="xport-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3d41"/>
      <stop offset="1" stop-color="#232528"/>
    </linearGradient>
    <linearGradient id="xlcd-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#3a6fd8"/>
      <stop offset="1" stop-color="#1d3f9a"/>
    </linearGradient>
    <linearGradient id="xkey-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#4a4d52"/>
      <stop offset="1" stop-color="#2b2d30"/>
    </linearGradient>`)}

  <!-- 電源プラグ（底面） -->
  <rect x="14" y="${BODY_H - 3}" width="36" height="${H - BODY_H + 1}" rx="2" fill="#2a2c2f" stroke="#0e0e0f" stroke-width="0.8"/>
  ${PWR.map((t) => `<rect x="${t.x - 4.2}" y="${PWR_Y - 5}" width="8.4" height="10" rx="1" fill="#0e0f10"/>${screw(t.x, PWR_Y, 3.3)}`).join('')}
  ${PWR.map((t) => text(t.x, BODY_H + 4.8, t.label, 3.4, '#e2e5e8')).join('')}

  <!-- 本体 -->
  <rect x="1" y="1" width="${W - 2}" height="${BODY_H - 2}" rx="3" fill="url(#kvbody-{{uid}})" stroke="#050505" stroke-width="1.2"/>
  <rect x="${W - 5}" y="6" width="2" height="${BODY_H - 12}" fill="#000" opacity="0.35"/>

  <!-- 状態表示 LED -->
  ${[0, 1, 2]
    .map((r) =>
      [0, 1, 2]
        .map((c) => `<rect x="${34 + c * 7}" y="${6 + r * 6}" width="3.4" height="2.6" rx="0.6" fill="${r === 0 && c < 2 ? 'url(#kvledg-{{uid}})' : '#2a3a2c'}" stroke="#111" stroke-width="0.3"/>`)
        .join(''),
    )
    .join('')}
  ${portSvg}

  <!-- アクセスウィンドウ（液晶） -->
  <rect x="58" y="3" width="94" height="68" rx="2" fill="#161719" stroke="#0a0a0b" stroke-width="0.6"/>
  <rect x="68" y="12" width="70" height="38" rx="1" fill="#0d0e10"/>
  <rect x="70" y="14" width="66" height="34" fill="url(#xlcd-{{uid}})"/>
  ${['1.Device Mode', '2.Error Clear', '3.Unit Test', '4.Storage'].map((l, i) => text(72, 21 + i * 7.6, l, 5, '#e8f0ff', 'start', 'normal')).join('')}
  ${text(140, 9, s.model, 3, '#c9ccd0', 'end', 'normal')}
  <rect x="64" y="56" width="82" height="1.4" fill="#d22b2b"/>
  <text x="105" y="66.5" text-anchor="middle" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#f2f3f4" letter-spacing="0.4">KEYENCE</text>

  <!-- 操作キー -->
  ${[0, 1]
    .map((r) => [0, 1, 2].map((c) => `<rect x="${63 + c * 28}" y="${74 + r * 9}" width="24" height="6.5" rx="1.4" fill="url(#xkey-{{uid}})" stroke="#0b0b0c" stroke-width="0.6"/>`).join(''))
    .join('')}
  ${text(75, 79.2, 'MENU', 2.6, '#d0d3d6', 'middle', 'normal')}
  ${text(131, 79.2, 'ENTER', 2.6, '#d0d3d6', 'middle', 'normal')}

  <!-- 通風スリット -->
  ${Array.from({ length: 8 }, (_, i) => `<rect x="60" y="${95 + i * 11}" width="30" height="7" rx="1" fill="#101113" stroke="#2c2e31" stroke-width="0.4"/>`).join('')}
  <!-- 中央カバー -->
  <rect x="94" y="94" width="20" height="86" rx="1.2" fill="#2a2c30" stroke="#0a0a0b" stroke-width="0.7"/>
  <!-- ダイヤル・USB Type-C -->
  <circle cx="130" cy="101" r="5" fill="#1a1b1d" stroke="#55585c" stroke-width="0.8"/>
  <circle cx="130" cy="101" r="2.4" fill="#3a3d41"/>
  <rect x="126.5" y="112" width="7" height="16" rx="3.4" fill="#0d0e0f" stroke="#7a7e83" stroke-width="0.8"/>
  ${text(141, 123, 'USB', 2.6, '#b9bcc1', 'start', 'normal')}
  <!-- メモリカードカバー -->
  <rect x="117" y="138" width="34" height="42" rx="1.2" fill="#2a2c30" stroke="#0a0a0b" stroke-width="0.7"/>
  ${text(134, 176, 'CARD', 2.6, '#9a9da2', 'middle', 'normal')}
`;

  const accepts = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: [c] });
  const terminals: TerminalDef[] = [
    { id: '24V+', label: '+ (DC24V)', x: PWR[0].x, y: PWR_Y, side: 'bottom', role: 'input', accepts: accepts('+') },
    { id: '24V-', label: '− (0V)', x: PWR[1].x, y: PWR_Y, side: 'bottom', role: 'input', accepts: accepts('-') },
    { id: 'FG', label: 'FG', hint: '機能接地', x: PWR[2].x, y: PWR_Y, side: 'bottom', role: 'ground' },
    ...ports.map(
      (p, i): TerminalDef => ({
        id: p.id,
        label: i === 2 ? 'PORT3 EtherCAT (RJ45)' : `${p.label} Ethernet (RJ45)`,
        x: PORT_X,
        y: p.y + 2,
        side: 'left',
        role: 'connector',
        connector: rj45Connector(i === 2 ? PROTO.ethercat : PROTO.ethernetIp, 'left'),
        optional: true,
      }),
    ),
  ];

  return {
    type: `keyence.${s.model.toLowerCase()}`,
    name: 'PLC CPUユニット',
    model: s.model,
    maker: 'KEYENCE',
    category: 'plc',
    estimated: '電源端子の並び（左から +・−・FG）と、拡張ユニットのリレー番号の自動割付け（R000 から 16 点単位、出力は入力の次のチャネル）は推定（公開資料で確認できず、実機で未確認）',
    description:
      `KEYENCE KV-X シリーズの CPU ユニット ${s.model}。電源は DC24V（KV-8000/7000 シリーズ拡張ユニットのみの構成で −15%〜+20%、KV-5000/3000 シリーズ拡張ユニット併用時は ±10%）を底面の電源端子に入れる（端子の並びは左から +・−・FG と推定）。` +
      `内部消費電流 600mA 以下（拡張ユニット込み最大 3.4A）。右側に KV-8000/7000 用の拡張ユニット（I/O・アナログ・通信など、最大 16 台。KV-EB1 経由で KV-5000/3000 用を含め 48 台）を連結し（図面では拡張ユニットの mount に CPU を指定する）、拡張ユニットの電源も CPU から供給される。拡張ユニットのリレー番号は装着順に R000 から 16 点（1 チャネル）単位で自動で割り付ける。` +
      (s.model === 'KV-X500'
        ? 'Ethernet ポート 2 個（PORT1/PORT2、1Gbps、EtherNet/IP・OPC UA 対応）。EtherCAT・モーションは非内蔵。'
        : `Ethernet ポート 2 個（PORT1/PORT2、1Gbps、EtherNet/IP・OPC UA 対応）と EtherCAT ポート（PORT3、100Mbps）を内蔵し、内蔵モーションで最大 ${s.axes} 軸を制御できる。`),
    labelPrefix: 'PLC',
    width: W,
    height: H,
    svg,
    terminals,
    // CPU 単体の消費電流（拡張ユニットの分は bus の load として合計する）
    loadCurrent: 0.6,
    bus: {
      kind: 'kv-x',
      // KV-8000/7000 シリーズ用の拡張ユニットをそのまま連結できる（KV-EB1 経由の KV-5000/3000 用は対象外）
      host: { accepts: ['kv-x', KV_BUS], slots: 16, numbering: { mode: 'shared', unit: 16, start: { input: 0, output: 0 } } },
      // 拡張ユニット込みの上限 3.4A。CPU 自身の 0.6A も同じ電源から流れるので load に入れる
      supply: { [KV_RAIL]: 3.4 },
      load: { [KV_RAIL]: 0.6 },
      // 拡張ユニットの消費は CPU の電源端子から流れる（上流の保護と比べるときに CPU の消費に加える）
      feeds: [KV_RAIL],
    },
  };
}

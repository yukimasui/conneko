/**
 * 産業用スイッチングハブ（アンマネージ、DIN レール取付、DC 電源の冗長入力）の機器定義を作る。
 * ポート数ごとに外形が変わるので、ポート数ごとに別の機器にする（generic-ethernet-switch-*.ts）。
 */
import type { DeviceDefinition, TerminalDef } from '../types';

/**
 * スイッチングハブが中継できる通信方式（Ethernet の上で動くもの）。
 * EtherCAT は専用のトポロジーで、一般のスイッチングハブを通せないので含めない。
 * CC-Link IE Field / TSN なども専用のスイッチが必要なため含めない（CC-Link IE Field Basic は通せる）。
 */
export const SWITCHABLE_PROTOCOLS = ['ethernet', 'ethernet-ip', 'profinet', 'modbus-tcp', 'slmp', 'cc-link-ie-field-basic', 'opc-ua'];

/** 電源の受電条件（DC12〜48V の冗長入力。0V は共通） */
const POWER = { system: 'DC' as const, minVoltage: 12, maxVoltage: 48 };

const PORT_W = 24;
const PORT_H = 20;
const COL_GAP = 12;
const ROW_H = 34;

export function buildEthernetSwitch(ports: 5 | 8 | 16): DeviceDefinition {
  const cols = 2;
  const rows = Math.ceil(ports / cols);
  const W = 30 + cols * PORT_W + (cols - 1) * COL_GAP + 30;
  const TOP = 62;
  const H = TOP + rows * ROW_H + 26;
  const portPos = (i: number) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    return { x: 30 + col * (PORT_W + COL_GAP) + PORT_W / 2, y: TOP + row * ROW_H + PORT_H / 2 + 8 };
  };
  const screwX = [W * 0.2, W * 0.4, W * 0.6, W * 0.8];
  const SCREW_Y = 16;
  const powerLabels = ['V1+', 'V2+', '0V', 'FG'];

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" x2="1">
      <stop offset="0" stop-color="#3a3f46"/><stop offset="0.5" stop-color="#4a5058"/><stop offset="1" stop-color="#33383e"/>
    </linearGradient>
  </defs>
  <rect x="2" y="4" width="${W - 4}" height="${H - 8}" rx="5" fill="url(#body-{{uid}})" stroke="#1f2328" stroke-width="1.4"/>
  <!-- 電源端子台（上面） -->
  <rect x="${W * 0.1}" y="6" width="${W * 0.8}" height="22" rx="2" fill="#2b8a3e" stroke="#1d5e2a"/>
  ${screwX
    .map(
      (x, i) => `<circle cx="${x}" cy="${SCREW_Y}" r="5" fill="#d9dde2" stroke="#6b7178"/><line x1="${x - 3}" y1="${SCREW_Y}" x2="${x + 3}" y2="${SCREW_Y}" stroke="#6b7178" stroke-width="1.2"/>
  <text x="${x}" y="38" text-anchor="middle" font-family="sans-serif" font-size="6.5" fill="#e5e7eb">${powerLabels[i]}</text>`,
    )
    .join('')}
  <text x="${W / 2}" y="52" text-anchor="middle" font-family="sans-serif" font-size="7.5" font-weight="bold" fill="#f3f4f6">SWITCH ${ports}TX</text>
  <circle cx="${W - 14}" cy="49" r="2.6" fill="#22c55e"/><text x="${W - 20}" y="51.5" text-anchor="end" font-family="sans-serif" font-size="5" fill="#cbd5e1">PWR</text>
  ${Array.from({ length: ports }, (_, i) => {
    const p = portPos(i);
    return `<rect x="${p.x - PORT_W / 2}" y="${p.y - PORT_H / 2}" width="${PORT_W}" height="${PORT_H}" rx="1.5" fill="#15181c" stroke="#9aa1a9"/>
  <rect x="${p.x - 6}" y="${p.y - PORT_H / 2 + 3}" width="12" height="4" fill="#9aa1a9"/>
  <rect x="${p.x - 8}" y="${p.y - 1}" width="16" height="${PORT_H / 2 - 2}" fill="#2a2f35"/>
  <circle cx="${p.x - PORT_W / 2 + 3}" cy="${p.y - PORT_H / 2 - 4}" r="1.8" fill="#22c55e"/>
  <circle cx="${p.x + PORT_W / 2 - 3}" cy="${p.y - PORT_H / 2 - 4}" r="1.8" fill="#f59e0b"/>
  <text x="${p.x}" y="${p.y + PORT_H / 2 + 7}" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#e5e7eb">${i + 1}</text>`;
  }).join('')}`;

  const terminals: TerminalDef[] = [
    { id: 'V1+', label: 'V1+', note: '電源入力 1（+）', x: screwX[0], y: SCREW_Y, side: 'top', role: 'input', accepts: { ...POWER, conductors: ['+'] } },
    { id: 'V2+', label: 'V2+', note: '電源入力 2（+。冗長電源、使わなければ空き）', x: screwX[1], y: SCREW_Y, side: 'top', role: 'input', accepts: { ...POWER, conductors: ['+'] }, optional: true },
    { id: '0V', label: '0V', note: '電源の 0V（V1・V2 共通）', x: screwX[2], y: SCREW_Y, side: 'top', role: 'input', accepts: { ...POWER, conductors: ['-'] } },
    { id: 'FG', label: 'FG', note: 'フレームグラウンド', x: screwX[3], y: SCREW_Y, side: 'top', role: 'ground' },
    ...Array.from({ length: ports }, (_, i): TerminalDef => {
      const p = portPos(i);
      return {
        id: `P${i + 1}`,
        label: `ポート${i + 1}`,
        x: p.x,
        y: p.y,
        side: 'bottom',
        role: 'connector',
        connector: { kind: 'RJ45', pins: 0, width: PORT_W - 4, length: PORT_H, facing: 'front', protocols: SWITCHABLE_PROTOCOLS },
        optional: true,
      };
    }),
  ];

  return {
    type: `generic.ethernet-switch.${ports}p`,
    name: 'スイッチングハブ',
    model: `産業用 ${ports}ポート DC24V`,
    category: 'network',
    description: `産業用のアンマネージ スイッチングハブ（${ports}ポート、10/100BASE-TX、DIN レール取付）。電源は DC12〜48V の冗長入力（V1+・V2+、0V 共通）と FG。各ポートの LAN ケーブルの先の機器どうしは同じネットワークになる。Ethernet の上で動く通信方式（EtherNet/IP、PROFINET、Modbus/TCP、SLMP、CC-Link IE Field Basic など）を中継できるが、EtherCAT や CC-Link IE Field などの専用の方式は通せない（つなぐと通信方式の不一致を警告する）。`,
    labelPrefix: 'HUB',
    width: W,
    height: H,
    svg,
    terminals,
    loadCurrent: ports === 16 ? 0.4 : ports === 8 ? 0.25 : 0.15,
  };
}

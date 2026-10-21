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
const PITCH = 30;
/** 電源端子台（左側）の幅 */
const POWER_W = 34;

/**
 * ポートは、ケーブルがほかのポートの上を通らないように並べる。
 * 5・8 ポートは下の辺に横 1 列（ケーブルは下へ）、16 ポートは上下 2 段（上の段は上へ、下の段は下へ）。
 */
export function buildEthernetSwitch(ports: 5 | 8 | 16): DeviceDefinition {
  const twoRows = ports > 8;
  const cols = twoRows ? Math.ceil(ports / 2) : ports;
  const W = POWER_W + 14 + cols * PITCH + 8;
  const H = twoRows ? 150 : 116;
  const portPos = (i: number) => {
    const top = twoRows && i < cols;
    const col = twoRows ? i % cols : i;
    return { x: POWER_W + 14 + col * PITCH + PITCH / 2, y: top ? 34 : H - 28, side: top ? ('top' as const) : ('bottom' as const) };
  };
  const SCREW_X = 16;
  const screwY = [H * 0.22, H * 0.4, H * 0.58, H * 0.76];
  const powerLabels = ['V1+', 'V2+', '0V', 'FG'];
  const labelY = twoRows ? H / 2 + 3 : 30;

  const svg = `
  <defs>
    <linearGradient id="body-{{uid}}" x1="0" x2="0" y1="0" y2="1">
      <stop offset="0" stop-color="#4a5058"/><stop offset="0.5" stop-color="#3f454c"/><stop offset="1" stop-color="#33383e"/>
    </linearGradient>
  </defs>
  <rect x="2" y="4" width="${W - 4}" height="${H - 8}" rx="5" fill="url(#body-{{uid}})" stroke="#1f2328" stroke-width="1.4"/>
  <!-- 電源端子台（左側） -->
  <rect x="5" y="${H * 0.12}" width="${POWER_W - 8}" height="${H * 0.76}" rx="2" fill="#2b8a3e" stroke="#1d5e2a"/>
  ${screwY
    .map(
      (y, i) => `<circle cx="${SCREW_X}" cy="${y}" r="5" fill="#d9dde2" stroke="#6b7178"/><line x1="${SCREW_X - 3}" y1="${y}" x2="${SCREW_X + 3}" y2="${y}" stroke="#6b7178" stroke-width="1.2"/>
  <text x="${SCREW_X + 8}" y="${y + 2.5}" font-family="sans-serif" font-size="6.5" fill="#e5e7eb">${powerLabels[i]}</text>`,
    )
    .join('')}
  <text x="${POWER_W + 14}" y="${labelY}" font-family="sans-serif" font-size="8" font-weight="bold" fill="#f3f4f6">SWITCH ${ports}TX</text>
  <circle cx="${W - 12}" cy="${labelY - 3}" r="2.6" fill="#22c55e"/><text x="${W - 18}" y="${labelY - 0.5}" text-anchor="end" font-family="sans-serif" font-size="5" fill="#cbd5e1">PWR</text>
  ${Array.from({ length: ports }, (_, i) => {
    const p = portPos(i);
    const up = p.side === 'top';
    // ラッチの切り欠きはケーブルが出る側
    const notchY = up ? p.y - PORT_H / 2 + 3 : p.y + PORT_H / 2 - 7;
    const ledY = up ? p.y + PORT_H / 2 + 5 : p.y - PORT_H / 2 - 5;
    return `<rect x="${p.x - PORT_W / 2}" y="${p.y - PORT_H / 2}" width="${PORT_W}" height="${PORT_H}" rx="1.5" fill="#15181c" stroke="#9aa1a9"/>
  <rect x="${p.x - 6}" y="${notchY}" width="12" height="4" fill="#9aa1a9"/>
  <circle cx="${p.x - 6}" cy="${ledY}" r="1.8" fill="#22c55e"/>
  <circle cx="${p.x + 6}" cy="${ledY}" r="1.8" fill="#f59e0b"/>
  <text x="${p.x}" y="${up ? ledY + 9 : ledY - 4}" text-anchor="middle" font-family="sans-serif" font-size="6" fill="#e5e7eb">${i + 1}</text>`;
  }).join('')}`;

  const powerTerminal = (i: number, id: string, note: string, extra: Partial<TerminalDef>): TerminalDef => ({
    id,
    label: id,
    note,
    x: SCREW_X,
    y: screwY[i],
    side: 'left',
    role: 'input',
    ...extra,
  });
  const terminals: TerminalDef[] = [
    powerTerminal(0, 'V1+', '電源入力 1（+）', { accepts: { ...POWER, conductors: ['+'] } }),
    powerTerminal(1, 'V2+', '電源入力 2（+。冗長電源、使わなければ空き）', { accepts: { ...POWER, conductors: ['+'] }, optional: true }),
    powerTerminal(2, '0V', '電源の 0V（V1・V2 共通）', { accepts: { ...POWER, conductors: ['-'] } }),
    powerTerminal(3, 'FG', 'フレームグラウンド', { role: 'ground' }),
    ...Array.from({ length: ports }, (_, i): TerminalDef => {
      const p = portPos(i);
      return {
        id: `P${i + 1}`,
        label: `ポート${i + 1}`,
        x: p.x,
        y: p.y,
        side: p.side,
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

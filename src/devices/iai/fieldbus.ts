/**
 * IAI コントローラーの I/O 種類（PIO / パルス列 / フィールドネットワーク）と、フィールドネットワークのコネクターの共通部品。
 *
 * 型式の I/O 種類の記号（総合カタログ PCON-CB「型式項目」など）:
 *   NP: PIO（NPN）、PN: PIO（PNP）、PLN / PLP: パルス列（NPN / PNP）、DV: DeviceNet、CC: CC-Link、
 *   CIE: CC-Link IE Field、PR: PROFIBUS-DP、CN: CompoNet、ML: MECHATROLINK-Ⅰ/Ⅱ、ML3: MECHATROLINK-Ⅲ、
 *   EC: EtherCAT、EP: EtherNet/IP、PRT: PROFINET IO
 *
 * コネクター（各フィールドネットワーク取扱説明書 MJ0254 / MJ0256 / MJ0258 / MJ0273 / MJ0278 / MJ0333 / MJ0389 /
 * MJ0220 / MJ0221 / MJ0317 より）:
 * - EtherCAT: RJ-45 × 2（IN・OUT）、CC-Link IE Field: RJ-45 × 2（P1・P2）、EtherNet/IP・PROFINET IO: RJ-45 × 1
 * - DeviceNet・CC-Link: 5 極の差込み式プラグ（MSTB2.5/5-STF-5.08）。Conneko ではネジ端子として扱う（KEYENCE KV-DN20 と同じ端子ID）
 * - PROFIBUS-DP: D-sub 9 ピン（メス）、CompoNet: XW7D-PB4-R、MECHATROLINK-Ⅰ/Ⅱ: USB 形状のコネクター × 2、
 *   MECHATROLINK-Ⅲ: 専用コネクター × 2
 *
 * 通信ポートの端子ID は I/O 種類を変えても変わらないよう、1 つ目を 'NET1'、2 つ目を 'NET2' にそろえ、
 * 印字（IN / OUT、P1 / P2 など）は label に書く。connector.protocols にプロトコル名を書くので、
 * 違うプロトコルのポートどうしをケーブルでつなぐとチェックで警告される。
 */
import type { ConnectorSpec, ParamDef, ParamValues, TerminalDef } from '../types';
import { DNET_MINUS, DNET_PLUS, dsub9V, led, n2, plugV, rj45Side, rj45V, smallPort, text } from './parts';

export type IoType = 'NP' | 'PN' | 'PLN' | 'PLP' | 'DV' | 'CC' | 'CIE' | 'PR' | 'CN' | 'ML' | 'ML3' | 'EC' | 'EP' | 'PRT';

export const IO_TYPE_LABELS: Record<IoType, string> = {
  NP: 'NP: PIO（NPN）',
  PN: 'PN: PIO（PNP）',
  PLN: 'PLN: パルス列（NPN）',
  PLP: 'PLP: パルス列（PNP）',
  DV: 'DV: DeviceNet',
  CC: 'CC: CC-Link',
  CIE: 'CIE: CC-Link IE Field',
  PR: 'PR: PROFIBUS-DP',
  CN: 'CN: CompoNet',
  ML: 'ML: MECHATROLINK-Ⅰ/Ⅱ',
  ML3: 'ML3: MECHATROLINK-Ⅲ',
  EC: 'EC: EtherCAT',
  EP: 'EP: EtherNet/IP',
  PRT: 'PRT: PROFINET IO',
};

/** ネットワーク名（表示用） */
export const NETWORK_NAMES: Partial<Record<IoType, string>> = {
  DV: 'DeviceNet',
  CC: 'CC-Link',
  CIE: 'CC-Link IE Field',
  PR: 'PROFIBUS-DP',
  CN: 'CompoNet',
  ML: 'MECHATROLINK-Ⅰ/Ⅱ',
  ML3: 'MECHATROLINK-Ⅲ',
  EC: 'EtherCAT',
  EP: 'EtherNet/IP',
  PRT: 'PROFINET IO',
};

/** ポジショナー（PCON/ACON/DCON-CB など）で選べる I/O 種類 */
export const POSITIONER_IO_TYPES: IoType[] = ['NP', 'PN', 'PLN', 'PLP', 'DV', 'CC', 'CIE', 'PR', 'CN', 'ML', 'ML3', 'EC', 'EP', 'PRT'];

/** I/O 種類のパラメーター */
export const ioTypeParam = (types: IoType[], def: IoType = 'NP', label = 'I/O 種類'): ParamDef => ({
  key: 'io',
  label,
  options: types.map((t) => ({ value: t, label: IO_TYPE_LABELS[t] })),
  default: def,
});

export const ioOf = (p: ParamValues): IoType => String(p.io ?? 'NP') as IoType;
/** PIO（パルス列を含む）か */
export const isPio = (io: IoType) => io === 'NP' || io === 'PN' || io === 'PLN' || io === 'PLP';
/** PIO の極性 */
export const polarityOf = (io: IoType): 'npn' | 'pnp' => (io === 'PN' || io === 'PLP' ? 'pnp' : 'npn');

/** 通信プロトコル名（connector.protocols） */
export const PROTOCOLS = {
  ethercat: ['ethercat'],
  ethernetIp: ['ethernet-ip'],
  profinet: ['profinet'],
  cclinkIeField: ['cc-link-ie-field'],
  profibus: ['profibus-dp'],
  componet: ['componet'],
  mechatrolink2: ['mechatrolink-i', 'mechatrolink-ii'],
  mechatrolink3: ['mechatrolink-iii'],
} as const;

const proto = (p: readonly string[]) => [...p];

/** RJ-45 以外の通信コネクター */
const portSpec = (kind: string, protocols: readonly string[], width: number, length: number): ConnectorSpec => ({
  kind,
  pins: 0,
  width,
  length,
  facing: 'front',
  protocols: proto(protocols),
});

/**
 * フィールドネットワークのコネクターと LED を描き、端子を返す。
 * area はコネクターを置く範囲（PIO コネクターの代わりの位置）、side は電線・ケーブルが出ていく向き、
 * labelColor はパネルの印字の色。
 */
export function fieldbusBlock(
  io: IoType,
  area: { x: number; y: number; w: number; h: number },
  side: 'left' | 'right' = 'left',
  labelColor = '#e9eef0',
  /** ポートの印字（IN / OUT など）を横（既定）でなくポートの上に書く */
  labelAbove = false,
): { svg: string; terminals: TerminalDef[] } {
  const cx = n2(area.x + area.w / 2);
  const lx = side === 'left' ? area.x + area.w + 1 : area.x - 1;
  const anchor = side === 'left' ? 'start' : 'end';
  const lbl = (y: number, t: string, size = 2.6) => text(lx, y, t, size, labelColor, anchor);
  const leds = (names: string[], y: number) =>
    names.map((nm, i) => `${led(area.x + 3 + i * 9, y, 'off', 3, 2.2)}${text(area.x + 3 + i * 9, y + 4.2, nm, 2.1, labelColor)}`).join('');
  const terminals: TerminalDef[] = [];
  let svg = '';
  const name = NETWORK_NAMES[io] ?? '';
  const portTerminal = (id: string, label: string, x: number, y: number, connector: ConnectorSpec): TerminalDef => ({
    id,
    label,
    x: n2(x),
    y: n2(y),
    side,
    role: 'connector',
    connector,
    optional: true,
  });

  if (io === 'EC' || io === 'CIE' || io === 'EP' || io === 'PRT') {
    const two = io === 'EC' || io === 'CIE';
    const ledNames = io === 'EC' ? ['RUN', 'ERR'] : io === 'CIE' ? ['RUN', 'ERR', 'D LINK'] : io === 'EP' ? ['MS', 'NS'] : ['SF', 'BF'];
    const protocols = io === 'EC' ? PROTOCOLS.ethercat : io === 'CIE' ? PROTOCOLS.cclinkIeField : io === 'EP' ? PROTOCOLS.ethernetIp : PROTOCOLS.profinet;
    const labels = io === 'EC' ? ['OUT', 'IN'] : io === 'CIE' ? ['P1', 'P2'] : ['PORT'];
    svg += leds(ledNames, area.y + 3);
    const y0 = area.y + 12 + 15;
    const ys = two ? [y0, y0 + 33] : [y0 + 12];
    ys.forEach((y, i) => {
      svg += rj45V(cx, y);
      svg += labelAbove ? text(cx + 10, y - 16.2, labels[i], 2.6, labelColor, 'end') : lbl(y + 1, labels[i], 2.8);
    });
    svg += text(cx, ys[ys.length - 1] + 20, name, 2.4, labelColor);
    // EtherCAT は下の IN を NET1、上の OUT を NET2 にする（IN から先につなぐ）
    if (io === 'EC') {
      terminals.push(portTerminal('NET1', 'EtherCAT IN', cx, ys[1], rj45Side(proto(protocols))));
      terminals.push(portTerminal('NET2', 'EtherCAT OUT', cx, ys[0], rj45Side(proto(protocols))));
    } else if (io === 'CIE') {
      terminals.push(portTerminal('NET1', 'CC-Link IE Field P1', cx, ys[0], rj45Side(proto(protocols))));
      terminals.push(portTerminal('NET2', 'CC-Link IE Field P2', cx, ys[1], rj45Side(proto(protocols))));
    } else {
      terminals.push(portTerminal('NET1', `${name}（RJ-45）`, cx, ys[0], rj45Side(proto(protocols))));
    }
  } else if (io === 'DV' || io === 'CC') {
    const dv = io === 'DV';
    // DeviceNet: 上から 赤 V+ / 白 CAN_H / 裸線 SHIELD / 水色 CAN_L / 黒 V−、CC-Link: 上から FG / SLD / DG / DB / DA
    const ids = dv ? ['V+', 'CAN_H', 'SHIELD', 'CAN_L', 'V-'] : ['CC-FG', 'SLD', 'DG', 'DB', 'DA'];
    const prints = dv ? ['V+', 'CAN H', 'DRAIN', 'CAN L', 'V-'] : ['FG', 'SLD', 'DG', 'DB', 'DA'];
    const wireColors = dv ? ['#d6302c', '#f4f4f4', '#c9c9c9', '#4fb3e8', '#1d1d1d'] : [];
    svg += leds(dv ? ['MS', 'NS'] : ['ERR', 'RUN'], area.y + 3);
    const pitch = 10.16;
    const pw = 13;
    const px = side === 'left' ? area.x + 4 : area.x + area.w - 4 - pw;
    const block = plugV({ x: px, y: area.y + 12, ids, pitch, w: pw, wire: side, labels: Object.fromEntries(ids.map((id, i) => [id, prints[i]])), labelColor, labelSize: 2.6 });
    svg += block.svg;
    wireColors.forEach((c, i) => {
      const p = block.pos[ids[i]];
      svg += `<rect x="${n2(side === 'left' ? p.x - 4 : p.x)}" y="${n2(p.y - 1.6)}" width="4" height="3.2" rx="0.5" fill="${c}" stroke="#555" stroke-width="0.3"/>`;
    });
    svg += text(cx, area.y + 12 + block.height + 5, name, 2.4, labelColor);
    ids.forEach((id, i) => {
      const p = block.pos[id];
      const base = { id, x: p.x, y: p.y, side: p.side, optional: true };
      if (dv) {
        const desc = ['赤 V+（通信電源 DC24V）', '白 CAN_H', '裸線 DRAIN（シールド）', '水色 CAN_L', '黒 V−（通信電源 0V）'][i];
        if (id === 'V+') terminals.push({ ...base, label: desc, role: 'input', accepts: DNET_PLUS });
        else if (id === 'V-') terminals.push({ ...base, label: desc, role: 'input', accepts: DNET_MINUS });
        else if (id === 'SHIELD') terminals.push({ ...base, label: desc, role: 'signal', note: 'DeviceNet 通信線' });
        else terminals.push({ ...base, label: desc, role: 'signal', note: 'DeviceNet 通信線', port: 'DeviceNet', protocols: ['devicenet'] });
      } else {
        const desc = ['FG（フレームグラウンド）', 'SLD（シールド）', 'DG（デジタルグラウンド）', 'DB（通信線）', 'DA（通信線）'][i];
        // 通信線（DA・DB・DG）は CC-Link のポートとして、つないだ相手の通信方式を確かめる
        const line = id === 'DA' || id === 'DB' || id === 'DG';
        terminals.push({ ...base, label: desc, role: id === 'CC-FG' ? 'ground' : 'signal', note: 'CC-Link 通信線（CC-Link 専用ケーブル）', ...(line ? { port: 'CC-Link', protocols: ['cc-link'] } : {}) });
      }
    });
  } else if (io === 'PR') {
    svg += leds(['ST', 'BF'], area.y + 3);
    const y = area.y + 12 + 22;
    svg += dsub9V(cx, y);
    svg += lbl(y + 1, 'PROFIBUS', 2.4);
    terminals.push(portTerminal('NET1', 'PROFIBUS-DP（D-sub 9 ピン）', cx, y, portSpec('DSUB9', PROTOCOLS.profibus, 32, 14)));
  } else if (io === 'CN') {
    svg += leds(['MS', 'NS'], area.y + 3);
    const y = area.y + 12 + 12;
    svg += smallPort(cx, y, 12, 16, '#1a1b1d');
    svg += lbl(y + 1, 'CompoNet', 2.4);
    terminals.push(portTerminal('NET1', 'CompoNet（XW7D-PB4-R）', cx, y, portSpec('COMPONET', PROTOCOLS.componet, 16, 12)));
  } else if (io === 'ML' || io === 'ML3') {
    const ml3 = io === 'ML3';
    svg += leds(ml3 ? ['RUN', 'ERR', 'L1', 'L2'] : ['RUN', 'ERR', 'COM'], area.y + 3);
    const ys = [area.y + 12 + 11, area.y + 12 + 31];
    ys.forEach((y, i) => {
      svg += smallPort(cx, y, 12, 16);
      svg += lbl(y + 1, ml3 ? `CN${i + 1}` : `CN${i + 1}`, 2.6);
    });
    svg += text(cx, ys[1] + 14, ml3 ? 'MECHATROLINK-Ⅲ' : 'MECHATROLINK', 2.2, labelColor);
    const kind = ml3 ? 'MECHATROLINK3' : 'MECHATROLINK2';
    const protocols = ml3 ? PROTOCOLS.mechatrolink3 : PROTOCOLS.mechatrolink2;
    ys.forEach((y, i) => terminals.push(portTerminal(`NET${i + 1}`, `${name} CN${i + 1}`, cx, y, portSpec(kind, protocols, 16, 12))));
  }
  return { svg, terminals };
}

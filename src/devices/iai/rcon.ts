/**
 * IAI R-unit（RCON / RSEL / REC）のユニット連結型コントローラーの共通部品。
 *
 * 外観（総合カタログ CJ9005「R-unit (RCON)」の製品写真・外観寸法、取扱説明書 MJ0384「RCON」第 3 章より）:
 * - 高さ 115mm・奥行 95mm の白っぽい（アイボリー）樹脂の箱を DIN レールの上で横に連結する。幅は
 *   ゲートウェイユニット 30mm、24V ドライバーユニット・EC 接続ユニット・PIO ユニット 22.6mm、200V 電源ユニット・200V ドライバーユニット 45.2mm、
 *   ターミナルユニット 12.8mm。
 * - 24V ドライバーユニットは上面の帯の色で種類が分かる（RCON-PC: 緑、RCON-AC: 青、RCON-DC: 茶）。
 * - ゲートウェイユニットの前面: Ethernet（オプション）、AUTO/MANU スイッチ、SIO、USB、システム I/O（2 列 × 5）、
 *   モーター電源（緑 2 極）、制御電源（緑 3 極）。フィールドネットワークのコネクターは上面にある。
 *
 * 連結（Conneko の bus）: ゲートウェイユニット（RCON-GW、RSEL、REC-GW）を親にし、右へ順にユニットを連結する（bus.kind 'iai-rcon'）。
 * 内部電源のレールは 'CP'（制御電源 24V。システム全体で 9.0A まで）と 'MP'（モーター電源 24V。37.5A まで）。
 * 親が外部の DC24V 電源から受けて、連結した 24V ドライバーユニット・EC 接続ユニットへ配る。各ユニットの消費は
 * 総合カタログ「電源容量」の値（制御電源: ドライバー 0.2A、ブレーキ付き 0.4A / 0.6A、拡張・EC 接続ユニット 0.1A など）。
 */
import type { BusSpec, ConnectorSpec, DeviceDefinition, ParamDef, ParamValues, TerminalDef } from '../types';
import { iaiDefs, led, MM, n2, slideSwitch, text } from './parts';

/** 連結のバスの種類 */
export const RCON_BUS = 'iai-rcon';
/** ユニットの高さ（115mm） */
export const RCON_H = 115 * MM;

export const rconUnitBus = (load: BusSpec['load']): BusSpec => ({ kind: RCON_BUS, load });

/** 共通のグラデーション */
export const rconDefs = (extra = '') => `
  ${iaiDefs(['#ece8dc', '#d9d5c8'])}
  <defs>
    <linearGradient id="rcbody-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#d9d5c8"/>
      <stop offset="0.12" stop-color="#f1eee4"/>
      <stop offset="0.88" stop-color="#ece8dc"/>
      <stop offset="1" stop-color="#cfcabb"/>
    </linearGradient>
    <linearGradient id="rcgreen-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#3f9d58"/>
      <stop offset="0.5" stop-color="#6fcf8a"/>
      <stop offset="1" stop-color="#3a9152"/>
    </linearGradient>
    <linearGradient id="rcblack-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#16171a"/>
      <stop offset="0.5" stop-color="#2d2f33"/>
      <stop offset="1" stop-color="#121315"/>
    </linearGradient>
    <linearGradient id="rcshield-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eceef0"/>
      <stop offset="1" stop-color="#959a9f"/>
    </linearGradient>
    <radialGradient id="rcscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8d8d8d"/>
    </radialGradient>
    ${extra}
  </defs>`;

/** ユニットの箱（上の帯の色 stripe、正面下部のグレーの銘板、上端の連結部）。dark は黒い筐体（REC） */
export function rconBody(W: number, model: string, stripe?: string, dark = false) {
  const H = RCON_H;
  return `
  <rect x="0.5" y="2" width="${n2(W - 1)}" height="${n2(H - 4)}" rx="1.5" fill="${dark ? '#26282b' : 'url(#rcbody-{{uid}})'}" stroke="${dark ? '#0b0b0c' : '#9a9588'}" stroke-width="0.7"/>
  ${stripe ? `<rect x="1.2" y="2.6" width="${n2(W - 2.4)}" height="5" rx="1" fill="${stripe}"/>` : ''}
  <rect x="2.5" y="${n2(H - 26)}" width="${n2(W - 5)}" height="16" rx="1" fill="#b9bcc0" stroke="#8a8d91" stroke-width="0.4"/>
  ${text(W / 2, H - 15.5, model, Math.min(3.4, (W - 6) / (model.length * 0.58)), '#2b2d30', 'middle', 'bold')}
  <rect x="${n2(W / 2 - 6)}" y="${n2(H - 6)}" width="12" height="4" rx="0.8" fill="#cfcabb" stroke="#9a9588" stroke-width="0.4"/>
  <rect x="${n2(W - 2.6)}" y="10" width="1.4" height="${n2(H - 40)}" fill="#000" opacity="0.08"/>`;
}

/** 黒いコネクター（モーター・エンコーダーなど）。cx, cy は中心 */
export const blackSocket = (cx: number, cy: number, w: number, h: number) => `
  <rect x="${n2(cx - w / 2)}" y="${n2(cy - h / 2)}" width="${n2(w)}" height="${n2(h)}" rx="1" fill="url(#rcblack-{{uid}})" stroke="#000" stroke-width="0.5"/>
  <rect x="${n2(cx - w / 2 + 2)}" y="${n2(cy - h / 2 + 2)}" width="${n2(w - 4)}" height="${n2(h - 4)}" rx="0.6" fill="#0b0b0c" stroke="#3a3c40" stroke-width="0.4"/>
  <rect x="${n2(cx - w / 4)}" y="${n2(cy - h / 2 + 3.5)}" width="${n2(w / 2)}" height="2" fill="#3a3c40"/>`;

/** 2 位置のトグル（ジョグ・ブレーキ解除） */
export const toggle = (cx: number, cy: number) => slideSwitch(cx, cy, 5, 3.4);

/** LED と名前 */
export const ledLabel = (x: number, y: number, name: string, c: 'g' | 'r' | 'o' | 'off' = 'off', anchor: 'start' | 'end' = 'start', color = '#3a3c40') =>
  `${led(x, y, c, 2.4, 1.8)}${text(anchor === 'start' ? x + 2.2 : x - 2.2, y + 0.9, name, 1.9, color, anchor)}`;

/** 制御電源・モーター電源の消費のパラメーター（bus.load から参照する） */
export const cpLoadParam = (options: { value: number; label: string }[], def: number): ParamDef => ({
  key: 'cpLoad',
  label: '制御電源の消費（CP）',
  unit: 'A',
  options,
  default: def,
});
export const mpLoadParam = (options: { value: number; label: string }[], def: number): ParamDef => ({
  key: 'mpLoad',
  label: 'モーター電源の消費（MP、ユニット合計）',
  unit: 'A',
  options,
  default: def,
});

/** モーター・エンコーダーコネクター（DF62、24 ピン）の ConnectorSpec */
export const rconMpg = (kind: string): ConnectorSpec => ({ kind, pins: 0, width: 18, length: 18, facing: 'front' });

/** ゲートウェイユニットのフィールドネットワークの種類（型式の I/O 種類） */
export type RconNet = 'DV' | 'CC' | 'CIE' | 'CIT' | 'PR' | 'EC' | 'ECM' | 'EP' | 'PRT' | 'ML3' | 'SSN' | 'N';

export const RCON_NET_LABELS: Record<RconNet, string> = {
  DV: 'DV: DeviceNet',
  CC: 'CC: CC-Link',
  CIE: 'CIE: CC-Link IE Field',
  CIT: 'CIT: CC-Link IE TSN',
  PR: 'PR: PROFIBUS-DP',
  EC: 'EC: EtherCAT',
  ECM: 'ECM: EtherCAT モーション',
  EP: 'EP: EtherNet/IP',
  PRT: 'PRT: PROFINET IO',
  ML3: 'ML3: MECHATROLINK-Ⅲ',
  SSN: 'SSN: SSCNETⅢ/H',
  N: 'N-EP: ポート未使用（前面の Ethernet で EtherNet/IP）',
};

/**
 * ゲートウェイユニットの上面のフィールドネットワークのコネクター（正面図の上端に、上から見下ろした形で描く）。
 * 端子は上（side: 'top'）へケーブルが出る。端子ID は 1 つ目 'NET1'、2 つ目 'NET2'（DeviceNet・CC-Link はネジ端子）。
 */
export function rconTopFieldbus(net: RconNet, W: number): { svg: string; terminals: TerminalDef[] } {
  const terminals: TerminalDef[] = [];
  let svg = '';
  const y = 9;
  const portTop = (id: string, label: string, x: number, protocols: string[], kind = 'RJ45', w = 22, l = 14): TerminalDef => ({
    id,
    label,
    x: n2(x),
    y,
    side: 'top',
    role: 'connector',
    connector: { kind, pins: 0, width: w, length: l, facing: 'front', protocols },
    optional: true,
  });
  const jackTop = (x: number, w = 20) =>
    `<rect x="${n2(x - w / 2)}" y="3" width="${w}" height="12" rx="0.8" fill="url(#rcshield-{{uid}})" stroke="#5d6166" stroke-width="0.5"/><rect x="${n2(x - w / 2 + 3)}" y="5" width="${n2(w - 6)}" height="7" rx="0.5" fill="#111"/>`;
  if (net === 'DV' || net === 'CC') {
    const dv = net === 'DV';
    const ids = dv ? ['V-', 'CAN_L', 'SHIELD', 'CAN_H', 'V+'] : ['DA', 'DB', 'DG', 'SLD', 'CC-FG'];
    const prints = dv ? ['V-', 'CAN L', 'DRAIN', 'CAN H', 'V+'] : ['DA', 'DB', 'DG', 'SLD', 'FG'];
    const pitch = Math.min(10.16, (W - 6) / 5);
    const x0 = W / 2 - pitch * 2;
    svg += `<rect x="${n2(x0 - pitch / 2 - 1)}" y="3" width="${n2(pitch * 5 + 2)}" height="12" rx="1" fill="url(#rcgreen-{{uid}})" stroke="#1d6a2a" stroke-width="0.5"/>`;
    ids.forEach((id, i) => {
      const x = x0 + i * pitch;
      svg += `<rect x="${n2(x - 2)}" y="5" width="4" height="4" rx="0.4" fill="#06140a"/>${text(x, 13.4, prints[i], 1.7, '#0b2a12')}`;
      const base = { id, label: prints[i], x: n2(x), y: 6, side: 'top' as const, optional: true };
      if (dv && id === 'V+') terminals.push({ ...base, role: 'input', accepts: { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['+'] }, note: 'DeviceNet 通信電源 +（赤）' });
      else if (dv && id === 'V-') terminals.push({ ...base, role: 'input', accepts: { system: 'DC', minVoltage: 11, maxVoltage: 25, conductors: ['-'] }, note: 'DeviceNet 通信電源 −（黒）' });
      else terminals.push({ ...base, role: id === 'CC-FG' ? 'ground' : 'signal', note: dv ? 'DeviceNet 通信線' : 'CC-Link 通信線' });
    });
  } else if (net === 'PR') {
    svg += `<rect x="${n2(W / 2 - 16)}" y="3" width="32" height="12" rx="1.2" fill="url(#rcshield-{{uid}})" stroke="#5d6166" stroke-width="0.5"/><path d="M${n2(W / 2 - 10)} 6 h20 l-2 6 h-16 z" fill="#1a1b1d"/>`;
    terminals.push(portTop('NET1', 'PROFIBUS-DP（D-sub 9 ピン）', W / 2, ['profibus-dp'], 'DSUB9', 32, 14));
  } else if (net !== 'N') {
    const two = net !== 'EP' && net !== 'PRT';
    const protocols =
      net === 'CIE' ? ['cc-link-ie-field'] : net === 'CIT' ? ['cc-link-ie-tsn'] : net === 'EC' || net === 'ECM' ? ['ethercat'] : net === 'EP' ? ['ethernet-ip', 'ethernet'] : net === 'PRT' ? ['profinet'] : net === 'ML3' ? ['mechatrolink-iii'] : ['sscnet-iii-h'];
    const kind = net === 'ML3' ? 'MECHATROLINK3' : net === 'SSN' ? 'SSCNET3' : 'RJ45';
    const names = net === 'EC' || net === 'ECM' ? ['IN', 'OUT'] : net === 'CIE' || net === 'CIT' ? ['P1', 'P2'] : net === 'ML3' || net === 'SSN' ? ['CN1', 'CN2'] : ['PORT'];
    const xs = two ? [W * 0.28, W * 0.72] : [W / 2];
    const w = two ? Math.min(20, W * 0.42) : 20;
    xs.forEach((x, i) => {
      svg += jackTop(x, w);
      terminals.push(portTop(`NET${i + 1}`, `${RCON_NET_LABELS[net].split(': ')[1]} ${names[i]}`, x, protocols, kind, kind === 'RJ45' ? 22 : 16, kind === 'RJ45' ? 19 : 12));
    });
  }
  return { svg, terminals };
}

/**
 * 24V ドライバーユニット（RCON-PC/PCF・RCON-AC・RCON-DC）。
 * 前面: LED（T RUN・SYS Ⅰ/Ⅱ）、ジョグスイッチ・ブレーキスイッチ（軸ごと）、モーター・エンコーダーコネクター（DF62 24 ピン、Ⅰ・Ⅱ）、
 * 駆動源遮断コネクター（DFMC1.5/2-STF-3.5、2×2: 4 MPI_Ⅰ・2 MPO_Ⅰ / 3 MPI_Ⅱ・1 MPO_Ⅱ）。
 * MPO はゲートウェイユニットから連結で来たモーター電源 24V の出力、MPI はその軸のモーター電源入力。
 * 通常は MPO-MPI を短絡し、外部で遮断する場合は間に接触器などの接点を入れる。
 */
export interface Rcon24Spec {
  type: string;
  model: string;
  name: string;
  description: string;
  stripe: string;
  motorKind: string;
  /** モデル（PC / PCF など）の選択肢。省略時はなし。motorKind はモデルごとのモーター・エンコーダーコネクターの種類（省略時は motorKind） */
  models?: { value: string; label: string; axes: 1 | 2; motorKind?: string }[];
  mpOptions: { value: number; label: string }[];
  mpDefault: number;
}

export const DRIVER_W = 22.6 * MM;

/** 1 軸目・2 軸目の位置 */
const DRV = {
  mpg: (i: number) => ({ x: n2(10.5 * MM), y: n2((38 + i * 14.5) * MM) }),
  cut: { x: n2(7.8 * MM), y: n2(67 * MM), dx: n2(5.6 * MM), dy: n2(3.6 * MM) },
};

export function rconDriverSvg(s: Rcon24Spec, axes: number, model: string) {
  const W = DRIVER_W;
  const lbl = (x: number, y: number, t: string, anchor: 'start' | 'end' | 'middle' = 'start', size = 1.8) => text(x, y, t, size, '#3a3c40', anchor);
  const c = DRV.cut;
  return `
  ${rconDefs()}
  ${rconBody(W, model, s.stripe)}
  ${ledLabel(n2(16 * MM), n2(11 * MM), 'T RUN', 'g', 'end')}
  ${[0, 1].map((i) => (i < axes ? ledLabel(n2(16 * MM), n2((14 + i * 3) * MM), i === 0 ? 'SYS Ⅰ' : 'SYS Ⅱ', 'off', 'end') : '')).join('')}
  ${[0, 1].map((i) => (i < axes ? `${toggle(n2(6 * MM), n2((22 + i * 5) * MM))}${toggle(n2(15 * MM), n2((22 + i * 5) * MM))}${lbl(n2(10.5 * MM), n2((22.6 + i * 5) * MM), i === 0 ? 'Ⅰ' : 'Ⅱ', 'middle')}` : '')).join('')}
  ${lbl(n2(6 * MM), n2(19.4 * MM), 'BK', 'middle', 1.6)}${lbl(n2(15 * MM), n2(19.4 * MM), 'JOG', 'middle', 1.6)}
  ${[0, 1].map((i) => {
    const m = DRV.mpg(i);
    return i < axes ? `${blackSocket(m.x, m.y, 9.5 * MM, 11 * MM)}${lbl(n2(19.5 * MM), n2(m.y + 1), i === 0 ? 'Ⅰ' : 'Ⅱ', 'middle', 2.2)}` : `<rect x="${n2(m.x - 9.5)}" y="${n2(m.y - 11)}" width="19" height="22" rx="1" fill="#e2ded1" stroke="#b5b0a3" stroke-width="0.4"/>`;
  }).join('')}
  <rect x="${n2(c.x - 4)}" y="${n2(c.y - 4.5)}" width="${n2(c.dx + 8)}" height="${n2(c.dy + 9)}" rx="1" fill="url(#rcblack-{{uid}})"/>
  ${[0, 1].map((r) => [0, 1].map((k) => `<rect x="${n2(c.x + k * c.dx - 2)}" y="${n2(c.y + r * c.dy - 1.5)}" width="4" height="3" rx="0.4" fill="#5d6166"/>`).join('')).join('')}`;
}

export function rconDriverTerminals(s: Rcon24Spec, axes: number, motorKind = s.motorKind): TerminalDef[] {
  const c = DRV.cut;
  const ts: TerminalDef[] = [];
  for (let i = 0; i < axes; i++) {
    const m = DRV.mpg(i);
    const ax = i === 0 ? 'Ⅰ' : 'Ⅱ';
    ts.push(frontConnector(`MPG${i + 1}`, `MPG ${ax}（${i + 1} 軸目 モーター・エンコーダー）`, 'アクチュエーターのモーター・エンコーダー一体ケーブル（DF62 24 ピン）', m.x, m.y, rconMpg(motorKind)));
    ts.push(
      {
        id: `MPI${i + 1}`,
        label: `MPI_${ax}`,
        note: `${i + 1} 軸目のモーター電源入力（MPO_${ax} と短絡するか、外部で遮断する場合は接触器などの接点を通してつなぐ）`,
        x: n2(c.x - 4),
        y: n2(c.y + i * c.dy),
        side: 'left',
        role: 'input',
        accepts: { system: 'DC', minVoltage: 21.6, maxVoltage: 26.4, conductors: ['+'] },
      },
      {
        id: `MPO${i + 1}`,
        label: `MPO_${ax}`,
        note: `${i + 1} 軸目のモーター電源出力（ゲートウェイユニットのモーター電源 24V が連結で来る）`,
        x: n2(c.x + c.dx + 4),
        y: n2(c.y + i * c.dy),
        side: 'right',
        role: 'supply',
        supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 6 },
        optional: true,
      },
    );
  }
  return ts;
}

/** 24V ドライバーユニットの機器定義を作る */
export function buildRcon24(s: Rcon24Spec): DeviceDefinition {
  const axesOf = (p: ParamValues) => {
    const m = s.models?.find((x) => x.value === String(p.model ?? s.models?.[0]?.value));
    return m ? m.axes : Number(p.axes ?? 2) === 1 ? 1 : 2;
  };
  const modelOf = (p: ParamValues) => s.models?.find((x) => x.value === String(p.model ?? s.models?.[0]?.value))?.value ?? `${s.model}-${axesOf(p)}`;
  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: 'IAI',
    category: 'control',
    description: s.description,
    labelPrefix: 'DRV',
    width: DRIVER_W,
    height: RCON_H,
    svg: (p) => rconDriverSvg(s, axesOf(p), modelOf(p)),
    terminals: (p) => rconDriverTerminals(s, axesOf(p), s.models?.find((x) => x.value === modelOf(p))?.motorKind ?? s.motorKind),
    links: [],
    params: [
      s.models
        ? { key: 'model', label: '型式', options: s.models.map((m) => ({ value: m.value, label: m.label })), default: s.models[0].value }
        : {
            key: 'axes',
            label: '軸数',
            options: [
              { value: 1, label: `${s.model}-1（1 軸仕様）` },
              { value: 2, label: `${s.model}-2（2 軸仕様）` },
            ],
            default: 2,
          },
      cpLoadParam(
        [
          { value: 0.2, label: 'ブレーキなし（0.2A）' },
          { value: 0.4, label: 'ブレーキあり 1 軸（0.4A）' },
          { value: 0.6, label: 'ブレーキあり 2 軸（0.6A）' },
        ],
        0.2,
      ),
      mpLoadParam(s.mpOptions, s.mpDefault),
    ],
    bus: rconUnitBus({ CP: { param: 'cpLoad' }, MP: { param: 'mpLoad' } }),
  };
}

/** 正面に差す小さなコネクターの端子 */
export const frontConnector = (id: string, label: string, note: string, x: number, y: number, connector: ConnectorSpec, side: TerminalDef['side'] = 'left'): TerminalDef => ({
  id,
  label,
  note,
  x: n2(x),
  y: n2(y),
  side,
  role: 'connector',
  connector,
  optional: true,
});

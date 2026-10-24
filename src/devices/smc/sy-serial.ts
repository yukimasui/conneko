/**
 * SMC SY シリーズのプラグイン形マニホールド（コネクタ接続ベース・横配管「タイプ 10」）に、省配線フィールドバスシステム EX260 の
 * SI ユニットを付けた通信タイプ（シリアル伝送）のマニホールドと、そこに装着するプラグイン形の電磁弁・ブランクプレートの機器定義を作る。
 *
 * 個別配線のマニホールド（sy-manifold.ts のタイプ 41）と同じく、増設ユニットの装着の仕組み（bus / mount）で表す。
 * - 親: D 側の SI ユニットと SUP/EXH ブロック（1(P)・5(EA)・3(EB)）。右に連を並べ、連の右端の U 側エンドプレートも親が描く
 * - 連: プラグイン形の電磁弁（SY3□00-5U1 / SY5□00-5U1）またはブランクプレート。弁のソレノイドはマニホールドの中のコネクタで
 *   SI ユニットにつながるので、電気の端子は画面に出さない。SI ユニットの出力番号は連の順に自動で決まる
 *   （bus.host.serial。src/model/bus.ts が連の params の solA / solB に入れる）
 * - 電磁弁の P・EA・EB は画面に出さないエアのポートで、親の bus.host.airGallery でマニホールドの P・EA・EB につながる
 *
 * 出典:
 *   SMC SY3000/5000 シリーズ カタログ（プラグイン形マニホールドの抜粋「Series SY3000/5000」p.14〜17。docs.rs-online.com の 0900766b81414b3a.pdf）
 *     マニホールド型式: SS5Y3-10S + SI ユニットの記号（DA = EtherCAT 32 点、DB = 16 点、FA / FB = PROFINET、…）+ 出力極性（なし = プラスコモン、N = マイナスコモン）
 *       - 連数 + P・E ポートの位置（U / D は 2〜10 連、B = 両側は 2〜24 連）+ SUP/EXH ブロック（なし = 内部パイロット）- A・B ポートの継手（例: SS5Y3-10SNAN-04D-C6）
 *     連数: 32 点の SI ユニットはダブル配線 2〜16 連・配線指定 2〜24 連（ソレノイド 32 点まで）、16 点はダブル配線 2〜8 連・配線指定 2〜16 連
 *     ダブル配線: どの連にも 2 位置シングル・ダブル・3 位置の弁を付けられる（シングルの弁では出力が 1 点余る）。配線指定はシングル配線の連に
 *     ダブル・3 位置の弁を付けられない。連 1 は D 側から数える
 *     プラグイン形の弁: SY3100-5U1（2 位置シングル）・SY3200-5U1（ダブル）・SY3300-5U1（3 位置クローズドセンタ）…（5 = DC24V、U = 表示灯・サージ電圧保護回路付き・無極性）
 *     ブランクプレート: SY30M-26-1A / SY50M-26-1A（1 = コネクタ接続ベース用）。P・E ポート: SY3000 は C8、SY5000 は C10 のワンタッチ管継手
 *   smc.eu の SS5Y3-10S（EX260）の型式選定: SI ユニットの記号に EA / EB（EtherNet/IP）・VA / VB（CC-Link）なども選べる
 *   SMC EX260 シリーズ カタログ（static.smc.eu の EX260-C_EU.pdf「CAT.EU02-25C」）
 *     SI ユニット: EX260-S□□n（EC = EtherCAT、EN = EtherNet/IP、PN = PROFINET。n = 1: 32 点 PNP（マイナスコモン）、2: 32 点 NPN（プラスコモン）、3: 16 点 PNP、4: 16 点 NPN）
 *     マニホールドの記号: DA = EX260-SEC2、DAN = SEC1、DB = SEC4、DBN = SEC3（FA… = SPN、EA… = SEN も同じ並び）
 *     電源: 制御用 DC21.6〜26.4V（内部消費電流 100mA 以下）、出力（電磁弁）用 DC22.8〜26.4V（32 点は最大 2.0A、16 点は 1.0A）
 *     コネクタ: BUS IN / BUS OUT は M12 4 ピン D コード（ソケット）、電源は M12 A コードのプラグ（EtherCAT・PROFINET は 5 ピン、EtherNet/IP は 4 ピン）
 *     電源ケーブル EX500-AP050-S（片側 M12 ソケット・片側バラ線）の芯線: EtherCAT・PROFINET は 1 茶 = 電磁弁用 24V、2 白 = 電磁弁用 0V、3 青 = 制御用 24V、4 黒 = 制御用 0V。
 *     EtherNet/IP は 1 茶 = 制御用 24V、2 白 = 電磁弁用 24V、3 青 = 制御用 0V、4 黒 = 電磁弁用 0V
 *     表示灯: EtherCAT は RUN・L/A IN・L/A OUT・PWR・PWR(V)、EtherNet/IP は MS・NS・L/A1・L/A2・PWR・PWR(V)、PROFINET は SF・BF・L/A1・L/A2・PWR・PWR(V)
 *   SMC EX260-SEC 取扱説明書（EX260-TF2Z156）: 出力番号は 0 から、マニホールドのソレノイドの位置の順（D 側＝SI ユニット側から、各連の A 側・B 側）。機能接地（M3）
 *
 * 絵は正面から見た姿: 左端に SI ユニット（M12 コネクタ・表示灯）、その右に SUP/EXH ブロック、連（白い弁本体・パイロット弁・アルミのベースと A・B の継手）。
 */
import type { ConnectorSpec, DeviceDefinition, ParamValues, PinDef, TerminalDef } from '../types';
import { text } from '../generic/parts';
import { fittingDown, fittingFace, SY_COIL_CURRENT, SY_FUNCTIONS, syAirLinks, syDefs, syPneumatic, type SyFunction } from './sy-common';
import { BASE_TOP, baseSegment, blankSvg, END_BOTTOM, END_TOP, H, manifoldParams, SY_SIZES, type SySize } from './sy-manifold';

/** 通信方式（型式の SI ユニットの記号の 1 文字目） */
export type SerialProtocol = 'D' | 'E' | 'F';

interface ProtocolSpec {
  name: string;
  /** SI ユニットの型式の記号（EX260-S□□） */
  code: string;
  /** connector.protocols */
  protocols: string[];
  /** 表示灯 */
  leds: string[];
  /** 電源コネクタのピン数（M12 A コード） */
  powerPins: 4 | 5;
}

export const SERIAL_PROTOCOLS: Record<SerialProtocol, ProtocolSpec> = {
  D: { name: 'EtherCAT', code: 'EC', protocols: ['ethercat'], leds: ['RUN', 'L/A IN', 'L/A OUT', 'PWR', 'PWR(V)'], powerPins: 5 },
  E: { name: 'EtherNet/IP', code: 'EN', protocols: ['ethernet-ip'], leds: ['MS', 'NS', 'L/A1', 'L/A2', 'PWR', 'PWR(V)'], powerPins: 4 },
  F: { name: 'PROFINET', code: 'PN', protocols: ['profinet'], leds: ['SF', 'BF', 'L/A1', 'L/A2', 'PWR', 'PWR(V)'], powerPins: 5 },
};

const protocolOf = (p: ParamValues): ProtocolSpec => SERIAL_PROTOCOLS[String(p.protocol ?? 'D') as SerialProtocol] ?? SERIAL_PROTOCOLS.D;
/** SI ユニットの出力点数（型式の記号の 2 文字目 A = 32 点、B = 16 点） */
const outputsOf = (p: ParamValues): 32 | 16 => (p.points === 'B' ? 16 : 32);
const pnpOf = (p: ParamValues) => p.polarity === 'PNP';

/** SI ユニットの型式（EX260-SEC2 など） */
export function siUnitModel(p: ParamValues): string {
  const n = (outputsOf(p) === 32 ? 1 : 3) + (pnpOf(p) ? 0 : 1);
  return `EX260-S${protocolOf(p).code}${n}`;
}

/** マニホールドのバスの種類（タイプ 10 のプラグイン形の弁とブランクプレートだけ装着できる） */
export const serialBusKind = (size: SySize) => `smc-ss5y${size}-10s`;

/** P・E ポートのワンタッチ管継手のチューブ外径（SY3000 は C8、SY5000 は C10） */
const PE_OD: Record<SySize, number> = { 3: 8, 5: 10 };

/** SI ユニット・SUP/EXH ブロックの幅[px]（SI ユニットの実物の幅は約 28mm） */
const SI_W = 58;
const BLOCK_W = 40;
/** P・E ポートを両側にする連数（U・D の片側は 10 連まで） */
const ONE_SIDE_MAX = 10;

/** M12 のレセプタクルを正面から見た絵。socket はメス（ピンの穴）、pins はピン数（5 は中央のピンを足す） */
function m12Face(cx: number, cy: number, pins: 4 | 5, socket: boolean, r = 8.5): string {
  const dots = [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
    ...(pins === 5 ? [[0, 0]] : []),
  ]
    .map(([dx, dy]) => {
      const x = +(cx + dx * r * 0.32).toFixed(2);
      const y = +(cy + dy * r * 0.32).toFixed(2);
      return socket
        ? `<circle cx="${x}" cy="${y}" r="${+(r * 0.1).toFixed(2)}" fill="#0b0b0c"/>`
        : `<circle cx="${x}" cy="${y}" r="${+(r * 0.1).toFixed(2)}" fill="#e2bf55" stroke="#8a6d1c" stroke-width="0.3"/>`;
    })
    .join('');
  const knurl = Array.from({ length: 20 }, (_, i) => {
    const a = (i * Math.PI) / 10;
    return `<line x1="${+(cx + r * 0.84 * Math.cos(a)).toFixed(2)}" y1="${+(cy + r * 0.84 * Math.sin(a)).toFixed(2)}" x2="${+(cx + r * 0.98 * Math.cos(a)).toFixed(2)}" y2="${+(cy + r * 0.98 * Math.sin(a)).toFixed(2)}" stroke="#8d9297" stroke-width="0.4"/>`;
  }).join('');
  return `
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="#c9cdd1" stroke="#6d7277" stroke-width="0.6"/>
  ${knurl}
  <circle cx="${cx}" cy="${cy}" r="${+(r * 0.7).toFixed(2)}" fill="${socket ? '#2a2b2e' : '#3a3c40'}" stroke="#0a0a0b" stroke-width="0.5"/>
  ${socket ? `<circle cx="${cx}" cy="${cy}" r="${+(r * 0.52).toFixed(2)}" fill="#4a4d52"/>` : ''}
  ${dots}
  <rect x="${+(cx - r * 0.08).toFixed(2)}" y="${+(cy - r * 0.7).toFixed(2)}" width="${+(r * 0.16).toFixed(2)}" height="${+(r * 0.16).toFixed(2)}" fill="#c9cdd1"/>`;
}

/** 通信ポート（M12 4 ピン D コードのソケット）。RJ-45 とは M12 ⇔ RJ-45 の通信ケーブルでつなぐ */
const busConnector = (protocols: string[]): ConnectorSpec => ({ kind: 'M12D', pins: 0, width: 16, length: 18, facing: 'front', style: 'round', mates: ['RJ45'], protocols });

/**
 * 電源コネクタ（M12 A コードのプラグ。EtherCAT・PROFINET は 5 ピン、EtherNet/IP は 4 ピン）。
 * どちらにも SMC の電源ケーブル（5 ピンのソケット。smc.ex500-ap050-s）を差すので、種類は 'M12-5' にそろえる
 * （センサーの M12 4 ピンのコネクタ 'M12-4' とは区別する）
 */
const powerConnector = (pins: 4 | 5): ConnectorSpec => ({
  kind: 'M12-5',
  pins,
  width: 16,
  length: 18,
  facing: 'front',
  style: 'round',
  pinColors: pins === 5 ? { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black', 5: 'gray' } : { 1: 'brown', 2: 'white', 3: 'blue', 4: 'black' },
});

/** 電源のピン。valve は電磁弁用（出力用）、control は制御用（SI ユニットの動作用） */
function powerPins(pins: 4 | 5): PinDef[] {
  const valve = { system: 'DC' as const, minVoltage: 22.8, maxVoltage: 26.4 };
  const control = { system: 'DC' as const, minVoltage: 21.6, maxVoltage: 26.4 };
  const pin = (n: number, what: 'valve' | 'control', c: '+' | '-'): PinDef => ({
    id: `PWR#${n}`,
    label: `${n} ${what === 'valve' ? 'SV' : 'SI'}${c === '+' ? '24V' : '0V'}`,
    note: `${what === 'valve' ? '電磁弁用' : '制御用'}電源 ${c === '+' ? '+24V' : '0V'}（${what === 'valve' ? 'DC22.8〜26.4V' : 'DC21.6〜26.4V'}）`,
    role: 'input',
    accepts: { ...(what === 'valve' ? valve : control), conductors: [c] },
  });
  return pins === 5
    ? [pin(1, 'valve', '+'), pin(2, 'valve', '-'), pin(3, 'control', '+'), pin(4, 'control', '-')]
    : [pin(1, 'control', '+'), pin(2, 'valve', '+'), pin(3, 'control', '-'), pin(4, 'valve', '-')];
}

/** 表示灯（3 列）。x0, y0 は左上 */
function ledPanel(names: string[], x0: number, y0: number, w: number): string {
  const cols = 3;
  const cw = w / cols;
  return names
    .map((nm, i) => {
      const cx = +(x0 + cw * (i % cols) + cw / 2).toFixed(2);
      const cy = y0 + 4 + Math.floor(i / cols) * 9;
      const on = nm.startsWith('PWR') || nm === 'RUN' || nm === 'MS';
      return `<rect x="${cx - 2.4}" y="${cy - 1.4}" width="4.8" height="2.8" rx="0.8" fill="${on ? '#4be35a' : '#3c4a3e'}" stroke="#101" stroke-width="0.3"/>${text(cx, cy + 4.6, nm, 2.3, '#d8dbdf', 'normal')}`;
    })
    .join('');
}

/** 通信タイプのマニホールドの型式（SS5Y3-10SDA-06D-C6 など） */
export function serialManifoldModel(size: SySize, p: ParamValues): string {
  const n = Number(p.stations ?? 0) || 0;
  const code = String(p.portCode ?? '');
  const si = `${String(p.protocol ?? 'D')}${outputsOf(p) === 32 ? 'A' : 'B'}${pnpOf(p) ? 'N' : ''}`;
  return `SS5Y${size}-10S${si}-${String(n).padStart(2, '0')}${n > ONE_SIDE_MAX ? 'B' : 'D'}${code ? `-${code}` : ''}`;
}

/** 通信タイプのマニホールド（SI ユニット・SUP/EXH ブロックが親。U 側エンドプレートも描く） */
export function buildSs5y10s(size: SySize, type: string): DeviceDefinition {
  const z = SY_SIZES[size];
  const W = SI_W + BLOCK_W;
  const od = PE_OD[size];
  const ports = [
    { id: 'EA', label: '5(EA)', x: SI_W + 8 },
    { id: 'P', label: '1(P)', x: SI_W + 20 },
    { id: 'EB', label: '3(EB)', x: SI_W + 32 },
  ];
  /** 通信ポート・電源・接地の位置 */
  const CN = { out: { x: 16, y: 66 }, in: { x: 16, y: 92 }, pwr: { x: 16, y: 118 }, fe: { x: 9, y: 139 } };
  const BLOCK_TOP = 60;
  const BLOCK_BOTTOM = 141;

  const svg = (p: ParamValues) => {
    const n = Number(p.stations ?? 0) || 0;
    const proto = protocolOf(p);
    const both = n > ONE_SIDE_MAX;
    // U 側エンドプレート（連の右端。親の枠の外に描く）
    const ux = W + n * z.station;
    return `
  <defs>${syDefs}
    <linearGradient id="si-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#4a4e54"/>
      <stop offset="0.5" stop-color="#5d6268"/>
      <stop offset="1" stop-color="#3b3f44"/>
    </linearGradient>
  </defs>
  <!-- SUP/EXH ブロック（D 側。P・E ポートの継手は下面） -->
  ${ports.map((q) => fittingDown(q.x, BLOCK_BOTTOM - 2, 9, 10)).join('')}
  <rect x="${SI_W}" y="${BLOCK_TOP}" width="${BLOCK_W - 1}" height="${BLOCK_BOTTOM - BLOCK_TOP}" rx="1.5" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
  <rect x="${SI_W + 3}" y="${BLOCK_TOP + 4}" width="${BLOCK_W - 7}" height="28" rx="1.5" fill="#e8eaec" stroke="#8a9096" stroke-width="0.5"/>
  ${text(SI_W + BLOCK_W / 2, BLOCK_TOP + 14, 'SMC', 6, '#1f5fa8')}
  ${text(SI_W + BLOCK_W / 2, BLOCK_TOP + 21, `SS5Y${size}`, 3.8, '#333', 'normal')}
  ${text(SI_W + BLOCK_W / 2, BLOCK_TOP + 27, '10S', 3.4, '#555', 'normal')}
  ${text(SI_W + BLOCK_W / 2, BLOCK_TOP + 42, 'D', 5, '#444')}
  ${ports.map((q) => `${text(q.x, BLOCK_BOTTOM - 14, q.label.replace(/\(.*\)/, ''), 4.2, '#222', 'normal')}${text(q.x, BLOCK_BOTTOM - 8.5, q.label.replace(/^\d/, ''), 3.2, '#444', 'normal')}`).join('')}
  <!-- SI ユニット（EX260） -->
  <rect x="1" y="10" width="${SI_W - 1}" height="136" rx="3" fill="url(#si-{{uid}})" stroke="#202225" stroke-width="0.9"/>
  <rect x="4" y="13" width="${SI_W - 7}" height="20" rx="1.5" fill="#2c2f33" stroke="#17181a" stroke-width="0.5"/>
  ${text(SI_W / 2, 21, 'SMC', 6, '#5aa0ef')}
  ${text(SI_W / 2, 26.5, 'EX260', 3.6, '#e6e8ea', 'normal')}
  ${text(SI_W / 2, 31, siUnitModel(p), 3, '#b9bdc2', 'normal')}
  <rect x="4" y="36" width="${SI_W - 7}" height="${proto.leds.length > 3 ? 20 : 11}" rx="1.2" fill="#24272a"/>
  ${ledPanel(proto.leds, 4, 36, SI_W - 7)}
  ${m12Face(CN.out.x, CN.out.y, 4, true)}
  ${text(28, CN.out.y - 1, 'BUS OUT', 3.4, '#f0f1f2', 'bold', 'start')}
  ${text(28, CN.out.y + 4, `M12 D ${proto.name}`, 2.4, '#c9ccd0', 'normal', 'start')}
  ${m12Face(CN.in.x, CN.in.y, 4, true)}
  ${text(28, CN.in.y - 1, 'BUS IN', 3.4, '#f0f1f2', 'bold', 'start')}
  ${text(28, CN.in.y + 4, `M12 D ${proto.name}`, 2.4, '#c9ccd0', 'normal', 'start')}
  ${m12Face(CN.pwr.x, CN.pwr.y, proto.powerPins, false)}
  ${text(28, CN.pwr.y - 1, 'PWR', 3.4, '#f0f1f2', 'bold', 'start')}
  ${text(28, CN.pwr.y + 4, `M12 A ${proto.powerPins} ピン`, 2.4, '#c9ccd0', 'normal', 'start')}
  <circle cx="${CN.fe.x}" cy="${CN.fe.y}" r="2.8" fill="#d9dcdf" stroke="#55595e" stroke-width="0.5"/>
  <path d="M${CN.fe.x - 1.8} ${CN.fe.y} H${CN.fe.x + 1.8} M${CN.fe.x} ${CN.fe.y - 1.8} V${CN.fe.y + 1.8}" stroke="#55595e" stroke-width="0.6"/>
  ${text(CN.fe.x + 9, CN.fe.y + 1.4, 'FE', 3.2, '#e6e8ea', 'normal')}
  ${text(42, 140.4, `${outputsOf(p)} 点 ${pnpOf(p) ? 'PNP' : 'NPN'}`, 2.6, '#c9ccd0', 'normal')}
  <!-- U 側エンドプレート${both ? '（P・E ポートは D 側と同じ通路）' : ''} -->
  <g transform="translate(${ux} 0)">
    <rect x="0" y="${END_TOP}" width="${z.endPlate}" height="${END_BOTTOM - END_TOP}" rx="2" fill="url(#alu-{{uid}})" stroke="#5f666c" stroke-width="0.8"/>
    ${text(z.endPlate / 2, END_TOP + 7, 'U', 5, '#444')}
    ${both ? [108, 121, 134].map((y) => fittingFace(z.endPlate / 2, y, 4.6)).join('') : ''}
  </g>`;
  };

  const terminals = (p: ParamValues): TerminalDef[] => {
    const proto = protocolOf(p);
    const pe = ports.map((q) => ({
      id: q.id,
      label: q.label,
      hint: q.id === 'P' ? 'SUP' : 'EXH',
      note:
        q.id === 'P'
          ? `供給 SUP（φ${od} のワンタッチ管継手。装着した電磁弁すべての P につながる）`
          : `排気 EXH ${q.label}（φ${od} のワンタッチ管継手。装着した電磁弁すべての ${q.id} につながる。サイレンサを付けるか集合排気する）`,
      x: q.x,
      y: H,
      side: 'bottom' as const,
      role: 'air' as const,
      air: q.id === 'P' ? { kind: 'in' as const, tubeOD: od, maxPressure: 0.7 } : { kind: 'exhaust' as const, tubeOD: od },
    }));
    return [
      {
        id: 'IN',
        label: 'BUS IN',
        hint: 'BUS IN',
        note: `${proto.name} の通信ポート BUS IN（M12 4 ピン D コード）。上位（PLC の通信ポート・前の機器の BUS OUT）からつなぐ`,
        x: CN.in.x,
        y: CN.in.y,
        side: 'left',
        role: 'connector',
        // 上位からの通信がなければ弁は動かないので、つなぎ忘れを警告する
        connector: { ...busConnector(proto.protocols), required: true },
      },
      {
        id: 'OUT',
        label: 'BUS OUT',
        hint: 'BUS OUT',
        note: `${proto.name} の通信ポート BUS OUT（M12 4 ピン D コード）。次の機器へ渡り配線する（使わなければシールキャップ）`,
        x: CN.out.x,
        y: CN.out.y,
        side: 'left',
        role: 'connector',
        connector: busConnector(proto.protocols),
        optional: true,
      },
      {
        id: 'PWR',
        label: 'PWR（M12）',
        hint: '電源',
        note: `電源コネクタ（M12 ${proto.powerPins} ピン A コードのプラグ）。電磁弁用と制御用の DC24V を受ける（電源ケーブル EX500-AP050-S などでつなぐ）`,
        x: CN.pwr.x,
        y: CN.pwr.y,
        side: 'left',
        role: 'connector',
        connector: powerConnector(proto.powerPins),
      },
      { id: 'FE', label: 'FE', hint: '機能接地', note: '機能接地（M3）。近くで短い電線で接地する', x: CN.fe.x, y: CN.fe.y, side: 'left', role: 'ground', optional: true },
      ...pe,
    ];
  };

  return {
    type,
    name: 'マニホールド（電磁弁用・SI ユニット付き）',
    model: `SS5Y${size}-10S`,
    modelOf: (p) => serialManifoldModel(size, p),
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC SY${size}000 シリーズ プラグイン形マニホールド（コネクタ接続ベース・横配管 タイプ 10）に、省配線フィールドバスシステム EX260 の SI ユニットを付けたもの。` +
      `プラグイン形の電磁弁 SY${size}□00-5U1 とブランクプレート SY${size}0M-26-1A を連として装着する（連 1 は D 側＝SI ユニット側から。最大 24 連・ソレノイド 32 点）。` +
      `型式は SS5Y${size}-10S<SI ユニットの記号><極性>-<連数><P・E ポートの位置>-<A/B ポートの継手>（SI ユニットの記号は D = EtherCAT、E = EtherNet/IP、F = PROFINET に A = 32 点、B = 16 点。` +
      `極性はなし = プラスコモン（NPN）、N = マイナスコモン（PNP）。P・E ポートは 10 連までは D 側、11 連からは両側 B）。` +
      `各弁のソレノイドはマニホールドの中で SI ユニットの出力につながり、出力番号は 0 から連の順（各連の A 側・B 側）に決まる。ダブル配線（標準）はどの連も 2 点を使い、` +
      `配線指定はシングルの連を 1 点にする（マニホールド仕様書で指示する）。SI ユニットは BUS IN / BUS OUT（M12 D コード）で PLC の通信ポートへつなぎ、` +
      `電源コネクタ（M12）に電磁弁用（DC22.8〜26.4V、最大 2.0A）と制御用（DC21.6〜26.4V、100mA 以下）の DC24V を入れる。` +
      `SUP 1(P)・EXH 5(EA)・3(EB) は φ${od} のワンタッチ管継手。連の構成はバルブエディタで編集できる。`,
    estimated:
      'SI ユニットの正面のコネクタ・表示灯の並びと寸法は、外形図を見やすく描いたもの（推定）。配線指定でブランクプレートの連を 1 点とするのは推定。' +
      'A/B ポートの継手が連ごとに違う場合の型式の表記（M）は推定。',
    labelPrefix: 'MF',
    width: W,
    height: H,
    svg,
    terminals,
    pins: (p) => powerPins(protocolOf(p).powerPins),
    // 制御用 100mA ＋ 装着した弁のソレノイドの電流（fromUnits で求める）。電源の保護・電線の太さの確認に使う
    loadCurrent: { param: 'loadCurrent' },
    params: [
      {
        key: 'protocol',
        label: '通信方式（SI ユニット）',
        options: (Object.keys(SERIAL_PROTOCOLS) as SerialProtocol[]).map((k) => ({ value: k, label: `${k}: ${SERIAL_PROTOCOLS[k].name}（EX260-S${SERIAL_PROTOCOLS[k].code}）` })),
        default: 'D',
      },
      {
        key: 'points',
        label: 'SI ユニットの出力点数',
        options: [
          { value: 'A', label: 'A: 32 点' },
          { value: 'B', label: 'B: 16 点' },
        ],
        default: 'A',
      },
      {
        key: 'polarity',
        label: '出力極性',
        options: [
          { value: 'NPN', label: 'プラスコモン（NPN、記号なし）' },
          { value: 'PNP', label: 'マイナスコモン（PNP、N）' },
        ],
        default: 'NPN',
      },
      {
        key: 'wiring',
        label: '配線',
        options: [
          { value: 'double', label: 'ダブル配線（標準。どの連も 2 点）' },
          { value: 'specified', label: '配線指定（シングルの連は 1 点）' },
        ],
        default: 'double',
      },
    ],
    bus: {
      kind: serialBusKind(size),
      host: {
        slots: 24,
        origin: { x: W, y: 0 },
        airGallery: { P: 'P', EA: 'EA', EB: 'EB' },
        fromUnits: serialManifoldParams,
        serial: { wiring: { param: 'wiring' }, outputs: outputsOf, unitModel: siUnitModel },
      },
    },
    pneumatic: { symbol: 'manifold', ports: { sup: 'P', exh: 'EA' } },
  };
}

/** SI ユニットの制御用の消費電流[A]（内部消費電流 100mA 以下） */
const SI_CONTROL_CURRENT = 0.1;

/**
 * 装着した連から求めるマニホールドのパラメータ: 連数・A/B の継手の記号（個別配線と同じ）と、
 * 電源の消費電流（制御用 ＋ 弁のソレノイドの数 × 0.4W / 24V）。ソレノイドは同時に全部が ON になるとみなす
 */
export function serialManifoldParams(units: { def: DeviceDefinition; params: ParamValues }[]): ParamValues {
  const solenoids = units.reduce((n, u) => {
    const hint = typeof u.def.pneumatic === 'function' ? u.def.pneumatic(u.params) : u.def.pneumatic;
    return n + Object.values(hint?.valve?.operators ?? {}).filter((o) => o === 'solenoid').length;
  }, 0);
  return { ...manifoldParams(units), loadCurrent: Math.round((SI_CONTROL_CURRENT + solenoids * SY_COIL_CURRENT) * 1000) / 1000 };
}

export interface SyPlugInSpec {
  type: string;
  model: string;
  fn: SyFunction;
  size: SySize;
}

/** プラグイン形の電磁弁（1 連）。ソレノイドの電気端子はなく、SI ユニットの出力番号（params の solA / solB）を札に書く */
export function buildSyPlugIn(s: SyPlugInSpec): DeviceDefinition {
  const f = SY_FUNCTIONS[s.fn];
  const z = SY_SIZES[s.size];
  const W = z.station;
  const double = f.solenoids === 2;
  const svg = (p: ParamValues) => {
    const outs = [p.solA, ...(double ? [p.solB] : [])].filter((v) => v !== undefined && v !== '');
    return `
  <defs>${syDefs}
  </defs>
  ${baseSegment(W, false)}
  <!-- 弁本体（白い樹脂） -->
  <rect x="1.5" y="60" width="${W - 3}" height="${BASE_TOP - 60}" rx="1.5" fill="url(#valve-{{uid}})" stroke="#8a9096" stroke-width="0.7"/>
  ${text(W / 2, 72, 'SMC', W > 44 ? 6.5 : 5.6, '#1f5fa8')}
  ${text(W / 2, 80, s.model.replace(/-.*/, ''), W > 44 ? 4.4 : 3.8, '#333', 'normal')}
  ${text(W / 2, 86, s.model.replace(/^[^-]*-/, ''), 3.4, '#555', 'normal')}
  ${f.center ? `<rect x="${W / 2 - 7}" y="89" width="14" height="6" rx="1" fill="#e8eef6" stroke="#9fb3cc" stroke-width="0.4"/>${text(W / 2, 93.6, '3位置', 3.6, '#1f4f8a', 'normal')}` : ''}
  <!-- パイロット弁（表示灯付き。コネクタはマニホールドの中） -->
  <rect x="1" y="43" width="${W - 2}" height="18" rx="1.5" fill="url(#pilot-{{uid}})" stroke="#2a2c2f" stroke-width="0.6"/>
  ${(double ? [W * 0.27, W * 0.73] : [W / 2]).map((cx) => `<circle cx="${cx}" cy="54" r="3" fill="#d9dcdf" stroke="#555" stroke-width="0.5"/><path d="M${cx - 1.8} 54 H${cx + 1.8}" stroke="#555" stroke-width="0.8"/>`).join('')}
  ${(double ? [W * 0.27, W * 0.73] : [W / 2]).map((cx) => `<rect x="${cx - 3}" y="45" width="6" height="3" rx="0.8" fill="#ff8a3d" opacity="0.9"/>`).join('')}
  ${double ? `${text(W * 0.27, 60, 'A', 3.4, '#f2f2f2')}${text(W * 0.73, 60, 'B', 3.4, '#f2f2f2')}` : ''}
  ${
    outs.length
      ? `<!-- SI ユニットの出力番号の札 -->
  <rect x="3" y="28" width="${W - 6}" height="12" rx="1.5" fill="#ffffff" stroke="#7d8287" stroke-width="0.5"/>
  ${text(W / 2, 32.6, '出力', 3, '#555', 'normal')}
  ${text(W / 2, 38.4, outs.join('・'), 4.6, '#1f4f8a')}`
      : ''
  }
`;
  };
  const aOn = double ? 'A 側に通電した位置' : '通電した位置';
  const bOn = double ? 'B 側に通電した位置' : '通電していない位置';
  const air: TerminalDef[] = [
    { id: 'A', label: '4(A)', hint: '出力 A', note: `出力ポート 4(A)（マニホールドベースのこの連の継手。${aOn}で P とつながる）`, x: W * 0.3, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
    { id: 'B', label: '2(B)', hint: '出力 B', note: `出力ポート 2(B)（マニホールドベースのこの連の継手。${bOn}で P とつながる）`, x: W * 0.7, y: H, side: 'bottom', role: 'air', air: { kind: 'work', tubeOD: { param: 'portAB' } } },
  ];
  const pins: PinDef[] = [
    { id: 'P', label: '1(P)', note: '供給（マニホールドの SUP の通路につながる。チューブはつながない）', role: 'air', air: { kind: 'in', minPressure: f.minPressure, maxPressure: f.maxPressure } },
    { id: 'EA', label: '5(EA)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
    { id: 'EB', label: '3(EB)', note: '排気（マニホールドの EXH の通路につながる）', role: 'air', air: { kind: 'exhaust' } },
  ];
  return {
    type: s.type,
    name: `${f.name}・プラグイン形`,
    model: s.model,
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC の 5 ポート電磁弁 SY${s.size}000 シリーズ プラグイン形（${f.short}、DC24V、表示灯・サージ電圧保護回路付き・無極性）。` +
      `SI ユニット付きのマニホールド SS5Y${s.size}-10S に 1 連として装着する（mount で指定）。ソレノイドはマニホールドの中のコネクタで SI ユニットの出力につながるので、電線はつながない` +
      `（出力番号は連の順に自動で決まり、弁の上の札・インスペクタ・バルブエディタに出る）。P・EA・EB はマニホールドの中で SUP・EXH につながり、A・B はマニホールドベースのこの連の継手から出す。` +
      `使用圧力範囲 ${f.minPressure}〜${f.maxPressure}MPa。消費電力 0.35W（表示灯込みは 0.4W）。${f.behavior}`,
    labelPrefix: 'SOL',
    width: W,
    height: H,
    svg,
    terminals: air,
    pins,
    airLinks: syAirLinks(),
    params: [
      {
        key: 'portAB',
        label: 'A・B ポートの継手（この連）',
        unit: 'mm',
        options: z.abOptions.map((v) => ({ value: v, label: `C${v}（φ${v} ワンタッチ管継手）` })),
        default: 6,
      },
    ],
    pneumatic: syPneumatic(s.fn),
    bus: { kind: serialBusKind(s.size) },
  };
}

/** プラグイン形マニホールドのブランクプレート（弁を付けない連をふさぐ板） */
export function buildSyPlugInBlank(size: SySize, type: string): DeviceDefinition {
  return {
    type,
    name: 'ブランクプレート（プラグイン形マニホールド用）',
    model: `SY${size}0M-26-1A`,
    maker: 'SMC',
    category: 'valve',
    description:
      `SMC SS5Y${size}-10S（SI ユニット付きのプラグイン形マニホールド）の、電磁弁を付けない連をふさぐブランクプレート。連数に数える（増設の予備などに使う）。` +
      'この連の A・B ポートには栓をする。ダブル配線のマニホールドでは、この連も SI ユニットの出力を 2 点使う（空き）。',
    labelPrefix: 'BP',
    width: SY_SIZES[size].station,
    height: H,
    svg: blankSvg(SY_SIZES[size].station),
    terminals: [],
    bus: { kind: serialBusKind(size) },
  };
}

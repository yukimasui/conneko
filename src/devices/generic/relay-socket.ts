/**
 * DIN レール用ソケットに挿したプラグイン形のリレー・タイマーの機器定義を作る（オムロン MY + PYF、IDEC RU + SM など）。
 *
 * 正面から見たソケット（ネジ端子が上下の段に並ぶ）と、その中央に載ったリレー（透明カバーの中に接点とコイルが見える）、
 * またはタイマーの正面（時間設定つまみ）を描く。端子の位置・番号は機種ごとに spec で与える。
 * category は 'contactor'（受電端子 2 つが展開図のコイルになる）。
 */
import type { AcceptSpec, DeviceDefinition, InternalLink, TerminalDef, TerminalSide } from '../types';
import { SCREW_GRADIENT, screw, sideShade, text } from './parts';

export interface SocketTerminal {
  id: string;
  x: number;
  y: number;
  side: TerminalSide;
  /** 印字（端子 ID と違う場合。例: IDEC RJ の '6 (21)'） */
  print?: string;
  /** 端子の意味（例: 'COM（極 1）'） */
  note: string;
  /** 吹き出しに出す短い呼び名（10 文字まで。例: 'コイル+'） */
  hint?: string;
  /** コイル（受電端子）の極性。'any' は極性なし */
  coil?: '+' | '-' | 'any';
}

export interface RelayFace {
  /** リレー（カバー）の外形 */
  x: number;
  y: number;
  w: number;
  h: number;
  /** カバーの色（'clear': 透明（中のコイル・接点が見える）、それ以外は不透明の色） */
  cover: 'clear' | string;
  /** カバーに書く文字（上から順に） */
  lines: string[];
  /** カバーの文字の色（省略時は透明カバーなら黒、不透明なら白） */
  ink?: string;
  /** 文字を書き始める位置（カバーの上端からの割合。省略時は中央付近） */
  textTop?: number;
  /** 動作表示 LED の位置 */
  led?: { x: number; y: number; color: string };
  /** タイマーの時間設定つまみ（中心と半径） */
  dial?: { x: number; y: number; r: number };
  /** 接点の数（透明カバーの中に見える可動接点の数） */
  poles?: number;
}

export interface RelaySocketSpec {
  type: string;
  name: string;
  model: string;
  maker: string;
  description: string;
  labelPrefix: string;
  width: number;
  height: number;
  /** ソケット本体（取付けタブを除く）の上下 */
  socketTop: number;
  socketBottom: number;
  /** ソケット本体の色 */
  socketColor: { edge: string; mid: string };
  /** ネジ端子の座金の色・印字の色 */
  seat: string;
  ink: string;
  terminals: SocketTerminal[];
  /** 端子番号の印字の位置（ネジからのずれ。上の段は上、下の段は下に書く） */
  labelOffset: (t: SocketTerminal) => { dx: number; dy: number };
  relay: RelayFace;
  /** コイル（受電端子）の受電条件 */
  coil: Omit<AcceptSpec, 'conductors'>;
  links: InternalLink[];
  loadCurrent: number;
  /** ソケットの側面に縦書きする型式 */
  socketName: string;
  estimated?: string;
}

/** 透明カバーの中身（可動接点とコイル） */
function relayInner(r: RelayFace): string {
  const poles = r.poles ?? 2;
  const pad = 3;
  const cw = (r.w - 2 * pad) / poles;
  const contacts = Array.from({ length: poles }, (_, i) => {
    const x = r.x + pad + i * cw + cw / 2;
    return `<rect x="${x - 1.2}" y="${r.y + 6}" width="2.4" height="${r.h * 0.42}" fill="#c9a43a" stroke="#7a6220" stroke-width="0.3"/>
      <circle cx="${x}" cy="${r.y + 8}" r="1.8" fill="#e8d7a0" stroke="#7a6220" stroke-width="0.3"/>`;
  }).join('');
  const coilY = r.y + r.h * 0.56;
  const coilH = r.h * 0.34;
  const windings = Array.from({ length: Math.floor(coilH / 2.6) }, (_, i) => `<path d="M${r.x + 5} ${coilY + 1.5 + i * 2.6} H${r.x + r.w - 5}" stroke="#8a4a1c" stroke-width="0.7"/>`).join('');
  return `
  <rect x="${r.x + 2}" y="${r.y + 2}" width="${r.w - 4}" height="${r.h - 4}" rx="1.5" fill="#d8dadd"/>
  ${contacts}
  <rect x="${r.x + 5}" y="${coilY}" width="${r.w - 10}" height="${coilH}" rx="2" fill="#b4672c"/>
  ${windings}`;
}

export function buildRelaySocket(s: RelaySocketSpec): DeviceDefinition {
  const r = s.relay;
  const ink = r.ink ?? (r.cover === 'clear' ? '#1a1a1a' : '#f2f2f2');
  const textY = r.y + r.h * (r.textTop ?? 0.38);
  const plate =
    r.cover === 'clear' && r.lines.length
      ? `<rect x="${r.x + 3}" y="${textY}" width="${r.w - 6}" height="${r.lines.length * 5.4 + 2.6}" rx="1" fill="#f4f6f8" opacity="0.85"/>`
      : '';
  const lines = plate + r.lines.map((t, i) => text(r.x + r.w / 2, textY + 5 + i * 5.4, t, i === 0 ? 4.6 : 3.8, ink, i === 0 ? 'bold' : 'normal')).join('');
  const dial = r.dial
    ? `
  <circle cx="${r.dial.x}" cy="${r.dial.y}" r="${r.dial.r + 3}" fill="#f3f1ea" stroke="#8a8a8a" stroke-width="0.5"/>
  ${Array.from({ length: 11 }, (_, i) => {
    const a = ((-135 + i * 27) * Math.PI) / 180;
    const x1 = r.dial!.x + (r.dial!.r + 0.6) * Math.sin(a);
    const y1 = r.dial!.y - (r.dial!.r + 0.6) * Math.cos(a);
    const x2 = r.dial!.x + (r.dial!.r + 2.6) * Math.sin(a);
    const y2 = r.dial!.y - (r.dial!.r + 2.6) * Math.cos(a);
    return `<line x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}" stroke="#333" stroke-width="0.5"/>`;
  }).join('')}
  <circle cx="${r.dial.x}" cy="${r.dial.y}" r="${r.dial.r}" fill="url(#dial-{{uid}})" stroke="#222" stroke-width="0.6"/>
  <path d="M${r.dial.x} ${r.dial.y} L${r.dial.x - r.dial.r * 0.55} ${r.dial.y - r.dial.r * 0.55}" stroke="#f2f2f2" stroke-width="1.2" stroke-linecap="round"/>`
    : '';
  const cover =
    r.cover === 'clear'
      ? `${relayInner(r)}
  <rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="2" fill="url(#cover-{{uid}})" stroke="#8d9196" stroke-width="0.6"/>`
      : `<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" rx="2" fill="${r.cover}" stroke="#111" stroke-width="0.6"/>
  <rect x="${r.x + 1}" y="${r.y + 1}" width="${r.w - 2}" height="${r.h * 0.18}" rx="1.5" fill="#fff" opacity="0.08"/>`;

  const svg = `
  <defs>
    ${sideShade('sock', s.socketColor.edge, s.socketColor.mid)}
    <linearGradient id="cover-{{uid}}" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#dfe6ec" stop-opacity="0.55"/>
      <stop offset="0.5" stop-color="#ffffff" stop-opacity="0.25"/>
      <stop offset="1" stop-color="#cfd8e0" stop-opacity="0.55"/>
    </linearGradient>
    <radialGradient id="dial-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#6a6d72"/>
      <stop offset="1" stop-color="#1b1c1e"/>
    </radialGradient>
    ${SCREW_GRADIENT}
  </defs>

  <!-- 取付けタブ（上下） -->
  <rect x="${s.width / 2 - 8}" y="0" width="16" height="${s.socketTop + 2}" rx="2" fill="${s.socketColor.edge}"/>
  <circle cx="${s.width / 2}" cy="${s.socketTop / 2}" r="3.2" fill="#9aa0a6" stroke="#333" stroke-width="0.5"/>
  <rect x="${s.width / 2 - 8}" y="${s.socketBottom - 2}" width="16" height="${s.height - s.socketBottom + 2}" rx="2" fill="${s.socketColor.edge}"/>
  <circle cx="${s.width / 2}" cy="${(s.socketBottom + s.height) / 2}" r="3.2" fill="#9aa0a6" stroke="#333" stroke-width="0.5"/>

  <!-- ソケット本体 -->
  <rect x="0.5" y="${s.socketTop}" width="${s.width - 1}" height="${s.socketBottom - s.socketTop}" rx="2" fill="url(#sock-{{uid}})" stroke="#000" stroke-width="0.7"/>

  <!-- リレー（タイマー） -->
  ${cover}
  ${lines}
  ${dial}
  ${r.led ? `<circle cx="${r.led.x}" cy="${r.led.y}" r="2" fill="${r.led.color}" stroke="#5a1a00" stroke-width="0.4"/>` : ''}

  <!-- ネジ端子と端子番号 -->
  ${s.terminals.map((t) => screw(t.x, t.y, 4.2, s.seat)).join('')}
  ${s.terminals
    .map((t) => {
      const o = s.labelOffset(t);
      return text(t.x + o.dx, t.y + o.dy, t.print ?? t.id, 4, s.ink);
    })
    .join('')}
  <text x="4.5" y="${(s.socketTop + s.socketBottom) / 2}" text-anchor="middle" font-family="sans-serif" font-size="3.4" font-weight="bold" fill="${s.ink}" opacity="0.75" transform="rotate(-90 4.5 ${(s.socketTop + s.socketBottom) / 2})">${s.socketName}</text>
`;

  const terminals: TerminalDef[] = s.terminals.map((t) => {
    const base = { id: t.id, label: t.print ?? t.id, note: t.note, ...(t.hint ? { hint: t.hint } : {}), x: t.x, y: t.y, side: t.side };
    if (t.coil) {
      const conductors = t.coil === 'any' ? {} : { conductors: [t.coil] as ('+' | '-')[] };
      return { ...base, role: 'input' as const, accepts: { ...s.coil, ...conductors } };
    }
    return { ...base, role: 'signal' as const, optional: true };
  });

  return {
    type: s.type,
    name: s.name,
    model: s.model,
    maker: s.maker,
    category: 'contactor',
    description: s.description,
    labelPrefix: s.labelPrefix,
    width: s.width,
    height: s.height,
    svg,
    terminals,
    links: s.links,
    loadCurrent: s.loadCurrent,
    ...(s.estimated ? { estimated: s.estimated } : {}),
  };
}

/** c 接点 1 極分の内部経路（COM → NC は b 接点、COM → NO は a 接点） */
export const cContact = (com: string, nc: string, no: string): InternalLink[] => [
  { from: com, to: nc, switch: 'NC' },
  { from: com, to: no, switch: 'NO' },
];

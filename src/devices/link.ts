/**
 * リンク（シート間の接続記号）の機器定義を作る共通部品。
 * 電線用のリンク（generic.link）と、LAN ケーブル用のネットワークリンク（generic.network-link）で使う。
 *
 * 向きは横（既定）と縦がある。縦のリンクは上か下で電線をつなぎ、PLC の I/O のように上下に端子が並ぶ機器の下へ
 * 端子の並びのまま横に詰めて並べられる。
 */
import type { ConnectorSpec, DeviceDefinition, ParamValues, TerminalSide } from './types';

/** 横のリンクの大きさ（長さ × 太さ） */
const W = 110;
const H = 30;
/** 縦のリンクの大きさ（太さ × 長さ）。端子の下に横に詰めて並べられるよう細くする */
export const VERTICAL_LINK_WIDTH = 18;
const VH = 90;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * リンクの向きと、電線をつなぐ側。
 * side が上下なら縦、左右なら横。'auto'（相手の側）のときは orientation で決め、側は 縦なら下・横なら左にしておく
 * （画面ではアプリが相手の端子の位置から決め直す。src/editor/geometry.ts の linkSidesOf）
 */
export function linkShape(p: ParamValues | undefined): { vertical: boolean; side: TerminalSide } {
  const side = p?.side;
  if (side === 'top' || side === 'bottom') return { vertical: true, side };
  if (side === 'left' || side === 'right') return { vertical: false, side };
  const vertical = p?.orientation === 'vertical';
  return { vertical, side: vertical ? 'bottom' : 'left' };
}

/** リンクの向きを縦・横に切り替えたパラメータ（つなぐ側を決めてあれば、左 ↔ 上・右 ↔ 下に移す） */
export function withLinkOrientation(p: ParamValues | undefined, vertical: boolean): ParamValues {
  const side = p?.side;
  const swap: Record<string, string> = vertical ? { left: 'top', right: 'bottom' } : { top: 'left', bottom: 'right' };
  const next = typeof side === 'string' && swap[side] ? swap[side] : (side ?? 'auto');
  return { ...p, orientation: vertical ? 'vertical' : 'horizontal', side: next };
}

/** パラメータを 1 つ変えたリンクのパラメータ（向きとつなぐ側が食い違わないよう、もう一方も合わせる） */
export function withLinkParam(p: ParamValues | undefined, key: string, value: number | string): ParamValues {
  if (key === 'orientation') return withLinkOrientation(p, value === 'vertical');
  if (key === 'side' && (value === 'top' || value === 'bottom')) return { ...p, side: value, orientation: 'vertical' };
  if (key === 'side' && (value === 'left' || value === 'right')) return { ...p, side: value, orientation: 'horizontal' };
  return { ...p, [key]: value };
}

/** リンクの大きさ（縦・横） */
export const linkSize = (vertical: boolean) => (vertical ? { width: VERTICAL_LINK_WIDTH, height: VH } : { width: W, height: H });

interface LinkOptions {
  type: string;
  name: string;
  model: string;
  description: string;
  labelPrefix: string;
  /** 枠・文字・塗りの色 */
  stroke: string;
  text: string;
  fill: string;
  /** 名前の前に付ける記号（ネットワークなら 'LAN'） */
  badge?: string;
  /** 端子ID */
  terminal: string;
  /** コネクタ（ネットワークリンク）。省略時は電線をつなぐ中継端子 */
  connector?: ConnectorSpec;
  /** エアのポート（エアのリンク）。チューブをつなぐ */
  air?: boolean;
}

export function buildLink(o: LinkOptions): DeviceDefinition {
  /**
   * 横向きの絵（長さ len × 太さ th）。fromLeft なら左が電線をつなぐ側で平ら、右が矢印（飛び先）。
   * 縦のリンクは、この絵を左へ 90° 回して描く（文字は下から上へ読む）
   */
  const flag = (name: string, fromLeft: boolean, len: number, th: number) => {
    const k = th / H; // 横のリンクに対する太さの比
    const inset = 4 * k;
    const tip = 13 * Math.max(k, 0.7);
    const stub = 8 * Math.max(k, 0.7);
    const body = fromLeft
      ? `M ${stub} ${inset} H ${len - tip - 3} L ${len - 3} ${th / 2} L ${len - tip - 3} ${th - inset} H ${stub} Z`
      : `M ${len - stub} ${inset} H ${tip + 3} L 3 ${th / 2} L ${tip + 3} ${th - inset} H ${len - stub} Z`;
    const size = (name.length > 9 ? 10 : 12.5) * Math.max(k, 0.72);
    const badgeW = o.badge ? 24 * Math.max(k, 0.8) : 0;
    const badgeH = 12 * Math.max(k, 0.8);
    const cx = len / 2 + (fromLeft ? -2 : 2) + badgeW / 2;
    const bx = fromLeft ? stub + 4 : tip + 7;
    return `
  <path d="${body}" fill="${o.fill}" stroke="${o.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
  <line x1="${fromLeft ? 1 : len - stub}" y1="${th / 2}" x2="${fromLeft ? stub : len - 1}" y2="${th / 2}" stroke="${o.stroke}" stroke-width="1.6"/>
  ${o.badge ? `<rect x="${bx}" y="${th / 2 - badgeH / 2}" width="${badgeW - 2}" height="${badgeH}" rx="2" fill="${o.stroke}"/><text x="${bx + (badgeW - 2) / 2}" y="${th / 2 + badgeH * 0.27}" text-anchor="middle" font-family="sans-serif" font-size="${(8 * badgeH) / 12}" font-weight="bold" fill="#fff">${o.badge}</text>` : ''}
  <text x="${cx}" y="${th / 2 + size * 0.36}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${name ? o.text : '#94a3b8'}">${escape(name || '名前なし')}</text>`;
  };
  const svg = (p: ParamValues) => {
    const name = String(p.name ?? '').trim();
    const { vertical, side } = linkShape(p);
    if (!vertical) return flag(name, side !== 'right', W, H);
    // 下でつなぐ: 横の「左でつなぐ」絵を左へ回す（左端が下に来る）。上でつなぐ: 「右でつなぐ」絵を回す
    return `<g transform="translate(0 ${VH}) rotate(-90)">${flag(name, side === 'bottom', VH, VERTICAL_LINK_WIDTH)}</g>`;
  };
  return {
    type: o.type,
    name: o.name,
    model: o.model,
    category: 'link',
    description: o.description,
    labelPrefix: o.labelPrefix,
    width: W,
    height: H,
    size: (p) => linkSize(linkShape(p).vertical),
    svg,
    params: [
      { key: 'name', label: '名前', input: 'text', options: [], default: '' },
      {
        key: 'orientation',
        label: '向き',
        // 縦: 上下で電線をつなぐ細いリンク。PLC の I/O のように上下に端子が並ぶ機器の下へ横に並べるのに使う
        options: [
          { value: 'horizontal', label: '横' },
          { value: 'vertical', label: '縦' },
        ],
        default: 'horizontal',
      },
      {
        key: 'side',
        label: o.connector ? 'ケーブルをつなぐ側' : o.air ? 'チューブをつなぐ側' : '電線をつなぐ側',
        // 自動: つないだ相手の端子のある側に向ける（アプリが位置から決める。決まらなければ 横は左・縦は下）。
        // 上・下を選ぶと縦、左・右を選ぶと横のリンクになる
        options: [
          { value: 'auto', label: '自動（相手の側）' },
          { value: 'left', label: '左' },
          { value: 'right', label: '右' },
          { value: 'top', label: '上（縦）' },
          { value: 'bottom', label: '下（縦）' },
        ],
        default: 'auto',
      },
    ],
    terminals: (p) => {
      const { vertical, side } = linkShape(p);
      const base = vertical
        ? { id: o.terminal, label: '接続', x: VERTICAL_LINK_WIDTH / 2, y: side === 'top' ? 1 : VH - 1, side }
        : { id: o.terminal, label: '接続', x: side === 'right' ? W - 1 : 1, y: H / 2, side };
      if (o.air) return [{ ...base, role: 'air', air: { kind: 'work' } }];
      return [o.connector ? { ...base, role: 'connector', connector: o.connector } : { ...base, role: 'pass' }];
    },
    netLabel: { param: 'name', terminal: o.terminal },
  };
}

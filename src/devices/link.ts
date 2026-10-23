/**
 * リンク（シート間の接続記号）の機器定義を作る共通部品。
 * 電線用のリンク（generic.link）と、LAN ケーブル用のネットワークリンク（generic.network-link）で使う。
 */
import type { ConnectorSpec, DeviceDefinition, ParamValues } from './types';

const W = 110;
const H = 30;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

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
  const svg = (p: ParamValues) => {
    const name = String(p.name ?? '').trim();
    const fromLeft = p.side !== 'right';
    // 電線がつながる側を平らに、反対側を矢印（飛び先）にする
    const body = fromLeft
      ? `M 8 4 H ${W - 16} L ${W - 3} ${H / 2} L ${W - 16} ${H - 4} H 8 Z`
      : `M ${W - 8} 4 H 16 L 3 ${H / 2} L 16 ${H - 4} H ${W - 8} Z`;
    const size = name.length > 9 ? 10 : 12.5;
    const badgeW = o.badge ? 24 : 0;
    const cx = W / 2 + (fromLeft ? -2 : 2) + badgeW / 2;
    const bx = fromLeft ? 12 : 20;
    return `
  <path d="${body}" fill="${o.fill}" stroke="${o.stroke}" stroke-width="1.6" stroke-linejoin="round"/>
  <line x1="${fromLeft ? 1 : W - 8}" y1="${H / 2}" x2="${fromLeft ? 8 : W - 1}" y2="${H / 2}" stroke="${o.stroke}" stroke-width="1.6"/>
  ${o.badge ? `<rect x="${bx}" y="${H / 2 - 6}" width="${badgeW - 2}" height="12" rx="2" fill="${o.stroke}"/><text x="${bx + (badgeW - 2) / 2}" y="${H / 2 + 3.2}" text-anchor="middle" font-family="sans-serif" font-size="8" font-weight="bold" fill="#fff">${o.badge}</text>` : ''}
  <text x="${cx}" y="${H / 2 + size * 0.36}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${name ? o.text : '#94a3b8'}">${escape(name || '名前なし')}</text>`;
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
    svg,
    params: [
      { key: 'name', label: '名前', input: 'text', options: [], default: '' },
      {
        key: 'side',
        label: o.connector ? 'ケーブルをつなぐ側' : o.air ? 'チューブをつなぐ側' : '電線をつなぐ側',
        // 自動: つないだ相手の端子のある側に向ける（アプリが位置から left / right に決める。決まらなければ左）
        options: [
          { value: 'auto', label: '自動（相手の側）' },
          { value: 'left', label: '左' },
          { value: 'right', label: '右' },
        ],
        default: 'auto',
      },
    ],
    terminals: (p) => {
      const right = p.side === 'right';
      const base = { id: o.terminal, label: '接続', x: right ? W - 1 : 1, y: H / 2, side: right ? ('right' as const) : ('left' as const) };
      if (o.air) return [{ ...base, role: 'air', air: { kind: 'work' } }];
      return [o.connector ? { ...base, role: 'connector', connector: o.connector } : { ...base, role: 'pass' }];
    },
    netLabel: { param: 'name', terminal: o.terminal },
  };
}

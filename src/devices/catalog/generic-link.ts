import type { DeviceDefinition, ParamValues } from '../types';

/**
 * リンク（シート間の接続記号）。
 * 実際の配線図で「→ 2-3」のように他のページへ電線を飛ばす記号にあたる。
 * 名前（params.name）が同じリンクどうしは電気的につながる。同じシートの中で使ってもよい。
 */

const W = 110;
const H = 30;

const escape = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const svg = (p: ParamValues) => {
  const name = String(p.name ?? '').trim();
  const fromLeft = p.side !== 'right';
  // 電線がつながる側を平らに、反対側を矢印（飛び先）にする
  const body = fromLeft
    ? `M 8 4 H ${W - 16} L ${W - 3} ${H / 2} L ${W - 16} ${H - 4} H 8 Z`
    : `M ${W - 8} 4 H 16 L 3 ${H / 2} L 16 ${H - 4} H ${W - 8} Z`;
  const size = name.length > 9 ? 10 : 12.5;
  return `
  <path d="${body}" fill="#eef6ff" stroke="#2563eb" stroke-width="1.6" stroke-linejoin="round"/>
  <line x1="${fromLeft ? 1 : W - 8}" y1="${H / 2}" x2="${fromLeft ? 8 : W - 1}" y2="${H / 2}" stroke="#2563eb" stroke-width="1.6"/>
  <text x="${W / 2 + (fromLeft ? -2 : 2)}" y="${H / 2 + size * 0.36}" text-anchor="middle" font-family="sans-serif" font-size="${size}" font-weight="bold" fill="${name ? '#1e3a8a' : '#94a3b8'}">${escape(name || '名前なし')}</text>`;
};

const def: DeviceDefinition = {
  type: 'generic.link',
  name: 'リンク',
  model: 'シート間の接続',
  category: 'link',
  description:
    '他のシート（または同じシートの離れた場所）へ電線を飛ばす記号。名前が同じリンクどうしがつながる（例: +24V、0V、R1）。回路の意味ごとにシートを分けるときに、電源などを渡すのに使う。',
  labelPrefix: 'LK',
  width: W,
  height: H,
  svg,
  params: [
    { key: 'name', label: '名前', input: 'text', options: [], default: '' },
    {
      key: 'side',
      label: '電線をつなぐ側',
      // 自動: つないだ相手の端子のある側に向ける（アプリが位置から left / right に決める。決まらなければ左）
      options: [
        { value: 'auto', label: '自動（相手の側）' },
        { value: 'left', label: '左' },
        { value: 'right', label: '右' },
      ],
      default: 'auto',
    },
  ],
  terminals: (p) => [
    p.side === 'right'
      ? { id: 'T', label: '接続', x: W - 1, y: H / 2, side: 'right', role: 'pass' }
      : { id: 'T', label: '接続', x: 1, y: H / 2, side: 'left', role: 'pass' },
  ],
  netLabel: { param: 'name', terminal: 'T' },
};

export default def;

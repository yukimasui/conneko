import { buildLink } from '../link';

/**
 * リンク（シート間の接続記号）。
 * 実際の配線図で「→ 2-3」のように他のページへ電線を飛ばす記号にあたる。
 * 名前（params.name）が同じリンクどうしは電気的につながる。同じシートの中で使ってもよい。
 */
export default buildLink({
  type: 'generic.link',
  name: 'リンク',
  model: 'シート間の接続',
  description:
    '他のシート（または同じシートの離れた場所）へ電線を飛ばす記号。名前が同じリンクどうしがつながる（例: +24V、0V、R1）。回路の意味ごとにシートを分けるときに、電源などを渡すのに使う。',
  labelPrefix: 'LK',
  stroke: '#2563eb',
  text: '#1e3a8a',
  fill: '#eef6ff',
  terminal: 'T',
});

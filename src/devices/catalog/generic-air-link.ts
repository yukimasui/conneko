import { buildLink } from '../link';

/**
 * エアのリンク（シート間のエア配管の接続記号）。
 * 名前（params.name）が同じエアのリンクどうしは、チューブでつながっているとみなす。電気のリンクとは名前の空間が別。
 */
export default buildLink({
  type: 'generic.air-link',
  name: 'エアのリンク',
  model: 'シート間のエア配管',
  description:
    '他のシート（または同じシートの離れた場所）へエア配管を飛ばす記号。名前が同じエアのリンクどうしがつながる（例: 主管、SUP）。エア源と各装置の回路を別のシートに分けるときに使う。',
  labelPrefix: 'AL',
  stroke: '#0e7490',
  text: '#0b4f61',
  fill: '#e6f7fb',
  badge: 'AIR',
  terminal: 'T',
  air: true,
});

import { buildLink } from '../link';

/**
 * ネットワークリンク（LAN ケーブルを他のシートへ飛ばす記号）。
 * 名前（params.name）が同じネットワークリンクに LAN ケーブルでつないだ機器どうしは、同じネットワークにつながっているとみなす
 * （スイッチングハブでまとめた Ethernet のネットワークのように、何台つないでもよい）。
 * 電線用のリンクとは名前の空間が別（同じ名前でもつながらない）。
 */
export default buildLink({
  type: 'generic.network-link',
  name: 'ネットワークリンク',
  model: 'LAN の接続',
  description:
    'LAN ケーブルを他のシート（または離れた場所）へ飛ばす記号。名前が同じネットワークリンクに LAN ケーブルでつないだ機器どうしが、同じネットワークにつながる（例: 制御LAN、EtherCAT1）。通信方式（Ethernet / EtherCAT など）が合わない機器が同じネットワークにあると警告する。',
  labelPrefix: 'NL',
  stroke: '#059669',
  text: '#065f46',
  fill: '#ecfdf5',
  badge: 'LAN',
  terminal: 'LAN',
  connector: { kind: 'RJ45', pins: 0, width: 20, style: 'lan' },
});

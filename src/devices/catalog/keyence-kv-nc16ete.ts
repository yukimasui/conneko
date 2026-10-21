import { buildNc16E } from '../keyence/kv-nc';

/**
 * KEYENCE 拡張出力ユニット KV-NC16ETE（16点、MOSFET シンク出力、ヨーロピアン端子台＝プッシュイン式）。
 * KV-X シリーズの EtherCAT カプラ KV-EC01（リモート I/O）や KV Nano シリーズ CPU に連結する。
 *
 * 端子（KEYENCE 入出力回路図より）: 端子台が上下 2 個（各 16 極、左列が奇数ピン、右列が偶数ピン）。
 * 各段の左列が出力（上の端子台 000〜007、下の端子台 008〜015）、右列がすべて COM0（内部で全て短絡、負荷電源の 0V）。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc16ete/io-circuit/
 */

const rows = Array.from({ length: 16 }, (_, i) => {
  const pin = (i % 8) * 2 + 1;
  const blk = i < 8 ? '上' : '下';
  return {
    left: { id: String(i), label: `OUT ${String(i).padStart(3, '0')}（${blk}端子台 No.${pin}）`, kind: 'out' as const },
    right: { id: `C${i}`, label: `COM0 0V（${blk}端子台 No.${pin + 1}）`, kind: 'com-sink' as const },
    num: String(i),
  };
});

export default buildNc16E({
  type: 'keyence.kv-nc16ete',
  model: 'KV-NC16ETE',
  name: 'PLC 拡張出力ユニット',
  labelPrefix: 'OUT',
  description:
    'KEYENCE の 16点 トランジスタ出力ユニット（MOSFET シンク出力・過電流保護付き、DC30V 0.2A/点、ヨーロピアン端子台＝プッシュイン式）。KV-X シリーズの EtherCAT カプラ KV-EC01 に連結するリモート I/O、または KV Nano シリーズの増設として使う。各段が「出力 + COM」のペアで、COM0 は全端子が内部で短絡し負荷電源の 0V をつなぐ（負荷のもう一端は +24V）。過電流を検出すると 000〜007 または 008〜015 がまとめて OFF する。端子ID は出力が信号番号 0〜15、その隣の COM が C0〜C15。図面上は出力 ON（出力と COM が導通）とみなしてチェックする。',
  head: ['OUT', 'COM'],
  rows,
  links: [...rows.slice(1).map((r) => ({ from: 'C0', to: r.right.id })), ...rows.map((r) => ({ from: r.left.id, to: 'C0' }))],
});

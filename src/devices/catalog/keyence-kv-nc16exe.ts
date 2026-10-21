import { buildNc16E } from '../keyence/kv-nc';

/**
 * KEYENCE 拡張入力ユニット KV-NC16EXE（16点、DC24V/DC5V、ヨーロピアン端子台＝プッシュイン式）。
 * KV-X シリーズの EtherCAT カプラ KV-EC01（リモート I/O）や KV Nano シリーズ CPU に連結する。
 *
 * 端子（KEYENCE 入出力回路図より）: 端子台が上下 2 個（各 16 極、左列が奇数ピン、右列が偶数ピン）。
 * 各段の左列が入力（上の端子台 000〜007、下の端子台 008〜015）、右列がすべて COM0（内部で全て短絡）。
 * 2線式・3線式センサの COM を各段で取れる。端子ID は入力が信号番号（'0'〜'15'）、その段の COM が 'C0'〜'C15'。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-x/models/kv-nc16exe/io-circuit/
 */

const rows = Array.from({ length: 16 }, (_, i) => {
  const pin = (i % 8) * 2 + 1;
  const blk = i < 8 ? '上' : '下';
  return {
    left: { id: String(i), label: `IN ${String(i).padStart(3, '0')}（${blk}端子台 No.${pin}）`, kind: 'in' as const },
    right: { id: `C${i}`, label: `COM0（${blk}端子台 No.${pin + 1}）`, kind: 'com-in' as const },
    num: String(i),
  };
});

export default buildNc16E({
  type: 'keyence.kv-nc16exe',
  model: 'KV-NC16EXE',
  name: 'PLC 拡張入力ユニット',
  labelPrefix: 'IN',
  description:
    'KEYENCE の 16点 DC 入力ユニット（ヨーロピアン端子台＝プッシュイン式、DC24V/DC5V モード、24V で 5.2mA）。KV-X シリーズの EtherCAT カプラ KV-EC01 に連結するリモート I/O、または KV Nano シリーズの増設として使う。各段が「入力 + COM」のペアになっていて、COM0 は全端子が内部で短絡（双方向入力のためプラス/マイナスどちらのコモンでもよい）。端子ID は入力が信号番号 0〜15、その隣の COM が C0〜C15。信号名はユニットの先頭リレー番号からの相対番号。内部消費電流 20mA。',
  head: ['IN', 'COM'],
  rows,
  links: rows.slice(1).map((r) => ({ from: 'C0', to: r.right.id })),
});

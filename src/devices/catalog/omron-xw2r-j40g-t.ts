import { buildXw2r } from '../omron/xw2r';

/**
 * オムロン コネクタ端子台変換ユニット XW2R-J40G-T（汎用タイプ、プラススクリュー、MIL 40 極）。作りは src/devices/omron/xw2r.ts。
 * MIL 40 極のコネクタの I/O ユニット（オムロン CJ・KEYENCE KV の 32 点ユニットの一部など）と組み合わせる。
 */
export default buildXw2r({
  type: 'omron.xw2r-j40g-t',
  modelName: 'XW2R-J40G-T',
  poles: 40,
  lengthMm: 151.7,
  description:
    'オムロンのコネクタ端子台変換ユニット XW2R-J40G-T（汎用タイプ、MIL 40 極、M3 プラススクリュー、端子間ピッチ 7mm）。' +
    'PLC の I/O ユニットなどの MIL 40 極コネクタとケーブルでつなぎ、コネクタのピン n をネジ端子 n に出す。端子 1 点あたり 1A（AC125V / DC24V）。',
  estimated: 'ネジ端子の番号と並び（コネクタのピン番号と同じ 1〜40、奥段が奇数・手前段が偶数）、外形（長さ 151.7mm・奥行 48mm。34 極品から 3 ピッチ分長いとした）、コネクタの位置は推定。',
});

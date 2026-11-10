import { buildXw2r } from '../omron/xw2r';

/**
 * オムロン コネクタ端子台変換ユニット XW2R-J34G-T（汎用タイプ、プラススクリュー、MIL 34 極）。作りは src/devices/omron/xw2r.ts。
 * KEYENCE KV-C32XC / KV-C32TC などの MIL 34 極のコネクタと組み合わせる。
 */
export default buildXw2r({
  type: 'omron.xw2r-j34g-t',
  modelName: 'XW2R-J34G-T',
  poles: 34,
  lengthMm: 130.7,
  description:
    'オムロンのコネクタ端子台変換ユニット XW2R-J34G-T（汎用タイプ、MIL 34 極、M3 プラススクリュー、端子間ピッチ 7mm）。' +
    'PLC の I/O ユニット（KEYENCE KV-C32XC / KV-C32TC など）の MIL 34 極コネクタとケーブルでつなぎ、コネクタのピン n をネジ端子 n に出す。端子 1 点あたり 1A（AC125V / DC24V）。',
  estimated: 'ネジ端子の番号と並び（コネクタのピン番号と同じ 1〜34、奥段が奇数・手前段が偶数）、外形（長さ 130.7mm は DIN レール取付品 XW2R-J34GD-T の寸法、奥行 48mm）、コネクタの位置は推定。',
});

import { buildXw2r } from '../omron/xw2r';

/**
 * オムロン コネクタ端子台変換ユニット XW2R-J20GD-T（汎用タイプ、プラススクリュー、MIL 20 極 XG4A）。作りは src/devices/omron/xw2r.ts。
 * 三菱電機 FX5UC の入出力コネクタ・オムロン G7TC などの MIL 20 極のコネクタと組み合わせる。
 * 出典: オムロン XW2R-J20GD-T 製品ページ（MIL タイプ XG4A 20 極を実装、1A、AC125V / DC24V）。
 */
export default buildXw2r({
  type: 'omron.xw2r-j20gd-t',
  modelName: 'XW2R-J20GD-T',
  poles: 20,
  lengthMm: 85,
  description:
    'オムロンのコネクタ端子台変換ユニット XW2R-J20GD-T（汎用タイプ、MIL 20 極、M3 プラススクリュー、端子間ピッチ 7mm）。' +
    'PLC の I/O ユニット（三菱電機 FX5UC の入出力コネクタなど）の MIL 20 極コネクタとケーブルでつなぎ、コネクタのピン n をネジ端子 n に出す。端子 1 点あたり 1A（AC125V / DC24V）。',
  estimated: 'ネジ端子の番号と並び（コネクタのピン番号と同じ 1〜20、奥段が奇数・手前段が偶数）、外形（長さ 85mm・奥行 48mm）、コネクタの位置は推定。',
});

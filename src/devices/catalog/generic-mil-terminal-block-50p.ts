import type { DeviceDefinition } from '../types';
import { buildMilTerminalBlock } from './generic-mil-terminal-block-40p';

/**
 * MIL 50極コネクタ付き 変換端子台（汎用品・DINレール取付）。
 * IAI XSEL の PIO ボード（50 極 MIL フラットコネクター）などと、市販の 50 芯 MIL フラットケーブルで組み合わせる。
 * 外形はおよそ 長さ160 × 奥行45mm（1mm ≒ 2px）。奥側に MIL オスコネクタ（2.54mm ピッチ 2列×25）、
 * 手前に M3 ネジ端子が 2段の千鳥配置（ピッチ 5.08mm）で並ぶ。
 *
 * ピン番号は MIL 規格の標準的な千鳥番号（▲マーク側の端が 1・2、奥列が偶数、手前列が奇数）。
 * ネジ端子も同じ番号で、コネクタのピン n とネジ端子 n が導通する。見た目・端子の作り方は 40P 版と共通（buildMilTerminalBlock）。
 */

const def: DeviceDefinition = buildMilTerminalBlock({
  poles: 50,
  lengthMm: 160,
  type: 'generic.mil-terminal-block.50p',
});

export default def;

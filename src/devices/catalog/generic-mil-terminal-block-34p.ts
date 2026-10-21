import type { DeviceDefinition } from '../types';
import { buildMilTerminalBlock } from './generic-mil-terminal-block-40p';

/**
 * MIL 34極コネクタ付き 変換端子台（汎用品・DINレール取付）。
 * KEYENCE KV-C32XC / KV-C32TC などの MIL 34極コネクタの I/O ユニットと組み合わせる。
 * 外形はおよそ 長さ112.5 × 奥行45mm（1mm ≒ 2px）。奥側に MIL オスコネクタ（2.54mm ピッチ 2列×17）、
 * 手前に M3 ネジ端子が 2段の千鳥配置（ピッチ 5.08mm）で並ぶ。
 *
 * ピン番号は MIL 規格の標準的な千鳥番号（▲マーク側の端が 1・2、奥列が偶数 2,4…34、手前列が奇数 1,3…33）。
 * ネジ端子も同じ番号で、奥段が奇数 1〜33、手前段が偶数 2〜34。コネクタのピン n とネジ端子 n が導通する。
 * 見た目・端子の作り方は 40P 版と共通（buildMilTerminalBlock）。
 */

const def: DeviceDefinition = buildMilTerminalBlock({
  poles: 34,
  lengthMm: 112.5,
  type: 'generic.mil-terminal-block.34p',
});

export default def;

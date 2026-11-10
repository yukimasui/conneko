import type { DeviceDefinition } from '../types';
import { buildMilTerminalBlock } from './generic-mil-terminal-block-40p';

/**
 * MIL 26極コネクタ付き 変換端子台（汎用品・DINレール取付）。
 * SMC のプラグイン形マニホールド（VV5QC11 の P キット、フラットケーブル 26 ピン）などと、市販の 26 芯 MIL フラットケーブルで組み合わせる。
 * 外形はおよそ 長さ92 × 奥行45mm（1mm ≒ 2px。長さは 34 極・40 極の品からの推定）。奥側に MIL オスコネクタ（2.54mm ピッチ 2列×13）、
 * 手前に M3 ネジ端子が 2段の千鳥配置で並ぶ。ピン番号・ネジ端子の番号は 40P 版と同じ千鳥番号（buildMilTerminalBlock）。
 */

const def: DeviceDefinition = {
  ...buildMilTerminalBlock({ poles: 26, lengthMm: 92, type: 'generic.mil-terminal-block.26p' }),
  estimated: '外形の長さ（92mm）は 34 極・40 極の品からの推定',
};

export default def;

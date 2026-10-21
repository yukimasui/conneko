import { buildRoundCable } from './generic-m12-4p-cable';

/**
 * センサー用コネクタケーブル（片側コネクタ・片側バラ線、汎用品）。M8 4 ピン、ストレート型のメス。
 * 芯線はピン 1 茶・2 白・3 青・4 黒。見た目・端子は generic-m12-4p-cable.ts の buildRoundCable を参照。
 */

export default buildRoundCable('M8');

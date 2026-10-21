import { buildMilStandard } from '../toyogiken/standard';

/**
 * 東洋技研 PCV5-1□202（標準品 1:1、MIL 20極）。搭載コネクタ（H / T / J）はパラメータで選ぶ。
 * 見た目・端子の作り方は src/devices/toyogiken/connector-block.ts、端子の並びは rows.ts を参照。
 */
export default buildMilStandard('pcv5', 20);

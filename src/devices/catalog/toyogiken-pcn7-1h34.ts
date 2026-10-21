import { buildMilStandard } from '../toyogiken/standard';

/**
 * 東洋技研 PCN7-1□34（標準品 1:1、MIL 34極）。搭載コネクタ（H / T / J）はパラメータで選ぶ。
 * 見た目・端子の作り方は src/devices/toyogiken/connector-block.ts、端子の並びは rows.ts を参照。
 */
export default buildMilStandard('pcn7', 34);

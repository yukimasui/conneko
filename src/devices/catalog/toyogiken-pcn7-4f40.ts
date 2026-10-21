import { buildFcnStandard } from '../toyogiken/standard';

/**
 * 東洋技研 PCN7-4F40（標準品 1:1、FCN 40極）。三菱電機の 40 ピンコネクタの I/O ユニットと FCN⇔FCN ケーブルでつなぐ。
 * 見た目・端子の作り方は src/devices/toyogiken/connector-block.ts、端子の並びは rows.ts を参照。
 */
export default buildFcnStandard('pcn7');

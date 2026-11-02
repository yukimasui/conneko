import { buildFujiSc } from '../fuji/sc';

/**
 * 富士電機 電磁接触器 SC-05（新SC・NEO SC、操作コイル AC200V、補助接点 1a1b）。
 * 出典: 販売店の仕様表（AC-3 200〜240V 13A・2.7kW、外形 幅 53 × 高さ 81mm、1a1b）、富士電機 SC-05 新旧製品比較。
 */
export default buildFujiSc({
  type: 'fuji.sc-05.ac200v',
  modelName: 'SC-05',
  widthMm: 53,
  heightMm: 81,
  ratedCurrent: 13,
  motorKw: 2.7,
  coilVA: 7,
  description:
    '富士電機の電磁接触器 SC-05（AC-3 200〜240V 13A / 2.7kW、補助接点 1a1b）。操作コイル A1-A2 に AC200V を加えると主接点 3 極と 13-14（a 接点）が閉じ、21-22（b 接点）が開く。',
  estimated: '端子の並び（上段 A1・1/L1・3/L2・5/L3・13・21、下段 A2・2/T1・4/T2・6/T3・14・22）と補助接点の番号、コイルの保持の消費（7VA）は推定。',
});

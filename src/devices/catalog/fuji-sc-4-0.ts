import { buildFujiSc } from '../fuji/sc';

/**
 * 富士電機 電磁接触器 SC-4-0（新SC・NEO SC、操作コイル AC200V、補助接点 1a1b）。
 * 出典: 富士電機の製品ページ（AC-3 200〜240V 18A・3.7kW、補助接点 1NO/1NC）。
 * 外形は同じ質量（0.36kg）の SC-4-1（53 × 81mm、保持 9VA。販売店の仕様表）と同じとした（推定）。
 */
export default buildFujiSc({
  type: 'fuji.sc-4-0.ac200v',
  modelName: 'SC-4-0',
  widthMm: 53,
  heightMm: 81,
  ratedCurrent: 18,
  motorKw: 3.7,
  coilVA: 9,
  description:
    '富士電機の電磁接触器 SC-4-0（AC-3 200〜240V 18A / 3.7kW、補助接点 1a1b）。操作コイル A1-A2 に AC200V を加えると主接点 3 極と 13-14（a 接点）が閉じ、21-22（b 接点）が開く。',
  estimated: '外形（SC-4-1 と同じ 53 × 81mm とした）、コイルの保持の消費（SC-4-1 の 9VA とした）、端子の並びと補助接点の番号は推定。',
});

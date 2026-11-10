import { FUJI_TR_RANGES_13, buildFujiTr } from '../fuji/tr';

/**
 * 富士電機 標準形サーマルリレー TR-0N/3（3 素子、新SC・NEO SC の SC-03・SC-0・SC-05 用）。作りは src/devices/fuji/tr.ts。
 * 出典: 富士電機 TR-0N/3 製品ページ（電磁開閉器構成用 3 素子サーマルリレー、単体の定格電流値 0.1〜13A、取付可能な電磁接触器 SC-03・SC-0・SC-05）、
 * 販売店の仕様表（整定範囲 0.1-0.15A … 7-11A、SC-0・SC-05 と組み合わせる 9-13A。補助接点 1a1b、AC600V）。
 */
export default buildFujiTr({
  type: 'fuji.tr-0n3',
  modelName: 'TR-0N/3',
  widthMm: 44,
  heightMm: 64,
  ranges: FUJI_TR_RANGES_13,
  defaultMax: 11,
  contactors: 'SC-03・SC-0・SC-05',
  description:
    '富士電機の標準形サーマルリレー TR-0N/3（3 素子）。電磁接触器 SC-03・SC-0・SC-05 の二次側に直結し、モーターの過負荷で補助接点 95-96（b 接点）を開き、97-98（a 接点）を閉じる。' +
    '整定電流の範囲（0.1〜0.15A から 9〜13A まで）をモーターの定格電流に合わせて選ぶ（9〜13A は SC-0・SC-05 と組み合わせる）。',
  estimated:
    '外形（幅 44 × 高さ 64mm）と端子の位置、補助接点の端子番号（95-96・97-98。TK-E2・三菱電機 TH-T18 と同じ並びとした）、整定範囲の一部（0.2〜0.3A・0.3〜0.45A・0.36〜0.54A・2.8〜4.2A。富士電機の標準のヒーター呼びとした）は推定。',
});

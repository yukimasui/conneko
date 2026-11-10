import { FUJI_TR_RANGES_13, buildFujiTr } from '../fuji/tr';

/**
 * 富士電機 標準形サーマルリレー TR-5-1N/3（3 素子、新SC・NEO SC の SC-4-0・SC-4-1・SC-5-1 用）。作りは src/devices/fuji/tr.ts。
 * 出典: 富士電機 TR シリーズのカタログ（ヒーター呼びの表 A: 0.1〜0.15A、B: 0.13〜0.2A …。TR-0N/3 と同じ表）、
 * 販売店の仕様表（TR-5-1N/3 12-18A・16-22A、適用する接触器 SC-4-0・SC-4-1・SC-5-1、幅 53 × 高さ 60.5 × 奥行 80mm、約 120g、補助接点 1a1b）。
 */
export default buildFujiTr({
  type: 'fuji.tr-5-1n3',
  modelName: 'TR-5-1N/3',
  widthMm: 53,
  heightMm: 60.5,
  ranges: [...FUJI_TR_RANGES_13, [12, 18], [16, 22]],
  defaultMax: 18,
  contactors: 'SC-4-0・SC-4-1・SC-5-1',
  description:
    '富士電機の標準形サーマルリレー TR-5-1N/3（3 素子）。電磁接触器 SC-4-0・SC-4-1・SC-5-1 の二次側に直結し、モーターの過負荷で補助接点 95-96（b 接点）を開き、97-98（a 接点）を閉じる。' +
    '整定電流の範囲（0.1〜0.15A から 16〜22A まで）をモーターの定格電流に合わせて選ぶ。',
  estimated:
    '端子の位置と補助接点の端子番号（95-96・97-98。TK-E2・三菱電機 TH-T18 と同じ並びとした）、整定範囲の一部（0.2〜0.3A・0.3〜0.45A・0.36〜0.54A・2.8〜4.2A。富士電機の標準のヒーター呼びとした）は推定。',
});

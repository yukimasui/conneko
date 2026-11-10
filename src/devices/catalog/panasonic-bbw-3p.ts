import { buildPanaBreaker } from '../panasonic/bbw';

/**
 * パナソニック サーキットブレーカ BBW 型 3P3E（盤用・表面形、定格電流 10〜50A をパラメータで選ぶ）。作りは src/devices/panasonic/bbw.ts。
 * 出典: パナソニック 品番詳細 BBW350（BBW-50 型 3P3E 50A、外形 H96 × W70 × D52mm）、販売店の掲載（BBW-50 型 50AF、定格遮断容量 AC100・200V 2.5kA）。
 */
export default buildPanaBreaker({
  type: 'panasonic.bbw.3p',
  description:
    'パナソニックの盤用サーキットブレーカ（配線用遮断器）BBW 型 3P3E。分電盤・制御盤の分岐や主幹に使う。上側が電源側（1/3/5）、下側が負荷側（2/4/6）。' +
    '定格電流 10〜50A（30A までは 30AF、40・50A は 50AF）。',
  estimated: '極間ピッチ（22mm）と主端子ネジの位置、端子の記号（1/3/5・2/4/6）、10〜40A の品番（BBW310〜BBW340）とフレームの区分、外形（BBW-50 型 50A の値を全定格に使った）は推定。',
});

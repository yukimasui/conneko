import { buildPanaBreaker } from '../panasonic/bbw';

/**
 * パナソニック 漏電ブレーカ BJW 型 3P3E O.C 付（モータ保護兼用、定格感度電流 30mA、定格電流 10〜50A をパラメータで選ぶ）。作りは src/devices/panasonic/bbw.ts。
 * 出典: パナソニック 品番詳細 BJW3503（BJW-50 型 3P3E 50A 30mA、外形 H96（端子カバーを含む 106）× W70 × D52mm、端子ねじ M5・締付トルク 2.0〜2.5N・m）、
 * BJW3203（BJW-30 型 3P3E 20A 30mA、同じ外形）。
 */
export default buildPanaBreaker({
  type: 'panasonic.bjw.3p',
  earthLeakage: true,
  description:
    'パナソニックの漏電ブレーカ BJW 型 3P3E O.C 付（モータ保護兼用、定格感度電流 30mA）。漏電・過電流で 3 極を切り、前面の表示で漏電か過電流かが分かる。' +
    '上側が電源側（1/3/5）、下側が負荷側（2/4/6）。定格電流 10〜50A（30A までは BJW-30 型、40・50A は BJW-50 型）。',
  estimated: '極間ピッチ（22mm）と主端子ネジの位置、端子の記号（1/3/5・2/4/6）、10・15・30・40A の品番（BJW3103 など）とフレームの区分は推定。',
});

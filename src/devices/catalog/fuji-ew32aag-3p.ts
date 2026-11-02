import { buildGTwin } from '../fuji/g-twin';

/**
 * 富士電機 漏電遮断器 EW32AAG-3P（G-TWIN シリーズ 一般配線用 32AF、3 極、表面形）。
 * 出典: 富士電機の EW32AAG-3P□4B 新旧比較、販売店の仕様表（外形 75 × 100 × 84mm、定格感度電流 15・30・100mA）。
 */
export default buildGTwin({
  type: 'fuji.ew32aag.3p',
  modelName: 'EW32AAG-3P',
  earthLeakage: true,
  ratings: [5, 10, 15, 20, 30, 32],
  defaultRating: 20,
  sensitivity: [
    { value: 15, label: '15mA' },
    { value: 30, label: '30mA' },
    { value: 100, label: '100mA' },
  ],
  defaultSensitivity: 30,
  description:
    '富士電機の漏電遮断器 EW32AAG-3P（G-TWIN シリーズ 32AF・3 極 3 素子）。過電流・短絡に加えて地絡（漏電）を検出して遮断する。上が電源側（1・3・5）、下が負荷側（2・4・6）。前面にテストボタンと漏電表示。',
  estimated: '極間ピッチ 25mm と主端子ネジの位置（上下の端から 9mm）は推定。',
});

import { buildG3pe } from '../generic/omron-g3pe';

/** オムロン ヒーター用ソリッドステート・コンタクタ G3PE 単相（G3PE-215B / 225B / 235B / 245B DC12-24）。幅は推定 */
export default buildG3pe({ phases: 1, widthMm: { 15: 22.5, 25: 27, 35: 44.5, 45: 44.5 } });

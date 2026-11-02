import { buildG3pe } from '../generic/omron-g3pe';

/** オムロン ヒーター用ソリッドステート・コンタクタ G3PE 三相（G3PE-215B-3N / 225B-3N / 235B-3N / 245B-3N DC12-24）。幅は推定 */
export default buildG3pe({ phases: 3, widthMm: { 15: 77, 25: 77, 35: 110, 45: 110 } });

import { buildPsa24 } from '../iai/psa24';

/** IAI DC24V 電源 PSA-24L（ファン付き、連続 13.8A）。作りは iai/psa24.ts（出典: 総合カタログ CJ9005「PSA-24」、取扱説明書 MJ0379） */
export default buildPsa24(true);

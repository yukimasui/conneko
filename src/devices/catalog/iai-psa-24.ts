import { buildPsa24 } from '../iai/psa24';

/** IAI DC24V 電源 PSA-24（ファンなし、連続 8.5A）。作りは iai/psa24.ts（出典: 総合カタログ CJ9005「PSA-24」、取扱説明書 MJ0379） */
export default buildPsa24(false);

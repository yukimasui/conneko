import { buildSrT5 } from './mitsubishi-sr-t5-4a1b';

/**
 * 三菱電機 電磁継電器（コンタクタリレー）SR-T5 5a（操作コイル AC200V）。
 * 端子番号は上段 13 23 33 43 53、下段 14 24 34 44 54（カタログ L(NA)02030ENG-K p.35）。
 */
export default buildSrT5('5a');

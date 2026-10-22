import { buildSrT5 } from './mitsubishi-sr-t5-4a1b';

/**
 * 三菱電機 電磁継電器（コンタクタリレー）SR-T5 3a2b（操作コイル AC200V）。
 * 端子番号は上段 11 23 33 43 51、下段 12 24 34 44 52（11-12・51-52 が b 接点。カタログ L(NA)02030ENG-K p.35）。
 */
export default buildSrT5('3a2b');

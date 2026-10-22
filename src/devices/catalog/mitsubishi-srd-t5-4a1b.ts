import { buildSrT5 } from './mitsubishi-sr-t5-4a1b';

/**
 * 三菱電機 直流操作形電磁継電器（コンタクタリレー）SRD-T5 4a1b（操作コイル DC24V 2.2W、極性あり）。
 * 正面の端子配列は SR-T5 と同じ（上段 13 23 33 43 51、下段 14 24 34 44 52。カタログ L(NA)02030ENG-K p.35・p.69）。
 * コイル消費電力が小さく、PLC の DC24V トランジスタ出力で直接駆動できる。
 */
export default buildSrT5('4a1b', 'DC24V');

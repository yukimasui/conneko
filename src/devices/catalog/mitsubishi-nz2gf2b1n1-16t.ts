import { buildNz2gf } from '../mitsubishi/nz2gf';

/** 三菱電機 CC-Link IE フィールド リモート I/O NZ2GF2B1N1-16T（トランジスタ出力 16 点、シンク）。見た目・端子は src/devices/mitsubishi/nz2gf.ts を参照 */
export default buildNz2gf({ kind: 'output' });

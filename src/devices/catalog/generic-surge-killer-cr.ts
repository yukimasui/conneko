import { buildSurgeKiller } from '../generic/surge-killer';

/** CR 形のサージキラー（汎用品、0.5μF + 120Ω、AC/DC 250V。コイルに並列） */
export default buildSurgeKiller('cr');

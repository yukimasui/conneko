import { buildSurgeKiller } from '../generic/surge-killer';

/** ダイオード形のサージキラー（汎用品、DC コイル専用。カソードをコイルの + 側へ） */
export default buildSurgeKiller('diode');

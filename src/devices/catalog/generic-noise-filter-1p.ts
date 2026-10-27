import { buildNoiseFilter } from '../generic/noise-filter';

/** 単相ノイズフィルタ（AC250V、端子台形。汎用品。作りは src/devices/generic/noise-filter.ts） */
export default buildNoiseFilter({
  phases: 1,
  lines: ['L', 'N'],
  ratedVoltage: 250,
  ratings: [3, 6, 10, 20, 30],
  defaultRating: 10,
  width: 96,
});

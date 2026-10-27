import { buildNoiseFilter } from '../generic/noise-filter';

/** 三相ノイズフィルタ（AC500V、端子台形。汎用品。作りは src/devices/generic/noise-filter.ts） */
export default buildNoiseFilter({
  phases: 3,
  lines: ['L1', 'L2', 'L3'],
  ratedVoltage: 500,
  ratings: [10, 20, 30, 50],
  defaultRating: 20,
  width: 120,
});

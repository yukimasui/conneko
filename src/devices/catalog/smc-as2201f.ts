import { buildAsElbow } from '../smc/speed-controller';

/** SMC スピードコントローラ AS-F エルボ形・メータアウト（AS□201F）。作りは src/devices/smc/speed-controller.ts */
export default buildAsElbow('smc.as2201f', 'meter-out');

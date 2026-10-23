import { buildGripper } from '../smc/gripper';

/**
 * SMC エアチャック MHZ2 シリーズ（平行開閉形、標準形）。作りは src/devices/smc/gripper.ts。
 *
 * 型式: MHZ2-[サイズ][作動][-オートスイッチ][リード線][個数]
 *   作動は D 複動 / S 単動常時開 / C 単動常時閉。例: MHZ2-16D-M9BW
 * 出典: SMC MHZ カタログ（static.smc.eu の MHZ_EU.pdf）
 *   ポート: サイズ 6・10 M3、16〜40 M5。使用圧力: 複動 6 は 0.15〜0.7、10 は 0.2〜0.7、16〜40 は 0.1〜0.7MPa。単動の最低 0.3・0.35・0.25MPa
 *   開閉ストローク（両側）: 4・4・6・10・14・22・30mm
 */
export default buildGripper({
  type: 'smc.mhz2',
  sizes: [
    { size: 6, thread: 'M3', stroke: 4, minPressure: 0.15, minPressureSingle: 0.3, bodyW: 17, bodyH: 26 },
    { size: 10, thread: 'M3', stroke: 4, minPressure: 0.2, minPressureSingle: 0.35, bodyW: 21, bodyH: 30 },
    { size: 16, thread: 'M5', stroke: 6, minPressure: 0.1, minPressureSingle: 0.25, bodyW: 27, bodyH: 36 },
    { size: 20, thread: 'M5', stroke: 10, minPressure: 0.1, minPressureSingle: 0.25, bodyW: 33, bodyH: 42 },
    { size: 25, thread: 'M5', stroke: 14, minPressure: 0.1, minPressureSingle: 0.25, bodyW: 39, bodyH: 48 },
    { size: 32, thread: 'M5', stroke: 22, minPressure: 0.1, minPressureSingle: 0.25, bodyW: 50, bodyH: 54 },
    { size: 40, thread: 'M5', stroke: 30, minPressure: 0.1, minPressureSingle: 0.25, bodyW: 60, bodyH: 64 },
  ],
  defaultSize: 16,
  maxPressure: 0.7,
  model: (p, sw) => `MHZ2-${p.size}${p.action}${sw}`,
  description: 'SMC のエアチャック MHZ2 シリーズ（平行開閉形、サイズ 6〜40）。2 本のフィンガが平行に開閉してワークをつかむ。',
  estimated: '外形寸法は推定',
});

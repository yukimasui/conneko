import type { DeviceDefinition } from '../types';
import { buildRPowerSupply } from './mitsubishi-r61p';

/**
 * 三菱電機 MELSEC iQ-R シリーズ 電源ユニット R62P（AC100〜240V 入力、DC5V 3.5A + DC24V 0.6A 出力）。
 * 外形 W54.6 × H106 × D110 mm（1mm ≒ 2px）。外形・主端子台は R61P と共通（buildRPowerSupply）で、
 * 端子部の左上に DC24V のサービス電源出力端子（+24V / 24G、M3.5）と「OUTPUT 24VDC」の表示が加わる。
 * DC24V 出力は入力ユニットのセンサー用電源などに使える（定格 0.6A）。
 */

const def: DeviceDefinition = buildRPowerSupply({
  type: 'mitsubishi.r62p',
  model: 'R62P',
  ratingLines: ['INPUT 100-240VAC 50/60Hz 120VA', 'OUTPUT 5VDC 3.5A/24VDC 0.6A'],
  maxVA: 120,
  serviceOutputA: 0.6,
  output5V: 3.5,
  description:
    '三菱電機 MELSEC iQ-R シリーズの電源ユニット（AC 入力、DC24V 出力付き）。入力 AC100〜240V（85〜264V）50/60Hz、最大入力皮相電力 120VA。出力 DC5V 3.5A（ベースユニット経由で CPU・I/O ユニットへ）と DC24V 0.6A（+24V / 24G 端子、M3.5。過電流保護 0.66A 以上）。DC24V 出力は入力ユニットのセンサー電源など外部機器に使える。主端子台（M4、上から）: ERR・ERR（ERR 接点 DC24V 0.5A、システム正常時に閉）、FG、LG、N・L（INPUT）。FG・LG はそれぞれ接地抵抗 100Ω 以下で接地する。',
});

export default def;

/**
 * コガネイ 5 ポート電磁弁 F シリーズ（F10、単体・ボディ配管形、DC24V）の機器定義を作る。作りは src/devices/air/body-valve.ts。
 *
 * 出典:
 *   コガネイ F10 シリーズ製品ページ（koganeiasia.com の「F10 Series」）: 消費電力 0.55W（標準形）、0.15W（低電流形）
 *   Koganei USA「F Series - Indirect Acting Solenoid Valves」選定表: F10T1（2 位置シングル）使用圧力 0.2〜0.7MPa、
 *     ポート φ4・φ6 のワンタッチ継手または M5×0.8、電圧 DC12・24V
 * 推定: F10T2（2 位置ダブル）の最低使用圧力（0.1MPa）、P・R のねじ（M5）、型式の末尾（-A1）の意味、リード線の色（赤 +・黒 −）
 */
import type { DeviceDefinition } from '../types';
import { buildBodyValve, type BodyValveLook } from '../air/body-valve';
import { KOGANEI_LOGO } from './cylinder';

/** F10 の弁本体（黒い樹脂のボディ） */
const LOOK: BodyValveLook = {
  body: ['#5a5e63', '#33363a', '#1c1e20'],
  edge: '#0e0f10',
  ink: '#e9ecef',
  pilot: ['#3c3f43', '#24262a', '#111213'],
  plug: '#2a2c2f',
  logo: { text: KOGANEI_LOGO.text, color: '#7fb4ff' },
};

export function buildF10(type: string, fn: 'single' | 'double'): DeviceDefinition {
  const t = fn === 'single' ? 'T1' : 'T2';
  return buildBodyValve({
    type,
    model: `F10${t}-A1 DC24V`,
    modelOf: () => `F10${t}-A1 DC24V`,
    maker: 'コガネイ',
    series: `F10${t}`,
    fn,
    bodyW: 66,
    look: LOOK,
    labels: { A: '4(A)', B: '2(B)', P: '1(P)', EA: '5(R1)', EB: '3(R2)' },
    thread: 'M5',
    lowerOD: 4,
    abOptions: [4, 6],
    abDefault: 6,
    abCode: (od) => `φ${od}`,
    minPressure: fn === 'single' ? 0.2 : 0.1,
    maxPressure: 0.7,
    coilW: 0.55,
    leads: { plus: 'red', minus: 'black' },
    description:
      `コガネイの 5 ポート電磁弁 F10 シリーズ（${fn === 'single' ? 'F10T1: 2 位置シングル' : 'F10T2: 2 位置ダブル'}、DC24V、単体・ボディ配管形）。` +
      'A・B はワンタッチ継手（φ4・φ6）、P・R1・R2 は M5。',
    estimated: `${fn === 'double' ? '2 位置ダブルの最低使用圧力（0.1MPa）、' : ''}P・R のねじ（M5）、型式の末尾（-A1）、リード線の色（赤 +・黒 −）は推定`,
  });
}

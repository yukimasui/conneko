/**
 * エアのチューブの描き方（画面と画像出力で共通）。
 * 電線より太く、縁取りと中央の光沢で樹脂のチューブらしく描く。透明のチューブは中を透かす。
 */
import { getTubeColor } from '../data/tubes';

export interface StrokeSpec {
  stroke: string;
  width: number;
  opacity?: number;
}

/** チューブの外径[mm]を描く太さ[px]にする */
export function tubeWidth(od: number | undefined): number {
  return Math.max(3.5, Math.min(11, (od ?? 6) * 0.85));
}

/** 重ねて描く線（下から順） */
export function tubeStrokes(color: string, od: number | undefined): StrokeSpec[] {
  const c = getTubeColor(color);
  const hex = c?.hex ?? '#2f7fd8';
  const w = tubeWidth(od);
  return [
    { stroke: 'rgba(0,0,0,0.5)', width: w + 1.8 },
    { stroke: hex, width: w, ...(c?.clear ? { opacity: 0.55 } : {}) },
    // 光沢（中央の細い明るい線）
    { stroke: '#ffffff', width: Math.max(1, w * 0.28), opacity: c?.clear ? 0.8 : 0.38 },
  ];
}

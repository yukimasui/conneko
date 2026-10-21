/**
 * 三菱電機 MELSEC（iQ-R / iQ-F）の機器定義で共通に使う定数・関数。
 */
import { ioName } from '../resolve';
import type { AcceptSpec, IoFormat, ParamValues } from '../types';

/** iQ-R のベースユニットに装着するユニットのバスの種類 */
export const IQR_BUS = 'melsec-iq-r';
/** iQ-F（FX5）の CPU ユニットの右側に増設するユニットのバスの種類 */
export const FX5_BUS = 'melsec-fx5';

/**
 * 装着で決まる先頭番号（点数）。装着していなければ 0。
 * 図面で ioIn / ioOut を直接指定した場合は 16 進・8 進の文字列（'X20' など）ではなく点数が入る。
 */
export function ioHead(p: ParamValues, dir: 'in' | 'out'): number {
  const n = Number(dir === 'in' ? p.ioIn : p.ioOut);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

/** 先頭番号に offset を足した入出力番号の表記（例: hex で先頭 0x20 + 3 → 'X23'） */
export function ioLabel(format: IoFormat, dir: 'in' | 'out', p: ParamValues, offset: number): string {
  return ioName(format, dir, ioHead(p, dir) + offset);
}

/**
 * リレー出力のコモンに入れられる電源（AC・DC のどちらでもよい）。
 * maxAc / maxDc は開閉できる最大電圧[V]。最小開閉負荷は DC5V なので下限は 5V とする。
 */
export function relayCommonAccepts(maxAc: number, maxDc: number): AcceptSpec[] {
  return [
    { system: 'AC', minVoltage: 5, maxVoltage: maxAc },
    { system: 'DC', minVoltage: 5, maxVoltage: maxDc },
  ];
}

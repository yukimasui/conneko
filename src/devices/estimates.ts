/**
 * 機器定義に推定の値（メーカーの資料で確認できなかった値）を含むか。
 * estimated を書いた機器と、説明・端子の説明・印字に「推定」と書いてある機器を、推定を含むとみなす。
 */
import { resolveDevice } from './resolve';
import type { DeviceDefinition } from './types';

const cache = new WeakMap<DeviceDefinition, boolean>();

export function hasEstimates(def: DeviceDefinition): boolean {
  const hit = cache.get(def);
  if (hit !== undefined) return hit;
  // 端子・ピンはパラメータの既定値で確定させてから見る
  const r = resolveDevice(def);
  const terms = r.terminals;
  const pins = r.pins;
  const result = !!def.estimated || /推定/.test(def.description ?? '') || [...terms, ...pins].some((t) => /推定/.test(`${t.note ?? ''}${t.label ?? ''}`));
  cache.set(def, result);
  return result;
}

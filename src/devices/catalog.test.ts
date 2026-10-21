/**
 * 全機器定義の整合性（パラメータの全選択肢で端子・ピン・内部経路・SVG を検査する）。
 */
import { describe, expect, it } from 'vitest';
import { deviceDefinitions } from './registry';
import { paramVariants, validateDefinition } from './validate';

describe('全機器定義', () => {
  it('type が一意', () => {
    const types = deviceDefinitions.map((d) => d.type);
    expect(types.length - new Set(types).size).toBe(0);
  });

  it.each(deviceDefinitions.map((d) => [d.type, d] as const))('%s', (_, def) => {
    const problems = paramVariants(def).flatMap((p) => validateDefinition(def, p).map((m) => `${JSON.stringify(p)} ${m}`));
    expect([...new Set(problems)]).toEqual([]);
  });
});

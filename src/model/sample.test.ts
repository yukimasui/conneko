import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import { sampleDiagram } from './sample';

describe('サンプル図面', () => {
  it('意図的に未配線にしたファン（FAN1）以外に指摘がない', () => {
    const issues = checkDiagram(sampleDiagram, getDeviceDefinition);
    const others = issues.filter((i) => !i.devices.includes('FAN1'));
    expect(others.map((i) => `${i.rule}: ${i.message}`)).toEqual([]);
    expect(issues.length).toBeGreaterThan(0);
  });
});

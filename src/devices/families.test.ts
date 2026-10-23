import { describe, expect, it } from 'vitest';
import { buildFamilies, deviceFamilies, FAMILY_RULES, familyOf } from './families';
import { deviceDefinitions } from './registry';

describe('機器のファミリー', () => {
  it('すべての機器定義がちょうど 1 つのファミリーに入る', () => {
    const types = deviceFamilies.flatMap((f) => f.members.map((m) => m.type));
    expect(types.length).toBe(deviceDefinitions.length);
    expect(new Set(types).size).toBe(types.length);
  });

  it('パレットに並ぶ数は機種の数よりずっと少ない', () => {
    expect(deviceFamilies.length).toBeLessThan(deviceDefinitions.length / 3);
  });

  it('ルールの ID は重ならず、既定の機種はファミリーの中にある', () => {
    expect(new Set(FAMILY_RULES.map((r) => r.id)).size).toBe(FAMILY_RULES.length);
    for (const f of deviceFamilies) expect(f.members.some((m) => m.type === f.defaultType)).toBe(true);
  });

  it('現場の大くくりの名前でまとまる', () => {
    expect(familyOf('mitsubishi.nv32-sv.3p')?.name).toBe('漏電ブレーカー');
    expect(familyOf('mitsubishi.nv30-fa.2p')?.name).toBe('漏電ブレーカー');
    expect(familyOf('smc.sy3120-5lz')?.name).toBe('電磁弁');
    expect(familyOf('smc.sy5240-5lz')?.name).toBe('電磁弁');
    expect(familyOf('smc.ss5y3-41')?.name).toBe('マニホールド');
    expect(familyOf('keyence.kv-c32xc.input')?.name).toBe('PLC 入出力ユニット');
    expect(familyOf('keyence.em-030')?.name).toBe('近接センサ');
    expect(familyOf('smc.cq2')?.name).toBe('エアシリンダ');
  });

  it('観点で機種を絞り込める（電磁弁の切換え・取付け・シリーズ）', () => {
    const sv = familyOf('smc.sy3120-5lz')!;
    expect(sv.facets.map((f) => f.label)).toEqual(['切換え', '取付け', 'シリーズ']);
    const pick = (fn: string, mount: string, series: string) =>
      sv.members.filter((d) => sv.facets[0].value(d) === fn && sv.facets[1].value(d) === mount && sv.facets[2].value(d) === series).map((d) => d.type);
    expect(pick('ダブルソレノイド', 'マニホールド用', 'SY5000')).toEqual(['smc.sy5240-5lz']);
    const elb = familyOf('mitsubishi.nv32-sv.3p')!;
    expect(elb.facets.find((f) => f.label === '極数')?.value(elb.members.find((m) => m.type === 'mitsubishi.nv30-fa.2p')!)).toBe('2P');
  });

  it('どのルールにも合わない機器は、一般名称ごとのファミリーになる', () => {
    const fams = buildFamilies(deviceDefinitions.slice(0, 3), []);
    expect(fams.every((f) => f.id.startsWith('name:'))).toBe(true);
  });
});

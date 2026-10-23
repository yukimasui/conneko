/**
 * 代表機種の端子の呼び名（hint）の確認。吹き出しの文字は hint.ts の terminalCallout で決まる。
 */
import { describe, expect, it } from 'vitest';
import { terminalCallout } from './hint';
import { getDeviceDefinition } from './registry';

/** 機器の端子 ID → 吹き出しの文字 */
function callouts(type: string): Record<string, string | undefined> {
  const d = getDeviceDefinition(type);
  if (!d) throw new Error(`機器定義がない: ${type}`);
  const terminals = typeof d.terminals === 'function' ? d.terminals({}) : d.terminals;
  return Object.fromEntries(terminals.map((t) => [t.id, terminalCallout(t)]));
}

describe('端子の呼び名（代表機種）', () => {
  it('リレー MY2N（DC）はコイルの極性と極ごとの接点が分かる', () => {
    const c = callouts('omron.my2n.dc24');
    expect(c['14']).toBe('14 コイル+');
    expect(c['13']).toBe('13 コイル−');
    expect(c['9']).toBe('9 COM1');
    expect(c['1']).toBe('1 NC1');
    expect(c['8']).toBe('8 NO2');
  });

  it('リレー MY4N（AC）のコイルは極性なし、4 極目まで番号が付く', () => {
    const c = callouts('omron.my4n.ac100');
    expect(c['13']).toBe('13 コイル');
    expect(c['12']).toBe('12 COM4');
  });

  it('タイマー H3Y は電源の極性と限時接点', () => {
    const c = callouts('omron.h3y-2.dc24');
    expect(c['14']).toBe('14 電源+');
    expect(c['12']).toBe('12 限時COM2');
  });

  it('ブレーカー 3P は一次 R/S/T・二次 R/S/T、1P は一次側・二次側', () => {
    const c = callouts('mitsubishi.nv30-fa.3p');
    expect([c['1'], c['3'], c['5']]).toEqual(['1 一次 R', '3 一次 S', '5 一次 T']);
    expect([c['2'], c['4'], c['6']]).toEqual(['2 二次 R', '4 二次 S', '6 二次 T']);
    expect(callouts('mitsubishi.cp30-ba.1p')['1']).toBe('1 一次側');
  });

  it('電磁接触器は主回路・コイル・補助接点、直流操作形はコイルの極性が分かる', () => {
    const ac = callouts('mitsubishi.s-t20.ac200v');
    expect(ac['1/L1']).toBe('1/L1 一次側');
    expect(ac['2/T1']).toBe('2/T1 二次側');
    expect(ac['A1']).toBe('A1 コイル');
    expect(ac['13']).toContain('a 接点');
    const dc = callouts('mitsubishi.sd-t21.dc24v');
    expect(dc['A1']).toBe('A1 コイル+');
    expect(dc['A2']).toBe('A2 コイル−');
    expect([dc['13'], dc['43'], dc['21'], dc['31']]).toEqual(['13 a 接点1', '43 a 接点2', '21 b 接点1', '31 b 接点2']);
  });

  it('サーマルの 95-96 は b 接点、97-98 は a 接点', () => {
    const c = callouts('mitsubishi.th-t18');
    expect(c['95']).toBe('95 b 接点');
    expect(c['98']).toBe('98 a 接点');
  });

  it('電源ユニット（DC24V）の出力・入力・接地', () => {
    const c = callouts('generic.psu.dc24v');
    expect(c['+V1']).toBe('+V 出力 +24V');
    expect(c['-V1']).toBe('-V 出力 0V');
    expect(c['L']).toBe('L AC入力');
    expect(c['PE']).toBe('⏚ 接地');
  });

  it('KEYENCE の FG は機能接地', () => {
    expect(callouts('keyence.kv-xh16ec')['FG']).toBe('FG 機能接地');
  });
});

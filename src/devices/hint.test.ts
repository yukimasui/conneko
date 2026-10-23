import { describe, expect, it } from 'vitest';
import { CALLOUT_MAX, terminalCallout, terminalHint } from './hint';
import { validateDefinition } from './validate';
import type { DeviceDefinition } from './types';

describe('terminalHint', () => {
  it('hint があれば note より優先する', () => {
    expect(terminalHint({ id: '9', hint: 'COM1', note: '極 1 の COM（9-1 が b 接点）' })).toBe('COM1');
  });
  it('hint がなければ note の括弧（全角・半角）より前を使う', () => {
    expect(terminalHint({ id: '14', note: '電源 +（+24V）' })).toBe('電源 +');
    expect(terminalHint({ id: 'FG', note: 'FG (機能接地)' })).toBe('FG');
  });
  it('note がなく印字が「端子ID（説明）」なら、括弧の中の最初の区切りまでを使う', () => {
    expect(terminalHint({ id: '11', label: '11（主回路 b 接点・直接開路）' })).toBe('主回路 b 接点・直接開路');
    expect(terminalHint({ id: 'A1', label: '（ソレノイド 0V、黒）' })).toBe('ソレノイド 0V');
  });
  it('印字の括弧より前に意味がある場合は括弧の中を使わない', () => {
    expect(terminalHint({ id: 'BN', label: '茶 +V（DC10〜30V）' })).toBeUndefined();
  });
  it('どれもなければ undefined', () => {
    expect(terminalHint({ id: '1' })).toBeUndefined();
    expect(terminalHint({ id: '1', note: '（予備）' })).toBeUndefined();
  });
});

describe('terminalCallout', () => {
  it('印字と呼び名を並べる', () => {
    expect(terminalCallout({ id: '14', hint: 'コイル+' })).toBe('14 コイル+');
  });
  it('印字に意味が書いてある端子（センサーの線）は括弧より前だけ出す', () => {
    expect(terminalCallout({ id: 'BN', label: '茶 +V（DC10〜30V）' })).toBe('茶 +V');
  });
  it('印字と呼び名が同じなら重ねない', () => {
    expect(terminalCallout({ id: 'c0', label: 'COM0', hint: 'COM0' })).toBe('COM0');
    expect(terminalCallout({ id: 'BN', label: '茶 +V（DC10〜30V）', hint: '+V' })).toBe('茶 +V');
  });
  it('印字の括弧の中から作った呼び名を印字の頭と並べる', () => {
    expect(terminalCallout({ id: '21', label: '21（b 接点 1・直接開路）' })).toBe('21 b 接点 1・直接開路');
  });
  it('意味の情報がない端子は出さない', () => {
    expect(terminalCallout({ id: '1' })).toBeUndefined();
    expect(terminalCallout({ id: '1', label: '1' })).toBeUndefined();
  });
  it('長い文字は … で省く', () => {
    const s = terminalCallout({ id: 'X', label: 'PORT1 SD 送信データ 出力ポート' })!;
    expect(s.length).toBe(CALLOUT_MAX);
    expect(s.endsWith('…')).toBe(true);
  });
});

describe('hint の検査', () => {
  const def = (hint: string): DeviceDefinition => ({
    type: 't', name: 't', model: 't', category: 'control', labelPrefix: 'T', width: 10, height: 10, svg: '',
    terminals: [{ id: 'A', x: 1, y: 1, side: 'top', role: 'signal', hint }],
  });
  it('長すぎる・空の hint を問題にする', () => {
    expect(validateDefinition(def('とても長い端子の呼び名です')).some((m) => m.includes('hint'))).toBe(true);
    expect(validateDefinition(def(' ')).some((m) => m.includes('hint'))).toBe(true);
    expect(validateDefinition(def('コイル+')).some((m) => m.includes('hint'))).toBe(false);
  });
});

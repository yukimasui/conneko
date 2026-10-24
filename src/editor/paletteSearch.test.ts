import { describe, expect, it } from 'vitest';
import { deviceFamilies } from '../devices/families';
import { hiddenGuide, searchEntries, type Entry } from './paletteSearch';

const entries: Entry[] = deviceFamilies.map((family) => ({ family, members: family.members, def: family.members[0] }));
const names = (q: string) => searchEntries(entries, q.split(/\s+/)).map((e) => e.family.name);

describe('パレットの検索', () => {
  it('略号「MC」では電磁接触器をいちばん上に出す（大文字・小文字は問わない）', () => {
    expect(names('MC')[0]).toBe('電磁接触器');
    expect(names('mc')[0]).toBe('電磁接触器');
  });

  it('同義語・通称で探せる（電磁開閉器 → 電磁接触器・サーマルリレー、シーケンサー → PLC など）', () => {
    expect(names('電磁開閉器').slice(0, 2).sort()).toEqual(['サーマルリレー', '電磁接触器']);
    expect(names('サーマル')[0]).toBe('サーマルリレー');
    expect(names('ELB')[0]).toBe('漏電ブレーカー');
    expect(names('CP')[0]).toBe('サーキットプロテクタ');
    expect(names('PB')[0]).toBe('押しボタンスイッチ');
    expect(names('シーケンサー')[0]).toMatch(/^PLC CPU/);
  });

  it('型式でも探せる（NV32 → 漏電ブレーカー、KV-C32 → PLC の入出力ユニット）', () => {
    expect(names('NV32')[0]).toBe('漏電ブレーカー');
    expect(names('KV-C32')).toContain('PLC 入出力ユニット');
  });

  it('パレットの一覧に出さない PLC のユニット・マニホールドの部品は、エディタから足すよう案内する', () => {
    const io = deviceFamilies.find((f) => f.name === 'PLC 入出力ユニット')!;
    expect(io.hidden).toBe(true);
    expect(hiddenGuide(io)).toContain('PLC エディタ');
    const blank = deviceFamilies.find((f) => f.id === 'manifold-blank')!;
    expect(hiddenGuide(blank)).toContain('バルブエディタ');
    expect(hiddenGuide(deviceFamilies.find((f) => f.name === '電磁接触器')!)).toBeUndefined();
  });
});

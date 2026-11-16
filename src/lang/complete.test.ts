import { describe, expect, it } from 'vitest';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { complete } from './complete';

const HEAD = `PS1  = generic.power-source.3p200v
ELB1 = mitsubishi.nv32-sv.3p(ratedCurrent=20) "主幹"
MC1  = mitsubishi.s-t10.ac200v
PLC1 = keyence.kv-8000.cpu {
  IN1 = keyence.kv-c32xc.input
}
R: PS1.R -- ELB1.1
PS1.S -- <P24>
`;

/** | の位置で候補を求める（labels: 候補の文字、word: 置き換える範囲の文字） */
function at(text: string, explicit = false) {
  const offset = text.indexOf('|');
  const source = text.slice(0, offset) + text.slice(offset + 1);
  const r = complete(source, offset, { lookup: getDeviceDefinition, defs: deviceDefinitions, explicit });
  return r ? { labels: r.items.map((i) => i.label), items: r.items, word: source.slice(r.from, r.to) } : null;
}

describe('入力候補', () => {
  it('「名前 = 」の後は機器種別。機器名の接頭辞（ELB）が合う機種を先に出す', () => {
    const r = at(`${HEAD}ELB2 = |`)!;
    expect(r.word).toBe('');
    expect(r.labels.length).toBeGreaterThan(5);
    const elb = r.labels.slice(0, 5).map((t) => getDeviceDefinition(t)!.labelPrefix);
    expect(new Set(elb)).toEqual(new Set(['ELB']));
  });

  it('機器種別は、種別のほか名前・型式・メーカーでも探せる（空白で区切ると全部を含むもの）', () => {
    expect(at(`X = mitsubishi.nv32|`)!.labels[0]).toMatch(/^mitsubishi\.nv32/);
    expect(at(`X = 漏電|`)!.labels).toContain('mitsubishi.nv32-sv.3p');
    expect(at(`X = NV32-SV|`)!.labels).toContain('mitsubishi.nv32-sv.3p');
    const both = at(`X = 三菱 漏電|`)!.labels;
    expect(both.length).toBeGreaterThan(0);
    expect(both.every((t) => t.startsWith('mitsubishi.'))).toBe(true);
    expect(at(`X = 三菱 漏電|`)!.word).toBe('三菱 漏電');
  });

  it('機器種別の ( の中はパラメータ名、キー= の後はその選択肢。書いたパラメータは出さない', () => {
    const keys = at(`ELB9 = mitsubishi.nv32-sv.3p(|`)!;
    expect(keys.labels).toEqual(['ratedCurrent', 'sensitivity']);
    expect(keys.items[0]).toMatchObject({ apply: 'ratedCurrent=', retrigger: true });
    expect(at(`ELB9 = mitsubishi.nv32-sv.3p(ratedCurrent=20, |`)!.labels).toEqual(['sensitivity']);
    const values = at(`ELB9 = mitsubishi.nv32-sv.3p(ratedCurrent=3|`)!;
    expect(values.word).toBe('3');
    expect(values.labels).toEqual(['30', '32']);
  });

  it('機器名. の後は、その機器の端子（呼び名と、つながっているか）', () => {
    const r = at(`${HEAD}ELB1.|`)!;
    expect(r.labels).toEqual(['1', '3', '5', '2', '4', '6']);
    expect(r.items[0].detail).toContain('接続済み');
    expect(r.items[3].detail).not.toContain('接続済み');
    expect(at(`${HEAD}MC1.A|`)!.labels).toEqual(['A1', 'A2']);
    // 端子の ID に / のあるもの。打った文字から置き換える
    const l = at(`${HEAD}MC1.1/|`)!;
    expect([l.word, l.labels]).toEqual(['1/', ['1/L1']]);
  });

  it('機器名.[ の並びの中も端子。装着したユニットは、装着で決まる端子になる', () => {
    expect(at(`${HEAD}ELB1.[2, 4, |`)!.labels).toContain('6');
    expect(at(`${HEAD}IN1.|`)!.labels).toContain('CN1');
  });

  it('コネクタのピンは、電線の端には出さず、comment には出す', () => {
    expect(at(`${HEAD}IN1.CN1#|`)).toBeNull();
    expect(at(`${HEAD}comment IN1.CN1#1|`)!.labels).toContain('CN1#1');
  });

  it('-- の後・線番: の後は、宣言した機器（選ぶと「機器名.」まで入り、続けて端子を出す）とリンク', () => {
    const r = at(`${HEAD}X1: ELB1.2 -- |`)!;
    expect(r.labels).toEqual(expect.arrayContaining(['PS1', 'ELB1', 'MC1', 'PLC1', 'IN1', '<P24>']));
    expect(r.items.find((i) => i.label === 'MC1')).toMatchObject({ apply: 'MC1.', retrigger: true });
    expect(at(`${HEAD}R1: E|`)!.labels).toEqual(['ELB1']);
    expect(at(`${HEAD}[R, S]: |`)!.labels).toContain('PS1');
  });

  it('< の後は、使っているリンクの名前', () => {
    const r = at(`${HEAD}ELB1.2 -- <P|`)!;
    expect(r.labels).toEqual(['<P24>']);
    expect(r.items[0].apply).toBe('P24>');
  });

  it('電線の後ろ・wire の見出しは、色・太さ・種類・端末処理など。太さには許容電流を添える', () => {
    const r = at(`${HEAD}ELB1.2 -- MC1.1/L1 bl|`)!;
    expect(r.labels.slice(0, 2)).toEqual(['black', 'blue']);
    const sq = at(`${HEAD}ELB1.2 -- MC1.1/L1 3.5|`)!;
    expect(sq.labels[0]).toBe('3.5sq');
    expect(sq.items[0].detail).toContain('25A');
    expect(at(`wire KIV 2sq |`)!.labels).toContain('black');
    expect(at(`${HEAD}ELB1.2 -- MC1.1/L1 color=r|`)!.labels).toEqual(['red']);
  });

  it('行頭では、自分で呼んだとき（または何か打ったとき）だけ、キーワード・新しい機器名・機器を出す', () => {
    expect(at(`${HEAD}|`)).toBeNull();
    expect(at(`${HEAD}|`, true)!.labels).toEqual(expect.arrayContaining(['wire', 'sheet', 'comment', 'ELB1']));
    const r = at(`${HEAD}EL|`)!;
    expect(r.labels).toEqual(expect.arrayContaining(['ELB2 =', 'ELB1']));
    expect(r.items.find((i) => i.label === 'ELB2 =')).toMatchObject({ apply: 'ELB2 = ', retrigger: true });
  });

  it('宣言の後ろは at・on・slot、on の後は機器名', () => {
    expect(at(`${HEAD}IN2 = keyence.kv-c32xc.input o|`)!.labels).toEqual(['on']);
    expect(at(`${HEAD}IN2 = keyence.kv-c32xc.input on PL|`)!.labels[0]).toBe('PLC1');
    expect(at(`${HEAD}IN2 = keyence.kv-c32xc.input on |`)!.labels).not.toContain('IN2');
  });

  it('コメント・文字列の中では出さない。打っている行が壊れていても、ほかの行の機器は使える', () => {
    expect(at(`${HEAD}// ELB1.|`)).toBeNull();
    expect(at(`${HEAD}ELB1 = mitsubishi.nv32-sv.3p "ELB1.|`)).toBeNull();
    expect(at(`${HEAD}[[ ELB1.2 -- MC1.|`)!.labels).toContain('A1');
  });

  it('端子を 1 つ書いて空白を打ったところでは -- を出す', () => {
    expect(at(`${HEAD}ELB1.2 |`)!.labels).toEqual(['--']);
  });

  it('1 行に書いたブロックの中でも、文の位置に合った候補を出す', () => {
    expect(at(`PLC1 = keyence.kv-8000.cpu { IN1 = keyence.kv-c|`)!.labels).toContain('keyence.kv-c32xc.input');
    expect(at(`${HEAD}sheet "x" { ELB1.|`)!.labels).toContain('2');
    expect(at(`${HEAD}wire KIV 2sq { ELB1.2 -- M|`)!.labels).toEqual(['MC1']);
  });

  it('線番の : の後に空白がなくても候補を出す。comment の行には -- を出さない', () => {
    expect(at(`${HEAD}R1:ELB1.|`)!.labels).toContain('2');
    expect(at(`${HEAD}R1:E|`)!.labels).toEqual(['ELB1']);
    expect(at(`${HEAD}comment IN1.CN1#1 |`)).toBeNull();
  });

  it('新しい機器名は、機器種別の分からない機器の名前とも重ねない', () => {
    expect(at(`ELB1 = zzz.unknown\nEL|`)!.labels).toContain('ELB2 =');
  });

  it('打っている行の書きかけの電線は「接続済み」に数えない（前に同じ行を解析していても）', () => {
    expect(at(`${HEAD}Y: ELB1.2 -- MC1.1/L1|`)).not.toBeNull();
    const r = at(`${HEAD}Y: ELB1.|`)!;
    expect(r.items.find((i) => i.label === '2')!.detail).not.toContain('接続済み');
    expect(r.items.find((i) => i.label === '1')!.detail).toContain('接続済み');
  });

  it('引用符が要る端子 ID は引用符で囲んで入れる。. を含む端子 ID も候補にする', () => {
    const quoted = at(`AD1 = aandd.ad-4402\nAD1.IN|`)!;
    expect(quoted.items.find((i) => i.label === 'IN COM')?.apply).toBe('"IN COM"');
    const sw = at(`CY1 = smc.cm2(bore=25, stroke=100, switch=M9N)\nCY1.SW1.|`)!;
    expect(sw.word).toBe('SW1.');
    expect(sw.labels).toEqual(expect.arrayContaining(['SW1.BN', 'SW1.BK', 'SW1.BU']));
  });
});

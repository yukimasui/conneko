import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { checkDiagram } from '../check/checkDiagram';
import { deviceDefinitions, getDeviceDefinition } from '../devices/registry';
import { CABLE_WIRE_TYPE, sheetOf, type Diagram } from '../model/diagram';
import { AIR_LINK_TYPE, LINK_TYPE, NET_LINK_TYPE } from '../model/ops';
import { sampleDiagram } from '../model/sample';
import { checkSource, formatDiagnostic } from './check';
import { compile } from './compile';
import { lex } from './lexer';
import { parse } from './parser';
import { printDiagram } from './print';

const options = { lookup: getDeviceDefinition, defs: deviceDefinitions };
const build = (source: string) => compile(source, options);
/** 「コード 行:桁」の一覧 */
const codes = (source: string) => checkSource(source, options).diagnostics.map((d) => `${d.code} ${d.span?.start.line}:${d.span?.start.col}`);
const wireList = (d: Diagram) => d.wires.map((w) => `${w.wireNo ?? ''}|${w.from.device}.${w.from.terminal}|${w.to.device}.${w.to.terminal}|${w.wireType} ${w.sizeSq} ${w.color}`);

const HEAD = `
PS1  = generic.power-source.3p200v
ELB1 = mitsubishi.nv32-sv.3p(ratedCurrent=20)
MC1  = mitsubishi.s-t10.ac200v
`;

describe('字句解析', () => {
  it('端子 ID の記号（/ + - # .）は単語の一部として読む', () => {
    const words = lex('MC1.1/L1 -- PSU1.+V1 -- PLC1.24V- -- IN1.CN1#1 -- CY1.SW1.BN').tokens.filter((t) => t.kind === 'word').map((t) => t.text);
    expect(words).toEqual(['MC1.1/L1', '--', 'PSU1.+V1', '--', 'PLC1.24V-', '--', 'IN1.CN1#1', '--', 'CY1.SW1.BN']);
  });

  it('行頭・空白の後の // と # はコメント。端子 ID の途中の # はコメントにしない', () => {
    const words = lex('// 注釈\nA.CN#1 -- B.1 # 後ろの注釈\n# 行の注釈').tokens.filter((t) => t.kind === 'word').map((t) => t.text);
    expect(words).toEqual(['A.CN#1', '--', 'B.1']);
  });

  it('引用符で囲むと、空白のある端子 ID・線番を書ける', () => {
    const { tokens, errors } = lex('"A 1": AD1."IN COM" -- X.1');
    expect(errors).toEqual([]);
    expect(tokens[0]).toMatchObject({ kind: 'string', text: 'A 1' });
    expect(tokens[2]).toMatchObject({ kind: 'word', text: 'AD1.IN COM', dot: 3 });
  });
});

describe('構文解析', () => {
  it('-- の前後の改行は続きとして読む', () => {
    const { program, errors } = parse('P24: A.1\n  -- B.1\n  -- C.1 blue\nD.1 -- E.1');
    expect(errors).toEqual([]);
    expect(program.body).toHaveLength(2);
    expect(program.body[0]).toMatchObject({ type: 'chain', labels: [{ value: 'P24' }], attrs: [{ value: { value: 'blue' } }] });
  });

  it('誤りのある文を読み飛ばして、後ろの文の誤りも出す', () => {
    const { errors } = parse('A.1 B.1\nB = \nC.1 -- D.1\nE.1 F.1');
    expect(errors.map((e) => e.span.start.line)).toEqual([1, 2, 4]);
  });
});

describe('コンパイル', () => {
  it('機器と電線を図面データにする', () => {
    const r = build(`${HEAD}R1: ELB1.2 -- MC1.1/L1  black 3.5sq KIV`);
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.devices.map((d) => [d.id, d.type, d.params])).toEqual([
      ['PS1', 'generic.power-source.3p200v', undefined],
      ['ELB1', 'mitsubishi.nv32-sv.3p', { ratedCurrent: 20 }],
      ['MC1', 'mitsubishi.s-t10.ac200v', undefined],
    ]);
    expect(r.diagram.wires).toEqual([{ id: 'W1', from: { device: 'ELB1', terminal: '2' }, to: { device: 'MC1', terminal: '1/L1' }, wireNo: 'R1', color: 'black', sizeSq: 3.5, wireType: 'KIV' }]);
  });

  it('同じ本数の並びは順につなぎ、線番の並びも順に付ける', () => {
    const r = build(`${HEAD}[R, S, T]: PS1.[R, S, T] -- ELB1.[1, 3, 5] -- MC1.[1/L1, 3/L2, 5/L3]`);
    expect(r.diagnostics).toEqual([]);
    expect(wireList(r.diagram).map((w) => w.split('|').slice(0, 3).join(' '))).toEqual([
      'R PS1.R ELB1.1',
      'S PS1.S ELB1.3',
      'T PS1.T ELB1.5',
      'R ELB1.1 MC1.1/L1',
      'S ELB1.3 MC1.3/L2',
      'T ELB1.5 MC1.5/L3',
    ]);
  });

  it('片方が 1 本なら、その端子からすべてへつなぐ。範囲 a..b も書ける', () => {
    const r = build('PSU1 = generic.psu.dc24v\nTB1 = generic.mil-terminal-block.34p\nPSU1.+V1 -- TB1.[1..3]\n[PSU1.-V1] -- [TB1.4, TB1.5]');
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.wires.map((w) => `${w.from.terminal}>${w.to.terminal}`)).toEqual(['+V1>1', '+V1>2', '+V1>3', '-V1>4', '-V1>5']);
  });

  it('渡り配線は、端子から端子へ続く電線になる（線番は全部に付く）', () => {
    const r = build('PSU1 = generic.psu.dc24v\nPL1 = generic.pilot-lamp.dc24v\nPL2 = generic.pilot-lamp.dc24v\nP24: PSU1.+V1 -- PL1.X1 -- PL2.X1 blue 0.75sq');
    expect(wireList(r.diagram)).toEqual(['P24|PSU1.+V1|PL1.X1|KIV 0.75 blue', 'P24|PL1.X1|PL2.X1|KIV 0.75 blue']);
  });

  it('wire ブロックの属性は中の電線の既定になり、内側のブロック・文の属性が優先する', () => {
    const r = build(`${HEAD}
wire KIV 3.5sq 黒 no=X {
  PS1.R -- ELB1.1
  wire red {
    PS1.S -- ELB1.3 1.25sq
  }
  T: PS1.T -- ELB1.5 size=5.5 type=IV ferrule
}`);
    expect(r.diagnostics).toEqual([]);
    expect(wireList(r.diagram)).toEqual(['X|PS1.R|ELB1.1|KIV 3.5 black', 'X|PS1.S|ELB1.3|KIV 1.25 red', 'T|PS1.T|ELB1.5|IV 5.5 black']);
    expect(r.diagram.wires[2]).toMatchObject({ fromTermination: 'ferrule', toTermination: 'ferrule' });
  });

  it('コネクタどうしはケーブル、エアのポートどうしはチューブになる（種類は書かない）', () => {
    const r = build(`
PLC1 = keyence.kv-8000.cpu {
  IN1 = keyence.kv-c32xc.input
}
TB1 = generic.mil-terminal-block.34p
AIR1 = generic.air-source
FR1 = smc.aw
CBL1: IN1.CN1 -- TB1.CN
AIR1.OUT -- FR1.IN 8mm`);
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.wires[0]).toMatchObject({ wireType: CABLE_WIRE_TYPE, wireNo: 'CBL1', sizeSq: 0 });
    expect(r.diagram.wires[1]).toMatchObject({ wireType: 'TU', tubeOD: 8, color: 'blue', sizeSq: 0 });
  });

  it('機器のブロックの中のユニットは、書いた順に装着される（slot で位置を飛ばせる）', () => {
    const r = build('PLC1 = keyence.kv-8000.cpu {\n  IN1 = keyence.kv-c32xc.input\n  OUT1 = keyence.kv-c32tc.output slot 4\n  OUT2 = keyence.kv-c32tc.output\n}\nIN9 = keyence.kv-c32xc.input on PLC1');
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.devices.map((d) => [d.id, d.mount?.device, d.mount?.slot])).toEqual([
      ['PLC1', undefined, undefined],
      ['IN1', 'PLC1', 1],
      ['OUT1', 'PLC1', 4],
      ['OUT2', 'PLC1', 5],
      ['IN9', 'PLC1', 2],
    ]);
  });

  it('リンク <名前> は、相手の端子と同じシートのリンクになる（線番は書かなければリンクの名前）', () => {
    const r = build(`
sheet "電源" {
  PSU1 = generic.psu.dc24v
  PSU1.+V1 -- <P24>  blue 0.75sq
}
sheet "表示" {
  PL1 = generic.pilot-lamp.dc24v
  <P24> -- PL1.X1    blue 0.75sq
  "": <N24> -- PL1.X2
}`);
    expect(r.diagnostics).toEqual([]);
    const links = r.diagram.devices.filter((d) => d.type === LINK_TYPE);
    expect(links.map((d) => [d.params?.name, sheetOf(r.diagram, d)])).toEqual([
      ['P24', 'S1'],
      ['P24', 'S2'],
      ['N24', 'S2'],
    ]);
    expect(r.diagram.wires.map((w) => w.wireNo)).toEqual(['P24', 'P24', undefined]);
    expect(r.diagram.sheets).toEqual([
      { id: 'S1', name: '電源' },
      { id: 'S2', name: '表示' },
    ]);
  });

  it('リンクの種類は相手で決まる（LAN → ネットワークリンク、エア → エアのリンク）', () => {
    const r = build('SW1 = generic.ethernet-switch.5p\nAIR1 = generic.air-source\nSW1.P1 -- <制御LAN>\nAIR1.OUT -- <元圧>');
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.devices.slice(2).map((d) => d.type)).toEqual([NET_LINK_TYPE, AIR_LINK_TYPE]);
    expect(r.diagram.wires[0]).toMatchObject({ wireType: CABLE_WIRE_TYPE, wireNo: '制御LAN' });
  });

  it('シートをまたぐ電線は、リンクの組に置き換わる（指摘は元の文の行に戻る）', () => {
    const r = build(`
sheet "電源" {
  PSU1 = generic.psu.dc24v
}
sheet "表示" {
  PL1 = generic.pilot-lamp.dc24v
}
P24: PSU1.+V1 -- PL1.X1 blue 0.75sq`);
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.devices.filter((d) => d.type === LINK_TYPE)).toHaveLength(2);
    expect(r.diagram.wires).toHaveLength(2);
    for (const w of r.diagram.wires) expect(r.map.wires.get(w.id)?.start.line).toBe(8);
  });

  it('comment は端子・ピンのコメントになり、設定は図面の設定になる', () => {
    const r = build('title "試験"\nrequiredPL d\nPLC1 = keyence.kv-8000.cpu {\n  IN1 = keyence.kv-c32xc.input\n}\ncomment IN1.CN1#1 "PH1 ワーク検出"');
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.settings).toEqual({ title: '試験', requiredPL: 'd' });
    expect(r.diagram.devices[1].comments).toEqual({ 'CN1#1': 'PH1 ワーク検出' });
  });

  it('位置を書かない機器は重ならないように並べ、at で書いた位置はそのまま使う', () => {
    const r = build(`${HEAD}M1 = generic.motor.3p at 500,900`);
    const [a, b, c, m] = r.diagram.devices;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
    expect([m.x, m.y]).toEqual([500, 900]);
  });
});

describe('コンパイルエラー', () => {
  it('機器種別の誤りは、近い名前を添えて位置つきで出す', () => {
    const r = build('MC1 = mitsubishi.s-t10.ac200');
    expect(r.ok).toBe(false);
    expect(r.diagnostics[0]).toMatchObject({ code: 'unknown-device', severity: 'error', span: { start: { line: 1, col: 7 } } });
    expect(r.diagnostics[0].message).toContain('mitsubishi.s-t10.ac200v');
  });

  it('ない端子は、その機器の端子の一覧を添えて出す（並びの中の位置を指す）', () => {
    const r = build(`${HEAD}ELB1.[2, 4, 7] -- MC1.[1/L1, 3/L2, 5/L3]`);
    expect(r.diagnostics).toHaveLength(1);
    expect(r.diagnostics[0]).toMatchObject({ code: 'unknown-terminal', span: { start: { line: 5, col: 13 } } });
    expect(r.diagnostics[0].message).toContain('端子: 1、3、5、2、4、6');
    // 誤りのない電線はできている
    expect(r.diagram.wires).toHaveLength(2);
  });

  it('宣言していない機器・重複した機器名・選べないパラメータ・読めない属性・本数の違い', () => {
    expect(
      codes(`${HEAD}
ELB1 = mitsubishi.nv32-sv.3p
ELB2 = mitsubishi.nv32-sv.3p(ratedCurrent=25)
ELB9.2 -- MC1.A1
PS1.[R, S, T] -- ELB1.[1, 3]
PS1.R -- ELB1.1 blak
PS1.R -- PS1.R`),
    ).toEqual(['duplicate-device 6:1', 'invalid-param 7:43', 'unknown-device 8:1', 'width-mismatch 9:1', 'invalid-attr 10:17', 'self-wire 11:1']);
  });

  it('ない パラメータ・電線の種類にない太さ・同じ電線の重なりは警告', () => {
    expect(codes(`${HEAD}ELB3 = mitsubishi.nv32-sv.3p(rated=20)\nPS1.R -- ELB1.1 3sq\nELB1.1 -- PS1.R`).filter((c) => !c.startsWith('unconnected'))).toEqual(
      expect.arrayContaining(['unknown-param 5:30', 'wire-size 6:1', 'duplicate-wire 7:1']),
    );
  });

  it('構文・名前に誤りがあるときは、電気的なチェックをしない', () => {
    const r = checkSource(`${HEAD}PS1.R -- ELB1.9`, options);
    expect(r.ok).toBe(false);
    expect(r.diagnostics.every((d) => d.phase === 'compile')).toBe(true);
    expect(r.issues).toEqual([]);
  });
});

describe('電気的なチェック', () => {
  const SOURCE = `PS1  = generic.power-source.3p200v
ELB1 = mitsubishi.nv32-sv.3p(ratedCurrent=30)
M1   = generic.motor.3p(ratedCurrent=3.6)
wire KIV 3.5sq black {
  [R, S, T]: PS1.[R, S, T] -- ELB1.[1, 3, 5]
}
E: PS1.PE -- M1.E green 3.5sq
[U, V, W]: ELB1.[2, 4, 6] -- M1.[U, V, W] black 2sq
`;

  it('配線チェックの指摘は、その電線を書いた行に出る', () => {
    const r = checkSource(SOURCE, options);
    expect(r.ok).toBe(true);
    const thin = r.diagnostics.filter((d) => d.code === 'wire-too-thin');
    expect(thin).toHaveLength(3);
    expect(thin.every((d) => d.phase === 'check' && d.span?.start.line === 8)).toBe(true);
  });

  it('機器についての指摘は、機器を宣言した行に出る', () => {
    const r = checkSource(SOURCE.replace(/^E: .*\n/m, ''), options);
    expect(r.diagnostics.find((d) => d.code === 'ground-missing')).toMatchObject({ span: { start: { line: 3, col: 1 } } });
  });

  it('コンパイラ風の表示（ファイル:行:桁、該当行、^ の印。全角は 2 桁に数える）', () => {
    const source = 'PL1 = generic.pilot-lamp.dc24v "表示"\n"線番": PL1.X1 -- PL1.X9';
    const r = checkSource(source, options);
    const lines = formatDiagnostic(r.diagnostics[0], source, 'a.cnk').split('\n');
    expect(lines[0]).toMatch(/^a\.cnk:2:21: error\[unknown-terminal\]: PL1/);
    expect(lines[1]).toBe('    2 | "線番": PL1.X1 -- PL1.X9');
    expect(lines[2]).toBe(`      | ${' '.repeat(22)}^^`);
  });
});

describe('図面 → 配線言語 → 図面', () => {
  /** リンクの機器名を「種類|名前」に置き換えた電線の一覧（リンクの機器名は作り直すと変わるため） */
  const netlist = (d: Diagram) => {
    const name = (id: string) => {
      const x = d.devices.find((v) => v.id === id);
      return x && getDeviceDefinition(x.type)?.netLabel ? `<${x.type}|${x.params?.name}>` : id;
    };
    const list = d.wires.map((w) => [`${name(w.from.device)}.${w.from.terminal}`, `${name(w.to.device)}.${w.to.terminal}`, w.wireNo ?? '', w.wireType, w.sizeSq, w.color, w.tubeOD ?? ''].join('|'));
    return [...new Set(list)].sort();
  };
  const devicesOf = (d: Diagram) =>
    d.devices
      .filter((x) => !getDeviceDefinition(x.type)?.netLabel)
      .map((x) => ({ id: x.id, type: x.type, params: x.params, mount: x.mount, sheet: sheetOf(d, x), note: x.note, comments: x.comments }))
      .sort((a, b) => (a.id < b.id ? -1 : 1));
  const text = printDiagram(sampleDiagram, { lookup: getDeviceDefinition });

  it('サンプル図面を言語にして読み直すと、機器・電線・チェック結果が同じになる', () => {
    const r = checkSource(text, options);
    expect(r.diagnostics.filter((d) => d.phase === 'compile')).toEqual([]);
    expect(devicesOf(r.diagram)).toEqual(devicesOf(sampleDiagram));
    expect(netlist(r.diagram)).toEqual(netlist(sampleDiagram));
    expect(r.diagram.sheets).toEqual(sampleDiagram.sheets);
    expect(r.issues.map((i) => `${i.rule}: ${i.message}`)).toEqual(checkDiagram(sampleDiagram, getDeviceDefinition).map((i) => `${i.rule}: ${i.message}`));
  });

  it('言語にしたソースは、もう一度言語にしても変わらない', () => {
    const again = printDiagram(build(text).diagram, { lookup: getDeviceDefinition });
    expect(again).toBe(text);
  });

  it('元の図面を渡すと、機器・リンクの位置と機器名、電線の ID、展開図の配置を引き継ぐ', () => {
    const r = compile(text, { ...options, base: sampleDiagram });
    expect(r.ok).toBe(true);
    const pos = (d: Diagram) => Object.fromEntries(d.devices.map((x) => [x.id, `${x.type} ${x.x},${x.y} ${JSON.stringify(x.params ?? {})}`]));
    expect(pos(r.diagram)).toEqual(pos(sampleDiagram));
    const base = new Map(sampleDiagram.wires.map((w) => [w.id, w]));
    for (const w of r.diagram.wires) expect(base.get(w.id)).toMatchObject({ from: w.from, to: w.to });
    expect(r.diagram.schematic).toBe(sampleDiagram.schematic);
  });

  it('機器を足して電線をつなぎ替えても、変えていない機器の位置は変わらない', () => {
    const edited = text.replace('FAN1 = generic.panel-fan.ac200v "盤内換気"', 'FAN1 = generic.panel-fan.ac200v "盤内換気"\n  PL9 = generic.pilot-lamp.dc24v').replace('E: PS1.PE -- M1.E', 'E: PS1.PE -- M1.E\n    PS1.PE -- PL9.X1');
    const r = compile(edited, { ...options, base: sampleDiagram });
    expect(r.diagnostics).toEqual([]);
    const before = new Map(sampleDiagram.devices.map((x) => [x.id, x]));
    for (const x of r.diagram.devices) if (before.has(x.id)) expect([x.id, x.x, x.y]).toEqual([x.id, before.get(x.id)!.x, before.get(x.id)!.y]);
    expect(r.diagram.devices.some((x) => x.id === 'PL9')).toBe(true);
  });

  it('位置つき（positions）で書くと、元の図面なしでも機器の位置を保つ', () => {
    const r = build(printDiagram(sampleDiagram, { lookup: getDeviceDefinition, positions: true }));
    const at = (d: Diagram) => d.devices.filter((x) => !getDeviceDefinition(x.type)?.netLabel).map((x) => `${x.id} ${x.x},${x.y}`).sort();
    expect(at(r.diagram)).toEqual(at(sampleDiagram));
  });
});

describe('examples の見本', () => {
  const dir = resolve(import.meta.dirname, '../../examples');
  const read = (name: string) => readFileSync(resolve(dir, name), 'utf8');

  it('誤りを入れていない見本は、指摘なしでコンパイルできる', () => {
    const clean = readdirSync(dir).filter((f) => f.endsWith('.cnk') && !['errors.cnk', 'short-circuit.cnk'].includes(f));
    expect(clean.length).toBeGreaterThan(0);
    for (const f of clean) expect([f, codes(read(f)).filter((c) => !c.startsWith('unconnected'))]).toEqual([f, []]);
  });

  it('errors.cnk は構文・名前のエラー、short-circuit.cnk は電気的なエラーの見本', () => {
    expect(codes(read('errors.cnk')).map((c) => c.split(' ')[0])).toEqual(['invalid-param', 'unknown-device', 'invalid-attr', 'width-mismatch', 'unknown-terminal', 'unknown-device']);
    const r = checkSource(read('short-circuit.cnk'), options);
    expect(r.ok).toBe(true);
    expect(r.diagnostics.filter((d) => d.severity === 'error').length).toBeGreaterThan(0);
  });
});

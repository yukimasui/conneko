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

describe('レビューで見つかった誤りの再発防止', () => {
  const lookup = getDeviceDefinition;
  const wire = (id: string, from: string, to: string, extra: Partial<Diagram['wires'][number]> = {}) => {
    const [fd, ft] = from.split(':');
    const [td, tt] = to.split(':');
    return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', wireNo: 'P24', ...extra };
  };
  /** 電線が 3 本つながったリンク（位置と向きを決めてある） */
  const fanOut: Diagram = {
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 400, y: 0 },
      { id: 'PL2', type: 'generic.pilot-lamp.dc24v', x: 400, y: 200 },
      { id: 'LK7', type: LINK_TYPE, x: 222, y: 333, params: { name: 'P24', side: 'left', orientation: 'horizontal' }, note: '母線' },
    ],
    wires: [wire('W1', 'PSU1:+V1', 'LK7:T'), wire('W2', 'LK7:T', 'PL1:X1', { route: [{ x: 300, y: 50 }] }), wire('W3', 'LK7:T', 'PL2:X1')],
  };

  it('電線が 2 本以上つながるリンクは、機器として書かれ、読み直しても 1 つのリンクのまま', () => {
    const text = printDiagram(fanOut, { lookup });
    expect(text).toContain('LK7 = generic.link(name=P24, side=left, orientation=horizontal) "母線"');
    expect(text).not.toContain('<P24>');
    const r = compile(text, { ...options, base: fanOut });
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.devices).toEqual(fanOut.devices);
    expect(r.diagram.wires).toEqual(fanOut.wires);
    expect(checkSource(text, options).issues.map((i) => i.rule)).toEqual(checkDiagram(fanOut, lookup).map((i) => i.rule));
  });

  it('1 つの文で <名前> に 2 本以上つないだリンクも、言語にして読み直すと増えない', () => {
    const first = build('PSU1 = generic.psu.dc24v\nPL1 = generic.pilot-lamp.dc24v\nPL2 = generic.pilot-lamp.dc24v\n<P24> -- [PL1.X1, PL2.X1]\nPSU1.-V1 -- <N24> -- PL1.X2').diagram;
    const links = (d: Diagram) => d.devices.filter((x) => x.type === LINK_TYPE).length;
    expect(links(first)).toBe(2);
    const again = compile(printDiagram(first, { lookup }), { ...options, base: first }).diagram;
    expect(links(again)).toBe(2);
    expect(again.wires).toEqual(first.wires);
  });

  it('リンクにつなぐ電線が 1 本でも、属性の違う電線が同じ端子との間に重なっていれば機器として書く', () => {
    const d: Diagram = { devices: fanOut.devices.slice(0, 1).concat(fanOut.devices[3]), wires: [wire('W1', 'PSU1:+V1', 'LK7:T'), wire('W2', 'PSU1:+V1', 'LK7:T', { sizeSq: 1.25 })] };
    const r = compile(printDiagram(d, { lookup }), { ...options, base: d });
    expect(r.diagram.devices.filter((x) => x.type === LINK_TYPE)).toHaveLength(1);
    expect(r.diagram.wires.map((w) => w.sizeSq)).toEqual([0.75, 1.25]);
  });

  it('元の図面の電線 ID に記号があっても、チェックが落ちない', () => {
    const d: Diagram = { devices: fanOut.devices.slice(0, 2), wires: [wire('W(1', 'PSU1:+V1', 'PL1:X1'), wire('W[2', 'PSU1:+V2', 'PL1:X2')] };
    const r = checkSource(printDiagram(d, { lookup }), { ...options, base: d });
    expect(r.ok).toBe(true);
    expect(r.diagram.wires.map((w) => w.id)).toEqual(['W(1', 'W[2']);
  });

  it('コネクタのピンには電線をつなげない（comment は付けられる）', () => {
    const src = 'PLC1 = keyence.kv-8000.cpu {\n  IN1 = keyence.kv-c32xc.input\n}\nPL1 = generic.pilot-lamp.dc24v\ncomment IN1.CN1#1 "PH1"\nX: IN1.CN1#1 -- PL1.X1';
    const r = build(src);
    expect(r.diagnostics.map((d) => `${d.code} ${d.span?.start.line}:${d.span?.start.col}`)).toEqual(['pin-wire 6:8']);
    expect(r.diagram.wires).toEqual([]);
    expect(r.diagram.devices[1].comments).toEqual({ 'CN1#1': 'PH1' });
  });

  it('同じ端子から別のシートへ何本も出る電線の指摘は、それぞれを書いた行に出る', () => {
    const r = checkSource(
      `sheet "電源" {
  PSU1 = generic.psu.dc24v
}
sheet "表示" {
  PL3 = generic.pilot-lamp.dc24v
  PL4 = generic.pilot-lamp.dc24v
  PL5 = generic.pilot-lamp.dc24v
}
wire 0.75sq {
  P1: PSU1.+V1 -- PL3.X1 blue ferrule
  P2: PSU1.+V1 -- PL4.X1 red
  P3: PSU1.+V1 -- PL5.X1
}`,
      options,
    );
    expect(r.ok).toBe(true);
    const lineOf = (no: string) => [...new Set(r.diagram.wires.filter((w) => w.wireNo === no).map((w) => r.map.wires.get(w.id)?.start.line))];
    expect([lineOf('P1'), lineOf('P2'), lineOf('P3')]).toEqual([[10], [11], [12]]);
    // 端末処理は、リンクに置き換えた電線の、元の端子の側に残る
    expect(r.diagram.wires.filter((w) => w.wireNo === 'P1').map((w) => [w.fromTermination, w.toTermination])).toEqual([
      ['ferrule', undefined],
      ['ferrule', undefined],
    ]);
  });

  it('空白のあるシート ID・装着の誤ったデータ・0 埋めの範囲', () => {
    const d: Diagram = {
      sheets: [
        { id: '主回路', name: '主回路' },
        { id: 'DC24V 電源', name: 'DC24V 電源' },
      ],
      devices: [
        { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0, sheet: 'DC24V 電源' },
        // 互いに装着し合う（誤ったデータ）。どちらも出力から消えない
        { id: 'B1', type: 'keyence.kv-c32xc.input', x: 0, y: 0, mount: { device: 'B2', slot: 1 } },
        { id: 'B2', type: 'keyence.kv-c32xc.input', x: 0, y: 0, mount: { device: 'B1', slot: 1 } },
      ],
      wires: [],
    };
    const text = printDiagram(d, { lookup });
    const r = build(text);
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.sheets).toEqual(d.sheets);
    expect(r.diagram.devices.map((x) => [x.id, x.mount?.device, sheetOf(r.diagram, x)])).toEqual([
      ['B1', 'B2', '主回路'],
      ['B2', 'B1', '主回路'],
      ['PSU1', undefined, 'DC24V 電源'],
    ]);
    const z = build('PSU1 = generic.psu.dc24v\nTB1 = toyogiken.pcw-1h34-d\nPSU1.+V1 -- TB1.[000..003]');
    expect(z.diagnostics).toEqual([]);
    expect(z.diagram.wires.map((w) => w.to.terminal)).toEqual(['000', '001', '002', '003']);
  });

  it('括弧の閉じ忘れ・at や slot で終わる行は、その行の誤りとして出て、後ろの行の誤りも出る', () => {
    expect(codes(`${HEAD}PS1.[R, S -- ELB1.[1, 3]\nMC9 = mitsubishi.s-t10.ac200v at\nPS1.T -- ELB1.9\nPS1.[R,\n  S] -- ELB1.[1,\n  3]`).filter((c) => !c.startsWith('unconnected'))).toEqual([
      'syntax 5:11',
      'syntax 6:31',
      'unknown-terminal 7:15',
    ]);
  });

  it('ない変換ケーブルは警告。新しく置いたリンクの電線は、機器名が同じでも元の電線の経路を引き継がない', () => {
    expect(codes('PLC1 = keyence.kv-8000.cpu {\n  IN1 = keyence.kv-c32xc.input\n}\nTB1 = generic.mil-terminal-block.34p\nIN1.CN1 -- TB1.CN cable=zzz').filter((c) => c.startsWith('unknown-cable'))).toEqual(['unknown-cable 5:25']);
    const d: Diagram = { devices: [fanOut.devices[0], { ...fanOut.devices[3], id: 'LK1' }], wires: [wire('W1', 'PSU1:+V1', 'LK1:T', { route: [{ x: 9, y: 9 }] })] };
    const renamed = compile(printDiagram(d, { lookup }).replace('<P24>', '<P5>'), { ...options, base: d }).diagram;
    expect(renamed.devices.find((x) => x.type === LINK_TYPE)).toMatchObject({ id: 'LK1', params: { name: 'P5' } });
    expect(renamed.wires[0].route).toBeUndefined();
  });
});

describe('宣言したリンクの書き換え', () => {
  const lookup = getDeviceDefinition;
  const w = (id: string, from: string, to: string, extra: Partial<Diagram['wires'][number]> = {}) => {
    const [fd, ft] = from.split(':');
    const [td, tt] = to.split(':');
    return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 0.75, wireType: 'KIV', wireNo: 'P24', ...extra };
  };
  const base: Diagram = {
    devices: [
      { id: 'PSU1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 400, y: 0 },
      { id: 'PL2', type: 'generic.pilot-lamp.dc24v', x: 400, y: 200 },
      { id: 'PL3', type: 'generic.pilot-lamp.dc24v', x: 400, y: 400 },
      { id: 'LK7', type: LINK_TYPE, x: 222, y: 333, params: { name: 'P24', side: 'left', orientation: 'horizontal' }, note: '母線' },
    ],
    wires: [w('W1', 'PSU1:+V1', 'LK7:T', { route: [{ x: 100, y: 50 }] }), w('W2', 'LK7:T', 'PL1:X1', { bend: 12 }), w('W3', 'LK7:T', 'PL2:X1')],
  };
  const text = printDiagram(base, { lookup });
  const link = (d: Diagram) => d.devices.find((x) => x.id === 'LK7')!;

  it('宣言したリンクのパラメータ・コメントは、書き換えた・消したとおりになる（位置は引き継ぐ）', () => {
    const edited = text.replace('side=left, orientation=horizontal) "母線"', 'side=right)');
    expect(edited).not.toBe(text);
    const r = compile(edited, { ...options, base });
    expect(r.diagnostics).toEqual([]);
    expect(link(r.diagram)).toEqual({ id: 'LK7', type: LINK_TYPE, x: 222, y: 333, params: { name: 'P24', side: 'right' } });
  });

  it('宣言したリンクに電線を足しても、ほかの電線の曲がり・経路は残る', () => {
    const r = compile(`${text}P24: LK7.T -- PL3.X1 blue 0.75sq\n`, { ...options, base });
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.wires).toHaveLength(4);
    expect(r.diagram.wires.find((x) => x.id === 'W1')?.route).toEqual([{ x: 100, y: 50 }]);
    expect(r.diagram.wires.find((x) => x.id === 'W2')?.bend).toBe(12);
    expect(link(r.diagram)).toEqual(link(base));
  });

  it('並びの途中のコメントだけの行は、次が ] や , でも続きとして読む', () => {
    const r = build('PSU1 = generic.psu.dc24v\nTB1 = generic.mil-terminal-block.34p\nPSU1.+V1 -- TB1.[6, 7\n  // 注釈\n  # 注釈\n  , 8\n\n  // 注釈\n]');
    expect(r.diagnostics).toEqual([]);
    expect(r.diagram.wires.map((x) => x.to.terminal)).toEqual(['6', '7', '8']);
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

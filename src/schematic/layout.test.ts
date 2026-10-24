import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { parseDiagram, toDiagramFile, type Diagram } from '../model/diagram';
import type { Point, SchematicSheetOut } from './format';
import { buildSchematic, ROW_PITCH, ROW_TOP } from './layout';
import { pruneSchematic, renameSchematicDevice, type Schematic } from './model';

const W = (id: string, from: string, to: string, wireNo?: string) => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 1.25, wireType: 'KIV', ...(wireNo ? { wireNo } : {}) };
};

/** 非常停止 → 電磁接触器のコイル、補助 a 接点 → 表示灯 */
function circuit(schematic?: Schematic): Diagram {
  return {
    devices: [
      { id: 'PS1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'ES1', type: 'idec.xw1e-bv402mr', x: 0, y: 0 },
      { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
      { id: 'TB1', type: 'generic.terminal-block.6p', x: 0, y: 0 },
    ],
    wires: [
      W('W1', 'PS1.+V1', 'ES1.21', '1'),
      W('W2', 'ES1.22', 'TB1.1a', '2'),
      W('W3', 'TB1.1b', 'MC1.A1', '2'),
      W('W4', 'MC1.A2', 'PS1.-V1', 'N'),
      W('W5', 'PS1.+V2', 'MC1.13', '1'),
      W('W6', 'MC1.14', 'PL1.X1', '3'),
      W('W7', 'PL1.X2', 'PS1.-V2', 'N'),
    ],
    ...(schematic ? { schematic } : {}),
  };
}

const row = (n: number) => ROW_TOP + (n - 1) * ROW_PITCH;

const placed: Schematic = {
  sheets: [
    {
      id: 'D1',
      name: '制御回路',
      rails: { supply: 'PS1.+V1', common: 'PS1.-V1', layout: 'sides' },
      items: [
        { element: 'ES1:21-22', x: 60, y: row(1) },
        { element: 'MC1:A1-A2', x: 330, y: row(1) },
        { element: 'MC1:13-14', x: 60, y: row(2) },
        { element: 'PL1:X1-X2', x: 330, y: row(2) },
      ],
    },
  ],
};

const build = (d: Diagram) => buildSchematic(d, getDeviceDefinition);
/** y を下向きに戻した点 */
const down = (sheet: SchematicSheetOut, p: Point): Point => [p[0], sheet.paper.height - p[1]];
/** 線（y を下向きにし、どちらの端から引いたかによらないよう、左上の端から始まる向きにそろえる） */
const linesOf = (sheet: SchematicSheetOut) =>
  sheet.polylines
    .filter((p) => p.layer === 'WIRE')
    .map((p) => {
      const pts = p.points.map((q) => down(sheet, q));
      const [a, z] = [pts[0], pts[pts.length - 1]];
      return a[0] > z[0] || (a[0] === z[0] && a[1] > z[1]) ? pts.reverse() : pts;
    });

describe('展開図の組み立て', () => {
  it('置いた要素を記号として並べ、機器名・端子番号・接点の所在を入れる', () => {
    const b = build(circuit(placed));
    const sheet = b.doc.sheets[0];
    expect(sheet.inserts.map((i) => `${i.element} ${i.symbol}`)).toEqual([
      'ES1:21-22 contact-nc-emergency-do',
      'MC1:A1-A2 coil',
      'MC1:13-14 contact-no',
      'PL1:X1-X2 lamp',
    ]);
    const coil = sheet.inserts.find((i) => i.element === 'MC1:A1-A2')!;
    expect(coil.attributes).toMatchObject({ TAG: 'MC1', T1: 'A1', T2: 'A2', XREF: 'a:2' });
    expect(sheet.inserts.find((i) => i.element === 'MC1:13-14')!.attributes).toMatchObject({ XREF: '1' });
    // 記号の定義は使ったものだけ
    expect(Object.keys(b.doc.symbols).sort()).toEqual(['coil', 'contact-nc-emergency-do', 'contact-no', 'lamp']);
    expect(b.rows.get('PL1:X1-X2')).toBe(2);
  });

  it('置いていない端子台は素通しにして、非常停止とコイルを 1 本の線でつなぐ', () => {
    const sheet = build(circuit(placed)).doc.sheets[0];
    // ES1.22（60 + 10, 1 行目）→ MC1.A1（330, 1 行目）
    expect(linesOf(sheet)).toContainEqual([
      [70, row(1)],
      [330, row(1)],
    ]);
    expect(sheet.texts.find((t) => t.layer === 'WIRENO' && t.text === '2')).toBeDefined();
  });

  it('端子台を置くと、端子台の前後で線が分かれる', () => {
    const s: Schematic = { sheets: [{ ...placed.sheets[0], items: [...placed.sheets[0].items, { element: 'TB1:1a', x: 200, y: row(1) }] }] };
    const lines = linesOf(build(circuit(s)).doc.sheets[0]);
    expect(lines).toContainEqual([
      [70, row(1)],
      [200, row(1)],
    ]);
    expect(lines).toContainEqual([
      [202.5, row(1)],
      [330, row(1)],
    ]);
  });

  it('母線の網の端子は母線へ引き出し、母線と線番を書く', () => {
    const sheet = build(circuit(placed)).doc.sheets[0];
    const lines = linesOf(sheet);
    // 左の母線（x = 40）へ: ES1.21 と MC1.13。+V1 と +V2 は電源ユニットの中でつながっている
    expect(lines).toContainEqual([
      [40, row(1)],
      [60, row(1)],
    ]);
    expect(lines).toContainEqual([
      [40, row(2)],
      [60, row(2)],
    ]);
    // 右の母線（x = 380）へ: コイルの A2 と表示灯の X2
    expect(lines).toContainEqual([
      [340, row(1)],
      [380, row(1)],
    ]);
    // 母線そのもの（縦の線）
    expect(lines.some((l) => l.length === 2 && l[0][0] === 40 && l[1][0] === 40)).toBe(true);
    expect(sheet.dots.map((d) => down(sheet, d.at))).toContainEqual([40, row(1)]);
    expect(sheet.texts.filter((t) => t.layer === 'WIRENO' && t.text === '1')).toHaveLength(2);
  });

  it('並列の枝（自己保持）は端子から出してから曲げ、分かれ目に黒丸を付ける', () => {
    // MC1.13-14 を ES1 と並列にする（ES1.21 と MC1.13、ES1.22 と MC1.14 をつなぐ）
    const d = circuit(placed);
    d.wires.push(W('W8', 'ES1.21', 'MC1.13'), W('W9', 'ES1.22', 'MC1.14'));
    d.wires = d.wires.filter((w) => w.id !== 'W5' && w.id !== 'W6');
    const s: Schematic = { sheets: [{ ...placed.sheets[0], rails: { common: 'PS1.-V1', layout: 'sides' }, items: placed.sheets[0].items.filter((i) => i.element !== 'PL1:X1-X2') }] };
    const sheet = build({ ...d, schematic: s }).doc.sheets[0];
    const lines = linesOf(sheet);
    // ES1.22（70）と MC1.14（70, 2 行目）は右へ 5mm 出してから縦につなぐ
    expect(lines).toContainEqual([
      [70, row(1)],
      [75, row(1)],
      [75, row(2)],
      [70, row(2)],
    ]);
    expect(sheet.dots.map((p) => down(sheet, p.at))).toContainEqual([75, row(1)]);
  });

  it('並んだ極から枝を出すとき、別の網の線は重ならず交差もしない', () => {
    const d: Diagram = {
      devices: [
        { id: 'ELB1', type: 'mitsubishi.nf32-sv.3p', x: 0, y: 0 },
        { id: 'MC1', type: 'mitsubishi.s-t12.ac200v', x: 0, y: 0 },
        { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0 },
      ],
      wires: [W('W1', 'ELB1.2', 'MC1.1/L1', 'R1'), W('W2', 'ELB1.4', 'MC1.3/L2', 'S1'), W('W3', 'ELB1.2', 'CP1.1', 'R1'), W('W4', 'ELB1.4', 'CP1.3', 'S1')],
      schematic: {
        sheets: [
          {
            id: 'D1',
            name: '主回路',
            items: [
              { element: 'ELB1:main', x: 80, y: 30 },
              { element: 'MC1:main', x: 130, y: 30 },
              { element: 'CP1:main', x: 100, y: 75 },
            ],
          },
        ],
      },
    };
    const lines = linesOf(build(d).doc.sheets[0]);
    // R1 は x = 95、S1 は内側の x = 92.5 で下ろす（同じ x で重ねず、R1 の横の線とも交差しない）
    expect(lines).toContainEqual([
      [90, 30],
      [95, 30],
      [95, 75],
      [100, 75],
    ]);
    expect(lines).toContainEqual([
      [90, 35],
      [92.5, 35],
      [92.5, 80],
      [100, 80],
    ]);
  });

  it('コイルの反対側の端子へは、記号を横切らずに回り込む', () => {
    const d: Diagram = {
      devices: [
        { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0 },
        { id: 'MC1', type: 'mitsubishi.s-t12.ac200v', x: 0, y: 0 },
      ],
      wires: [W('W1', 'CP1.2', 'MC1.A1', 'R2'), W('W2', 'CP1.4', 'MC1.A2', 'S2')],
      schematic: { sheets: [{ id: 'D1', name: '1', items: [{ element: 'CP1:main', x: 80, y: 30 }, { element: 'MC1:A1-A2', x: 200, y: 30 }] }] },
    };
    const lines = linesOf(build(d).doc.sheets[0]);
    // A2（210, 30）へは、コイルの下（y = 35）を通ってから上がる
    expect(lines).toContainEqual([
      [90, 35],
      [215, 35],
      [215, 30],
      [210, 30],
    ]);
  });

  it('別のシートにある同じ網の端子は、その行番号を書く', () => {
    const s: Schematic = {
      sheets: [
        { id: 'D1', name: '1', items: [{ element: 'ES1:21-22', x: 60, y: row(1) }] },
        { id: 'D2', name: '2', items: [{ element: 'MC1:A1-A2', x: 330, y: row(3) }] },
      ],
    };
    const b = build(circuit(s));
    const perSheet = b.rowsOf("D1");
    expect(b.doc.sheets[0].texts.map((t) => t.text)).toContain(`→${perSheet + 3}`);
    expect(b.doc.sheets[1].texts.map((t) => t.text)).toContain('→1');
  });

  it('置いていない要素・置いた場所は elements でわかる', () => {
    const b = build(circuit(placed));
    expect(b.byId.get('MC1:21-22')?.placed).toBeUndefined();
    expect(b.byId.get('MC1:13-14')?.placed?.sheet).toBe('D1');
    expect(b.railCandidates.map((r) => r.ref)).toEqual(expect.arrayContaining(['PS1.+V1', 'PS1.-V1']));
  });
});

describe('展開図の配置の保存と読み込み', () => {
  it('図面 JSON に schematic として保存し、読み戻せる', () => {
    const d = circuit({ settings: { paper: 'A3' }, sheets: [{ ...placed.sheets[0], items: [{ element: 'MC1:A1-A2', x: 330.004, y: 30, rotation: 90 }] }] });
    const file = toDiagramFile(d);
    expect(file.schematic?.sheets[0].items[0]).toEqual({ element: 'MC1:A1-A2', x: 330, y: 30, rotation: 90 });
    const back = parseDiagram(JSON.stringify(file));
    expect(back.schematic).toEqual(file.schematic);
  });

  it('壊れた配置は読み飛ばし、同じ要素は 1 か所にだけ置く', () => {
    const back = parseDiagram({
      devices: [],
      schematic: {
        sheets: [
          { id: 'D1', items: [{ element: 'MC1:A1-A2', x: 1, y: 2 }, { element: 'MC1:A1-A2', x: 3, y: 4 }, { x: 1 }] },
          { id: 'D1', items: [] },
          { id: 'D2', items: [{ element: 'MC1:A1-A2', x: 5, y: 6, rotation: 45 }] },
        ],
      },
    });
    expect(back.schematic?.sheets.map((s) => [s.id, s.items.length])).toEqual([
      ['D1', 1],
      ['D2', 0],
    ]);
  });

  it('機器名の変更と機器の削除を配置に反映する', () => {
    const renamed = renameSchematicDevice(placed, 'MC1', 'KM1')!;
    expect(renamed.sheets[0].items.map((i) => i.element)).toContain('KM1:A1-A2');
    const pruned = pruneSchematic(placed, new Set(['PS1', 'ES1', 'PL1']))!;
    expect(pruned.sheets[0].items.map((i) => i.element)).toEqual(['ES1:21-22', 'PL1:X1-X2']);
    expect(pruneSchematic(placed, new Set(['PS1', 'ES1', 'MC1', 'PL1']))).toBe(placed);
    expect(pruneSchematic(placed, new Set(['ES1', 'MC1', 'PL1']))!.sheets[0].rails).toEqual({ supply: undefined, common: undefined, layout: 'sides' });
  });
});

import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram } from '../model/diagram';
import { autoLayout } from './autoLayout';
import { buildSchematic, ROW_PITCH, ROW_TOP } from './layout';
import { sampleDiagram } from '../model/sample';
import { paperOf, type Schematic } from './model';

const W = (id: string, from: string, to: string, wireNo?: string) => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'blue', sizeSq: 1.25, wireType: 'KIV', ...(wireNo ? { wireNo } : {}) };
};

/** 非常停止 → 押しボタン（自己保持）→ 電磁接触器のコイル、表示灯 → PLC のリレー出力 */
function circuit(schematic: Schematic): Diagram {
  return {
    devices: [
      { id: 'PS1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'ES1', type: 'idec.xw1e-bv402mr', x: 0, y: 0 },
      { id: 'PB1', type: 'idec.he1g-l21sm', x: 0, y: 0 },
      { id: 'MC1', type: 'mitsubishi.sd-t12.dc24v', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
      { id: 'Y1', type: 'mitsubishi.ry10r2', x: 0, y: 0 },
    ],
    wires: [
      W('W1', 'PS1.+V1', 'ES1.21', '1'),
      W('W2', 'ES1.22', 'PB1.1', '2'),
      W('W3', 'PB1.2', 'MC1.A1', '3'),
      W('W4', 'MC1.A2', 'PS1.-V1', 'N'),
      // 自己保持: MC1 13-14 を PB1 と並列に（14 側を PB1.1 につなぎ、逆向きにたどらせる）
      W('W5', 'PB1.1', 'MC1.14', '2'),
      W('W6', 'MC1.13', 'MC1.A1', '3'),
      W('W7', 'PS1.+V1', 'PL1.X1', '1'),
      W('W8', 'PL1.X2', 'Y1.Y00', 'Y00'),
      W('W9', 'Y1.COM', 'PS1.-V1', 'N'),
    ],
    schematic,
  };
}

const empty: Schematic = { sheets: [{ id: 'D1', name: '制御回路', rails: { supply: 'PS1.+V1', common: 'PS1.-V1', layout: 'sides' }, items: [] }] };
const row = (n: number) => ROW_TOP + (n - 1) * ROW_PITCH;

function run(s: Schematic) {
  const d = circuit(s);
  const b = buildSchematic(d, getDeviceDefinition);
  return autoLayout(b, s, 'D1', paperOf(s));
}

describe('展開図の自動配置', () => {
  it('コイル・出力ごとに段を組み、自己保持の枝は押しボタンの真下に置く', () => {
    const r = run(empty);
    const items = new Map(r.schematic.sheets[0].items.map((i) => [i.element, i]));
    expect(r.placed).toBe(6);
    // 1 段目: 非常停止 → 押しボタン → コイル（右端）
    expect(items.get('ES1:21-22')).toMatchObject({ x: 60, y: row(1) });
    expect(items.get('PB1:1-2')).toMatchObject({ x: 80, y: row(1) });
    expect(items.get('MC1:A1-A2')).toMatchObject({ x: 360, y: row(1) });
    // 自己保持: 押しボタンの真下の段。14 側から入るので端子を入れ替える
    expect(items.get('MC1:13-14')).toMatchObject({ x: 80, y: row(2), flip: true });
    // 表示灯 → PLC の出力（右端）
    expect(items.get('PL1:X1-X2')).toMatchObject({ x: 60, y: row(3) });
    expect(items.get('Y1:Y00')?.y).toBe(row(3));
  });

  it('並べた結果の線: 押しボタンと自己保持の接点が並列になり、分かれ目に黒丸が付く', () => {
    const s = run(empty).schematic;
    const out = buildSchematic(circuit(s), getDeviceDefinition).doc.sheets[0];
    const H = out.paper.height;
    const dots = out.dots.map((d) => [d.at[0], H - d.at[1]]);
    // ES1.22（70）から PB1.1（80）と、下の段の MC1.14（80）へ分かれる
    expect(dots).toContainEqual([75, row(1)]);
    // 端子番号は入れ替えた向きで書く（左が 14）
    const hold = out.inserts.find((i) => i.element === 'MC1:13-14')!;
    expect(hold.attributes).toMatchObject({ T1: '14', T2: '13' });
  });

  it('置いた記号は動かさず、2 回目は置くものがない', () => {
    const first = run(empty).schematic;
    const again = run(first);
    expect(again.placed).toBe(0);
    expect(again.message).toContain('配置済み');
    expect(again.schematic).toBe(first);
  });

  it('電源側の母線がないシートは主回路として並べる（主回路の機器がなければ並べない）', () => {
    const r = run({ sheets: [{ id: 'D1', name: '1', items: [] }] });
    expect(r.placed).toBe(0);
    expect(r.message).toContain('主回路');
  });

  it('主回路: 一次電源から縦に 1 列に並べ、制御電源の分岐は横向きで右に置く（サンプル図面）', () => {
    const s: Schematic = { sheets: [{ id: 'M', name: '主回路', items: [] }] };
    const d = { ...sampleDiagram, schematic: s };
    const r = autoLayout(buildSchematic(d, getDeviceDefinition), s, 'M', paperOf(s));
    const items = new Map(r.schematic.sheets[0].items.map((i) => [i.element, i]));
    for (const id of ['PS1:main', 'ELB1:main', 'MC1:main', 'THR1:main', 'M1:U-V-W']) expect(items.get(id)?.vertical, id).toBe(true);
    expect(items.get('CP1:main')?.vertical).toBeUndefined();
    expect(items.get('CP2:main')?.vertical).toBeUndefined();
    // 本線は上から一次電源 → ELB → MC → サーマル → 電動機の順。CP は ELB と MC の間の高さで右に
    const y = (id: string) => items.get(id)!.y;
    expect(y('PS1:main')).toBeLessThan(y('ELB1:main'));
    expect(y('ELB1:main')).toBeLessThan(y('CP1:main'));
    expect(y('CP2:main')).toBeLessThan(y('MC1:main'));
    expect(y('MC1:main')).toBeLessThan(y('THR1:main'));
    expect(y('THR1:main')).toBeLessThan(y('M1:U-V-W'));
    expect(items.get('CP1:main')!.x).toBeGreaterThan(items.get('ELB1:main')!.x + 15);
    // 線: R 相は電源から電動機まで x = 60 の縦の線でつながる
    const out = buildSchematic({ ...d, schematic: r.schematic }, getDeviceDefinition).doc.sheets[0];
    const H = out.paper.height;
    const verticalAt60 = out.polylines.filter((p) => p.layer === 'WIRE' && p.points.length === 2 && p.points.every((q) => q[0] === 60));
    expect(verticalAt60.length).toBeGreaterThanOrEqual(4);
    expect(out.inserts.find((i) => i.element === 'PS1:main')?.symbol).toBe('source-3p-v');
    expect(H).toBe(297);
  });

  it('主回路: 分岐の先（CP2 の二次側につながる電源ユニット）も、分岐の右に二次側の高さをそろえて置く（サンプル図面）', () => {
    const s: Schematic = { sheets: [{ id: 'M', name: '主回路', items: [] }] };
    const d = { ...sampleDiagram, schematic: s };
    const r = autoLayout(buildSchematic(d, getDeviceDefinition), s, 'M', paperOf(s));
    const items = new Map(r.schematic.sheets[0].items.map((i) => [i.element, i]));
    const psu = items.get('PSU1:main');
    expect(psu).toBeDefined();
    expect(psu!.x).toBeGreaterThan(items.get('CP2:main')!.x + 10);
    // 線: CP2 の二次側（2）から電源ユニットの L へ、まっすぐ横につながる
    const out = buildSchematic({ ...d, schematic: r.schematic }, getDeviceDefinition).doc.sheets[0];
    const line = out.polylines.find((l) => l.edge?.includes('CP2:main#2') && l.edge.includes('PSU1:main#'));
    expect(line).toBeDefined();
    expect(line!.points).toHaveLength(2);
  });

  it('3 線式センサーにつながる入力は、センサーの箱と入力の 1 段にする（サンプル図面）', () => {
    const s = sampleDiagram.schematic!;
    const b = buildSchematic(sampleDiagram, getDeviceDefinition);
    const r = autoLayout(b, s, 'D2', paperOf(s));
    const items = new Map(r.schematic.sheets.find((x) => x.id === 'D2')!.items.map((i) => [i.element, i]));
    const box = items.get('PH1:main');
    const input = items.get('IN1:CN1#1');
    expect(box?.x).toBe(60);
    expect(input).toBeDefined();
    // 入力は、センサーの出力（BK）の端子と同じ高さに置く
    const out = buildSchematic({ ...sampleDiagram, schematic: r.schematic }, getDeviceDefinition).doc.sheets.find((x) => x.id === 'D2')!;
    const ins = out.inserts.find((i) => i.element === 'IN1:CN1#1')!;
    const bk = out.polylines.find((p) => p.points.some((q) => q[0] === ins.at[0] && q[1] === ins.at[1]));
    expect(bk?.points.every((q) => q[1] === ins.at[1])).toBe(true);
  });
});

describe('ソース出力（PNP）の段', () => {
  /** +24V → 出力ユニットの COM、出力 0 → 表示灯 → 0V */
  const pnp = (schematic: Schematic): Diagram => ({
    devices: [
      { id: 'PS1', type: 'generic.psu.dc24v', x: 0, y: 0 },
      { id: 'OUT1', type: 'keyence.kv-b16tcp', x: 0, y: 0 },
      { id: 'PL1', type: 'generic.pilot-lamp.dc24v', x: 0, y: 0 },
    ],
    wires: [W('W1', 'PS1.+V1', 'OUT1.C0', 'P24'), W('W2', 'OUT1.0', 'PL1.X1', 'R000'), W('W3', 'PL1.X2', 'PS1.-V1', 'N24')],
    schematic,
  });

  it('ソース出力の出力点は、端子を右に出す記号（plc-out-src）になる', () => {
    const b = buildSchematic(pnp(empty), getDeviceDefinition);
    expect(b.byId.get('OUT1:0')?.element.symbol).toBe('plc-out-src');
  });

  it('自動配置で、出力点を段の左、表示灯を段の右に置き、表示灯から戻り側の母線へつなぐ', () => {
    const b = buildSchematic(pnp(empty), getDeviceDefinition);
    const r = autoLayout(b, empty, 'D1', paperOf(empty));
    const items = new Map(r.schematic.sheets[0].items.map((i) => [i.element, i]));
    const out = items.get('OUT1:0')!;
    const lamp = items.get('PL1:X1-X2')!;
    expect(out.y).toBe(lamp.y);
    expect(out.x).toBeLessThan(lamp.x);
    // 線: 出力点 → 表示灯 → 戻り側の母線
    const sheet = buildSchematic(pnp(r.schematic), getDeviceDefinition).doc.sheets[0];
    expect(sheet.polylines.some((l) => l.edge?.includes('OUT1:0#1') && l.edge.includes('PL1:X1-X2#1'))).toBe(true);
    expect(sheet.polylines.some((l) => l.edge?.includes('rail:common') && l.edge.includes('PL1:X1-X2#2'))).toBe(true);
  });
});

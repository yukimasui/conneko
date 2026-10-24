import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { ParamValues } from '../devices/types';
import { linkSidesOf, wireLayout, wirePoints } from '../editor/geometry';
import type { Point } from '../editor/routing';
import { linkShape } from '../devices/link';
import { deviceSize } from '../devices/types';
import { alignableLinkCount, alignLinks, alignLinksAs, LINK_PITCH, setLinkOrientation, verticalLinkCounts } from './alignLinks';
import type { Diagram } from './diagram';

const lookup = getDeviceDefinition;

/** PCON-CB の電源コネクタ（左向き、ピッチ 7px）の端子に、ばらばらの位置のリンクをつないだ図 */
function pconWithLinks(): Diagram {
  const links: [string, string, number, number][] = [
    ['BK', 'P24', 260, 250],
    ['S1', 'S1', 240, 325],
    ['S2', 'S2', 150, 390],
    ['MPI', 'P24', 100, 515],
    ['MPO', 'P24', 175, 600],
    ['0V', 'N24', 195, 675],
    ['24V', 'P24', 280, 770],
    ['EMG-', 'P24', 300, 840],
  ];
  return {
    devices: [
      { id: 'PCON1', type: 'iai.pcon-cb', x: 640, y: 40 },
      ...links.map(([, name, x, y], i) => ({ id: `LK${i + 1}`, type: 'generic.link', x, y, params: { name, side: 'auto' } })),
      // FG はリンクではなく機器につなぐ（動かさない）
      { id: 'X1', type: 'generic.link', x: 900, y: 360, params: { name: 'FG', side: 'right' } },
    ],
    wires: [
      ...links.map(([t, name], i) => ({
        id: `W${i + 1}`,
        from: { device: 'PCON1', terminal: t },
        to: { device: `LK${i + 1}`, terminal: 'T' },
        wireNo: name,
        color: 'blue',
        sizeSq: 0.75,
        wireType: 'KIV',
        ...(i === 1 ? { bend: 30, fromSide: 'left' as const } : {}),
      })),
    ],
  };
}

/** 図の電線の折れ線（画面と同じ計算） */
function routes(d: Diagram): Map<string, Point[]> {
  const base = new Map<string, ParamValues | undefined>(d.devices.map((x) => [x.id, x.params]));
  const sides = linkSidesOf(d.devices, d.wires, (id) => base.get(id), lookup);
  const paramsOf = (id: string) => (sides.has(id) ? { ...base.get(id), side: sides.get(id)! } : base.get(id));
  const { geometry, lanes } = wireLayout(d.devices, d.wires, paramsOf, lookup);
  return new Map(d.wires.map((w) => [w.id, wirePoints(w, geometry.get(w.id)!, lanes)]));
}

/** 直交の線分どうしが交差するか（端点どうしの接触は除く） */
function crosses(a: Point[], b: Point[]): boolean {
  for (let i = 1; i < a.length; i++) {
    for (let j = 1; j < b.length; j++) {
      const [p, q, r, s] = [a[i - 1], a[i], b[j - 1], b[j]];
      const aH = p.y === q.y;
      const bH = r.y === s.y;
      if (aH === bH) continue;
      const [h1, h2, v1, v2] = aH ? [p, q, r, s] : [r, s, p, q];
      const x = v1.x;
      const y = h1.y;
      if (x > Math.min(h1.x, h2.x) && x < Math.max(h1.x, h2.x) && y > Math.min(v1.y, v2.y) && y < Math.max(v1.y, v2.y)) return true;
    }
  }
  return false;
}

describe('alignLinks', () => {
  it('端子につないだリンクの数を数える（ほかの機器ともつないだリンクは除く）', () => {
    expect(alignableLinkCount(pconWithLinks(), 'PCON1', lookup)).toBe(8);
    expect(alignableLinkCount(pconWithLinks(), 'LK1', lookup)).toBe(0);
  });

  it('リンクを端子の並び順のまま、機器の左に一列に並べる', () => {
    const d = alignLinks(pconWithLinks(), 'PCON1', lookup);
    // 端子の上からの順（BK・S1・S2・MPI・MPO・24V・0V・EMG-）
    const links = ['LK1', 'LK2', 'LK3', 'LK4', 'LK5', 'LK7', 'LK6', 'LK8'].map((id) => d.devices.find((x) => x.id === id)!);
    expect(new Set(links.map((l) => l.x)).size).toBe(1);
    expect(links[0].x + 110).toBeLessThan(640);
    for (let i = 1; i < links.length; i++) expect(links[i].y - links[i - 1].y).toBeGreaterThanOrEqual(LINK_PITCH - 1);
    // 列の中心は端子（y = 40 + 266〜315）の中心
    const mid = (links[0].y + links[7].y) / 2 + 15;
    expect(Math.abs(mid - (40 + (266 + 315) / 2))).toBeLessThan(2);
    expect(links.every((l) => l.params?.side === 'auto')).toBe(true);
    // 手で曲げた経路・向きの指定は自動に戻す
    const w2 = d.wires.find((w) => w.id === 'W2')!;
    expect(w2.bend).toBeUndefined();
    expect(w2.fromSide).toBeUndefined();
    // つないでいないリンクは動かさない
    expect(d.devices.find((x) => x.id === 'X1')).toMatchObject({ x: 900, y: 360 });
  });

  it('並べたあとの電線は交差しない', () => {
    const before = routes(pconWithLinks());
    const after = routes(alignLinks(pconWithLinks(), 'PCON1', lookup));
    const count = (r: Map<string, Point[]>) => {
      const ps = [...r.values()];
      let n = 0;
      for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) if (crosses(ps[i], ps[j])) n++;
      return n;
    };
    expect(count(before)).toBeGreaterThan(0);
    expect(count(after)).toBe(0);
  });

  it('右向きの端子のリンクは機器の右に並べる', () => {
    const d: Diagram = {
      devices: [
        { id: 'PCON1', type: 'iai.pcon-cb', x: 0, y: 0 },
        { id: 'LK1', type: 'generic.link', x: -300, y: 500, params: { name: 'FG' } },
      ],
      wires: [{ id: 'W1', from: { device: 'LK1', terminal: 'T' }, to: { device: 'PCON1', terminal: 'FG' }, color: 'green', sizeSq: 2, wireType: 'KIV' }],
    };
    const lk = alignLinks(d, 'PCON1', lookup).devices.find((x) => x.id === 'LK1')!;
    expect(lk.x).toBeGreaterThan(70);
    expect(lk.y + 15).toBe(328);
  });

  it('下向きの端子のリンクは、端子の横にずらして縦に積み、L 字の電線が交差しない', () => {
    // 端子台（下向きの端子が 2 段）の端子にリンクをつなぐ
    const terms = ['1', '2', '3', '4', '5', '6'];
    const d: Diagram = {
      devices: [
        { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
        ...terms.map((t, i) => ({ id: `LK${i + 1}`, type: 'generic.link', x: 600 - i * 90, y: 400 + ((i * 7) % 5) * 60, params: { name: `L${t}` } })),
      ],
      wires: terms.map((t, i) => ({ id: `W${i + 1}`, from: { device: 'TB1', terminal: t }, to: { device: `LK${i + 1}`, terminal: 'T' }, color: 'blue', sizeSq: 0.75, wireType: 'KIV' })),
    };
    const after = alignLinks(d, 'TB1', lookup);
    const r = routes(after);
    // すべて L 字（角 1 つ）
    expect([...r.values()].every((ps) => ps.length === 3)).toBe(true);
    const ps = [...r.values()];
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) expect(crosses(ps[i], ps[j])).toBe(false);
    // リンクどうしは重ならない
    const boxes = after.devices.filter((x) => x.type === 'generic.link').map((l) => [l.x, l.y, l.x + 110, l.y + 30]);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        expect(a[0] < b[2] && b[0] < a[2] && a[1] < b[3] && b[1] < a[3]).toBe(false);
      }
  });
});

/** 34 極の MIL 変換端子台の全端子（下向き、千鳥で x のピッチ約 5px）に、ばらばらの位置のリンクをつないだ図 */
function milWithLinks(n = 34): Diagram {
  const terms = Array.from({ length: n }, (_, i) => String(i + 1));
  return {
    devices: [
      { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      ...terms.map((t, i) => ({ id: `LK${i + 1}`, type: 'generic.link', x: 600 - (i % 6) * 90, y: 400 + ((i * 7) % 5) * 60, params: { name: `X${t}` } })),
    ],
    wires: terms.map((t, i) => ({ id: `W${i + 1}`, from: { device: 'TB1', terminal: t }, to: { device: `LK${i + 1}`, terminal: 'T' }, color: 'blue', sizeSq: 0.3, wireType: 'KIV' })),
  };
}

/** 折れ線が箱（リンクの外形）の中を通るか */
function passesThrough(ps: Point[], box: [number, number, number, number]): boolean {
  const [x0, y0, x1, y1] = box;
  for (let i = 1; i < ps.length; i++) {
    const [p, q] = [ps[i - 1], ps[i]];
    const [lx, hx, ly, hy] = [Math.min(p.x, q.x), Math.max(p.x, q.x), Math.min(p.y, q.y), Math.max(p.y, q.y)];
    if (lx < x1 && hx > x0 && ly < y1 && hy > y0) return true;
  }
  return false;
}

describe('縦のリンク', () => {
  const def = lookup('generic.link')!;

  it('縦のリンクは細長く、上か下で電線をつなぐ。上下を選ぶと縦、左右を選ぶと横になる', () => {
    expect(deviceSize(def, { orientation: 'vertical' })).toEqual({ width: 18, height: 90 });
    expect(deviceSize(def, {})).toEqual({ width: 110, height: 30 });
    const t = (p: ParamValues) => (typeof def.terminals === 'function' ? def.terminals({ ...p }) : def.terminals)[0];
    expect(t({ orientation: 'vertical', side: 'top' })).toMatchObject({ side: 'top', x: 9, y: 1 });
    expect(t({ orientation: 'vertical', side: 'auto' })).toMatchObject({ side: 'bottom', y: 89 });
    expect(t({ side: 'bottom' })).toMatchObject({ side: 'bottom' });
    expect(linkShape({ orientation: 'vertical', side: 'right' })).toEqual({ vertical: false, side: 'right' });
    // 絵は横の絵を回したもの（名前を書く）
    const svg = typeof def.svg === 'function' ? def.svg({ name: 'X000', orientation: 'vertical', side: 'top' }) : '';
    expect(svg).toContain('rotate(-90)');
    expect(svg).toContain('X000');
  });

  it('向きが「自動」の縦のリンクは、相手の端子のある側（上か下）に向く', () => {
    const d: Diagram = {
      devices: [
        { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
        { id: 'LK1', type: 'generic.link', x: 40, y: 300, params: { name: 'A', orientation: 'vertical', side: 'auto' } },
        { id: 'LK2', type: 'generic.link', x: 40, y: -300, params: { name: 'B', orientation: 'vertical', side: 'auto' } },
      ],
      wires: [
        { id: 'W1', from: { device: 'TB1', terminal: '1' }, to: { device: 'LK1', terminal: 'T' }, color: 'blue', sizeSq: 0.3, wireType: 'KIV' },
        { id: 'W2', from: { device: 'TB1', terminal: '2' }, to: { device: 'LK2', terminal: 'T' }, color: 'blue', sizeSq: 0.3, wireType: 'KIV' },
      ],
    };
    const sides = linkSidesOf(d.devices, d.wires, (id) => d.devices.find((x) => x.id === id)?.params, lookup);
    expect(sides.get('LK1')).toBe('top');
    expect(sides.get('LK2')).toBe('bottom');
  });

  it('向きを切り替えても中心の位置は変わらず、つなぐ側の指定は 左 ↔ 上・右 ↔ 下に移る', () => {
    const d: Diagram = {
      devices: [
        { id: 'LK1', type: 'generic.link', x: 100, y: 200, params: { name: 'A', side: 'right' } },
        { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
      ],
      wires: [],
    };
    const v = setLinkOrientation(d, ['LK1', 'TB1'], true, lookup);
    const lk = v.devices.find((x) => x.id === 'LK1')!;
    expect(lk.params).toMatchObject({ orientation: 'vertical', side: 'bottom' });
    expect([lk.x + 9, lk.y + 45]).toEqual([155, 215]);
    // リンク以外は変えない
    expect(v.devices.find((x) => x.id === 'TB1')).toBe(d.devices[1]);
    const h = setLinkOrientation(v, ['LK1'], false, lookup).devices.find((x) => x.id === 'LK1')!;
    expect(h).toMatchObject({ x: 100, y: 200, params: { orientation: 'horizontal', side: 'right' } });
  });

  it('上下の端子のリンクを縦にして、端子の下に一列に並べる（リンクは重ならず、電線は交差せず、ほかのリンクを横切らない）', () => {
    const d = milWithLinks();
    expect(verticalLinkCounts(d, 'TB1', lookup)).toEqual({ vertical: 0, horizontal: 34 });
    const after = alignLinksAs(d, 'TB1', true, lookup);
    expect(verticalLinkCounts(after, 'TB1', lookup)).toEqual({ vertical: 34, horizontal: 0 });
    const links = after.devices.filter((x) => x.type === 'generic.link');
    expect(links.every((l) => l.params?.orientation === 'vertical' && l.params?.side === 'auto')).toBe(true);
    // 一列（同じ高さ）で、端子台の下
    const tb = deviceSize(lookup('generic.mil-terminal-block.34p')!, {});
    expect(new Set(links.map((l) => l.y)).size).toBe(1);
    expect(links[0].y).toBeGreaterThan(tb.height);
    // 端子の番号順（左から）と同じ並び
    const resolved = lookup('generic.mil-terminal-block.34p')!;
    const tx = (t: string) => (typeof resolved.terminals === 'function' ? resolved.terminals({}) : resolved.terminals).find((x) => x.id === t)!.x;
    const order = [...links].sort((a, b) => a.x - b.x).map((l) => l.id);
    const want = [...links].sort((a, b) => tx(a.params!.name!.toString().slice(1)) - tx(b.params!.name!.toString().slice(1))).map((l) => l.id);
    expect(order).toEqual(want);
    const boxes = links.map((l) => [l.x, l.y, l.x + 18, l.y + 90] as [number, number, number, number]);
    for (let i = 0; i < boxes.length; i++)
      for (let j = i + 1; j < boxes.length; j++) {
        const [a, b] = [boxes[i], boxes[j]];
        expect(a[0] < b[2] && b[0] < a[2]).toBe(false);
      }
    const r = routes(after);
    const ps = after.wires.map((w) => r.get(w.id)!);
    for (let i = 0; i < ps.length; i++) for (let j = i + 1; j < ps.length; j++) expect(crosses(ps[i], ps[j])).toBe(false);
    // 電線はつないだリンクの端子から入り、ほかのリンクの中を通らない
    after.wires.forEach((w, i) => {
      boxes.forEach((b, j) => {
        if (links[j].id !== w.to.device) expect(passesThrough(ps[i], b)).toBe(false);
      });
    });
  });

  it('端子の間隔が広ければ、縦のリンクは端子の真下に置き、電線はまっすぐ下ろす', () => {
    // 端子台の奥の段（奇数、ピッチ約 10px）から 1 つおきに 4 本 → 間隔約 20px でリンクの幅 + 隙間（24px）に足りないので、2 つおきの 3 本
    const terms = ['1', '7', '13'];
    const d: Diagram = {
      devices: [
        { id: 'TB1', type: 'generic.mil-terminal-block.34p', x: 0, y: 0 },
        ...terms.map((t, i) => ({ id: `LK${i + 1}`, type: 'generic.link', x: 300, y: 300 + i * 50, params: { name: `L${t}`, orientation: 'vertical' } })),
      ],
      wires: terms.map((t, i) => ({ id: `W${i + 1}`, from: { device: 'TB1', terminal: t }, to: { device: `LK${i + 1}`, terminal: 'T' }, color: 'blue', sizeSq: 0.3, wireType: 'KIV' })),
    };
    const after = alignLinks(d, 'TB1', lookup);
    const r = routes(after);
    for (const w of after.wires) {
      const ps = r.get(w.id)!;
      expect(ps.length).toBe(2);
      expect(ps[0].x).toBeCloseTo(ps[1].x, 0);
    }
  });

  it('左右の端子の縦のリンクは、横のリンクにして機器の横に並べる', () => {
    const d: Diagram = {
      devices: [
        { id: 'PCON1', type: 'iai.pcon-cb', x: 0, y: 0 },
        { id: 'LK1', type: 'generic.link', x: -300, y: 500, params: { name: 'FG', orientation: 'vertical' } },
      ],
      wires: [{ id: 'W1', from: { device: 'LK1', terminal: 'T' }, to: { device: 'PCON1', terminal: 'FG' }, color: 'green', sizeSq: 2, wireType: 'KIV' }],
    };
    const lk = alignLinks(d, 'PCON1', lookup).devices.find((x) => x.id === 'LK1')!;
    expect(lk.params).toMatchObject({ orientation: 'horizontal', side: 'auto' });
    expect(lk.y + 15).toBe(328);
  });
});

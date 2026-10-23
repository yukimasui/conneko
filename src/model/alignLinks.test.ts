import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import type { ParamValues } from '../devices/types';
import { linkSidesOf, wireLayout, wirePoints } from '../editor/geometry';
import type { Point } from '../editor/routing';
import { alignableLinkCount, alignLinks, LINK_PITCH } from './alignLinks';
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
});

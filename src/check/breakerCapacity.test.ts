/**
 * 遮断器の電流の余裕（breaker-capacity）: 同時に使う機器（工程）ごとの電流の合計と、モーターの始動電流の山。
 */
import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { parseDiagram, renameOperationDevice, toDiagramFile, type Diagram, type DiagramWire, type OperationStep } from '../model/diagram';
import { checkDiagram } from './checkDiagram';
import { diagramCurrentMargins } from './protection';

let seq = 0;
const w = (from: string, to: string): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id: `W${++seq}`, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 5.5, wireType: 'IV' };
};
const lookup = (t: string) => getDeviceDefinition(t);

/** 三相 200V → 遮断器 CB1（20A）→ モーター M1（8A）・M2（8A）、CB1 → CP1（3A）→ ファン FAN1 */
const plant = (operation?: OperationStep[]): Diagram => ({
  devices: [
    { id: 'SRC', type: 'generic.power-source.3p200v', x: 0, y: 0 },
    { id: 'CB1', type: 'mitsubishi.nf32-sv.3p', x: 0, y: 0, params: { ratedCurrent: 20 } },
    { id: 'M1', type: 'generic.motor.3p', x: 0, y: 0, params: { ratedCurrent: 8 } },
    { id: 'M2', type: 'generic.motor.3p', x: 0, y: 0, params: { ratedCurrent: 8 } },
    { id: 'CP1', type: 'mitsubishi.cp30-ba.2p', x: 0, y: 0, params: { ratedCurrent: 3 } },
    { id: 'FAN1', type: 'generic.panel-fan.ac200v', x: 0, y: 0 },
  ],
  wires: [
    w('SRC.R', 'CB1.1'),
    w('SRC.S', 'CB1.3'),
    w('SRC.T', 'CB1.5'),
    ...['M1', 'M2'].flatMap((m) => [w('CB1.2', `${m}.U`), w('CB1.4', `${m}.V`), w('CB1.6', `${m}.W`)]),
    w('CB1.2', 'CP1.1'),
    w('CB1.4', 'CP1.3'),
    w('CP1.2', 'FAN1.L1'),
    w('CP1.4', 'FAN1.L2'),
  ],
  ...(operation ? { settings: { operation } } : {}),
});

const fanCurrent = () => diagramCurrentMargins(plant(), lookup).find((m) => m.protector.id === 'CP1')!.steps[0].current;
const capacity = (d: Diagram) => checkDiagram(d, lookup).filter((i) => i.rule === 'breaker-capacity');

describe('遮断器の下流の負荷', () => {
  it('遮断器ごとに、極から下流へたどった機器の電流を集める（下流の遮断器の先も数える）', () => {
    const margins = diagramCurrentMargins(plant(), lookup);
    const cb1 = margins.find((m) => m.protector.id === 'CB1')!;
    expect(cb1.protector.devices).toEqual(['M1', 'M2', 'FAN1']);
    // R 相（極 2）は M1・M2・FAN1、T 相（極 6）は M1・M2 だけ
    expect(cb1.protector.poles.find((p) => p.terminal === '2')!.loads.map((x) => x.device)).toEqual(['M1', 'M2', 'FAN1']);
    expect(cb1.protector.poles.find((p) => p.terminal === '6')!.loads.map((x) => x.device)).toEqual(['M1', 'M2']);
    expect(fanCurrent()).toBeGreaterThan(0);
    expect(cb1.steps[0].current).toBe(16 + fanCurrent());
    const cp1 = margins.find((m) => m.protector.id === 'CP1')!;
    expect(cp1.protector.devices).toEqual(['FAN1']);
  });

  it('工程を書いていなければすべて同時とみなし、最初に動き始めるモーターの始動電流（6 倍）の山を加える', () => {
    const cb1 = diagramCurrentMargins(plant(), lookup).find((m) => m.protector.id === 'CB1')!;
    expect(cb1.assumed).toBe(true);
    expect(cb1.steps).toHaveLength(1);
    expect(cb1.steps[0].starting).toEqual(['M1', 'M2']);
    expect(cb1.steps[0].peak).toBeCloseTo(16 * 6 + fanCurrent(), 3);
  });

  it('工程ごとに、止まっている機器を除いて足す。前の工程で止まっていたモーターだけが動き始めの山になる', () => {
    const steps: OperationStep[] = [
      { name: '待機', seconds: 5, off: ['M1', 'M2'] },
      { name: '搬送', seconds: 10, off: ['M2'] },
      { name: '全開', seconds: 10 },
    ];
    const cb1 = diagramCurrentMargins(plant(steps), lookup).find((m) => m.protector.id === 'CB1')!;
    expect(cb1.assumed).toBe(false);
    expect(cb1.steps.map((s) => s.start)).toEqual([0, 5, 15]);
    expect(cb1.steps.map((s) => s.starting)).toEqual([[], ['M1'], ['M2']]);
    expect(cb1.steps[0].current).toBe(fanCurrent());
    expect(cb1.steps[1].peak).toBeCloseTo(8 * 6 + fanCurrent(), 3);
    expect(cb1.steps[2].current).toBeCloseTo(16 + fanCurrent(), 3);
    expect(cb1.steps[2].peak).toBeCloseTo(8 + 8 * 6 + fanCurrent(), 3);
  });
});

describe('breaker-capacity', () => {
  it('定格以内なら指摘なし', () => {
    expect(capacity(plant())).toEqual([]);
  });

  it('工程を書いていないとき、すべて同時で定格を超えれば info で知らせる', () => {
    const d = plant();
    d.devices.find((x) => x.id === 'M2')!.params = { ratedCurrent: 15 };
    const issues = capacity(d);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toMatch(/^CB1: 下流の負荷をすべて同時に使うと、電流の合計 .*A が定格 20A を超えます/);
  });

  it('工程で同時に使うと定格を超えるなら警告。工程を分ければ指摘なし', () => {
    const d = plant([{ name: '全開', seconds: 10 }]);
    d.devices.find((x) => x.id === 'M2')!.params = { ratedCurrent: 15 };
    const issues = capacity(d);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('warning');
    expect(issues[0].message).toMatch(/^CB1: 工程「全開」で電流の合計 .*A が定格 20A を超えています（M1 8A、M2 15A/);
    const split = plant([
      { name: 'M1 だけ', seconds: 10, off: ['M2'] },
      { name: 'M2 だけ', seconds: 10, off: ['M1'] },
    ]);
    split.devices.find((x) => x.id === 'M2')!.params = { ratedCurrent: 15 };
    expect(capacity(split)).toEqual([]);
  });

  it('工程を書いたとき、定格の 80% を超えれば余裕が少ないと info で知らせる', () => {
    const d = plant([{ name: '全開', seconds: 10 }]);
    d.devices.find((x) => x.id === 'M2')!.params = { ratedCurrent: 9 };
    const issues = capacity(d);
    expect(issues).toHaveLength(1);
    expect(issues[0].severity).toBe('info');
    expect(issues[0].message).toMatch(/余裕が 20% 未満/);
  });
});

describe('工程の保存', () => {
  it('保存して読み戻せる。秒のない工程は 10 秒、名前のない工程は「工程n」', () => {
    const d = plant([{ name: '搬送', seconds: 12, off: ['M2'] }]);
    expect(parseDiagram(JSON.stringify(toDiagramFile(d))).settings?.operation).toEqual([{ name: '搬送', seconds: 12, off: ['M2'] }]);
    const raw = { ...toDiagramFile(plant()), settings: { operation: [{ off: ['M1', 'M1', 3] }, 'x'] } };
    expect(parseDiagram(JSON.stringify(raw)).settings?.operation).toEqual([{ name: '工程1', seconds: 10, off: ['M1'] }]);
  });

  it('機器名を変えると、止まっている機器の ID も付け替える', () => {
    const s = renameOperationDevice({ operation: [{ name: 'a', seconds: 1, off: ['M1', 'M2'] }] }, 'M1', 'M10');
    expect(s.operation![0].off).toEqual(['M10', 'M2']);
  });
});

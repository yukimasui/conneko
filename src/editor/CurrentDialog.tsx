import { useMemo, useState } from 'react';
import { diagramCurrentMargins, MARGIN_RATIO, type CurrentMargin } from '../check/protection';
import { getDeviceDefinition } from '../devices/registry';
import type { Diagram, DiagramSettings, OperationStep } from '../model/diagram';

interface Props {
  diagram: Diagram;
  settings: DiagramSettings;
  onSettings: (patch: Partial<DiagramSettings>) => void;
  onClose: () => void;
}

const fmt = (n: number) => String(Math.round(n * 100) / 100);

/**
 * 電流の余裕（概算）: 運転の工程（同時に使う機器）を決め、遮断器ごとに工程ごとの電流の合計と始動電流の山をグラフにして、定格と比べる
 */
export function CurrentDialog({ diagram, settings, onSettings, onClose }: Props) {
  const margins = useMemo(() => diagramCurrentMargins(diagram, getDeviceDefinition), [diagram]);
  const steps = settings.operation ?? [];
  const setSteps = (next: OperationStep[]) => onSettings({ operation: next.length ? next : undefined });

  // 工程の表に並べる機器（どれかの遮断器の下流で電流のある機器）と、その電流
  const loads = useMemo(() => {
    const out = new Map<string, number>();
    for (const m of margins) for (const p of m.protector.poles) for (const l of p.loads) out.set(l.device, Math.max(out.get(l.device) ?? 0, l.current));
    const order = diagram.devices.map((d) => d.id);
    return [...out].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0]));
  }, [margins, diagram]);

  const patchStep = (i: number, patch: Partial<OperationStep>) => setSteps(steps.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const toggle = (i: number, device: string) => {
    const off = steps[i].off ?? [];
    const next = off.includes(device) ? off.filter((d) => d !== device) : [...off, device];
    patchStep(i, { off: next.length ? next : undefined });
  };
  const addStep = () => setSteps([...steps, { name: `工程${steps.length + 1}`, seconds: 10 }]);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal current-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>電流の余裕（概算）</h2>
        <p className="muted small">
          運転の工程ごとに、同時に動いている機器の電流を遮断器ごとに足して、定格と比べます。モーターは動き始めに定格の数倍の始動電流が流れるので、山として描きます。
          電流は機器の定格・代表値からの概算です。
        </p>

        <section>
          <h3>工程（同時に使う機器）</h3>
          {loads.length === 0 ? (
            <p className="muted small">遮断器・サーキットプロテクタの下流に、電流の分かる機器がありません。</p>
          ) : (
            <div className="current-dialog__table-wrap">
              <table className="current-dialog__table">
                <thead>
                  <tr>
                    <th>機器</th>
                    <th className="num">電流</th>
                    {steps.map((s, i) => (
                      <th key={i} className="current-dialog__step">
                        <input aria-label="工程の名前" value={s.name} onChange={(e) => patchStep(i, { name: e.target.value })} />
                        <span className="current-dialog__seconds">
                          <input
                            aria-label="工程の時間（秒）"
                            type="number"
                            min={0.1}
                            step={0.5}
                            value={s.seconds}
                            onChange={(e) => {
                              const v = Number(e.target.value);
                              if (v > 0) patchStep(i, { seconds: v });
                            }}
                          />
                          秒
                        </span>
                        <button type="button" className="current-dialog__remove" title="この工程を消す" aria-label="この工程を消す" onClick={() => setSteps(steps.filter((_, j) => j !== i))}>
                          ×
                        </button>
                      </th>
                    ))}
                    <th>
                      <button type="button" onClick={addStep}>
                        ＋ 工程
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {loads.map(([id, current]) => (
                    <tr key={id}>
                      <td>{id}</td>
                      <td className="num">{fmt(current)}A</td>
                      {steps.map((s, i) => (
                        <td key={i} className="current-dialog__cell">
                          <input type="checkbox" aria-label={`${s.name} で ${id} を使う`} checked={!s.off?.includes(id)} onChange={() => toggle(i, id)} />
                        </td>
                      ))}
                      <td />
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {steps.length === 0 && loads.length > 0 && <p className="muted small">工程を作っていないので、すべての機器を同時に使うとして計算しています。「＋ 工程」で、工程ごとに動いている機器を選べます。</p>}
        </section>

        <section>
          <h3>遮断器ごとの電流</h3>
          {margins.length === 0 && <p className="muted small">下流に負荷のある遮断器がありません。</p>}
          {margins.map((m) => (
            <ProtectorChart key={m.protector.id} margin={m} />
          ))}
        </section>

        <div className="modal__actions">
          <button type="button" className="primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

/** グラフの大きさ[px] */
const W = 640;
const H = 170;
const PAD = { left: 40, right: 12, top: 12, bottom: 26 };

/** 目盛りのきりのよい間隔 */
function niceStep(max: number): number {
  const raw = max / 4;
  const p = 10 ** Math.floor(Math.log10(raw));
  return [1, 2, 2.5, 5, 10].map((k) => k * p).find((s) => s >= raw) ?? raw;
}

/** 1 つの遮断器の、工程ごとの電流（段の線）と始動電流の山、定格・80% の線 */
function ProtectorChart({ margin }: { margin: CurrentMargin }) {
  const { protector: p, steps } = margin;
  const [hover, setHover] = useState<number | null>(null);
  const total = steps.reduce((s, x) => s + x.seconds, 0) || 1;
  const maxCurrent = Math.max(...steps.map((s) => s.current));
  const maxPeak = Math.max(...steps.map((s) => s.peak));
  const step = niceStep(Math.max(p.rating * 1.15, maxPeak * 1.05));
  const yMax = Math.ceil(Math.max(p.rating * 1.15, maxPeak * 1.05) / step) * step;
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + (t / total) * plotW;
  const y = (a: number) => PAD.top + plotH - (a / yMax) * plotH;

  // 段の線: 工程の始めに山（始動電流）があれば、その時間だけ高くする（細すぎて見えないときは 4px）
  const pts: [number, number][] = [];
  for (const s of steps) {
    const x0 = x(s.start);
    const x1 = x(s.start + s.seconds);
    if (s.peak > s.current) {
      const xp = Math.min(x1, Math.max(x0 + 4, x(s.start + s.peakSeconds)));
      pts.push([x0, y(s.peak)], [xp, y(s.peak)], [xp, y(s.current)]);
    } else pts.push([x0, y(s.current)]);
    pts.push([x1, y(s.current)]);
  }
  const line = pts.map(([a, b], i) => `${i ? 'L' : 'M'}${a.toFixed(1)},${b.toFixed(1)}`).join(' ');
  const area = `${line} L${x(total).toFixed(1)},${y(0).toFixed(1)} L${x(0).toFixed(1)},${y(0).toFixed(1)} Z`;
  const ticks: number[] = [];
  for (let v = 0; v <= yMax + 1e-9; v += step) ticks.push(Math.round(v * 1000) / 1000);
  const peakStep = steps.find((s) => s.peak === maxPeak && s.peak > s.current);
  const over = maxCurrent > p.rating;
  const ratio = maxCurrent / p.rating;
  const h = hover !== null ? steps[hover] : null;

  return (
    <div className="current-chart">
      <div className="current-chart__head">
        <strong>{p.id}</strong>
        <span className="muted">定格 {fmt(p.rating)}A</span>
        <span className={`current-chart__status ${over ? 'is-over' : ratio > MARGIN_RATIO ? 'is-tight' : 'is-ok'}`}>
          <span aria-hidden="true">{over ? '⚠' : ratio > MARGIN_RATIO ? '!' : '✓'}</span>
          {over
            ? `定格を超えています（最大 ${fmt(maxCurrent)}A・定格の ${Math.round(ratio * 100)}%）`
            : `最大 ${fmt(maxCurrent)}A・定格の ${Math.round(ratio * 100)}%（余裕 ${fmt(p.rating - maxCurrent)}A）`}
        </span>
        {maxPeak > maxCurrent && <span className="muted">始動時の山 {fmt(maxPeak)}A</span>}
        {margin.assumed && <span className="muted">（すべて同時とみなした）</span>}
      </div>
      <div className="current-chart__plot">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={`${p.id} の工程ごとの電流`}>
          {ticks.map((v) => (
            <g key={v}>
              <line x1={PAD.left} x2={W - PAD.right} y1={y(v)} y2={y(v)} className="current-chart__grid" />
              <text x={PAD.left - 6} y={y(v)} className="current-chart__tick" textAnchor="end" dominantBaseline="middle">
                {v}A
              </text>
            </g>
          ))}
          {steps.map((s, i) => (
            <g key={i}>
              {i > 0 && <line x1={x(s.start)} x2={x(s.start)} y1={PAD.top} y2={y(0)} className="current-chart__grid" />}
              <text x={(x(s.start) + x(s.start + s.seconds)) / 2} y={H - 8} className="current-chart__tick" textAnchor="middle">
                {s.name}
              </text>
            </g>
          ))}
          <path d={area} className="current-chart__area" />
          <path d={line} className="current-chart__line" />
          <line x1={PAD.left} x2={W - PAD.right} y1={y(p.rating)} y2={y(p.rating)} className="current-chart__rating" />
          <text x={W - PAD.right} y={y(p.rating) - 4} className="current-chart__label" textAnchor="end">
            定格 {fmt(p.rating)}A
          </text>
          <line x1={PAD.left} x2={W - PAD.right} y1={y(p.rating * MARGIN_RATIO)} y2={y(p.rating * MARGIN_RATIO)} className="current-chart__tight" />
          <text x={W - PAD.right} y={y(p.rating * MARGIN_RATIO) - 4} className="current-chart__label" textAnchor="end">
            80%
          </text>
          {peakStep && (
            <text x={Math.min(x(peakStep.start) + 6, W - PAD.right - 60)} y={Math.max(y(peakStep.peak) - 5, PAD.top + 8)} className="current-chart__label">
              始動 {fmt(peakStep.peak)}A
            </text>
          )}
          {steps.map((s, i) => (
            <rect
              key={i}
              x={x(s.start)}
              y={PAD.top}
              width={Math.max(1, x(s.start + s.seconds) - x(s.start))}
              height={plotH}
              className="current-chart__hit"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover((v) => (v === i ? null : v))}
            />
          ))}
          {h && <line x1={x(h.start + h.seconds / 2)} x2={x(h.start + h.seconds / 2)} y1={PAD.top} y2={y(0)} className="current-chart__cursor" />}
        </svg>
        {h && (
          <div className="current-chart__tooltip" style={{ left: `${(x(h.start + h.seconds / 2) / W) * 100}%` }}>
            <strong>{h.name}</strong>（{fmt(h.seconds)} 秒）
            <div>
              電流 {fmt(h.current)}A{h.peak > h.current ? `・動き始め ${fmt(h.peak)}A（${h.starting.join('、')}）` : ''}
            </div>
            <div className="muted">{h.loads.length ? h.loads.map((l) => `${l.device} ${fmt(l.current)}A`).join('、') : '動いている機器なし'}</div>
          </div>
        )}
      </div>
      <details className="current-chart__details">
        <summary className="small muted">数値の表</summary>
        <table className="current-dialog__table">
          <thead>
            <tr>
              <th>工程</th>
              <th className="num">時間</th>
              <th className="num">電流</th>
              <th className="num">動き始めの山</th>
              <th>動いている機器</th>
            </tr>
          </thead>
          <tbody>
            {steps.map((s, i) => (
              <tr key={i}>
                <td>{s.name}</td>
                <td className="num">{fmt(s.seconds)} 秒</td>
                <td className="num">{fmt(s.current)}A</td>
                <td className="num">{s.peak > s.current ? `${fmt(s.peak)}A` : '—'}</td>
                <td>{s.loads.map((l) => l.device).join('、') || '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}

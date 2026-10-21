import { useEffect, useState } from 'react';
import { WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import { getDeviceDefinition } from '../devices/registry';
import type { CheckIssue } from '../check/checkDiagram';
import type { DeviceFlowNode, WireEdgeData, WireFlowEdge } from './flow';

export type WireDefaults = Pick<WireEdgeData, 'color' | 'sizeSq' | 'wireType'>;

interface Props {
  node?: DeviceFlowNode;
  edge?: WireFlowEdge;
  edges: WireFlowEdge[];
  issues: CheckIssue[];
  wireDefaults: WireDefaults;
  onWireDefaultsChange: (d: WireDefaults) => void;
  onRenameDevice: (oldId: string, newId: string) => string | null;
  onParamChange: (id: string, key: string, value: number | string) => void;
  onWireChange: (id: string, patch: Partial<WireEdgeData>) => void;
  onDelete: () => void;
}

function WireFields({ value, onChange }: { value: WireDefaults; onChange: (patch: Partial<WireDefaults>) => void }) {
  const type = WIRE_TYPES.find((t) => t.id === value.wireType);
  const sizes = type?.sizes ?? [value.sizeSq];
  return (
    <>
      <label className="field">
        <span>色</span>
        <div className="swatches">
          {WIRE_COLORS.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`swatch${c.id === value.color ? ' is-active' : ''}`}
              style={{ background: c.stripeHex ? `repeating-linear-gradient(45deg, ${c.hex} 0 5px, ${c.stripeHex} 5px 10px)` : c.hex }}
              title={c.name}
              onClick={() => onChange({ color: c.id })}
            />
          ))}
        </div>
      </label>
      <label className="field">
        <span>種類</span>
        <select
          value={value.wireType}
          onChange={(e) => {
            const next = WIRE_TYPES.find((t) => t.id === e.target.value);
            const sizeSq = next && !next.sizes.includes(value.sizeSq) ? next.sizes[Math.floor(next.sizes.length / 2)] : value.sizeSq;
            onChange({ wireType: e.target.value, sizeSq });
          }}
        >
          {WIRE_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}（{t.description}）
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>太さ</span>
        <select value={value.sizeSq} onChange={(e) => onChange({ sizeSq: Number(e.target.value) })}>
          {sizes.map((s) => (
            <option key={s} value={s}>
              {s} sq
            </option>
          ))}
        </select>
      </label>
    </>
  );
}

function IssueList({ issues }: { issues: CheckIssue[] }) {
  if (!issues.length) return <p className="muted">指摘はありません</p>;
  return (
    <ul className="mini-issues">
      {issues.map((i) => (
        <li key={i.key} className={`sev-${i.severity}`}>
          {i.message}
        </li>
      ))}
    </ul>
  );
}

function RenameField({ id, onRename }: { id: string; onRename: Props['onRenameDevice'] }) {
  const [value, setValue] = useState(id);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    setValue(id);
    setError(null);
  }, [id]);
  const commit = () => {
    if (value === id) return;
    const err = onRename(id, value.trim());
    setError(err);
    if (err) setValue(id);
  };
  return (
    <label className="field">
      <span>機器名</span>
      <input value={value} onChange={(e) => setValue(e.target.value)} onBlur={commit} onKeyDown={(e) => e.key === 'Enter' && commit()} />
      {error && <small className="error-text">{error}</small>}
    </label>
  );
}

export function Inspector(props: Props) {
  const { node, edge } = props;

  if (node) {
    const def = getDeviceDefinition(node.data.deviceType);
    const connected = new Set(
      props.edges.flatMap((e) => [
        e.source === node.id ? e.sourceHandle : null,
        e.target === node.id ? e.targetHandle : null,
      ]),
    );
    const issues = props.issues.filter((i) => i.devices.includes(node.id));
    return (
      <aside className="inspector">
        <div className="panel-title">機器</div>
        <RenameField id={node.id} onRename={props.onRenameDevice} />
        {def && (
          <>
            <div className="device-info">
              <div className="device-info__name">{def.name}</div>
              <div className="muted">
                {def.maker ? `${def.maker} ` : ''}
                {def.model}
              </div>
              {def.description && <p className="muted small">{def.description}</p>}
            </div>
            {def.params?.map((p) => (
              <label key={p.key} className="field">
                <span>{p.label}</span>
                <select
                  value={String(node.data.params?.[p.key] ?? p.default)}
                  onChange={(e) => {
                    const opt = p.options.find((o) => String(o.value) === e.target.value);
                    if (opt) props.onParamChange(node.id, p.key, opt.value);
                  }}
                >
                  {p.options.map((o) => (
                    <option key={String(o.value)} value={String(o.value)}>
                      {o.label ?? `${o.value}${p.unit ?? ''}`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="field">
              <span>端子</span>
              <div className="terminal-list">
                {def.terminals.map((t) => (
                  <span key={t.id} className={`terminal-chip${connected.has(t.id) ? ' is-connected' : ''}`} title={t.role}>
                    {t.label ?? t.id}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}
        <div className="field">
          <span>チェック</span>
          <IssueList issues={issues} />
        </div>
        <button type="button" className="danger" onClick={props.onDelete}>
          機器を削除
        </button>
      </aside>
    );
  }

  if (edge && edge.data) {
    const data = edge.data;
    const issues = props.issues.filter((i) => i.wires.includes(edge.id));
    return (
      <aside className="inspector">
        <div className="panel-title">電線 {edge.id}</div>
        <p className="muted">
          {edge.source}.{edge.sourceHandle} ↔ {edge.target}.{edge.targetHandle}
        </p>
        <label className="field">
          <span>線番</span>
          <input value={data.wireNo ?? ''} placeholder="例: R1" onChange={(e) => props.onWireChange(edge.id, { wireNo: e.target.value || undefined })} />
        </label>
        <WireFields value={data} onChange={(patch) => props.onWireChange(edge.id, patch)} />
        {data.bend ? (
          <button type="button" onClick={() => props.onWireChange(edge.id, { bend: undefined })}>
            曲がり位置を自動に戻す
          </button>
        ) : (
          <p className="muted small">中央のつまみをドラッグすると曲がり位置を調整できます</p>
        )}
        <div className="field">
          <span>チェック</span>
          <IssueList issues={issues} />
        </div>
        <button type="button" className="danger" onClick={props.onDelete}>
          電線を削除
        </button>
      </aside>
    );
  }

  return (
    <aside className="inspector">
      <div className="panel-title">新しく引く電線</div>
      <WireFields value={props.wireDefaults} onChange={(patch) => props.onWireDefaultsChange({ ...props.wireDefaults, ...patch })} />
      <div className="help">
        <p>端子（機器上の小さな丸）から別の端子へドラッグすると配線できます。</p>
        <p>機器や電線をクリックすると、ここで詳細を編集できます。Delete キーで削除します。</p>
      </div>
    </aside>
  );
}

import { useEffect, useState } from 'react';
import { WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import { getDeviceDefinition } from '../devices/registry';
import { ioName, parseIoName, resolveDevice } from '../devices/resolve';
import type { DeviceDefinition, ParamValues, SafetyRating } from '../devices/types';
import type { CheckIssue } from '../check/checkDiagram';
import { busAccepts, type BusLayout } from '../model/bus';
import { CABLE_WIRE_TYPE, type Mount, type Sheet } from '../model/diagram';
import { terminalTitle } from './DeviceNode';
import type { DeviceFlowNode, WireEdgeData, WireFlowEdge } from './flow';

export type WireDefaults = Pick<WireEdgeData, 'color' | 'sizeSq' | 'wireType'>;

interface Props {
  node?: DeviceFlowNode;
  edge?: WireFlowEdge;
  edges: WireFlowEdge[];
  nodes: DeviceFlowNode[];
  /** 機器ID → 装着で決まる値を加えたパラメータ */
  params: Map<string, ParamValues | undefined>;
  bus: BusLayout;
  issues: CheckIssue[];
  wireDefaults: WireDefaults;
  onWireDefaultsChange: (d: WireDefaults) => void;
  onRenameDevice: (oldId: string, newId: string) => string | null;
  onParamChange: (id: string, key: string, value: number | string) => void;
  onMountChange: (id: string, mount: Mount | undefined) => void;
  sheets: Sheet[];
  onSheetChange: (id: string, sheet: string) => void;
  /** I/O を持つ PLC（親・ユニット）の機器ID */
  ioDevices: Set<string>;
  onEditIo: (id: string) => void;
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

function safetyText(s: SafetyRating): string {
  return [
    s.pl && `PL ${s.pl}`,
    s.category && `カテゴリ ${s.category}`,
    s.sil && `SIL ${s.sil}`,
    s.esType && `タイプ ${s.esType}`,
  ]
    .filter(Boolean)
    .join(' / ');
}

/** 増設ユニットの装着先と位置 */
function MountField({ node, def, props }: { node: DeviceFlowNode; def: DeviceDefinition; props: Props }) {
  const hosts = props.nodes.filter((n) => {
    const d = getDeviceDefinition(n.data.deviceType);
    return n.id !== node.id && !n.data.mount && d && busAccepts(d, def);
  });
  const mount = node.data.mount;
  const nextSlot = (host: string) =>
    Math.max(0, ...props.nodes.filter((n) => n.data.mount?.device === host && n.id !== node.id).map((n) => n.data.mount!.slot)) + 1;
  return (
    <div className="field">
      <span>装着先</span>
      <div className="mount-row">
        <select
          value={mount?.device ?? ''}
          onChange={(e) => props.onMountChange(node.id, e.target.value ? { device: e.target.value, slot: nextSlot(e.target.value) } : undefined)}
        >
          <option value="">なし（単独で配置）</option>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.id}（{getDeviceDefinition(h.data.deviceType)?.model}）
            </option>
          ))}
        </select>
        {mount && (
          <label className="mount-slot" title="装着する位置（親に近い順に 1, 2, …）">
            位置
            <input
              type="number"
              min={1}
              value={mount.slot}
              onChange={(e) => {
                const slot = Math.max(1, Math.round(Number(e.target.value) || 1));
                props.onMountChange(node.id, { ...mount, slot });
              }}
            />
          </label>
        )}
      </div>
      {!hosts.length && !mount && <small className="muted">装着できる機器（CPU・ベースユニットなど）が図面にありません</small>}
    </div>
  );
}

/** 入出力の先頭番号。装着していれば自動、していなければ手で指定する */
function IoHeadField({ node, def, params, props }: { node: DeviceFlowNode; def: DeviceDefinition; params: ParamValues; props: Props }) {
  const io = def.bus!.io!;
  const rows = [
    ...(io.inputs ? [{ key: 'ioIn', dir: 'in' as const, label: '入力', count: io.inputs }] : []),
    ...(io.outputs ? [{ key: 'ioOut', dir: 'out' as const, label: '出力', count: io.outputs }] : []),
  ];
  return (
    <div className="field">
      <span>先頭番号{node.data.mount ? '（装着位置から自動）' : ''}</span>
      {rows.map((r) => {
        const head = Number(params[r.key] ?? 0);
        const range = `${ioName(io.format, r.dir, head)}〜${ioName(io.format, r.dir, head + r.count - 1)}`;
        return node.data.mount ? (
          <div key={r.key} className="muted small">
            {r.label} {range}
          </div>
        ) : (
          <label key={r.key} className="io-head">
            {r.label}
            <input
              key={`${node.id}-${head}`}
              defaultValue={ioName(io.format, r.dir, head)}
              onBlur={(e) => {
                const n = parseIoName(io.format, e.target.value);
                if (n === undefined) e.target.value = ioName(io.format, r.dir, head);
                else props.onParamChange(node.id, r.key, n);
              }}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <small className="muted">{range}</small>
          </label>
        );
      })}
    </div>
  );
}

/** 装着しているユニットと内部電源の収支（親の機器） */
function BusHostInfo({ id, bus }: { id: string; bus: BusLayout }) {
  const g = bus.groups.get(id);
  if (!g) return <p className="muted small">増設ユニットを装着できます（ユニット側の「装着先」で選びます）</p>;
  return (
    <div className="field">
      <span>装着ユニット</span>
      <div className="muted small">{g.members.map((m) => `${m.mount!.slot}: ${m.id}`).join('、')}</div>
      {g.rails.map((r) => (
        <div key={r.rail} className={`small${r.load > r.supply ? ' error-text' : ' muted'}`}>
          内部電源 {r.rail}: 消費 {Math.round(r.load * 1000) / 1000}A / 供給 {Math.round(r.supply * 1000) / 1000}A
        </div>
      ))}
    </div>
  );
}

export function Inspector(props: Props) {
  const { node, edge } = props;

  if (node) {
    const def = getDeviceDefinition(node.data.deviceType);
    const params = props.params.get(node.id) ?? node.data.params;
    const resolved = def ? resolveDevice(def, params) : undefined;
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
              {def.safety && <div className="safety-badge">安全性能 {safetyText(def.safety)}</div>}
              {def.description && <p className="muted small">{def.description}</p>}
            </div>
            {def.bus && !def.bus.host && <MountField node={node} def={def} props={props} />}
            {def.bus?.host && <BusHostInfo id={node.id} bus={props.bus} />}
            {def.bus?.io && resolved && <IoHeadField node={node} def={def} params={resolved.params} props={props} />}
            {props.ioDevices.has(node.id) && (
              <button type="button" className="primary" onClick={() => props.onEditIo(node.id)}>
                I/O 割付・接続を編集…
              </button>
            )}
            {def.params?.map((p) =>
              p.input === 'text' ? (
                <label key={p.key} className="field">
                  <span>{p.label}</span>
                  <input
                    key={`${node.id}:${String(node.data.params?.[p.key] ?? p.default)}`}
                    defaultValue={String(node.data.params?.[p.key] ?? p.default)}
                    onBlur={(e) => props.onParamChange(node.id, p.key, e.target.value.trim())}
                    onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                  />
                </label>
              ) : (
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
              ),
            )}
            {props.sheets.length > 1 && (
              <label className="field">
                <span>シート</span>
                <select value={node.data.sheet} onChange={(e) => props.onSheetChange(node.id, e.target.value)}>
                  {props.sheets.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className="field">
              <span>端子</span>
              <div className="terminal-list">
                {resolved!.terminals.map((t) => (
                  <span key={t.id} className={`terminal-chip${connected.has(t.id) ? ' is-connected' : ''}`} title={terminalTitle(t)}>
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
          <span>{data.wireType === CABLE_WIRE_TYPE ? 'ケーブル名' : '線番'}</span>
          <input value={data.wireNo ?? ''} placeholder="例: R1" onChange={(e) => props.onWireChange(edge.id, { wireNo: e.target.value || undefined })} />
        </label>
        {data.wireType === CABLE_WIRE_TYPE ? (
          <p className="muted small">コネクタ間のケーブルです。両端の同じ番号のピンどうしが導通します。</p>
        ) : (
          <WireFields value={data} onChange={(patch) => props.onWireChange(edge.id, patch)} />
        )}
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

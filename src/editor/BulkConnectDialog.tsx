import { useMemo, useState } from 'react';
import { WIRE_COLORS } from '../data/wires';
import { getDeviceDefinition } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import { applyProposals, proposalWire, proposeConnections } from '../model/bulkConnect';
import type { Diagram } from '../model/diagram';
import type { WireAttrs } from '../model/ops';

interface Props {
  diagram: Diagram;
  /** クリックした 2 台（どちらから電源を出すかは推定する） */
  a: string;
  b: string;
  /** 新しく引く電線の設定（色は回路に合わせて変える） */
  wireDefaults: WireAttrs;
  onApply: (next: Diagram, message: string) => void;
  onClose: () => void;
}

/** 2 台の機器のあいだの接続案を出し、選んだ組をまとめて電線でつなぐ */
export function BulkConnectDialog({ diagram, a, b, wireDefaults, onApply, onClose }: Props) {
  const [swap, setSwap] = useState(false);
  // 推定した向きを既定にし、「向きを入れ替える」で逆向きの案も出す
  const plan = useMemo(() => {
    const p = proposeConnections(diagram, a, b, getDeviceDefinition);
    return swap ? proposeConnections(diagram, p.target, p.source, getDeviceDefinition, true) : p;
  }, [diagram, a, b, swap]);
  const [off, setOff] = useState<Set<number>>(new Set());
  const chosen = plan.proposals.filter((_, i) => !off.has(i));
  const name = (id: string) => {
    const d = diagram.devices.find((x) => x.id === id);
    const def = d ? getDeviceDefinition(d.type) : undefined;
    return def ? `${id}（${def.model}）` : id;
  };
  const terminalName = (device: string, terminal: string) => {
    const d = diagram.devices.find((x) => x.id === device);
    const def = d ? getDeviceDefinition(d.type) : undefined;
    const t = d && def ? resolveDevice(def, d.params).terminal(terminal) : undefined;
    return t?.label && t.label !== terminal ? `${terminal}（${t.label}）` : terminal;
  };
  const colorOf = (id: string) => WIRE_COLORS.find((c) => c.id === id);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal bulk-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>まとめてつなぐ</h2>
        <p className="muted small">
          {name(plan.source)} から {name(plan.target)} へ、端子の相・極・接地を合わせてつなぐ案です。つながない組はチェックを外してください。
        </p>
        <div className="bulk-dialog__dir">
          <span>
            <strong>{plan.source}</strong> → <strong>{plan.target}</strong>
          </span>
          <button
            type="button"
            onClick={() => {
              setSwap((s) => !s);
              setOff(new Set());
            }}
          >
            ⇄ 向きを入れ替える
          </button>
        </div>
        {plan.proposals.length === 0 ? (
          <p className="bulk-dialog__empty">推定できる接続がありません（空いている端子がない、または相・極を合わせられる端子がありません）。端子どうしをドラッグしてつないでください。</p>
        ) : (
          <table className="bulk-dialog__table">
            <thead>
              <tr>
                <th />
                <th>{plan.source}</th>
                <th />
                <th>{plan.target}</th>
                <th>合わせ方</th>
                <th>電線</th>
              </tr>
            </thead>
            <tbody>
              {plan.proposals.map((p, i) => {
                const attrs = p.cable ? undefined : proposalWire(p, wireDefaults);
                const color = attrs ? colorOf(attrs.color) : undefined;
                return (
                  <tr key={i} className={off.has(i) ? 'is-off' : ''}>
                    <td>
                      <input
                        type="checkbox"
                        aria-label={`${p.from.terminal} と ${p.to.terminal} をつなぐ`}
                        checked={!off.has(i)}
                        onChange={() =>
                          setOff((s) => {
                            const n = new Set(s);
                            if (n.has(i)) n.delete(i);
                            else n.add(i);
                            return n;
                          })
                        }
                      />
                    </td>
                    <td>{terminalName(p.from.device, p.from.terminal)}</td>
                    <td className="muted">→</td>
                    <td>{terminalName(p.to.device, p.to.terminal)}</td>
                    <td className="muted">{p.reason}</td>
                    <td>
                      {p.cable ? (
                        'ケーブル'
                      ) : (
                        <span className="bulk-dialog__wire">
                          <span className="bulk-dialog__swatch" style={{ background: color?.hex ?? '#000' }} />
                          {color?.name ?? attrs?.color} {attrs?.sizeSq}sq{p.wireNo ? `・${p.wireNo}` : ''}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button
            type="button"
            className="primary"
            disabled={!chosen.length}
            onClick={() => onApply(applyProposals(diagram, chosen, wireDefaults), `${plan.source} と ${plan.target} を ${chosen.length} 本でつなぎました`)}
          >
            {chosen.length} 本つなぐ
          </button>
        </div>
      </div>
    </div>
  );
}

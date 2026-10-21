import { memo, useEffect, useMemo, useRef } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { getDeviceDefinition, instantiateSvg } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
import { linkKey } from '../model/ops';
import type { TerminalDef, TerminalSide } from '../devices/types';
import { useEditorContext } from './EditorContext';
import type { DeviceFlowNode } from './flow';

const POSITION: Record<TerminalSide, Position> = {
  top: Position.Top,
  bottom: Position.Bottom,
  left: Position.Left,
  right: Position.Right,
};

const ROLE_NAMES: Record<string, string> = {
  line: '一次側',
  load: '二次側',
  pass: '中継',
  supply: '電源出力',
  input: '受電',
  ground: '接地',
  signal: '信号',
  connector: 'コネクタ',
};

/** コネクタの接続点（Handle）の厚み。ケーブルの始点は Handle の side 側の端になる */
export const HANDLE_DEPTH = 10;

export const SIGNAL_NAMES: Record<string, string> = {
  npn: 'NPN出力',
  pnp: 'PNP出力',
  contact: '無電圧接点',
  '2wire': '2線式',
  dc: 'DC入力',
  dry: '無電圧入力',
  'analog-v': 'アナログ電圧',
  'analog-i': 'アナログ電流',
  'line-driver': 'ラインドライバ',
};

/** 端子のツールチップ（印字・機能・役割） */
export function terminalTitle(t: TerminalDef): string {
  const kind = t.signal ? SIGNAL_NAMES[t.signal.kind] : ROLE_NAMES[t.role] ?? t.role;
  return `${t.label ?? t.id}${t.note ? ` ${t.note}` : ''}（${kind}）`;
}

/** リンクの相手（同じ名前のリンク）があるシート。クリックでそのシートのリンクへ移動する */
function LinkPeers({ self, peers, sheet, onJump }: { self: string; peers: { id: string; sheet: string; sheetName: string }[]; sheet: string; onJump: (id: string) => void }) {
  const others = peers.filter((p) => p.id !== self);
  // シートごとに 1 つにまとめる（このシートの相手は最後に）
  const bySheet = new Map<string, { id: string; name: string }>();
  for (const p of others) if (!bySheet.has(p.sheet)) bySheet.set(p.sheet, { id: p.id, name: p.sheet === sheet ? 'このシート' : p.sheetName });
  const list = [...bySheet].sort((a, b) => Number(a[0] === sheet) - Number(b[0] === sheet));
  return (
    <div className={`link-peers${others.length ? '' : ' is-alone'}`}>
      {list.length
        ? list.map(([s, p]) => (
            <button
              key={s}
              type="button"
              className="link-peers__item nodrag"
              title={`${p.name} の ${p.id} へ移動`}
              onClick={(e) => {
                e.stopPropagation();
                onJump(p.id);
              }}
            >
              ⇢{p.name}
            </button>
          ))
        : '相手なし'}
    </div>
  );
}

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const def = getDeviceDefinition(data.deviceType);
  const { deviceSeverity, params: effective, hosts, linkPeers, onJump, showNotes } = useEditorContext();
  const severity = deviceSeverity.get(id);
  const params = effective.get(id) ?? data.params;
  const svg = useMemo(() => (def ? instantiateSvg(def, id, params) : ''), [def, id, params]);
  const terminals = useMemo(() => (def ? resolveDevice(def, params).terminals : []), [def, params]);
  // パラメータで端子が変わる機器があるため、端子の位置を React Flow に知らせ直す
  // （初回の描画では不要。初回にも呼ぶと全体表示（fitView）が計測前に走ってしまう）
  // 元の端子に戻った場合も知らせ直すため、直前の端子と比べる
  const updateNodeInternals = useUpdateNodeInternals();
  const prevTerminals = useRef(terminals);
  useEffect(() => {
    if (terminals === prevTerminals.current) return;
    prevTerminals.current = terminals;
    updateNodeInternals(id);
  }, [terminals, id, updateNodeInternals]);

  if (!def) {
    return (
      <div className="device-node device-node--unknown">
        <div className="device-node__label">{id}</div>
        <div>不明な機器: {data.deviceType}</div>
      </div>
    );
  }

  return (
    <div
      className={`device-node${selected ? ' is-selected' : ''}${severity ? ` has-${severity}` : ''}${data.mount ? ' is-mounted' : ''}${hosts.has(id) ? ' has-mounted' : ''}${def.netLabel ? ' is-link' : ''}`}
      style={{ width: def.width, height: def.height }}
    >
      <div className="device-node__label" title={data.mount ? `${def.model}（${data.mount.device} の位置 ${data.mount.slot} に装着）` : undefined}>
        {/* 機器のコメントは、下の端子と重ならないよう機器名の上に出す */}
        {showNotes && data.note && !def.netLabel && (
          <div className="device-node__note" title={data.note}>
            {data.note}
          </div>
        )}
        <strong>{id}</strong>
        <span>{def.model}</span>
      </div>
      <svg
        className="device-node__svg"
        width={def.width}
        height={def.height}
        viewBox={`0 0 ${def.width} ${def.height}`}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      {def.netLabel && (
        <LinkPeers
          self={id}
          peers={linkPeers.get(linkKey(def.type, String(params?.[def.netLabel.param] ?? '').trim())) ?? []}
          sheet={data.sheet}
          onJump={onJump}
        />
      )}
      {terminals.map((t) => (
        <Handle
          key={t.id}
          id={t.id}
          type="source"
          position={POSITION[t.side]}
          className={`terminal terminal--${t.role}`}
          style={{
            left: t.x,
            top: t.y,
            right: 'auto',
            bottom: 'auto',
            transform: 'translate(-50%, -50%)',
            // コネクタは差込口の幅いっぱいを接続点にする
            ...(t.connector &&
              (t.side === 'top' || t.side === 'bottom'
                ? { width: t.connector.width, height: HANDLE_DEPTH, borderRadius: 3 }
                : { width: HANDLE_DEPTH, height: t.connector.width, borderRadius: 3 })),
          }}
          title={terminalTitle(t)}
        />
      ))}
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeView);

import { memo, useEffect, useMemo } from 'react';
import { Handle, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { getDeviceDefinition, instantiateSvg } from '../devices/registry';
import { resolveDevice } from '../devices/resolve';
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

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const def = getDeviceDefinition(data.deviceType);
  const { deviceSeverity, params: effective } = useEditorContext();
  const severity = deviceSeverity.get(id);
  const params = effective.get(id) ?? data.params;
  const svg = useMemo(() => (def ? instantiateSvg(def, id, params) : ''), [def, id, params]);
  const terminals = useMemo(() => (def ? resolveDevice(def, params).terminals : []), [def, params]);
  // パラメータで端子が変わる機器があるため、端子の位置を React Flow に知らせ直す
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => updateNodeInternals(id), [terminals, id, updateNodeInternals]);

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
      className={`device-node${selected ? ' is-selected' : ''}${severity ? ` has-${severity}` : ''}${data.mount ? ' is-mounted' : ''}`}
      style={{ width: def.width, height: def.height }}
    >
      <div className="device-node__label" title={data.mount ? `${def.model}（${data.mount.device} の位置 ${data.mount.slot} に装着）` : undefined}>
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
                ? { width: t.connector.width, height: t.connector.facing === 'front' ? (t.connector.length ?? 12) : 10, borderRadius: 3 }
                : { width: t.connector.facing === 'front' ? (t.connector.length ?? 12) : 10, height: t.connector.width, borderRadius: 3 })),
          }}
          title={terminalTitle(t)}
        />
      ))}
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeView);

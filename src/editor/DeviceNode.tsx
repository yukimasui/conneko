import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { getDeviceDefinition, instantiateSvg } from '../devices/registry';
import type { TerminalSide } from '../devices/types';
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
};

function DeviceNodeView({ id, data, selected }: NodeProps<DeviceFlowNode>) {
  const def = getDeviceDefinition(data.deviceType);
  const { deviceSeverity } = useEditorContext();
  const severity = deviceSeverity.get(id);
  const svg = useMemo(() => (def ? instantiateSvg(def, id) : ''), [def, id]);

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
      className={`device-node${selected ? ' is-selected' : ''}${severity ? ` has-${severity}` : ''}`}
      style={{ width: def.width, height: def.height }}
    >
      <div className="device-node__label">
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
      {def.terminals.map((t) => (
        <Handle
          key={t.id}
          id={t.id}
          type="source"
          position={POSITION[t.side]}
          className={`terminal terminal--${t.role}`}
          style={{ left: t.x, top: t.y, right: 'auto', bottom: 'auto', transform: 'translate(-50%, -50%)' }}
          title={`${t.label ?? t.id}（${ROLE_NAMES[t.role] ?? t.role}）`}
        />
      ))}
    </div>
  );
}

export const DeviceNode = memo(DeviceNodeView);

import { useMemo } from 'react';
import { deviceDefinitions, instantiateSvg } from '../devices/registry';
import type { DeviceCategory, DeviceDefinition } from '../devices/types';

export const DEVICE_DRAG_TYPE = 'application/x-conneko-device';

const CATEGORY_NAMES: Record<DeviceCategory, string> = {
  'power-source': '電源',
  breaker: 'ブレーカー',
  contactor: '開閉器',
  'power-supply': '電源ユニット',
  terminal: '端子台',
  load: '負荷',
  control: '操作・表示',
  plc: 'PLC',
  sensor: 'センサー',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_NAMES) as DeviceCategory[];

function Thumb({ def }: { def: DeviceDefinition }) {
  const svg = useMemo(() => instantiateSvg(def, `thumb-${def.type}`), [def]);
  return <svg className="palette__thumb" viewBox={`0 0 ${def.width} ${def.height}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

export function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    defs: deviceDefinitions.filter((d) => d.category === cat).sort((a, b) => a.name.localeCompare(b.name, 'ja')),
  })).filter((g) => g.defs.length);

  return (
    <aside className="palette">
      <div className="panel-title">機器</div>
      <p className="palette__hint">クリックまたはドラッグで配置</p>
      {groups.map((g) => (
        <section key={g.cat}>
          <h3>{CATEGORY_NAMES[g.cat]}</h3>
          {g.defs.map((def) => (
            <button
              key={def.type}
              type="button"
              className="palette__item"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DEVICE_DRAG_TYPE, def.type);
                e.dataTransfer.effectAllowed = 'move';
              }}
              onClick={() => onAdd(def.type)}
              title={def.description}
            >
              <Thumb def={def} />
              <span className="palette__text">
                <span className="palette__name">{def.name}</span>
                <span className="palette__model">{def.maker ? `${def.maker} ` : ''}{def.model}</span>
              </span>
            </button>
          ))}
        </section>
      ))}
    </aside>
  );
}

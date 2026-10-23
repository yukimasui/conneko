import { useMemo, useState } from 'react';
import { deviceDefinitions, instantiateSvg } from '../devices/registry';
import type { DeviceCategory, DeviceDefinition } from '../devices/types';

export const DEVICE_DRAG_TYPE = 'application/x-conneko-device';

const CATEGORY_NAMES: Record<DeviceCategory, string> = {
  link: 'リンク（シート間の接続）',
  'power-source': '電源',
  breaker: 'ブレーカー',
  contactor: '開閉器',
  'power-supply': '電源ユニット',
  terminal: '端子台',
  load: '負荷',
  control: '操作・表示',
  plc: 'PLC',
  sensor: 'センサー',
  safety: '安全機器',
  network: 'ネットワーク機器',
  'air-supply': 'エア源・3 点セット',
  valve: '電磁弁・バルブ',
  actuator: 'シリンダ・アクチュエータ',
  'air-fitting': '継手・速度制御・エア周辺',
};

const CATEGORY_ORDER = Object.keys(CATEGORY_NAMES) as DeviceCategory[];
const GENERIC_MAKER = '汎用';
const RECENT_LIMIT = 6;
const STORAGE_KEY = 'conneko.palette';

interface Stored {
  collapsed: DeviceCategory[];
  recent: string[];
}

// 折りたたみ状態と最近使った機器は、閲覧者ごとの便利機能としてブラウザに保存する（保存できなくても動く）
function load(): Stored {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Stored>;
    return { collapsed: v.collapsed ?? [], recent: v.recent ?? [] };
  } catch {
    return { collapsed: [], recent: [] };
  }
}

function save(v: Stored) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(v));
  } catch {
    // 保存できない環境では何もしない
  }
}

const makerOf = (d: DeviceDefinition) => d.maker ?? GENERIC_MAKER;

/** 検索語にどれだけ合うか（0 は不一致）。名称・型式・メーカー・説明・type を対象にする */
function score(d: DeviceDefinition, words: string[]): number {
  // 定格電流などのパラメータの選択肢（例: '30A'）でも探せるようにする
  const options = (d.params ?? []).flatMap((p) => p.options.map((o) => `${o.label ?? ''} ${o.value}${p.unit ?? ''}`)).join(' ');
  const fields = [d.name, d.model, makerOf(d), d.type, d.description ?? '', CATEGORY_NAMES[d.category], options].map((f) => f.toLowerCase());
  let total = 0;
  for (const w of words) {
    const hit = fields.findIndex((f) => f.includes(w));
    if (hit < 0) return 0;
    total += 10 - hit;
  }
  return total;
}

function Thumb({ def }: { def: DeviceDefinition }) {
  const svg = useMemo(() => instantiateSvg(def, `thumb-${def.type}`), [def]);
  return <svg className="palette__thumb" viewBox={`0 0 ${def.width} ${def.height}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

function Item({ def, onUse }: { def: DeviceDefinition; onUse: (type: string, add: boolean) => void }) {
  return (
    <button
      type="button"
      className="palette__item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DEVICE_DRAG_TYPE, def.type);
        e.dataTransfer.effectAllowed = 'move';
        onUse(def.type, false);
      }}
      onClick={() => onUse(def.type, true)}
      title={[def.name, `${def.maker ? def.maker + ' ' : ''}${def.model}`, def.description].filter(Boolean).join('\n')}
    >
      <Thumb def={def} />
      <span className="palette__text">
        <span className="palette__name">{def.name}</span>
        <span className="palette__model">
          {def.maker && <span className="palette__maker">{def.maker}</span>}
          {def.model}
        </span>
      </span>
    </button>
  );
}

export function Palette({ onAdd }: { onAdd: (type: string) => void }) {
  const [query, setQuery] = useState('');
  const [maker, setMaker] = useState<string | null>(null);
  const [stored, setStored] = useState<Stored>(load);

  const update = (v: Stored) => {
    setStored(v);
    save(v);
  };

  const use = (type: string, add: boolean) => {
    update({ ...stored, recent: [type, ...stored.recent.filter((t) => t !== type)].slice(0, RECENT_LIMIT) });
    if (add) onAdd(type);
  };

  const toggle = (cat: DeviceCategory) => {
    const collapsed = stored.collapsed.includes(cat) ? stored.collapsed.filter((c) => c !== cat) : [...stored.collapsed, cat];
    update({ ...stored, collapsed });
  };

  const makers = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of deviceDefinitions) counts.set(makerOf(d), (counts.get(makerOf(d)) ?? 0) + 1);
    // 汎用品は最後に並べる
    return [...counts].sort((a, b) => (a[0] === GENERIC_MAKER ? 1 : b[0] === GENERIC_MAKER ? -1 : b[1] - a[1]));
  }, []);

  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const pool = deviceDefinitions.filter((d) => !maker || makerOf(d) === maker);

  const results = words.length
    ? pool
        .map((d) => ({ d, s: score(d, words) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.d)
    : [];

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    defs: pool
      .filter((d) => d.category === cat)
      .sort((a, b) => makerOf(a).localeCompare(makerOf(b), 'ja') || a.name.localeCompare(b.name, 'ja') || a.model.localeCompare(b.model, 'ja')),
  })).filter((g) => g.defs.length);

  const recent = stored.recent
    .map((t) => deviceDefinitions.find((d) => d.type === t))
    .filter((d): d is DeviceDefinition => !!d);

  return (
    <aside className="palette">
      <div className="palette__head">
        <div className="panel-title">
          機器 <span className="palette__count">{deviceDefinitions.length}</span>
        </div>
        <input
          className="palette__search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（例: 漏電 30A）"
          title="名前・型式・メーカー・定格などで検索。スペース区切りで絞り込み"
          onKeyDown={(e) => e.key === 'Escape' && setQuery('')}
        />
        <div className="palette__makers">
          <button type="button" className={`chip${maker === null ? ' is-active' : ''}`} onClick={() => setMaker(null)}>
            すべて
          </button>
          {makers.map(([m, n]) => (
            <button key={m} type="button" className={`chip${maker === m ? ' is-active' : ''}`} onClick={() => setMaker(maker === m ? null : m)}>
              {m}
              <span className="chip__count">{n}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="palette__body">
        {words.length > 0 ? (
          <section>
            <h3 className="palette__heading is-static">検索結果 {results.length}件</h3>
            {results.length ? results.map((d) => <Item key={d.type} def={d} onUse={use} />) : <p className="palette__empty">見つかりませんでした</p>}
          </section>
        ) : (
          <>
            {recent.length > 0 && !maker && (
              <section>
                <h3 className="palette__heading is-static">最近使った機器</h3>
                <div className="palette__recent">
                  {recent.map((d) => (
                    <button
                      key={d.type}
                      type="button"
                      className="palette__recent-item"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DEVICE_DRAG_TYPE, d.type);
                        e.dataTransfer.effectAllowed = 'move';
                      }}
                      onClick={() => use(d.type, true)}
                      title={`${d.name} ${d.model}`}
                    >
                      <Thumb def={d} />
                    </button>
                  ))}
                </div>
              </section>
            )}
            {groups.map((g) => {
              const open = !stored.collapsed.includes(g.cat);
              return (
                <section key={g.cat}>
                  <button type="button" className="palette__heading" onClick={() => toggle(g.cat)} aria-expanded={open}>
                    <svg className={`palette__chevron${open ? ' is-open' : ''}`} viewBox="0 0 10 10" aria-hidden="true">
                      <path d="M3 1.5 L7 5 L3 8.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {CATEGORY_NAMES[g.cat]}
                    <span className="palette__count">{g.defs.length}</span>
                  </button>
                  {open && g.defs.map((d) => <Item key={d.type} def={d} onUse={use} />)}
                </section>
              );
            })}
          </>
        )}
      </div>
      <p className="palette__hint">クリックで中央に配置、ドラッグで好きな位置に配置</p>
    </aside>
  );
}

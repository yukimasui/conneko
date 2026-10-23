import { useMemo, useState } from 'react';
import { deviceFamilies, type DeviceFamily } from '../devices/families';
import { deviceDefinitions, getDeviceDefinition, instantiateSvg } from '../devices/registry';
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
  /** ファミリーごとに最後に選んだ機種（次に置くときの既定にする） */
  last: Record<string, string>;
}

// 折りたたみ状態と最近使った機器は、閲覧者ごとの便利機能としてブラウザに保存する（保存できなくても動く）
function load(): Stored {
  try {
    const v = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<Stored>;
    return { collapsed: v.collapsed ?? [], recent: v.recent ?? [], last: v.last ?? {} };
  } catch {
    return { collapsed: [], recent: [], last: {} };
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

/**
 * 検索の表記ゆれをそろえる: 全角・半角（NFKC）、大文字・小文字、空白、長音（シリンダー / シリンダ）、漢数字の「三」（三点セット）
 */
const norm = (t: string) => t.normalize('NFKC').toLowerCase().replace(/[\sー・]/g, '').replace(/三点/g, '3点');

/** 現場の通称 → 機器の名前に出てくる言葉（どれかに合えば一致） */
const SYNONYMS: Record<string, string[]> = {
  スピコン: ['スピードコントローラ'],
  エアシリ: ['シリンダ'],
  frl: ['3点セット', 'フィルタ', 'レギュレータ'],
  ソレノイドバルブ: ['電磁弁'],
  ソレノイド: ['電磁弁'],
  マニホ: ['マニホールド'],
  サイレンサー: ['サイレンサ'],
  レギュ: ['レギュレータ'],
  チャック: ['エアチャック'],
  継手: ['継手', 'ユニオン', 'レデューサ'],
  ティー: ['ユニオンティ'],
  ワンタッチ継手: ['ワンタッチ管継手'],
};

/** 検索語にどれだけ合うか（0 は不一致）。ファミリーの名前・別名と、機器の名称・型式・メーカー・説明・type を対象にする */
function score(d: DeviceDefinition, f: DeviceFamily, words: string[]): number {
  // 定格電流などのパラメータの選択肢（例: '30A'）でも探せるようにする
  const options = (d.params ?? []).flatMap((p) => p.options.map((o) => `${o.label ?? ''} ${o.value}${p.unit ?? ''}`)).join(' ');
  const fields = [`${f.name} ${f.keywords.join(' ')}`, d.name, d.model, makerOf(d), d.type, d.description ?? '', CATEGORY_NAMES[d.category], options].map(norm);
  const category = norm(CATEGORY_NAMES[d.category]);
  let total = 0;
  for (const raw of words) {
    const w = norm(raw);
    if (!w) continue;
    const alts = [w, ...(SYNONYMS[w] ?? []).map(norm)];
    const hit = fields.findIndex((f) => alts.some((a) => f.includes(a)));
    if (hit < 0) return 0;
    // 分類の名前にも合う機器（「シリンダ」で引いたエアシリンダなど）を先に出す
    total += 10 - hit + (alts.some((a) => category.includes(a)) ? 5 : 0);
  }
  return total;
}

function Thumb({ def }: { def: DeviceDefinition }) {
  const svg = useMemo(() => instantiateSvg(def, `thumb-${def.type}`), [def]);
  return <svg className="palette__thumb" viewBox={`0 0 ${def.width} ${def.height}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

/** パレットの 1 行（ファミリー）。機種が 1 つならそのまま置き、複数なら「機種を選ぶ」ダイアログを開く */
interface Entry {
  family: DeviceFamily;
  /** 絞り込み（メーカー）に合う機種 */
  members: DeviceDefinition[];
  /** 置くときの機種（最後に選んだもの・検索で合ったもの・既定） */
  def: DeviceDefinition;
  /** 型式で検索に合った機種（行に型式を出す） */
  hit?: DeviceDefinition;
}

function Item({ entry, onUse }: { entry: Entry; onUse: (e: Entry, how: 'click' | 'drag') => void }) {
  const { family, members, def, hit } = entry;
  const makers = [...new Set(members.map(makerOf))];
  return (
    <button
      type="button"
      className="palette__item"
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DEVICE_DRAG_TYPE, def.type);
        e.dataTransfer.effectAllowed = 'move';
        onUse(entry, 'drag');
      }}
      onClick={() => onUse(entry, 'click')}
      title={
        members.length > 1
          ? `${family.name}（${members.length} 機種: ${makers.join('・')}）\nクリックで機種を選んで置く。ドラッグで ${def.model} を置く`
          : [def.name, `${def.maker ? def.maker + ' ' : ''}${def.model}`, def.description].filter(Boolean).join('\n')
      }
    >
      <Thumb def={def} />
      <span className="palette__text">
        <span className="palette__name">{family.name}</span>
        <span className="palette__model">
          {hit ? (
            <>
              {hit.maker && <span className="palette__maker">{hit.maker}</span>}
              {hit.model}
            </>
          ) : members.length > 1 ? (
            <>
              <span className="palette__variants">{members.length} 機種</span>
              {makers.join('・')}
            </>
          ) : (
            <>
              {def.maker && <span className="palette__maker">{def.maker}</span>}
              {def.model}
            </>
          )}
        </span>
      </span>
    </button>
  );
}

interface PaletteProps {
  /** 機器をそのまま置く */
  onAdd: (type: string) => void;
  /** 「機種を選ぶ」ダイアログを開く（initial は最初に選んでおく機種） */
  onPick: (familyId: string, initial: string, onChosen: (type: string) => void) => void;
}

export function Palette({ onAdd, onPick }: PaletteProps) {
  const [query, setQuery] = useState('');
  const [maker, setMaker] = useState<string | null>(null);
  const [stored, setStored] = useState<Stored>(load);

  const update = (v: Stored) => {
    setStored(v);
    save(v);
  };

  /** 置いた機種を「最近使った機器」とファミリーの既定に覚える */
  const remember = (type: string, cur: Stored = stored) => {
    const family = deviceFamilies.find((f) => f.members.some((m) => m.type === type));
    const next = {
      ...cur,
      recent: [type, ...cur.recent.filter((t) => t !== type)].slice(0, RECENT_LIMIT),
      last: family ? { ...cur.last, [family.id]: type } : cur.last,
    };
    update(next);
  };

  const use = (e: Entry, how: 'click' | 'drag') => {
    if (how === 'drag') return remember(e.def.type);
    if (e.members.length < 2) {
      remember(e.def.type);
      onAdd(e.def.type);
      return;
    }
    onPick(e.family.id, e.def.type, (type) => {
      remember(type, load());
      onAdd(type);
    });
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

  /** メーカーの絞り込みに合うファミリーと、置く機種 */
  const entries: Entry[] = deviceFamilies.flatMap((family) => {
    const members = family.members.filter((d) => !maker || makerOf(d) === maker);
    if (!members.length) return [];
    const last = stored.last[family.id];
    const def = members.find((d) => d.type === last) ?? members.find((d) => d.type === family.defaultType) ?? members[0];
    return [{ family, members, def }];
  });

  const results = words.length
    ? entries
        .map((e) => {
          const scored = e.members.map((d) => ({ d, s: score(d, e.family, words) })).sort((a, b) => b.s - a.s);
          const best = scored[0];
          // ファミリーの名前・別名だけでは合わず、型式などで合った機種は、その機種を置く
          const byFamily = words.every((w) => norm(`${e.family.name} ${e.family.keywords.join(' ')}`).includes(norm(w)));
          const hit = !byFamily && best.s > 0 && e.members.length > 1 ? best.d : undefined;
          return { e: { ...e, def: hit ?? e.def, hit }, s: best.s + (byFamily ? 20 : 0) };
        })
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.e)
    : [];

  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    entries: entries.filter((e) => e.family.category === cat && !e.family.hidden).sort((a, b) => a.family.order - b.family.order || a.family.name.localeCompare(b.family.name, 'ja')),
  })).filter((g) => g.entries.length);

  const recent = stored.recent.map((t) => getDeviceDefinition(t)).filter((d): d is DeviceDefinition => !!d);

  return (
    <aside className="palette">
      <div className="palette__head">
        <div className="panel-title">
          機器 <span className="palette__count">{deviceFamilies.length}</span>
          <span className="palette__count" title="型式ごとの機種の数">（{deviceDefinitions.length} 機種）</span>
        </div>
        <input
          className="palette__search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="検索（例: 漏電、電磁弁、NV32）"
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
            {results.length ? results.map((e) => <Item key={e.family.id} entry={e} onUse={use} />) : <p className="palette__empty">見つかりませんでした</p>}
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
                      onClick={() => {
                        remember(d.type);
                        onAdd(d.type);
                      }}
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
                    <span className="palette__count">{g.entries.length}</span>
                  </button>
                  {open && g.entries.map((e) => <Item key={e.family.id} entry={e} onUse={use} />)}
                </section>
              );
            })}
          </>
        )}
      </div>
      <p className="palette__hint">クリックで機種を選んで配置、ドラッグで前に選んだ機種を配置（機種はあとからプロパティで変えられます）</p>
    </aside>
  );
}

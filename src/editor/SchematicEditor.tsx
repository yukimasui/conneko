/**
 * 展開図エディタ（docs/schematic-dxf.md の段階 3）。
 *
 * 左: 要素の一覧（機器ごと。用紙へドラッグ、またはダブルクリックで置く）
 * 中央: 用紙。記号をドラッグで動かし、R で回転、Delete で外す。線は概念図の接続から自動で引く
 * 右: 選んだ要素の情報と、シートの設定（母線・用紙）、展開図 JSON の書き出し
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Point, SymbolDef } from '../schematic/format';
import { PAPER_SIZES } from '../schematic/format';
import { autoLayout, nextPosition } from '../schematic/autoLayout';
import { canFlip, defaultRails, ROW_PITCH, type ElementEntry, type SchematicBuild } from '../schematic/layout';
import {
  newSchematicSheet,
  paperOf,
  snap,
  type PaperSize,
  type Rotation,
  type Schematic,
  type SchematicItem,
  type SchematicSheet,
} from '../schematic/model';
import { placedBounds, symbolBounds } from '../schematic/place';
import { sheetSvgBody, symbolSvg } from '../schematic/svg';
import { SheetTabs } from './SheetTabs';

export const ELEMENT_DRAG_TYPE = 'application/x-conneko-element';

interface Props {
  build: SchematicBuild;
  schematic: Schematic;
  onChange: (update: (s: Schematic) => Schematic) => void;
  sheet: string;
  onSheet: (id: string) => void;
  /** 概念図で機器を表示する */
  onShowDevice: (deviceId: string) => void;
  onExport: () => void;
}

/** 記号の小さなプレビュー（一覧用） */
function SymbolPreview({ def }: { def: SymbolDef }) {
  const b = symbolBounds(def);
  const pad = 1;
  const w = b.x2 - b.x1 + 2 * pad;
  const h = b.y2 - b.y1 + 2 * pad;
  return (
    <svg className="schem-preview" viewBox={`${b.x1 - pad} ${-b.y2 - pad} ${w} ${h}`} style={{ width: Math.min(56, w * 3.2), height: Math.min(34, h * 3.2) }}>
      <g
        transform="scale(1 -1)"
        fill="none"
        stroke="currentColor"
        strokeWidth={0.35}
        strokeLinecap="round"
        dangerouslySetInnerHTML={{ __html: symbolSvg(def) }}
      />
    </svg>
  );
}

/** 要素を、指定のシートの位置に置く（ほかのシートに置いてあれば移す） */
function placeElement(s: Schematic, sheetId: string, element: string, at: { x: number; y: number }, rotation?: Rotation): Schematic {
  return {
    ...s,
    sheets: s.sheets.map((sh) => {
      const rest = sh.items.filter((i) => i.element !== element);
      if (sh.id !== sheetId) return rest.length === sh.items.length ? sh : { ...sh, items: rest };
      const prev = sh.items.find((i) => i.element === element);
      const item: SchematicItem = { element, x: snap(at.x), y: snap(at.y), ...((rotation ?? prev?.rotation) ? { rotation: rotation ?? prev?.rotation } : {}) };
      return { ...sh, items: [...rest, item] };
    }),
  };
}

function updateItem(s: Schematic, element: string, patch: (it: SchematicItem) => SchematicItem | null): Schematic {
  return {
    ...s,
    sheets: s.sheets.map((sh) => {
      if (!sh.items.some((i) => i.element === element)) return sh;
      return { ...sh, items: sh.items.flatMap((i) => (i.element === element ? (patch(i) ?? []) : [i])) };
    }),
  };
}

const rotate = (r: Rotation | undefined, delta: number): Rotation => ((((r ?? 0) + delta) % 360) + 360) % 360 as Rotation;

export function SchematicEditor(props: Props) {
  const { build, schematic, onChange, sheet } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const current = schematic.sheets.find((s) => s.id === sheet) ?? schematic.sheets[0];
  const paper = paperOf(schematic);
  const selectedEntry = selected ? build.byId.get(selected) : undefined;

  // 選んだ要素が消えたら（元に戻すなど）選択を外す
  useEffect(() => {
    if (selected && !build.byId.get(selected)?.placed) setSelected(null);
  }, [build, selected]);

  const place = useCallback(
    (element: string, at?: { x: number; y: number }) => {
      const e = build.byId.get(element);
      if (!e || !current) return;
      onChange((s) => placeElement(s, current.id, element, at ?? nextPosition(current, e, paper, build.byId)));
      setSelected(element);
    },
    [build, current, onChange, paper],
  );

  const remove = useCallback(
    (element: string) => {
      onChange((s) => updateItem(s, element, () => null));
      setSelected(null);
    },
    [onChange],
  );

  const flip = useCallback(
    (element: string) => {
      const e = build.byId.get(element);
      if (e && canFlip(e.symbol)) onChange((s) => updateItem(s, element, (i) => ({ ...i, flip: !i.flip || undefined })));
    },
    [build, onChange],
  );

  const turn = useCallback((element: string, delta: number) => onChange((s) => updateItem(s, element, (i) => ({ ...i, rotation: rotate(i.rotation, delta) }))), [onChange]);

  // キー操作（文字の入力中は除く）
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return;
      if (!selected || e.ctrlKey || e.metaKey || e.altKey) return;
      const step = e.shiftKey ? 10 : 2.5;
      const move = (dx: number, dy: number) => onChange((s) => updateItem(s, selected, (i) => ({ ...i, x: snap(i.x + dx), y: snap(i.y + dy) })));
      if (e.key === 'r' || e.key === 'R') turn(selected, e.shiftKey ? -90 : 90);
      else if (e.key === 'f' || e.key === 'F') flip(selected);
      else if (e.key === 'Delete' || e.key === 'Backspace') remove(selected);
      else if (e.key === 'Escape') setSelected(null);
      else if (e.key === 'ArrowLeft') move(-step, 0);
      else if (e.key === 'ArrowRight') move(step, 0);
      else if (e.key === 'ArrowUp') move(0, -step);
      else if (e.key === 'ArrowDown') move(0, step);
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, onChange, turn, flip, remove]);

  const sheetsMeta = schematic.sheets.map((s) => ({ id: s.id, name: s.name }));
  const counts = useMemo(() => new Map(schematic.sheets.map((s) => [s.id, s.items.length])), [schematic]);

  return (
    <>
      <ElementList build={build} schematic={schematic} selected={selected} onPlace={place} onSelect={(id) => {
        const e = build.byId.get(id);
        if (e?.placed && e.placed.sheet !== sheet) props.onSheet(e.placed.sheet);
        setSelected(id);
      }} />
      <main className="canvas schem">
        <SheetTabs
          sheets={sheetsMeta}
          current={current?.id ?? ''}
          counts={counts}
          severity={new Map()}
          onSelect={(id) => {
            setSelected(null);
            props.onSheet(id);
          }}
          onAdd={() => {
            const ns = newSchematicSheet(schematic);
            onChange((s) => ({ ...s, sheets: [...s.sheets, { ...ns, rails: defaultRails(build.railCandidates) }] }));
            props.onSheet(ns.id);
          }}
          onRename={(id, name) => onChange((s) => ({ ...s, sheets: s.sheets.map((x) => (x.id === id ? { ...x, name } : x)) }))}
          onDelete={(id) => {
            const sh = schematic.sheets.find((x) => x.id === id);
            if (schematic.sheets.length <= 1) return void window.alert('展開図のシートは 1 枚以上必要です');
            if (sh?.items.length && !window.confirm(`展開図「${sh.name}」を削除しますか？（置いた ${sh.items.length} 個の記号は未配置に戻ります）`)) return;
            onChange((s) => ({ ...s, sheets: s.sheets.filter((x) => x.id !== id) }));
            if (id === sheet) props.onSheet(schematic.sheets.find((x) => x.id !== id)!.id);
          }}
          onMove={(id, delta) =>
            onChange((s) => {
              const i = s.sheets.findIndex((x) => x.id === id);
              const j = i + delta;
              if (i < 0 || j < 0 || j >= s.sheets.length) return s;
              const out = [...s.sheets];
              [out[i], out[j]] = [out[j], out[i]];
              return { ...s, sheets: out };
            })
          }
        />
        {current && (
          <SheetCanvas
            build={build}
            sheetId={current.id}
            paper={paper}
            selected={selected}
            onSelect={setSelected}
            onDropElement={place}
            onMove={(element, x, y) => onChange((s) => updateItem(s, element, (i) => ({ ...i, x: snap(x), y: snap(y) })))}
          />
        )}
      </main>
      <aside className="inspector schem-inspector">
        {selectedEntry?.placed ? (
          <ElementInfo
            entry={selectedEntry}
            row={build.rows.get(selectedEntry.id)}
            onTurn={(d) => turn(selectedEntry.id, d)}
            onFlip={canFlip(selectedEntry.symbol) ? () => flip(selectedEntry.id) : undefined}
            onRemove={() => remove(selectedEntry.id)}
            onShowDevice={() => props.onShowDevice(selectedEntry.device)}
          />
        ) : (
          current && (
            <SheetSettings
              build={build}
              schematic={schematic}
              sheet={current}
              onChange={onChange}
              onExport={props.onExport}
              onAuto={() => {
                const r = autoLayout(build, schematic, current.id, paper);
                if (r.placed) onChange(() => r.schematic);
                return r.placed ? `${r.placed} 個の記号を並べました（元に戻す: Ctrl+Z）` : (r.message ?? '');
              }}
            />
          )
        )}
      </aside>
    </>
  );
}

// ---- 要素の一覧 ----

function ElementList(props: {
  build: SchematicBuild;
  schematic: Schematic;
  selected: string | null;
  onPlace: (element: string) => void;
  onSelect: (element: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [showPlaced, setShowPlaced] = useState(false);
  const sheetName = useMemo(() => new Map(props.schematic.sheets.map((s) => [s.id, s.name])), [props.schematic]);
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out = new Map<string, ElementEntry[]>();
    for (const e of props.build.elements) {
      if (!showPlaced && e.placed) continue;
      const text = `${e.device} ${e.def.name} ${e.def.model} ${e.element.name}`.toLowerCase();
      if (q && !text.includes(q)) continue;
      out.set(e.device, [...(out.get(e.device) ?? []), e]);
    }
    return [...out];
  }, [props.build, query, showPlaced]);
  const total = props.build.elements.length;
  const placed = props.build.elements.filter((e) => e.placed).length;

  return (
    <aside className="palette schem-list">
      <div className="palette__head">
        <div className="panel-title">要素（記号）</div>
        <input className="palette__search" type="search" placeholder="機器名・型式・端子で検索" value={query} onChange={(e) => setQuery(e.target.value)} />
        <label className="small muted schem-list__toggle">
          <input type="checkbox" checked={showPlaced} onChange={(e) => setShowPlaced(e.target.checked)} />
          置いたものも表示（{placed} / {total} を配置済み）
        </label>
        <p className="small muted">用紙へドラッグするか、ダブルクリックで表示中の展開図に置きます。</p>
      </div>
      <div className="schem-list__body">
        {groups.length === 0 && <p className="small muted schem-list__empty">{total ? 'すべて配置済みです' : '概念図に機器がありません'}</p>}
        {groups.map(([device, els]) => (
          <section key={device} className="schem-list__group">
            <div className="schem-list__device">
              <b>{device}</b> <span className="muted">{els[0].def.name}（{els[0].def.model}）</span>
            </div>
            {els.map((e) => (
              <div
                key={e.id}
                className={`schem-list__item${e.placed ? ' is-placed' : ''}${props.selected === e.id ? ' is-selected' : ''}`}
                draggable
                onDragStart={(ev) => {
                  ev.dataTransfer.setData(ELEMENT_DRAG_TYPE, e.id);
                  ev.dataTransfer.effectAllowed = 'move';
                }}
                onClick={() => e.placed && props.onSelect(e.id)}
                onDoubleClick={() => props.onPlace(e.id)}
                title={e.placed ? `${sheetName.get(e.placed.sheet)} に配置済み（クリックで選択）` : 'ドラッグ、またはダブルクリックで置く'}
              >
                <SymbolPreview def={e.symbol} />
                <span className="schem-list__name">{e.element.name}</span>
                {e.placed && <span className="schem-list__where">{sheetName.get(e.placed.sheet)}</span>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </aside>
  );
}

// ---- 用紙 ----

const ZOOM_MIN = 1;
const ZOOM_MAX = 12;

function SheetCanvas(props: {
  build: SchematicBuild;
  sheetId: string;
  paper: { width: number; height: number };
  selected: string | null;
  onSelect: (element: string | null) => void;
  onDropElement: (element: string, at: { x: number; y: number }) => void;
  onMove: (element: string, x: number, y: number) => void;
}) {
  const { width: W, height: H } = props.paper;
  const view = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [zoom, setZoom] = useState(3);
  const drag = useRef<{ element: string; start: Point; origin: Point } | null>(null);
  const out = props.build.doc.sheets.find((s) => s.id === props.sheetId);

  const fit = useCallback(() => {
    const el = view.current;
    if (!el) return;
    setZoom(Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, Math.min((el.clientWidth - 32) / W, (el.clientHeight - 32) / H))));
  }, [W, H]);
  useEffect(() => fit(), [fit]);

  /** 画面の座標 → 用紙の座標[mm]（y は下向き） */
  const toPaper = (clientX: number, clientY: number): Point => {
    const m = svg.current?.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const d = drag.current;
      if (!d) return;
      const [x, y] = toPaper(e.clientX, e.clientY);
      props.onMove(d.element, d.origin[0] + x - d.start[0], d.origin[1] + y - d.start[1]);
    };
    const onUp = () => (drag.current = null);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const body = useMemo(() => (out ? sheetSvgBody(props.build.doc, out) : ''), [props.build, out]);
  if (!out) return null;

  return (
    <div className="schem-canvas">
      <div className="schem-canvas__tools">
        <button type="button" onClick={() => setZoom((z) => Math.max(ZOOM_MIN, z / 1.25))} aria-label="縮小">−</button>
        <span className="small muted">{Math.round((zoom / 3.78) * 100)}%</span>
        <button type="button" onClick={() => setZoom((z) => Math.min(ZOOM_MAX, z * 1.25))} aria-label="拡大">＋</button>
        <button type="button" onClick={fit}>用紙に合わせる</button>
        <span className="small muted schem-canvas__hint">ドラッグで移動・R で回転（Shift+R で逆）・F で端子の入れ替え・矢印キーで 2.5mm・Delete で外す</span>
      </div>
      <div
        className="schem-canvas__view"
        ref={view}
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes(ELEMENT_DRAG_TYPE)) e.preventDefault();
        }}
        onDrop={(e) => {
          const id = e.dataTransfer.getData(ELEMENT_DRAG_TYPE);
          if (!id) return;
          e.preventDefault();
          const [x, y] = toPaper(e.clientX, e.clientY);
          props.onDropElement(id, { x, y });
        }}
        onWheel={(e) => {
          if (!e.ctrlKey) return;
          e.preventDefault();
          setZoom((z) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z * (e.deltaY < 0 ? 1.1 : 1 / 1.1))));
        }}
      >
        <svg
          ref={svg}
          className="schem-paper"
          viewBox={`0 0 ${W} ${H}`}
          style={{ width: W * zoom, height: H * zoom }}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget || (e.target as Element).classList.contains('schem-paper__bg')) props.onSelect(null);
          }}
        >
          <defs>
            <pattern id="schem-grid" width={5} height={5} patternUnits="userSpaceOnUse">
              <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e5e9f0" strokeWidth={0.15} />
            </pattern>
          </defs>
          <rect className="schem-paper__bg" width={W} height={H} fill="#fff" />
          <rect className="schem-paper__bg" width={W} height={H} fill="url(#schem-grid)" />
          <g dangerouslySetInnerHTML={{ __html: body }} />
          {out.inserts.map((ins) => {
            const e = ins.element ? props.build.byId.get(ins.element) : undefined;
            if (!e) return null;
            const b = placedBounds(e.symbol, ins.at, ins.rotation);
            const pad = 1.5;
            const sel = props.selected === e.id;
            return (
              <rect
                key={e.id}
                className={`schem-hit${sel ? ' is-selected' : ''}`}
                x={b.x1 - pad}
                y={H - b.y2 - pad}
                width={b.x2 - b.x1 + 2 * pad}
                height={b.y2 - b.y1 + 2 * pad}
                rx={1}
                onPointerDown={(ev) => {
                  ev.stopPropagation();
                  props.onSelect(e.id);
                  const item = e.placed!.item;
                  drag.current = { element: e.id, start: toPaper(ev.clientX, ev.clientY), origin: [item.x, item.y] };
                }}
              >
                <title>{`${e.device} ${e.element.name}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

// ---- 右のパネル ----

function ElementInfo(props: {
  entry: ElementEntry;
  row?: number;
  onTurn: (delta: number) => void;
  onFlip?: () => void;
  onRemove: () => void;
  onShowDevice: () => void;
}) {
  const { entry: e } = props;
  return (
    <div className="schem-info">
      <div className="panel-title">選んだ記号</div>
      <div className="device-info__name">
        {e.device} <span className="muted">{e.element.name}</span>
      </div>
      <div className="small muted">
        {e.def.name}（{e.def.maker ? `${e.def.maker} ` : ''}
        {e.def.model}）
      </div>
      <SymbolPreview def={e.symbol} />
      <table className="schem-info__terminals">
        <tbody>
          {Object.entries(e.element.pinOf).map(([t, pin]) => (
            <tr key={t}>
              <td>{t}</td>
              <td className="muted">記号の端子 {pin}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="small muted">行番号: {props.row ?? '—'}</div>
      <div className="schem-info__actions">
        <button type="button" onClick={() => props.onTurn(90)}>⟲ 90°</button>
        <button type="button" onClick={() => props.onTurn(-90)}>⟳ 90°</button>
        {props.onFlip && (
          <button type="button" onClick={props.onFlip} title="記号の向きはそのままで、左右の端子を入れ替えます（F）">
            ⇄ 端子を入れ替え
          </button>
        )}
        <button type="button" onClick={props.onShowDevice}>概念図で表示</button>
        <button type="button" className="danger" onClick={props.onRemove}>
          展開図から外す
        </button>
      </div>
    </div>
  );
}

function SheetSettings(props: {
  build: SchematicBuild;
  schematic: Schematic;
  sheet: SchematicSheet;
  onChange: (update: (s: Schematic) => Schematic) => void;
  onExport: () => void;
  /** 自動で並べ、結果の説明を返す */
  onAuto: () => string;
}) {
  const { sheet, build } = props;
  const [autoMessage, setAutoMessage] = useState('');
  const setRail = (side: 'left' | 'right', ref: string) =>
    props.onChange((s) => ({
      ...s,
      sheets: s.sheets.map((x) => (x.id === sheet.id ? { ...x, rails: { ...x.rails, [side]: ref || undefined } } : x)),
    }));
  const options = [...build.railCandidates];
  for (const ref of [sheet.rails?.left, sheet.rails?.right]) {
    if (ref && !options.some((o) => o.ref === ref)) options.push({ ref, label: ref, conductor: '+' });
  }
  const placed = build.elements.filter((e) => e.placed).length;
  return (
    <div className="schem-settings">
      <div className="panel-title">展開図「{sheet.name}」</div>
      <label className="field">
        <span>左の母線（電源側）</span>
        <select value={sheet.rails?.left ?? ''} onChange={(e) => setRail('left', e.target.value)}>
          <option value="">なし</option>
          {options.map((o) => (
            <option key={o.ref} value={o.ref}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>右の母線（戻り側）</span>
        <select value={sheet.rails?.right ?? ''} onChange={(e) => setRail('right', e.target.value)}>
          <option value="">なし</option>
          {options.map((o) => (
            <option key={o.ref} value={o.ref}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
      <p className="small muted">母線にした電位につながる端子は、線を個別に引かず横にまっすぐ母線へ引き出します。</p>
      <button type="button" onClick={() => setAutoMessage(props.onAuto())} disabled={!sheet.rails?.left}>
        自動で並べる（未配置の段）
      </button>
      <p className="small muted">
        {autoMessage ||
          '左の母線から接点・コイル・表示灯・PLC の入出力点をたどり、コイルなどごとに 1 段にして並べます（自己保持などの枝は下の段）。置いた記号は動かしません。'}
      </p>
      <label className="field">
        <span>用紙（全シート共通）</span>
        <select
          value={props.schematic.settings?.paper ?? 'A3'}
          onChange={(e) => props.onChange((s) => ({ ...s, settings: { ...s.settings, paper: e.target.value as PaperSize } }))}
        >
          {(Object.keys(PAPER_SIZES) as PaperSize[]).map((p) => (
            <option key={p} value={p}>
              {p} 横
            </option>
          ))}
        </select>
      </label>
      <div className="small muted">
        配置済み {placed} / {build.elements.length} 個。1 枚 {build.rowsPerSheet} 段（段の間隔 {ROW_PITCH}mm）。
      </div>
      <hr />
      <button type="button" className="primary" onClick={props.onExport}>
        展開図 JSON を書き出す（DXF 用）
      </button>
      <p className="small muted">
        書き出した JSON は、リポジトリの tools/dxf の Python スクリプトで DXF に変換します（<code>uv run conneko_dxf.py 展開図.json 出力.dxf</code>）。
      </p>
      <hr />
      <p className="small muted">
        線は概念図の接続から自動で引きます。展開図の上では線を足したり消したりできないので、接続を変えるときは概念図で直してください。
      </p>
    </div>
  );
}

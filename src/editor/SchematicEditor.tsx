/**
 * 展開図エディタ（docs/schematic-dxf.md の段階 3）。
 *
 * 左: 要素の一覧（機器ごと。用紙へドラッグ、またはダブルクリックで置く）
 * 中央: 用紙。記号をドラッグで動かし、R で回転、Delete で外す。線は概念図の接続から自動で引く
 *       （空圧回路図は記号を自動で並べ、記号のまとまりをドラッグで動かせる。Delete で自動の位置に戻す）
 * 右: 選んだ要素の情報と、シートの設定（母線・用紙）、展開図 JSON の書き出し
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DiagramSettings } from '../model/diagram';
import type { Point, SymbolDef } from '../schematic/format';
import { autoLayout, nextPosition } from '../schematic/autoLayout';
import { canBeVertical, canFlip, itemSymbol, type ElementEntry, type SchematicBuild } from '../schematic/layout';
import { paperOf, snap, type Rotation, type Schematic, type SchematicItem, type WireBend } from '../schematic/model';
import type { PneumaticGroup } from '../schematic/sheets/pneumatic';
import { NewSheetDialog, SheetSettings } from './SchematicSheetPanel';
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
  /** 図面の情報（図面名・作成者・版。表題欄と表紙に入る） */
  settings: DiagramSettings;
  onSettings: (patch: Partial<DiagramSettings>) => void;
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

/** 空圧回路図の記号のまとまりを、指定のシートの位置へ動かす（items に位置を入れる） */
export function movePneumatic(s: Schematic, sheetId: string, element: string, at: { x: number; y: number }): Schematic {
  return {
    ...s,
    sheets: s.sheets.map((sh) =>
      sh.id !== sheetId ? sh : { ...sh, items: [...sh.items.filter((i) => i.element !== element), { element, x: snap(at.x), y: snap(at.y) }] },
    ),
  };
}

/** 空圧回路図の記号のまとまりを自動の位置に戻す（element を省くとシートのすべて） */
export function resetPneumatic(s: Schematic, sheetId: string, element?: string): Schematic {
  return {
    ...s,
    sheets: s.sheets.map((sh) => (sh.id !== sheetId ? sh : { ...sh, items: element ? sh.items.filter((i) => i.element !== element) : [] })),
  };
}

/** 展開接続図の線の曲がり位置を手で決める（bend が null なら自動に戻す。key を省くとシートのすべてを自動に戻す） */
export function setBend(s: Schematic, sheetId: string, key: string | null, bend: WireBend | null): Schematic {
  return {
    ...s,
    sheets: s.sheets.map((sh) => {
      if (sh.id !== sheetId) return sh;
      const { bends: _, ...rest } = sh;
      const next = { ...(key ? sh.bends : {}) };
      if (key) {
        if (bend) next[key] = bend.x !== undefined ? { x: snap(bend.x) } : { y: snap(bend.y!) };
        else delete next[key];
      }
      return Object.keys(next).length ? { ...rest, bends: next } : rest;
    }),
  };
}

const rotate = (r: Rotation | undefined, delta: number): Rotation => ((((r ?? 0) + delta) % 360) + 360) % 360 as Rotation;

export function SchematicEditor(props: Props) {
  const { build, schematic, onChange, sheet } = props;
  const [selected, setSelected] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const current = schematic.sheets.find((s) => s.id === sheet) ?? schematic.sheets[0];
  const paper = paperOf(schematic, current);
  const selectedEntry = selected ? build.byId.get(selected) : undefined;
  // 空圧回路図: 記号のまとまりをドラッグで動かす
  const pneumatic = current?.kind === 'pneumatic';
  const groups = useMemo(() => (pneumatic && current ? (build.pneumaticGroups.get(current.id) ?? []) : []), [build, current, pneumatic]);
  const selectedGroup = pneumatic ? groups.find((g) => g.element === selected) : undefined;

  // 選んだ要素が消えたら（元に戻すなど）選択を外す
  useEffect(() => {
    if (selected && !build.byId.get(selected)?.placed && !groups.some((g) => g.element === selected)) setSelected(null);
  }, [build, selected, groups]);

  const place = useCallback(
    (element: string, at?: { x: number; y: number }) => {
      const e = build.byId.get(element);
      // 内容を自動で作るシート（I/O 図・部品表など）には記号を置かない
      if (!e || !current || current.kind) return;
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

  const toggleVertical = useCallback(
    (element: string) => {
      const e = build.byId.get(element);
      if (e && canBeVertical(e)) onChange((s) => updateItem(s, element, (i) => ({ ...i, vertical: !i.vertical || undefined })));
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
      if (pneumatic && current) {
        // 空圧回路図: 矢印キーで動かし、Delete で自動の位置に戻す（回転・入れ替えはない）
        const g = groups.find((x) => x.element === selected);
        if (!g) return;
        const move = (dx: number, dy: number) => onChange((s) => movePneumatic(s, current.id, selected, { x: g.origin[0] + dx, y: g.origin[1] + dy }));
        if (e.key === 'Delete' || e.key === 'Backspace') onChange((s) => resetPneumatic(s, current.id, selected));
        else if (e.key === 'Escape') setSelected(null);
        else if (e.key === 'ArrowLeft') move(-step, 0);
        else if (e.key === 'ArrowRight') move(step, 0);
        else if (e.key === 'ArrowUp') move(0, -step);
        else if (e.key === 'ArrowDown') move(0, step);
        else return;
        e.preventDefault();
        return;
      }
      const move = (dx: number, dy: number) => onChange((s) => updateItem(s, selected, (i) => ({ ...i, x: snap(i.x + dx), y: snap(i.y + dy) })));
      if (e.key === 'r' || e.key === 'R') turn(selected, e.shiftKey ? -90 : 90);
      else if (e.key === 'f' || e.key === 'F') flip(selected);
      else if (e.key === 'v' || e.key === 'V') toggleVertical(selected);
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
  }, [selected, onChange, turn, flip, toggleVertical, remove, pneumatic, current, groups]);

  const sheetsMeta = schematic.sheets.map((s) => ({ id: s.id, name: s.name }));
  const counts = useMemo(() => new Map(schematic.sheets.map((s) => [s.id, s.items.length])), [schematic]);

  return (
    <>
      <ElementList build={build} schematic={schematic} selected={selected} generated={!!current?.kind} pneumatic={pneumatic} onPlace={place} onSelect={(id) => {
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
          onAdd={() => setAdding(true)}
          onRename={(id, name) => onChange((s) => ({ ...s, sheets: s.sheets.map((x) => (x.id === id ? { ...x, name } : x)) }))}
          onDelete={(id) => {
            const sh = schematic.sheets.find((x) => x.id === id);
            if (schematic.sheets.length <= 1) return void window.alert('展開図のシートは 1 枚以上必要です');
            if (!sh?.kind && sh?.items.length && !window.confirm(`展開図「${sh.name}」を削除しますか？（置いた ${sh.items.length} 個の記号は未配置に戻ります）`)) return;
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
            groups={pneumatic ? groups : undefined}
            bends={pneumatic ? undefined : (current.bends ?? {})}
            onBend={(key, bend) => onChange((s) => setBend(s, current.id, key, bend))}
            onMove={(element, x, y) =>
              pneumatic
                ? onChange((s) => movePneumatic(s, current.id, element, { x, y }))
                : onChange((s) => updateItem(s, element, (i) => ({ ...i, x: snap(x), y: snap(y) })))
            }
          />
        )}
      </main>
      <aside className="inspector schem-inspector">
        {selectedGroup && current ? (
          <PneumaticGroupInfo
            group={selectedGroup}
            moved={current.items.some((i) => i.element === selectedGroup.element)}
            onReset={() => onChange((s) => resetPneumatic(s, current.id, selectedGroup.element))}
            onShowDevice={() => props.onShowDevice(selectedGroup.device)}
          />
        ) : selectedEntry?.placed ? (
          <ElementInfo
            entry={selectedEntry}
            row={build.rows.get(selectedEntry.id)}
            onTurn={(d) => turn(selectedEntry.id, d)}
            onFlip={canFlip(selectedEntry.symbol) ? () => flip(selectedEntry.id) : undefined}
            onVertical={canBeVertical(selectedEntry) ? () => toggleVertical(selectedEntry.id) : undefined}
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
              settings={props.settings}
              onSettings={props.onSettings}
              onAuto={() => {
                const r = autoLayout(build, schematic, current.id, paper);
                if (r.placed) onChange(() => r.schematic);
                return r.placed ? `${r.placed} 個の記号を並べました（元に戻す: Ctrl+Z）` : (r.message ?? '');
              }}
              onResetPneumatic={() => onChange((s) => resetPneumatic(s, current.id))}
            />
          )
        )}
      </aside>
      {adding && (
        <NewSheetDialog
          build={build}
          schematic={schematic}
          onClose={() => setAdding(false)}
          onCreate={(ns, first) => {
            setAdding(false);
            setSelected(null);
            onChange((s) => ({ ...s, sheets: first ? [ns, ...s.sheets] : [...s.sheets, ns] }));
            props.onSheet(ns.id);
          }}
        />
      )}
    </>
  );
}

// ---- 要素の一覧 ----

function ElementList(props: {
  build: SchematicBuild;
  schematic: Schematic;
  selected: string | null;
  /** 表示中のシートが内容を自動で作るシート（記号を置けない） */
  generated: boolean;
  /** 表示中のシートが空圧回路図（記号は用紙の上で動かす） */
  pneumatic?: boolean;
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
        <p className="small muted">
          {props.pneumatic
            ? '空圧回路図は概念図のエア機器から記号を自動で並べます。用紙の上で記号をドラッグすると動かせます（Delete で自動の位置に戻す）。'
            : props.generated
            ? '表示中のシートは内容を概念図から自動で作るので、記号は置けません（展開接続図のシートに切り替えて置きます）。'
            : '用紙へドラッグするか、ダブルクリックで表示中の展開図に置きます。'}
        </p>
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

/** 倍率（画面の px / 用紙の mm）の範囲 */
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 16;
/** ページを縦に並べるときの間隔[px] */
const PAGE_GAP = 16;
const clampZoom = (z: number) => Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));

/**
 * 用紙の表示。概念図と同じく、空いているところのドラッグで動かし（パン）、ホイールでカーソルの位置を中心に拡大・縮小する。
 * 記号はドラッグで動かす。
 */
function SheetCanvas(props: {
  build: SchematicBuild;
  sheetId: string;
  paper: { width: number; height: number };
  selected: string | null;
  onSelect: (element: string | null) => void;
  onDropElement: (element: string, at: { x: number; y: number }) => void;
  onMove: (element: string, x: number, y: number) => void;
  /** 空圧回路図の、ドラッグで動かせる記号のまとまり */
  groups?: PneumaticGroup[];
  /** 展開接続図の線の曲がり位置（手で動かした線）。undefined なら線は動かせない */
  bends?: Record<string, WireBend>;
  /** 線の曲がり位置を動かす（key が null ならシートのすべての線を自動に戻す） */
  onBend: (key: string | null, bend: WireBend | null) => void;
}) {
  const { width: W, height: H } = props.paper;
  const view = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  // 倍率と、用紙の左上の表示位置[px]
  const [viewport, setViewport] = useState({ zoom: 3, x: 16, y: 16 });
  const { zoom } = viewport;
  const drag = useRef<{ element: string; start: Point; origin: Point } | null>(null);
  // 線の区間のドラッグ（縦の区間は左右へ、横の区間は上下へ動かす）
  const wireDrag = useRef<{ edge: string; axis: 'x' | 'y'; start: Point; origin: number } | null>(null);
  const pan = useRef<{ x: number; y: number; vx: number; vy: number; moved: boolean } | null>(null);
  const [panning, setPanning] = useState(false);
  // 端子台接続図は 1 枚のシートが複数のページになる（2 ページ目からは表示だけ）
  const pages = props.build.doc.sheets.filter((s) => (s.source ?? s.id) === props.sheetId);
  const out = pages[0];

  /** 用紙（1 ページ目）を表示の中央に収める */
  const fit = useCallback(() => {
    const el = view.current;
    if (!el) return;
    const z = clampZoom(Math.min((el.clientWidth - 32) / W, (el.clientHeight - 32) / H));
    setViewport({ zoom: z, x: (el.clientWidth - W * z) / 2, y: Math.max(16, (el.clientHeight - H * z) / 2) });
  }, [W, H]);
  useEffect(() => fit(), [fit, props.sheetId]);

  /** 表示の中の点（px）を中心に倍率を変える */
  const zoomAt = useCallback((factor: number, cx?: number, cy?: number) => {
    setViewport((v) => {
      const el = view.current;
      const px = cx ?? (el ? el.clientWidth / 2 : 0);
      const py = cy ?? (el ? el.clientHeight / 2 : 0);
      const z = clampZoom(v.zoom * factor);
      const k = z / v.zoom;
      return { zoom: z, x: px - (px - v.x) * k, y: py - (py - v.y) * k };
    });
  }, []);

  // ホイールで拡大・縮小（ページのスクロールを止めるため passive: false で受ける）
  useEffect(() => {
    const el = view.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      // トラックパッドの横スクロール（Shift なし）はパンにする
      if (!e.ctrlKey && Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        setViewport((v) => ({ ...v, x: v.x - e.deltaX, y: v.y - e.deltaY }));
        return;
      }
      zoomAt(Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015)), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [zoomAt]);

  /** 画面の座標 → 用紙の座標[mm]（y は下向き） */
  const toPaper = (clientX: number, clientY: number): Point => {
    const m = svg.current?.getScreenCTM();
    if (!m) return [0, 0];
    const p = new DOMPoint(clientX, clientY).matrixTransform(m.inverse());
    return [p.x, p.y];
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const p = pan.current;
      if (p) {
        const dx = e.clientX - p.x;
        const dy = e.clientY - p.y;
        if (Math.abs(dx) + Math.abs(dy) > 2) p.moved = true;
        setViewport((v) => ({ ...v, x: p.vx + dx, y: p.vy + dy }));
        return;
      }
      const w = wireDrag.current;
      if (w) {
        const [x, y] = toPaper(e.clientX, e.clientY);
        props.onBend(w.edge, w.axis === 'x' ? { x: w.origin + x - w.start[0] } : { y: w.origin + y - w.start[1] });
        return;
      }
      const d = drag.current;
      if (!d) return;
      const [x, y] = toPaper(e.clientX, e.clientY);
      props.onMove(d.element, d.origin[0] + x - d.start[0], d.origin[1] + y - d.start[1]);
    };
    const onUp = () => {
      // 動かさずに離したら（クリック）選択を外す
      if (pan.current && !pan.current.moved) props.onSelect(null);
      pan.current = null;
      drag.current = null;
      wireDrag.current = null;
      setPanning(false);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  });

  const body = useMemo(() => (out ? sheetSvgBody(props.build.doc, out) : ''), [props.build, out]);
  const rest = useMemo(() => pages.slice(1).map((p) => ({ id: p.id, body: sheetSvgBody(props.build.doc, p) })), [props.build, pages]);
  if (!out) return null;

  return (
    <div className="schem-canvas">
      <div className="schem-canvas__tools">
        <button type="button" onClick={() => zoomAt(1 / 1.25)} aria-label="縮小">−</button>
        <span className="small muted">{Math.round((zoom / 3.78) * 100)}%</span>
        <button type="button" onClick={() => zoomAt(1.25)} aria-label="拡大">＋</button>
        <button type="button" onClick={fit}>用紙に合わせる</button>
        {props.bends && Object.keys(props.bends).length > 0 && (
          <button type="button" onClick={() => props.onBend(null, null)} title="このシートで手で動かした線の曲がり位置を、すべて自動に戻します">
            線を自動に戻す
          </button>
        )}
        <span className="small muted schem-canvas__hint">
          {props.groups
            ? 'ホイールで拡大・縮小・空いているところのドラッグで移動・記号はドラッグで移動（配管は引き直します）、矢印キーで少しずつ、Delete で自動の位置に戻す'
            : 'ホイールで拡大・縮小・空いているところのドラッグで移動・記号はドラッグで移動、R で回転、V で縦/横、F で端子の入れ替え、Delete で外す・線の区間はドラッグで曲がり位置を動かし、ダブルクリックで自動に戻す'}
        </span>
      </div>
      <div
        className={`schem-canvas__view${panning ? ' is-panning' : ''}`}
        ref={view}
        onPointerDown={(e) => {
          // 記号の上以外（用紙の空いているところ・用紙の外）を左ボタンか中ボタンでドラッグすると動かす
          if ((e.target as Element).closest('.schem-hit, .schem-wire-hit') || (e.button !== 0 && e.button !== 1)) return;
          e.preventDefault();
          pan.current = { x: e.clientX, y: e.clientY, vx: viewport.x, vy: viewport.y, moved: false };
          setPanning(true);
        }}
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
      >
        <div className="schem-canvas__pages" style={{ transform: `translate(${viewport.x}px, ${viewport.y}px)`, gap: PAGE_GAP }}>
          <svg ref={svg} className="schem-paper" viewBox={`0 0 ${W} ${H}`} style={{ width: W * zoom, height: H * zoom }}>
            <defs>
              <pattern id="schem-grid" width={5} height={5} patternUnits="userSpaceOnUse">
                <path d="M 5 0 L 0 0 0 5" fill="none" stroke="#e5e9f0" strokeWidth={0.15} />
              </pattern>
            </defs>
            <rect className="schem-paper__bg" width={W} height={H} fill="#fff" />
            <rect className="schem-paper__bg" width={W} height={H} fill="url(#schem-grid)" />
            <g dangerouslySetInnerHTML={{ __html: body }} />
            {/* 線の区間（記号より下に置き、記号の上では記号をつかむ） */}
            {props.bends &&
              out.polylines.flatMap((pl, k) => {
                const edge = pl.edge;
                if (!edge) return [];
                const moved = !!props.bends?.[edge];
                return pl.points.slice(1).map((p, i) => {
                  const a = pl.points[i];
                  const vertical = Math.abs(a[0] - p[0]) < 1e-6;
                  if (Math.abs(a[0] - p[0]) + Math.abs(a[1] - p[1]) < 1e-6) return null;
                  return (
                    <line
                      key={`${k}-${i}`}
                      className={`schem-wire-hit${moved ? ' is-moved' : ''}${vertical ? ' is-vertical' : ''}`}
                      x1={a[0]}
                      y1={H - a[1]}
                      x2={p[0]}
                      y2={H - p[1]}
                      onPointerDown={(ev) => {
                        if (ev.button !== 0) return;
                        ev.stopPropagation();
                        wireDrag.current = { edge, axis: vertical ? 'x' : 'y', start: toPaper(ev.clientX, ev.clientY), origin: vertical ? a[0] : H - a[1] };
                      }}
                      onDoubleClick={(ev) => {
                        ev.stopPropagation();
                        props.onBend(edge, null);
                      }}
                    >
                      <title>{moved ? 'ドラッグで曲がり位置を動かす・ダブルクリックで自動に戻す' : 'ドラッグで曲がり位置を動かす'}</title>
                    </line>
                  );
                });
              })}
            {out.inserts.map((ins) => {
              const e = ins.element ? props.build.byId.get(ins.element) : undefined;
              if (!e) return null;
              const b = placedBounds(itemSymbol(e, e.placed!.item), ins.at, ins.rotation);
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
                    if (ev.button !== 0) return;
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
            {props.groups?.map((g) => {
              const pad = 1.5;
              const sel = props.selected === g.element;
              return (
                <rect
                  key={g.element}
                  className={`schem-hit${sel ? ' is-selected' : ''}`}
                  x={g.bounds.x - pad}
                  y={g.bounds.y - pad}
                  width={g.bounds.w + 2 * pad}
                  height={g.bounds.h + 2 * pad}
                  rx={1}
                  data-element={g.element}
                  onPointerDown={(ev) => {
                    if (ev.button !== 0) return;
                    ev.stopPropagation();
                    props.onSelect(g.element);
                    drag.current = { element: g.element, start: toPaper(ev.clientX, ev.clientY), origin: g.origin };
                  }}
                >
                  <title>{g.label}</title>
                </rect>
              );
            })}
          </svg>
          {rest.map((p) => (
            <svg key={p.id} className="schem-paper" viewBox={`0 0 ${W} ${H}`} style={{ width: W * zoom, height: H * zoom }}>
              <rect width={W} height={H} fill="#fff" />
              <g dangerouslySetInnerHTML={{ __html: p.body }} />
            </svg>
          ))}
        </div>
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
  onVertical?: () => void;
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
      <SymbolPreview def={e.placed ? itemSymbol(e, e.placed.item) : e.symbol} />
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
        {props.onVertical && (
          <button type="button" onClick={props.onVertical} title="主回路の縦向きの記号と横向きを切り替えます（V）">
            {e.placed?.item.vertical ? '↔ 横にする' : '↕ 縦にする'}
          </button>
        )}
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

function PneumaticGroupInfo(props: { group: PneumaticGroup; moved: boolean; onReset: () => void; onShowDevice: () => void }) {
  const { group: g } = props;
  return (
    <div className="schem-info">
      <div className="panel-title">選んだ記号（空圧回路図）</div>
      <div className="device-info__name">{g.label}</div>
      <div className="small muted">
        {props.moved ? `動かした位置（左上 ${g.origin[0]}, ${g.origin[1]} mm）に置いています。` : '自動の位置に置いています。'}
        ドラッグか矢印キー（Shift で 10mm）で動かすと、配管を引き直します。
      </div>
      <div className="schem-info__actions">
        <button type="button" onClick={props.onReset} disabled={!props.moved} title="この記号を自動で決めた位置に戻します（Delete）">
          自動配置に戻す
        </button>
        <button type="button" onClick={props.onShowDevice}>概念図で表示</button>
      </div>
    </div>
  );
}

/**
 * 図面 JSON に保存する展開図の配置（`schematic`）の型と読み書き。
 *
 * 展開図は配置だけを持ち、接続は概念図（devices / wires）から求める（docs/schematic-dxf.md）。
 * 座標はシート上の mm で、左上が原点・y は下向き（画面と同じ向き）。書き出す展開図 JSON（DXF と同じ上向き）とは向きが逆。
 */
import { PAPER_SIZES } from './format';

export type PaperSize = keyof typeof PAPER_SIZES;

export type Rotation = 0 | 90 | 180 | 270;

/** 配置した要素 */
export interface SchematicItem {
  /** 要素 ID（`<機器名>:<キー>`。例: 'MC1:13-14'） */
  element: string;
  /** 記号の基準点（挿入点）[mm] */
  x: number;
  y: number;
  /** 反時計回りの回転[度] */
  rotation?: Rotation;
  /** 端子 1 と 2 を入れ替えて置く（記号の向きはそのままで、左右の端子を逆にする。接点・コイルなど 2 端子の記号だけ） */
  flip?: boolean;
  /** 縦向きの記号で置く（主回路の遮断器・電磁接触器・熱動素子・電動機・一次電源。上から下へ流れ、極は左から右へ並ぶ） */
  vertical?: boolean;
}

/**
 * 母線。supply が電源側（P24・R など）、common が戻り側（N24・S など）の網（`機器名.端子ID`。その端子とつながった網全体）。
 * layout は並べ方: 'left'（既定。左に電源側・戻り側の順に並べ、段の終わりから段の下を通って戻り側へ戻す）/
 * 'sides'（左に電源側、右に戻り側。ラダー図の形）
 */
export interface Rails {
  supply?: string;
  common?: string;
  layout?: 'left' | 'sides';
}

export interface SchematicSheet {
  id: string;
  name: string;
  /** シートの種類。省略時は展開接続図（記号を置く）。'terminal' は端子台接続図（端子台ごとの表を自動で作る。items は使わない） */
  kind?: 'terminal';
  /** 端子台接続図にする端子台の機器名（省略時は図面のすべての端子台） */
  blocks?: string[];
  /** 母線 */
  rails?: Rails;
  items: SchematicItem[];
}

export interface SchematicSettings {
  /** 用紙（横置き）。既定は A3 */
  paper?: PaperSize;
}

export interface Schematic {
  settings?: SchematicSettings;
  sheets: SchematicSheet[];
}

/** 配置の格子[mm] */
export const SCHEMATIC_GRID = 2.5;

export const snap = (v: number) => Math.round(v / SCHEMATIC_GRID) * SCHEMATIC_GRID;

export function paperOf(s: Schematic | undefined): { width: number; height: number } {
  return PAPER_SIZES[s?.settings?.paper ?? 'A3'];
}

/** 要素 ID を機器名とキーに分ける */
export function splitElementId(id: string): { device: string; key: string } {
  const i = id.indexOf(':');
  return i < 0 ? { device: id, key: '' } : { device: id.slice(0, i), key: id.slice(i + 1) };
}

/** 母線の指定（'PS1.+V'）を機器名と端子 ID に分ける */
export function splitRail(ref: string): { device: string; terminal: string } | undefined {
  const i = ref.indexOf('.');
  return i > 0 ? { device: ref.slice(0, i), terminal: ref.slice(i + 1) } : undefined;
}

export function newSchematicSheet(s: Schematic | undefined): SchematicSheet {
  const used = new Set(s?.sheets.map((x) => x.id) ?? []);
  let n = 1;
  while (used.has(`D${n}`)) n++;
  return { id: `D${n}`, name: `展開図${(s?.sheets.length ?? 0) + 1}`, items: [] };
}

/** 機器名の変更を配置にも反映する */
export function renameSchematicDevice(s: Schematic | undefined, from: string, to: string): Schematic | undefined {
  if (!s) return s;
  const el = (id: string) => (splitElementId(id).device === from ? `${to}:${splitElementId(id).key}` : id);
  const rail = (ref?: string) => (ref && splitRail(ref)?.device === from ? `${to}.${splitRail(ref)!.terminal}` : ref);
  const rails = (r: Rails): Rails => ({ ...r, supply: rail(r.supply), common: rail(r.common) });
  return {
    ...s,
    sheets: s.sheets.map((sh) => ({
      ...sh,
      ...(sh.rails ? { rails: rails(sh.rails) } : {}),
      ...(sh.blocks ? { blocks: sh.blocks.map((b) => (b === from ? to : b)) } : {}),
      items: sh.items.map((it) => ({ ...it, element: el(it.element) })),
    })),
  };
}

/** 図面にない機器の要素の配置と母線の指定を取り除く。変わらなければ同じオブジェクトを返す */
export function pruneSchematic(s: Schematic | undefined, devices: Set<string>): Schematic | undefined {
  if (!s) return s;
  let changed = false;
  const sheets = s.sheets.map((sh) => {
    const items = sh.items.filter((it) => devices.has(splitElementId(it.element).device));
    const keep = (ref?: string) => (ref && devices.has(splitRail(ref)?.device ?? '') ? ref : undefined);
    const rails = sh.rails ? { ...sh.rails, supply: keep(sh.rails.supply), common: keep(sh.rails.common) } : undefined;
    const railsChanged = !!sh.rails && (rails?.supply !== sh.rails.supply || rails?.common !== sh.rails.common);
    const blocks = sh.blocks?.filter((b) => devices.has(b));
    const blocksChanged = !!sh.blocks && blocks!.length !== sh.blocks.length;
    if (items.length === sh.items.length && !railsChanged && !blocksChanged) return sh;
    changed = true;
    return { ...sh, items, ...(rails ? { rails } : {}), ...(blocks ? { blocks } : {}) };
  });
  return changed ? { ...s, sheets } : s;
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** 図面 JSON の schematic を読む（壊れた部分は読み飛ばす）。無い・空なら undefined */
export function parseSchematic(raw: unknown): Schematic | undefined {
  if (!isObj(raw) || !Array.isArray(raw.sheets)) return undefined;
  const sheets: SchematicSheet[] = [];
  raw.sheets.forEach((v, i) => {
    if (!isObj(v)) return;
    const id = typeof v.id === 'string' && v.id ? v.id : `D${i + 1}`;
    if (sheets.some((s) => s.id === id)) return;
    const name = typeof v.name === 'string' && v.name ? v.name : `展開図${i + 1}`;
    const seen = new Set<string>();
    const items: SchematicItem[] = [];
    for (const it of Array.isArray(v.items) ? v.items : []) {
      if (!isObj(it) || typeof it.element !== 'string' || typeof it.x !== 'number' || typeof it.y !== 'number') continue;
      // 1 つの要素は 1 か所にだけ置く（後から書いた方を無視する）
      if (seen.has(it.element) || sheets.some((s) => s.items.some((x) => x.element === it.element))) continue;
      seen.add(it.element);
      const rot = Number(it.rotation);
      items.push({
        element: it.element,
        x: it.x,
        y: it.y,
        ...(rot === 90 || rot === 180 || rot === 270 ? { rotation: rot } : {}),
        ...(it.flip === true ? { flip: true } : {}),
        ...(it.vertical === true ? { vertical: true } : {}),
      });
    }
    // 母線は supply / common（以前の形式の left / right も受け付ける）
    const str = (x: unknown) => (typeof x === 'string' && x ? x : undefined);
    const rails: Rails | undefined = isObj(v.rails)
      ? Object.fromEntries(
          Object.entries({
            supply: str(v.rails.supply) ?? str(v.rails.left),
            common: str(v.rails.common) ?? str(v.rails.right),
            layout: v.rails.layout === 'sides' || (v.rails.layout === undefined && str(v.rails.right) && !str(v.rails.common)) ? ('sides' as const) : undefined,
          }).filter(([, x]) => x !== undefined),
        )
      : undefined;
    const kind = v.kind === 'terminal' ? ('terminal' as const) : undefined;
    const blocks = Array.isArray(v.blocks) ? v.blocks.filter((b): b is string => typeof b === 'string' && !!b) : undefined;
    sheets.push({
      id,
      name,
      ...(kind ? { kind } : {}),
      ...(kind && blocks ? { blocks } : {}),
      ...(rails && Object.keys(rails).length ? { rails } : {}),
      items: kind ? [] : items,
    });
  });
  if (!sheets.length) return undefined;
  const paper = isObj(raw.settings) && typeof raw.settings.paper === 'string' && raw.settings.paper in PAPER_SIZES ? (raw.settings.paper as PaperSize) : undefined;
  return { ...(paper ? { settings: { paper } } : {}), sheets };
}

/** 図面 JSON に書く形（座標を丸め、空の値を省く） */
export function serializeSchematic(s: Schematic): Schematic {
  const r = (v: number) => Math.round(v * 100) / 100;
  return {
    ...(s.settings?.paper ? { settings: { paper: s.settings.paper } } : {}),
    sheets: s.sheets.map((sh) => ({
      id: sh.id,
      name: sh.name,
      ...(sh.kind ? { kind: sh.kind } : {}),
      ...(sh.kind && sh.blocks ? { blocks: sh.blocks } : {}),
      ...(sh.rails && (sh.rails.supply || sh.rails.common)
        ? {
            rails: {
              ...(sh.rails.supply ? { supply: sh.rails.supply } : {}),
              ...(sh.rails.common ? { common: sh.rails.common } : {}),
              ...(sh.rails.layout === 'sides' ? { layout: 'sides' as const } : {}),
            },
          }
        : {}),
      items: sh.items.map((it) => ({
        element: it.element,
        x: r(it.x),
        y: r(it.y),
        ...(it.rotation ? { rotation: it.rotation } : {}),
        ...(it.flip ? { flip: true } : {}),
        ...(it.vertical ? { vertical: true } : {}),
      })),
    })),
  };
}

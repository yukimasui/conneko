/**
 * 展開図 JSON（conneko-schematic）の型。アプリが書き出し、tools/dxf の Python スクリプトが DXF にする。
 *
 * 座標・記号・線・文字はすべて解決済みで、Python 側は図形を DXF に写すだけにする（docs/schematic-dxf.md）。
 * - 単位は mm。座標は DXF と同じ向き（各シートの左下が原点、y は上向きが正）。
 * - 角度は度で、反時計回りが正。
 * - 文字の `at` は文字の高さの中央。`align` で左端・中央・右端のどれをそこに合わせるかを決める。
 */

export const SCHEMATIC_FORMAT = 'conneko-schematic';
export const SCHEMATIC_VERSION = 1;

export type Point = [number, number];

export type TextAlign = 'left' | 'center' | 'right';

/** 記号の図形。この 4 種類だけで描く */
export type Primitive =
  /** 折れ線（2 点なら線分）。closed で閉じる。dashed は機械的な連動を表す破線 */
  | { kind: 'line'; points: Point[]; closed?: boolean; dashed?: boolean }
  | { kind: 'circle'; center: Point; r: number }
  /** 円弧。start から end まで反時計回り */
  | { kind: 'arc'; center: Point; r: number; start: number; end: number }
  /** 固定の文字 */
  | { kind: 'text'; at: Point; text: string; height: number; align?: TextAlign };

/** 配置ごとに変わる文字（DXF の属性）。値は SchematicInsert.attributes で渡す */
export interface AttributeDef {
  tag: string;
  at: Point;
  height: number;
  align?: TextAlign;
}

/** 記号の定義（DXF のブロックになる）。座標は記号の基準点（挿入点）からの相対 */
export interface SymbolDef {
  /** 記号の説明（例: 'a 接点'） */
  description: string;
  primitives: Primitive[];
  /** 端子の位置（線をつなぐ点）。記号の端子名 → 位置 */
  pins: Record<string, Point>;
  attributes: AttributeDef[];
}

/** 記号の配置（DXF の INSERT） */
export interface SchematicInsert {
  symbol: string;
  at: Point;
  /** 0 / 90 / 180 / 270 */
  rotation?: number;
  layer: string;
  /** 属性の値（属性のタグ → 文字） */
  attributes?: Record<string, string>;
  /** 元になった要素の ID（例: 'MC1:13-14'）。DXF には書かない */
  element?: string;
}

export interface SchematicPolyline {
  points: Point[];
  layer: string;
  closed?: boolean;
  dashed?: boolean;
  /** 元になった電線の ID。DXF には書かない */
  wire?: string;
}

/** 線の接続点（T 字の黒丸） */
export interface SchematicDot {
  at: Point;
  layer: string;
}

export interface SchematicText {
  at: Point;
  text: string;
  height: number;
  align?: TextAlign;
  rotation?: number;
  layer: string;
}

export interface SchematicSheetOut {
  id: string;
  name: string;
  /** 元になった展開図のシートの ID（端子台接続図は 1 枚のシートから複数のページになる）。DXF には書かない */
  source?: string;
  /** 用紙の大きさ[mm] */
  paper: { width: number; height: number };
  inserts: SchematicInsert[];
  polylines: SchematicPolyline[];
  dots: SchematicDot[];
  texts: SchematicText[];
}

/** レイヤー。color は AutoCAD の色番号（7 は背景に応じて白/黒） */
export interface LayerDef {
  color: number;
  description?: string;
}

export interface SchematicExport {
  format: typeof SCHEMATIC_FORMAT;
  version: number;
  unit: 'mm';
  title?: string;
  revision?: string;
  layers: Record<string, LayerDef>;
  symbols: Record<string, SymbolDef>;
  sheets: SchematicSheetOut[];
}

/** 既定のレイヤー（社内の決まりがないので Conneko の既定として決めたもの） */
export const SCHEMATIC_LAYERS: Record<string, LayerDef> = {
  FRAME: { color: 7, description: '図面枠・表題欄・行番号' },
  SYMBOL: { color: 7, description: '記号' },
  WIRE: { color: 7, description: '線・母線・接続点' },
  WIRENO: { color: 3, description: '線番' },
  TAG: { color: 2, description: '機器名・端子番号・接点の所在' },
  TEXT: { color: 7, description: 'その他の文字' },
};

/** 用紙の大きさ[mm]（横置き） */
export const PAPER_SIZES = {
  A3: { width: 420, height: 297 },
  A4: { width: 297, height: 210 },
} as const;

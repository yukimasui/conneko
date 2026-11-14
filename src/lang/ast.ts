/**
 * 配線言語（.cnk）の構文木。
 *
 * 文は 6 種類:
 * - 機器の宣言      `ELB1 = mitsubishi.nv32-sv.3p(ratedCurrent=20) "コメント"`
 * - 配線            `R1: ELB1.2 -- MC1.1/L1 black 3.5sq`
 * - 電線の既定      `wire KIV 3.5sq black { … }`
 * - シート          `sheet S1 "主回路" { … }`
 * - 端子のコメント  `comment IN1.CN1#1 "PH1 ワーク検出"`
 * - 図面の設定      `title "コンベア制御盤"`
 */
import type { Span } from './lexer';

export interface Text {
  value: string;
  span: Span;
}

/** 端子（機器名.端子ID）か、リンク（<名前>） */
export type Endpoint = { kind: 'terminal'; device: Text; terminal: Text; span: Span } | { kind: 'link'; name: Text; span: Span };

/** 電線の属性（`black`・`3.5sq`・`KIV` のような単語か、`no=R1` のようなキーと値） */
export interface Attr {
  key?: Text;
  value: Text;
  span: Span;
}

export interface ChainStmt {
  type: 'chain';
  /** 線番（1 つならすべての電線に、並びなら並んだ電線の順に付ける） */
  labels: Text[];
  /** `--` で区切った端子の並び（1 つの並びは 1 個以上の端子） */
  groups: { endpoints: Endpoint[]; span: Span }[];
  attrs: Attr[];
  span: Span;
}

export interface DeviceStmt {
  type: 'device';
  id: Text;
  deviceType: Text;
  params: { key: Text; value: Text; quoted: boolean }[];
  note?: Text;
  at?: { x: number; y: number };
  slot?: number;
  /** 装着先（`on PLC1`。ブロックの中に書いた機器は、囲んでいる機器） */
  on?: Text;
  children: DeviceStmt[];
  span: Span;
}

export interface WireBlock {
  type: 'wire';
  attrs: Attr[];
  body: Stmt[];
  span: Span;
}

export interface SheetBlock {
  type: 'sheet';
  id?: Text;
  name?: Text;
  body: Stmt[];
  span: Span;
}

export interface CommentStmt {
  type: 'comment';
  target: Endpoint;
  text: Text;
  span: Span;
}

export interface SettingStmt {
  type: 'setting';
  key: Text;
  value: Text;
  span: Span;
}

export type Stmt = ChainStmt | DeviceStmt | WireBlock | SheetBlock | CommentStmt | SettingStmt;

export interface Program {
  body: Stmt[];
}

/** 図面の設定に書けるキー */
export const SETTING_KEYS = ['title', 'author', 'revision', 'requiredPL'] as const;

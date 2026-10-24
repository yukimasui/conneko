import { createContext, useContext } from 'react';
import type { CheckIssue, Severity } from '../check/checkDiagram';
import type { ConnectorSpec, ParamValues, TerminalSide } from '../devices/types';

/** 電線の両端の形状情報 */
export interface WireGeometry {
  sStub: number;
  tStub: number;
  /** 端子から電線を出す向き（自動の判定や手動の指定を反映したもの） */
  sSide: TerminalSide;
  tSide: TerminalSide;
  /** 端子の中心（キャンバス上の座標） */
  sCenter: { x: number; y: number };
  tCenter: { x: number; y: number };
  /** おねじのポートを直接ねじ込んだエアの接続（チューブではなく直結として描く） */
  direct?: boolean;
  /** 両端がコネクタならケーブルとして描く */
  sConnector?: ConnectorSpec;
  tConnector?: ConnectorSpec;
}

export interface EditorContextValue {
  /** 機器ID → 最も重い指摘の重要度 */
  deviceSeverity: Map<string, Severity>;
  /** 電線ID → 最も重い指摘の重要度 */
  wireSeverity: Map<string, Severity>;
  /** 電線ID → レーンのずらし量 */
  lanes: Map<string, number>;
  /** 電線ID → 両端の形状情報 */
  geometry: Map<string, WireGeometry>;
  issues: CheckIssue[];
  /** 機器ID → 装着で決まる値を加えたパラメータ */
  params: Map<string, ParamValues | undefined>;
  /** ユニットを装着している親の機器ID */
  hosts: Set<string>;
  /** 機器ID → 機器名のラベルの左の位置（機器の左端からの px。上から来る線を避けた位置。左端のままの機器は入れない） */
  labelLefts: Map<string, number>;
  /** リンクの名前 → そのリンクを置いた場所 */
  linkPeers: Map<string, { id: string; sheet: string; sheetName: string }[]>;
  /** 機器へ移動する（シートを切り替えて選択する） */
  onJump: (deviceId: string) => void;
  /** 端子の近くに線番（マークチューブ）を表示する */
  showMarkers: boolean;
  /** 機器のコメントを表示する */
  showNotes: boolean;
}

export const EditorContext = createContext<EditorContextValue>({
  deviceSeverity: new Map(),
  wireSeverity: new Map(),
  lanes: new Map(),
  geometry: new Map(),
  issues: [],
  params: new Map(),
  hosts: new Set(),
  labelLefts: new Map(),
  linkPeers: new Map(),
  onJump: () => {},
  showMarkers: true,
  showNotes: true,
});

export const useEditorContext = () => useContext(EditorContext);

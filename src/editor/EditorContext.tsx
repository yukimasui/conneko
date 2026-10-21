import { createContext, useContext } from 'react';
import type { CheckIssue, Severity } from '../check/checkDiagram';
import type { ConnectorSpec, ParamValues } from '../devices/types';

/** 電線の両端の形状情報 */
export interface WireGeometry {
  sStub: number;
  tStub: number;
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
  /** リンクの名前 → そのリンクを置いた場所 */
  linkPeers: Map<string, { id: string; sheet: string; sheetName: string }[]>;
  /** 機器へ移動する（シートを切り替えて選択する） */
  onJump: (deviceId: string) => void;
}

export const EditorContext = createContext<EditorContextValue>({
  deviceSeverity: new Map(),
  wireSeverity: new Map(),
  lanes: new Map(),
  geometry: new Map(),
  issues: [],
  params: new Map(),
  hosts: new Set(),
  linkPeers: new Map(),
  onJump: () => {},
});

export const useEditorContext = () => useContext(EditorContext);

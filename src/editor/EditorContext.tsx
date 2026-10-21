import { createContext, useContext } from 'react';
import type { CheckIssue, Severity } from '../check/checkDiagram';

export interface EditorContextValue {
  /** 機器ID → 最も重い指摘の重要度 */
  deviceSeverity: Map<string, Severity>;
  /** 電線ID → 最も重い指摘の重要度 */
  wireSeverity: Map<string, Severity>;
  /** 電線ID → レーンのずらし量 */
  lanes: Map<string, number>;
  /** 電線ID → 両端のスタブ長 */
  stubs: Map<string, { s: number; t: number }>;
  issues: CheckIssue[];
}

export const EditorContext = createContext<EditorContextValue>({
  deviceSeverity: new Map(),
  wireSeverity: new Map(),
  lanes: new Map(),
  stubs: new Map(),
  issues: [],
});

export const useEditorContext = () => useContext(EditorContext);

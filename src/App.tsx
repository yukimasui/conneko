import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  applyNodeChanges,
  useEdgesState,
  useReactFlow,
  type Connection,
  type FinalConnectionState,
  type NodeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import iconUrl from './assets/conneko-icon.svg?inline';
import { checkDiagram, type CheckIssue, type Severity } from './check/checkDiagram';
import { DEFAULT_WIRE } from './data/wires';
import { getDeviceDefinition } from './devices/registry';
import { connectorsMate, resolveDevice } from './devices/resolve';
import type { ParamValues, TerminalSide } from './devices/types';
import { ConnectPicker } from './editor/ConnectPicker';
import { ContextMenu, type MenuItem } from './editor/ContextMenu';
import { DeviceNode, HANDLE_DEPTH } from './editor/DeviceNode';
import { FAN_LENGTH } from './editor/CableGraphics';
import { EditorContext, type WireGeometry } from './editor/EditorContext';
import { diagramToFlow, flowToDiagram, type DeviceFlowNode, type WireEdgeData, type WireFlowEdge } from './editor/flow';
import { Inspector, type WireDefaults } from './editor/Inspector';
import { IoDialog } from './editor/IoDialog';
import { IssuePanel } from './editor/IssuePanel';
import { DEVICE_DRAG_TYPE, Palette } from './editor/Palette';
import { assignLanes, stubLength, type LaneInput } from './editor/routing';
import { SheetTabs } from './editor/SheetTabs';
import { WireEdge } from './editor/WireEdge';
import { buildAiPrompt } from './io/aiPrompt';
import { computeBus, effectiveParams, mountedPositions } from './model/bus';
import { ioHosts } from './model/io';
import { applyIoCandidate, applyPowerCandidate, suggestConnections, type Suggestions } from './model/suggest';
import { LINK_TYPE, mountFamily, moveToSheet, nextSheetId, placeLinkAt, promoteLinkNames, removeSheet, splitCrossSheetWires, splitWireWithLinks } from './model/ops';
import {
  CABLE_WIRE_TYPE,
  nextDeviceId,
  nextWireId,
  parseDiagram,
  sheetsOf,
  toDiagramFile,
  type Diagram,
  type DiagramSettings,
  type Mount,
  type Sheet,
} from './model/diagram';
import { sampleDiagram } from './model/sample';

const nodeTypes = { device: DeviceNode };
const edgeTypes = { wire: WireEdge };
const SEVERITY_RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

function worst(map: Map<string, Severity>, id: string, s: Severity) {
  const cur = map.get(id);
  if (!cur || SEVERITY_RANK[s] > SEVERITY_RANK[cur]) map.set(id, s);
}

/** 位置を除いた図面の内容（チェック結果の再計算を、機器の移動中に行わないためのキー） */
function topologyKey(d: Diagram) {
  return JSON.stringify([d.devices.map((x) => [x.id, x.type, x.params, x.mount, x.sheet, x.comments, x.note]), d.wires.map((w) => ({ ...w, bend: undefined, route: undefined })), d.settings, d.sheets]);
}

/**
 * 装着したユニットを親の位置に合わせて並べる。装着先がなくなったユニットは装着を解除する。
 * 変更がなければ同じ配列を返す。
 */
function arrangeMounted(ns: DeviceFlowNode[]): DeviceFlowNode[] {
  if (!ns.some((n) => n.data.mount)) return ns;
  const ids = new Set(ns.map((n) => n.id));
  let changed = false;
  let out = ns.map((n) => {
    if (!n.data.mount || ids.has(n.data.mount.device)) return n;
    changed = true;
    const { mount: _, ...data } = n.data;
    return { ...n, data, draggable: true, zIndex: undefined };
  });
  const pos = mountedPositions(flowToDiagram(out, []).devices, getDeviceDefinition);
  out = out.map((n) => {
    const p = pos.get(n.id);
    if (!p || (p.x === n.position.x && p.y === n.position.y && n.zIndex === 1)) return n;
    changed = true;
    return { ...n, position: p, zIndex: 1 };
  });
  return changed ? out : ns;
}

/** 表示の切り替え（閲覧者ごとの便利機能としてブラウザに保存。保存できなくても動く） */
function loadToggle(key: string): boolean {
  try {
    return localStorage.getItem(key) !== 'off';
  } catch {
    return true;
  }
}

function saveToggle(key: string, on: boolean) {
  try {
    localStorage.setItem(key, on ? 'on' : 'off');
  } catch {
    // 保存できない環境では何もしない
  }
}

function Editor() {
  const initial = useMemo(() => diagramToFlow(sampleDiagram), []);
  const [nodes, setNodesRaw] = useState<DeviceFlowNode[]>(() => arrangeMounted(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<WireFlowEdge>(initial.edges);
  const [settings, setSettings] = useState<DiagramSettings>(sampleDiagram.settings ?? {});
  const [sheets, setSheets] = useState<Sheet[]>(() => sheetsOf(sampleDiagram));
  const [sheet, setSheet] = useState<string>(() => sheetsOf(sampleDiagram)[0].id);
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [ioDevice, setIoDevice] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showMarkers, setShowMarkers] = useState(() => loadToggle('conneko.markers'));
  const [showNotes, setShowNotes] = useState(() => loadToggle('conneko.notes'));
  const [picker, setPicker] = useState<null | {
    x: number;
    y: number;
    at: { x: number; y: number };
    from: { device: string; terminal: string };
    suggestions: Suggestions;
  }>(null);
  // 機器の変更のたびに、装着したユニットを親に合わせて並べ直す
  const setNodes = useCallback((update: DeviceFlowNode[] | ((ns: DeviceFlowNode[]) => DeviceFlowNode[])) => {
    setNodesRaw((ns) => arrangeMounted(typeof update === 'function' ? update(ns) : update));
  }, []);
  const onNodesChange = useCallback(
    (changes: NodeChange<DeviceFlowNode>[]) => setNodes((ns) => applyNodeChanges(changes, ns)),
    [setNodes],
  );
  const [wireDefaults, setWireDefaults] = useState<WireDefaults>({ ...DEFAULT_WIRE });
  const [modal, setModal] = useState<null | { kind: 'paste' } | { kind: 'prompt'; text: string }>(null);
  const [pasteText, setPasteText] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition, fitView, deleteElements } = useReactFlow<DeviceFlowNode, WireFlowEdge>();

  const notify = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3000);
  }, []);

  // --- チェック ---
  const diagram = useMemo(() => ({ ...flowToDiagram(nodes, edges, sheets), settings }), [nodes, edges, settings, sheets]);
  const topo = topologyKey(diagram);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const issues = useMemo(() => checkDiagram(diagram, getDeviceDefinition), [topo]);
  // 装着で決まる入出力の先頭番号などを加えたパラメータ
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bus = useMemo(() => computeBus(diagram.devices, getDeviceDefinition), [topo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const params = useMemo(() => new Map(diagram.devices.map((d) => [d.id, effectiveParams(d, bus)])), [bus, topo]);
  const resolvedOf = useCallback(
    (nodeId: string, type?: string) => {
      const def = type ? getDeviceDefinition(type) : undefined;
      return def ? resolveDevice(def, params.get(nodeId)) : undefined;
    },
    [params],
  );

  // --- 配線のスタブ長とレーン（重なり回避） ---
  const { lanes, geometry } = useMemo(() => {
    // 表示中のシートの電線だけで重なりを避ける
    const byId = new Map(nodes.filter((n) => n.data.sheet === sheet).map((n) => [n.id, n]));
    const inputs: LaneInput[] = [];
    const geometry = new Map<string, WireGeometry>();
    for (const e of edges) {
      const end = (nodeId: string, handle?: string | null) => {
        const n = byId.get(nodeId);
        const def = n && getDeviceDefinition(n.data.deviceType);
        const t = n && handle ? resolvedOf(n.id, n.data.deviceType)?.terminal(handle) : undefined;
        if (!n || !def || !t) return null;
        const toEdge = { top: t.y, bottom: def.height - t.y, left: t.x, right: def.width - t.x }[t.side];
        // ケーブルはコネクタ付近で芯線を広げて描くため、まっすぐ出る区間を長めにとる
        // 正面向きのコネクタは、プラグの端からケーブルが出る
        const exit = t.connector?.facing === 'front' ? (t.connector.length ?? 12) / 2 - HANDLE_DEPTH / 2 : 12;
        const stub = t.connector ? Math.max(stubLength(toEdge), FAN_LENGTH + 8 + exit) : stubLength(toEdge);
        return { x: n.position.x + t.x, y: n.position.y + t.y, side: t.side as TerminalSide, stub, connector: t.connector };
      };
      const s = end(e.source, e.sourceHandle);
      const t = end(e.target, e.targetHandle);
      if (!s || !t) continue;
      geometry.set(e.id, { sStub: s.stub, tStub: t.stub, sConnector: s.connector, tConnector: t.connector });
      inputs.push({ id: e.id, sx: s.x, sy: s.y, sSide: s.side, sStub: s.stub, tx: t.x, ty: t.y, tSide: t.side, tStub: t.stub, manual: !!e.data?.bend || !!e.data?.route });
    }
    return { lanes: assignLanes(inputs), geometry };
  }, [nodes, edges, resolvedOf, sheet]);

  // --- シートと移動 ---
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  /** シートを切り替え、そのシートの機器（ids を指定すればそれ）が見えるように表示する */
  const showSheet = useCallback(
    (id: string, ids?: string[]) => {
      setSheet(id);
      const targets = ids ?? nodesRef.current.filter((n) => n.data.sheet === id).map((n) => n.id);
      if (targets.length) {
        window.setTimeout(() => fitView({ nodes: targets.map((x) => ({ id: x })), padding: ids ? 0.5 : 0.15, duration: 350, maxZoom: ids ? 1.3 : 1.5 }), 60);
      }
    },
    [fitView],
  );

  const switchSheet = useCallback(
    (id: string) => {
      setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
      setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
      showSheet(id);
    },
    [setNodes, setEdges, showSheet],
  );

  /** 機器へ移動する（シートを切り替えて選択する） */
  const focusDevice = useCallback(
    (id: string) => {
      const n = nodesRef.current.find((x) => x.id === id);
      if (!n) return;
      setNodes((ns) => ns.map((x) => (x.selected !== (x.id === id) ? { ...x, selected: x.id === id } : x)));
      setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
      showSheet(n.data.sheet, [id]);
    },
    [setNodes, setEdges, showSheet],
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const linkPeers = useMemo(() => {
    const out = new Map<string, { id: string; sheet: string; sheetName: string }[]>();
    for (const d of diagram.devices) {
      if (d.type !== LINK_TYPE) continue;
      const name = String(d.params?.name ?? '').trim();
      const sheetId = d.sheet ?? sheets[0].id;
      out.set(name, [...(out.get(name) ?? []), { id: d.id, sheet: sheetId, sheetName: sheets.find((s) => s.id === sheetId)?.name ?? '' }]);
    }
    return out;
  }, [topo]);

  // I/O を持つ PLC（親と装着したユニット）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ioDevices = useMemo(() => new Set(ioHosts(diagram, getDeviceDefinition).flatMap((h) => mountFamily(diagram, h))), [topo]);

  const context = useMemo(() => {
    const deviceSeverity = new Map<string, Severity>();
    const wireSeverity = new Map<string, Severity>();
    for (const i of issues) {
      i.devices.forEach((d) => worst(deviceSeverity, d, i.severity));
      i.wires.forEach((w) => worst(wireSeverity, w, i.severity));
    }
    return { deviceSeverity, wireSeverity, lanes, geometry, issues, params, hosts: new Set(bus.groups.keys()), linkPeers, onJump: focusDevice, showMarkers, showNotes };
  }, [issues, lanes, geometry, params, bus, linkPeers, focusDevice, showMarkers, showNotes]);

  // シートごとの最も重い指摘（タブに印を付ける）
  const sheetSeverity = useMemo(() => {
    const bySheet = new Map<string, Severity>();
    const sheetOfDevice = new Map(nodes.map((n) => [n.id, n.data.sheet]));
    const sheetOfWire = new Map(edges.map((e) => [e.id, sheetOfDevice.get(e.source)]));
    for (const i of issues) {
      for (const s of new Set([...i.devices.map((d) => sheetOfDevice.get(d)), ...i.wires.map((w) => sheetOfWire.get(w))])) {
        if (s) worst(bySheet, s, i.severity);
      }
    }
    return bySheet;
  }, [issues, nodes, edges]);

  const sheetCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const n of nodes) counts.set(n.data.sheet, (counts.get(n.data.sheet) ?? 0) + 1);
    return counts;
  }, [nodes]);

  // 表示中のシートの機器・電線だけを描く（ほかは hidden）
  const shownNodes = useMemo(() => nodes.map((n) => (n.data.sheet === sheet ? n : { ...n, hidden: true })), [nodes, sheet]);
  const shownEdges = useMemo(() => {
    const visible = new Set(nodes.filter((n) => n.data.sheet === sheet).map((n) => n.id));
    return edges.map((e) => (visible.has(e.source) && visible.has(e.target) ? e : { ...e, hidden: true }));
  }, [nodes, edges, sheet]);

  /** 編集操作の結果（Diagram）を、選択状態などを保ったまま反映する */
  const applyDiagram = useCallback(
    (next: Diagram, message?: string) => {
      const flow = diagramToFlow(next);
      setNodes((ns) => {
        const old = new Map(ns.map((n) => [n.id, n]));
        return flow.nodes.map((n) => {
          const o = old.get(n.id);
          return o ? { ...o, position: n.position, data: n.data, draggable: n.draggable ?? true } : n;
        });
      });
      setEdges((es) => {
        const old = new Map(es.map((e) => [e.id, e]));
        return flow.edges.map((e) => {
          const o = old.get(e.id);
          return o ? { ...o, source: e.source, sourceHandle: e.sourceHandle, target: e.target, targetHandle: e.targetHandle, data: e.data } : e;
        });
      });
      setSheets(sheetsOf(next));
      if (message) notify(message);
    },
    [setNodes, setEdges, notify],
  );

  // リンクの名前がなくなったら（リンクの削除・名前の変更・I/O の切断など）、「名前-2」などを元の名前に戻す
  const linkNameKey = [...linkPeers.keys()].filter(Boolean).sort().join('\n');
  const prevLinkNames = useRef(linkNameKey);
  const skipPromote = useRef(false);
  useEffect(() => {
    const before = prevLinkNames.current.split('\n').filter(Boolean);
    prevLinkNames.current = linkNameKey;
    // 別の図面を読み込んだときは対象外
    if (skipPromote.current) {
      skipPromote.current = false;
      return;
    }
    const now = new Set(linkNameKey.split('\n'));
    const gone = before.filter((n) => !now.has(n));
    if (!gone.length) return;
    const next = promoteLinkNames(diagram, gone);
    if (next !== diagram) applyDiagram(next, `リンク「${gone.join('・')}」がなくなったため、番号付きのリンクを元の名前に戻しました`);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkNameKey]);

  // --- シートの編集 ---
  const addSheet = useCallback(() => {
    const id = nextSheetId({ devices: [], wires: [], sheets });
    setSheets((ss) => [...ss, { id, name: `シート${ss.length + 1}` }]);
    switchSheet(id);
  }, [sheets, switchSheet]);

  const deleteSheet = useCallback(
    (id: string) => {
      const count = nodes.filter((n) => n.data.sheet === id).length;
      const name = sheets.find((s) => s.id === id)?.name;
      if (count && !window.confirm(`シート「${name}」と、そこにある ${count} 台の機器を削除しますか？`)) return;
      const next = removeSheet(diagram, id);
      applyDiagram(next);
      if (sheet === id) switchSheet(sheetsOf(next)[0].id);
    },
    [nodes, sheets, diagram, applyDiagram, sheet, switchSheet],
  );

  const moveSheetTab = useCallback((id: string, delta: -1 | 1) => {
    setSheets((ss) => {
      const i = ss.findIndex((s) => s.id === id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= ss.length) return ss;
      const out = [...ss];
      [out[i], out[j]] = [out[j], out[i]];
      return out;
    });
  }, []);

  const moveDevicesToSheet = useCallback(
    (ids: string[], sheetId: string) => {
      const name = sheets.find((s) => s.id === sheetId)?.name ?? sheetId;
      applyDiagram(moveToSheet(diagram, ids, sheetId, getDeviceDefinition), `${ids.join(', ')} をシート「${name}」へ移しました（またがる電線はリンクにしました）`);
    },
    [sheets, diagram, applyDiagram],
  );

  const moveToNewSheet = useCallback(
    (ids: string[]) => {
      const id = nextSheetId({ devices: [], wires: [], sheets });
      const withSheet = { ...diagram, sheets: [...sheets, { id, name: `シート${sheets.length + 1}` }] };
      applyDiagram(moveToSheet(withSheet, ids, id, getDeviceDefinition), `${ids.join(', ')} を新しいシートへ移しました`);
    },
    [sheets, diagram, applyDiagram],
  );

  // --- 機器の追加 ---
  const addDevice = useCallback(
    (type: string, at?: { x: number; y: number }) => {
      const def = getDeviceDefinition(type);
      if (!def) return;
      let pos = at;
      if (!pos) {
        const r = canvasRef.current?.getBoundingClientRect();
        const c = screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 800) / 2, y: (r?.top ?? 0) + (r?.height ?? 600) / 2 });
        pos = { x: c.x + (Math.random() - 0.5) * 40, y: c.y + (Math.random() - 0.5) * 40 };
      }
      setNodes((ns) => {
        const id = nextDeviceId(def.labelPrefix, ns.map((n) => n.id));
        return [
          ...ns.map((n) => ({ ...n, selected: false })),
          {
            id,
            type: 'device',
            position: { x: Math.round(pos.x - def.width / 2), y: Math.round(pos.y - def.height / 2) },
            data: { deviceType: type, sheet },
            selected: true,
          },
        ];
      });
    },
    [screenToFlowPosition, setNodes, sheet],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      const type = e.dataTransfer.getData(DEVICE_DRAG_TYPE);
      if (!type) return;
      e.preventDefault();
      addDevice(type, screenToFlowPosition({ x: e.clientX, y: e.clientY }));
    },
    [addDevice, screenToFlowPosition],
  );

  // --- 配線 ---
  const terminalOf = useCallback(
    (nodeId: string, handle?: string | null) => {
      const n = nodes.find((x) => x.id === nodeId);
      return n && handle ? resolvedOf(n.id, n.data.deviceType)?.terminal(handle) : undefined;
    },
    [nodes, resolvedOf],
  );

  const onConnect = useCallback(
    (c: Connection) => {
      const isCable = !!terminalOf(c.source, c.sourceHandle)?.connector;
      setEdges((es) => [
        ...es,
        {
          id: nextWireId(es.map((e) => e.id)),
          type: 'wire',
          source: c.source,
          sourceHandle: c.sourceHandle,
          target: c.target,
          targetHandle: c.targetHandle,
          data: isCable ? { color: 'black', sizeSq: 0, wireType: CABLE_WIRE_TYPE } : { ...wireDefaults },
        },
      ]);
    },
    [setEdges, wireDefaults, terminalOf],
  );

  // 端子から引いた電線を何もないところで離したら、接続先の候補（電源・PLC の空き入出力・リンク）を出す
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      setConnecting(false);
      if (state.isValid || state.toHandle || !state.fromNode || !state.fromHandle?.id) return;
      const target = event.target as Element | null;
      if (!target?.closest('.react-flow__pane')) return;
      const from = { device: state.fromNode.id, terminal: state.fromHandle.id };
      if (terminalOf(from.device, from.terminal)?.connector) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      setPicker({
        x: point.clientX,
        y: point.clientY,
        at: screenToFlowPosition({ x: point.clientX, y: point.clientY }),
        from,
        suggestions: suggestConnections(diagram, from, getDeviceDefinition),
      });
    },
    [terminalOf, screenToFlowPosition, diagram],
  );

  // コネクタは同じ種類（または変換ケーブルのある種類）のコネクタとだけ（ケーブルで）つなげる
  const isValidConnection = useCallback(
    (c: Connection | WireFlowEdge) => {
      if (c.source === c.target && c.sourceHandle === c.targetHandle) return false;
      const a = terminalOf(c.source, c.sourceHandle)?.connector;
      const b = terminalOf(c.target, c.targetHandle)?.connector;
      return a || b ? !!a && !!b && connectorsMate(a, b) : true;
    },
    [terminalOf],
  );

  // --- 編集 ---
  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = selectedNode ? undefined : edges.find((e) => e.selected);

  const renameDevice = useCallback(
    (oldId: string, newId: string): string | null => {
      if (!newId) return '機器名を入力してください';
      if (/[\s.]/.test(newId)) return '空白と「.」は使えません';
      if (nodes.some((n) => n.id === newId)) return `「${newId}」はすでに使われています`;
      setNodes((ns) =>
        ns.map((n) => {
          const renamed = n.id === oldId ? { ...n, id: newId } : n;
          return renamed.data.mount?.device === oldId ? { ...renamed, data: { ...renamed.data, mount: { ...renamed.data.mount, device: newId } } } : renamed;
        }),
      );
      setEdges((es) =>
        es.map((e) => ({ ...e, source: e.source === oldId ? newId : e.source, target: e.target === oldId ? newId : e.target })),
      );
      return null;
    },
    [nodes, setNodes, setEdges],
  );

  const changeParam = useCallback(
    (id: string, key: string, value: number | string) => {
      setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, params: { ...n.data.params, [key]: value } } } : n)));
    },
    [setNodes],
  );

  // 装着先を変える（undefined で解除）。装着したユニットの先頭番号は自動で決まるため、手で入れた値は消す
  const changeMount = useCallback(
    (id: string, mount: Mount | undefined) => {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== id) return n;
          const { mount: _, ...rest } = n.data;
          const { ioIn: _i, ioOut: _o, ...params } = (n.data.params ?? {}) as ParamValues;
          // 装着したユニットは親と同じシートに置く
          const hostSheet = mount ? ns.find((x) => x.id === mount.device)?.data.sheet : undefined;
          const data = { ...rest, ...(Object.keys(params).length ? { params } : { params: undefined }), ...(mount ? { mount } : {}), sheet: hostSheet ?? rest.sheet };
          return mount
            ? { ...n, data, draggable: false }
            : { ...n, data, draggable: true, zIndex: undefined, position: { x: n.position.x, y: n.position.y + 60 } };
        }),
      );
    },
    [setNodes],
  );

  const changeNote = useCallback(
    (id: string, note: string) => {
      setNodes((ns) =>
        ns.map((n) => {
          if (n.id !== id) return n;
          const { note: _, ...data } = n.data;
          return { ...n, data: note ? { ...data, note } : data };
        }),
      );
    },
    [setNodes],
  );

  const changeWire = useCallback(
    (id: string, patch: Partial<WireEdgeData>) => {
      setEdges((es) => es.map((e) => (e.id === id && e.data ? { ...e, data: { ...e.data, ...patch } } : e)));
    },
    [setEdges],
  );

  const deleteSelected = useCallback(() => {
    deleteElements({ nodes: nodes.filter((n) => n.selected), edges: edges.filter((e) => e.selected) });
  }, [deleteElements, nodes, edges]);

  const selectIssue = useCallback(
    (issue: CheckIssue) => {
      const wireSet = new Set(issue.wires);
      const nodeIds = new Set(issue.devices);
      for (const e of edges) {
        if (wireSet.has(e.id)) {
          nodeIds.add(e.source);
          nodeIds.add(e.target);
        }
      }
      setNodes((ns) => ns.map((n) => ({ ...n, selected: issue.devices.includes(n.id) && issue.wires.length === 0 })));
      setEdges((es) => es.map((e) => ({ ...e, selected: wireSet.has(e.id) && e.id === issue.wires[0] })));
      // 指摘のある機器のシートへ切り替える（複数のシートにまたがる場合は最初の機器のシート）
      const first = nodes.find((n) => nodeIds.has(n.id));
      if (first) {
        const ids = [...nodeIds].filter((id) => nodes.find((n) => n.id === id)?.data.sheet === first.data.sheet);
        showSheet(first.data.sheet, ids);
      }
    },
    [edges, nodes, setNodes, setEdges, showSheet],
  );

  const selectWire = useCallback(
    (id: string) => {
      const e = edges.find((x) => x.id === id);
      const src = e && nodes.find((n) => n.id === e.source);
      if (!e || !src) return;
      setNodes((ns) => ns.map((n) => (n.selected ? { ...n, selected: false } : n)));
      setEdges((es) => es.map((x) => (x.selected !== (x.id === id) ? { ...x, selected: x.id === id } : x)));
      showSheet(src.data.sheet, [e.source, e.target]);
    },
    [edges, nodes, setNodes, setEdges, showSheet],
  );

  // --- 右クリックメニュー ---
  const onNodeContextMenu = useCallback(
    (e: React.MouseEvent, node: DeviceFlowNode) => {
      e.preventDefault();
      const def = getDeviceDefinition(node.data.deviceType);
      const others = sheets.filter((s) => s.id !== node.data.sheet);
      const name = def?.netLabel ? String(node.data.params?.[def.netLabel.param] ?? '').trim() : '';
      const peers = (linkPeers.get(name) ?? []).filter((p) => p.id !== node.id);
      const items: MenuItem[] = [
        ...(ioDevices.has(node.id) ? [{ label: 'I/O 割付・接続を編集…', onClick: () => setIoDevice(node.id) }] : []),
        ...(peers.length ? [{ label: '相手のリンクへ移動', children: peers.map((p) => ({ label: `${p.sheetName}（${p.id}）`, onClick: () => focusDevice(p.id) })) }] : []),
        {
          label: node.data.mount ? '別のシートへ移動（親と一緒に）' : '別のシートへ移動',
          children: [
            ...others.map((s) => ({ label: s.name, onClick: () => moveDevicesToSheet([node.id], s.id) })),
            { label: '新しいシート', onClick: () => moveToNewSheet([node.id]) },
          ],
        },
        { label: '削除', danger: true, separator: true, hint: 'Delete', onClick: () => deleteElements({ nodes: [{ id: node.id }] }) },
      ];
      setMenu({ x: e.clientX, y: e.clientY, items });
    },
    [sheets, linkPeers, ioDevices, focusDevice, moveDevicesToSheet, moveToNewSheet, deleteElements],
  );

  const onEdgeContextMenu = useCallback(
    (e: React.MouseEvent, edge: WireFlowEdge) => {
      e.preventDefault();
      const isCable = edge.data?.wireType === CABLE_WIRE_TYPE;
      setMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          {
            label: '曲がりを自動に戻す',
            disabled: !edge.data?.bend && !edge.data?.route,
            onClick: () => changeWire(edge.id, { bend: undefined, route: undefined }),
          },
          {
            label: 'リンクで分ける（電線を図から消す）',
            disabled: isCable,
            onClick: () => applyDiagram(splitWireWithLinks(diagram, edge.id, getDeviceDefinition), '電線を両端のリンクに置き換えました'),
          },
          { label: '削除', danger: true, separator: true, hint: 'Delete', onClick: () => deleteElements({ edges: [{ id: edge.id }] }) },
        ],
      });
    },
    [diagram, applyDiagram, deleteElements, changeWire],
  );

  const onPaneContextMenu = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      e.preventDefault();
      const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      setMenu({
        x: e.clientX,
        y: e.clientY,
        items: [
          { label: 'ここにリンクを置く', onClick: () => addDevice(LINK_TYPE, at) },
          { label: 'シートを追加', separator: true, onClick: addSheet },
        ],
      });
    },
    [screenToFlowPosition, addDevice, addSheet],
  );

  // --- ファイル入出力 ---
  const loadDiagram = useCallback(
    (raw: Diagram) => {
      // シートをまたぐ電線（AI が書いたものなど）はリンクに置き換える
      const d = splitCrossSheetWires(raw, getDeviceDefinition);
      skipPromote.current = true;
      const flow = diagramToFlow(d);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setSettings(d.settings ?? {});
      setSheets(sheetsOf(d));
      setIoDevice(null);
      showSheet(sheetsOf(d)[0].id);
    },
    [setNodes, setEdges, showSheet],
  );

  const newDiagram = () => {
    if (nodes.length && !window.confirm('現在の図面を破棄して新規作成しますか？')) return;
    loadDiagram({ devices: [], wires: [] });
  };

  const saveFile = () => {
    const json = JSON.stringify(toDiagramFile(diagram), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `conneko-${stamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const openFile = async (file: File) => {
    try {
      loadDiagram(parseDiagram(await file.text()));
      notify(`${file.name} を読み込みました`);
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  const copyAiPrompt = async () => {
    const text = buildAiPrompt(diagram, issues);
    try {
      await navigator.clipboard.writeText(text);
      notify('AI用のプロンプトをコピーしました。ChatGPT や Claude に貼り付けてください');
    } catch {
      setModal({ kind: 'prompt', text });
    }
  };

  const applyPaste = () => {
    try {
      loadDiagram(parseDiagram(pasteText));
      setModal(null);
      setPasteText('');
      notify('図面データを読み込みました');
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  return (
    <EditorContext.Provider value={context}>
      <div className="app">
        <header className="toolbar">
          <div className="brand">
            <img src={iconUrl} alt="" />
            <span>Conneko</span>
          </div>
          <div className="toolbar__group">
            <button type="button" onClick={newDiagram}>新規</button>
            <button type="button" onClick={() => fileInput.current?.click()}>開く</button>
            <button type="button" onClick={saveFile}>保存</button>
            <button type="button" onClick={() => loadDiagram(sampleDiagram)}>サンプル</button>
          </div>
          <div className="toolbar__group">
            <button type="button" onClick={copyAiPrompt} title="現在の図面と指示文をコピーします">AI用にコピー</button>
            <button type="button" onClick={() => setModal({ kind: 'paste' })} title="AIが返したJSONを貼り付けて読み込みます">JSONを貼り付け</button>
          </div>
          <label className="toolbar__toggle" title="端子の近くに線番（マークチューブ）を表示します">
            <input
              type="checkbox"
              checked={showMarkers}
              onChange={(e) => {
                setShowMarkers(e.target.checked);
                saveToggle('conneko.markers', e.target.checked);
              }}
            />
            線番表示
          </label>
          <label className="toolbar__toggle is-next" title="機器のコメント（何をするものか）を機器の下に表示します">
            <input
              type="checkbox"
              checked={showNotes}
              onChange={(e) => {
                setShowNotes(e.target.checked);
                saveToggle('conneko.notes', e.target.checked);
              }}
            />
            コメント表示
          </label>
          <label className="toolbar__setting" title="安全機能に要求するパフォーマンスレベル（ISO 13849-1）。これを下回る安全機器を警告します">
            要求PL
            <select
              value={settings.requiredPL ?? ''}
              onChange={(e) => setSettings((s) => ({ ...s, requiredPL: (e.target.value || undefined) as DiagramSettings['requiredPL'] }))}
            >
              <option value="">指定なし</option>
              {(['a', 'b', 'c', 'd', 'e'] as const).map((pl) => (
                <option key={pl} value={pl}>
                  PL {pl}
                </option>
              ))}
            </select>
          </label>
          <input
            ref={fileInput}
            type="file"
            accept=".json,application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void openFile(f);
              e.target.value = '';
            }}
          />
        </header>
        <Palette onAdd={(type) => addDevice(type)} />
        <main className={`canvas${connecting ? ' is-connecting' : ''}`} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <SheetTabs
            sheets={sheets}
            current={sheet}
            counts={sheetCounts}
            severity={sheetSeverity}
            onSelect={switchSheet}
            onAdd={addSheet}
            onRename={(id, name) => setSheets((ss) => ss.map((s) => (s.id === id ? { ...s, name } : s)))}
            onDelete={deleteSheet}
            onMove={moveSheetTab}
          />
          <div className="canvas__flow" ref={canvasRef}>
          <ReactFlow
            nodes={shownNodes}
            edges={shownEdges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onConnectStart={() => setConnecting(true)}
            onConnectEnd={onConnectEnd}
            isValidConnection={isValidConnection}
            onNodeContextMenu={onNodeContextMenu}
            onEdgeContextMenu={onEdgeContextMenu}
            onPaneContextMenu={onPaneContextMenu}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ zIndex: 1001 }}
            // 装着したユニットをベースユニットの上に描くため、選択しても重なり順を変えない
            elevateNodesOnSelect={false}
            connectionLineStyle={{ stroke: '#2563eb', strokeWidth: 2, strokeDasharray: '6 4' }}
            deleteKeyCode={['Delete', 'Backspace']}
            snapToGrid
            snapGrid={[10, 10]}
            minZoom={0.2}
            maxZoom={3}
            fitView
            fitViewOptions={{ padding: 0.15 }}
            proOptions={{ hideAttribution: true }}
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.2} color="#c5ccd6" />
            <Controls showInteractive={false} />
            <MiniMap pannable zoomable style={{ width: 150, height: 100 }} nodeColor={(n) => (context.deviceSeverity.get(n.id) === 'error' ? '#ef4444' : '#94a3b8')} />
          </ReactFlow>
          {toast && <div className="toast">{toast}</div>}
          </div>
        </main>
        <Inspector
          node={selectedNode}
          edge={selectedEdge}
          edges={edges}
          nodes={nodes}
          params={params}
          bus={bus}
          issues={issues}
          wireDefaults={wireDefaults}
          onWireDefaultsChange={setWireDefaults}
          onRenameDevice={renameDevice}
          onParamChange={changeParam}
          onNoteChange={changeNote}
          onMountChange={changeMount}
          sheets={sheets}
          onSheetChange={(id, s) => moveDevicesToSheet([id], s)}
          ioDevices={ioDevices}
          onEditIo={setIoDevice}
          onWireChange={changeWire}
          onDelete={deleteSelected}
        />
        <IssuePanel issues={issues} diagram={diagram} onSelect={selectIssue} onSelectWire={selectWire} onJump={focusDevice} />
      </div>
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {picker && (
        <ConnectPicker
          x={picker.x}
          y={picker.y}
          from={`${picker.from.device}.${picker.from.terminal}`}
          suggestions={picker.suggestions}
          onClose={() => setPicker(null)}
          onPower={(c) => {
            setPicker(null);
            applyDiagram(applyPowerCandidate(diagram, picker.from, c, picker.at, wireDefaults, getDeviceDefinition), `${picker.from.device}.${picker.from.terminal} を ${c.name} につなぎました${c.attach ? `（${c.attach.device} 側にもリンクを置きました）` : ''}`);
          }}
          onIo={(c) => {
            setPicker(null);
            applyDiagram(applyIoCandidate(diagram, picker.from, c, wireDefaults, getDeviceDefinition), `${picker.from.device}.${picker.from.terminal} を ${c.point.address}（${c.point.device}）につなぎました`);
          }}
          onLink={(name) => {
            setPicker(null);
            applyDiagram(placeLinkAt(diagram, picker.from, name, picker.at, wireDefaults, getDeviceDefinition), `リンク「${name}」を置きました`);
          }}
        />
      )}
      {ioDevice && (
        <IoDialog
          diagram={diagram}
          deviceId={ioDevice}
          onApply={applyDiagram}
          onJump={(id) => {
            setIoDevice(null);
            focusDevice(id);
          }}
          onClose={() => setIoDevice(null)}
        />
      )}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            {modal.kind === 'paste' ? (
              <>
                <h2>JSONを貼り付けて読み込む</h2>
                <p className="muted">AI が返した図面データ（JSON）を貼り付けてください。現在の図面は置き換えられます。</p>
                <textarea value={pasteText} onChange={(e) => setPasteText(e.target.value)} placeholder='{"format": "conneko-diagram", ...}' autoFocus />
                <div className="modal__actions">
                  <button type="button" onClick={() => setModal(null)}>キャンセル</button>
                  <button type="button" className="primary" onClick={applyPaste} disabled={!pasteText.trim()}>読み込む</button>
                </div>
              </>
            ) : (
              <>
                <h2>AI用のプロンプト</h2>
                <p className="muted">クリップボードにコピーできなかったため、下の文章を選択してコピーしてください。</p>
                <textarea readOnly value={modal.text} onFocus={(e) => e.target.select()} />
                <div className="modal__actions">
                  <button type="button" className="primary" onClick={() => setModal(null)}>閉じる</button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </EditorContext.Provider>
  );
}

export default function App() {
  return (
    <ReactFlowProvider>
      <Editor />
    </ReactFlowProvider>
  );
}

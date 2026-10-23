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
import iconUrl from './assets/conneko-face.png?inline';
import { checkDiagram, type CheckIssue, type Severity } from './check/checkDiagram';
import { DEFAULT_WIRE } from './data/wires';
import { deviceDefinitions, getDeviceDefinition } from './devices/registry';
import { connectorsMate, resolveDevice } from './devices/resolve';
import { deviceSize } from './devices/types';
import { AboutDialog } from './editor/AboutDialog';
import { PrintDialog } from './editor/PrintDialog';
import { PrintView, type PrintOptions } from './editor/PrintView';
import { bomCsv, ioCsv, wireCsv } from './export/reports';
import { renderSheetSvg } from './export/sheetSvg';
import { ConnectPicker } from './editor/ConnectPicker';
import { ContextMenu, type MenuItem } from './editor/ContextMenu';
import { DeviceNode } from './editor/DeviceNode';
import { linkSidesOf, wireLayout } from './editor/geometry';
import { EditorContext } from './editor/EditorContext';
import { diagramToFlow, flowToDiagram, type DeviceFlowNode, type WireEdgeData, type WireFlowEdge } from './editor/flow';
import { Inspector, type WireDefaults } from './editor/Inspector';
import { PlcEditor, type PlcTab } from './editor/PlcEditor';
import { ValveEditor } from './editor/ValveEditor';
import { SchematicEditor } from './editor/SchematicEditor';
import { useHistory } from './editor/useHistory';
import { IssuePanel } from './editor/IssuePanel';
import { DEVICE_DRAG_TYPE, Palette } from './editor/Palette';
import { SheetTabs } from './editor/SheetTabs';
import { WireEdge } from './editor/WireEdge';
import { buildAiPrompt } from './io/aiPrompt';
import { alignableLinkCount, alignLinks } from './model/alignLinks';
import { airCandidates, isAirPort, normalizeTubes, tubeAttrs } from './model/air';
import { isTubeType } from './data/tubes';
import { computeBus, effectiveParams, mountedPositions } from './model/bus';
import { ioHosts } from './model/io';
import { isManifold, manifoldDevices } from './model/manifold';
import { applyIoCandidate, applyNetwork, applyPowerCandidate, suggestConnections, type Suggestions } from './model/suggest';
import { applyMateCandidate, hasMateCandidates, mateCandidates, type MateCandidate } from './model/mates';
import { isLanCable, LINK_TYPE, NET_LINK_TYPE, linkKey, mountFamily, moveToSheet, nextSheetId, placeLinkAt, promoteLinkNames, removeSheet, splitCrossSheetWires, splitWireWithLinks, terminalPoint } from './model/ops';
import {
  CABLE_WIRE_TYPE,
  nextDeviceId,
  nextWireId,
  parseDiagram,
  sheetsOf,
  toDiagramFile,
  type Diagram,
  type DiagramSettings,
  type Sheet,
} from './model/diagram';
import { sampleDiagram } from './model/sample';
import { buildSchematic, defaultRails } from './schematic/layout';
import { newSchematicSheet, pruneSchematic, renameSchematicDevice, type Schematic } from './schematic/model';

const nodeTypes = { device: DeviceNode };
const edgeTypes = { wire: WireEdge };
const SEVERITY_RANK: Record<Severity, number> = { error: 3, warning: 2, info: 1 };

function worst(map: Map<string, Severity>, id: string, s: Severity) {
  const cur = map.get(id);
  if (!cur || SEVERITY_RANK[s] > SEVERITY_RANK[cur]) map.set(id, s);
}

/** 位置を除いた図面の内容（チェック結果の再計算を、機器の移動中に行わないためのキー） */
function topologyKey(d: Diagram) {
  return JSON.stringify([
    d.devices.map((x) => [x.id, x.type, x.params, x.mount, x.sheet, x.comments, x.note]),
    d.wires.map((w) => ({ ...w, bend: undefined, route: undefined, fromSide: undefined, toSide: undefined })),
    d.settings,
    d.sheets,
  ]);
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

/** 画面の機器を、電線の計算に使う形（位置つき）にする */
function layoutDevices(ns: DeviceFlowNode[]) {
  return ns.map((n) => ({ id: n.id, type: n.data.deviceType, x: n.position.x, y: n.position.y }));
}

function Editor() {
  const initial = useMemo(() => diagramToFlow(sampleDiagram), []);
  const [nodes, setNodesRaw] = useState<DeviceFlowNode[]>(() => arrangeMounted(initial.nodes));
  const [edges, setEdges, onEdgesChange] = useEdgesState<WireFlowEdge>(initial.edges);
  const [settings, setSettings] = useState<DiagramSettings>(sampleDiagram.settings ?? {});
  const [sheets, setSheets] = useState<Sheet[]>(() => sheetsOf(sampleDiagram));
  const [sheet, setSheet] = useState<string>(() => sheetsOf(sampleDiagram)[0].id);
  // 展開図（配置）と、表示中のモード・展開図のシート
  const [schematic, setSchematic] = useState<Schematic | undefined>(sampleDiagram.schematic);
  const [mode, setMode] = useState<'diagram' | 'schematic'>('diagram');
  const [schematicSheet, setSchematicSheet] = useState<string>(() => sampleDiagram.schematic?.sheets[0]?.id ?? '');
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuItem[] } | null>(null);
  const [plcEditor, setPlcEditor] = useState<{ id: string; tab: PlcTab } | null>(null);
  const [valveEditor, setValveEditor] = useState<string | null>(null);
  const [about, setAbout] = useState(false);
  const [printDialog, setPrintDialog] = useState(false);
  const [printing, setPrinting] = useState<PrintOptions | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [showMarkers, setShowMarkers] = useState(() => loadToggle('conneko.markers'));
  const [showNotes, setShowNotes] = useState(() => loadToggle('conneko.notes'));
  const [picker, setPicker] = useState<null | {
    x: number;
    y: number;
    at: { x: number; y: number };
    from: { device: string; terminal: string };
    suggestions: Suggestions;
    mates: MateCandidate[];
    /** 置いた機器が見えるよう表示を合わせる（インスペクタから開いた場合。ドラッグなら離した位置に置くので不要） */
    fit?: boolean;
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
  const diagram = useMemo<Diagram>(
    () => ({ ...flowToDiagram(nodes, edges, sheets), settings, ...(schematic ? { schematic } : {}) }),
    [nodes, edges, settings, sheets, schematic],
  );
  const topo = topologyKey(diagram);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const issues = useMemo(() => checkDiagram(diagram, getDeviceDefinition), [topo]);
  // 装着で決まる入出力の先頭番号などを加えたパラメータ
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const bus = useMemo(() => computeBus(diagram.devices, getDeviceDefinition), [topo]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const params = useMemo(() => new Map(diagram.devices.map((d) => [d.id, effectiveParams(d, bus)])), [bus, topo]);
  // 向きが「自動」のリンクは、つないだ相手の端子のある側に電線をつなぐ（相手が右にあれば右につなぎ、矢印は左を向く）
  const linkSides = useMemo(
    () => linkSidesOf(layoutDevices(nodes), flowToDiagram([], edges).wires, (id) => params.get(id), getDeviceDefinition),
    [nodes, edges, params],
  );
  const shownParams = useMemo(() => {
    if (!linkSides.size) return params;
    const out = new Map(params);
    for (const [id, side] of linkSides) out.set(id, { ...params.get(id), side });
    return out;
  }, [params, linkSides]);

  const resolvedOf = useCallback(
    (nodeId: string, type?: string) => {
      const def = type ? getDeviceDefinition(type) : undefined;
      return def ? resolveDevice(def, shownParams.get(nodeId)) : undefined;
    },
    [shownParams],
  );

  // --- 配線のスタブ長とレーン（重なり回避）。表示中のシートの電線だけで重なりを避ける ---
  const { lanes, geometry } = useMemo(
    () =>
      wireLayout(
        layoutDevices(nodes.filter((n) => n.data.sheet === sheet)),
        flowToDiagram([], edges).wires,
        (id) => shownParams.get(id),
        getDeviceDefinition,
      ),
    [nodes, edges, shownParams, sheet],
  );

  // --- シートと移動 ---
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const edgesRef = useRef(edges);
  edgesRef.current = edges;

  /** シートを切り替え、そのシートの機器（ids を指定すればそれ）が見えるように表示する */
  const showSheet = useCallback(
    (id: string, ids?: string[]) => {
      setSheet(id);
      // 表示が切り替わって機器の大きさが測られてから合わせる（ids がなければ表示中の機器すべて）
      window.setTimeout(() => {
        if (ids?.length) fitView({ nodes: ids.map((x) => ({ id: x })), padding: 0.5, duration: 350, maxZoom: 1.3 });
        else fitView({ padding: 0.15, duration: 350, maxZoom: 1.5 });
      }, 80);
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
      if (!getDeviceDefinition(d.type)?.netLabel) continue;
      const k = linkKey(d.type, String(d.params?.name ?? '').trim());
      const sheetId = d.sheet ?? sheets[0].id;
      out.set(k, [...(out.get(k) ?? []), { id: d.id, sheet: sheetId, sheetName: sheets.find((s) => s.id === sheetId)?.name ?? '' }]);
    }
    return out;
  }, [topo]);

  // I/O を持つ PLC（親と装着したユニット）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ioDevices = useMemo(() => new Set(ioHosts(diagram, getDeviceDefinition).flatMap((h) => mountFamily(diagram, h))), [topo]);
  // ユニットを装着できる PLC（親と装着したユニット）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const plcDevices = useMemo(
    () =>
      new Set(
        diagram.devices
          .filter((d) => getDeviceDefinition(d.type)?.bus?.host && !isManifold(getDeviceDefinition(d.type)))
          .flatMap((d) => mountFamily(diagram, d.id)),
      ),
    [topo],
  );
  // マニホールド（親と装着した連）
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const valveDevices = useMemo(() => manifoldDevices(diagram, getDeviceDefinition), [topo]);

  const context = useMemo(() => {
    const deviceSeverity = new Map<string, Severity>();
    const wireSeverity = new Map<string, Severity>();
    for (const i of issues) {
      i.devices.forEach((d) => worst(deviceSeverity, d, i.severity));
      i.wires.forEach((w) => worst(wireSeverity, w, i.severity));
    }
    return { deviceSeverity, wireSeverity, lanes, geometry, issues, params: shownParams, hosts: new Set(bus.groups.keys()), linkPeers, onJump: focusDevice, showMarkers, showNotes };
  }, [issues, lanes, geometry, shownParams, bus, linkPeers, focusDevice, showMarkers, showNotes]);

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
  const linkNameKey = [...linkPeers.keys()]
    .filter((k) => k.startsWith(`${LINK_TYPE}|`))
    .map((k) => k.slice(LINK_TYPE.length + 1))
    .filter(Boolean)
    .sort()
    .join('\n');
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

  // --- 元に戻す・やり直す ---
  // 図面全体（位置・曲がり・シート・設定を含む）を文字列にしたものを記録する
  const snapshot = useMemo(() => JSON.stringify(toDiagramFile(diagram)), [diagram]);
  const restore = useCallback(
    (json: string) => {
      const d = parseDiagram(json);
      // 戻した結果リンクの名前がなくなっても、番号付きのリンクの名前は変えない
      skipPromote.current = true;
      applyDiagram(d);
      setSettings(d.settings ?? {});
      setSchematic(d.schematic);
      const ss = sheetsOf(d);
      setSheet((cur) => (ss.some((x) => x.id === cur) ? cur : ss[0].id));
      setSchematicSheet((cur) => (d.schematic?.sheets.some((x) => x.id === cur) ? cur : (d.schematic?.sheets[0]?.id ?? '')));
    },
    [applyDiagram],
  );
  const history = useHistory(snapshot, restore);
  const undo = useCallback(() => history.undo() && notify('元に戻しました'), [history, notify]);
  const redo = useCallback(() => history.redo() && notify('やり直しました'), [history, notify]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // 文字の入力中はブラウザの文字の取り消しを使う
      const t = e.target as HTMLElement | null;
      if (t && (t.closest('input, textarea, select') || t.isContentEditable)) return;
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === 'z' && e.shiftKey) || k === 'y') {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  // --- 展開図 ---
  // 機器を消したら、その要素の配置も消す
  const deviceIdsKey = nodes.map((n) => n.id).join('\n');
  useEffect(() => {
    const ids = new Set(deviceIdsKey.split('\n').filter(Boolean));
    setSchematic((s) => pruneSchematic(s, ids));
  }, [deviceIdsKey]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const schematicBuild = useMemo(() => (mode === 'schematic' && schematic ? buildSchematic(diagram, getDeviceDefinition) : null), [topo, schematic, mode]);

  /** 展開図のモードにする（展開図がなければ 1 枚作り、母線を電源の出力から選んでおく） */
  const openSchematic = useCallback(() => {
    if (!schematic?.sheets.length) {
      const rails = defaultRails(buildSchematic({ ...diagram, schematic: undefined }, getDeviceDefinition).railCandidates);
      const first = { ...newSchematicSheet(undefined), rails };
      setSchematic({ sheets: [first] });
      setSchematicSheet(first.id);
    } else if (!schematic.sheets.some((x) => x.id === schematicSheet)) {
      setSchematicSheet(schematic.sheets[0].id);
    }
    setMode('schematic');
  }, [schematic, schematicSheet, diagram]);

  const exportSchematic = useCallback(() => {
    if (!schematic?.sheets.length) return;
    const doc = (schematicBuild ?? buildSchematic(diagram, getDeviceDefinition)).doc;
    download(JSON.stringify(doc, null, 1), 'schematic', 'json', 'application/json');
    notify('展開図 JSON を書き出しました。tools/dxf の Python スクリプトで DXF に変換できます');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schematic, schematicBuild, diagram, notify]);

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
      const center = !at;
      let pos = at;
      if (!pos) {
        const r = canvasRef.current?.getBoundingClientRect();
        pos = screenToFlowPosition({ x: (r?.left ?? 0) + (r?.width ?? 800) / 2, y: (r?.top ?? 0) + (r?.height ?? 600) / 2 });
      }
      setNodes((ns) => {
        const id = nextDeviceId(def.labelPrefix, ns.map((n) => n.id));
        // クリックで置くときは、同じシートのほかの機器に重ならない位置まで右（端まで行ったら下の段）へずらす
        if (center && pos) {
          const boxes = ns
            .filter((n) => n.data.sheet === sheet)
            .map((n) => {
              const d = getDeviceDefinition(n.data.deviceType);
              const size = d ? deviceSize(d, n.data.params) : { width: 100, height: 100 };
              return { x: n.position.x, y: n.position.y, w: size.width, h: size.height };
            });
          const hits = (x: number, y: number) => boxes.some((b) => x < b.x + b.w + 20 && x + def.width + 20 > b.x && y < b.y + b.h + 40 && y + def.height + 40 > b.y);
          const start = { x: pos.x - def.width / 2, y: pos.y - def.height / 2 };
          let p = start;
          for (let i = 0; i < 60 && hits(p.x, p.y); i++) p = { x: start.x + ((i + 1) % 6) * (def.width + 40), y: start.y + Math.floor((i + 1) / 6) * (def.height + 60) };
          pos = { x: p.x + def.width / 2, y: p.y + def.height / 2 };
        }
        const place = pos!;
        return [
          ...ns.map((n) => ({ ...n, selected: false })),
          {
            id,
            type: 'device',
            position: { x: Math.round(place.x - def.width / 2), y: Math.round(place.y - def.height / 2) },
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
      // エアのポートどうしはチューブ（種類・色は前回引いたチューブに合わせる）
      const air = isAirPort(terminalOf(c.source, c.sourceHandle)) && isAirPort(terminalOf(c.target, c.targetHandle));
      const lastTube = air ? [...edges].reverse().find((e) => e.data && isTubeType(e.data.wireType))?.data : undefined;
      const tube = air ? tubeAttrs(diagram, { device: c.source, terminal: c.sourceHandle ?? '' }, { device: c.target, terminal: c.targetHandle ?? '' }, getDeviceDefinition, lastTube) : undefined;
      setEdges((es) => [
        ...es,
        {
          id: nextWireId(es.map((e) => e.id)),
          type: 'wire',
          source: c.source,
          sourceHandle: c.sourceHandle,
          target: c.target,
          targetHandle: c.targetHandle,
          data: tube ? { ...tube } : isCable ? { color: 'black', sizeSq: 0, wireType: CABLE_WIRE_TYPE } : { ...wireDefaults },
        },
      ]);
    },
    [setEdges, wireDefaults, terminalOf, edges, diagram],
  );

  // 端子から引いた電線を何もないところで離したら、接続先の候補（電源・PLC の空き入出力・リンク）を出す
  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      setConnecting(false);
      if (state.isValid || state.toHandle || !state.fromNode || !state.fromHandle?.id) return;
      const target = event.target as Element | null;
      if (!target?.closest('.react-flow__pane')) return;
      const from = { device: state.fromNode.id, terminal: state.fromHandle.id };
      // エアのポートは、流れの向きが合うエア機器の候補を出す（電気の接続先は出さない）
      if (isAirPort(terminalOf(from.device, from.terminal))) {
        const cands = airCandidates(diagram, from, deviceDefinitions, getDeviceDefinition);
        if (!cands.length) return;
        const pt = 'changedTouches' in event ? event.changedTouches[0] : event;
        setPicker({
          x: pt.clientX,
          y: pt.clientY,
          at: screenToFlowPosition({ x: pt.clientX, y: pt.clientY }),
          from,
          suggestions: { power: [], io: [], defaultName: '' },
          mates: cands,
        });
        return;
      }
      // コネクタは、LAN ポートならネットワーク、ほかはつなげる機器の候補を出す（候補がなければ出さない）
      const conn = terminalOf(from.device, from.terminal)?.connector;
      const mates = hasMateCandidates(conn) ? mateCandidates(diagram, from, deviceDefinitions, getDeviceDefinition) : [];
      if (conn && !(conn.pins === 0 && conn.kind === 'RJ45') && !mates.length) return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      setPicker({
        x: point.clientX,
        y: point.clientY,
        at: screenToFlowPosition({ x: point.clientX, y: point.clientY }),
        from,
        suggestions: suggestConnections(diagram, from, getDeviceDefinition),
        mates,
      });
    },
    [terminalOf, screenToFlowPosition, diagram],
  );

  // インスペクタの「つなぐ機器を選ぶ」: 候補はコネクタの外側（電線が出る向きへ少し離した位置）に置く
  const pickMate = useCallback(
    (device: string, terminal: string, anchor: DOMRect) => {
      const from = { device, terminal };
      const p = terminalPoint(diagram, from, getDeviceDefinition);
      const mates = mateCandidates(diagram, from, deviceDefinitions, getDeviceDefinition);
      if (!p || !mates.length) {
        notify(`${device}.${terminal} につなげる機器が見つかりません`);
        return;
      }
      const away = 160;
      const dir = { top: [0, -1], bottom: [0, 1], left: [-1, 0], right: [1, 0] }[p.side];
      setPicker({
        // インスペクタに重ならないよう、ボタンの左に出す（はみ出す分は ConnectPicker が画面内に収める）
        x: anchor.left - 310,
        y: anchor.top,
        at: { x: p.x + dir[0] * away, y: p.y + dir[1] * away },
        from,
        suggestions: suggestConnections(diagram, from, getDeviceDefinition),
        mates,
        fit: true,
      });
    },
    [diagram, notify],
  );

  // コネクタは同じ種類（または変換ケーブルのある種類）のコネクタとだけ（ケーブルで）つなげる
  const isValidConnection = useCallback(
    (c: Connection | WireFlowEdge) => {
      if (c.source === c.target && c.sourceHandle === c.targetHandle) return false;
      // エアのポートはエアのポートとだけ（チューブで）つなぐ
      if (isAirPort(terminalOf(c.source, c.sourceHandle)) !== isAirPort(terminalOf(c.target, c.targetHandle))) return false;
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
      setSchematic((s) => renameSchematicDevice(s, oldId, newId));
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
      const peers = (linkPeers.get(linkKey(node.data.deviceType, name)) ?? []).filter((p) => p.id !== node.id);
      const items: MenuItem[] = [
        ...(plcDevices.has(node.id) ? [{ label: 'PLC エディタ（ユニット構成）…', onClick: () => setPlcEditor({ id: node.id, tab: 'rack' }) }] : []),
        ...(ioDevices.has(node.id) ? [{ label: 'I/O 割付・接続を編集…', onClick: () => setPlcEditor({ id: node.id, tab: 'io' }) }] : []),
        ...(valveDevices.has(node.id) ? [{ label: 'バルブエディタ（連の構成・つなぎ先）…', onClick: () => setValveEditor(node.id) }] : []),
        ...(peers.length ? [{ label: '相手のリンクへ移動', children: peers.map((p) => ({ label: `${p.sheetName}（${p.id}）`, onClick: () => focusDevice(p.id) })) }] : []),
        ...(alignableLinkCount(diagram, node.id, getDeviceDefinition)
          ? [
              {
                label: 'リンクを端子の横にそろえる',
                onClick: () => applyDiagram(alignLinks(diagram, node.id, getDeviceDefinition), `${node.id} のリンクを端子の横にそろえました`),
              },
            ]
          : []),
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
    [sheets, linkPeers, ioDevices, plcDevices, valveDevices, focusDevice, moveDevicesToSheet, moveToNewSheet, deleteElements, diagram, applyDiagram],
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
            label: isCable ? 'ネットワークリンクで分ける（LAN ケーブルを図から消す）' : 'リンクで分ける（電線を図から消す）',
            disabled: isCable && !isLanCable(diagram, flowToDiagram([], [edge]).wires[0], getDeviceDefinition),
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
          { label: 'ここにネットワークリンク（LAN）を置く', onClick: () => addDevice(NET_LINK_TYPE, at) },
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
      const d = splitCrossSheetWires(normalizeTubes(raw, getDeviceDefinition), getDeviceDefinition);
      skipPromote.current = true;
      const flow = diagramToFlow(d);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      setSettings(d.settings ?? {});
      setSheets(sheetsOf(d));
      setSchematic(d.schematic);
      setSchematicSheet(d.schematic?.sheets[0]?.id ?? '');
      setPlcEditor(null);
      setValveEditor(null);
      setMode('diagram');
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
    document.body.appendChild(a);
    a.click();
    a.remove();
    // すぐに無効にするとファイル名が付かないことがあるため、少し待ってから無効にする
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openFile = async (file: File) => {
    try {
      loadDiagram(parseDiagram(await file.text()));
      notify(`${file.name} を読み込みました`);
    } catch (e) {
      window.alert((e as Error).message);
    }
  };

  /** ファイルとしてダウンロードさせる（名前は「conneko-種類-日付.拡張子」。日本語の名前は付かないブラウザがあるため英数字だけ） */
  const download = (text: string, kind: string, ext: string, type: string) => {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = document.createElement('a');
    const now = new Date();
    const stamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    a.href = url;
    a.download = `conneko-${kind}-${stamp}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    // すぐに無効にするとファイル名が付かないことがあるため、少し待ってから無効にする
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const openExportMenu = (e: React.MouseEvent) => {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sheetName = sheets.find((s) => s.id === sheet)?.name ?? '';
    setMenu({
      x: r.left,
      y: r.bottom + 4,
      items: [
        { label: '印刷・PDF…', onClick: () => setPrintDialog(true) },
        { label: '部品表（CSV）', separator: true, onClick: () => download(bomCsv(diagram, getDeviceDefinition), 'bom', 'csv', 'text/csv') },
        { label: '線番表（CSV）', onClick: () => download(wireCsv(diagram, getDeviceDefinition), 'wires', 'csv', 'text/csv') },
        { label: 'I/O 表（CSV）', onClick: () => download(ioCsv(diagram, getDeviceDefinition), 'io', 'csv', 'text/csv') },
        {
          label: `表示中のシートの画像（SVG）`,
          hint: sheetName,
          separator: true,
          onClick: () => download(renderSheetSvg(diagram, sheet, getDeviceDefinition, { markers: showMarkers, notes: showNotes }).svg, `sheet${sheets.findIndex((s) => s.id === sheet) + 1}`, 'svg', 'image/svg+xml'),
        },
        {
          label: '展開図 JSON（DXF 用）',
          hint: schematic?.sheets.length ? `${schematic.sheets.length} 枚` : '展開図なし',
          separator: true,
          disabled: !schematic?.sheets.length,
          onClick: exportSchematic,
        },
      ],
    });
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
            <button type="button" className="brand__version" onClick={() => setAbout(true)} title="バージョン・ライセンス">
              v{__APP_VERSION__}
            </button>
          </div>
          <div className="mode-switch" role="tablist" aria-label="表示">
            <button type="button" role="tab" aria-selected={mode === 'diagram'} className={mode === 'diagram' ? 'is-active' : ''} onClick={() => setMode('diagram')}>
              概念図
            </button>
            <button type="button" role="tab" aria-selected={mode === 'schematic'} className={mode === 'schematic' ? 'is-active' : ''} onClick={openSchematic} title="接続から展開接続図を起こし、記号を並べて DXF 用に書き出します">
              展開図
            </button>
          </div>
          <div className="toolbar__group">
            <button type="button" onClick={undo} disabled={!history.canUndo} title="元に戻す（Ctrl+Z）" aria-label="元に戻す">
              ↶
            </button>
            <button type="button" onClick={redo} disabled={!history.canRedo} title="やり直す（Ctrl+Shift+Z / Ctrl+Y）" aria-label="やり直す">
              ↷
            </button>
          </div>
          <div className="toolbar__group">
            <button type="button" onClick={newDiagram}>新規</button>
            <button type="button" onClick={() => fileInput.current?.click()}>開く</button>
            <button type="button" onClick={saveFile}>保存</button>
            <button type="button" onClick={openExportMenu} title="印刷・PDF、部品表・線番表・I/O 表（CSV）、シートの画像">
              出力 ▾
            </button>
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
        {mode === 'schematic' && schematic && schematicBuild ? (
          <SchematicEditor
            build={schematicBuild}
            schematic={schematic}
            onChange={(update) => setSchematic((s) => (s ? update(s) : s))}
            sheet={schematicSheet}
            onSheet={setSchematicSheet}
            onShowDevice={(id) => {
              setMode('diagram');
              focusDevice(id);
            }}
            onExport={exportSchematic}
            settings={settings}
            onSettings={(patch) => setSettings((x) => ({ ...x, ...patch }))}
          />
        ) : (
        <>
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
          sheets={sheets}
          onSheetChange={(id, s) => moveDevicesToSheet([id], s)}
          ioDevices={ioDevices}
          plcDevices={plcDevices}
          onOpenPlc={(id, tab) => (valveDevices.has(id) ? setValveEditor(id) : setPlcEditor({ id, tab }))}
          valveDevices={valveDevices}
          onPickMate={pickMate}
          onWireChange={changeWire}
          onDelete={deleteSelected}
        />
        </>
        )}
        <IssuePanel issues={issues} diagram={diagram} onSelect={selectIssue} onSelectWire={selectWire} onJump={focusDevice} />
      </div>
      {about && <AboutDialog onClose={() => setAbout(false)} />}
      {printDialog && (
        <PrintDialog
          sheets={sheets}
          settings={settings}
          onSettings={(patch) => setSettings((s) => ({ ...s, ...patch }))}
          onClose={() => setPrintDialog(false)}
          onPrint={(o) => {
            setPrintDialog(false);
            setPrinting(o);
          }}
        />
      )}
      {printing && <PrintView diagram={diagram} issues={issues} options={printing} onDone={() => setPrinting(null)} />}
      {menu && <ContextMenu x={menu.x} y={menu.y} items={menu.items} onClose={() => setMenu(null)} />}
      {picker && (
        <ConnectPicker
          x={picker.x}
          y={picker.y}
          from={`${picker.from.device}.${picker.from.terminal}`}
          suggestions={picker.suggestions}
          mates={picker.mates}
          onClose={() => setPicker(null)}
          onMate={(c) => {
            setPicker(null);
            const { diagram: next, device } = applyMateCandidate(diagram, picker.from, c, picker.at, getDeviceDefinition);
            const from = `${picker.from.device}.${picker.from.terminal}`;
            const what = c.device ? `${from} を ${device} につなぎました` : `${getDeviceDefinition(c.type)?.model ?? c.type}（${device}）を置いて ${from} につなぎました`;
            applyDiagram(next, `${what}${c.sourceChange ? `（${picker.from.device} の${c.sourceChange.label}）` : ''}`);
            // つないだ相手を選んで、端子の呼び名を出す
            setNodes((ns) => ns.map((x) => (x.selected !== (x.id === device) ? { ...x, selected: x.id === device } : x)));
            setEdges((es) => es.map((e) => (e.selected ? { ...e, selected: false } : e)));
            if (picker.fit) showSheet(sheet, [picker.from.device, device]);
          }}
          onPower={(c) => {
            setPicker(null);
            applyDiagram(applyPowerCandidate(diagram, picker.from, c, picker.at, wireDefaults, getDeviceDefinition), `${picker.from.device}.${picker.from.terminal} を ${c.name} につなぎました${c.attach ? `（${c.attach.device} 側にもリンクを置きました）` : ''}`);
          }}
          onIo={(c) => {
            setPicker(null);
            applyDiagram(applyIoCandidate(diagram, picker.from, c, wireDefaults, getDeviceDefinition), `${picker.from.device}.${picker.from.terminal} を ${c.point.address}（${c.point.device}）につなぎました`);
          }}
          onNetwork={(name) => {
            setPicker(null);
            applyDiagram(applyNetwork(diagram, picker.from, name, picker.at, getDeviceDefinition), `ネットワークリンク「${name}」を置いてつなぎました`);
          }}
          onLink={(name) => {
            setPicker(null);
            applyDiagram(placeLinkAt(diagram, picker.from, name, picker.at, wireDefaults, getDeviceDefinition), `リンク「${name}」を置きました`);
          }}
        />
      )}
      {plcEditor && (
        <PlcEditor
          diagram={diagram}
          deviceId={plcEditor.id}
          tab={plcEditor.tab}
          onTab={(tab) => setPlcEditor({ ...plcEditor, tab })}
          onApply={applyDiagram}
          onJump={(id) => {
            setPlcEditor(null);
            focusDevice(id);
          }}
          onClose={() => setPlcEditor(null)}
        />
      )}
      {valveEditor && (
        <ValveEditor
          diagram={diagram}
          deviceId={valveEditor}
          onApply={applyDiagram}
          onJump={(id) => {
            setValveEditor(null);
            focusDevice(id);
          }}
          onClose={() => setValveEditor(null)}
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

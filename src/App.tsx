import { useCallback, useMemo, useRef, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './styles.css';
import iconUrl from './assets/conneko-icon.svg?inline';
import { checkDiagram, type CheckIssue, type Severity } from './check/checkDiagram';
import { DEFAULT_WIRE } from './data/wires';
import { getDeviceDefinition } from './devices/registry';
import type { TerminalSide } from './devices/types';
import { DeviceNode } from './editor/DeviceNode';
import { FAN_LENGTH } from './editor/CableGraphics';
import { EditorContext, type WireGeometry } from './editor/EditorContext';
import { diagramToFlow, flowToDiagram, type DeviceFlowNode, type WireEdgeData, type WireFlowEdge } from './editor/flow';
import { Inspector, type WireDefaults } from './editor/Inspector';
import { IssuePanel } from './editor/IssuePanel';
import { DEVICE_DRAG_TYPE, Palette } from './editor/Palette';
import { assignLanes, stubLength, type LaneInput } from './editor/routing';
import { WireEdge } from './editor/WireEdge';
import { buildAiPrompt } from './io/aiPrompt';
import { CABLE_WIRE_TYPE, nextDeviceId, nextWireId, parseDiagram, toDiagramFile, type Diagram } from './model/diagram';
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
  return JSON.stringify([d.devices.map((x) => [x.id, x.type, x.params]), d.wires.map((w) => ({ ...w, bend: undefined }))]);
}

function Editor() {
  const initial = useMemo(() => diagramToFlow(sampleDiagram), []);
  const [nodes, setNodes, onNodesChange] = useNodesState<DeviceFlowNode>(initial.nodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState<WireFlowEdge>(initial.edges);
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
  const diagram = useMemo(() => flowToDiagram(nodes, edges), [nodes, edges]);
  const topo = topologyKey(diagram);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const issues = useMemo(() => checkDiagram(diagram, getDeviceDefinition), [topo]);

  // --- 配線のスタブ長とレーン（重なり回避） ---
  const { lanes, geometry } = useMemo(() => {
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const inputs: LaneInput[] = [];
    const geometry = new Map<string, WireGeometry>();
    for (const e of edges) {
      const end = (nodeId: string, handle?: string | null) => {
        const n = byId.get(nodeId);
        const def = n && getDeviceDefinition(n.data.deviceType);
        const t = def?.terminals.find((x) => x.id === handle);
        if (!n || !def || !t) return null;
        const toEdge = { top: t.y, bottom: def.height - t.y, left: t.x, right: def.width - t.x }[t.side];
        // ケーブルはコネクタ付近で芯線を広げて描くため、まっすぐ出る区間を長めにとる
        const stub = t.connector ? Math.max(stubLength(toEdge), FAN_LENGTH + 20) : stubLength(toEdge);
        return { x: n.position.x + t.x, y: n.position.y + t.y, side: t.side as TerminalSide, stub, connector: t.connector };
      };
      const s = end(e.source, e.sourceHandle);
      const t = end(e.target, e.targetHandle);
      if (!s || !t) continue;
      geometry.set(e.id, { sStub: s.stub, tStub: t.stub, sConnector: s.connector, tConnector: t.connector });
      inputs.push({ id: e.id, sx: s.x, sy: s.y, sSide: s.side, sStub: s.stub, tx: t.x, ty: t.y, tSide: t.side, tStub: t.stub, manual: !!e.data?.bend });
    }
    return { lanes: assignLanes(inputs), geometry };
  }, [nodes, edges]);

  const context = useMemo(() => {
    const deviceSeverity = new Map<string, Severity>();
    const wireSeverity = new Map<string, Severity>();
    for (const i of issues) {
      i.devices.forEach((d) => worst(deviceSeverity, d, i.severity));
      i.wires.forEach((w) => worst(wireSeverity, w, i.severity));
    }
    return { deviceSeverity, wireSeverity, lanes, geometry, issues };
  }, [issues, lanes, geometry]);

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
            data: { deviceType: type },
            selected: true,
          },
        ];
      });
    },
    [screenToFlowPosition, setNodes],
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
      return n ? getDeviceDefinition(n.data.deviceType)?.terminals.find((t) => t.id === handle) : undefined;
    },
    [nodes],
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

  // コネクタは同じ種類のコネクタとだけ（ケーブルで）つなげる
  const isValidConnection = useCallback(
    (c: Connection | WireFlowEdge) => {
      if (c.source === c.target && c.sourceHandle === c.targetHandle) return false;
      const a = terminalOf(c.source, c.sourceHandle)?.connector;
      const b = terminalOf(c.target, c.targetHandle)?.connector;
      return a || b ? !!a && !!b && a.kind === b.kind : true;
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
      setNodes((ns) => ns.map((n) => (n.id === oldId ? { ...n, id: newId } : n)));
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
      if (nodeIds.size) fitView({ nodes: [...nodeIds].map((id) => ({ id })), padding: 0.4, duration: 400, maxZoom: 1.5 });
    },
    [edges, setNodes, setEdges, fitView],
  );

  // --- ファイル入出力 ---
  const loadDiagram = useCallback(
    (d: Diagram) => {
      const flow = diagramToFlow(d);
      setNodes(flow.nodes);
      setEdges(flow.edges);
      window.setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
    },
    [setNodes, setEdges, fitView],
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
        <main className="canvas" ref={canvasRef} onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            isValidConnection={isValidConnection}
            connectionMode={ConnectionMode.Loose}
            defaultEdgeOptions={{ zIndex: 1001 }}
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
        </main>
        <Inspector
          node={selectedNode}
          edge={selectedEdge}
          edges={edges}
          issues={issues}
          wireDefaults={wireDefaults}
          onWireDefaultsChange={setWireDefaults}
          onRenameDevice={renameDevice}
          onParamChange={changeParam}
          onWireChange={changeWire}
          onDelete={deleteSelected}
        />
        <IssuePanel issues={issues} onSelect={selectIssue} />
      </div>
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

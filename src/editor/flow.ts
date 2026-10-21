/**
 * React Flow のノード/エッジと図面データ（Diagram）の相互変換。
 */
import type { Edge, Node } from '@xyflow/react';
import type { ParamValues } from '../devices/types';
import type { Diagram } from '../model/diagram';

export interface DeviceNodeData extends Record<string, unknown> {
  deviceType: string;
  params?: ParamValues;
}

export interface WireEdgeData extends Record<string, unknown> {
  wireNo?: string;
  color: string;
  sizeSq: number;
  wireType: string;
  bend?: number;
}

export type DeviceFlowNode = Node<DeviceNodeData, 'device'>;
export type WireFlowEdge = Edge<WireEdgeData, 'wire'>;

export function diagramToFlow(diagram: Diagram): { nodes: DeviceFlowNode[]; edges: WireFlowEdge[] } {
  return {
    nodes: diagram.devices.map((d) => ({
      id: d.id,
      type: 'device',
      position: { x: d.x, y: d.y },
      data: { deviceType: d.type, ...(d.params ? { params: d.params } : {}) },
    })),
    edges: diagram.wires.map((w) => ({
      id: w.id,
      type: 'wire',
      source: w.from.device,
      sourceHandle: w.from.terminal,
      target: w.to.device,
      targetHandle: w.to.terminal,
      data: {
        color: w.color,
        sizeSq: w.sizeSq,
        wireType: w.wireType,
        ...(w.wireNo ? { wireNo: w.wireNo } : {}),
        ...(w.bend ? { bend: w.bend } : {}),
      },
    })),
  };
}

export function flowToDiagram(nodes: DeviceFlowNode[], edges: WireFlowEdge[]): Diagram {
  return {
    devices: nodes.map((n) => ({
      id: n.id,
      type: n.data.deviceType,
      x: n.position.x,
      y: n.position.y,
      ...(n.data.params ? { params: n.data.params } : {}),
    })),
    wires: edges.map((e) => ({
      id: e.id,
      from: { device: e.source, terminal: e.sourceHandle ?? '' },
      to: { device: e.target, terminal: e.targetHandle ?? '' },
      color: e.data?.color ?? 'black',
      sizeSq: e.data?.sizeSq ?? 2,
      wireType: e.data?.wireType ?? 'KIV',
      ...(e.data?.wireNo ? { wireNo: e.data.wireNo } : {}),
      ...(e.data?.bend ? { bend: e.data.bend } : {}),
    })),
  };
}

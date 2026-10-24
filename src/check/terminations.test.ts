import { describe, expect, it } from 'vitest';
import { getDeviceDefinition } from '../devices/registry';
import { bomRows, wireCsv } from '../export/reports';
import { parseDiagram, toDiagramFile, type Diagram, type DiagramWire } from '../model/diagram';
import { checkDiagram } from './checkDiagram';

const lookup = getDeviceDefinition;
const w = (id: string, from: string, to: string, extra: Partial<DiagramWire> = {}): DiagramWire => {
  const [fd, ft] = from.split('.');
  const [td, tt] = to.split('.');
  return { id, from: { device: fd, terminal: ft }, to: { device: td, terminal: tt }, color: 'black', sizeSq: 2, wireType: 'KIV', ...extra };
};
/** AC100V → ノーヒューズ遮断器（定格 rated）→ 端子台 VTX 2.5（定格 24A・プッシュイン） */
const circuit = (rated: number, extra: Partial<DiagramWire> = {}): Diagram => ({
  devices: [
    { id: 'PS1', type: 'generic.power-source.1p100v', x: 0, y: 0 },
    { id: 'CB1', type: 'mitsubishi.nf32-sv.2p', x: 0, y: 0, params: { ratedCurrent: rated } },
    { id: 'TB1', type: 'toyogiken.vtx-2.5-2.10p', x: 0, y: 0 },
  ],
  wires: [w('W1', 'PS1.L', 'CB1.1'), w('W2', 'PS1.N', 'CB1.3'), w('W3', 'CB1.2', 'TB1.1a', extra), w('W4', 'CB1.4', 'TB1.2a', extra)],
});
const rules = (d: Diagram) => checkDiagram(d, lookup).map((i) => i.rule);

describe('電線の端末処理と端子が受け入れる電線（#5）', () => {
  it('プッシュインの端子に丸形圧着端子をつなぐと警告し、フェルールなら警告しない', () => {
    expect(rules(circuit(20, { toTermination: 'ring' }))).toContain('termination-mismatch');
    expect(rules(circuit(20, { toTermination: 'ferrule' }))).not.toContain('termination-mismatch');
  });

  it('端子の適合電線より太い電線は警告する', () => {
    expect(rules(circuit(20, { sizeSq: 3.5 }))).toContain('wire-size-terminal');
    expect(rules(circuit(20, { sizeSq: 2 }))).not.toContain('wire-size-terminal');
  });

  it('上流の保護電流が端子台の定格電流（24A）を超えると警告する', () => {
    expect(rules(circuit(30))).toContain('terminal-overcurrent');
    expect(rules(circuit(20))).not.toContain('terminal-overcurrent');
  });

  it('フェルール・圧着端子は部品表に数え、線番表に端末処理を書く', () => {
    const d = circuit(20, { fromTermination: 'fork', toTermination: 'ferrule' });
    const rows = bomRows(d, lookup);
    expect(rows.find((r) => r.name.startsWith('フェルール'))?.qty).toBe(2);
    expect(rows.find((r) => r.name.startsWith('Y 形'))?.qty).toBe(2);
    expect(wireCsv(d, lookup)).toContain('Y 形 / フェルール');
  });

  it('端末処理と変換ケーブルの種類は、JSON の保存・読み込みで残る', () => {
    const d = circuit(20, { fromTermination: 'fork', toTermination: 'ferrule', cable: 'toyogiken.kb40n-4f1h' });
    const back = parseDiagram(JSON.stringify(toDiagramFile(d)));
    expect(back.wires.find((x) => x.id === 'W3')).toMatchObject({ fromTermination: 'fork', toTermination: 'ferrule', cable: 'toyogiken.kb40n-4f1h' });
  });
});

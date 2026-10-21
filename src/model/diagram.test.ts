import { describe, expect, it } from 'vitest';
import { DiagramParseError, parseDiagram, toDiagramFile } from './diagram';
import { sampleDiagram } from './sample';

describe('parseDiagram', () => {
  it('保存した形式をそのまま読み戻せる', () => {
    const file = toDiagramFile(sampleDiagram);
    expect(toDiagramFile(parseDiagram(JSON.stringify(file)))).toEqual(file);
  });

  it('AI の出力（コードブロック・文字列の端子指定・属性の省略）を補完して読み込む', () => {
    const text = '```json\n{"devices":[{"id":"A","type":"t"},{"id":"B","type":"t"}],"wires":[{"from":"A.1","to":{"device":"B","terminal":"2"}}]}\n```';
    const d = parseDiagram(text);
    expect(d.wires[0]).toMatchObject({ id: 'W1', from: { device: 'A', terminal: '1' }, to: { device: 'B', terminal: '2' } });
    expect(d.wires[0].color).toBeTruthy();
  });

  it('重複した機器名はエラーにする', () => {
    expect(() => parseDiagram({ devices: [{ id: 'A', type: 't' }, { id: 'A', type: 't' }] })).toThrow(DiagramParseError);
  });

  it('重複した電線IDは振り直す', () => {
    const d = parseDiagram({ devices: [], wires: [{ id: 'W1', from: 'A.1', to: 'B.1' }, { id: 'W1', from: 'A.2', to: 'B.2' }] });
    expect(d.wires.map((w) => w.id)).toEqual(['W1', 'W2']);
  });
});

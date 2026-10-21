/**
 * 生成AIに貼り付けるためのプロンプト（指示＋機器の端子情報＋現在の図面データ）を作る。
 */
import type { CheckIssue } from '../check/checkDiagram';
import { CIRCUIT_COLOR_RULES, WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import { getDeviceDefinition } from '../devices/registry';
import { resolveNum, type DeviceDefinition, type TerminalDef } from '../devices/types';
import { toDiagramFile, type Diagram } from '../model/diagram';

const ROLE_TEXT: Record<TerminalDef['role'], string> = {
  line: '一次側（電源側）',
  load: '二次側（負荷側）',
  pass: '中継',
  supply: '電源出力',
  input: '受電',
  ground: '接地',
  signal: '信号',
};

function terminalLine(t: TerminalDef): string {
  const parts = [`${t.id}`, ROLE_TEXT[t.role]];
  if (t.supply) parts.push(`${t.supply.system} ${typeof t.supply.voltage === 'number' ? t.supply.voltage + 'V' : ''} 導体=${t.supply.conductor}`);
  if (t.accepts) {
    parts.push(`${t.accepts.system}${t.accepts.minVoltage}〜${t.accepts.maxVoltage}V${t.accepts.conductors ? ` 接続可能な導体=${t.accepts.conductors.join('/')}` : ''}`);
  }
  if (t.optional) parts.push('未使用可');
  return `    - ${parts.join(' / ')}`;
}

function deviceSection(id: string, def: DeviceDefinition, params: Diagram['devices'][number]['params']): string {
  const lines = [`- ${id}: ${def.name} ${def.model}（type: ${def.type}）`];
  if (def.description) lines.push(`  説明: ${def.description}`);
  const prot = resolveNum(def.protectionCurrent, def, params);
  if (prot !== undefined) lines.push(`  保護電流: ${prot}A`);
  const load = resolveNum(def.loadCurrent, def, params);
  if (load !== undefined) lines.push(`  負荷電流: ${load}A`);
  lines.push('  端子:');
  lines.push(...def.terminals.map(terminalLine));
  if (def.links?.length) {
    lines.push(`  内部の導通: ${def.links.map((l) => `${l.from}${l.directed ? '→' : '↔'}${l.to}`).join(', ')}`);
  }
  if (def.distinctGroups?.length) {
    lines.push(`  異なる相で給電する端子: ${def.distinctGroups.map((g) => g.join('/')).join('; ')}`);
  }
  return lines.join('\n');
}

export function buildAiPrompt(diagram: Diagram, issues: CheckIssue[]): string {
  const devices = diagram.devices
    .map((d) => {
      const def = getDeviceDefinition(d.type);
      return def ? deviceSection(d.id, def, d.params) : `- ${d.id}: 不明な機器 ${d.type}`;
    })
    .join('\n');
  const issueText = issues.length
    ? issues.map((i) => `- [${i.severity}] ${i.message}`).join('\n')
    : '- なし';

  return `あなたは電気配線図作成アプリ「Conneko」の図面データ(JSON)を編集するアシスタントです。
下の図面データには、配置済みだが配線されていない機器があります。電気的に正しくなるように配線（wires）を追加し、図面データ全体をJSONで返してください。

## ルール
- devices は変更しないでください（id・type・位置・params をそのまま残す）。
- 既存の wires は、明らかな誤りがない限り残してください。
- 追加する電線の形式: {"from": {"device": "機器名", "terminal": "端子ID"}, "to": {"device": "機器名", "terminal": "端子ID"}, "wireNo": "線番", "color": "色ID", "sizeSq": 太さ(mm²), "wireType": "電線種類ID"}
  - id は省略できます（アプリが自動採番します）。
  - 端子IDは下の「機器と端子」に書かれているものだけを使ってください。
- 電源出力から保護機器（ブレーカー・サーキットプロテクタ）を通して負荷へ給電してください。
- 三相の負荷には R/S/T の3相を、それぞれ別の端子に接続してください。直流は +/- の極性に注意してください。
- 接地端子は電源の PE へ接続してください。
- 電線の太さは、上流の保護機器の定格電流以上の許容電流をもつものを選んでください。
- 電線色ID: ${WIRE_COLORS.map((c) => `${c.id}(${c.name})`).join(', ')}
- 電線種類ID: ${WIRE_TYPES.map((t) => `${t.id}(${t.sizes.join('/')}sq)`).join(', ')}
- 電線色の慣例: ${CIRCUIT_COLOR_RULES.map((r) => `${r.name}=${r.colors.join('/')}`).join(', ')}
- 返答は JSON のみ（説明文なし）で、\`format\` と \`version\` も残してください。

## 機器と端子
${devices || '- （機器なし）'}

## 現在のチェック結果
${issueText}

## 現在の図面データ
\`\`\`json
${JSON.stringify(toDiagramFile(diagram), null, 2)}
\`\`\`
`;
}

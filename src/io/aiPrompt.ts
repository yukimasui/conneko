/**
 * 生成AIに貼り付けるためのプロンプト（指示＋機器の端子情報＋現在の図面データ）を作る。
 */
import type { CheckIssue } from '../check/checkDiagram';
import { CIRCUIT_COLOR_RULES, WIRE_COLORS, WIRE_TYPES } from '../data/wires';
import { computeBus, effectiveParams } from '../model/bus';
import { getDeviceDefinition } from '../devices/registry';
import { functionsOf, ioName, resolveDevice, type ResolvedAccept } from '../devices/resolve';
import { resolveNum, type DeviceDefinition, type InternalLink, type ParamValues, type PinDef, type TerminalDef } from '../devices/types';
import { sheetOf, sheetsOf, toDiagramFile, type Diagram, type DiagramDevice } from '../model/diagram';

const ROLE_TEXT: Record<TerminalDef['role'], string> = {
  line: '一次側（電源側）',
  load: '二次側（負荷側）',
  pass: '中継',
  supply: '電源出力',
  input: '受電',
  ground: '接地',
  signal: '信号',
  connector: 'コネクタ',
};

const SIGNAL_TEXT: Record<string, string> = {
  npn: 'NPN出力',
  pnp: 'PNP出力',
  contact: '無電圧接点出力',
  '2wire': '2線式センサー',
  dc: 'DC入力',
  dry: '無電圧接点入力',
  'analog-v': 'アナログ電圧',
  'analog-i': 'アナログ電流',
  'line-driver': 'ラインドライバ',
};

const FUNCTION_TEXT: Record<string, string> = {
  'safety-input': '安全入力',
  'test-output': 'テスト出力',
  ossd: '安全出力(OSSD)',
  'safety-contact': '安全接点出力',
  'aux-output': '補助出力',
  edm: 'EDM(外部機器監視)',
  reset: 'リセット入力',
  'reset-auto': '自動リセット端子',
  start: 'スタート入力',
  muting: 'ミューティング入力',
  'unlock-solenoid': '解錠ソレノイド',
  'lock-solenoid': '施錠ソレノイド',
};

const SWITCH_TEXT: Record<NonNullable<InternalLink['switch']>, string> = {
  NO: 'a接点',
  NC: 'b接点',
  output: '出力ON で導通',
};

function acceptsText(accepts: ResolvedAccept[]): string {
  return accepts
    .map((a) => `${a.system}${a.minVoltage}〜${a.maxVoltage}V${a.conductors ? ` 接続可能な導体=${a.conductors.join('/')}` : ''}`)
    .join(' または ');
}

/** 端子・ピンの性質（役割・電源・信号・安全機能） */
function traits(t: TerminalDef | PinDef, accepts: ResolvedAccept[]): string[] {
  const parts = [t.signal ? `${SIGNAL_TEXT[t.signal.kind]}${t.signal.common ? `（コモン ${t.signal.common}）` : ''}` : ROLE_TEXT[t.role]];
  if (t.supply) {
    const kind = t.supply.kind === 'ossd' ? '安全出力 ' : t.supply.kind === 'test' ? 'テスト出力 ' : '';
    parts.push(`${kind}${t.supply.system} ${typeof t.supply.voltage === 'number' ? t.supply.voltage + 'V' : ''} 導体=${t.supply.conductor}`);
  }
  if (accepts.length) parts.push(acceptsText(accepts));
  const fns = functionsOf(t);
  if (fns.length) parts.push(`${fns.map((f) => FUNCTION_TEXT[f] ?? f).join('・')}${t.channel ? ` CH${t.channel}` : ''}`);
  return parts;
}

function terminalLine(t: TerminalDef, accepts: ResolvedAccept[]): string {
  const parts = [`${t.id}${t.label && t.label !== t.id ? `（印字 ${t.label}）` : ''}`];
  if (t.note) parts.push(t.note);
  parts.push(...(t.role === 'connector' ? [ROLE_TEXT.connector] : traits(t, accepts)));
  if (t.connector) {
    const c = t.connector;
    parts.push(`${c.kind}${c.pins ? ` ${c.pins}ピン` : ''}${c.mates?.length ? `（${c.mates.join('/')} にも変換ケーブルでつなげる）` : ''}${c.protocols?.length ? ` 通信=${c.protocols.join('/')}` : ''}`);
  }
  if (t.optional) parts.push('未使用可');
  return `    - ${parts.join(' / ')}`;
}

function linkText(l: InternalLink): string {
  const arrow = l.directed || l.switch === 'output' ? '→' : '↔';
  const tags = [l.switch && SWITCH_TEXT[l.switch], l.directOpening && '直接開路', l.linked === 'mirror' && 'ミラー接点', l.linked === 'force-guided' && '強制ガイド'].filter(Boolean);
  return `${l.from}${arrow}${l.to}${tags.length ? `(${tags.join('・')})` : ''}`;
}

function deviceSection(d: DiagramDevice, def: DeviceDefinition, params: ParamValues | undefined, sheetName: string): string {
  if (def.netLabel) {
    return `- ${d.id}: リンク「${String(params?.[def.netLabel.param] ?? '')}」（シート: ${sheetName}、端子 ${def.netLabel.terminal}）`;
  }
  const lines = [`- ${d.id}: ${def.name} ${def.model}（type: ${def.type}、シート: ${sheetName}）`];
  if (def.description) lines.push(`  説明: ${def.description}`);
  const prot = resolveNum(def.protectionCurrent, def, params);
  if (prot !== undefined) lines.push(`  保護電流: ${prot}A`);
  const load = resolveNum(def.loadCurrent, def, params);
  if (load !== undefined) lines.push(`  負荷電流: ${load}A`);
  if (def.safety) {
    const s = def.safety;
    lines.push(`  安全性能: ${[s.pl && `PL ${s.pl}`, s.category && `カテゴリ ${s.category}`, s.sil && `SIL ${s.sil}`, s.esType && `タイプ ${s.esType}`].filter(Boolean).join(' / ')}`);
  }
  if (def.bus) {
    const host = def.bus.host;
    if (host) lines.push(`  増設ユニットを装着できる（バス ${[def.bus.kind, ...(host.accepts ?? [])].filter((v, i, a) => a.indexOf(v) === i).join('/')}${host.slots ? `、${host.slots} 台まで` : ''}）`);
    else lines.push(`  ${d.mount ? `${d.mount.device} の位置 ${d.mount.slot} に装着` : `バス ${def.bus.kind} の親に装着できる（mount で指定）`}`);
  }
  const r = resolveDevice(def, params);
  if (def.bus?.io) {
    const io = def.bus.io;
    const head = (dir: 'in' | 'out', n: number, count?: number) => (count ? `${dir === 'in' ? '入力' : '出力'} ${ioName(io.format, dir, n)}〜${ioName(io.format, dir, n + count - 1)}` : '');
    lines.push(`  入出力番号: ${[head('in', Number(r.params.ioIn ?? 0), io.inputs), head('out', Number(r.params.ioOut ?? 0), io.outputs)].filter(Boolean).join('、')}`);
  }
  lines.push('  端子:');
  lines.push(...r.terminals.map((t) => terminalLine(t, r.accepts.get(t.id) ?? [])));
  for (const t of r.terminals.filter((x) => x.connector)) {
    const pins = r.pins.filter((p) => p.id.startsWith(`${t.id}#`));
    if (!pins.length) continue;
    const text = pins.map((p) => {
      const kind = p.signal ? SIGNAL_TEXT[p.signal.kind] : p.role === 'signal' ? '' : ROLE_TEXT[p.role];
      return `${p.id.split('#')[1]}=${p.label ?? p.role}${kind && !(p.label ?? '').includes(kind) ? `(${kind})` : ''}`;
    });
    lines.push(`  コネクタ ${t.id} のピン: ${text.join(', ')}`);
  }
  const comments = Object.entries(d.comments ?? {});
  if (comments.length) lines.push(`  コメント: ${comments.map(([k, v]) => `${k}=${v}`).join(', ')}`);
  // ネジ端子と同じ番号のピンをつなぐだけの経路（変換端子台）はまとめて書く
  const isPinToScrew = (l: InternalLink) => !l.switch && ((l.from.includes('#') && l.from.split('#')[1] === l.to) || (l.to.includes('#') && l.to.split('#')[1] === l.from));
  if (r.links.some(isPinToScrew)) lines.push('  コネクタのピン n はネジ端子 n と導通しています');
  // 出力はコモンごとにまとめる
  const outputs = new Map<string, string[]>();
  for (const l of r.links) if (l.switch === 'output') outputs.set(l.to, [...(outputs.get(l.to) ?? []), l.from]);
  for (const [com, points] of outputs) lines.push(`  出力（ON で ${com} と導通）: ${points.join(', ')}`);
  const links = r.links.filter((l) => !isPinToScrew(l) && l.switch !== 'output');
  if (links.length) {
    const shown = links.slice(0, 24).map(linkText);
    lines.push(`  内部の導通: ${shown.join(', ')}${links.length > shown.length ? ` ほか ${links.length - shown.length} 件` : ''}`);
  }
  for (const c of r.commonLimits) {
    const v = resolveNum(c.current, def, params);
    if (v !== undefined) lines.push(`  コモン ${c.common} の上限: ${v}A`);
  }
  for (const g of r.safetyChannels) {
    const chs = g.channels.map((c, i) => `CH${i + 1}=${c.source ? `${c.source}→` : ''}${c.input ?? c.output}`).join(', ');
    const mode = g.mode ? `（${[g.mode].flat().join(' または ')}）` : '';
    lines.push(`  安全${g.kind === 'input' ? '入力' : '出力'} ${g.label ?? g.id}${mode}${g.configurable ? '（使い方は機器の設定で決まる）' : ''}: ${chs}`);
  }
  if (def.distinctGroups?.length) {
    lines.push(`  異なる相で給電する端子: ${def.distinctGroups.map((g) => g.join('/')).join('; ')}`);
  }
  return lines.join('\n');
}

export function buildAiPrompt(diagram: Diagram, issues: CheckIssue[]): string {
  const bus = computeBus(diagram.devices, getDeviceDefinition);
  const devices = diagram.devices
    .map((d) => {
      const def = getDeviceDefinition(d.type);
      const sheetName = sheetsOf(diagram).find((s) => s.id === sheetOf(diagram, d))?.name ?? '';
      return def ? deviceSection(d, def, effectiveParams(d, bus), sheetName) : `- ${d.id}: 不明な機器 ${d.type}`;
    })
    .join('\n');
  const issueText = issues.length ? issues.map((i) => `- [${i.severity}] ${i.message}`).join('\n') : '- なし';

  return `あなたは電気配線図作成アプリ「Conneko」の図面データ(JSON)を編集するアシスタントです。
下の図面データには、配置済みだが配線されていない機器があります。電気的に正しくなるように配線（wires）を追加し、図面データ全体をJSONで返してください。

## ルール
- 既存の devices は変更しないでください（id・type・位置・params・mount・sheet・comments をそのまま残す）。リンクは追加して構いません。
- 既存の wires は、明らかな誤りがない限り残してください。
- 追加する電線の形式: {"from": {"device": "機器名", "terminal": "端子ID"}, "to": {"device": "機器名", "terminal": "端子ID"}, "wireNo": "線番", "color": "色ID", "sizeSq": 太さ(mm²), "wireType": "電線種類ID"}
  - id は省略できます（アプリが自動採番します）。
  - 端子IDは下の「機器と端子」に書かれているものだけを使ってください（印字ではなく ID）。
- コネクタ（MIL40, RJ45 など）どうしは、同じ種類（または変換ケーブルでつなげると書かれた種類）のコネクタ間をケーブルでつなぎます。ケーブルは wireType を "CABLE" にした電線として書きます（color/sizeSq は任意）。ケーブルでつなぐと両端の同じ番号のピンが導通します。通信ポートは通信方式が同じものどうしをつなぎます。
- 図面はシート（sheets）に分かれています。電線は同じシートの機器どうしだけをつなぎます。別のシートの機器へは、両方のシートにリンク（type: "generic.link"、params: {"name": "名前", "side": "left"}）を置き、名前を同じにしてそれぞれ電線でつなぎます（同じ名前のリンクどうしが導通します）。新しく置く機器には sheet にシートの id を書いてください。シートをまたいだ電線を書いた場合は、アプリが自動でリンクに置き換えます。
- PLC の入出力の電線は、線番を入出力番号（例: R000）にすると分かりやすくなります。コメント（comments）は入出力の用途です。
- 電源出力から保護機器（ブレーカー・サーキットプロテクタ）を通して負荷へ給電してください。
- 三相の負荷には R/S/T の3相を、それぞれ別の端子に接続してください。直流は +/- の極性に注意してください。
- 接地端子は電源の PE へ接続してください。
- 電線の太さは、上流の保護機器の定格電流以上の許容電流をもつものを選んでください。
- PLC の DC 入力は、コモンを +24V にした場合（プラスコモン）は NPN 出力のセンサーを、0V にした場合（マイナスコモン）は PNP 出力のセンサーをつなぎます。出力は「出力ON で導通」と書かれた経路で出力点とコモンがつながります。
- 安全回路: 2 チャンネルの安全入力は両方のチャンネルを、それぞれのテスト出力から非常停止などの b 接点を通して戻します（1 つの接点を 2 チャンネルで共用しない）。安全出力で接触器を駆動したら、接触器のミラー接点（b 接点）を EDM に直列に戻します。OSSD どうしをつながないでください。
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

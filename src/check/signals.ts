/**
 * 信号の種類（NPN/PNP、無電圧接点、アナログなど）と入力回路の相性の検査。
 *
 * 電線・常時導通の経路でつながった範囲（ネット）ごとに、信号の出力（センサーの出力線など）と
 * 入力（PLC の入力点など）の組み合わせを確認する。DC 入力がプラスコモンかマイナスコモンかは、
 * 入力点のコモン端子に来ている電位（接点・出力を閉じた状態）から判定する。
 */
import type { SignalKind } from '../devices/types';
import { key, netIsWired, terminalName, wiresOfNet, type Model, type Push, type TerminalInfo } from './model';

const KIND_NAMES: Record<SignalKind, string> = {
  npn: 'NPN 出力',
  pnp: 'PNP 出力',
  contact: '無電圧接点',
  '2wire': '2線式センサー',
  dc: 'DC 入力',
  dry: '無電圧接点入力',
  'analog-v': 'アナログ電圧',
  'analog-i': 'アナログ電流',
  'line-driver': 'ラインドライバ',
};

const DIGITAL_OUT: SignalKind[] = ['npn', 'pnp', 'contact', '2wire'];

/** DC 入力のコモンの極性（'+' はプラスコモン） */
function commonPolarity(m: Model, info: TerminalInfo): '+' | '-' | undefined {
  const s = info.terminal.signal!;
  if (s.common) {
    const p = m.potentialOf(key(info.device.id, s.common));
    if (p.kind === 'ok' && p.supply.system === 'DC' && (p.supply.conductor === '+' || p.supply.conductor === '-')) return p.supply.conductor;
    return undefined;
  }
  return s.commonPolarity;
}

export function checkSignals(m: Model, push: Push) {
  const inputs = [...m.terminals.values()].filter((i) => i.terminal.signal?.dir === 'in');
  const outputsOfNet = (k: string) =>
    (m.fixedMembers.get(m.fixed.find(k)) ?? [])
      .map((x) => m.terminals.get(x)!)
      .filter((i) => i.terminal.signal?.dir === 'out');
  /** DC 入力のネット → その入力 */
  const dcInputNets = new Map<string, TerminalInfo>();

  for (const inp of inputs) {
    const s = inp.terminal.signal!;
    const outs = outputsOfNet(inp.key);
    const where = terminalName(m, inp.key);
    const wires = wiresOfNet(m, inp.key);
    const issue = (severity: 'error' | 'warning', rule: string, message: string, extra: TerminalInfo[] = []) =>
      push({ severity, rule, message, devices: [inp.device.id, ...extra.map((o) => o.device.id)], wires, key: `${rule}:${inp.key}:${extra.map((o) => o.key).join(',')}` });

    if (s.kind === 'dc') {
      dcInputNets.set(m.fixed.find(inp.key), inp);
      const c = commonPolarity(m, inp);
      for (const o of outs) {
        const k = o.terminal.signal!.kind;
        const out = terminalName(m, o.key);
        if (k === 'npn' && c === '-') {
          issue('error', 'signal-polarity', `${out}（NPN 出力）を、マイナスコモン（COM が 0V）の入力 ${where} につないでいます。NPN はプラスコモン（COM を +24V）で使います`, [o]);
        } else if (k === 'pnp' && c === '+') {
          issue('error', 'signal-polarity', `${out}（PNP 出力）を、プラスコモン（COM が +24V）の入力 ${where} につないでいます。PNP はマイナスコモン（COM を 0V）で使います`, [o]);
        } else if (!DIGITAL_OUT.includes(k)) {
          issue('warning', 'signal-kind', `${out}（${KIND_NAMES[k]}）を DC 入力 ${where} につないでいます`, [o]);
        }
      }
      if (!outs.length && c) {
        const p = m.potentialOf(inp.key);
        if (p.kind === 'ok' && p.supply.system === 'DC' && p.supply.conductor === c) {
          issue('warning', 'input-same-polarity', `入力 ${where} とそのコモンが同じ極（${c === '+' ? '+24V' : '0V'}）につながっているため、入力が ON になりません`);
        }
      }
    } else if (s.kind === 'dry') {
      const p = m.potentialOf(inp.key);
      if (p.kind === 'ok' && p.supply.device !== inp.device.id) {
        issue('error', 'dry-input-voltage', `無電圧接点入力 ${where} に外部の電源（${p.supply.device}）から電圧がかかっています。接点だけをつなぎます`);
      }
      for (const o of outs) {
        const k = o.terminal.signal!.kind;
        if (k === 'pnp') issue('warning', 'signal-kind', `${terminalName(m, o.key)}（PNP 出力）を無電圧接点入力 ${where} につないでいます`, [o]);
        else if (!DIGITAL_OUT.includes(k)) issue('warning', 'signal-kind', `${terminalName(m, o.key)}（${KIND_NAMES[k]}）を無電圧接点入力 ${where} につないでいます`, [o]);
      }
    } else if (s.kind === 'analog-v' || s.kind === 'analog-i') {
      for (const o of outs) {
        const k = o.terminal.signal!.kind;
        if (k === s.kind) continue;
        issue('warning', 'signal-kind', `${terminalName(m, o.key)}（${KIND_NAMES[k]}）を ${KIND_NAMES[s.kind]}入力 ${where} につないでいます`, [o]);
      }
      // 帰り道: 入力の基準（−側）が、つないだアナログ出力の基準とつながっているか
      const analogOuts = outs.filter((o) => o.device.id !== inp.device.id && (o.terminal.signal!.kind === 'analog-v' || o.terminal.signal!.kind === 'analog-i'));
      const inRef = s.ref && m.terminals.has(key(inp.device.id, s.ref)) ? key(inp.device.id, s.ref) : undefined;
      if (analogOuts.length && inRef) {
        if (!netIsWired(m, inRef)) {
          issue('warning', 'analog-return', `アナログ入力 ${where} の基準 ${terminalName(m, inRef)} が未配線です（信号の帰り道がありません。出力の機器の −側・GND へつなぎます）`);
        } else {
          for (const o of analogOuts) {
            const ref = o.terminal.signal!.ref;
            const outRef = ref && m.terminals.has(key(o.device.id, ref)) ? key(o.device.id, ref) : undefined;
            if (!outRef || m.all.find(outRef) === m.all.find(inRef)) continue;
            issue(
              'warning',
              'analog-return',
              `アナログ入力 ${where} の基準 ${terminalName(m, inRef)} が、つないだ出力 ${terminalName(m, o.key)} の基準 ${terminalName(m, outRef)} とつながっていません（信号の帰り道がありません）`,
              [o],
            );
          }
        }
      }
    } else if (s.kind === 'line-driver') {
      for (const o of outs) {
        const k = o.terminal.signal!.kind;
        if (k === 'analog-v' || k === 'analog-i') issue('warning', 'signal-kind', `${terminalName(m, o.key)}（${KIND_NAMES[k]}）をラインドライバ入力 ${where} につないでいます`, [o]);
      }
    }
  }

  // 別の入力点どうしが同じネットにある（片方の信号がもう片方にも入ってしまう）
  const inputsByNet = new Map<string, TerminalInfo[]>();
  for (const inp of inputs) {
    if (inp.terminal.signal!.kind !== 'dc' && inp.terminal.signal!.kind !== 'dry') continue;
    const r = m.fixed.find(inp.key);
    inputsByNet.set(r, [...(inputsByNet.get(r) ?? []), inp]);
  }
  for (const [, list] of inputsByNet) {
    if (list.length < 2) continue;
    push({
      severity: 'warning',
      rule: 'inputs-shorted',
      message: `入力 ${list.map((i) => terminalName(m, i.key)).join(' と ')} が同じ電線でつながっています（別々の信号をつなぎます）`,
      devices: [...new Set(list.map((i) => i.device.id))],
      wires: wiresOfNet(m, list[0].key),
      key: `inputs-shorted:${list.map((i) => i.key).join(',')}`,
    });
  }

  // 2線式センサー: 一方が入力点、もう一方がコモンの反対の極へ
  // 1 台に 2 線式の出力が複数ある機器（オートスイッチ 2 個付きのシリンダなど）は、出力の内部経路（switch: 'output'）で結ばれた 2 本ずつを組にする
  const twoWire = new Map<string, TerminalInfo[]>();
  for (const info of m.terminals.values()) {
    if (info.terminal.signal?.dir === 'out' && info.terminal.signal.kind === '2wire') {
      const pair = m.devices
        .get(info.device.id)
        ?.r.links.find((l) => l.switch === 'output' && (l.from === info.terminal.id || l.to === info.terminal.id));
      const group = pair ? `${info.device.id}:${[pair.from, pair.to].sort().join('|')}` : info.device.id;
      twoWire.set(group, [...(twoWire.get(group) ?? []), info]);
    }
  }
  for (const [group, ends] of twoWire) {
    if (ends.length !== 2) continue;
    const id = ends[0].device.id;
    const onInput = ends.map((e) => dcInputNets.get(m.fixed.find(e.key)));
    const wires = ends.flatMap((e) => wiresOfNet(m, e.key));
    if (onInput[0] && onInput[1]) {
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの両方の線が入力点につながっています`, devices: [id], wires, key: `two-wire:${group}` });
      continue;
    }
    const i = onInput[0] ? 0 : onInput[1] ? 1 : -1;
    if (i < 0) {
      const ps = ends.map((e) => m.potentialOf(e.key));
      if (ps.every((p) => p.kind === 'ok') && ps[0].kind === 'ok' && ps[1].kind === 'ok' && ps[0].supply.conductor !== ps[1].supply.conductor) {
        push({ severity: 'error', rule: 'two-wire', message: `${id}: 2線式センサーを入力回路を通さずに電源へ直結しています（負荷がないため壊れます）`, devices: [id], wires, key: `two-wire:${group}` });
      }
      continue;
    }
    const inp = onInput[i]!;
    const c = commonPolarity(m, inp);
    const other = ends[1 - i];
    const p = m.potentialOf(other.key);
    if (!c) continue;
    const want = c === '+' ? '-' : '+';
    if (p.kind !== 'ok') {
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの ${other.terminal.label ?? other.terminal.id} を電源の ${want === '+' ? '+24V' : '0V'} につないでください（入力 ${terminalName(m, inp.key)} と直列にします）`, devices: [id], wires, key: `two-wire:${group}` });
    } else if (p.supply.conductor !== want) {
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの ${other.terminal.label ?? other.terminal.id} が入力のコモンと同じ極につながっているため、入力が ON になりません`, devices: [id], wires, key: `two-wire:${group}` });
    } else {
      // 入力が 2 線式センサーを受けられるか（漏れ電流・残留電圧と、入力の OFF 電流・最小 ON 電圧）
      const out = ends[0].terminal.signal!;
      const sig = inp.terminal.signal!;
      const where = `入力 ${terminalName(m, inp.key)}`;
      const devices = [id, inp.device.id];
      const twoWireIssue = (message: string, kind: string) =>
        push({ severity: 'warning', rule: 'two-wire-input', message: `${id}: ${message}`, devices, wires, key: `two-wire-input:${kind}:${group}` });
      if (sig.twoWire === false) twoWireIssue(`${where} は 2線式センサーを使えない入力です（メーカーの資料で不可）。3線式のセンサーにするか、別の入力ユニットにします`, 'ng');
      else {
        if (out.leakCurrent !== undefined && sig.offCurrent !== undefined && out.leakCurrent > sig.offCurrent + 1e-9) {
          twoWireIssue(`2線式センサーの漏れ電流 ${out.leakCurrent}mA が${where} の OFF 電流 ${sig.offCurrent}mA を超えています（センサーが OFF でも入力が OFF にならないことがあります。ブリーダー抵抗を入れます）`, 'leak');
        }
        const on = p.supply.voltage - (out.residualVoltage ?? 0);
        if (out.residualVoltage !== undefined && sig.onVoltage !== undefined && on < sig.onVoltage - 1e-9) {
          twoWireIssue(`電源 ${p.supply.voltage}V から 2線式センサーの残留電圧 ${out.residualVoltage}V を引いた ${Math.round(on * 100) / 100}V が${where} の最小 ON 電圧 ${sig.onVoltage}V を下回ります（入力が ON にならないことがあります）`, 'on');
        }
      }
    }
  }
}

/**
 * 信号の種類（NPN/PNP、無電圧接点、アナログなど）と入力回路の相性の検査。
 *
 * 電線・常時導通の経路でつながった範囲（ネット）ごとに、信号の出力（センサーの出力線など）と
 * 入力（PLC の入力点など）の組み合わせを確認する。DC 入力がプラスコモンかマイナスコモンかは、
 * 入力点のコモン端子に来ている電位（接点・出力を閉じた状態）から判定する。
 */
import type { SignalKind } from '../devices/types';
import { key, terminalName, wiresOfNet, type Model, type Push, type TerminalInfo } from './model';

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
    } else if (s.kind === 'line-driver') {
      for (const o of outs) {
        const k = o.terminal.signal!.kind;
        if (k === 'analog-v' || k === 'analog-i') issue('warning', 'signal-kind', `${terminalName(m, o.key)}（${KIND_NAMES[k]}）をラインドライバ入力 ${where} につないでいます`, [o]);
      }
    }
  }

  // 2線式センサー: 一方が入力点、もう一方がコモンの反対の極へ
  const twoWire = new Map<string, TerminalInfo[]>();
  for (const info of m.terminals.values()) {
    if (info.terminal.signal?.dir === 'out' && info.terminal.signal.kind === '2wire') {
      twoWire.set(info.device.id, [...(twoWire.get(info.device.id) ?? []), info]);
    }
  }
  for (const [id, ends] of twoWire) {
    if (ends.length !== 2) continue;
    const onInput = ends.map((e) => dcInputNets.get(m.fixed.find(e.key)));
    const wires = ends.flatMap((e) => wiresOfNet(m, e.key));
    if (onInput[0] && onInput[1]) {
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの両方の線が入力点につながっています`, devices: [id], wires, key: `two-wire:${id}` });
      continue;
    }
    const i = onInput[0] ? 0 : onInput[1] ? 1 : -1;
    if (i < 0) {
      const ps = ends.map((e) => m.potentialOf(e.key));
      if (ps.every((p) => p.kind === 'ok') && ps[0].kind === 'ok' && ps[1].kind === 'ok' && ps[0].supply.conductor !== ps[1].supply.conductor) {
        push({ severity: 'error', rule: 'two-wire', message: `${id}: 2線式センサーを入力回路を通さずに電源へ直結しています（負荷がないため壊れます）`, devices: [id], wires, key: `two-wire:${id}` });
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
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの ${other.terminal.label ?? other.terminal.id} を電源の ${want === '+' ? '+24V' : '0V'} につないでください（入力 ${terminalName(m, inp.key)} と直列にします）`, devices: [id], wires, key: `two-wire:${id}` });
    } else if (p.supply.conductor !== want) {
      push({ severity: 'warning', rule: 'two-wire', message: `${id}: 2線式センサーの ${other.terminal.label ?? other.terminal.id} が入力のコモンと同じ極につながっているため、入力が ON になりません`, devices: [id], wires, key: `two-wire:${id}` });
    }
  }
}

/**
 * 安全回路のルールチェック（安全コントローラー・セーフティリレー・ライトカーテンなど）。
 *
 * 安全入力のループや EDM（外部機器監視）のループは、端子から電線・常時導通の経路でつながった範囲（ネット）を、
 * 他の機器の接点（switch のある経路）を通ってたどって求める。電源出力（テスト出力・OSSD・電源）のあるネットに
 * 着いたらそこで止める。たどった接点がループに直列に入っている接点になる。
 */
import { functionsOf } from '../devices/resolve';
import type { SafetyChannelGroup, SafetyInputMode, SafetyRating, TerminalFunction } from '../devices/types';
import { key, netIsWired, terminalName, wiresOfNet, type DeviceInfo, type Model, type Push, type Supply, type SwitchLink } from './model';

interface Chain {
  /** たどったネット（電源出力で止めたネットを除く） */
  expanded: Set<string>;
  /** たどった接点 */
  links: SwitchLink[];
  /** 着いた電源出力 */
  supplies: Supply[];
}

const PL_ORDER = ['a', 'b', 'c', 'd', 'e'] as const;

export function checkSafety(m: Model, push: Push) {
  const linksAt = new Map<string, SwitchLink[]>();
  for (const s of m.switchLinks) {
    for (const k of [s.a, s.b]) {
      const r = m.fixed.find(k);
      linksAt.set(r, [...(linksAt.get(r) ?? []), s]);
    }
  }
  const suppliesIn = (root: string) => (m.fixedMembers.get(root) ?? []).flatMap((k) => m.supplies.get(k) ?? []);

  /** starts の端子から、owner 以外の機器の接点を通ってたどる */
  const chain = (starts: string[], owner: string): Chain => {
    const startRoots = new Set(starts.map((k) => m.fixed.find(k)));
    const visited = new Set(startRoots);
    const queue = [...startRoots];
    const expanded = new Set<string>();
    const links: SwitchLink[] = [];
    const supplies: Supply[] = [];
    while (queue.length) {
      const r = queue.shift()!;
      const here = suppliesIn(r);
      supplies.push(...here);
      if (here.length && !startRoots.has(r)) continue;
      expanded.add(r);
      for (const s of linksAt.get(r) ?? []) {
        if (s.device === owner || links.includes(s)) continue;
        links.push(s);
        const other = m.fixed.find(s.a) === r ? m.fixed.find(s.b) : m.fixed.find(s.a);
        if (!visited.has(other)) {
          visited.add(other);
          queue.push(other);
        }
      }
    }
    return { expanded, links, supplies };
  };

  /** たどったネットにある、接触器・リレーのコイル（接点を持つ機器の受電端子） */
  const coilsOf = (c: Chain, owner: string): Map<string, string[]> => {
    const coils = new Map<string, string[]>();
    for (const r of c.expanded) {
      for (const k of m.fixedMembers.get(r) ?? []) {
        const info = m.terminals.get(k)!;
        const id = info.device.id;
        if (id === owner || info.terminal.role !== 'input') continue;
        if (!m.switchLinks.some((s) => s.device === id && (s.link.switch === 'NO' || s.link.switch === 'NC'))) continue;
        coils.set(id, [...(coils.get(id) ?? []), k]);
      }
    }
    return coils;
  };

  /** 安全出力の端子から、駆動しているコイルをたどる（接点出力は電源の来ていない側から） */
  const drivenBy = (owner: DeviceInfo, terminal: string): Chain => {
    const k = key(owner.device.id, terminal);
    if (m.supplies.has(k)) return chain([k], owner.device.id);
    const partners = m.switchLinks.filter((s) => s.device === owner.device.id && (s.a === k || s.b === k)).map((s) => (s.a === k ? s.b : s.a));
    const starts = [k, ...partners].filter((x) => !suppliesIn(m.fixed.find(x)).length && netIsWired(m, x));
    return chain(starts.length ? starts : [k], owner.device.id);
  };

  for (const owner of m.devices.values()) {
    const { device, def, r } = owner;
    const id = device.id;
    const groups = r.safetyChannels;
    const tKey = (t: string) => key(id, t);
    const byFunction = (f: TerminalFunction) => [...r.terminals, ...r.pins].filter((t) => functionsOf(t).includes(f)).map((t) => t.id);
    const label = (g: SafetyChannelGroup) => g.label ?? g.id;

    // --- 安全入力 ---
    let fedByEspe = false;
    for (const g of groups.filter((x) => x.kind === 'input')) {
      const chs = g.channels.filter((c) => c.input);
      const used = chs.filter((c) => netIsWired(m, tKey(c.input!)));
      if (!used.length) continue;
      // 使い方を設定で決める入力（安全コントローラーの汎用入力など）は、注意にとどめる
      const severe = g.configurable ? 'info' : 'error';
      const settingNote = g.configurable ? '。設定で別の使い方にしている場合は問題ありません' : '';
      if (used.length < chs.length) {
        const missing = chs.filter((c) => !used.includes(c)).map((c) => terminalName(m, tKey(c.input!)));
        push({
          severity: severe,
          rule: 'safety-channel-partial',
          message: `${id}: 安全入力 ${label(g)} の ${missing.join('・')} が未配線です（2 チャンネルの片側だけが配線されています${settingNote}）`,
          devices: [id],
          wires: used.flatMap((c) => wiresOfNet(m, tKey(c.input!))),
          key: `safety-channel-partial:${id}:${g.id}`,
        });
      }
      const modes: SafetyInputMode[] = g.mode === undefined ? ['nc-nc'] : [g.mode].flat();
      const chains = used.map((c) => ({ c, idx: g.channels.indexOf(c), chain: chain([tKey(c.input!)], id) }));
      for (const { c, idx, chain: ch } of chains) {
        const input = tKey(c.input!);
        const where = terminalName(m, input);
        const wires = wiresOfNet(m, input);
        const ossd = ch.supplies.filter((s) => s.kind === 'ossd');
        // ライトカーテンなど人を検出する保護装置からの入力か（自動リセットの注意に使う）
        if (ossd.some((s) => !!m.devices.get(s.device)?.def.safety?.esType) || (modes.includes('ossd') && ossd.length)) fedByEspe = true;
        // OSSD をつないだ入力で、OSSD 入力として使える組なら、接点・テスト出力の確認は不要
        if (ossd.length && modes.includes('ossd')) continue;
        // テスト出力から戻っているか
        if (c.source) {
          const src = tKey(c.source);
          const others = g.channels.filter((x) => x !== c && x.source).map((x) => tKey(x.source!));
          if (ch.supplies.some((s) => s.terminal === src)) {
            // OK
          } else if (ch.supplies.some((s) => others.includes(s.terminal))) {
            push({ severity: severe, rule: 'safety-channel-cross', message: `${id}: 安全入力 ${where} に別のチャンネルのテスト出力が戻っています（${terminalName(m, src)} から戻します${settingNote}）`, devices: [id], wires, key: `safety-channel-cross:${input}` });
          } else if (ossd.length) {
            push({
              severity: 'warning',
              rule: 'ossd-to-test-input',
              message: `${id}: テスト出力を使う安全入力 ${where} に OSSD（${[...new Set(ossd.map((s) => s.device))].join(', ')}）をつないでいます。入力側を OSSD 入力の設定にしてください`,
              devices: [id, ...ossd.map((s) => s.device)],
              wires,
              key: `ossd-to-test-input:${input}`,
            });
          } else if (g.configurable && ch.supplies.some((s) => s.kind === 'test')) {
            // 設定で別のテスト出力を割り当てている（設定で決まるため指摘しない）
          } else if (ch.supplies.some((s) => s.kind === 'power')) {
            push({ severity: g.configurable ? 'info' : 'warning', rule: 'safety-test-bypass', message: `${id}: 安全入力 ${where} にテスト出力 ${terminalName(m, src)} ではなく電源から入力しています（配線の短絡を検出できません）`, devices: [id], wires, key: `safety-test-bypass:${input}` });
          } else {
            push({ severity: 'warning', rule: 'safety-channel-open', message: `${id}: 安全入力 ${where} がテスト出力 ${terminalName(m, src)} まで戻っていません`, devices: [id], wires, key: `safety-channel-open:${input}` });
          }
        }
        // ループに入っている接点の種類
        const expectNC = modes.includes('nc-nc') || (modes.includes('nc-no') && idx === 0);
        if (!expectNC) continue;
        for (const s of ch.links) {
          const other = m.devices.get(s.device)!;
          const contact = `${s.device} の ${s.link.from}-${s.link.to}`;
          // イネーブルスイッチの a 接点（強制開離）は安全入力に使える
          if (s.link.switch === 'NO' && !s.link.directOpening) {
            push({
              severity: severe,
              rule: 'estop-not-nc',
              message: `${id}: 安全入力 ${where} のループに a 接点（${contact}）が入っています。非常停止・ドアスイッチなどは b 接点を使います`,
              devices: [id, s.device],
              wires,
              key: `estop-not-nc:${input}:${s.a}:${s.b}`,
            });
          } else if (s.link.switch === 'NC' && !s.link.directOpening && (other.def.category === 'control' || other.def.category === 'sensor')) {
            push({
              severity: 'warning',
              rule: 'not-direct-opening',
              message: `${id}: 安全入力 ${where} のループの接点（${contact}）は直接開路動作（⊕）ではありません`,
              devices: [id, s.device],
              wires,
              key: `not-direct-opening:${input}:${s.a}:${s.b}`,
            });
          }
        }
      }
      // 2 チャンネルが同じ接点を共用している
      for (let i = 0; i < chains.length; i++) {
        for (let j = i + 1; j < chains.length; j++) {
          const shared = chains[i].chain.links.filter((s) => chains[j].chain.links.includes(s));
          const sameNet = m.fixed.find(tKey(chains[i].c.input!)) === m.fixed.find(tKey(chains[j].c.input!));
          if (!shared.length && !sameNet) continue;
          push({
            severity: severe,
            rule: 'safety-channel-cross',
            message: sameNet
              ? `${id}: 安全入力 ${chains[i].c.input} と ${chains[j].c.input} がつながっています（2 チャンネルが独立していません）`
              : `${id}: 安全入力 ${chains[i].c.input} と ${chains[j].c.input} が同じ接点（${shared[0].device} の ${shared[0].link.from}-${shared[0].link.to}）を共用しています`,
            devices: [id, ...shared.map((s) => s.device)],
            wires: [],
            key: `safety-channel-shared:${id}:${chains[i].c.input}:${chains[j].c.input}`,
          });
        }
      }
    }

    // --- 安全出力と駆動している接触器 ---
    const outputTerminals = [
      ...groups.filter((g) => g.kind === 'output').flatMap((g) => g.channels.map((c) => c.output!)),
      ...byFunction('ossd'),
      ...byFunction('safety-contact'),
    ];
    const uniqueOutputs = [...new Set(outputTerminals)];
    const driven = new Map<string, Chain>();
    for (const t of uniqueOutputs) driven.set(t, drivenBy(owner, t));
    const coilDevices = new Map<string, string[]>();
    for (const [t, ch] of driven) for (const [d, ks] of coilsOf(ch, id)) coilDevices.set(d, [...(coilDevices.get(d) ?? []), ...ks, `@${t}`]);

    for (const g of groups.filter((x) => x.kind === 'output')) {
      const outs = g.channels.map((c) => c.output!);
      if (outs.length < 2) continue;
      const wired = outs.filter((t) => coilsOf(driven.get(t)!, id).size > 0 || netIsWired(m, tKey(t)));
      if (wired.length && wired.length < outs.length) {
        push({
          severity: 'warning',
          rule: 'safety-output-partial',
          message: `${id}: 安全出力 ${label(g)} の ${outs.filter((t) => !wired.includes(t)).join('・')} を使っていません（2 チャンネルの片側だけで負荷を駆動しています）`,
          devices: [id],
          wires: [],
          key: `safety-output-partial:${id}:${g.id}`,
        });
      }
    }

    if (coilDevices.size) {
      const edm = byFunction('edm');
      // 冗長化されていない出力（カテゴリ 3/4 の機器で接触器 1 台）
      if ((def.safety?.category === '3' || def.safety?.category === '4') && coilDevices.size === 1) {
        push({
          severity: 'info',
          rule: 'single-channel-output',
          message: `${id}: カテゴリ ${def.safety.category} の安全出力で接触器 ${[...coilDevices.keys()][0]} の 1 台だけを駆動しています（2 台で冗長化するのが一般的です）`,
          devices: [id, ...coilDevices.keys()],
          wires: [],
          key: `single-channel-output:${id}`,
        });
      }
      if (edm.length) {
        if (!edm.some((t) => netIsWired(m, tKey(t)))) {
          push({
            severity: 'warning',
            rule: 'edm-missing',
            message: `${id}: 安全出力で ${[...coilDevices.keys()].join(', ')} を駆動していますが、EDM（外部機器監視）の ${edm.join('・')} が未配線です`,
            devices: [id, ...coilDevices.keys()],
            wires: [],
            key: `edm-missing:${id}`,
          });
        } else {
          const loop = chain(edm.map(tKey), id);
          for (const d of coilDevices.keys()) {
            const contacts = loop.links.filter((s) => s.device === d);
            let problem: string | undefined;
            if (!contacts.length) problem = `${d} の接点が EDM ループに入っていません`;
            else if (contacts.some((s) => s.link.switch === 'NO')) problem = `EDM ループに ${d} の a 接点が入っています（b 接点を使います）`;
            else if (!contacts.some((s) => s.link.switch === 'NC' && s.link.linked)) problem = `EDM ループの ${d} の b 接点はミラー接点・強制ガイド接点ではありません`;
            if (problem) {
              push({ severity: 'warning', rule: 'edm-not-linked', message: `${id}: ${problem}`, devices: [id, d], wires: [], key: `edm-not-linked:${id}:${d}` });
            }
          }
        }
      }
      // OSSD と負荷の 0V が同じ電源か
      const ossdTerms = uniqueOutputs.filter((t) => m.supplies.get(tKey(t))?.kind === 'ossd');
      if (ossdTerms.length) {
        const own0v = r.terminals
          .filter((t) => t.role === 'input' && (r.accepts.get(t.id) ?? []).some((a) => a.conductors?.length === 1 && a.conductors[0] === '-'))
          .map((t) => m.potentialOf(tKey(t.id)))
          .flatMap((p) => (p.kind === 'ok' ? [p.supply.device] : []));
        for (const t of ossdTerms) {
          for (const [d, ks] of coilsOf(driven.get(t)!, id)) {
            const coil = m.devices.get(d)!;
            const others = coil.r.terminals
              .map((x) => key(d, x.id))
              .filter((k) => !ks.includes(k) && m.terminals.get(k)?.terminal.role === 'input')
              .map((k) => m.potentialOf(k))
              .flatMap((p) => (p.kind === 'ok' && p.supply.conductor === '-' ? [p.supply.device] : []));
            if (own0v.length && others.length && !others.some((s) => own0v.includes(s))) {
              push({
                severity: 'warning',
                rule: 'common-0v',
                message: `${id}: OSSD ${t} で駆動している ${d} の 0V（${others[0]}）が、${id} の 0V（${own0v[0]}）と別の電源です。0V を共通にしてください`,
                devices: [id, d],
                wires: [],
                key: `common-0v:${id}:${d}`,
              });
            }
          }
        }
      }
    }

    // --- リセット（人が通過できる保護に自動リセット） ---
    const reset = byFunction('reset');
    const autoReset = byFunction('reset-auto').filter((t) => netIsWired(m, tKey(t)));
    if ((reset.length || autoReset.length) && fedByEspe) {
      const manual = reset.length > 0 && chain(reset.map(tKey), id).links.some((s) => s.link.switch === 'NO');
      if (autoReset.length || !manual) {
        push({
          severity: 'info',
          rule: 'reset-auto',
          message: autoReset.length
            ? `${id}: ライトカーテンなどの保護装置を使っていますが、自動リセットの端子 ${autoReset.join('・')} を配線しています。人が保護範囲に入れる場合は手動リセットにします`
            : `${id}: ライトカーテンなどの保護装置を使っていますが、リセット入力 ${reset.join('・')} に押しボタンがなく自動リセットになっています。人が保護範囲に入れる場合は手動リセットにします`,
          devices: [id],
          wires: [],
          key: `reset-auto:${id}`,
        });
      }
    }

    // --- 電磁ロック（スプリングロック）のソレノイドを常時通電 ---
    for (const t of byFunction('unlock-solenoid')) {
      const direct = suppliesIn(m.fixed.find(tKey(t))).filter((s) => s.kind === 'power' && s.conductor === '+');
      if (direct.length) {
        push({
          severity: 'warning',
          rule: 'lock-power-source',
          message: `${id}: 解錠ソレノイド ${t} が電源（${direct[0].device}）に直結されているため、常に解錠されます。安全出力やスイッチを通して給電します`,
          devices: [id, direct[0].device],
          wires: wiresOfNet(m, tKey(t)),
          key: `lock-power-source:${id}:${t}`,
        });
      }
    }
  }

  // --- 安全性能が要求 PL に届かない機器 ---
  const required = m.diagram.settings?.requiredPL;
  if (required) {
    for (const { device, def } of m.devices.values()) {
      const pl = def.safety?.pl;
      if (!pl || PL_ORDER.indexOf(pl) >= PL_ORDER.indexOf(required)) continue;
      push({
        severity: 'warning',
        rule: 'safety-rating',
        message: `${device.id}: 安全性能 ${ratingText(def.safety!)} が図面の要求 PL ${required} を下回っています`,
        devices: [device.id],
        wires: [],
        key: `safety-rating:${device.id}`,
      });
    }
  }
}

function ratingText(s: SafetyRating): string {
  return [s.pl && `PL ${s.pl}`, s.category && `カテゴリ ${s.category}`].filter(Boolean).join(' / ');
}

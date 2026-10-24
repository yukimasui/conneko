/**
 * 接点・出力の開閉で起きる短絡の検査。
 *
 * 次の状態ごとに同電位グループを作り直し、電源出力どうしの矛盾（短絡・混触・地絡など）を探す。
 * - 通常時: すべての b 接点が閉、a 接点と出力が開
 * - 機器ごとの動作時: その機器の a 接点・出力が閉、b 接点が開（ほかの機器は通常時のまま）
 *   セレクタスイッチの位置で閉じる a 接点（positions）は、位置ごとに閉じる（別の位置の接点が同時に閉じたとはみなさない）
 *   ただし、機器の外のもので開く b 接点（safetyContact。ティーチングボックスの非常停止接点など）は閉じたまま
 *
 * 1 台ずつ動作させるので、正逆転のように 2 台が同時に動作しないことを前提にした回路は誤検出しない。
 * 常時の状態ですでに見つかった矛盾は重ねて報告しない。
 */
import { classifySupplies, terminalName, UnionFind, type Model, type Push, type SwitchLink } from './model';

export function checkSwitchStates(m: Model, push: Push, conflictRoots: Set<string>) {
  if (!m.switchLinks.length || m.supplies.size < 2) return;
  const supplyKeys = [...m.supplies.keys()];
  // 常時の状態で矛盾しているグループに属する電源出力は対象外
  const skip = new Set(supplyKeys.filter((k) => conflictRoots.has(m.fixed.find(k))));
  const reported = new Set<string>();
  const name = (k: string) => terminalName(m, k);

  /** closed の経路を閉じた状態で、only の経路を含むグループ（null なら全部）の矛盾を報告する */
  const evaluate = (closed: SwitchLink[], only: SwitchLink[] | null, describe: string, devices: string[]) => {
    // 常時導通の範囲（fixed）の代表どうしをつなげば十分
    const uf = new UnionFind();
    for (const s of closed) uf.union(m.fixed.find(s.a), m.fixed.find(s.b));
    const target = only && new Set(only.map((s) => uf.find(m.fixed.find(s.a))));
    const groups = new Map<string, string[]>();
    for (const k of supplyKeys) {
      const g = uf.find(m.fixed.find(k));
      groups.set(g, [...(groups.get(g) ?? []), k]);
    }
    for (const [g, keys] of groups) {
      if (keys.length < 2 || keys.some((k) => skip.has(k)) || (target && !target.has(g))) continue;
      // 常時の状態で同じグループなら（矛盾なしと判定済み）対象外
      if (new Set(keys.map((k) => m.fixed.find(k))).size < 2) continue;
      const c = classifySupplies(
        keys.map((k) => m.supplies.get(k)!),
        name,
      );
      if (c.kind !== 'conflict') continue;
      const signature = [...keys].sort().join('|');
      if (reported.has(signature)) continue;
      reported.add(signature);
      push({
        severity: 'error',
        rule: c.rule,
        message: `${describe}${c.message}`,
        devices: [...new Set([...devices, ...c.devices])],
        wires: [],
        key: `state:${c.rule}:${signature}`,
      });
    }
  };

  const nc = m.switchLinks.filter((s) => s.link.switch === 'NC');
  evaluate(nc, null, '通常時（b 接点が閉じた状態）に', []);

  // 動作の単位: 機器ごと。機器の中に別々に動く負荷（リレーターミナルのリレーなど。link.actor）があれば、その負荷ごと。
  // セレクタスイッチの位置で閉じる接点（link.positions）は、位置ごと
  const byActor = new Map<string, SwitchLink[]>();
  const addTo = (k: string, s: SwitchLink) => byActor.set(k, [...(byActor.get(k) ?? []), s]);
  for (const s of m.switchLinks) {
    if (s.link.positions) for (const p of s.link.positions) addTo(`${s.device}\u0000${s.link.actor ?? ''}\u0000${p}`, s);
    else addTo(`${s.device}\u0000${s.link.actor ?? ''}\u0000`, s);
  }
  for (const [k, links] of byActor) {
    const [device, actor, position] = k.split('\u0000');
    const active = links.filter((s) => s.link.switch !== 'NC');
    if (!active.length) continue;
    // 動作したときに開く b 接点は、同じ単位のものだけ（ほかの単位の b 接点は閉じたまま）
    const inUnit = (s: SwitchLink) =>
      s.device === device && (s.link.actor ?? '') === actor && !s.link.safetyContact && (position ? !!s.link.positions?.includes(position) : !s.link.positions);
    const what = active.every((s) => s.link.switch === 'output') ? '出力が ON になる' : '動作する';
    const who = actor ? `${device} の ${actorLabel(m, device, actor)}` : device;
    const describe = position ? `${device} を位置 ${position} にすると` : `${who} が${what}と`;
    evaluate([...nc.filter((s) => !inUnit(s)), ...active], active, describe, [device]);
  }
}

/** 機器の中の負荷の表示名（internalLoads の label。なければ id） */
function actorLabel(m: Model, device: string, actor: string): string {
  const d = m.devices.get(device);
  if (!d) return actor;
  const loads = typeof d.def.internalLoads === 'function' ? d.def.internalLoads(d.r.params) : (d.def.internalLoads ?? []);
  return loads.find((l) => l.id === actor)?.label ?? actor;
}

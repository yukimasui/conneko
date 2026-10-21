/**
 * 接点・出力の開閉で起きる短絡の検査。
 *
 * 次の状態ごとに同電位グループを作り直し、電源出力どうしの矛盾（短絡・混触・地絡など）を探す。
 * - 通常時: すべての b 接点が閉、a 接点と出力が開
 * - 機器ごとの動作時: その機器の a 接点・出力が閉、b 接点が開（ほかの機器は通常時のまま）
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

  const byDevice = new Map<string, SwitchLink[]>();
  for (const s of m.switchLinks) byDevice.set(s.device, [...(byDevice.get(s.device) ?? []), s]);
  for (const [device, links] of byDevice) {
    const active = links.filter((s) => s.link.switch !== 'NC');
    if (!active.length) continue;
    const what = active.every((s) => s.link.switch === 'output') ? '出力が ON になる' : '動作する';
    evaluate([...nc.filter((s) => s.device !== device), ...active], active, `${device} が${what}と`, [device]);
  }
}

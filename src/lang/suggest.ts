/** 書き間違いの候補を出す（編集距離の近いものを近い順に） */

function distance(a: string, b: string): number {
  const s = [...a];
  const t = [...b];
  let prev = t.map((_, j) => j + 1);
  prev.unshift(0);
  for (let i = 1; i <= s.length; i++) {
    const cur = [i];
    for (let j = 1; j <= t.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (s[i - 1] === t[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[t.length];
}

/**
 * word に近い候補（大文字と小文字の違いは同じ文字とみなす）。
 * 長さの 4 割までの違い、または片方がもう片方を含むものを、近い順に max 個まで返す
 */
export function suggest(word: string, candidates: Iterable<string>, max = 3): string[] {
  const w = word.toLowerCase();
  if (!w) return [];
  const scored: { c: string; score: number }[] = [];
  for (const c of new Set(candidates)) {
    const lc = c.toLowerCase();
    if (lc === w) {
      scored.push({ c, score: 0 });
      continue;
    }
    const d = distance(w, lc);
    const limit = Math.max(1, Math.floor(Math.max(w.length, lc.length) * 0.4));
    if (d <= limit) scored.push({ c, score: d });
    else if (w.length >= 3 && (lc.includes(w) || w.includes(lc)) && lc.length >= 2) scored.push({ c, score: limit + 1 + Math.abs(lc.length - w.length) / 100 });
  }
  return scored
    .sort((a, b) => a.score - b.score || a.c.length - b.c.length || (a.c < b.c ? -1 : 1))
    .slice(0, max)
    .map((x) => x.c);
}

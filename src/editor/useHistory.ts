import { useCallback, useEffect, useRef, useState } from 'react';

/** 記録する回数の上限 */
const LIMIT = 200;
/** 変更が止まってから記録するまでの時間[ms]（ドラッグ中の細かい変化を 1 回にまとめる） */
const SETTLE = 350;

/**
 * 元に戻す・やり直す（Undo / Redo）。
 * snapshot（図面全体を文字列にしたもの）が変わり、しばらく変化が止まったら 1 回分として記録する。
 * 戻すときは apply に記録した snapshot を渡す。
 */
export function useHistory(snapshot: string, apply: (snapshot: string) => void) {
  const state = useRef({ past: [] as string[], present: snapshot, future: [] as string[] });
  const latest = useRef(snapshot);
  latest.current = snapshot;
  const [, setVersion] = useState(0);
  const changed = () => setVersion((v) => v + 1);

  /** 今の図面を記録する（前回の記録と違えば、それを「戻る」側へ積む） */
  const commit = useCallback(() => {
    const s = state.current;
    if (latest.current === s.present) return;
    s.past.push(s.present);
    if (s.past.length > LIMIT) s.past.shift();
    s.present = latest.current;
    s.future = [];
    changed();
  }, []);

  useEffect(() => {
    const t = window.setTimeout(commit, SETTLE);
    return () => window.clearTimeout(t);
  }, [snapshot, commit]);

  const undo = useCallback(() => {
    commit();
    const s = state.current;
    const prev = s.past.pop();
    if (prev === undefined) return false;
    s.future.push(s.present);
    s.present = prev;
    apply(prev);
    changed();
    return true;
  }, [commit, apply]);

  const redo = useCallback(() => {
    commit();
    const s = state.current;
    const next = s.future.pop();
    if (next === undefined) return false;
    s.past.push(s.present);
    s.present = next;
    apply(next);
    changed();
    return true;
  }, [commit, apply]);

  return { undo, redo, canUndo: state.current.past.length > 0 || latest.current !== state.current.present, canRedo: state.current.future.length > 0 };
}

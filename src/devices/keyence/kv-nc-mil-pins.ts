/**
 * KV-NC 系 MIL コネクタユニットのピン割り当て（KEYENCE 入出力回路図より。ピン番号は MIL 標準の千鳥番号）。
 *   16点（MIL 20極）: 1・2 = N.C.、3,5,…,17 = 000〜007、4,6,…,18 = 008〜015、19 = COM0、20 = COM1
 *   32点（MIL 34極）: 1,3,…,31 = 000〜015、2,4,…,32 = 100〜115、33 = COM0、34 = COM1
 * COM0 と COM1 は内部で短絡。
 */
import { signalName, type IoKind, type IoPoint } from './kv-parts';

export function ncMilPins(points: 16 | 32, kind: 'in' | 'out', com: IoKind, comSuffix = ''): IoPoint[] {
  const pts: IoPoint[] = [];
  if (points === 16) {
    pts.push({ id: 'CN1#1', label: 'N.C.', kind: 'nc' }, { id: 'CN1#2', label: 'N.C.', kind: 'nc' });
    for (let i = 0; i < 8; i++) {
      pts.push({ id: `CN1#${3 + 2 * i}`, label: signalName(kind, 0, i), kind });
      pts.push({ id: `CN1#${4 + 2 * i}`, label: signalName(kind, 0, i + 8), kind });
    }
    pts.push({ id: 'CN1#19', label: `COM0${comSuffix}`, kind: com }, { id: 'CN1#20', label: `COM1${comSuffix}`, kind: com });
  } else {
    for (let i = 0; i < 16; i++) {
      pts.push({ id: `CN1#${1 + 2 * i}`, label: signalName(kind, 0, i), kind });
      pts.push({ id: `CN1#${2 + 2 * i}`, label: signalName(kind, 1, i), kind });
    }
    pts.push({ id: 'CN1#33', label: `COM0${comSuffix}`, kind: com }, { id: 'CN1#34', label: `COM1${comSuffix}`, kind: com });
  }
  return pts;
}

/** COM の短絡と、出力ユニットなら出力 ON（出力ピンと COM の導通）の links */
export function ncMilLinks(points: 16 | 32, pts: IoPoint[]) {
  const [c0, c1] = points === 16 ? ['CN1#19', 'CN1#20'] : ['CN1#33', 'CN1#34'];
  return [{ from: c0, to: c1 }, ...pts.filter((p) => p.kind === 'out').map((p) => ({ from: p.id, to: c0 }))];
}

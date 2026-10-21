/**
 * KV-NC 系 MIL コネクタユニットのピン割り当て（KEYENCE 入出力回路図より。ピン番号は MIL 標準の千鳥番号）。
 *   16点（MIL 20極）: 1・2 = N.C.、3,5,…,17 = 先頭から 0〜7 点目、4,6,…,18 = 8〜15 点目、19 = COM0、20 = COM1
 *   32点（MIL 34極）: 1,3,…,31 = 先頭チャネル（0〜15 点目）、2,4,…,32 = 次のチャネル（16〜31 点目）、33 = COM0、34 = COM1
 * COM0 と COM1 は内部で短絡。入出力点の common は、16点は COM0、32点は奇数ピンが COM0・偶数ピンが COM1
 * （コモン端子 1 本あたりの電流制限を確認するため。KV-NC32ET は 1.6A/端子）。
 */
import { ioOutputLinks, type IoKind, type IoPoint } from './kv-parts';

export function ncMilPins(points: 16 | 32, kind: 'in' | 'out', com: IoKind, comSuffix = ''): IoPoint[] {
  const pts: IoPoint[] = [];
  const what = kind === 'in' ? '入力' : '出力';
  if (points === 16) {
    pts.push({ id: 'CN1#1', label: 'N.C.', kind: 'nc' }, { id: 'CN1#2', label: 'N.C.', kind: 'nc' });
    for (let i = 0; i < 8; i++) {
      pts.push({ id: `CN1#${3 + 2 * i}`, kind, index: i, common: 'CN1#19' });
      pts.push({ id: `CN1#${4 + 2 * i}`, kind, index: i + 8, common: 'CN1#19' });
    }
    pts.push(
      { id: 'CN1#19', label: `COM0${comSuffix}`, kind: com, note: `${what}のコモン（COM1 と内部で短絡）` },
      { id: 'CN1#20', label: `COM1${comSuffix}`, kind: com, note: `${what}のコモン（COM0 と内部で短絡）` },
    );
  } else {
    for (let i = 0; i < 16; i++) {
      pts.push({ id: `CN1#${1 + 2 * i}`, kind, index: i, common: 'CN1#33' });
      pts.push({ id: `CN1#${2 + 2 * i}`, kind, index: 16 + i, common: 'CN1#34' });
    }
    pts.push(
      { id: 'CN1#33', label: `COM0${comSuffix}`, kind: com, note: `${what}のコモン（COM1 と内部で短絡）` },
      { id: 'CN1#34', label: `COM1${comSuffix}`, kind: com, note: `${what}のコモン（COM0 と内部で短絡）` },
    );
  }
  return pts;
}

/** COM の短絡と、出力ユニットなら出力 ON の経路（出力点 → COM、rated は 1 点の定格電流[A]） */
export function ncMilLinks(points: 16 | 32, pts: IoPoint[], rated = 0.2) {
  const [c0, c1] = points === 16 ? ['CN1#19', 'CN1#20'] : ['CN1#33', 'CN1#34'];
  return [{ from: c0, to: c1 }, ...ioOutputLinks(pts, rated)];
}

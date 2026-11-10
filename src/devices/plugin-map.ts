/**
 * プラグイン形（一括配線）のマニホールドの、コネクタのピンとソレノイドの割付けの表記。
 * src/model/bus.ts が割付けを親の params の plugInMap に書き、マニホールドの機器定義（ピンの名前・コイル）が読む。
 */

/** プラグイン形のマニホールドの、ピンの割付けを親の params に書く表記（'1=1A,14=1B,2=2A'。ピン番号 = 連の番号と側） */
export function plugInMapParam(points: { pin: number; station: number; side?: 'A' | 'B' }[]): string {
  return points
    .filter((p) => p.pin > 0 && p.side)
    .map((p) => `${p.pin}=${p.station}${p.side}`)
    .join(',');
}

/** 親の params の plugInMap を読む（ピン番号 → 連の番号と側） */
export function parsePlugInMap(v: unknown): Map<number, { station: number; side: 'A' | 'B' }> {
  const out = new Map<number, { station: number; side: 'A' | 'B' }>();
  for (const s of String(v ?? '').split(',')) {
    const m = /^(\d+)=(\d+)([AB])$/.exec(s.trim());
    if (m) out.set(Number(m[1]), { station: Number(m[2]), side: m[3] as 'A' | 'B' });
  }
  return out;
}

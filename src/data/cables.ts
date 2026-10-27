/**
 * 変換ケーブルの種類と、両端のピンの対応。
 *
 * ケーブル（電線の種類 CABLE）は、ふつうは両端の同じ番号のピンどうしが導通する。
 * 種類の違うコネクタをつなぐ変換ケーブルの中には、製品によってピンの対応が違うものがある（三菱電機の FCN 40 ピン ↔ MIL 40 極など）。
 * そのようなケーブルをここに書き、電線の cable（ケーブルの種類 ID）か、コネクタの defaultCable で選ぶ。
 *
 * ピン番号は Conneko のピン ID の番号（コネクタの '#n'）。三菱電機の FCN 40 ピンは B20 = 1、A20 = 2、…、B01 = 39、A01 = 40
 * （src/devices/catalog/mitsubishi-rx41c4.ts の fcnPinNo）、MIL は標準の千鳥番号。
 *
 * 出典:
 *   ミスミ PTHAS-F40-M40（PLC 側 FCN 40 芯メス ↔ 端子台側 MIL 40 芯メス。三菱の B20 → MIL 1 …）
 *   東洋技研 KB40N-4F1H（PCW-1H40-C などの結線図。三菱の B_k → MIL 2k、A_k → MIL 2k−1。B20 → MIL 40）
 */

export interface CableSpec {
  id: string;
  /** 部品表・プロパティに出す名前 */
  name: string;
  maker: string;
  model: string;
  /** 両端のコネクタの種類（connector.kind）。順番は map の向き */
  ends: [string, string];
  /** ends[0] 側のピン番号 → ends[1] 側のピン番号 */
  map: (pin: number) => number;
}

export const CABLE_SPECS: CableSpec[] = [
  {
    id: 'misumi.pthas-f40-m40',
    name: 'FCN40⇔MIL40 変換ケーブル（三菱 B20 → MIL 1）',
    maker: 'ミスミ',
    model: 'PTHAS-F40-M40',
    ends: ['FCN40', 'MIL40'],
    map: (p) => p,
  },
  {
    id: 'toyogiken.kb40n-4f1h',
    name: 'FCN40⇔MIL40 変換ケーブル（三菱 B20 → MIL 40）',
    maker: '東洋技研',
    model: 'KB40N-4F1H',
    ends: ['FCN40', 'MIL40'],
    // B_k（ピン 41−2k）→ MIL 2k、A_k（ピン 42−2k）→ MIL 2k−1。どちらも 41 − ピン番号
    map: (p) => 41 - p,
  },
  // ファナックのロボット接続ケーブル（ロボットに付属する専用ケーブル。ロボット側のコネクターの defaultCable で選ぶ。
  // 種類の組は src/devices/fanuc/parts.ts。長さ・非屈曲/屈曲はロボットの注文時に選ぶ）
  {
    id: 'fanuc.robot-cable-rm1.lrm200id-mini',
    name: 'ロボット接続ケーブル RM1（モーター動力・ブレーキ。LR Mate 200iD ⇔ R-30iB Mini Plus）',
    maker: 'ファナック',
    model: 'ロボット接続ケーブル RM1',
    ends: ['FANUC-LRM200ID-RM1', 'FANUC-R30IB-MINI-RM1'],
    map: (p) => p,
  },
  {
    id: 'fanuc.robot-cable-rp1.lrm200id-mini',
    name: 'ロボット接続ケーブル RP1（パルスコーダ・ロボット I/O。LR Mate 200iD ⇔ R-30iB Mini Plus）',
    maker: 'ファナック',
    model: 'ロボット接続ケーブル RP1',
    ends: ['FANUC-LRM200ID-RP1', 'FANUC-R30IB-MINI-RP1'],
    map: (p) => p,
  },
];

export const getCableSpec = (id: string | undefined) => (id ? CABLE_SPECS.find((c) => c.id === id) : undefined);

/** 種類 a・b のコネクタをつなぐケーブルの種類（向きは問わない） */
export const cableSpecsFor = (a: string, b: string) => CABLE_SPECS.filter((c) => (c.ends[0] === a && c.ends[1] === b) || (c.ends[0] === b && c.ends[1] === a));

/**
 * ケーブルの、種類 from のコネクタのピン → 種類 to のコネクタのピン（ケーブルの種類がなければ同じ番号）。
 * 対応するピンがなければ undefined
 */
export function cablePin(spec: CableSpec | undefined, from: string, to: string, pin: number, toPins: number): number | undefined {
  if (!spec) return pin <= toPins ? pin : undefined;
  if (spec.ends[0] === from && spec.ends[1] === to) return spec.map(pin);
  // 逆向き: map の逆を探す
  for (let q = 1; q <= toPins; q++) if (spec.map(q) === pin) return q;
  return undefined;
}

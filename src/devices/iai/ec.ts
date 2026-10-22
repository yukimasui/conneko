/**
 * IAI エレシリンダー（EC シリーズ、コントローラー内蔵のアクチュエーター）の電源・I/O コネクターの共通の定義。
 *
 * 出典: 取扱説明書 MJ3816「エレシリンダー 電気編」（3.5 入出力仕様、4.3 パルスモーター搭載機種の配線、
 *       電源・I/O ケーブル CB-EC-PWBIO□□□-RB の線色とピン No.）。
 *
 * 電源・I/O コネクター（2 列 × 6、A1〜A6・B1〜B6）:
 *   A1 0V、B1 24V（モーター・制御電源 DC24V ±10%）、A2（予約。電源 2 系統仕様 TMD2 では制御電源 24V）、
 *   B2 BKRLS（ブレーキ解除。+24V を加えると解除、DC24V 200mA）、B3 ST0（後退）、B4 ST1（前進）、B5 RES（アラーム解除）、B6（予約）、
 *   A3 LS0/PE0（後退完了）、A4 LS1/PE1（前進完了）、A5 *ALM（アラーム。正常時 ON の b 接点論理）、A6（予約）。
 *   シングルソレノイド方式では B3 が FWBW（前進/後退）、B4 は未使用。
 * 入出力: 入力 DC24V 5mA/点、出力 最大 50mA/点（非絶縁）。NPN 仕様は入力がプラスコモン（ST0 などを 0V に落とすと ON）・出力が NPN、
 *   PNP 仕様（オプション PN）は入力がマイナスコモン・出力が PNP。
 *
 * Conneko のピンID は 2 列コネクターの並びに合わせ、An → <CN>#(2n−1)、Bn → <CN>#2n とした（IAI の PIO コネクターと同じ考え方）。
 */
import type { InternalLink, PinDef } from '../types';
import { DC24_MINUS, DC24_PLUS } from './parts';

/** ピン番号（'A1' など）→ ピンID の番号 */
export const ecPinNo = (row: 'A' | 'B', n: number) => (row === 'A' ? 2 * n - 1 : 2 * n);

/** CB-EC-PWBIO の芯線（ピン・線色・信号名） */
export const EC_LEADS: { row: 'A' | 'B'; n: number; color: { name: string; hex: string }; signal: string; note: string }[] = [
  { row: 'A', n: 1, color: { name: '黒', hex: '#1a1a1a' }, signal: '0V', note: '電源 0V（AWG18）' },
  { row: 'B', n: 1, color: { name: '赤', hex: '#d32f2f' }, signal: '24V', note: '電源 +24V（モーター・制御。AWG18）' },
  { row: 'A', n: 2, color: { name: '水', hex: '#4fb3e8' }, signal: '(予約)', note: '予約（電源 2 系統仕様 TMD2 では制御電源 24V。AWG22）' },
  { row: 'B', n: 2, color: { name: '茶', hex: '#7b4a2a' }, signal: 'BKRLS', note: 'ブレーキ解除（ブレーキ付きのとき。+24V で解除）' },
  { row: 'B', n: 3, color: { name: '橙', hex: '#f08c1a' }, signal: 'ST0', note: '入力 ST0（後退。シングルソレノイド方式では FWBW）' },
  { row: 'B', n: 4, color: { name: '黄', hex: '#f2c81b' }, signal: 'ST1', note: '入力 ST1（前進。シングルソレノイド方式では未使用）' },
  { row: 'B', n: 5, color: { name: '緑', hex: '#2e9d3a' }, signal: 'RES', note: '入力 RES（アラーム解除）' },
  { row: 'B', n: 6, color: { name: '桃', hex: '#f4a7b9' }, signal: '(予約)', note: '予約' },
  { row: 'A', n: 3, color: { name: '青', hex: '#1e5bd8' }, signal: 'LS0/PE0', note: '出力 LS0/PE0（後退完了）' },
  { row: 'A', n: 4, color: { name: '紫', hex: '#8e44ad' }, signal: 'LS1/PE1', note: '出力 LS1/PE1（前進完了）' },
  { row: 'A', n: 5, color: { name: '灰', hex: '#8a8f98' }, signal: '*ALM', note: '出力 *ALM（アラーム。正常時 ON）' },
  { row: 'A', n: 6, color: { name: '白', hex: '#f5f5f5' }, signal: '(予約)', note: '予約' },
];

export interface EcPioOptions {
  /** 'npn'（標準）/ 'pnp'（オプション PN） */
  polarity: 'npn' | 'pnp';
  /** ブレーキ付き（オプション B） */
  brake: boolean;
  /** 電源 2 系統仕様（オプション TMD2。A2 が制御電源 24V、B1 がモーター電源 24V） */
  tmd2: boolean;
}

/** エレシリンダー側の電源・I/O コネクターのピン */
export function ecPowerIoPins(cn: string, o: EcPioOptions): PinDef[] {
  const id = (row: 'A' | 'B', n: number) => `${cn}#${ecPinNo(row, n)}`;
  const common = o.polarity === 'npn' ? id('B', 1) : id('A', 1);
  const input = (n: number, label: string, note: string): PinDef => ({ id: id('B', n), label, note, role: 'signal', signal: { dir: 'in', kind: 'dc', common }, optional: true });
  // 電源 2 系統仕様の PNP 出力がどちらの 24V（B1 のモーター電源 / A2 の制御電源）から出るかは資料で確かめられなかった（B1 とした）
  const pnpNote = o.polarity === 'pnp' && o.tmd2 ? '。電源 2 系統仕様での出力の電源側（B1）は推定' : '';
  const output = (n: number, label: string, note: string): PinDef => ({ id: id('A', n), label, note: `${note}${pnpNote}`, role: 'signal', signal: { dir: 'out', kind: o.polarity }, optional: true });
  return [
    { id: id('A', 1), label: '0V（A1）', note: '電源 0V', role: 'input', accepts: DC24_MINUS, optional: true },
    { id: id('B', 1), label: o.tmd2 ? '24V モーター（B1）' : '24V（B1）', note: o.tmd2 ? 'モーター電源 DC24V ±10%' : '電源 DC24V ±10%（モーター・制御）', role: 'input', accepts: DC24_PLUS, optional: true },
    o.tmd2
      ? { id: id('A', 2), label: '24V 制御（A2）', note: '制御電源 DC24V ±10%（電源 2 系統仕様）', role: 'input', accepts: DC24_PLUS, optional: true }
      : { id: id('A', 2), label: '予約（A2）', role: 'signal', optional: true },
    o.brake
      ? { id: id('B', 2), label: 'BKRLS（B2）', note: 'ブレーキ解除（+24V を加えるとブレーキを解除。DC24V 200mA）', role: 'input', accepts: DC24_PLUS, optional: true }
      : { id: id('B', 2), label: 'BKRLS（B2）', note: 'ブレーキ解除（ブレーキなしでは未使用）', role: 'signal', optional: true },
    input(3, 'ST0（B3）', '後退（シングルソレノイド方式では FWBW）'),
    input(4, 'ST1（B4）', '前進（シングルソレノイド方式では未使用）'),
    input(5, 'RES（B5）', 'アラーム解除'),
    { id: id('B', 6), label: '予約（B6）', role: 'signal', optional: true },
    output(3, 'LS0/PE0（A3）', '後退完了'),
    output(4, 'LS1/PE1（A4）', '前進完了'),
    output(5, '*ALM（A5）', 'アラーム（正常時 ON、アラームで OFF）'),
    { id: id('A', 6), label: '予約（A6）', role: 'signal', optional: true },
  ];
}

/** 出力（LS0・LS1・*ALM）の内部経路。NPN は 0V へ、PNP は 24V から（最大 50mA/点） */
export function ecPowerIoLinks(cn: string, o: EcPioOptions): InternalLink[] {
  const ref = o.polarity === 'npn' ? `${cn}#${ecPinNo('A', 1)}` : `${cn}#${ecPinNo('B', 1)}`;
  return [3, 4, 5].map((n) => ({ from: `${cn}#${ecPinNo('A', n)}`, to: ref, switch: 'output' as const, ratedCurrent: 0.05 }));
}

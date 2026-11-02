/**
 * YRC1000micro の入出力（専用入力 7 点・専用出力 1 点・汎用入力 8 点・汎用出力 8 点）のピン定義。
 *
 * 点数は安川電機の YRC1000micro 仕様（専用信号: 入力 7・出力 1、汎用信号: 入力 8・出力 8（トランジスタ出力 8）、出力 100mA）による。
 * 実機の I/O コネクタの形・ピンの並びは資料で確かめられなかったため、Conneko では MIL 40 極のコネクタとし
 * （MIL 40 極の変換端子台・フラットケーブルとつながる）、ピンの並びも Conneko の中だけのもの（推定）にした:
 *   1・2 +24VU、3・4 0VU、5〜11 専用入力 SIN1〜SIN7、12〜19 汎用入力 IN01〜IN08、21〜28 汎用出力 OUT01〜OUT08、29 専用出力 SOUT1、
 *   37・38 +24VU、39・40 0VU（ほかは空き）。
 * - 入力: DC24V。入力と 0V の間を接点・NPN 出力で閉じて ON（プラスコモン。入力の共通は内部の +24VU）。
 * - 出力: NPN オープンコレクタ（負荷を +24V と出力の間につなぐ。0V 側で開閉）、1 点 0.1A。
 * - +24VU・0VU: 入出力用の DC24V（内部電源。外部電源にもできる）。
 */
import type { InternalLink, PinDef } from '../types';

/** 専用入力（推定の割付け）: [信号名, 説明] */
const SIN: [string, string][] = [
  ['外部起動', '再生モードでジョブを起動する'],
  ['外部ホールド', '動作を一時停止する（b 接点入力）'],
  ['マスタ呼出', 'マスタジョブを呼び出す'],
  ['アラームリセット', 'アラーム・エラーを解除する'],
  ['再生モード選択', 'モードを再生にする'],
  ['干渉 1 進入禁止', '干渉領域 1 への進入を待たせる'],
  ['干渉 2 進入禁止', '干渉領域 2 への進入を待たせる'],
];

export const IO_PINS = 40;
const P24 = [1, 2, 37, 38];
const M0V = [3, 4, 39, 40];

/** 入出力コネクタ cn のピンと内部経路 */
export function yrcIo(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  const common = id(P24[0]);
  for (let n = 1; n <= IO_PINS; n++) {
    if (P24.includes(n)) {
      pins.push(
        n === P24[0]
          ? { id: id(n), label: `+24VU（${n}）`, note: '入出力用の DC24V +24V（内部電源。入力の共通）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' }, optional: true }
          : { id: id(n), label: `+24VU（${n}）`, note: `入出力用の +24V。${P24[0]} 番と内部で共通`, role: 'pass', optional: true },
      );
      if (n !== P24[0]) links.push({ from: id(P24[0]), to: id(n) });
    } else if (M0V.includes(n)) {
      pins.push(
        n === M0V[0]
          ? { id: id(n), label: `0VU（${n}）`, note: '入出力用の DC24V 0V（内部電源。出力の共通）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' }, optional: true }
          : { id: id(n), label: `0VU（${n}）`, note: `入出力用の 0V。${M0V[0]} 番と内部で共通`, role: 'pass', optional: true },
      );
      if (n !== M0V[0]) links.push({ from: id(M0V[0]), to: id(n) });
    } else if (n >= 5 && n <= 11) {
      const [name, note] = SIN[n - 5];
      pins.push({ id: id(n), label: `SIN${n - 4} ${name}（${n}）`, note: `専用入力: ${note}`, role: 'signal', signal: { dir: 'in', kind: 'dc', common }, optional: true });
    } else if (n >= 12 && n <= 19) {
      const k = String(n - 11).padStart(2, '0');
      pins.push({ id: id(n), label: `IN${k}（${n}）`, note: `汎用入力 IN${k}（DC24V。0V へ引き込んで ON）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common }, optional: true });
    } else if (n >= 21 && n <= 28) {
      const k = String(n - 20).padStart(2, '0');
      pins.push({ id: id(n), label: `OUT${k}（${n}）`, note: `汎用出力 OUT${k}（NPN トランジスタ、DC24V 0.1A）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
      links.push({ from: id(n), to: id(M0V[0]), switch: 'output', ratedCurrent: 0.1 });
    } else if (n === 29) {
      pins.push({ id: id(n), label: `SOUT1 運転中（${n}）`, note: '専用出力: ジョブの実行中（NPN トランジスタ、DC24V 0.1A）', role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
      links.push({ from: id(n), to: id(M0V[0]), switch: 'output', ratedCurrent: 0.1 });
    } else {
      pins.push({ id: id(n), label: `（空き ${n}）`, role: 'signal', optional: true });
    }
  }
  return { pins, links };
}

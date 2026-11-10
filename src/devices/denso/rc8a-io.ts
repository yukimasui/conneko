/**
 * デンソーウェーブ RC8A の入出力（ミニ I/O・ハンド I/O）のピン定義。
 *
 * 点数（デンソーウェーブの RC8A の製品ページ・RC8 のデータシート）:
 * - ミニ I/O 入力: ユーザー開放 8 点 + システム固定 14 点
 * - ミニ I/O 出力: ユーザー開放 8 点 + システム固定 16 点（製品ページでは 18 点、RC8 のデータシートでは 16 点。Conneko では 16 点とした）
 * - ハンド I/O: 入力 8 点・出力 8 点（ロボットの手先のコネクターへ）
 * - 安全 I/O（非常停止・防護停止・自動運転許可の 2 チャンネル）も実機ではミニ I/O のケーブルを通るが、Conneko ではコントローラーのねじ端子として
 *   別に描いた（src/devices/catalog/denso-rc8a.ts）
 *
 * 実機のミニ I/O のコネクターの形・ピンの並びは資料で確かめられなかったため、Conneko では MIL 50 極（MIL 50 極の変換端子台とつながる）とし、
 * ピンの並びも Conneko の中だけのもの（推定）にした:
 *   1・2 +24V（内部電源）、3〜10 ユーザー入力 IN0〜IN7、11〜24 システム入力、25〜32 ユーザー出力 OUT0〜OUT7、33〜48 システム出力、49・50 0V。
 * システム入出力の名前は、デンソーの資料で確かめた「ステップストップ・一時停止・ストローブ信号・割込みスキップ」のほかは推定。
 * - 入力: DC24V、NPN 仕様（入力と 0V の間を接点・NPN 出力で閉じて ON。入力の共通は内部の +24V）
 * - 出力: NPN オープンコレクター（負荷を +24V と出力の間につなぐ）。1 点の定格電流は推定で 0.1A
 */
import type { InternalLink, PinDef } from '../types';
import { ENC_MAP } from './parts';

export const MINI_IO_PINS = 50;
/** 出力 1 点の定格電流[A]（推定） */
export const RC8A_OUT_RATED = 0.1;

/** システム入力（14 点）: [名前, 説明] */
const SYS_IN: [string, string][] = [
  ['ステップストップ', '全タスクを、実行中の行の終わりで止める'],
  ['一時停止', '全タスクを一時停止する（Halt）'],
  ['ストローブ', 'コマンド・データを取り込む'],
  ['割込みスキップ', '実行中の動作を中断して次の行へ進む'],
  ...Array.from({ length: 8 }, (_, i): [string, string] => [`コマンド${i}`, `I/O コマンドのコマンド・データ ビット ${i}`]),
  ['パリティ', 'コマンド・データのパリティ'],
  ['異常解除', 'ロボットの異常を解除する'],
];

/** システム出力（16 点）: [名前, 説明] */
const SYS_OUT: [string, string][] = [
  ['運転準備完了', 'ロボットを動かせる状態'],
  ['運転中', 'プログラムの実行中'],
  ['ロボット異常', '異常が起きている'],
  ['サーボオン', 'モーターの電源が入っている'],
  ['初期化完了', 'ロボットの初期化（CAL）が済んでいる'],
  ['自動モード', '自動運転のモード'],
  ['外部モード', '外部（PLC）から動かすモード'],
  ['電池電圧低下', 'エンコーダーのバックアップ電池の電圧が低い'],
  ['エラー警告', '軽い異常（警告）が起きている'],
  ['連続運転許可', '連続運転できる状態'],
  ['コマンド処理完了', 'I/O コマンドの処理が済んだ'],
  ['非常停止中', '非常停止の状態'],
  ...Array.from({ length: 4 }, (_, i): [string, string] => [`ステータス${i}`, `I/O コマンドの結果 ビット ${i}`]),
];

const P24 = [1, 2];
const M0V = [49, 50];

/** ミニ I/O のコネクター cn のピンと内部経路 */
export function miniIo(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  const common = id(P24[0]);
  for (let n = 1; n <= MINI_IO_PINS; n++) {
    if (n === P24[0]) {
      pins.push({ id: id(n), label: `+24V（${n}）`, note: 'ミニ I/O 用の DC24V +24V（内部電源。入力の共通）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' }, optional: true });
    } else if (n === P24[1]) {
      pins.push({ id: id(n), label: `+24V（${n}）`, note: `ミニ I/O 用の +24V。${P24[0]} 番と内部で共通`, role: 'pass', optional: true });
      links.push({ from: id(P24[0]), to: id(n) });
    } else if (n === M0V[0]) {
      pins.push({ id: id(n), label: `0V（${n}）`, note: 'ミニ I/O 用の DC24V 0V（内部電源。出力の共通）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' }, optional: true });
    } else if (n === M0V[1]) {
      pins.push({ id: id(n), label: `0V（${n}）`, note: `ミニ I/O 用の 0V。${M0V[0]} 番と内部で共通`, role: 'pass', optional: true });
      links.push({ from: id(M0V[0]), to: id(n) });
    } else if (n >= 3 && n <= 10) {
      const k = n - 3;
      pins.push({ id: id(n), label: `IN${k}（${n}）`, note: `ユーザー入力 IN${k}（DC24V。0V へ引き込んで ON）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common }, optional: true });
    } else if (n >= 11 && n <= 24) {
      const k = n - 11;
      const [name, note] = SYS_IN[k];
      pins.push({ id: id(n), label: `SI${k} ${name}（${n}）`, note: `システム入力: ${note}`, role: 'signal', signal: { dir: 'in', kind: 'dc', common }, optional: true });
    } else if (n >= 25 && n <= 32) {
      const k = n - 25;
      pins.push({ id: id(n), label: `OUT${k}（${n}）`, note: `ユーザー出力 OUT${k}（NPN トランジスタ、DC24V ${RC8A_OUT_RATED}A）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
      links.push({ from: id(n), to: id(M0V[0]), switch: 'output', ratedCurrent: RC8A_OUT_RATED });
    } else {
      const k = n - 33;
      const [name, note] = SYS_OUT[k];
      pins.push({ id: id(n), label: `SO${k} ${name}（${n}）`, note: `システム出力: ${note}（NPN トランジスタ）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
      links.push({ from: id(n), to: id(M0V[0]), switch: 'output', ratedCurrent: RC8A_OUT_RATED });
    }
  }
  return { pins, links };
}

/**
 * コントローラー側のエンコーダーコネクターのハンド I/O（HI0〜HI7・HO0〜HO7 と、その電源 +24V・0V）とエンコーダーのピン。
 * ハンド入力はミニ I/O と同じ NPN 仕様（+24V を共通にしたプラスコモン）、ハンド出力は NPN（推定）。
 */
export function controllerEncoder(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  const [p24, p24b] = ENC_MAP.p24;
  const [m0v, m0vb] = ENC_MAP.m0v;
  for (let i = 0; i < 8; i++) {
    pins.push({ id: id(ENC_MAP.hi(i)), label: `HI${i}`, note: `ハンド入力 HI${i}（ロボットのハンド I/O コネクターから。0V へ引き込んで ON）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: id(p24) }, optional: true });
  }
  for (let i = 0; i < 8; i++) {
    pins.push({ id: id(ENC_MAP.ho(i)), label: `HO${i}`, note: `ハンド出力 HO${i}（NPN トランジスタ。ロボットのハンド I/O コネクターへ）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true });
    links.push({ from: id(ENC_MAP.ho(i)), to: id(m0v), switch: 'output', ratedCurrent: RC8A_OUT_RATED });
  }
  pins.push(
    { id: id(p24), label: '+24V', note: 'ハンド I/O 用の +24V（内部電源）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' }, optional: true },
    { id: id(p24b), label: '+24V', note: 'ハンド I/O 用の +24V（内部電源）', role: 'pass', optional: true },
    { id: id(m0v), label: '0V', note: 'ハンド I/O 用の 0V', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' }, optional: true },
    { id: id(m0vb), label: '0V', note: 'ハンド I/O 用の 0V', role: 'pass', optional: true },
  );
  links.push({ from: id(p24), to: id(p24b) }, { from: id(m0v), to: id(m0vb) });
  ENC_MAP.encoder.forEach((p, i) => pins.push({ id: id(p), label: `ENC${i + 1}`, note: 'エンコーダーの信号・電源（Conneko では扱わない）', role: 'signal', optional: true }));
  return { pins, links };
}

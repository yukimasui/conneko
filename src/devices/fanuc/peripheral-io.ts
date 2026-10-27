/**
 * R-30iB Mini Plus の周辺機器 I/O（メインボードの CRMA15・CRMA16）とロボット I/O（RP1 の RI/RO）のピン定義。
 *
 * 点数（R-30iB Mate / Mate Plus 保守説明書 B-83525 の「メインボードの入力 28 点・出力 24 点」による。Mini Plus も同じメインボードの
 * 周辺機器 I/O と推定）:
 * - CRMA15: 汎用入力 DI101〜DI120（20 点）、汎用出力 DO101〜DO110（10 点）
 * - CRMA16: 周辺機器（UOP）入力 8 点（*IMSTP・*HOLD・*SFSPD・CSTOPI・FAULT RESET・START・HOME・ENBL）、
 *           UOP 出力 4 点（CMDENBL・FAULT・BATALM・BUSY）、汎用出力 DO111〜DO120（10 点）
 *
 * コネクター: 50 極（A01〜A25・B01〜B25 の 2 列、2.54mm ピッチ。MIL 規格のフラットケーブル・変換端子台とつながる）。
 * 資料で確かめられたのは A01・A02・B01・B02 が +24F、DI101 が A05、DO101 が A15 であることまで。ほかのピンの並び
 * （コモン SDICOM・出力の電源 DOSRC・0V の位置）は、この並びに沿って推定した。
 * ピン ID は MIL 標準の千鳥番号（A_k → 2k−1、B_k → 2k）にし、印字（A05 など）はラベルに残す。
 *
 * 電気的な仕様（推定を含む）:
 * - 入力: DC24V。コモン SDICOM を 0V につなぐと +24V で ON（PNP・接点を +24F 側に）、+24V につなぐと 0V で ON（NPN 出力の PLC で駆動）。
 * - 出力: ソース形（+24V を出す。PNP）。出力の電源 DOSRC に +24V を供給する（内蔵の 24F をつないでもよい）。1 点 0.2A（推定）。
 */
import type { InternalLink, PinDef } from '../types';
import { DC24_ANY, DC24_PLUS, RP1_MAP } from './parts';

/** 50 極コネクターの A・B 列の印字（A_k → 2k−1、B_k → 2k） */
export const abName = (pin: number) => `${pin % 2 === 1 ? 'A' : 'B'}${String(Math.ceil(pin / 2)).padStart(2, '0')}`;
const pinOf = (row: 'A' | 'B', k: number) => (row === 'A' ? 2 * k - 1 : 2 * k);

/**
 * ピンの役割。
 * - p24: +24F（コントローラー内蔵の DC24V 出力）、m0v: 0V
 * - com: 入力のコモン SDICOM（name）、src: 出力の電源 DOSRC（name）
 * - in: 入力（label、common はコモンの名前）、out: 出力（label、src は電源の名前）
 */
type CrmaPin =
  | { kind: 'p24' }
  | { kind: 'm0v' }
  | { kind: 'com'; name: string; note: string }
  | { kind: 'src'; name: string }
  | { kind: 'in'; label: string; note?: string; common: string }
  | { kind: 'out'; label: string; note?: string; src: string };

/** 列 k（1〜25）の A・B のピン */
type Row = [CrmaPin | null, CrmaPin | null];

const P24: CrmaPin = { kind: 'p24' };
const M0V: CrmaPin = { kind: 'm0v' };
const di = (n: number, common: string): CrmaPin => ({ kind: 'in', label: `DI${n}`, common });
const dout = (n: number, src: string): CrmaPin => ({ kind: 'out', label: `DO${n}`, src });

function rows(entries: Record<number, Row>): Row[] {
  return Array.from({ length: 25 }, (_, i) => entries[i + 1] ?? [null, null]);
}

/** CRMA15: DI101〜DI120・DO101〜DO110 */
export const CRMA15_ROWS: Row[] = rows({
  1: [P24, P24],
  2: [P24, P24],
  3: [
    { kind: 'com', name: 'SDICOM1', note: 'DI101〜DI108 のコモン（0V につなぐと +24V で ON、+24V につなぐと 0V で ON）' },
    { kind: 'com', name: 'SDICOM2', note: 'DI109〜DI120 のコモン（0V につなぐと +24V で ON、+24V につなぐと 0V で ON）' },
  ],
  ...Object.fromEntries(Array.from({ length: 10 }, (_, i) => [5 + i, [di(101 + 2 * i, i < 4 ? 'SDICOM1' : 'SDICOM2'), di(102 + 2 * i, i < 4 ? 'SDICOM1' : 'SDICOM2')] as Row])),
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [15 + i, [dout(101 + 2 * i, 'DOSRC1'), dout(102 + 2 * i, 'DOSRC1')] as Row])),
  22: [{ kind: 'src', name: 'DOSRC1' }, { kind: 'src', name: 'DOSRC1' }],
  23: [{ kind: 'src', name: 'DOSRC1' }, { kind: 'src', name: 'DOSRC1' }],
  24: [M0V, M0V],
  25: [M0V, M0V],
});

const ui = (n: number, name: string, note: string): CrmaPin => ({ kind: 'in', label: `UI${n} ${name}`, note, common: 'SDICOM3' });
const uo = (n: number, name: string, note: string): CrmaPin => ({ kind: 'out', label: `UO${n} ${name}`, note, src: 'DOSRC2' });

/** CRMA16: 周辺機器（UOP）入力 8 点・UOP 出力 4 点・DO111〜DO120 */
export const CRMA16_ROWS: Row[] = rows({
  1: [P24, P24],
  2: [P24, P24],
  3: [{ kind: 'com', name: 'SDICOM3', note: 'UOP 入力（UI1〜UI8）のコモン（0V につなぐと +24V で ON、+24V につなぐと 0V で ON）' }, null],
  5: [ui(1, '*IMSTP', '瞬時停止（b 接点入力。OFF で停止。安全回路には使えない）'), ui(2, '*HOLD', '一時停止（b 接点入力。OFF で一時停止）')],
  6: [ui(3, '*SFSPD', '安全速度（b 接点入力。OFF で減速・停止）'), ui(4, 'CSTOPI', 'サイクル停止')],
  7: [ui(5, 'FAULT RESET', 'アラーム解除'), ui(6, 'START', '起動（立下りで起動）')],
  8: [ui(7, 'HOME', '原位置復帰'), ui(8, 'ENBL', '動作許可（ON で動作できる）')],
  15: [uo(1, 'CMDENBL', '外部起動の受付け可（自動運転できる状態）'), uo(6, 'FAULT', 'アラーム発生中')],
  16: [uo(9, 'BATALM', 'バッテリー電圧低下'), uo(10, 'BUSY', 'プログラム実行中・処理中')],
  ...Object.fromEntries(Array.from({ length: 5 }, (_, i) => [17 + i, [dout(111 + 2 * i, 'DOSRC2'), dout(112 + 2 * i, 'DOSRC2')] as Row])),
  22: [{ kind: 'src', name: 'DOSRC2' }, { kind: 'src', name: 'DOSRC2' }],
  23: [{ kind: 'src', name: 'DOSRC2' }, { kind: 'src', name: 'DOSRC2' }],
  24: [M0V, M0V],
  25: [M0V, M0V],
});

/** 出力 1 点の定格電流[A]（推定） */
export const DO_RATED = 0.2;

/** 周辺機器 I/O のコネクター cn のピンと内部経路 */
export function crmaIo(cn: string, table: Row[]): { pins: PinDef[]; links: InternalLink[] } {
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  const id = (pin: number) => `${cn}#${pin}`;
  // 同じ名前のピン（+24F・0V・コモン・出力の電源）の最初のピン。2 本目以降は最初のピンと常時導通
  const first = new Map<string, number>();
  const all: { pin: number; p: CrmaPin | null }[] = [];
  table.forEach(([a, b], i) => {
    all.push({ pin: pinOf('A', i + 1), p: a }, { pin: pinOf('B', i + 1), p: b });
  });
  for (const { pin, p } of all) {
    if (p?.kind === 'p24' || p?.kind === 'm0v' || p?.kind === 'com' || p?.kind === 'src') {
      const name = p.kind === 'p24' ? '24F' : p.kind === 'm0v' ? '0V' : p.name;
      if (!first.has(name)) first.set(name, pin);
    }
  }
  const nameId = (name: string) => id(first.get(name)!);

  for (const { pin, p } of all) {
    const ab = abName(pin);
    const pid = id(pin);
    if (!p) {
      pins.push({ id: pid, label: `（空き ${ab}）`, role: 'signal', optional: true });
      continue;
    }
    switch (p.kind) {
      case 'p24':
      case 'm0v': {
        const name = p.kind === 'p24' ? '24F' : '0V';
        const isFirst = first.get(name) === pin;
        const note = p.kind === 'p24' ? '内蔵の DC24V 出力 +24V（周辺機器の入力・DOSRC 用）' : '内蔵の DC24V 出力 0V';
        pins.push(
          isFirst
            ? { id: pid, label: `${name}（${ab}）`, note, role: 'supply', supply: { system: 'DC', voltage: 24, conductor: p.kind === 'p24' ? '+' : '-' }, optional: true }
            : { id: pid, label: `${name}（${ab}）`, note: `${note}。${abName(first.get(name)!)} と内部で共通`, role: 'pass', optional: true },
        );
        if (!isFirst) links.push({ from: nameId(name), to: pid });
        break;
      }
      case 'com': {
        const isFirst = first.get(p.name) === pin;
        pins.push({ id: pid, label: `${p.name}（${ab}）`, note: p.note, role: 'input', accepts: DC24_ANY, optional: true });
        if (!isFirst) links.push({ from: nameId(p.name), to: pid });
        break;
      }
      case 'src': {
        const isFirst = first.get(p.name) === pin;
        const note = '出力の電源（+24V を供給する。開放にはしない）';
        pins.push(
          isFirst
            ? { id: pid, label: `${p.name}（${ab}）`, note, role: 'input', accepts: DC24_PLUS, optional: true }
            : { id: pid, label: `${p.name}（${ab}）`, note: `${note}。${abName(first.get(p.name)!)} と内部で共通`, role: 'pass', optional: true },
        );
        if (!isFirst) links.push({ from: nameId(p.name), to: pid });
        break;
      }
      case 'in':
        pins.push({
          id: pid,
          label: `${p.label}（${ab}）`,
          note: p.note ?? `汎用入力 ${p.label}`,
          role: 'signal',
          signal: { dir: 'in', kind: 'dc', common: nameId(p.common) },
          optional: true,
        });
        break;
      case 'out':
        pins.push({ id: pid, label: `${p.label}（${ab}）`, note: p.note ?? `汎用出力 ${p.label}（ソース形、+24V を出す）`, role: 'signal', signal: { dir: 'out', kind: 'pnp' }, optional: true });
        links.push({ from: pid, to: nameId(p.src), switch: 'output', ratedCurrent: DO_RATED });
        break;
    }
  }
  return { pins, links };
}

/**
 * コントローラー側の RP1 のロボット I/O（RI1〜RI8・RO1〜RO8 と、その電源 24F・0V）とパルスコーダのピン。
 * RO はソース形（+24V を出す）、RI は DC24V 入力（コモンの極性は資料で確認できないため決めない）。
 */
export function controllerRp1(cn: string): { pins: PinDef[]; links: InternalLink[] } {
  const id = (n: number) => `${cn}#${n}`;
  const pins: PinDef[] = [];
  const links: InternalLink[] = [];
  const [p24, p24b] = RP1_MAP.p24;
  const [m0v, m0vb] = RP1_MAP.m0v;
  for (let i = 1; i <= 8; i++) {
    pins.push({ id: id(RP1_MAP.ri(i)), label: `RI${i}`, note: `ロボット入力 RI${i}（ロボットのエンドエフェクタ用コネクター EE へ）`, role: 'signal', signal: { dir: 'in', kind: 'dc' }, optional: true });
  }
  for (let i = 1; i <= 8; i++) {
    pins.push({ id: id(RP1_MAP.ro(i)), label: `RO${i}`, note: `ロボット出力 RO${i}（ソース形、+24V を出す。ロボットのエンドエフェクタ用コネクター EE へ）`, role: 'signal', signal: { dir: 'out', kind: 'pnp' }, optional: true });
    links.push({ from: id(RP1_MAP.ro(i)), to: id(p24), switch: 'output', ratedCurrent: DO_RATED });
  }
  pins.push(
    { id: id(p24), label: '24F', note: 'ロボット I/O 用の +24V（内蔵の DC24V）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+' }, optional: true },
    { id: id(p24b), label: '24F', note: 'ロボット I/O 用の +24V（内蔵の DC24V）', role: 'pass', optional: true },
    { id: id(m0v), label: '0V', note: 'ロボット I/O 用の 0V', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-' }, optional: true },
    { id: id(m0vb), label: '0V', note: 'ロボット I/O 用の 0V', role: 'pass', optional: true },
  );
  links.push({ from: id(p24), to: id(p24b) }, { from: id(m0v), to: id(m0vb) });
  RP1_MAP.pulsecoder.forEach((p, i) => pins.push({ id: id(p), label: `PC${i + 1}`, note: 'パルスコーダの信号・電源（Conneko では扱わない）', role: 'signal', optional: true }));
  return { pins, links };
}

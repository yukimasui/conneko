/**
 * 三菱電機 CC-Link IE フィールドネットワーク ブロックタイプ リモート I/O ユニット（ネジ端子台タイプ、1 線式）
 * NZ2GF2B1N1-16D（DC 入力 16 点）・NZ2GF2B1N1-16T（トランジスタ出力 16 点、シンク）の機器定義の生成。
 *
 * 外形はスプリングクランプ端子台タイプ NZ2GF2S1-16D の W133 × H50mm を当てはめた（推定。1mm ≒ 2px）。
 * 正面の上部に PW・RUN・MODE・D LINK・ERR・L ER の LED と局番設定のロータリスイッチ、左上に CC-Link IE フィールドの
 * ポート P1・P2（RJ-45、上へ差す）、下部に 2 段のネジ端子台（M3）。
 *
 * 端子台の並び（推定。マニュアル SH-081114 の端子配列を確かめられなかった）:
 *   上段: 24V 24G 0 2 4 6 8 A C E
 *   下段: FG COM 1 3 5 7 9 B D F
 * 24V・24G はユニット電源（DC24V）。COM は入出力のコモン（入力はプラス/マイナスコモン共用、出力は負荷電源の 0V）。
 *
 * 入出力の番号は、マスタ局（RJ71GF11-T2 など）のリンクデバイス RX / RY の局番ごとの位置で決まる。
 * 端子のラベルはユニットの印字（X0〜XF / Y0〜YF）にし、I/O 表にはユニット内の番号で出す。
 * 出典: 三菱電機 CC-Link IE フィールド ネットワーク製品の一覧（NZ2GF2B1N1-16D: DC 入力 16 点 プラス/マイナスコモン共用 DC24V 6mA 1 線式、
 *       NZ2GF2B1N1-16T: トランジスタ出力 シンク 16 点 DC12/24V 0.5A/点・4A/コモン 1 線式、増設ユニット 3 台まで）、
 *       三菱電機 EMEA の製品ページ（NZ2GF2B1N1-16T: 電源 DC24V、消費電流 0.13A）、テクニカルニュース FA-D-0472（生産中止と後継 NZ2GN2B1-16D）
 */
import type { CommonLimit, DeviceDefinition, InternalLink, TerminalDef } from '../types';
import { threeDiamonds } from './iqr-parts';

export interface Nz2gfSpec {
  kind: 'input' | 'output';
}

const W = 266;
const H = 100;
/** 端子台（上段・下段の Y 座標、端子のピッチ、左端の X 座標） */
const ROW_Y = [66, 84];
const P = 22;
const X0 = 33;
const xAt = (i: number) => X0 + i * P;
const PORTS = [
  { id: 'P1', x: 24 },
  { id: 'P2', x: 54 },
];
const PORT_Y = 14;

const HEX = '0123456789ABCDEF';

const t = (x: number, y: number, s: string, size = 4, fill = '#2b2d30', anchor = 'middle', weight = 'bold') =>
  `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${s}</text>`;

const screw = (x: number, y: number) => `
  <rect x="${x - 9}" y="${y - 7.6}" width="18" height="15.2" rx="1" fill="#141517" stroke="#3a3c40" stroke-width="0.5"/>
  <rect x="${x - 6.6}" y="${y - 6}" width="13.2" height="12" rx="0.6" fill="url(#nzwasher-{{uid}})"/>
  <circle cx="${x}" cy="${y}" r="4.6" fill="url(#nzscrew-{{uid}})" stroke="#555" stroke-width="0.5"/>
  <path d="M${x - 2.9} ${y} H${x + 2.9} M${x} ${y - 2.9} V${y + 2.9}" stroke="#444" stroke-width="1" stroke-linecap="round"/>`;

const rj45 = (cx: number, cy: number) => `
  <rect x="${cx - 13}" y="${cy - 11}" width="26" height="22" rx="1.2" fill="#c9ccd0" stroke="#6d7177" stroke-width="0.6"/>
  <rect x="${cx - 11}" y="${cy - 9}" width="22" height="18" fill="#0c0d0e"/>
  <rect x="${cx - 5}" y="${cy - 9}" width="10" height="4.5" fill="#2a2c2f"/>
  <path d="M${cx - 7} ${cy + 6} H${cx + 7}" stroke="#c7a54a" stroke-width="1.6" stroke-dasharray="0.8 1.1"/>`;

const ledRow = (x: number, y: number, label: string, on: boolean) =>
  `<rect x="${x - 2.4}" y="${y - 1.4}" width="4.8" height="2.8" rx="0.6" fill="${on ? 'url(#nzgreen-{{uid}})' : '#9fa69d'}" stroke="#555" stroke-width="0.3"/>${t(x, y + 5.4, label, 2.6, '#2b2d30', 'middle', 'normal')}`;

const rotary = (x: number, y: number, label: string) => `
  <circle cx="${x}" cy="${y}" r="5" fill="#2a2c2f" stroke="#6d7177" stroke-width="0.5"/>
  <circle cx="${x}" cy="${y}" r="3.4" fill="#eceded"/>
  <path d="M${x} ${y - 2.8} V${y + 2.8}" stroke="#2a2b2d" stroke-width="1.1"/>
  ${t(x, y + 9, label, 2.6, '#2b2d30', 'middle', 'normal')}`;

export function buildNz2gf(s: Nz2gfSpec): DeviceDefinition {
  const input = s.kind === 'input';
  const pre = input ? 'X' : 'Y';
  const top = ['24V', '24G', ...[0, 2, 4, 6, 8, 10, 12, 14].map((n) => `${pre}${HEX[n]}`)];
  const bottom = ['FG', 'COM', ...[1, 3, 5, 7, 9, 11, 13, 15].map((n) => `${pre}${HEX[n]}`)];
  const model = input ? 'NZ2GF2B1N1-16D' : 'NZ2GF2B1N1-16T';
  const print = (id: string) => (id.length === 2 && (id[0] === 'X' || id[0] === 'Y') ? id[1] : id);

  const svg = `
  <defs>
    <linearGradient id="nzbody-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#eceeef"/>
      <stop offset="1" stop-color="#d3d6d9"/>
    </linearGradient>
    <linearGradient id="nzwasher-{{uid}}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#e0e1e3"/>
      <stop offset="1" stop-color="#8e9093"/>
    </linearGradient>
    <radialGradient id="nzscrew-{{uid}}" cx="0.4" cy="0.35" r="0.75">
      <stop offset="0" stop-color="#fdfdfd"/>
      <stop offset="0.6" stop-color="#c8c8c8"/>
      <stop offset="1" stop-color="#8a8a8a"/>
    </radialGradient>
    <radialGradient id="nzgreen-{{uid}}" cx="0.4" cy="0.35" r="0.7">
      <stop offset="0" stop-color="#e2ffd8"/>
      <stop offset="0.5" stop-color="#4be04a"/>
      <stop offset="1" stop-color="#1b8a22"/>
    </radialGradient>
  </defs>
  <!-- 本体 -->
  <rect x="0.5" y="0.5" width="${W - 1}" height="${H - 1}" rx="3" fill="url(#nzbody-{{uid}})" stroke="#8a8e93" stroke-width="1"/>
  <rect x="3" y="6" width="5" height="8" rx="1" fill="#c3c6ca" stroke="#9a9ea3" stroke-width="0.4"/>
  <rect x="${W - 8}" y="6" width="5" height="8" rx="1" fill="#c3c6ca" stroke="#9a9ea3" stroke-width="0.4"/>
  <!-- CC-Link IE フィールドのポート（上面から差す RJ-45） -->
  ${PORTS.map((p) => `${rj45(p.x, PORT_Y)}${t(p.x, PORT_Y + 17, p.id, 3.4)}`).join('')}
  ${t(39, 38, 'CC-Link IE Field', 3, '#1d4f9c')}
  <!-- 表示 LED -->
  ${[
    ['PW', true],
    ['RUN', true],
    ['MODE', true],
    ['D LINK', true],
    ['ERR.', false],
    ['L ER', false],
  ]
    .map(([l, on], i) => ledRow(84 + i * 15, 10, String(l), on as boolean))
    .join('')}
  <!-- 入出力の表示 LED（0〜F） -->
  ${Array.from({ length: 16 }, (_, i) => ledRow(84 + (i % 8) * 11, 26 + Math.floor(i / 8) * 10, HEX[i], false)).join('')}
  <!-- 局番設定スイッチ -->
  ${rotary(196, 14, 'STATION ×10')}
  ${rotary(226, 14, '×1')}
  ${threeDiamonds(186, 44, 3.2, '#c8102e')}
  ${t(193, 41, 'MITSUBISHI', 3.4, '#2b2d30', 'start')}
  ${t(W - 6, 49, model, 3.6, '#55585c', 'end', 'normal')}
  <!-- 端子台（2 段、M3） -->
  <rect x="${xAt(0) - 19}" y="54" width="${(top.length - 1) * P + 32}" height="44" rx="1.6" fill="#1f2023" stroke="#0b0b0c" stroke-width="0.7"/>
  ${top.map((id, i) => `${screw(xAt(i), ROW_Y[0])}${t(xAt(i), ROW_Y[0] - 8.8, print(id), 3, '#e5e7ea', 'middle', 'normal')}`).join('')}
  ${bottom.map((id, i) => `${screw(xAt(i), ROW_Y[1])}${t(xAt(i) - 10.4, ROW_Y[1] + 1.2, print(id), 3, '#e5e7ea', 'end', 'normal')}`).join('')}
`;

  const power = (c: '+' | '-') => ({ system: 'DC' as const, minVoltage: 20.4, maxVoltage: 28.8, conductors: [c] });
  const terminal = (id: string, x: number, y: number): TerminalDef => {
    const base = { id, x, y, side: 'bottom' as const };
    if (id === '24V') return { ...base, label: '24V', hint: 'ユニット電源+', note: 'ユニット電源 DC24V（20.4〜28.8V）+', role: 'input', accepts: power('+') };
    if (id === '24G') return { ...base, label: '24G', hint: 'ユニット電源−', note: 'ユニット電源 DC24V の 0V', role: 'input', accepts: power('-') };
    if (id === 'FG') return { ...base, label: 'FG', hint: '機能接地', note: '機能接地（盤の接地へ）', role: 'ground', optional: true };
    if (id === 'COM') {
      return input
        ? { ...base, label: 'COM', note: '入力コモン（全 16 点共通。+24V につなぐとプラスコモン = NPN・接点用、0V につなぐとマイナスコモン = PNP 用）', role: 'input', accepts: { system: 'DC', minVoltage: 20.4, maxVoltage: 28.8, conductors: ['+', '-'] }, optional: true }
        : { ...base, label: 'COM', note: '出力コモン（負荷電源 DC12/24V の 0V。16 点 1 コモン、4A/コモン）', role: 'input', accepts: { system: 'DC', minVoltage: 10.2, maxVoltage: 28.8, conductors: ['-'] }, optional: true };
    }
    const n = HEX.indexOf(id[1]);
    return input
      ? { ...base, label: id, note: `入力 ${id}（リンクデバイス RX の ${n} 点目。DC24V 6mA、コモン COM）`, role: 'signal', signal: { dir: 'in', kind: 'dc', common: 'COM' }, optional: true }
      : { ...base, label: id, note: `出力 ${id}（リンクデバイス RY の ${n} 点目。シンク DC12/24V 0.5A、コモン COM）`, role: 'signal', signal: { dir: 'out', kind: 'npn' }, optional: true };
  };

  const terminals: TerminalDef[] = [
    ...top.map((id, i) => terminal(id, xAt(i), ROW_Y[0])),
    ...bottom.map((id, i) => terminal(id, xAt(i), ROW_Y[1])),
    ...PORTS.map(
      (p): TerminalDef => ({
        id: p.id,
        label: `${p.id} CC-Link IE Field (RJ45)`,
        note: 'CC-Link IE フィールドネットワークのポート（1Gbps。P1・P2 のどちらにつないでもよい）',
        x: p.x,
        y: PORT_Y,
        side: 'top',
        role: 'connector',
        connector: { kind: 'RJ45', pins: 0, width: 22, length: 19, facing: 'front', protocols: ['cc-link-ie-field'] },
        optional: true,
      }),
    ),
  ];
  const outs = Array.from({ length: 16 }, (_, n) => `Y${HEX[n]}`);
  const links: InternalLink[] = input ? [] : outs.map((o) => ({ from: o, to: 'COM', switch: 'output' as const, ratedCurrent: 0.5 }));
  const commonLimits: CommonLimit[] = input ? [] : [{ common: 'COM', current: 4 }];

  return {
    type: input ? 'mitsubishi.nz2gf2b1n1-16d' : 'mitsubishi.nz2gf2b1n1-16t',
    name: input ? 'リモート I/O ユニット（CC-Link IE フィールド、DC 入力 16 点）' : 'リモート I/O ユニット（CC-Link IE フィールド、トランジスタ出力 16 点）',
    model,
    maker: '三菱電機',
    category: 'plc',
    description:
      `三菱電機 CC-Link IE フィールドネットワークのブロックタイプ リモート I/O ユニット ${model}（ネジ端子台タイプ、1 線式）。` +
      (input
        ? 'DC 入力 16 点（DC24V 6mA、プラス/マイナスコモン共用）。COM を +24V につなぐと NPN 出力のセンサー・接点用、0V につなぐと PNP 出力のセンサー用。'
        : 'トランジスタ出力（シンク）16 点（DC12/24V、0.5A/点、4A/コモン）。COM に負荷電源の 0V をつなぎ、負荷は +V と出力の間に入れる。') +
      'ユニット電源 DC24V を 24V・24G に入れる。上面の P1・P2（RJ-45）で、マスタ局（iQ-R の RJ71GF11-T2・RJ71EN71 など）やほかの局と CC-Link IE フィールド用の LAN ケーブル（カテゴリ 5e 以上）でつなぐ（ライン・スター・リング）。' +
      '入出力は、マスタ局のリンクデバイス RX / RY のうち局番で決まる位置に割り付けられる（CPU の X / Y への転送はマスタ局のリフレッシュの設定）。増設ユニット（NZ2EX2B1 形など）を 3 台までつなげる。' +
      '生産中止のお知らせが出ている機種（後継は CC-Link IE TSN の NZ2GN2B1 形）で、既設の設備の図面に使う。' +
      (input ? '消費電流（0.12A）・外形・端子台の並びは推定。' : '外形・端子台の並びは推定（消費電流 0.13A は製品ページによる）。'),
    estimated: input
      ? '外形寸法（W133 × H50mm として描いた）、端子台の並び（上段 24V 24G 0 2 … E、下段 FG COM 1 3 … F）、ユニットの消費電流 0.12A'
      : '外形寸法（W133 × H50mm として描いた）、端子台の並び（上段 24V 24G 0 2 … E、下段 FG COM 1 3 … F）',
    labelPrefix: 'RIO',
    width: W,
    height: H,
    svg,
    terminals,
    ...(links.length ? { links, commonLimits } : {}),
    loadCurrent: input ? 0.12 : 0.13,
  };
}

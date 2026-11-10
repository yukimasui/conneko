import type { DeviceDefinition, TerminalDef } from '../types';
import { kvBody, kvDefs, kvUnitBus, led, plugBlockV, screw, text } from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ CC-Link マスタ・ローカルユニット KV-CL20。
 * CPU ユニットの右に連結し、CC-Link（Ver.1.10 / Ver.2.00）のマスタ局またはローカル局として、リモート I/O・インバータ・
 * サーボアンプなどの CC-Link 機器と専用ケーブル（3 心 + シールド）でつなぐ。
 *
 * 外形は KV-DN20 と同じ W35 × H90mm として描いた（推定。1mm ≒ 2px）。上部に RUN/ERR・SD/RD LED、局番設定（×10・×1）と
 * 伝送速度（B RATE）のロータリスイッチ、中央に CC-Link の 5 極端子台、下部に FG 端子（ネジ）。
 * 端子台の並び（上から DA・DB・DG・SLD・FG）は CC-Link 機器で一般的な並びを当てはめた推定（KV-CL20 のマニュアルで未確認）。
 * DA・DB・DG に CC-Link のポート（port: 'CC-Link'、protocols: ['cc-link']）を書き、ほかの通信方式の端子とつなぐと警告させる。
 * 出典: KEYENCE 製品ページ（内部消費電流 170mA 以下、CPU ユニットから供給）
 *       https://www.keyence.co.in/products/controls/plc-building-block-type/kv-x/models/kv-cl20/
 *       CC-Link の端子の意味（DA = 信号 High、DB = 信号 Low、DG = 通信用グランド、SLD = シールド、FG = 機能接地）は
 *       KEYENCE DL-CL1・LK-CC100 の取扱説明書による
 */

const W = 70;
const H = 180;
const IDS = ['DA', 'DB', 'DG', 'SLD', 'FG1'];
const PRINT: Record<string, string> = { DA: 'DA', DB: 'DB', DG: 'DG', SLD: 'SLD', FG1: 'FG' };
const block = plugBlockV({ x: 22, y: 70, ids: IDS, pitch: 10, w: 14, labels: PRINT });
const FG = { x: 35, y: 152 };

/** ロータリスイッチ */
const rotary = (x: number, y: number, label: string) => `
  <circle cx="${x}" cy="${y}" r="4.6" fill="#0d0e0f" stroke="#55585c" stroke-width="0.6"/>
  <circle cx="${x}" cy="${y}" r="3.2" fill="#e9e9ea"/>
  <path d="M${x} ${y - 2.6} V${y + 2.6}" stroke="#2a2b2d" stroke-width="1"/>
  ${text(x, y + 8.4, label, 2.4, '#b9bcc1', 'middle', 'normal')}`;

const svg = `
  ${kvDefs()}
  ${kvBody(W, H, 'KV-CL20')}
  ${led(12, 24, 'g')}${text(12, 30, 'RUN', 2.6, '#b9bcc1', 'middle', 'normal')}
  ${led(24, 24, 'off')}${text(24, 30, 'ERR', 2.6, '#b9bcc1', 'middle', 'normal')}
  ${led(36, 24, 'g')}${text(36, 30, 'SD', 2.6, '#b9bcc1', 'middle', 'normal')}
  ${led(48, 24, 'g')}${text(48, 30, 'RD', 2.6, '#b9bcc1', 'middle', 'normal')}
  ${rotary(14, 42, '×10')}
  ${rotary(28, 42, '×1')}
  ${rotary(48, 42, 'B RATE')}
  ${text(W / 2 - 2, 62, 'CC-Link', 4.2, '#e6e7e9')}
  <rect x="19" y="66" width="20" height="62" rx="1" fill="#26282b" stroke="#111214" stroke-width="0.6"/>
  ${block.svg}
  <rect x="${FG.x - 9}" y="${FG.y - 9}" width="18" height="18" rx="1" fill="#141516" stroke="#3a3c40" stroke-width="0.5"/>
  ${screw(FG.x, FG.y, 4.6)}
  <path d="M${FG.x - 14} ${FG.y - 3} v3 M${FG.x - 16.5} ${FG.y} h5 M${FG.x - 15.7} ${FG.y + 1.2} h3.4 M${FG.x - 14.9} ${FG.y + 2.4} h1.8" stroke="#d0d3d6" stroke-width="0.6"/>
`;

const NOTES: Record<string, string> = {
  DA: 'CC-Link 通信信号 DA（専用ケーブルの青）',
  DB: 'CC-Link 通信信号 DB（専用ケーブルの白）',
  DG: 'CC-Link 通信用グランド DG（専用ケーブルの黄）',
  SLD: 'CC-Link ケーブルのシールド（内部で FG と接続）',
  FG1: '機能接地（端子台の FG。SLD と内部で接続）',
};

const terminals: TerminalDef[] = [
  ...IDS.map((id): TerminalDef => {
    const base = { id, label: PRINT[id], note: NOTES[id], x: block.pos[id].x, y: block.pos[id].y, side: 'right' as const, optional: true };
    if (id === 'DA' || id === 'DB' || id === 'DG') return { ...base, role: 'signal', port: 'CC-Link', protocols: ['cc-link'] };
    if (id === 'FG1') return { ...base, role: 'ground' };
    return { ...base, role: 'signal' };
  }),
  { id: 'FG', label: 'FG', hint: '機能接地', note: '本体の FG 端子（盤の接地へ）', x: FG.x, y: FG.y, side: 'bottom', role: 'ground', optional: true },
];

const def: DeviceDefinition = {
  type: 'keyence.kv-cl20',
  name: 'PLC CC-Link 通信ユニット',
  model: 'KV-CL20',
  maker: 'KEYENCE',
  category: 'plc',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズの CC-Link マスタ・ローカルユニット（CC-Link Ver.1.10 / Ver.2.00、伝送速度 156k〜10Mbps）。CPU ユニットの右に連結し、マスタ局またはローカル局として、CC-Link 対応のリモート I/O・インバータ・サーボアンプ・センサーアンプなどと CC-Link 専用ケーブル（DA 青・DB 白・DG 黄・シールド）で渡り配線する。伝送路の両端の機器の DA–DB 間に終端抵抗（110Ω、高性能ケーブルは 130Ω）を付ける。SLD・FG は接地へ。内部消費電流 170mA 以下（CPU から供給）。外形と端子台の並び（DA・DB・DG・SLD・FG）は推定。',
  estimated: '外形寸法（W35 × H90mm として描いた）と端子台の並び（上から DA・DB・DG・SLD・FG）',
  labelPrefix: 'CCL',
  width: W,
  height: H,
  svg,
  terminals,
  links: [
    // SLD と FG は内部で接続
    { from: 'SLD', to: 'FG1' },
    { from: 'FG1', to: 'FG' },
  ],
  bus: kvUnitBus(170),
};

export default def;

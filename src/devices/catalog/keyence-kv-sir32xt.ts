import {
  INPUT_COM_24V,
  INPUT_MODE_PARAM,
  buildMilUnit,
  inputComAccepts,
  ioOutputLinks,
  ioPins,
  kvUnitBus,
  led,
  text,
  type IoPoint,
} from '../keyence/kv-parts';

/**
 * KEYENCE KV-X/KV-8000/KV-7000 シリーズ 高速入出力ユニット KV-SIR32XT（入力 32点 + MOSFET 出力 32点、コネクタタイプ）。
 * 外形 W36 × H92.5 × D95 mm（1mm ≒ 2px）。正面上部に入出力の動作表示 LED（赤）、その下に MIL 規格 40極のボックスヘッダが 2 個
 * （左が入力、右が出力。中心間 13.4mm）。
 *
 * ピン配置（KEYENCE 入出力回路図より。このユニットは MIL 標準の千鳥番号で記載されている: 左列が奇数、右列が偶数）:
 *   左（CN1, 入力）: 1,3,…,31 = IN 000〜015、2,4,…,32 = IN 100〜115、33・35 = COM0、34・36 = COM1、37〜40 = N.C.
 *   右（CN2, 出力）: 1,3,…,31 = OUT 200〜215、2,4,…,32 = OUT 300〜315、33〜36 = N.C.、37・39 = COM2、38・40 = COM3
 * COM0〜COM3 はそれぞれ独立（各 COM の 2 端子は内部で短絡）。COM0: IN000〜015、COM1: IN100〜115、COM2: OUT200〜215、COM3: OUT300〜315。
 * 出典: https://www.keyence.co.jp/products/controls/plc-building/kv-8000/models/kv-sir32xt/io-circuit/
 */

const W = 72;
const H = 185;

/**
 * ピン（ラベルはリレー番号。入力は先頭から 2 チャネル、出力はその次の 2 チャネル）。
 * 入力の common は列ごとの COM（COM0 / COM1）、出力の common は COM2 / COM3（負荷電源の 0V）。
 */
const pins: IoPoint[] = [];
for (let i = 0; i < 16; i++) {
  pins.push({ id: `CN1#${2 * i + 1}`, kind: 'in', index: i, common: 'CN1#33' });
  pins.push({ id: `CN1#${2 * i + 2}`, kind: 'in', index: 16 + i, common: 'CN1#34' });
  pins.push({ id: `CN2#${2 * i + 1}`, kind: 'out', index: i, common: 'CN2#37' });
  pins.push({ id: `CN2#${2 * i + 2}`, kind: 'out', index: 16 + i, common: 'CN2#38' });
}
pins.push(
  { id: 'CN1#33', label: 'COM0', kind: 'com-in', note: '奇数ピンの入力（先頭チャネル）のコモン。DC24V 専用' },
  { id: 'CN1#35', label: 'COM0', kind: 'com-in', note: '奇数ピンの入力（先頭チャネル）のコモン。DC24V 専用' },
  { id: 'CN1#34', label: 'COM1', kind: 'com-in', note: '偶数ピンの入力（2 チャネル目）のコモン。DC24V / DC5V モード' },
  { id: 'CN1#36', label: 'COM1', kind: 'com-in', note: '偶数ピンの入力（2 チャネル目）のコモン。DC24V / DC5V モード' },
  { id: 'CN2#37', label: 'COM2 (0V)', kind: 'com-sink', note: '奇数ピンの出力（3 チャネル目）のコモン。1.6A/コモン' },
  { id: 'CN2#39', label: 'COM2 (0V)', kind: 'com-sink', note: '奇数ピンの出力（3 チャネル目）のコモン。1.6A/コモン' },
  { id: 'CN2#38', label: 'COM3 (0V)', kind: 'com-sink', note: '偶数ピンの出力（4 チャネル目）のコモン。1.6A/コモン' },
  { id: 'CN2#40', label: 'COM3 (0V)', kind: 'com-sink', note: '偶数ピンの出力（4 チャネル目）のコモン。1.6A/コモン' },
);
for (const n of [37, 38, 39, 40]) pins.push({ id: `CN1#${n}`, label: 'N.C.', kind: 'nc' });
for (const n of [33, 34, 35, 36]) pins.push({ id: `CN2#${n}`, label: 'N.C.', kind: 'nc' });

/** COM0 は DC24V 専用、COM1 だけ入力モード（DC24V / DC5V）で変わる */
const pinDefs = ioPins(pins, { inputs: 32, inputAccepts: inputComAccepts, outSignal: 'npn' });
const COM0 = new Set(['CN1#33', 'CN1#35']);

/** 動作表示 LED（4 段 × 16 点。図では一部を点灯させて描く） */
const leds = (() => {
  let s = `<rect x="4" y="20" width="${W - 10}" height="24" rx="1" fill="#141517" stroke="#3b3d41" stroke-width="0.5"/>`;
  const rows = ['IN0', 'IN1', 'OUT2', 'OUT3'];
  rows.forEach((r, ri) => {
    const y = 24 + ri * 5.5;
    s += text(5.5, y + 1.3, r, 2.6, '#9a9da2', 'start', 'normal');
    for (let i = 0; i < 16; i++) {
      const on = (i * 7 + ri * 3) % 5 === 0;
      s += led(20 + i * 2.95, y, on ? 'r' : 'off', 1.9, 1.6);
    }
  });
  return s;
})();

export default buildMilUnit({
  type: 'keyence.kv-sir32xt',
  model: 'KV-SIR32XT',
  name: 'PLC 高速入出力ユニット',
  labelPrefix: 'IO',
  description:
    'KEYENCE KV-X/KV-8000/KV-7000 シリーズ専用の高速入出力ユニット（コネクタタイプ）。入力 32点（DC24V 5.1mA / DC5V モードは IN100〜115 のみ、過電圧保護付き、入力時定数 1µs〜）、出力 32点（MOSFET N-ch シンク出力・過電流保護付き、DC30V 0.2A/点・1.6A/コモン、ON 1µs 以下）。外部接続は MIL 規格 40極コネクタ × 2（CN1 = 入力、CN2 = 出力）。ピン番号はマニュアルどおり MIL 標準の千鳥番号（奇数列 = 000〜015 / 200〜215、偶数列 = 100〜115 / 300〜315、COM0: 33・35、COM1: 34・36、COM2: 37・39、COM3: 38・40）。COM0〜COM3 はそれぞれ独立で、COM2/COM3 に出力の負荷電源の 0V をつなぐ。ピンのラベルはリレー番号（入力は先頭から 2 チャネル、出力はその次の 2 チャネル。例: 先頭 R000 なら入力 R000〜R115、出力 R200〜R315）。DC5V モード（params の inputMode）は IN100〜115 側（COM1）だけ。内部消費電流 130mA。',
  width: W,
  height: H,
  connectors: [
    { id: 'CN1', cx: 22.5, cy: 113, poles: 40, label: 'CN1 入力 (MIL 40P)' },
    { id: 'CN2', cx: 49.3, cy: 113, poles: 40, label: 'CN2 出力 (MIL 40P)' },
  ],
  pins: (p) => pinDefs(p).map((d) => (COM0.has(d.id) ? { ...d, accepts: INPUT_COM_24V } : d)),
  params: [{ ...INPUT_MODE_PARAM, label: '入力モード（IN100〜115 側）' }],
  bus: kvUnitBus(130, { inputs: 32, outputs: 32 }),
  commonLimits: [
    { common: 'CN2#37', current: 1.6 },
    { common: 'CN2#38', current: 1.6 },
  ],
  links: [
    { from: 'CN1#33', to: 'CN1#35' },
    { from: 'CN1#34', to: 'CN1#36' },
    { from: 'CN2#37', to: 'CN2#39' },
    { from: 'CN2#38', to: 'CN2#40' },
    ...ioOutputLinks(pins, 0.2),
  ],
  extra: leds,
});

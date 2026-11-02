import type { DeviceDefinition, InternalLink } from '../types';
import { rearTerminals, switchFace } from '../generic/meter';

/**
 * 電流計切換スイッチ（AS、三相 3 線・CT 2 台用、4 ノッチ OFF-R-S-T のカムスイッチ。汎用品）。
 * R 相・T 相の CT の二次を受け、つまみの位置で 1 台の電流計に R・S・T の電流を切り換えて出す。
 * S 相は R 相と T 相の CT の二次を合わせて流す（三相 3 線では I_S = −(I_R + I_T)）。
 * 電流計につながない CT の二次は、スイッチの中で短絡する（CT の二次を開放しないため）。
 *
 * 端子: R（R 相の CT の k）・T（T 相の CT の k）・N（2 台の CT の l の共通）・A1・A2（電流計へ）。
 * 経路は CT の二次の電流の回路なので信号（電源の有無は見ない）。位置ごとに閉じる a 接点（positions）で表す。
 */

const S = 96;
const BAND = 26;
const W = S;
const H = S + BAND;
const XS = [12, 30, 48, 66, 84];
const TY = H - 9;
const IDS = ['R', 'T', 'N', 'A1', 'A2'];

const svg = `${switchFace(S, 'AS', ['OFF', 'R', 'S', 'T'], 2)}
  ${rearTerminals(W, S, BAND, XS, IDS)}`;

const links: InternalLink[] = [
  // 電流計へ出す相
  { from: 'R', to: 'A1', switch: 'NO', positions: ['R', 'S'] },
  { from: 'T', to: 'A1', switch: 'NO', positions: ['S', 'T'] },
  // 電流計につながない CT の二次を短絡する
  { from: 'R', to: 'N', switch: 'NO', positions: ['OFF', 'T'] },
  { from: 'T', to: 'N', switch: 'NO', positions: ['OFF', 'R'] },
  // 電流計の帰りは CT の l の共通へ
  { from: 'A2', to: 'N' },
];

const def: DeviceDefinition = {
  type: 'generic.ammeter-switch.3p3w',
  name: '電流計切換スイッチ',
  model: 'AS 三相 3 線 CT 2 台用（OFF-R-S-T）',
  category: 'control',
  description:
    '1 台の交流電流計で三相の各相の電流を見るための切換スイッチ（AS、三相 3 線・CT 2 台用、OFF-R-S-T、汎用品）。R に R 相の CT の k、T に T 相の CT の k、N に 2 台の CT の l をつなぎ、A1・A2 を電流計の k・l へ。' +
    'S の位置では R 相と T 相の CT の二次を合わせて S 相の電流を出す。電流計につながない CT の二次はスイッチの中で短絡する。',
  labelPrefix: 'AS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'R', hint: 'R 相 CT k', note: 'R 相の CT の二次 k', x: XS[0], y: TY, side: 'bottom', role: 'signal' },
    { id: 'T', hint: 'T 相 CT k', note: 'T 相の CT の二次 k', x: XS[1], y: TY, side: 'bottom', role: 'signal' },
    { id: 'N', hint: 'CT l 共通', note: '2 台の CT の二次 l の共通', x: XS[2], y: TY, side: 'bottom', role: 'signal' },
    { id: 'A1', hint: '電流計 k', note: '電流計の k へ', x: XS[3], y: TY, side: 'bottom', role: 'signal' },
    { id: 'A2', hint: '電流計 l', note: '電流計の l へ', x: XS[4], y: TY, side: 'bottom', role: 'signal' },
  ],
  links,
  schematic: { actuator: 'selector' },
};

export default def;

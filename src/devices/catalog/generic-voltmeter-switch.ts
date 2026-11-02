import type { DeviceDefinition } from '../types';
import { rearTerminals, switchFace } from '../generic/meter';

/**
 * 電圧計切換スイッチ（VS、三相 3 線用、4 ノッチ OFF-RS-ST-TR のカムスイッチ。汎用品）。
 * R・S・T の 3 線を受け、つまみの位置で 1 台の電圧計に線間電圧 RS・ST・TR を切り換えて出す（V1・V2）。
 *
 * 電気チェックでは、R・S・T を受電端子（AC100〜440V、異相であること）として確かめ、
 * 位置 RS の経路（R → V1、S → V2）だけを内部経路に書いた。
 * ST・TR の経路も書くと、チェックで「すべての接点が閉じた状態」を作るときに V1 に R・S・T が同時につながり、
 * 主回路全体が短絡とみなされて電圧のチェックができなくなるため（簡略化）。
 */

const S = 96;
const BAND = 26;
const W = S;
const H = S + BAND;
const XS = [12, 30, 48, 66, 84];
const TY = H - 9;

const svg = `${switchFace(S, 'VS', ['OFF', 'RS', 'ST', 'TR'], 1)}
  ${rearTerminals(W, S, BAND, XS, ['R', 'S', 'T', 'V1', 'V2'])}`;

const accepts = { system: 'AC' as const, minVoltage: 90, maxVoltage: 440 };

const def: DeviceDefinition = {
  type: 'generic.voltmeter-switch.3p3w',
  name: '電圧計切換スイッチ',
  model: 'VS 三相 3 線（OFF-RS-ST-TR）',
  category: 'control',
  description:
    '1 台の交流電圧計で三相の線間電圧を見るための切換スイッチ（VS、三相 3 線用、OFF-RS-ST-TR、汎用品）。R・S・T をヒューズ・サーキットプロテクタを通した三相の各相に、V1・V2 を電圧計の P1・P2 へつなぐ。' +
    '電気チェックでは位置 RS（R → V1、S → V2）の経路だけを表す（ST・TR の位置は図面に描かない簡略化）。',
  labelPrefix: 'VS',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'R', hint: 'R 相', note: '三相の R 相（ヒューズ・CP を通して）', x: XS[0], y: TY, side: 'bottom', role: 'input', accepts },
    { id: 'S', hint: 'S 相', note: '三相の S 相（ヒューズ・CP を通して）', x: XS[1], y: TY, side: 'bottom', role: 'input', accepts },
    { id: 'T', hint: 'T 相', note: '三相の T 相（ヒューズ・CP を通して）', x: XS[2], y: TY, side: 'bottom', role: 'input', accepts },
    { id: 'V1', hint: '電圧計 P1', note: '電圧計の P1 へ', x: XS[3], y: TY, side: 'bottom', role: 'signal' },
    { id: 'V2', hint: '電圧計 P2', note: '電圧計の P2 へ', x: XS[4], y: TY, side: 'bottom', role: 'signal' },
  ],
  links: [
    { from: 'R', to: 'V1', switch: 'NO', positions: ['RS'] },
    { from: 'S', to: 'V2', switch: 'NO', positions: ['RS'] },
  ],
  distinctGroups: [['R', 'S', 'T']],
  schematic: { actuator: 'selector' },
};

export default def;

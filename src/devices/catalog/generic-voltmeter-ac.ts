import type { DeviceDefinition, ParamValues, TerminalDef } from '../types';
import { meterFace, rearTerminals } from '../generic/meter';

/**
 * 交流電圧計（直接入力、角形 80mm、可動鉄片形。汎用品）。
 * 目盛り 0〜150V（AC100V 回路）・0〜300V（AC200V 回路）・0〜600V（AC400V 回路）をパラメータで選ぶ。
 * 三相の線間電圧を 1 台で見るときは電圧計切換スイッチ（VS）を間に入れる。
 *
 * 端子は受電端子（role: 'input'）にし、目盛りの 1/3〜最大の電圧を受けられるとした（低すぎる・高すぎる回路につなぐと電圧の誤りとして指摘する）。
 * 計器の回路は短絡保護のためヒューズ・サーキットプロテクタを通すので、上流の保護がなければ指摘が出る。
 */

const S = 120;
const BAND = 26;
const W = S;
const H = S + BAND;
const TX = [40, 80];
const TY = H - 9;

const svg = (p: ParamValues) => `${meterFace(S, 'V', Number(p.scale), `${Number(p.scale) / 1.5}V 回路`)}
  ${rearTerminals(W, S, BAND, TX, ['P1', 'P2'])}`;

const terminal = (id: string, x: number) => (p: ParamValues): TerminalDef => ({
  id,
  hint: '電圧入力',
  note: `電圧入力（AC${Math.round(Number(p.scale) / 3)}〜${p.scale}V）`,
  x,
  y: TY,
  side: 'bottom',
  role: 'input',
  accepts: { system: 'AC', minVoltage: Math.round(Number(p.scale) / 3), maxVoltage: Number(p.scale) },
});

const def: DeviceDefinition = {
  type: 'generic.voltmeter.ac',
  name: '交流電圧計',
  model: '交流電圧計 角形 80',
  modelOf: (p) => `交流電圧計 0-${p.scale}V`,
  category: 'control',
  description:
    '盤の扉に付ける交流電圧計（角形 80mm、可動鉄片形、汎用品、直接入力）。目盛り 0〜150V（AC100V 回路）・0〜300V（AC200V 回路）・0〜600V（AC400V 回路）をパラメータで選ぶ。' +
    '端子 P1・P2 を、ヒューズ・サーキットプロテクタを通した回路（三相なら電圧計切換スイッチの V1・V2）につなぐ。消費は約 3VA（代表値）。',
  labelPrefix: 'VM',
  width: W,
  height: H,
  svg,
  terminals: (p) => [terminal('P1', TX[0])(p), terminal('P2', TX[1])(p)],
  params: [
    {
      key: 'scale',
      label: '目盛り',
      unit: 'V',
      options: [
        { value: 150, label: '0〜150V（AC100V 回路）' },
        { value: 300, label: '0〜300V（AC200V 回路）' },
        { value: 600, label: '0〜600V（AC400V 回路）' },
      ],
      default: 300,
    },
  ],
  distinctGroups: [['P1', 'P2']],
  loadCurrent: 0.015,
};

export default def;

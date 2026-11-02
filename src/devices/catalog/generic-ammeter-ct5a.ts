import type { DeviceDefinition, ParamValues } from '../types';
import { meterFace, rearTerminals } from '../generic/meter';

/**
 * 交流電流計（CT 二次 5A 入力、角形 80mm、可動鉄片形。汎用品）。
 * 変流器（CT）の二次 5A を受けて、目盛りは CT の一次の電流で読む（CT 100/5A なら 0〜100A）。
 * 盤の扉に付け、主幹・モーターの回路の電流を見る。三相の各相を 1 台で見るときは電流計切換スイッチ（AS）を間に入れる。
 *
 * 電気的には CT の二次の電流の回路（k・l）なので、端子は信号（role: 'signal'）にし、電源の有無は見ない。
 */

const S = 120;
const BAND = 26;
const W = S;
const H = S + BAND;
const TX = [40, 80];
const TY = H - 9;

const SCALES = [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 400];

const svg = (p: ParamValues) => {
  const max = Number(p.scale);
  return `${meterFace(S, 'A', max, `CT ${max}/5A`)}
  ${rearTerminals(W, S, BAND, TX, ['k', 'l'])}`;
};

const def: DeviceDefinition = {
  type: 'generic.ammeter.ct5a',
  name: '交流電流計',
  model: '交流電流計 角形 80 CT 二次 5A',
  modelOf: (p) => `交流電流計 0-${p.scale}A（CT ${p.scale}/5A）`,
  category: 'control',
  description:
    '盤の扉に付ける交流電流計（角形 80mm、可動鉄片形、汎用品）。変流器（CT）の二次 5A をつなぎ、目盛りは CT の一次の電流で読む。目盛り（CT の変流比）はパラメータで選ぶ。' +
    '端子 k・l を CT の二次の k・l に（電流計切換スイッチを使うときは AS の A1・A2 に）つなぐ。CT の二次は開放しない。',
  labelPrefix: 'AM',
  width: W,
  height: H,
  svg,
  terminals: [
    { id: 'k', hint: '電流 k', note: 'CT の二次 k（または電流計切換スイッチの A1）から', x: TX[0], y: TY, side: 'bottom', role: 'signal' },
    { id: 'l', hint: '電流 l', note: 'CT の二次 l（または電流計切換スイッチの A2）へ', x: TX[1], y: TY, side: 'bottom', role: 'signal' },
  ],
  params: [
    {
      key: 'scale',
      label: '目盛り（CT の変流比）',
      unit: 'A',
      options: SCALES.map((v) => ({ value: v, label: `0〜${v}A（CT ${v}/5A）` })),
      default: 100,
    },
  ],
};

export default def;

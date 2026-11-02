/**
 * サージキラー（サージ吸収素子。電磁接触器・リレー・電磁弁のコイルに並列に付けて、切ったときのサージ電圧を吸収する。汎用品）の機器定義を作る。
 * - CR 形: コンデンサと抵抗の直列（極性なし、AC・DC どちらのコイルにも使える）。代表値 0.5μF + 120Ω、AC/DC 250V
 * - ダイオード形: DC のコイル専用。カソード（+）をコイルの + 側、アノード（−）を − 側につなぐ（逆につなぐと電源を短絡する）
 *
 * 2 本のリード線の先（丸形圧着端子）を端子にする。電気チェックでは受電端子（消費電流なし）として、電源の種類・電圧・極性を確かめる。
 */
import type { DeviceDefinition } from '../types';
import { text } from './parts';

const W = 64;
const H = 72;
const T1 = { x: 14, y: 6 };
const T2 = { x: 50, y: 6 };

/** リード線と丸形圧着端子 */
const lead = (x: number, color: string) => `
  <path d="M${x} 12 V40" stroke="${color}" stroke-width="2.6" stroke-linecap="round"/>
  <circle cx="${x}" cy="6" r="4.6" fill="none" stroke="#b9bdc2" stroke-width="2.4"/>
  <rect x="${x - 2.2}" y="9" width="4.4" height="6" rx="1" fill="#b9bdc2"/>
  <rect x="${x - 2.6}" y="14" width="5.2" height="5" rx="1" fill="${color === '#222' ? '#c33' : '#3b6fd6'}"/>`;

export function buildSurgeKiller(kind: 'cr' | 'diode'): DeviceDefinition {
  const cr = kind === 'cr';
  const body = cr
    ? `
  <rect x="6" y="36" width="${W - 12}" height="30" rx="4" fill="#1d4f9c" stroke="#0d2a57" stroke-width="0.8"/>
  ${text(W / 2, 47, 'CR', 6, '#fff')}
  ${text(W / 2, 55, '0.5μF+120Ω', 4, '#e6ecf7', 'normal')}
  ${text(W / 2, 62, 'AC/DC 250V', 3.8, '#e6ecf7', 'normal')}`
    : `
  <rect x="6" y="36" width="${W - 12}" height="30" rx="4" fill="#26282b" stroke="#000" stroke-width="0.8"/>
  <path d="M${W / 2 - 10} 47 H${W / 2 - 3} M${W / 2 + 4} 47 H${W / 2 + 11} M${W / 2 + 4} 42 L${W / 2 - 3} 47 L${W / 2 + 4} 52 Z M${W / 2 - 3} 42 V52" stroke="#eee" stroke-width="1" fill="#eee"/>
  ${text(W / 2, 61, 'DIODE DC', 4.2, '#eee', 'normal')}
  ${text(T1.x + 8, 32, '+', 6, '#c33')}
  ${text(T2.x - 8, 32, '−', 6, '#3b6fd6')}`;
  const svg = `
  ${lead(T1.x, '#222')}
  ${lead(T2.x, cr ? '#222' : '#555')}
  ${body}`;

  const crAccepts = [
    { system: 'AC' as const, minVoltage: 0, maxVoltage: 250 },
    { system: 'DC' as const, minVoltage: 0, maxVoltage: 250 },
  ];
  return {
    type: cr ? 'generic.surge-killer.cr' : 'generic.surge-killer.diode',
    name: cr ? 'サージキラー（CR）' : 'サージキラー（ダイオード）',
    model: cr ? 'サージキラー CR 0.5μF+120Ω AC/DC250V' : 'サージキラー ダイオード DC',
    category: 'control',
    description: cr
      ? 'CR 形のサージキラー（汎用品、0.5μF + 120Ω、AC/DC 250V）。電磁接触器・リレー・電磁弁のコイルの両端（A1-A2 など）に並列につなぎ、コイルを切ったときのサージ電圧を吸収して接点・PLC の出力を守る。極性はない。'
      : 'ダイオード形のサージキラー（汎用品、DC コイル専用）。DC のリレー・電磁弁・電磁接触器のコイルに並列につなぐ。+（カソード）をコイルの + 側、−（アノード）を − 側へ。逆につなぐとコイルの電源を短絡する。コイルの復帰が少し遅れる。',
    labelPrefix: 'SK',
    width: W,
    height: H,
    svg,
    terminals: cr
      ? [
          { id: '1', hint: 'コイル側', note: 'コイルの一方の端子へ（極性なし）', x: T1.x, y: T1.y, side: 'top', role: 'input', accepts: crAccepts },
          { id: '2', hint: 'コイル側', note: 'コイルのもう一方の端子へ（極性なし）', x: T2.x, y: T2.y, side: 'top', role: 'input', accepts: crAccepts },
        ]
      : [
          { id: '+', label: '+（K）', hint: 'カソード', note: 'カソード。コイルの + 側へ', x: T1.x, y: T1.y, side: 'top', role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 250, conductors: ['+'] } },
          { id: '-', label: '−（A）', hint: 'アノード', note: 'アノード。コイルの − 側へ', x: T2.x, y: T2.y, side: 'top', role: 'input', accepts: { system: 'DC', minVoltage: 0, maxVoltage: 250, conductors: ['-'] } },
        ],
  };
}

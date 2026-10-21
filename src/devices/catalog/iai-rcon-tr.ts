import { MM, n2, text } from '../iai/parts';
import { RCON_H, rconDefs, rconUnitBus } from '../iai/rcon';
import type { DeviceDefinition, ParamValues } from '../types';

/**
 * IAI R-unit のターミナルユニット RCON-GW-TR（24V 用）/ RCON-GW-TRS（200V 用）。連結の右端に付けるふた。
 * 出典: 取扱説明書 MJ0384「3.1 ゲートウェイユニット、ターミナルユニット」「3.3 200V 用ターミナルユニット」。W12.8 × H115mm。
 * 端子はない。200V ドライバーユニットを連結する場合は必ず TRS を使う（24V 用は 200V ユニットに連結できない構造）。
 */

const W = n2(12.8 * MM);

const def: DeviceDefinition = {
  type: 'iai.rcon-tr',
  name: 'R-unit ターミナルユニット',
  model: 'RCON-GW-TR',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の R-unit（RCON・RSEL・REC）の連結の右端に付けるターミナルユニット（端子なし）。24V 用 RCON-GW-TR はゲートウェイユニットに付属、200V ドライバーユニットを連結する場合は 200V 電源ユニットに付属の RCON-GW-TRS を使う。',
  labelPrefix: 'TR',
  width: W,
  height: RCON_H,
  svg: (p: ParamValues) => `
  ${rconDefs()}
  <path d="M1 3 H${n2(W - 3)} Q${n2(W - 0.5)} 3 ${n2(W - 0.5)} 8 V${n2(RCON_H - 8)} Q${n2(W - 0.5)} ${n2(RCON_H - 3)} ${n2(W - 3)} ${n2(RCON_H - 3)} H1 Z" fill="url(#rcbody-{{uid}})" stroke="#9a9588" stroke-width="0.7"/>
  ${[0, 1, 2, 3].map((i) => `<rect x="4" y="${n2(30 + i * 9)}" width="${n2(W - 9)}" height="4" rx="1" fill="#d7d2c4"/>`).join('')}
  ${text(W / 2, 86, 'IAI', 6, '#a9a497', 'middle', 'bold', ` font-style="italic" transform="rotate(-90 ${n2(W / 2)} 86)"`)}
  ${text(W / 2, RCON_H - 12, String(p.model ?? 'TR') === 'TRS' ? 'TRS' : 'TR', 2.6, '#3a3c40', 'middle', 'bold')}`,
  terminals: [],
  params: [
    {
      key: 'model',
      label: '種類',
      options: [
        { value: 'TR', label: 'RCON-GW-TR（24V 用）' },
        { value: 'TRS', label: 'RCON-GW-TRS（200V 用）' },
      ],
      default: 'TR',
    },
  ],
  bus: rconUnitBus({}),
};

export default def;

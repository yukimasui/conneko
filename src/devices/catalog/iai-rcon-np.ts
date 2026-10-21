import { hif6Connector, hif6HeaderV, iaiDefs, MM, n2, text } from '../iai/parts';
import { pioLinks, pioPins, selPio40 } from '../iai/pio';
import { DRIVER_W, ledLabel, RCON_H, rconBody, rconDefs, rconUnitBus } from '../iai/rcon';
import type { DeviceDefinition, ParamValues } from '../types';

/**
 * IAI R-unit の PIO ユニット RCON-NP / RCON-PN（入力 16 点・出力 16 点の拡張 I/O）。
 *
 * 出典: 取扱説明書 MJ0384「3.5 SCON 拡張ユニット、PIO/SIO/SCON 拡張ユニット、PIO ユニット」（PIO コネクター HIF6-40PA-1.27DS、
 *       ピン配置: 1A・2A P24、5A〜20A IN0〜15、1B〜16B OUT0〜15、19B・20B N。入力 4mA/点、出力 50mA/点）。
 * ゲートウェイユニット（RSEL では入出力ポートとして、RCON ではフィールドネットワークのデータとして使う）の右に連結する。
 * 幅は 24V ドライバーユニットと同じ 22.6mm と仮定した。入出力の名前はユニット内の番号（IN000〜IN015、OUT000〜OUT015）。
 */

const pol = (p: ParamValues) => (String(p.model ?? 'NP') === 'PN' ? 'pnp' : 'npn');
const pts = () => selPio40('PIO', 0, 0);
const PIO = { x: n2(11.3 * MM), y: n2(45 * MM) };

const def: DeviceDefinition = {
  type: 'iai.rcon-np',
  name: 'R-unit PIO ユニット',
  model: 'RCON-NP/PN',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の R-unit（RCON・RSEL）の PIO ユニット（入力 16 点・出力 16 点、NPN の RCON-NP / PNP の RCON-PN）。ゲートウェイユニットの右に連結し、40 極 PIO コネクター（HIF6）に PIO ケーブル CB-PAC-PIO をつなぐ。' +
    '1A・2A に I/O 用 +24V、19B・20B に 0V を供給する。NPN 仕様の入力はプラスコモン、出力は NPN（50mA/点）。制御電源の消費 0.1A。',
  labelPrefix: 'PIO',
  width: DRIVER_W,
  height: RCON_H,
  svg: (p) => `
  ${rconDefs()}
  ${rconBody(DRIVER_W, String(p.model ?? 'NP') === 'PN' ? 'RCON-PN' : 'RCON-NP', '#9aa0a6')}
  ${ledLabel(n2(16 * MM), n2(11 * MM), 'T RUN', 'g', 'end')}${ledLabel(n2(16 * MM), n2(14 * MM), 'STS', 'g', 'end')}
  ${iaiDefs(['#ece8dc', '#d9d5c8'])}
  ${hif6HeaderV(PIO.x, PIO.y, 40)}
  ${text(n2(19 * MM), n2(45.5 * MM), 'PIO', 2, '#3a3c40', 'start')}
  ${text(n2(11.3 * MM), n2(72 * MM), String(p.model ?? 'NP') === 'PN' ? 'PNP' : 'NPN', 2.6, '#3a3c40', 'middle', 'bold')}`,
  terminals: [
    {
      id: 'PIO',
      label: 'PIO（40極 HIF6）',
      note: 'PIO コネクター。PIO ケーブル CB-PAC-PIO（片側バラ線）でつなぐ',
      x: PIO.x,
      y: PIO.y,
      side: 'left',
      role: 'connector',
      connector: hif6Connector(40),
      optional: true,
    },
  ],
  pins: (p) => pioPins(pts(), pol(p)),
  links: (p) => pioLinks(pts(), pol(p), 0.05),
  params: [
    {
      key: 'model',
      label: '型式',
      options: [
        { value: 'NP', label: 'RCON-NP（NPN）' },
        { value: 'PN', label: 'RCON-PN（PNP）' },
      ],
      default: 'NP',
    },
  ],
  bus: rconUnitBus({ CP: 0.1 }),
};

export default def;

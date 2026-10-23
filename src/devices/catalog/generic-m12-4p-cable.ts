import type { DeviceDefinition, InternalLink, PinDef } from '../types';
import { ROUND_PIN_COLORS, WIRE_HEX, cablePlug, roundConnector, sensorCable } from '../keyence/sensor-parts';

/**
 * センサー用コネクタケーブル（片側コネクタ・片側バラ線、汎用品）。M12 4 ピン A コード、ストレート型のメス。
 * センサー側の M12 コネクタ（オス）に差し、反対側の芯線（茶・白・青・黒）を端子台や PLC の入力へつなぐ。
 *
 * 芯線の色は IEC 60947-5-2 の標準（ピン 1 茶・2 白・3 青・4 黒）。端子ID は色略号（BN / WH / BU / BK）。
 * 図はコネクタを上にした姿で、ケーブルが下へ伸びて先端で芯線に分かれる。
 * M8 4 ピン版（generic.m8-4p-cable）もこのファイルの buildRoundCable で作る。
 */

export function buildRoundCable(size: 'M12' | 'M8'): DeviceDefinition {
  const W = 60;
  const H = 150;
  const CX = 30;
  const TOP = 6;
  const plug = cablePlug(CX, TOP, size);
  const leads = ROUND_PIN_COLORS.map((color, i) => ({
    color,
    label: `（${size} ピン${i + 1}）`,
    role: 'pass' as const,
  }));
  const cable = sensorCable({ cx: CX, y0: plug.y1, yFan: 112, yEnd: 146, pitch: 11, vmin: 0, vmax: 30, leads });
  const pins: PinDef[] = ROUND_PIN_COLORS.map((c, i) => ({
    id: `CN#${i + 1}`,
    label: `${i + 1} ${WIRE_HEX[c].name}`,
    role: 'pass',
    optional: true,
  }));
  const links: InternalLink[] = ROUND_PIN_COLORS.map((c, i) => ({ from: `CN#${i + 1}`, to: c }));
  return {
    type: size === 'M12' ? 'generic.m12-4p-cable' : 'generic.m8-4p-cable',
    name: 'センサー用コネクタケーブル（片側バラ線）',
    model: `${size} 4ピン ストレート`,
    category: 'sensor',
    cable: true,
    description:
      `センサー用の ${size} 4 ピン（A コード）コネクタケーブル。片側はストレート型のメスコネクタ（CN）、もう片側はバラ線。` +
      'センサー側のオスコネクタとケーブルでつなぎ、芯線をネジ端子台・PLC の入力につなぐ。芯線の色はピン 1 茶（+V）・2 白・3 青（0V）・4 黒（IEC 60947-5-2 の標準）。' +
      'コネクタのピン n と同じ色の芯線が導通する。',
    labelPrefix: 'CBL',
    width: W,
    height: H,
    svg: `${plug.svg}${cable.svg}
  <text x="${CX + 9}" y="${TOP + 14}" font-family="sans-serif" font-size="3.4" fill="#444">${size}</text>`,
    terminals: (p) => [
      { id: 'CN', label: `${size} 4ピン コネクタ（メス）`, x: CX, y: TOP, side: 'top', role: 'connector', connector: roundConnector(size) },
      ...cable.terminals(p),
    ],
    pins,
    links,
  };
}

export default buildRoundCable('M12');

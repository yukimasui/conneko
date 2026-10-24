import { buildRelaySocket, cContact, type SocketTerminal } from '../generic/relay-socket';

/**
 * IDEC スリムパワーリレー RJ2S-CL-D24（RJ シリーズ、2 極 c 接点、LED 表示付き、コイル DC24V）を
 * DIN レール用ソケット SJ2S-07L（フィンガーセーフ、15.5 × 71mm）に挿した状態。
 * ソケットは長い辺を縦にして（DIN レールに取り付けた向き）、コイル端子の側を下にして描く（1mm ≒ 2px、幅は少し広げる）。
 *
 * 端子（IDEC カタログ RJ シリーズ「SJ2S-07L (TOP VIEW)」。番号と括弧の中の EN 番号を印字）:
 *   コイル 1(A1)・8(A2)、極 1 = COM 3(11)・NC 2(12)・NO 4(14)、極 2 = COM 6(21)・NC 7(22)・NO 5(24)
 *   上面図の上の列（8・5・7・6）を左の列、下の列（1・4・2・3）を右の列にして描く。
 * CL 形の LED は逆並列で無極性（極性があるのは -CD・-CLD 形）。
 */

const L = 10;
const R = 26;

const t = (id: string, en: string, x: number, y: number, side: SocketTerminal['side'], note: string, coil?: 'any'): SocketTerminal => ({
  id,
  print: `${id}(${en})`,
  x,
  y,
  side,
  note,
  ...(coil ? { coil } : {}),
});

export default buildRelaySocket({
  type: 'idec.rj2s-cl-d24',
  name: 'スリムリレー（2c、ソケット付き）',
  model: 'RJ2S-CL-D24 + SJ2S-07L',
  maker: 'IDEC',
  description:
    'IDEC のスリムパワーリレー RJ シリーズ RJ2S-CL-D24（2 極 c 接点、LED 表示付き、コイル DC24V 25.7mA）を DIN レール用ソケット SJ2S-07L に挿した状態。' +
    'コイル 1(A1)・8(A2)（CL 形は極性なし）。極 1 は COM 3(11)・NC 2(12)・NO 4(14)、極 2 は COM 6(21)・NC 7(22)・NO 5(24)。' +
    '接点定格 AC250V 8A（抵抗負荷）、開閉電圧の上限 AC250V / DC30V。',
  labelPrefix: 'CR',
  width: 36,
  height: 150,
  socketTop: 2,
  socketBottom: 148,
  socketColor: { edge: '#161718', mid: '#2c2e30' },
  seat: '#0b0b0c',
  ink: '#f2f2f2',
  terminals: [
    t('6', '21', L, 14, 'left', '極 2 の COM（6-7 が b 接点、6-5 が a 接点）'),
    t('7', '22', L, 34, 'left', '極 2 の NC（b 接点 6-7）'),
    t('5', '24', L, 54, 'left', '極 2 の NO（a 接点 6-5）'),
    t('8', 'A2', L, 138, 'bottom', 'コイル A2（極性なし）', 'any'),
    t('3', '11', R, 14, 'right', '極 1 の COM（3-2 が b 接点、3-4 が a 接点）'),
    t('2', '12', R, 34, 'right', '極 1 の NC（b 接点 3-2）'),
    t('4', '14', R, 54, 'right', '極 1 の NO（a 接点 3-4）'),
    t('1', 'A1', R, 138, 'bottom', 'コイル A1（極性なし）', 'any'),
  ],
  labelOffset: (x) => (x.y < 100 ? { dx: 0, dy: 10 } : { dx: 0, dy: -7 }),
  relay: { x: 4, y: 68, w: 28, h: 56, cover: 'clear', lines: ['RJ2S', 'DC24V'], poles: 2, textTop: 0.3, led: { x: 27, y: 73, color: '#ff4a3a' } },
  // 動作電圧 70% 以下、許容電圧 170%（RJ シリーズ カタログ）
  coil: { system: 'DC', minVoltage: 16.8, maxVoltage: 40.8 },
  // 接点定格 AC250V 8A（抵抗負荷）
  links: [...cContact('3', '2', '4', 8), ...cContact('6', '7', '5', 8)],
  loadCurrent: 0.0257,
  socketName: 'SJ2S-07L',
});

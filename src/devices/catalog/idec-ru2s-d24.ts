import { buildRelaySocket, cContact, type SocketTerminal } from '../generic/relay-socket';

/**
 * IDEC 汎用リレー RU2S-D24（RU シリーズ、2 極 c 接点、LED 表示・動作表示付き、コイル DC24V）を DIN レール用ソケット SM2S-05 に挿した状態。
 * ソケットは 幅30 × 高さ62mm（1mm ≒ 2px）。端子の並び（IDEC カタログ「SM2S-05 Terminal Arrangement (Top View)」）:
 *   上から [8, 5] / [4, 1] / リレー / [14, 13] / [12, 9]
 * 端子番号（RU シリーズ データシート）: 極 1 = COM 9・NC 1・NO 5、極 2 = COM 12・NC 4・NO 8、コイル 13(A1)・14(A2)。
 * 標準品の LED は無極性（極性があるのはダイオード付きの -D 形: 13 が −、14 が +）。
 */

const L = 14;
const R = 46;

const NOTES: Record<string, string> = {
  '9': '極 1 の COM（9-1 が b 接点、9-5 が a 接点）',
  '1': '極 1 の NC（b 接点 9-1）',
  '5': '極 1 の NO（a 接点 9-5）',
  '12': '極 2 の COM（12-4 が b 接点、12-8 が a 接点）',
  '4': '極 2 の NC（b 接点 12-4）',
  '8': '極 2 の NO（a 接点 12-8）',
  '13': 'コイル A1（極性なし）',
  '14': 'コイル A2（極性なし）',
};

const t = (id: string, x: number, y: number, side: SocketTerminal['side']): SocketTerminal => ({
  id,
  x,
  y,
  side,
  note: NOTES[id],
  ...(id === '13' || id === '14' ? { coil: 'any' as const } : {}),
});

export default buildRelaySocket({
  type: 'idec.ru2s-d24',
  name: 'リレー（2c、ソケット付き）',
  model: 'RU2S-D24 + SM2S-05',
  maker: 'IDEC',
  description:
    'IDEC の汎用リレー RU シリーズ RU2S-D24（2 極 c 接点、LED 表示・動作表示付き、コイル DC24V 41.7mA）を DIN レール用ソケット SM2S-05 に挿した状態。' +
    'コイル 13(A1)・14(A2)（標準品は極性なし）。極 1 は COM 9・NC 1・NO 5、極 2 は COM 12・NC 4・NO 8（端子番号はオムロン MY と同じ並び）。' +
    '接点定格 AC240V / DC30V 10A（抵抗負荷）。',
  labelPrefix: 'CR',
  width: 60,
  height: 126,
  socketTop: 2,
  socketBottom: 124,
  socketColor: { edge: '#161718', mid: '#2c2e30' },
  seat: '#0b0b0c',
  ink: '#f2f2f2',
  terminals: [t('8', L, 13, 'top'), t('5', R, 13, 'top'), t('4', L, 32, 'left'), t('1', R, 32, 'right'), t('14', L, 93, 'left'), t('13', R, 93, 'right'), t('12', L, 112, 'bottom'), t('9', R, 112, 'bottom')],
  labelOffset: (x) => (x.y < 20 ? { dx: 0, dy: 10.5 } : x.y < 60 ? { dx: 0, dy: 10.5 } : x.y < 100 ? { dx: 0, dy: -7 } : { dx: 0, dy: -7 }),
  relay: { x: 6, y: 46, w: 48, h: 37, cover: 'clear', lines: ['IDEC RU2S', 'DC24V'], poles: 2, textTop: 0.3, led: { x: 48, y: 51, color: '#ff4a3a' } },
  // 動作電圧 80% 以下。上限は 110% とした（推定）
  coil: { system: 'DC', minVoltage: 19.2, maxVoltage: 26.4 },
  // 接点定格 AC240V / DC30V 10A（抵抗負荷）
  links: [...cContact('9', '1', '5', 10), ...cContact('12', '4', '8', 10)],
  loadCurrent: 0.0417,
  socketName: 'SM2S-05',
  estimated: 'コイル電圧の上限（定格の 110%）は推定。ソケット上の端子の位置は端子配置図からの読み取り',
});

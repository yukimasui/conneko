import { buildRelaySocket, cContact, type SocketTerminal } from '../generic/relay-socket';

/**
 * IDEC 汎用リレー RU4S-D24（RU シリーズ、4 極 c 接点、LED 表示・動作表示付き、コイル DC24V）を DIN レール用ソケット SY4S-05 に挿した状態。
 * 端子番号（14 ピンのリレーの標準の並び）: 極 n（1〜4）= COM 8+n・NC n・NO 4+n、コイル 13(A1)・14(A2)。
 * コイル DC24V 44.7mA（コイル抵抗 605Ω）、動作電圧 19.2V 以下。接点定格 AC250V / DC30V 6A（抵抗負荷。隣り合う極の合計も 6A 以下）。
 * ソケット SY4S-05 の端子の位置は、SM2S-05 と同じ考え方（上 2 段に NO・NC、リレーの下にコイル、最下段に COM）で並べた推定。
 */

const COL = [12, 26, 40, 54];

const NOTES: Record<string, string> = {
  '13': 'コイル A1（極性なし）',
  '14': 'コイル A2（極性なし）',
};
for (let n = 1; n <= 4; n++) {
  NOTES[String(8 + n)] = `極 ${n} の COM（${8 + n}-${n} が b 接点、${8 + n}-${4 + n} が a 接点）`;
  NOTES[String(n)] = `極 ${n} の NC（b 接点 ${8 + n}-${n}）`;
  NOTES[String(4 + n)] = `極 ${n} の NO（a 接点 ${8 + n}-${4 + n}）`;
}

const t = (id: string, x: number, y: number, side: SocketTerminal['side']): SocketTerminal => ({
  id,
  x,
  y,
  side,
  note: NOTES[id],
  ...(id === '13' || id === '14' ? { coil: 'any' as const } : {}),
});

export default buildRelaySocket({
  type: 'idec.ru4s-d24',
  name: 'リレー（4c、ソケット付き）',
  model: 'RU4S-D24 + SY4S-05',
  maker: 'IDEC',
  description:
    'IDEC の汎用リレー RU シリーズ RU4S-D24（4 極 c 接点、LED 表示・動作表示付き、コイル DC24V 44.7mA）を DIN レール用ソケット SY4S-05 に挿した状態。' +
    'コイル 13(A1)・14(A2)（標準品は極性なし）。極 n（1〜4）は COM 8+n・NC n・NO 4+n（極 1 は 9-1 が b 接点、9-5 が a 接点。オムロン MY4N と同じ番号）。' +
    '接点定格 AC250V / DC30V 6A（抵抗負荷。隣り合う極の電流の合計も 6A 以下）。',
  labelPrefix: 'CR',
  width: 66,
  height: 126,
  socketTop: 2,
  socketBottom: 124,
  socketColor: { edge: '#161718', mid: '#2c2e30' },
  seat: '#0b0b0c',
  ink: '#f2f2f2',
  terminals: [
    ...['8', '7', '6', '5'].map((id, i) => t(id, COL[i], 13, i === 0 ? 'left' : i === 3 ? 'right' : 'top')),
    ...['4', '3', '2', '1'].map((id, i) => t(id, COL[i], 32, i === 0 ? 'left' : i === 3 ? 'right' : 'top')),
    t('14', COL[0], 93, 'left'),
    t('13', COL[3], 93, 'right'),
    ...['12', '11', '10', '9'].map((id, i) => t(id, COL[i], 112, i === 0 ? 'left' : i === 3 ? 'right' : 'bottom')),
  ],
  labelOffset: (x) => (x.y < 60 ? { dx: 0, dy: 10.5 } : { dx: 0, dy: -7 }),
  relay: { x: 6, y: 46, w: 54, h: 37, cover: 'clear', lines: ['IDEC RU4S', 'DC24V'], poles: 4, textTop: 0.3, led: { x: 54, y: 51, color: '#ff4a3a' } },
  // 動作電圧 80%（19.2V）以下。上限は RU2S と同じく 110% とした（推定）
  coil: { system: 'DC', minVoltage: 19.2, maxVoltage: 26.4 },
  // 接点定格 AC250V / DC30V 6A（抵抗負荷）
  links: [1, 2, 3, 4].flatMap((n) => cContact(String(8 + n), String(n), String(4 + n), 6)),
  loadCurrent: 0.0447,
  socketName: 'SY4S-05',
  estimated: 'ソケット SY4S-05 の外形と端子の位置、コイル電圧の上限（定格の 110%）は推定',
});

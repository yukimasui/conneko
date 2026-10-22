import { buildMsT20Frame } from './mitsubishi-s-t20';

/**
 * 三菱電機 直流操作形電磁接触器 SD-T20（MS-T シリーズ、操作コイル DC24V、補助接点 1a1b 標準）。
 * 外形は 幅44 × 高さ75 × 奥行100mm（1mm ≒ 2px）。正面の端子配列は S-T20 / SD-T12 と同じ（カタログ L(NA)02030ENG-K p.20・p.63）。
 * 操作コイルは極性あり（A1 が +、A2 が −）。
 */
export default buildMsT20Frame({
  type: 'mitsubishi.sd-t20.dc24v',
  modelName: 'SD-T20',
  coil: 'DC24V',
  ac3Current: 18,
  // コイル消費電力 2.2W / 24V（DC12V・DC24V コイル）
  coilCurrent: 0.092,
  description:
    '三菱電機 MS-T シリーズの直流操作形電磁接触器（AC-3 220〜240V 4.5kW / 18A、コイル DC24V 2.2W）。PLC の DC24V トランジスタ出力（0.1A 以上）で直接駆動できる。' +
    'A1(+)-A2(−) に DC24V を加えると主接点 3 極と補助 a 接点 13-14 が閉じ、補助 b 接点 21-22（ミラー接点）が開く。コイルは極性あり。組み合わせるサーマルリレーは TH-T18。',
});

import { buildMsT21Frame } from './mitsubishi-s-t21';

/**
 * 三菱電機 電磁接触器 S-T25（MS-T シリーズ、操作コイル AC200V、補助接点 2a2b 標準）。
 * 外形・端子配列は S-T21 と同じ 幅63 × 高さ81 × 奥行81mm（カタログ L(NA)02030ENG-K p.58）。
 */
export default buildMsT21Frame({
  type: 'mitsubishi.s-t25.ac200v',
  modelName: 'S-T25',
  ac3Current: 30,
  description:
    '三菱電機 MS-T シリーズの電磁接触器（AC-3 220〜240V 7.5kW / 30A、操作コイル AC200V: 200〜240V）。S-T21 と同じ外形で容量が大きい。' +
    'A1-A2 にコイル電圧を加えると主接点 3 極と補助 a 接点 13-14・43-44 が閉じ、補助 b 接点 21-22・31-32（ミラー接点）が開く。組み合わせるサーマルリレーは TH-T25。',
});

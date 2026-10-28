import { buildMsTMid } from '../mitsubishi/ms-t-mid';

/**
 * 三菱電機 電磁接触器 S-T50（MS-T シリーズ中容量、操作コイル AC200V、補助接点 2a2b 標準）。
 * 定格使用電流 AC-3 220V 50A（三菱電機の形式一覧）。外形は S-T35 と同じ 75×89mm（比較表）、補助接点 2a2b。
 * 作りは src/devices/mitsubishi/ms-t-mid.ts（端子 ID は S-T21 と同じ）。
 */
export default buildMsTMid({
  type: 'mitsubishi.s-t50.ac200v',
  modelName: 'S-T50',
  ac3Current: 50,
  widthMm: 75,
  heightMm: 89,
  holdVA: 10,
  description:
    '三菱電機 MS-T シリーズの中容量の電磁接触器（AC-3 220V 50A、操作コイル AC200V: 200〜240V、補助接点 2a2b）。モーター・ヒーターなど大きな負荷の主回路の開閉に使う。' +
    'A1-A2 にコイル電圧を加えると主接点 3 極と補助 a 接点 13-14・43-44 が閉じ、補助 b 接点 21-22・31-32（ミラー接点）が開く。',
  estimated: '外形（S-T35 と同じとした）、コイル保持 10VA（S-T35 と同じとした）、補助接点の端子番号と位置、主回路・コイル端子の位置は推定',
});

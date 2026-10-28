import { buildMsoT } from '../mitsubishi/mso-t';
import contactor from './mitsubishi-s-t20';
import thermal from './mitsubishi-th-t18';

/**
 * 三菱電機 電磁開閉器 MSO-T20（盤組込用、操作コイル AC200V）。電磁接触器 S-T20（補助接点 1a1b）にサーマルリレー TH-T18 を直結したもの。
 * 主接点の定格（AC-3）は電磁接触器 S-T20 の定義と同じ。作りは src/devices/mitsubishi/mso-t.ts（端子 ID は S-T・TH-T と同じ）。
 */
export default buildMsoT({
  type: 'mitsubishi.mso-t20.ac200v',
  modelName: 'MSO-T20',
  contactor,
  thermal,
  pinTopY: 3,
  description:
    '三菱電機の盤組込用の電磁開閉器 MSO-T20（電磁接触器 S-T20 AC200V にサーマルリレー TH-T18 を直結。補助接点 1a1b）。' +
    'A1-A2 にコイル電圧を加えると主接点が閉じ、モーターの過負荷ではサーマルリレーの 95-96(b) が開き 97-98(a) が閉じる。' +
    'ヒーター呼び（整定電流）をモーターの定格電流に合わせて選ぶ。上の 1/L1・3/L2・5/L3 が電源側、下の 2/T1・4/T2・6/T3 がモーター側。',
});

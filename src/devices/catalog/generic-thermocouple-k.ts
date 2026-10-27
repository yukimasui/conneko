import { buildTempSensor } from '../generic/temp-sensor';

/**
 * 汎用の K 熱電対（シース形、リード線引出し）。作りは src/devices/generic/temp-sensor.ts
 *
 * 出典: JIS C 1610:2012（IEC 60584-3 と同じ色）の K 熱電対・補償導線の色: + 脚 緑、− 脚 白、シース 緑。
 *   旧 JIS の色は + 赤、− 白、シース 青（販売店の補償導線の説明で確認）。
 */
export default buildTempSensor({
  type: 'generic.thermocouple-k',
  name: '熱電対（K）',
  model: 'K 熱電対 シース形',
  description:
    '汎用の K 熱電対（クロメル・アルメル、シース形、リード線引出し）。温度調節器・PLC の温度入力の熱電対の端子へ、+ 脚・− 脚を合わせてつなぐ' +
    '（オムロン E5CC なら 6 に +、5 に −）。リード線を延ばすときは K 用の補償導線を使う。線の色は現行 JIS（IEC と同じ）で + 緑・− 白（旧 JIS は + 赤・− 白）。',
  caption: 'K',
  leads: [
    { id: '+', label: '+', color: '#20a040', colorName: '緑', note: '+ 脚（クロメル、緑。旧 JIS は赤）', hint: 'TC +' },
    { id: '-', label: '−', color: '#f4f4f4', colorName: '白', note: '− 脚（アルメル、白）', hint: 'TC −' },
  ],
});

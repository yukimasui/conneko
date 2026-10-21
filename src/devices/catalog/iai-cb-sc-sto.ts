import { buildPioCable } from '../iai/pio-cable';

/**
 * IAI 安全機能用 I/O ケーブル CB-SC-STO030（3m、片側バラ線）。SCON-CB / SCON2 の STO/SS1-t 仕様の
 * 安全機能用 I/O コネクター（TE 2294417-1、8 極）に差し、反対側を安全コントローラー・セーフティリレーへ配線する。
 *
 * ピン（取扱説明書 MJ0340「9.2.7 安全機能用 I/O コネクター」）: 1・2 NC、3 /SRI1-、4 /SRI1+、5 /SRI2-、6 /SRI2+、7 EDM-、8 EDM+。
 * 芯線の色は公開資料で確認できなかったため、端子ID を信号名にし、図では灰色の芯線に信号名を付けて描く。
 */
export default buildPioCable({
  type: 'iai.cb-sc-sto',
  model: 'CB-SC-STO',
  name: '安全機能用 I/O ケーブル（片側バラ線）',
  kind: 'IAI-STO8',
  poles: 8,
  plugW: 44,
  plugText: 'STO 8P',
  leads: [
    { id: '/SRI1-', pin: 3, colorIndex: -1, note: '安全要求入力 1 の −側（0V）' },
    { id: '/SRI1+', pin: 4, colorIndex: -1, note: '安全要求入力 1（+24V で安全機能の要求を解除）' },
    { id: '/SRI2-', pin: 5, colorIndex: -1, note: '安全要求入力 2 の −側（0V）' },
    { id: '/SRI2+', pin: 6, colorIndex: -1, note: '安全要求入力 2（+24V で安全機能の要求を解除）' },
    { id: 'EDM-', pin: 7, colorIndex: -1, note: '外部機器モニター出力 −側' },
    { id: 'EDM+', pin: 8, colorIndex: -1, note: '外部機器モニター出力 +側' },
  ],
  description:
    'IAI の安全機能用 I/O ケーブル CB-SC-STO030（3m、片側バラ線）。SCON-CB / SCON2 の STO・SS1-t 仕様の安全機能用 I/O コネクター（8 極）とケーブルでつなぎ、' +
    '反対側の芯線 /SRI1+・/SRI2+ に安全コントローラーの安全出力（OSSD）やセーフティリレーの安全接点を通した +24V を、/SRI1-・/SRI2- に 0V をつなぐ。EDM+・EDM- は安全機器の EDM（外部機器監視）入力へ。' +
    '芯線の色は未確認のため、端子ID は信号名。',
});

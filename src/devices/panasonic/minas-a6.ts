/**
 * パナソニック AC サーボ MINAS A6 ファミリー（サーボアンプ MADLN15SG とサーボモーター MSMF022L1）の共通の値。
 *
 * 組み合わせ: MADLN15SG（A6SG、A 枠、単相 / 三相 200V、200W まで）↔ MSMF022L1□2M（低慣性、□60mm、200W、3000r/min、23 ビットのアブソリュートエンコーダ）。
 * 出典: パナソニック 製品ページ MADLN15SG・MADLN15SE（主回路 単相 / 三相 200〜240V +10% −15%、制御電源 単相 200〜240V、W40 × H150 × D130mm、0.8kg）、
 *       販売店の MSMF022L1 の仕様（定格出力 200W・定格トルク 0.64N·m・定格電流 1.5A、ブレーキ DC24V（22.8〜25.2V）0.36A、IP67）、
 *       MINAS A5/A6 の位置制御（パルス列）の配線の手引き（X4: OPC1 1・OPC2 2・PULS1 3・PULS2 4・SIGN1 5・SIGN2 6・COM+ 7・SRV-ON 29・COM− 41・S-RDY+ 35・ALM+ 37）
 * 推定: サーボアンプの定格出力電流（1.6A）・主回路の入力電流（1.5A）・制御電源の電流（0.2A）、X4 の上記以外のピン番号、ブレーキ付きモーターの型式の末尾。
 */

/** サーボアンプの X6 とサーボモーターのエンコーダのコネクタ（専用のエンコーダケーブル） */
export const MINAS_A6_ENCODER = 'PANASONIC-MINAS-A6-ENC';

export const MINAS_A6 = {
  amp: 'MADLN15SG',
  motor: 'MSMF022L1',
  watt: 200,
  /** サーボアンプの定格出力電流[A]（推定） */
  ampOut: 1.6,
  /** サーボアンプの主回路の入力電流[A]（推定） */
  ampIn: 1.5,
  /** サーボモーターの定格電流[A] */
  motorCurrent: 1.5,
  /** ブレーキの電流[A]（DC24V） */
  brakeCurrent: 0.36,
};

export const text = (x: number, y: number, t: string, size = 4, fill = '#222', anchor: 'start' | 'middle' | 'end' = 'middle', weight: 'normal' | 'bold' = 'normal') =>
  `<text x="${+x.toFixed(2)}" y="${+y.toFixed(2)}" text-anchor="${anchor}" font-family="sans-serif" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

/**
 * IAI の DC24V 電源 PSA-24（ファンなし）/ PSA-24L（ファン付き）の共通の作り。
 *
 * 出典: IAI 総合カタログ CJ9005「PSA-24」（仕様表・各部名称・外形寸法図）、取扱説明書 MJ0379「PSA-24」（1.3 電源端子台）。
 * 外形: W54 × H115（PSA-24L はファンユニット込みで H131）× D142.8mm。白い筐体の正面に IAI ロゴ、右上に LED（FAN・SYS）・通信用コネクター・
 * アドレススイッチ、正面下半分に電源端子台（DT-5C-B84W-6717-07、M3.5、上から 1 +24V・2 +24V・3 0V・4 0V・5 FG・6 AC(N)・7 AC(L)）。
 * 入力 AC100〜230V ±10%（電源電流 AC100V で 2.5A / PSA-24L は 3.9A）、出力 DC24V 連続 8.5A（204W）/ PSA-24L は 13.8A（330W）、ピーク 17A。
 * 負荷に応じて出力電圧が下がる特性で並列運転（最大 5 台、同じ機種どうし）ができ、IAI のコントローラー専用。
 */
import type { DeviceDefinition, TerminalDef } from '../types';
import { iaiDefs, led, MM, n2, screw, smallBlackConnector, text } from './parts';

export function buildPsa24(fan: boolean): DeviceDefinition {
  const top = fan ? 16 * MM : 0;
  const W = 54 * MM;
  const H = n2(115 * MM + top);
  const X = (mm: number) => n2(mm * MM);
  const Y = (mm: number) => n2(top + mm * MM);
  const ids = ['+V1', '+V2', '-V1', '-V2', 'FG', 'N', 'L'];
  const labels = ['+', '+', '−', '−', '⏚', 'N', 'L'];
  const pitch = 8.4 * MM;
  const y0 = Y(48);
  const tx = X(12);
  const current = fan ? 13.8 : 8.5;
  const svg = `
  ${iaiDefs(['#f3f4f5', '#dfe2e5'])}
  ${
    fan
      ? `<rect x="2" y="1" width="${n2(W - 4)}" height="${n2(top + 4)}" rx="2" fill="#d7dadd" stroke="#8a8f94" stroke-width="0.6"/>
  ${Array.from({ length: 9 }, (_, i) => `<rect x="${n2(8 + i * 10)}" y="5" width="6" height="${n2(top - 6)}" rx="1" fill="#9aa0a6"/>`).join('')}`
      : ''
  }
  <rect x="0.5" y="${n2(top + 1)}" width="${n2(W - 1)}" height="${n2(H - top - 2)}" rx="2.4" fill="url(#iaipanel-{{uid}})" stroke="#8a8f94" stroke-width="0.8"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${X(4)}" y="${n2(Y(4) + i * 5)}" width="${X(32)}" height="2.4" rx="1" fill="#d9dcdf"/>`).join('')}
  ${text(X(18), Y(30), 'IAI', 14, '#1f3f8a', 'middle', 'bold', ' font-style="italic"')}
  ${text(X(18), Y(36), fan ? 'PSA-24L' : 'PSA-24', 3.6, '#3a3c40', 'middle', 'bold')}
  ${led(X(46), Y(14), 'off', 3, 2.2)}${text(X(43.5), Y(14.7), 'FAN', 2.2, '#3a3c40', 'end')}
  ${led(X(46), Y(18), 'g', 3, 2.2)}${text(X(43.5), Y(18.7), 'SYS', 2.2, '#3a3c40', 'end')}
  ${smallBlackConnector(X(41), Y(22), X(9), X(8), 4)}${text(X(45.5), Y(33), 'COM', 2, '#3a3c40', 'middle')}
  <circle cx="${X(45.5)}" cy="${Y(39)}" r="3.6" fill="#2f73c9" stroke="#1d4b85" stroke-width="0.5"/><circle cx="${X(45.5)}" cy="${Y(39)}" r="1.6" fill="#f2c94c"/>
  <!-- 電源端子台 -->
  <rect x="${X(4)}" y="${n2(y0 - pitch / 2 - 3)}" width="${X(20)}" height="${n2(pitch * 7 + 6)}" rx="1.4" fill="#1c1d20" stroke="#000" stroke-width="0.6"/>
  ${ids.map((_, i) => `<rect x="${X(5)}" y="${n2(y0 + i * pitch - pitch / 2 + 1)}" width="${X(18)}" height="${n2(pitch - 2)}" rx="0.8" fill="#2c2e32"/>${screw(tx, y0 + i * pitch, 5)}${text(X(19.5), y0 + i * pitch + 1.6, labels[i], 4.4, '#f2f2f2', 'middle', 'bold')}`).join('')}
  ${text(X(30), n2(y0 + pitch * 0.5 + 1), 'OUTPUT', 2.6, '#3a3c40', 'start', 'bold')}${text(X(30), n2(y0 + pitch * 1.5 + 1), 'DC24V', 2.6, '#3a3c40', 'start')}${text(X(30), n2(y0 + pitch * 2.5 + 1), `${current}A`, 2.6, '#3a3c40', 'start')}
  ${text(X(30), n2(y0 + pitch * 5.2 + 1), 'INPUT', 2.6, '#3a3c40', 'start', 'bold')}${text(X(30), n2(y0 + pitch * 6 + 1), 'AC100〜230V', 2.4, '#3a3c40', 'start')}`;
  const ac = { system: 'AC' as const, minVoltage: 90, maxVoltage: 253 };
  const terminals: TerminalDef[] = ids.map((id, i): TerminalDef => {
    const base = { id, x: tx, y: n2(y0 + i * pitch), side: 'left' as const };
    if (id.startsWith('+V')) return { ...base, label: '+24V', note: `24V 出力（1・2 は内部で接続。連続 ${current}A）`, role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: current }, ...(id === '+V2' ? { optional: true } : {}) };
    if (id.startsWith('-V')) return { ...base, label: '0V', note: '0V 出力（3・4 は内部で接続）', role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '-', limitCurrent: current }, ...(id === '-V2' ? { optional: true } : {}) };
    if (id === 'FG') return { ...base, label: 'FG', note: 'フレームグラウンド（機能接地）', role: 'ground' };
    return { ...base, label: id === 'N' ? 'AC(N)' : 'AC(L)', note: id === 'N' ? 'AC 入力ニュートラル（接地側）' : 'AC 入力ライブ（非接地側）', role: 'input', accepts: ac };
  });
  return {
    type: fan ? 'iai.psa-24l' : 'iai.psa-24',
    name: 'DC24V 電源（IAI コントローラー用）',
    model: fan ? 'PSA-24L' : 'PSA-24',
    maker: 'IAI',
    category: 'power-supply',
    description:
      `IAI のコントローラー・ロボシリンダー用の DC24V 電源${fan ? '（ファン付き）' : '（ファンなし）'}。入力 AC100〜230V ±10%（L・N・FG）、出力 DC24V 連続 ${current}A（ピーク 17A）。` +
      '負荷に応じて出力電圧が下がる特性で、同じ機種どうし最大 5 台まで並列運転できる（他の電源との並列運転は不可）。IAI のコントローラー（PCON/ACON/DCON・RCON・RSEL など）の制御電源・モーター電源に使う。' +
      '+24V・0V はそれぞれ 2 端子あり内部でつながっている。',
    labelPrefix: 'PSU',
    width: W,
    height: H,
    svg,
    terminals,
    distinctGroups: [['L', 'N']],
    loadCurrent: fan ? 3.9 : 2.5,
  };
}

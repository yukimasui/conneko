import { DC24_MINUS, DC24_PLUS, MM, n2, text } from '../iai/parts';
import { blackSocket, cpLoadParam, frontConnector, ledLabel, RCON_H, rconBody, rconDefs, rconUnitBus, toggle } from '../iai/rcon';
import type { DeviceDefinition, InternalLink, ParamValues, PinDef, SafetyChannelGroup, TerminalDef } from '../types';

/**
 * IAI R-unit RCON の 200V ドライバーユニット RCON-SC-1（AC サーボ 200V、1 軸。RCS2/RCS3/RCS4・単軸ロボット・直交ロボットなど）。
 *
 * 出典: IAI 総合カタログ CJ9005「R-unit (RCON)」（電源容量）、取扱説明書 MJ0384「3.4 200V ドライバーユニット」「2.4 駆動源遮断」。
 * W45.2 × H115 × D95mm。前面に LED（T RUN・SYS）、ジョグスイッチ、ブレーキスイッチ、エンコーダーコネクター（10226 26 ピン）、
 * ドライバー停止コネクター / 安全機能用 I/O コネクター（TE 2294417-1。STO・SS1-t 仕様では安全機能用）、モーターコネクター（SC04B、W・PE・U・V）。
 * モーター電源は 200V 電源ユニット（RCON-PS2）から連結で供給される。STO・SS1-t 仕様の安全機能用 I/O は SCON-CB と同じピン
 * （3 /SRI1-・4 /SRI1+・5 /SRI2-・6 /SRI2+・7 EDM-・8 EDM+）。使わない場合はダミープラグ DP-6 を差す。
 */

const W = 45.2 * MM;
const X = (mm: number) => n2(mm * MM);
const Y = (mm: number) => n2(mm * MM);
const PG = { x: X(14), y: Y(36) };
const STO = { x: X(14), y: Y(58) };
const MOT = { x: X(14), y: Y(78) };

const hasSto = (p: ParamValues) => String(p.safety ?? 'none') !== 'none';

const svg = (p: ParamValues) => `
  ${rconDefs()}
  ${rconBody(W, `RCON-SC-1${hasSto(p) ? `-${String(p.safety)}` : ''}`, '#5a5f66')}
  ${ledLabel(X(40), Y(11), 'T RUN', 'g', 'end')}${ledLabel(X(40), Y(14), 'SYS Ⅰ', 'off', 'end')}
  ${toggle(X(9), Y(15))}${toggle(X(19), Y(15))}${text(X(9), Y(12), 'BK', 1.8, '#3a3c40')}${text(X(19), Y(12), 'JOG', 1.8, '#3a3c40')}
  <rect x="${n2(PG.x - 9)}" y="${n2(PG.y - 18)}" width="18" height="36" rx="1.2" fill="url(#rcshield-{{uid}})" stroke="#5d6166" stroke-width="0.5"/>
  <rect x="${n2(PG.x - 5)}" y="${n2(PG.y - 13)}" width="10" height="26" rx="1" fill="#111"/>
  ${text(X(26), Y(36.5), 'PG', 2.4, '#3a3c40', 'start')}
  ${blackSocket(STO.x, STO.y, 8 * MM, 8 * MM)}${text(X(26), Y(58.5), hasSto(p) ? 'STO' : 'STOP', 2.4, '#3a3c40', 'start')}
  ${blackSocket(MOT.x, MOT.y, 12 * MM, 12 * MM)}
  ${[0, 1].map((r) => [0, 1].map((k) => `<rect x="${n2(MOT.x - 7 + k * 10)}" y="${n2(MOT.y - 6 + r * 9)}" width="4" height="4" fill="#e3c070"/>`).join('')).join('')}
  ${text(X(26), Y(78.5), 'MOT', 2.4, '#3a3c40', 'start')}`;

const terminals = (p: ParamValues): TerminalDef[] => [
  frontConnector('PG', 'PG（エンコーダー）', 'アクチュエーターのエンコーダーケーブル（10226 26 ピン）', PG.x, PG.y, { kind: 'IAI-SCON-PG', pins: 0, width: 36, length: 14, facing: 'front' }),
  frontConnector('MOT', 'MOT（モーター U/V/W/PE）', 'アクチュエーターのモーターケーブル（SC04B）', MOT.x, MOT.y, { kind: 'IAI-SCON2-MOT', pins: 0, width: 24, length: 20, facing: 'front' }),
  hasSto(p)
    ? frontConnector('STO', '安全機能用 I/O（STO/SS1-t）', 'TE 2294417-1（8 極）。安全機能用 I/O ケーブル CB-SC-STO030 で安全機器へつなぐ', STO.x, STO.y, { kind: 'IAI-STO8', pins: 8, width: 16, length: 16, facing: 'front' })
    : frontConnector('STO', 'ドライバー停止コネクター', '標準（RV STOP）仕様のドライバー停止入力（使わない場合はダミープラグ DP-6）', STO.x, STO.y, { kind: 'IAI-STO8', pins: 0, width: 16, length: 16, facing: 'front' }),
];

const pins = (p: ParamValues): PinDef[] =>
  hasSto(p)
    ? [
        { id: 'STO#1', label: 'NC（1）', role: 'signal', optional: true },
        { id: 'STO#2', label: 'NC（2）', role: 'signal', optional: true },
        { id: 'STO#3', label: '/SRI1-（3）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 1 の −側（0V）' },
        { id: 'STO#4', label: '/SRI1+（4）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 1, note: '安全要求入力 1（+24V で要求解除、開放で STO）' },
        { id: 'STO#5', label: '/SRI2-（5）', role: 'input', accepts: DC24_MINUS, optional: true, note: '安全要求入力 2 の −側（0V）' },
        { id: 'STO#6', label: '/SRI2+（6）', role: 'input', accepts: DC24_PLUS, optional: true, function: 'safety-input', channel: 2, note: '安全要求入力 2（+24V で要求解除、開放で STO）' },
        { id: 'STO#7', label: 'EDM-（7）', role: 'signal', optional: true, note: '外部機器モニター出力 −側' },
        { id: 'STO#8', label: 'EDM+（8）', role: 'signal', signal: { dir: 'out', kind: 'contact' }, optional: true, note: '外部機器モニター出力 +側' },
      ]
    : [];

const links = (p: ParamValues): InternalLink[] => (hasSto(p) ? [{ from: 'STO#8', to: 'STO#7', switch: 'output', ratedCurrent: 0.1 }] : []);

const safetyChannels = (p: ParamValues): SafetyChannelGroup[] =>
  hasSto(p) ? [{ id: 'STO', label: 'STO（/SRI1・/SRI2）', kind: 'input', mode: ['nc-nc', 'ossd'], configurable: true, channels: [{ input: 'STO#4' }, { input: 'STO#6' }] }] : [];

const def: DeviceDefinition = {
  type: 'iai.rcon-sc',
  name: 'R-unit 200V ドライバーユニット',
  model: 'RCON-SC-1',
  maker: 'IAI',
  category: 'control',
  description:
    'IAI の R-unit（RCON・RSEL）の 200V ドライバーユニット（AC サーボ 1 軸）。200V 電源ユニット（RCON-PS2）の右に連結し、モーター電源は電源ユニットから、制御電源（0.2A、ブレーキ付き 0.5A）はゲートウェイユニットから連結で受ける。' +
    'モーター（MOT）・エンコーダー（PG）コネクターにアクチュエーターのケーブルをつなぐ。駆動源遮断は内部の半導体で行い、ゲートウェイユニットの STOP 入力と連動する。' +
    'STO・SS1-t 仕様は安全機能用 I/O（/SRI1+・/SRI2+ の 2 チャンネル、EDM 出力）を安全コントローラーやセーフティリレーへつなぐ。',
  labelPrefix: 'DRV',
  width: W,
  height: RCON_H,
  svg,
  terminals,
  pins,
  links,
  safetyChannels,
  params: [
    {
      key: 'safety',
      label: '安全タイプ',
      options: [
        { value: 'none', label: '標準（RV STOP）' },
        { value: 'STO', label: 'STO 仕様' },
        { value: 'SS1', label: 'SS1-t 仕様' },
      ],
      default: 'none',
    },
    cpLoadParam(
      [
        { value: 0.2, label: 'ブレーキなし（0.2A）' },
        { value: 0.5, label: 'ブレーキあり（0.5A）' },
      ],
      0.2,
    ),
  ],
  bus: rconUnitBus({ CP: { param: 'cpLoad' } }),
};

export default def;

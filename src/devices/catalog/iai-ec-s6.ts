import { actuatorDefs, BRAKE_PARAM, sliderSvg } from '../iai/actuator';
import { ecPowerIoLinks, ecPowerIoPins, type EcPioOptions } from '../iai/ec';
import { n2 } from '../iai/parts';
import type { DeviceDefinition, InternalLink, ParamValues, PinDef, TerminalDef } from '../types';

/**
 * IAI エレシリンダー EC-S6 / EC-S7（スライダータイプ、コントローラー内蔵、パルスモーター）。
 *
 * 出典: 取扱説明書 MJ3793「エレシリンダー スライダータイプ」（型式の見方、各部の名称）、
 *       MJ3816「エレシリンダー 電気編」（3.1 電気仕様、3.5 入出力仕様、4.3 パルスモーター搭載機種の配線）。
 * - 本体幅: S6 63mm、S7 75mm。ベースとモーターカバーは黒色アルマイト、スライダーは白色アルマイト。
 * - モーター側の端面にティーチングポート・ステータス LED・電源・I/O コネクターが並ぶ。
 * - 電源: DC24V ±10%。電源電流は 省電力設定 無効で 定格 3.5A・最大 4.2A、有効で最大 2.2A（制御電源 0.3A を含む）。
 * - 入出力: 入力 3 点（ST0 後退・ST1 前進・RES アラーム解除）、出力 3 点（LS0 後退完了・LS1 前進完了・*ALM）。NPN（標準）/ PNP（オプション PN）。
 * - PLC などとは電源・I/O ケーブル CB-EC-PWBIO□□□-RB（片側バラ線。Conneko では iai.cb-ec-pwbio）でつなぐ。
 *   RCON-EC 接続仕様（オプション ACR）は EC 接続ユニット RCON-EC と CB-REC-PWBIO□□□-RB でつなぐ。
 *
 * 見た目: 長さ方向は縮めて描いた（ストロークは代表的な長さ）。
 */
const TYPES = [
  { value: 'S6', bodyMm: 63 },
  { value: 'S7', bodyMm: 75 },
];
const typeOf = (p: ParamValues) => TYPES.find((t) => t.value === String(p.type)) ?? TYPES[0];
const ioOf = (p: ParamValues) => String(p.io ?? 'NP');
const acr = (p: ParamValues) => ioOf(p) === 'ACR';
const opts = (p: ParamValues): EcPioOptions => ({ polarity: ioOf(p) === 'PN' ? 'pnp' : 'npn', brake: String(p.brake) === 'B', tmd2: String(p.power) === 'TMD2' });

const W = 300;
const H = 72;
const BASE_END = 196;
const MOTOR_END = 284;
const CY = H / 2;

const svg = (p: ParamValues) => {
  const t = typeOf(p);
  const o = opts(p);
  const bw = t.bodyMm * 0.7;
  // モーター側の端面（右端）: ティーチングポート（丸）・ステータス LED・電源・I/O コネクター
  const face = `
  <rect x="${MOTOR_END - 2}" y="${n2(CY - bw * 0.45)}" width="7" height="${n2(bw * 0.9)}" rx="1.4" fill="#1b1c1f" stroke="#050506" stroke-width="0.6"/>
  <circle cx="${MOTOR_END + 1.5}" cy="${n2(CY - bw * 0.27)}" r="2.6" fill="#0b0b0c" stroke="#6a6d72" stroke-width="0.5"/>
  <rect x="${MOTOR_END}" y="${n2(CY - bw * 0.1)}" width="3" height="3" rx="0.5" fill="#49e05f"/>
  <rect x="${MOTOR_END + 1}" y="${n2(CY + 1)}" width="9" height="${n2(bw * 0.32)}" rx="1" fill="#e9e6dc" stroke="#7d7a70" stroke-width="0.5"/>
  ${Array.from({ length: 6 }, (_, i) => `<rect x="${MOTOR_END + 3}" y="${n2(CY + 2.2 + (i * (bw * 0.32 - 2.6)) / 6)}" width="1.6" height="1.4" fill="#5d5a52"/><rect x="${MOTOR_END + 6}" y="${n2(CY + 2.2 + (i * (bw * 0.32 - 2.6)) / 6)}" width="1.6" height="1.4" fill="#5d5a52"/>`).join('')}`;
  return `
  ${actuatorDefs()}
  ${sliderSvg({ W, H, bodyW: bw, baseEnd: BASE_END, motorEnd: MOTOR_END, model: `EC-${t.value}`, brake: o.brake, black: true })}
  ${face}`;
};

const PWRIO_Y = (p: ParamValues) => n2(CY + 1 + (typeOf(p).bodyMm * 0.7 * 0.32) / 2);

const terminals = (p: ParamValues): TerminalDef[] => [
  {
    id: 'PWRIO',
    label: acr(p) ? '電源・I/O コネクター（RCON-EC 接続）' : '電源・I/O コネクター',
    note: acr(p)
      ? 'RCON-EC 接続仕様（オプション ACR）。EC 接続ユニット RCON-EC の EC1〜4 へケーブル CB-REC-PWBIO□□□-RB でつなぐ（電源・入出力は RCON から供給・通信）'
      : '電源・I/O ケーブル CB-EC-PWBIO□□□-RB（片側バラ線）でつなぎ、芯線を DC24V 電源・PLC の入出力へ配線する（A1 0V・B1 24V・B3 ST0・B4 ST1・B5 RES・A3 LS0・A4 LS1・A5 *ALM・B2 BKRLS）',
    x: MOTOR_END + 10,
    y: PWRIO_Y(p),
    side: 'right',
    role: 'connector',
    connector: acr(p) ? { kind: 'IAI-EC13', pins: 0, width: 10, protocols: ['iai-ec'] } : { kind: 'IAI-EC-PWRIO', pins: 12, width: 10 },
  },
];

const pins = (p: ParamValues): PinDef[] => (acr(p) ? [] : ecPowerIoPins('PWRIO', opts(p)));
const links = (p: ParamValues): InternalLink[] => (acr(p) ? [] : ecPowerIoLinks('PWRIO', opts(p)));

const def: DeviceDefinition = {
  type: 'iai.ec-s6',
  name: 'エレシリンダー スライダータイプ（コントローラー内蔵）',
  model: 'EC-S6/S7',
  maker: 'IAI',
  category: 'load',
  labelPrefix: 'EC',
  width: W,
  height: H,
  svg,
  terminals,
  pins,
  links,
  params: [
    {
      key: 'type',
      label: 'タイプ',
      options: TYPES.map((t) => ({ value: t.value, label: `EC-${t.value}（本体幅 ${t.bodyMm}mm）` })),
      default: 'S6',
    },
    {
      key: 'io',
      label: 'I/O 仕様',
      options: [
        { value: 'NP', label: 'NPN 仕様（標準）' },
        { value: 'PN', label: 'PNP 仕様（オプション PN）' },
        { value: 'ACR', label: 'RCON-EC 接続仕様（オプション ACR）' },
      ],
      default: 'NP',
    },
    BRAKE_PARAM,
    {
      key: 'power',
      label: '電源',
      options: [
        { value: 'single', label: '1 系統（標準。B1 の 24V でモーター・制御）' },
        { value: 'TMD2', label: '2 系統（オプション TMD2。B1 がモーター、A2 が制御）' },
      ],
      default: 'single',
    },
    {
      key: 'loadCurrent',
      label: '電源電流',
      unit: 'A',
      options: [
        { value: 4.2, label: '省電力設定 無効（定格 3.5A・最大 4.2A）' },
        { value: 2.2, label: '省電力設定 有効（最大 2.2A）' },
      ],
      default: 4.2,
    },
  ],
  loadCurrent: { param: 'loadCurrent' },
  description:
    'IAI のエレシリンダー EC-S6/S7（スライダータイプ、コントローラー内蔵のパルスモーター駆動。電源 DC24V ±10%）。前進・後退の 2 点（とアラーム解除）を PLC の入出力で動かす。' +
    'モーター側の端面の電源・I/O コネクターに電源・I/O ケーブル CB-EC-PWBIO（片側バラ線。Conneko では iai.cb-ec-pwbio）をつなぎ、芯線を配線する: ' +
    '黒 0V（A1）・赤 24V（B1）、入力 橙 ST0 後退（B3）・黄 ST1 前進（B4）・緑 RES アラーム解除（B5）、出力 青 LS0 後退完了（A3）・紫 LS1 前進完了（A4）・灰 *ALM（A5、正常時 ON）、茶 BKRLS ブレーキ解除（B2、ブレーキ付きのとき）。' +
    'NPN 仕様は入力がプラスコモン（PLC の NPN 出力で 0V に落とす）・出力が NPN（最大 50mA）、PNP 仕様（オプション PN）は入力がマイナスコモン・出力が PNP。' +
    'RCON-EC 接続仕様（オプション ACR）は R-unit の EC 接続ユニット RCON-EC へ CB-REC-PWBIO でつなぐ。電源 2 系統仕様（TMD2）は A2（水）が制御電源 24V になる。' +
    '電源電流は 省電力設定 無効で最大 4.2A、有効で最大 2.2A。',
};

export default def;

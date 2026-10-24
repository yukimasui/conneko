/**
 * IAI のロボシリンダー（アクチュエーター本体）・エレシリンダーを描くための共通部品と、
 * コントローラーとケーブルでつなぐためのコネクターの種類（connector.kind）の対応。
 *
 * 外観（総合カタログ CJ9006 第 3 巻「スライダー」・第 4 巻「ロッド」の製品写真・寸法図より）:
 * - スライダータイプ（RCP6-SA・RCS4-SA）: アルミ押出しのベース（白色アルマイト）の上面をステンレスシートが覆い、
 *   中央にスライダー、反モーター側にエンドカバー、モーター側にモーターユニット（銀色のモーターカバー）。
 *   ケーブルはモーター側の端面から出る（取出し方向は CJT/CJR/CJL/CJB のオプションで変えられる）。
 * - ロッドタイプ（RCP6-RA）: 角形の本体の端面からロッドが出て、反対側にモーターユニット。
 * - エレシリンダー（EC-S6）: ベースとモーターカバーが黒色アルマイト、スライダーは白色アルマイト。
 *   モーター側の端面にティーチングポート・ステータス LED・電源・I/O コネクターが並ぶ。
 *
 * 描画の縮尺: 盤外の機器なので長さ方向は 1mm ≒ 0.6px 程度に縮め、ストロークは代表的な長さで描く（幅方向は 1mm ≒ 0.8px）。
 *
 * コネクターの種類（コントローラー側の定義と合わせる。同じ種類どうし、または mates で専用ケーブルがある組み合わせだけつなげる）:
 * - パルスモーター（RCP6 など）: 'IAI-RCP-MPG'（PCON-CB・PCON-CA・PCON-CYB・MSEL）、'IAI-RCP-MPG-CFB'（PCON-CFB/CFA・MSEL-PCF/PGF）、
 *   'IAI-RCON-MPG'（RCON-PC）、'IAI-RCON-MPG-PCF'（RCON-PCF）
 * - 24V AC サーボ（RCA2 など）: 'IAI-RCA-MPG'（ACON-CB・ACON-CA・ACON-CYB）、'IAI-RCON-MPG-AC'（RCON-AC）
 * - DC ブラシレス（RCD）: 'IAI-RCD-MPG'（DCON-CB・DCON-CA・DCON-CYB）、'IAI-RCON-MPG-DC'（RCON-DC）
 * - MCON-C のドライバーボードのコネクターは種類を分けていない（'IAI-MCON-MOT'）ので、MCON に対応する機種は mates に入れる
 * - 200V AC サーボ（RCS4 など）: モーター 'IAI-SCON-MOT'（SCON-CB）・'IAI-XSEL-MOT'（XSEL-RA/SA・P/Q）が適応コントローラー T2、
 *   'IAI-SCON2-MOT'（SCON2・RCON-SC）・'IAI-XSEL2-MOT'（XSEL2）が T4。エンコーダーは 'IAI-SCON-PG'・'IAI-XSEL-PG'（T2/T4 共通の CB-X1-PA）
 */
import type { ConnectorSpec, ParamDef, PinDef } from '../types';
import { DC24_MINUS, DC24_PLUS, iaiLogo, n2, text } from './parts';

/* ------------------------------------------------------------------ */
/* コネクター                                                           */
/* ------------------------------------------------------------------ */

/**
 * RCP6 の適応コントローラーのパラメーター。型式の「適応コントローラー」記号は、標準モーター（35P/42P/56P）が
 * P3（PCON・MSEL）/ P5（RCON・RSEL）、高推力モーター（56SP/60P）が P4（PCON-CFB/CGFB・MSEL-PCF/PGF）/ P6（RCON-PCF・RSEL）。
 */
export const RCP6_CTRL_PARAM: ParamDef = {
  key: 'ctrl',
  label: '適応コントローラー',
  options: [
    { value: 'pcon', label: 'P3: PCON・MSEL（高推力タイプは P4: PCON-CFB・MSEL-PCF）' },
    { value: 'rcon', label: 'P5: RCON・RSEL（高推力タイプは P6: RCON-PCF）' },
  ],
  default: 'pcon',
};

/** RCP6 のモーター・エンコーダーコネクターの種類と、型式の適応コントローラー記号 */
export function rcp6Connector(ctrl: string, high: boolean): { spec: ConnectorSpec; code: string; cable: string } {
  if (ctrl === 'rcon')
    return high
      ? { spec: actuatorConnector('IAI-RCON-MPG-PCF'), code: 'P6', cable: 'CB-ADPC-MPA□□□（-RB）＋変換ケーブル CB-CAN-AJ002' }
      : { spec: actuatorConnector('IAI-RCON-MPG'), code: 'P5', cable: 'CB-ADPC-MPA□□□（-RB）' };
  return high
    ? { spec: actuatorConnector('IAI-RCP-MPG-CFB'), code: 'P4', cable: 'CB-CFA3-MPA□□□（-RB）' }
    : { spec: actuatorConnector('IAI-RCP-MPG', ['IAI-MCON-MOT']), code: 'P3', cable: 'CB-CAN-MPA□□□（-RB）' };
}

/** ブレーキの有無のパラメーター（オプション記号 B） */
export const BRAKE_PARAM: ParamDef = {
  key: 'brake',
  label: 'ブレーキ',
  options: [
    { value: 'none', label: 'なし' },
    { value: 'B', label: 'あり（オプション B）' },
  ],
  default: 'none',
};

/** アクチュエーター側のモーター・エンコーダーコネクター（ケーブルの差込み方向に描く）。kind は相手のコントローラーに合わせる */
export const actuatorConnector = (kind: string, mates: string[] = [], width = 14): ConnectorSpec => ({
  kind,
  pins: 0,
  width,
  // コントローラーにつながないとアクチュエーターは動かない
  required: true,
  ...(mates.length ? { mates } : {}),
});

/**
 * AC サーボ（RCS4 など）のエンコーダーコネクター（コントローラー側 10226-6202JL、26 ピン）のピン。
 * 専用ケーブル CB-X1-PA でコントローラーの PG コネクターと同じ番号のピンどうしがつながる
 * （取扱説明書 MJ3769「3.2 モーター・エンコーダーケーブル」。ピン番号はコントローラー側の番号で表す）。
 * 20 BK−・21 BK+ はブレーキの電源（コントローラーのブレーキ電源 BK+ から、ブレーキ解除時に出力される）。
 */
export const ENCODER26_NAMES: Record<number, string> = {
  1: 'A+',
  2: 'A-',
  3: 'B+',
  4: 'B-',
  5: 'Z+',
  6: 'Z-',
  7: 'SRD+',
  8: 'SRD-',
  9: 'LC_SRD+',
  10: 'LC_SRD-',
  11: 'NC',
  12: 'E24V',
  13: '0V',
  14: 'BAT+',
  15: 'BAT-',
  16: 'VCC',
  17: 'GND',
  18: 'LC_VCC',
  19: 'LC_GND',
  20: 'BK-',
  21: 'BK+',
  22: 'NC',
  23: 'RSV',
  24: 'OT',
  25: 'CREEP',
  26: 'LS',
};

/** エンコーダーコネクター 26 ピンの ConnectorSpec（ピンあり。ケーブルは 1 本の太いケーブルとして描く） */
export const encoder26Connector = (kind: string, mates: string[] = [], width = 14): ConnectorSpec => ({
  kind,
  pins: 26,
  width,
  style: 'lan',
  required: true,
  ...(mates.length ? { mates } : {}),
});

/** アクチュエーター側のエンコーダーコネクターのピン。brake のときだけ 20・21 をブレーキの受電にする */
export function actuatorEncoderPins(cn: string, brake: boolean): PinDef[] {
  return Array.from({ length: 26 }, (_, i): PinDef => {
    const no = i + 1;
    const name = ENCODER26_NAMES[no];
    if (brake && no === 21)
      return { id: `${cn}#21`, label: 'BK+（ブレーキ）', note: 'ブレーキの電源 +24V（コントローラーのブレーキ電源 BK+ から、エンコーダーケーブルの BK+ を通って来る）', role: 'input', accepts: DC24_PLUS, optional: true };
    if (brake && no === 20)
      return { id: `${cn}#20`, label: 'BK-（ブレーキ）', note: 'ブレーキの電源 0V（コントローラーのブレーキ電源 0V へ）', role: 'input', accepts: DC24_MINUS, optional: true };
    return { id: `${cn}#${no}`, label: name, role: 'signal', optional: true };
  });
}

/**
 * コントローラー側のエンコーダーコネクター（PG、26 ピン）のピン。20 BK−・21 BK+ はブレーキ電源の端子から内部で出る
 * （SCON-CB・SCON2・XSEL・XSEL2 の取扱説明書「エンコーダーコネクター」: 20 BK− ブレーキ開放出力信号−（COM: 全軸共通）、21 BK+ ブレーキ開放出力信号+）。
 */
export function controllerEncoderPins(cn: string): PinDef[] {
  return Array.from({ length: 26 }, (_, i): PinDef => {
    const no = i + 1;
    const name = ENCODER26_NAMES[no];
    const note = no === 21 ? 'ブレーキ開放出力 +（ブレーキ電源 BK+ から出る）' : no === 20 ? 'ブレーキ開放出力 −（ブレーキ電源 0V。全軸共通）' : undefined;
    return { id: `${cn}#${no}`, label: name, ...(note ? { note } : {}), role: 'signal', optional: true };
  });
}

/* ------------------------------------------------------------------ */
/* 描画部品                                                             */
/* ------------------------------------------------------------------ */

/** アクチュエーターの共通のグラデーション */
export const actuatorDefs = (extra = '') => `
  <defs>
    <linearGradient id="actalu-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#c3c7cb"/>
      <stop offset="0.18" stop-color="#e8eaec"/>
      <stop offset="0.82" stop-color="#dcdfe2"/>
      <stop offset="1" stop-color="#a9aeb3"/>
    </linearGradient>
    <linearGradient id="actsheet-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4f5f6"/>
      <stop offset="0.5" stop-color="#d9dcdf"/>
      <stop offset="1" stop-color="#f0f1f2"/>
    </linearGradient>
    <linearGradient id="actslider-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9ea3a8"/>
      <stop offset="0.25" stop-color="#c9cdd1"/>
      <stop offset="0.75" stop-color="#bfc3c7"/>
      <stop offset="1" stop-color="#8e9398"/>
    </linearGradient>
    <linearGradient id="actmotor-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#b4b9be"/>
      <stop offset="0.2" stop-color="#e2e5e8"/>
      <stop offset="0.8" stop-color="#d2d6da"/>
      <stop offset="1" stop-color="#9ca1a6"/>
    </linearGradient>
    <linearGradient id="actblack-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2b2d31"/>
      <stop offset="0.2" stop-color="#4a4d52"/>
      <stop offset="0.8" stop-color="#3a3d42"/>
      <stop offset="1" stop-color="#1c1d20"/>
    </linearGradient>
    <linearGradient id="actrod-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#9aa0a6"/>
      <stop offset="0.35" stop-color="#f6f7f8"/>
      <stop offset="1" stop-color="#868c92"/>
    </linearGradient>
    <linearGradient id="actcable-{{uid}}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#3a3c40"/>
      <stop offset="0.5" stop-color="#16171a"/>
      <stop offset="1" stop-color="#0b0b0c"/>
    </linearGradient>
    ${extra}
  </defs>`;

/** タップ穴（スライダー上面の取付け穴） */
const tap = (x: number, y: number, r = 1.6) => `<circle cx="${n2(x)}" cy="${n2(y)}" r="${r}" fill="#6c7176" stroke="#4a4e52" stroke-width="0.4"/>`;

/** ケーブル（横向き）。x0 → x1 を y の高さで、太さ w */
export const cableH = (x0: number, x1: number, y: number, w = 5) =>
  `<rect x="${n2(Math.min(x0, x1))}" y="${n2(y - w / 2)}" width="${n2(Math.abs(x1 - x0))}" height="${w}" rx="${n2(w / 2)}" fill="url(#actcable-{{uid}})"/>`;

/** 中継コネクター（ケーブルジョイントコネクター。黒い樹脂の角形。右端が差込口）。x は右端、y は中心 */
export const jointConnector = (x: number, y: number, w = 16, h = 11) => `
  <rect x="${n2(x - w)}" y="${n2(y - h / 2)}" width="${w}" height="${h}" rx="1.4" fill="url(#actblack-{{uid}})" stroke="#060607" stroke-width="0.6"/>
  <rect x="${n2(x - w + 3)}" y="${n2(y - h / 2 + 1.6)}" width="${n2(w * 0.4)}" height="${n2(h - 3.2)}" rx="0.6" fill="#55595e"/>
  <rect x="${n2(x - 2.2)}" y="${n2(y - h / 2 + 1.2)}" width="2" height="${n2(h - 2.4)}" fill="#0b0b0c"/>`;

/** ブレーキ付きの印（モーターカバーの銘板） */
const brakeTag = (x: number, y: number) =>
  `<rect x="${n2(x - 9)}" y="${n2(y - 3.6)}" width="18" height="7.2" rx="1" fill="#f2c81b" stroke="#8a6d00" stroke-width="0.4"/>${text(x, y + 2.2, 'BRAKE', 4.4, '#1a1a1a', 'middle', 'bold')}`;

export interface SliderDraw {
  W: number;
  H: number;
  /** 本体の幅[px]（上から見た奥行方向） */
  bodyW: number;
  /** ベース（反モーター側のエンドカバーからモーター側のブラケットまで）の右端 x */
  baseEnd: number;
  /** モーターユニットの右端 x */
  motorEnd: number;
  /** 銘板の型式 */
  model: string;
  brake: boolean;
  /** 黒色アルマイト（エレシリンダー） */
  black?: boolean;
  /** モーターカバーに描き足すもの（エレシリンダーの LED など） */
  motorExtra?: string;
}

/** スライダータイプを上から見た図 */
export function sliderSvg(d: SliderDraw) {
  const cy = d.H / 2;
  const top = n2(cy - d.bodyW / 2);
  const bw = d.bodyW;
  const base = d.black ? 'url(#actblack-{{uid}})' : 'url(#actalu-{{uid}})';
  const edge = d.black ? '#0e0f11' : '#7d8287';
  const sl = { x: n2(d.baseEnd * 0.32), w: n2(Math.max(40, d.baseEnd * 0.24)) };
  const motorTop = n2(cy - bw * 0.47);
  const motorH = n2(bw * 0.94);
  const mx = d.baseEnd + 6;
  const cover = d.black ? 'url(#actblack-{{uid}})' : 'url(#actmotor-{{uid}})';
  const logo = d.black ? '#e9eef0' : '#1a1a1a';
  return `
  <!-- 反モーター側のエンドカバー -->
  <rect x="2" y="${n2(top - 1)}" width="9" height="${n2(bw + 2)}" rx="2" fill="${d.black ? '#2a2c30' : '#b7bbc0'}" stroke="${edge}" stroke-width="0.7"/>
  <!-- ベースとステンレスシート -->
  <rect x="10" y="${top}" width="${n2(d.baseEnd - 10)}" height="${bw}" rx="1.4" fill="${base}" stroke="${edge}" stroke-width="0.8"/>
  <rect x="12" y="${n2(top + bw * 0.16)}" width="${n2(d.baseEnd - 14)}" height="${n2(bw * 0.68)}" fill="url(#actsheet-{{uid}})" stroke="#a2a7ac" stroke-width="0.4"/>
  <line x1="12" y1="${n2(cy)}" x2="${n2(d.baseEnd - 2)}" y2="${n2(cy)}" stroke="#c2c6ca" stroke-width="0.5"/>
  <!-- スライダー -->
  <rect x="${sl.x}" y="${n2(top - 2)}" width="${sl.w}" height="${n2(bw + 4)}" rx="1.6" fill="url(#actslider-{{uid}})" stroke="#6f7479" stroke-width="0.8"/>
  <rect x="${n2(sl.x + 3)}" y="${n2(top + bw * 0.14)}" width="${n2(sl.w - 6)}" height="${n2(bw * 0.72)}" rx="1" fill="#d7dade" stroke="#9a9fa4" stroke-width="0.4"/>
  ${[0.25, 0.75].map((fx) => [0.3, 0.7].map((fy) => tap(sl.x + sl.w * fx, top + bw * fy)).join('')).join('')}
  <!-- モーター側のブラケット -->
  <rect x="${n2(d.baseEnd - 1)}" y="${n2(top - 0.5)}" width="8" height="${n2(bw + 1)}" rx="1" fill="${d.black ? '#25272b' : '#c6cacf'}" stroke="${edge}" stroke-width="0.6"/>
  <!-- モーターユニット -->
  <rect x="${mx}" y="${motorTop}" width="${n2(d.motorEnd - mx)}" height="${motorH}" rx="2.2" fill="${cover}" stroke="${edge}" stroke-width="0.8"/>
  ${d.black ? Array.from({ length: 6 }, (_, i) => `<line x1="${n2(mx + 4)}" y1="${n2(motorTop + motorH * (0.2 + i * 0.12))}" x2="${n2(mx + (d.motorEnd - mx) * 0.55)}" y2="${n2(motorTop + motorH * (0.2 + i * 0.12))}" stroke="#55585d" stroke-width="0.7"/>`).join('') : ''}
  ${iaiLogo(n2(mx + (d.motorEnd - mx) / 2), n2(cy - bw * 0.12), Math.min(9, bw * 0.24), logo)}
  ${text(n2(mx + (d.motorEnd - mx) / 2), n2(cy + bw * 0.16), d.model, Math.min(5, bw * 0.13), logo, 'middle', 'bold')}
  ${d.brake ? brakeTag(n2(mx + (d.motorEnd - mx) / 2), n2(cy + bw * 0.34)) : ''}
  ${d.motorExtra ?? ''}`;
}

export interface RodDraw {
  W: number;
  H: number;
  /** 本体の高さ[px] */
  bodyH: number;
  /** ロッドの先端 x（左端） */
  rodX: number;
  /** 本体の左端（ロッドが出る端面）x */
  bodyX: number;
  /** 本体の右端（モーター側）x */
  bodyEnd: number;
  /** モーターユニットの右端 x */
  motorEnd: number;
  /** ロッドの太さ[px] */
  rodD: number;
  model: string;
  brake: boolean;
}

/** ロッドタイプを横から見た図（左にロッド、右にモーター） */
export function rodSvg(d: RodDraw) {
  const cy = d.H / 2;
  const top = n2(cy - d.bodyH / 2);
  const bh = d.bodyH;
  const mx = d.bodyEnd + 3;
  return `
  <!-- ロッドと先端の六角ナット -->
  <rect x="${n2(d.rodX + 6)}" y="${n2(cy - d.rodD / 2)}" width="${n2(d.bodyX - d.rodX - 4)}" height="${d.rodD}" fill="url(#actrod-{{uid}})" stroke="#6f757b" stroke-width="0.6"/>
  <rect x="${n2(d.rodX)}" y="${n2(cy - d.rodD * 0.75)}" width="7" height="${n2(d.rodD * 1.5)}" rx="0.8" fill="#b9bec3" stroke="#6f757b" stroke-width="0.6"/>
  <line x1="${n2(d.rodX + 3.5)}" y1="${n2(cy - d.rodD * 0.75)}" x2="${n2(d.rodX + 3.5)}" y2="${n2(cy + d.rodD * 0.75)}" stroke="#868c92" stroke-width="0.5"/>
  <!-- フロントブラケット -->
  <rect x="${n2(d.bodyX - 3)}" y="${n2(top + 1)}" width="5" height="${n2(bh - 2)}" rx="1" fill="#b7bbc0" stroke="#7d8287" stroke-width="0.6"/>
  <!-- 本体 -->
  <rect x="${n2(d.bodyX + 1)}" y="${top}" width="${n2(d.bodyEnd - d.bodyX - 1)}" height="${bh}" rx="1.6" fill="url(#actalu-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  <line x1="${n2(d.bodyX + 4)}" y1="${n2(top + bh * 0.22)}" x2="${n2(d.bodyEnd - 3)}" y2="${n2(top + bh * 0.22)}" stroke="#b5b9be" stroke-width="0.6"/>
  <line x1="${n2(d.bodyX + 4)}" y1="${n2(top + bh * 0.78)}" x2="${n2(d.bodyEnd - 3)}" y2="${n2(top + bh * 0.78)}" stroke="#b5b9be" stroke-width="0.6"/>
  <circle cx="${n2(d.bodyX + (d.bodyEnd - d.bodyX) * 0.62)}" cy="${n2(cy)}" r="${n2(Math.max(1.6, bh * 0.05))}" fill="#7a7f84"/>
  <!-- モーターユニット -->
  <rect x="${n2(d.bodyEnd - 1)}" y="${n2(top + 0.5)}" width="5" height="${n2(bh - 1)}" rx="1" fill="#c6cacf" stroke="#7d8287" stroke-width="0.6"/>
  <rect x="${mx}" y="${n2(top + bh * 0.03)}" width="${n2(d.motorEnd - mx)}" height="${n2(bh * 0.94)}" rx="2" fill="url(#actmotor-{{uid}})" stroke="#7d8287" stroke-width="0.8"/>
  ${iaiLogo(n2(mx + (d.motorEnd - mx) / 2), n2(cy - bh * 0.1), Math.min(9, bh * 0.24), '#1a1a1a')}
  ${text(n2(mx + (d.motorEnd - mx) / 2), n2(cy + bh * 0.17), d.model, Math.min(5, bh * 0.13), '#1a1a1a', 'middle', 'bold')}
  ${d.brake ? brakeTag(n2(mx + (d.motorEnd - mx) / 2), n2(cy + bh * 0.36)) : ''}`;
}

/** モーター側の端面に付いたコネクターの受け口（ケーブルを右から差す）。x は端面、y は中心 */
export const endReceptacle = (x: number, y: number, h = 12) => `
  <rect x="${n2(x)}" y="${n2(y - h / 2)}" width="6" height="${h}" rx="1" fill="url(#actblack-{{uid}})" stroke="#060607" stroke-width="0.6"/>
  <rect x="${n2(x + 4)}" y="${n2(y - h / 2 + 1.4)}" width="2" height="${n2(h - 2.8)}" fill="#0b0b0c"/>`;

/**
 * IAI プログラムコントローラー XSEL（RA/SA/RAX/SAX 系）の共通部品: システム I/O（20 極）・PIO ボードのスロット・ネットワークボード。
 *
 * システム I/O（取扱説明書 MJ0359「3.3.3 / 3.3.4 システム I/O コネクターの割付け」。FMC1.5/10-ST-3.5 × 2、左 1〜10・右 11〜20）:
 *   10 DETIN / AUTO1IN（外部接点溶着検出入力 / 外部モード切替え 1 入力）、9 DETOUT / AUTO1OUT（同 24V 出力）、
 *   8 EMGin IN（非常停止検出入力）、7 EMGin +24V（同 24V 出力）、6 EMG1 line+・5 EMG1 line-（ティーチングボックスの非常停止接点 系統 1）、
 *   4 EMG2 line+・3 EMG2 line-（同 系統 2。SA のみ）、2 SDN Out+・1 SDN Out-（駆動源遮断の接点出力。モーター電源の供給を許可しているとき閉）、
 *   20 AUTO2IN・19 AUTO2OUT（外部モード切替え 2）、18 ENBin IN・17 ENBin +24V（イネーブル検出）、16 ENB1 line+・15 ENB1 line-、
 *   14 ENB2 line+・13 ENB2 line-（SA のみ）、12 RDY Out+・11 RDY Out-（レディー接点出力。無電圧接点 最大 200mA）。
 *   出荷時は 5-8、6-7、9-10、15-18、16-17、19-20 ピン間を付属の短絡線でつないでいる（Conneko では電線として描く）。
 *   RA は駆動源遮断リレー内蔵（ハードワイヤード）、SA は外部の安全回路で遮断する（カテゴリー4 まで対応）。
 */
import type { InternalLink, TerminalDef } from '../types';
import { plugV, text } from './parts';
import { pioLinks, pioPins, xselPio50, type Polarity } from './pio';

/** システム I/O の端子（ピン番号、ID、印字、説明） */
export const XSEL_SYS_IO: { pin: number; id: string; label: string; note: string }[] = [
  { pin: 10, id: 'DETIN', label: 'DETIN/AUTO1IN', note: '外部接点溶着検出入力（SA）/ 外部モード切替えスイッチ 1 入力（I/O パラメーター No.24 で選択。使わない場合は 9-10 を短絡）' },
  { pin: 9, id: 'DETOUT', label: 'DETOUT/AUTO1OUT', note: '外部接点異常入力用・外部モード切替えスイッチ 1 入力用の 24V 電源出力' },
  { pin: 8, id: 'EMGIN', label: 'EMGin IN', note: '非常停止検出入力（EMGin +24V から非常停止スイッチを通して戻す。切れると減速停止・サーボ OFF）' },
  { pin: 7, id: 'EMG24V', label: 'EMGin +24V', note: '非常停止検出入力用の 24V 電源出力' },
  { pin: 6, id: 'EMG1+', label: 'EMG1 line+', note: 'ティーチングボックスの非常停止接点 系統 1（+側）' },
  { pin: 5, id: 'EMG1-', label: 'EMG1 line-', note: 'ティーチングボックスの非常停止接点 系統 1（−側）' },
  { pin: 4, id: 'EMG2+', label: 'EMG2 line+', note: 'ティーチングボックスの非常停止接点 系統 2（+側。SA のみ）' },
  { pin: 3, id: 'EMG2-', label: 'EMG2 line-', note: 'ティーチングボックスの非常停止接点 系統 2（−側。SA のみ）' },
  { pin: 2, id: 'SDN+', label: 'SDN Out+', note: '駆動源遮断の接点出力（無電圧接点。モーター電源の供給を許可しているとき閉。SA は外部の駆動源遮断回路に使う）' },
  { pin: 1, id: 'SDN-', label: 'SDN Out-', note: '駆動源遮断の接点出力（−側）' },
  { pin: 20, id: 'AUTO2IN', label: 'AUTO2IN', note: '外部モード切替えスイッチ 2 入力（使わない場合は 19-20 を短絡）' },
  { pin: 19, id: 'AUTO2OUT', label: 'AUTO2OUT', note: '外部モード切替えスイッチ 2 入力用の 24V 電源出力' },
  { pin: 18, id: 'ENBIN', label: 'ENBin IN', note: 'イネーブル検出入力（ENBin +24V からセーフティーゲート・イネーブルスイッチを通して戻す）' },
  { pin: 17, id: 'ENB24V', label: 'ENBin +24V', note: 'イネーブル検出入力用の 24V 電源出力' },
  { pin: 16, id: 'ENB1+', label: 'ENB1 line+', note: 'ティーチングボックスのイネーブル接点 系統 1（+側）' },
  { pin: 15, id: 'ENB1-', label: 'ENB1 line-', note: 'ティーチングボックスのイネーブル接点 系統 1（−側）' },
  { pin: 14, id: 'ENB2+', label: 'ENB2 line+', note: 'ティーチングボックスのイネーブル接点 系統 2（+側。SA のみ）' },
  { pin: 13, id: 'ENB2-', label: 'ENB2 line-', note: 'ティーチングボックスのイネーブル接点 系統 2（−側。SA のみ）' },
  { pin: 12, id: 'RDY+', label: 'RDY Out+', note: 'レディー接点出力（無電圧接点、DC24V 最大 200mA。正常動作中に閉）' },
  { pin: 11, id: 'RDY-', label: 'RDY Out-', note: 'レディー接点出力（−側）' },
];

/**
 * XSEL-P / Q のシステム I/O（取扱説明書 MJ0148「第 4 章 ⑩システム I/O コネクタ」。FMC1.5/9-ST-3.5 × 2、左 1〜9・右 10〜18）:
 *   9 DET IN、8 EMGin IN、7 EMGin +24V、6 EMG1 line+・5 EMG1 line-、4 EMG2 line+・3 EMG2 line-、2 SDN Out+・1 SDN Out-、
 *   18 DET +24V、17 ENBin IN、16 ENBin +24V、15 ENB1 line+・14 ENB1 line-、13 ENB2 line+・12 ENB2 line-、11 RDY Out+・10 RDY Out-。
 *   付属は端子台のみで、EMG・ENB はケーブルで短絡して出荷される。
 */
export const XSEL_PQ_SYS_IO: { pin: number; id: string; label: string; note: string }[] = [
  { pin: 9, id: 'DETIN', label: 'DET IN', note: '外部接点異常（溶着）検出入力' },
  { pin: 8, id: 'EMGIN', label: 'EMGin IN', note: '非常停止検出入力（EMGin +24V から非常停止スイッチを通して戻す）' },
  { pin: 7, id: 'EMG24V', label: 'EMGin +24V', note: '非常停止検出入力用の 24V 電源出力' },
  { pin: 6, id: 'EMG1+', label: 'EMG1 line+', note: '非常停止スイッチ 1（ティーチングボックスの非常停止接点 系統 1、+側）' },
  { pin: 5, id: 'EMG1-', label: 'EMG1 line-', note: '非常停止スイッチ 1（−側）' },
  { pin: 4, id: 'EMG2+', label: 'EMG2 line+', note: '非常停止スイッチ 2（Q タイプで使用、+側）' },
  { pin: 3, id: 'EMG2-', label: 'EMG2 line-', note: '非常停止スイッチ 2（−側）' },
  { pin: 2, id: 'SDN+', label: 'SDN Out+', note: '外部リレー駆動遮断の接点出力（無電圧接点）' },
  { pin: 1, id: 'SDN-', label: 'SDN Out-', note: '外部リレー駆動遮断の接点出力（−側）' },
  { pin: 18, id: 'DETOUT', label: 'DET +24V', note: '外部接点異常入力用の 24V 電源出力' },
  { pin: 17, id: 'ENBIN', label: 'ENBin IN', note: 'イネーブル検出入力（ENBin +24V からセーフティーゲートなどを通して戻す）' },
  { pin: 16, id: 'ENB24V', label: 'ENBin +24V', note: 'イネーブル検出入力用の 24V 電源出力' },
  { pin: 15, id: 'ENB1+', label: 'ENB1 line+', note: 'イネーブルスイッチ 1（セーフティーゲートなど、+側）' },
  { pin: 14, id: 'ENB1-', label: 'ENB1 line-', note: 'イネーブルスイッチ 1（−側）' },
  { pin: 13, id: 'ENB2+', label: 'ENB2 line+', note: 'セーフティーゲートスイッチ 2（Q タイプで使用、+側）' },
  { pin: 12, id: 'ENB2-', label: 'ENB2 line-', note: 'セーフティーゲートスイッチ 2（−側）' },
  { pin: 11, id: 'RDY+', label: 'RDY Out+', note: 'レディー信号の接点出力（無電圧接点）' },
  { pin: 10, id: 'RDY-', label: 'RDY Out-', note: 'レディー信号の接点出力（−側）' },
];

const SUPPLY_IDS = new Set(['DETOUT', 'EMG24V', 'AUTO2OUT', 'ENB24V']);

/**
 * システム I/O の 2 列のプラグ（左 10〜1、右 20〜11。上から）を描き、端子を返す。
 * x, y は左のプラグの左上、pitch はピッチ[px]。左のプラグの電線は左へ、右のプラグの電線は右へ出る。
 */
export function xselSystemIo(x: number, y: number, pitch: number, sa: boolean, table = XSEL_SYS_IO) {
  const half = table.length / 2;
  const left = table.slice(0, half).map((s) => s.id);
  const right = table.slice(half).map((s) => s.id);
  const w = 8;
  const L = plugV({ x, y, ids: left, pitch, w, wire: 'left' });
  const R = plugV({ x: x + w + 1.5, y, ids: right, pitch, w, wire: 'right' });
  const pos = { ...L.pos, ...R.pos };
  const svg = `${L.svg}${R.svg}
  ${table.map((s) => text(s.pin > half ? x + w * 2 + 3 : x - 2, pos[s.id].y + 1, String(s.pin), 2.2, '#333', s.pin > half ? 'start' : 'end')).join('')}`;
  const terminals: TerminalDef[] = table.map((s): TerminalDef => {
    const p = pos[s.id];
    const base = { id: s.id, label: `${s.label}（${s.pin}）`, note: s.note, x: p.x, y: p.y, side: p.side };
    if (SUPPLY_IDS.has(s.id)) return { ...base, role: 'supply', supply: { system: 'DC', voltage: 24, conductor: '+', limitCurrent: 0.1, kind: 'test' }, optional: true };
    if (s.id === 'EMGIN' || s.id === 'ENBIN') return { ...base, role: 'signal', function: 'safety-input' };
    if (s.id === 'DETIN') return { ...base, role: 'signal', optional: true, ...(sa ? { function: 'edm' as const } : {}) };
    if (s.id === 'AUTO2IN') return { ...base, role: 'signal', optional: true };
    return { ...base, role: 'signal', optional: true };
  });
  // ティーチングボックスの非常停止・イネーブル接点（TB またはダミープラグ DP-2 で閉）。Conneko では機器の外のもので開く b 接点（safetyContact）として扱い、安全入力のループの接点に数える
  const links: InternalLink[] = [
    { from: 'EMG1+', to: 'EMG1-', switch: 'NC', safetyContact: true },
    { from: 'ENB1+', to: 'ENB1-', switch: 'NC', safetyContact: true },
    ...(sa
      ? [
          { from: 'EMG2+', to: 'EMG2-', switch: 'NC' as const, safetyContact: true },
          { from: 'ENB2+', to: 'ENB2-', switch: 'NC' as const, safetyContact: true },
        ]
      : []),
    { from: 'SDN+', to: 'SDN-', switch: 'NO' },
    { from: 'RDY+', to: 'RDY-', switch: 'NO' },
  ];
  return { svg, terminals, links, height: L.height };
}

/** PIO ボード（I/O スロット）の種類 */
export type XselPioBoard = 'none' | 'N1' | 'N2' | 'P1' | 'P2';

export const XSEL_PIO_OPTIONS = [
  { value: 'none', label: 'なし' },
  { value: 'N1', label: 'N1: 入力 32 / 出力 16（NPN）' },
  { value: 'N2', label: 'N2: 入力 16 / 出力 32（NPN）' },
  { value: 'P1', label: 'P1: 入力 32 / 出力 16（PNP）' },
  { value: 'P2', label: 'P2: 入力 16 / 出力 32（PNP）' },
];

export const boardPolarity = (b: XselPioBoard): Polarity => (b.startsWith('P') ? 'pnp' : 'npn');
export const boardLayout = (b: XselPioBoard): '32/16' | '16/32' => (b.endsWith('2') ? '16/32' : '32/16');

/**
 * PIO ボードのピン・内部経路。slot 1 は入力 000〜・出力 300〜、slot 2 は入力 032〜・出力 316〜（I/O パラメーターの既定の割付けを想定）。
 */
export function xselBoardPins(cn: string, board: XselPioBoard, slot: 1 | 2) {
  if (board === 'none') return { pins: [], links: [] };
  const pts = xselPio50(cn, boardLayout(board), slot === 1 ? 0 : 32, slot === 1 ? 300 : 316, slot === 1);
  return { pins: pioPins(pts, boardPolarity(board)), links: pioLinks(pts, boardPolarity(board), 0.1) };
}

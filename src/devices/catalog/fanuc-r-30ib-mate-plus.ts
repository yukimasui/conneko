import { fanucController } from '../fanuc/controller';
import { CTRL_KIND } from '../fanuc/parts';
import type { DeviceDefinition } from '../types';

/**
 * ファナック ロボットコントローラー R-30iB Mate Plus（M-1iA・LR Mate などの小形ロボット用のキャビネット）。
 *
 * 仕様（ファナックの製品ページ・R-30iB Mate / Mate Plus 保守説明書 B-83525）: 単相 AC200〜230V。メインボードの周辺機器 I/O は入力 28 点・出力 24 点
 * （CRMA15・CRMA16。A01・A02・B01・B02 が +24F、DI101 が A05、DO101 が A15）。外部非常停止 EES1-EES11・EES2-EES21、安全柵 EAS1-EAS11・EAS2-EAS21
 * （使わないときは短絡）。M-1iA との組合せの電源容量は 1kVA とする販売店の掲載がある。キャビネットの外形・質量は確かめられなかった。
 *
 * Conneko での端子: 電源入力 L・N・PE、ロボット接続 RM1・RP1（M-1iA とだけつながる）、ティーチングペンダント（iPendant）の TP、
 * 周辺機器 I/O CRMA15・CRMA16（MIL 50 極）、Ethernet CD38A、安全信号 EES・EAS（2 チャンネル）。共通部品は src/devices/fanuc/controller.ts。
 */

const parts = fanucController({
  p: 'r30m',
  look: 'mate',
  title: 'R-30<tspan font-style="italic">i</tspan>B Mate Plus',
  ctrl: CTRL_KIND.matePlus,
  robots: 'M-1iA',
  ac: { system: 'AC', minVoltage: 170, maxVoltage: 253 },
  acNote: '単相 AC200〜230V',
});

const def: DeviceDefinition = {
  type: 'fanuc.r-30ib-mate-plus',
  name: 'ロボットコントローラー',
  model: 'R-30iB Mate Plus',
  maker: 'ファナック',
  category: 'plc',
  labelPrefix: 'RC',
  ...parts,
  loadCurrent: 5,
  estimated:
    '周辺機器 I/O（CRMA15・CRMA16）のピンの並びは一部（A01・A02・B01・B02 の 24F、A05 の DI101、A15 の DO101）だけ資料で確認し、ほかは推定。出力 1 点の定格 0.2A、' +
    'ロボット I/O（RP1）のピン番号、電源電圧の許容範囲（−15%〜+10%）と消費電流（M-1iA との組合せの電源容量 1kVA から 5A）、キャビネットの外形、端子の配置は推定',
  description:
    'ファナックのロボットコントローラー R-30iB Mate Plus（M-1iA などの小形ロボット用のキャビネット。単相 AC200〜230V、M-1iA との組合せで電源容量 1kVA）。' +
    'ロボットとは RM1（モーター動力・ブレーキ）・RP1（パルスコーダ・ロボット I/O）の 2 本のロボット接続ケーブルでつなぐ（適合するロボットとだけつながる）。' +
    '周辺機器 I/O（PLC との受け渡し）: CRMA15 に汎用入力 DI101〜DI120 と汎用出力 DO101〜DO110、CRMA16 に周辺機器（UOP）入力 *IMSTP・*HOLD・*SFSPD・CSTOPI・FAULT RESET・START・HOME・ENBL、' +
    'UOP 出力 CMDENBL・FAULT・BATALM・BUSY と汎用出力 DO111〜DO120。どちらも 50 極で、MIL 50 極の変換端子台につなぐ。' +
    '入力は DC24V で、コモン SDICOM を 0V につなぐと +24V で ON、+24V につなぐと 0V で ON。出力はソース形で、出力の電源 DOSRC に +24V を供給する。' +
    '安全信号: 外部非常停止 EES1-EES11・EES2-EES21、安全柵 EAS1-EAS11・EAS2-EAS21 に b 接点を 2 チャンネルで入れる（使わないときは短絡線でつなぐ）。' +
    'Ethernet CD38A でパソコン・PLC とつなぐ。ティーチングペンダント iPendant は TP につなぐ。',
};

export default def;

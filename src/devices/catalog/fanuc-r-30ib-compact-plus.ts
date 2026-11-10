import { fanucController } from '../fanuc/controller';
import { CTRL_KIND } from '../fanuc/parts';
import type { DeviceDefinition } from '../types';

/**
 * ファナック ロボットコントローラー R-30iB Compact Plus（スカラロボット SR シリーズ用の薄形コントローラー）。
 *
 * 仕様（ファナックの製品資料・カタログ）: 単相 AC200〜240V、50/60Hz（三相は不要）。SR-3iA との組合せの入力電源容量 2kVA。
 * 外形は 440 × 260 × 85.5mm（幅 × 奥行 × 高さ。資料によって奥行と高さの順が入れ替わる）、質量は約 9kg と読める資料がある（確かめられなかった）。
 *
 * Conneko での端子: 電源入力 L・N・PE、ロボット接続 RM1・RP1（SR-3iA とだけつながる）、ティーチングペンダント（iPendant）の TP、
 * 周辺機器 I/O CRMA15・CRMA16（MIL 50 極）、Ethernet CD38A、安全信号 EES1→EES11・EES2→EES21・EAS1→EAS11・EAS2→EAS21。
 * 周辺機器 I/O の点数・ピンの並びは、R-30iB Mini Plus と同じ（R-30iB Mate のメインボードの資料から）と推定した（src/devices/fanuc/controller.ts）。
 */

const parts = fanucController({
  p: 'r30c',
  look: 'compact',
  title: 'R-30<tspan font-style="italic">i</tspan>B Compact Plus',
  ctrl: CTRL_KIND.compactPlus,
  robots: 'SR-3iA',
  ac: { system: 'AC', minVoltage: 170, maxVoltage: 264 },
  acNote: '単相 AC200〜240V',
});

const def: DeviceDefinition = {
  type: 'fanuc.r-30ib-compact-plus',
  name: 'ロボットコントローラー',
  model: 'R-30iB Compact Plus',
  maker: 'ファナック',
  category: 'plc',
  labelPrefix: 'RC',
  ...parts,
  loadCurrent: 10,
  estimated:
    '周辺機器 I/O（CRMA15・CRMA16）の有無・点数・ピンの並び（R-30iB Mini Plus と同じとした）、出力 1 点の定格 0.2A、ロボット I/O（RP1）のピン番号、' +
    '安全信号の端子の名前と並び、電源電圧の許容範囲（−15%〜+10%）と消費電流（電源容量 2kVA から 10A）、外形・質量、端子の配置は推定',
  description:
    'ファナックのロボットコントローラー R-30iB Compact Plus（スカラロボット SR シリーズ用の薄形。単相 AC200〜240V、SR-3iA との組合せで電源容量 2kVA）。' +
    'ロボットとは RM1（モーター動力・ブレーキ）・RP1（パルスコーダ・ロボット I/O）の 2 本のロボット接続ケーブルでつなぐ（適合するロボットとだけつながる）。' +
    '周辺機器 I/O（PLC との受け渡し）は R-30iB Mini Plus と同じ CRMA15（DI101〜DI120・DO101〜DO110）・CRMA16（UOP 入出力・DO111〜DO120）とした（推定）。' +
    '入力は DC24V で、コモン SDICOM を 0V につなぐと +24V で ON、+24V につなぐと 0V で ON。出力はソース形で、出力の電源 DOSRC に +24V を供給する。' +
    '安全信号: 外部非常停止 EES1-EES11・EES2-EES21、安全柵 EAS1-EAS11・EAS2-EAS21 に b 接点を 2 チャンネルで入れる（使わないときは短絡線でつなぐ）。' +
    'ロボット I/O（RI・RO）はロボットのエンドエフェクタ用コネクター EE に出る。Ethernet CD38A でパソコン・PLC とつなぐ。ティーチングペンダント iPendant は TP につなぐ。',
};

export default def;

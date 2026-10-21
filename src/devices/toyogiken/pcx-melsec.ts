/**
 * 東洋技研 PCX-4F40-TB□-M2-□（三菱電機 PLC 対応、スプリングロック式、FCN 40 極）の 4 機種。
 * 記名板は奥段 10〜1F、手前段 00〜0F、電源部（COM / +V / 0V）が右端。
 * -X は入力ユニット用、-Y は出力ユニット用。TB40 は右端に分岐端子が 4 個ずつ付く。外形 75 × 43mm。
 * 出典: https://www.togi.co.jp/series/interface/211/ ・ /212/ （カタログ PCX-4F40-TB□-□ の記名板・結線図）
 */
import type { DeviceDefinition } from '../types';
import { buildMelsecBlock } from './plc';
import { melsecM2Rows } from './rows';

const TEXT: Record<'TB34-X' | 'TB34-Y' | 'TB40-X' | 'TB40-Y', string> = {
  'TB34-X': '入力ユニット用、34 端子。奥段の右端が COM（B01・B02）、手前段の右端が NC（A01・A02、入力ユニットでは空き）',
  'TB34-Y': '出力ユニット用、34 端子。奥段の右端が +V（B01・B02、外部供給電源 12/24VDC）、手前段の右端が 0V（A01・A02、COM）',
  'TB40-X':
    '入力ユニット用、分岐端子付き 40 端子。奥段の右端 4 端子が COM（B01・B02）、手前段の右端 4 端子が Service（COM）（コネクタにつながらない分岐用コモン、10A。センサー電源の分岐に使う）',
  'TB40-Y': '出力ユニット用、分岐端子付き 40 端子。奥段の右端 4 端子が +V（B01・B02）、手前段の右端 4 端子が 0V（A01・A02）',
};

export function buildPcxMelsec(variant: 'TB34-X' | 'TB34-Y' | 'TB40-X' | 'TB40-Y'): DeviceDefinition {
  const [tb, xy] = variant.split('-');
  const branch = tb === 'TB40';
  return buildMelsecBlock({
    type: `toyogiken.pcx-4f40-${tb.toLowerCase()}-m2-${xy.toLowerCase()}`,
    model: `PCX-4F40-${tb}-M2-${xy}`,
    series: 'pcx',
    widthMm: 75,
    connector: 'FCN',
    poles: 40,
    rows: melsecM2Rows(variant),
    source: `https://www.togi.co.jp/series/interface/${branch ? 212 : 211}/`,
    description: `東洋技研 PCX シリーズの三菱電機 PLC 対応コネクタ端子台（スプリングロック式、FCN 40 極、${TEXT[variant]}）。定格 AC/DC50V、0.5A（COM 2A）。`,
  });
}

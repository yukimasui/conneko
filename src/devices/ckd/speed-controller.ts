/**
 * CKD スピードコントローラ SC3W（ワンタッチ継手付き・エルボ形、メータアウト）の機器定義を作る。
 * おねじをシリンダのポートにねじ込み、横のワンタッチ継手に電磁弁からのチューブをつなぐ。作り・端子 ID は SMC のエルボ形
 * （src/devices/smc/speed-controller.ts の buildAsElbow。TUBE・CYL）とそろえる。
 *
 * 型式: SC3W-<ねじ>-<チューブ外径>（ねじの記号: M5、6 = R1/8、8 = R1/4、10 = R3/8、15 = R1/2）。例: SC3W-6-6
 * 推定（資料で確かめられなかった値）: 選べるねじとチューブ外径の組み合わせ、使用圧力範囲（0.1〜0.9MPa）、ねじの記号の対応、絵（つまみの形・色）
 */
import type { DeviceDefinition, ParamValues } from '../types';
import { oneTouch, r2, SMC_GRADIENTS, text } from '../smc/parts';

/** ねじの記号 → おねじの呼び */
const THREAD: Record<string, string> = { M5: 'M5', '6': 'R1/8', '8': 'R1/4', '10': 'R3/8', '15': 'R1/2' };
/** 選べるねじとチューブ外径（'ねじ-外径'） */
const SIZES = ['M5-4', 'M5-6', '6-4', '6-6', '6-8', '8-6', '8-8', '8-10', '10-8', '10-10', '10-12', '15-12'];

export function buildSc3w(type: string): DeviceDefinition {
  const W = 76;
  const H = 82;
  const bx = 14;
  const cy = 34;
  const cylY = H - 2;
  const cx = 28;
  const svg = (p: ParamValues) => {
    const [thread, od] = String(p.size).split('-');
    return `<defs>${SMC_GRADIENTS}</defs>
  <!-- おねじ（下。シリンダのポートにねじ込む）と六角 -->
  <rect x="${cx - 7}" y="${cy + 14}" width="14" height="7" rx="1" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  <rect x="${cx - 4}" y="${cy + 21}" width="8" height="${cylY - cy - 21}" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.5"/>
  ${[0, 3, 6, 9, 12].map((d) => `<line x1="${cx - 4}" y1="${cy + 26 + d}" x2="${cx + 4}" y2="${cy + 27 + d}" stroke="#7a8086" stroke-width="0.4"/>`).join('')}
  <!-- 本体（黒い樹脂） -->
  <rect x="${bx}" y="${cy - 12}" width="${(cx - bx) * 2}" height="26" rx="3" fill="#2d2f33" stroke="#0e0f10" stroke-width="0.7"/>
  ${text(cx, cy + 4, 'CKD', 5, '#9cc3ff')}
  <!-- 絞りのつまみ（ロックナット付き） -->
  <rect x="${cx - 6}" y="${cy - 17}" width="12" height="5" rx="0.8" fill="url(#smc-metal-{{uid}})" stroke="#5f666c" stroke-width="0.4"/>
  <rect x="${cx - 5}" y="${cy - 29}" width="10" height="12" rx="2" fill="#1b1c1e" stroke="#000" stroke-width="0.5"/>
  ${[-2.5, 0, 2.5].map((d) => `<line x1="${r2(cx + d)}" y1="${cy - 27.5}" x2="${r2(cx + d)}" y2="${cy - 18.5}" stroke="#55595e" stroke-width="0.5"/>`).join('')}
  <!-- 横に出たワンタッチ継手（向きを回せる） -->
  <rect x="${cx + 10}" y="${cy - 7}" width="${W - cx - 28}" height="14" rx="2" fill="#2d2f33" stroke="#0e0f10" stroke-width="0.6"/>
  ${oneTouch(W - 2, cy, 'right', Number(od), 18)}
  ${text(W - 12, cy - 10, 'チューブ', 4.2, '#1f5fa8')}
  ${text(cx + 22, cylY - 3, `${THREAD[thread]} → シリンダ`, 4.2, '#1f5fa8')}
  ${text(W - 18, cy + 15, 'メータアウト', 4.6, '#2e8b3a')}
  ${text(W - 18, cy + 21, '排気を絞る', 4, '#444', 'normal')}
  ${text(cx, 6, `SC3W-${thread}-${od}`, 4.4, '#333')}`;
  };
  return {
    type,
    name: 'スピードコントローラ（エルボ形・メータアウト）',
    model: 'SC3W-6-6',
    modelOf: (p) => `SC3W-${p.size}`,
    maker: 'CKD',
    category: 'air-fitting',
    description:
      'CKD のスピードコントローラ SC3W（ワンタッチ継手付き・エルボ形、メータアウト）。おねじをシリンダのポートに直接ねじ込み、横のワンタッチ継手に電磁弁からのチューブをつなぐ。つまみでシリンダの速さを調整する。' +
      'チューブ → シリンダは自由流れ（絞らない）、シリンダから出る排気を絞る（メータアウト）。図では CYL をシリンダのポートと短いチューブでつなぐ（ねじ込みなので、チューブの外径は問わない）。',
    estimated: '選べるねじとチューブ外径の組み合わせ、使用圧力範囲（0.1〜0.9MPa）、ねじの記号の対応は推定',
    labelPrefix: 'SC',
    width: W,
    height: H,
    svg,
    terminals: (p) => {
      const [thread, od] = String(p.size).split('-');
      return [
        {
          id: 'TUBE',
          label: `φ${Number(od)}`,
          hint: '電磁弁側',
          note: `ワンタッチ継手（φ${Number(od)}。電磁弁の A・B ポートから）。ここからシリンダへは自由流れ`,
          x: W - 2,
          y: cy,
          side: 'right',
          role: 'air',
          air: { kind: 'work', tubeOD: Number(od), minPressure: 0.1, maxPressure: 0.9 },
        },
        {
          id: 'CYL',
          label: THREAD[thread],
          hint: 'シリンダ側',
          note: `おねじ（${THREAD[thread]}。シリンダのポートにねじ込む）`,
          x: cx,
          y: cylY,
          side: 'bottom',
          role: 'air',
          air: { kind: 'work', thread: THREAD[thread], male: true },
        },
      ];
    },
    airLinks: [{ from: 'TUBE', to: 'CYL' }],
    params: [
      {
        key: 'size',
        label: 'ねじ・チューブ外径',
        options: SIZES.map((s) => {
          const [t, od] = s.split('-');
          return { value: s, label: `${THREAD[t]}・φ${od}` };
        }),
        default: '6-6',
      },
    ],
    pneumatic: { symbol: 'speed-controller', ports: { in: 'TUBE', out: 'CYL' } },
  };
}

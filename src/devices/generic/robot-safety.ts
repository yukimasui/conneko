/**
 * ロボットコントローラーの安全入力（外部非常停止・安全柵など）を、2 チャンネルの安全入力の組として書くための共通部品。
 *
 * ファナック R-30iB Mini Plus・安川電機 YRC1000micro と同じ書き方: 出力側（コントローラーの内部の 24V）は `supply.kind: 'test'` と
 * `function: 'test-output'`、入力側は `function: 'safety-input'`。出力側から b 接点を通して入力側へ戻す。
 * 片側だけの配線は safety-channel-partial、チャンネルの取り違えは safety-channel-cross、a 接点は estop-not-nc になる。
 */
import type { SafetyChannelGroup, SupplySpec, TerminalDef } from '../types';

/** 安全信号の入力へ戻す 24V（コントローラーの内部電源） */
export const SAFETY_SRC: SupplySpec = { system: 'DC', voltage: 24, conductor: '+', kind: 'test' };

/** 1 つの安全入力（2 チャンネル） */
export interface RobotSafetyLoop {
  /** 組の ID（例: 'ES'） */
  id: string;
  /** 名前（例: '外部非常停止'） */
  name: string;
  /** 吹き出しの短い名前（例: '非常停止'。後ろにチャンネルの番号を付ける） */
  hint: string;
  /** チャンネル 1・2 の [出力側, 入力側] の端子 ID */
  channels: [[string, string], [string, string]];
  /** 開いたときの動作（例: '非常停止'、'自動運転中ならサーボ電源を切る'） */
  action: string;
  /** 戻す接点の例（例: '非常停止スイッチの b 接点'） */
  contact: string;
}

/** 安全入力の端子の役割（端子 ID → TerminalDef の一部） */
export function safetyTerminalSpecs(loops: RobotSafetyLoop[]): Record<string, Partial<TerminalDef>> {
  const out: Record<string, Partial<TerminalDef>> = {};
  for (const l of loops) {
    l.channels.forEach(([src, inp], i) => {
      const ch = (i + 1) as 1 | 2;
      out[src] = {
        role: 'supply',
        supply: SAFETY_SRC,
        function: 'test-output',
        channel: ch,
        hint: `${l.hint}${ch}+`,
        note: `${l.name} チャンネル ${ch} の出力側（${inp} へ${l.contact}を通して戻す）`,
      };
      out[inp] = {
        role: 'signal',
        function: 'safety-input',
        channel: ch,
        hint: `${l.hint}${ch}`,
        note: `${l.name} チャンネル ${ch} の入力（開くと${l.action}。使わないときは ${src} と短絡）`,
      };
    });
  }
  return out;
}

/** 安全入力の組（safetyChannels） */
export function safetyGroups(loops: RobotSafetyLoop[]): SafetyChannelGroup[] {
  return loops.map((l) => ({
    id: l.id,
    label: `${l.name}（${l.channels.map(([s, i]) => `${s}→${i}`).join('、')}）`,
    kind: 'input',
    mode: 'nc-nc',
    channels: l.channels.map(([source, input]) => ({ source, input })),
  }));
}

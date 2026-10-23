import { useEffect, useRef, useState } from 'react';
import { getDeviceDefinition } from '../devices/registry';
import type { MateCandidate } from '../model/mates';
import type { IoCandidate, PowerCandidate, Suggestions } from '../model/suggest';

interface Props {
  x: number;
  y: number;
  /** つなごうとしている端子の表示名 */
  from: string;
  suggestions: Suggestions;
  /** コネクタから引いた場合: つなげる機器（図面の機器・新しく置く機器） */
  mates: MateCandidate[];
  onMate: (c: MateCandidate) => void;
  onPower: (c: PowerCandidate) => void;
  onIo: (c: IoCandidate) => void;
  onLink: (name: string) => void;
  /** LAN ポートの場合: ネットワーク名を選ぶ・入れる */
  onNetwork: (name: string) => void;
  onClose: () => void;
}

const IO_LIMIT = 40;
const MATE_LIMIT = 40;

/** つなげる機器の候補の表示（名前・説明・注意のタグ） */
function mateText(c: MateCandidate, from: string) {
  const def = getDeviceDefinition(c.type);
  const name = c.device ?? def?.model ?? c.type;
  const detail = [c.device ? def?.model : undefined, def?.maker ?? '汎用', def?.name].filter(Boolean).join(' ');
  const tags = [
    ...(c.pairs.length > 1 ? [`ケーブル ${c.pairs.length} 本`] : []),
    ...(c.sourceChange ? [`${from.split('.')[0]} の${c.sourceChange.label}`] : []),
    ...(c.needsMount ? ['装着が必要'] : []),
  ];
  return { name, detail, tags };
}

/**
 * 端子から電線を引いて何もないところで離したときの、接続先の候補。
 * 電源（リンクの名前）・空いている PLC の入出力・名前を入れてリンクを置く、から選ぶ。
 */
export function ConnectPicker({ x, y, from, suggestions, mates: allMates, onMate, onPower, onIo, onLink, onNetwork, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [linkName, setLinkName] = useState(suggestions.defaultName);
  const [pos, setPos] = useState({ x, y });

  useEffect(() => {
    const el = ref.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setPos({ x: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)), y: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)) });
    }
    const down = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) onClose();
    };
    window.addEventListener('pointerdown', down, true);
    return () => window.removeEventListener('pointerdown', down, true);
  }, [x, y, onClose]);

  const words = query.trim().toLowerCase();
  const match = (text: string) => !words || text.toLowerCase().includes(words);
  const power = suggestions.power.filter((p) => match(`${p.name} ${p.detail}`));
  const io = suggestions.io.filter((c) => match(`${c.point.address} ${c.point.comment} ${c.point.device}`));
  const lan = !!suggestions.networks;
  const networks = (suggestions.networks ?? []).filter((n) => match(n));
  const place = (name: string) => (lan ? onNetwork(name) : onLink(name));
  const mates = allMates.filter((c) => {
    const t = mateText(c, from);
    return match(`${t.name} ${t.detail} ${c.type}`);
  });
  const placedMates = mates.filter((c) => c.device);
  const newMates = mates.filter((c) => !c.device);
  // LAN 以外のコネクタは、つなげる機器だけを出す（リンクは置かない）
  const connectorOnly = allMates.length > 0 && !lan;
  const first = () => {
    if (mates[0]) {
      onMate(mates[0]);
      return;
    }
    if (lan) {
      if (networks[0]) onNetwork(networks[0]);
      else if (query.trim()) onNetwork(query.trim());
      return;
    }
    if (power[0]) onPower(power[0]);
    else if (io[0]) onIo(io[0]);
    else if (query.trim()) onLink(query.trim());
  };

  return (
    <div
      ref={ref}
      className="connect-picker"
      style={{ left: pos.x, top: pos.y }}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="connect-picker__head">
        <strong>{from}</strong> の接続先
      </div>
      <input
        className="connect-picker__search"
        autoFocus
        placeholder="絞り込み（Enter で先頭を選ぶ）"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && first()}
      />
      <div className="connect-picker__body">
        {placedMates.length > 0 && (
          <section>
            <h4>図面の機器につなぐ</h4>
            {placedMates.map((c) => (
              <MateItem key={`${c.device}`} c={c} from={from} onMate={onMate} />
            ))}
          </section>
        )}
        {newMates.length > 0 && (
          <section>
            <h4>置いてつなぐ</h4>
            {newMates.slice(0, MATE_LIMIT).map((c) => (
              <MateItem key={c.type} c={c} from={from} onMate={onMate} />
            ))}
            {newMates.length > MATE_LIMIT && <p className="muted small">ほか {newMates.length - MATE_LIMIT} 機種（絞り込んでください）</p>}
          </section>
        )}
        {networks.length > 0 && (
          <section>
            <h4>ネットワーク</h4>
            {networks.map((n) => (
              <button key={n} type="button" className="connect-picker__item" onClick={() => onNetwork(n)}>
                <span className="connect-picker__name">{n}</span>
                <span className="muted">同じネットワークにつなぐ</span>
              </button>
            ))}
          </section>
        )}
        {power.length > 0 && (
          <section>
            <h4>電源</h4>
            {power.map((p) => (
              <button key={p.name} type="button" className="connect-picker__item" onClick={() => onPower(p)}>
                <span className="connect-picker__name">{p.name}</span>
                <span className="muted">{p.detail}</span>
                {p.attach && <span className="connect-picker__tag">リンクを新設</span>}
              </button>
            ))}
          </section>
        )}
        {io.length > 0 && (
          <section>
            <h4>PLC の空き{io[0].point.dir === 'in' ? '入力' : '出力'}</h4>
            {io.slice(0, IO_LIMIT).map((c) => (
              <button key={`${c.point.device}:${c.point.terminal}`} type="button" className="connect-picker__item" onClick={() => onIo(c)}>
                <span className="connect-picker__name">{c.point.address}</span>
                <span className="muted">
                  {c.point.device}
                  {c.point.comment ? ` ${c.point.comment}` : ''}
                </span>
              </button>
            ))}
            {io.length > IO_LIMIT && <p className="muted small">ほか {io.length - IO_LIMIT} 点（絞り込んでください）</p>}
          </section>
        )}
        {connectorOnly && !mates.length && <p className="muted small">絞り込みに合う機器がありません。</p>}
        {!connectorOnly && !power.length && !io.length && !networks.length && (
          <p className="muted small">候補がありません。名前を入れて{lan ? 'ネットワークリンク' : 'リンク'}を置けます。</p>
        )}
      </div>
      {!connectorOnly && (
        <div className="connect-picker__link">
          <input
            placeholder={lan ? 'ネットワークの名前（例: 制御LAN）' : 'リンクの名前'}
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && linkName.trim() && place(linkName.trim())}
          />
          <button type="button" disabled={!linkName.trim()} onClick={() => place(linkName.trim())}>
            {lan ? 'ネットワークリンクを置く' : 'リンクを置く'}
          </button>
        </div>
      )}
    </div>
  );
}

function MateItem({ c, from, onMate }: { c: MateCandidate; from: string; onMate: (c: MateCandidate) => void }) {
  const t = mateText(c, from);
  return (
    <button type="button" className="connect-picker__item connect-picker__mate" onClick={() => onMate(c)}>
      <span className="connect-picker__name">{t.name}</span>
      <span className="connect-picker__mate-body">
        <span className="muted">{t.detail}</span>
        {t.tags.length > 0 && (
          <span className="connect-picker__tags">
            {t.tags.map((x) => (
              <span key={x} className="connect-picker__tag">
                {x}
              </span>
            ))}
          </span>
        )}
      </span>
    </button>
  );
}

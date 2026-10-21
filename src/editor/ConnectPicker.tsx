import { useEffect, useRef, useState } from 'react';
import type { IoCandidate, PowerCandidate, Suggestions } from '../model/suggest';

interface Props {
  x: number;
  y: number;
  /** つなごうとしている端子の表示名 */
  from: string;
  suggestions: Suggestions;
  onPower: (c: PowerCandidate) => void;
  onIo: (c: IoCandidate) => void;
  onLink: (name: string) => void;
  /** LAN ポートの場合: ネットワーク名を選ぶ・入れる */
  onNetwork: (name: string) => void;
  onClose: () => void;
}

const IO_LIMIT = 40;

/**
 * 端子から電線を引いて何もないところで離したときの、接続先の候補。
 * 電源（リンクの名前）・空いている PLC の入出力・名前を入れてリンクを置く、から選ぶ。
 */
export function ConnectPicker({ x, y, from, suggestions, onPower, onIo, onLink, onNetwork, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [linkName, setLinkName] = useState('');
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
  const first = () => {
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
        {!power.length && !io.length && !networks.length && (
          <p className="muted small">候補がありません。名前を入れて{lan ? 'ネットワークリンク' : 'リンク'}を置けます。</p>
        )}
      </div>
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
    </div>
  );
}

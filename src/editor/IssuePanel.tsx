import { useState } from 'react';
import type { CheckIssue, Severity } from '../check/checkDiagram';
import type { Diagram } from '../model/diagram';
import { ConnectionList } from './ConnectionList';

const SEVERITY_NAMES: Record<Severity, string> = { error: 'エラー', warning: '警告', info: '情報' };

type Tab = 'issues' | 'connections';

interface Props {
  issues: CheckIssue[];
  diagram: Diagram;
  onSelect: (issue: CheckIssue) => void;
  onSelectWire: (id: string) => void;
  onJump: (deviceId: string) => void;
}

/** 画面下のパネル（配線チェックの結果と、接続リスト） */
export function IssuePanel({ issues, diagram, onSelect, onSelectWire, onJump }: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<Tab>('issues');
  const count = (s: Severity) => issues.filter((i) => i.severity === s).length;
  const show = (t: Tab) => {
    if (open && tab === t) setOpen(false);
    else {
      setTab(t);
      setOpen(true);
    }
  };

  return (
    <section className={`issues${open ? ' is-open' : ''}`}>
      <div className="issues__header">
        <button type="button" className={`issues__tab${tab === 'issues' && open ? ' is-active' : ''}`} onClick={() => show('issues')}>
          <span className="panel-title">配線チェック</span>
          {issues.length === 0 ? (
            <span className="badge badge--ok">問題なし</span>
          ) : (
            (['error', 'warning', 'info'] as Severity[]).map((s) =>
              count(s) ? (
                <span key={s} className={`badge badge--${s}`}>
                  {SEVERITY_NAMES[s]} {count(s)}
                </span>
              ) : null,
            )
          )}
        </button>
        <button type="button" className={`issues__tab${tab === 'connections' && open ? ' is-active' : ''}`} onClick={() => show('connections')}>
          <span className="panel-title">接続リスト</span>
          <span className="badge">{diagram.wires.length}</span>
        </button>
        <button type="button" className="issues__toggle" onClick={() => setOpen(!open)} aria-label={open ? '閉じる' : '開く'}>
          {open ? '▾' : '▴'}
        </button>
      </div>
      {open && tab === 'issues' && issues.length > 0 && (
        <ul className="issues__list">
          {issues.map((i) => (
            <li key={i.key}>
              <button type="button" className={`issue sev-${i.severity}`} onClick={() => onSelect(i)}>
                <span className="issue__sev">{SEVERITY_NAMES[i.severity]}</span>
                <span>{i.message}</span>
                {i.estimated && (
                  <span className="issue__est" title="この指摘に関わる機器のデータに、メーカーの資料で確認できなかった推定の値が含まれます">
                    推定を含む
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && tab === 'connections' && <ConnectionList diagram={diagram} onSelectWire={onSelectWire} onJump={onJump} />}
    </section>
  );
}

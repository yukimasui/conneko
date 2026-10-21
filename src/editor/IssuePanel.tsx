import { useState } from 'react';
import type { CheckIssue, Severity } from '../check/checkDiagram';

const SEVERITY_NAMES: Record<Severity, string> = { error: 'エラー', warning: '警告', info: '情報' };

export function IssuePanel({ issues, onSelect }: { issues: CheckIssue[]; onSelect: (issue: CheckIssue) => void }) {
  const [open, setOpen] = useState(true);
  const count = (s: Severity) => issues.filter((i) => i.severity === s).length;

  return (
    <section className={`issues${open ? ' is-open' : ''}`}>
      <button type="button" className="issues__header" onClick={() => setOpen(!open)}>
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
        <span className="issues__toggle">{open ? '▾' : '▴'}</span>
      </button>
      {open && issues.length > 0 && (
        <ul className="issues__list">
          {issues.map((i) => (
            <li key={i.key}>
              <button type="button" className={`issue sev-${i.severity}`} onClick={() => onSelect(i)}>
                <span className="issue__sev">{SEVERITY_NAMES[i.severity]}</span>
                <span>{i.message}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

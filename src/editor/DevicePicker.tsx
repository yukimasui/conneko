import { useEffect, useMemo, useState } from 'react';
import { variantLabel, type DeviceFamily } from '../devices/families';
import { instantiateSvg } from '../devices/registry';
import type { DeviceDefinition } from '../devices/types';

function Thumb({ def }: { def: DeviceDefinition }) {
  const svg = useMemo(() => instantiateSvg(def, `pick-${def.type}`), [def]);
  return <svg className="picker__thumb" viewBox={`0 0 ${def.width} ${def.height}`} dangerouslySetInnerHTML={{ __html: svg }} />;
}

interface Props {
  family: DeviceFamily;
  /** 最初に選んでおく機器の type */
  initial: string;
  /** 'add': 置く、'replace': 置いた機器の機種を変える */
  mode: 'add' | 'replace';
  /** 差し替えのとき、いまの機種の端子のうち新しい機種にないものを数えるための関数（外れる電線の数） */
  dropCount?: (type: string) => number;
  onPick: (type: string) => void;
  onClose: () => void;
}

/**
 * 「機種を選ぶ」ダイアログ。ファミリー（漏電ブレーカー・電磁弁など）の中から、メーカー・極数・切換えの種類などの観点で絞り込んで機種を選ぶ。
 * 定格電流・ストロークなどのパラメータは、置いたあとにプロパティで変える
 */
export function DevicePicker({ family, initial, mode, dropCount, onPick, onClose }: Props) {
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState(initial);

  // 観点ごとに、ほかの観点の絞り込みに合う機器の値だけを選択肢に出す
  const matches = (d: DeviceDefinition, skip?: string) =>
    family.facets.every((f) => f.label === skip || !filters[f.label] || f.value(d) === undefined || f.value(d) === filters[f.label]);
  const list = family.members.filter((d) => matches(d));
  const current = list.find((d) => d.type === selected) ?? list[0];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Enter' && current && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
        onPick(current.type);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [current, onPick, onClose]);

  const setFilter = (label: string, value: string | null) => {
    const next = { ...filters };
    if (value === null) delete next[label];
    else next[label] = value;
    setFilters(next);
  };

  const dropped = mode === 'replace' && current && dropCount ? dropCount(current.type) : 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal picker" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={`${family.name}の機種を選ぶ`}>
        <div className="io-dialog__head">
          <h2>
            {family.name}
            <span className="muted">{mode === 'add' ? 'の機種を選んで置く' : 'の機種を変える'}</span>
          </h2>
          <button type="button" className="io-dialog__close" onClick={onClose} aria-label="閉じる">
            ✕
          </button>
        </div>
        {family.facets.length > 0 && (
          <div className="picker__facets">
            {family.facets.map((f) => {
              const values = [...new Set(family.members.filter((d) => matches(d, f.label)).map(f.value).filter((v): v is string => v !== undefined))];
              if (values.length < 2 && !filters[f.label]) return null;
              return (
                <div key={f.label} className="picker__facet">
                  <span className="picker__facet-label">{f.label}</span>
                  <div className="picker__chips">
                    <button type="button" className={`chip${!filters[f.label] ? ' is-active' : ''}`} onClick={() => setFilter(f.label, null)}>
                      すべて
                    </button>
                    {values.map((v) => (
                      <button key={v} type="button" className={`chip${filters[f.label] === v ? ' is-active' : ''}`} onClick={() => setFilter(f.label, filters[f.label] === v ? null : v)}>
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="picker__list">
          {list.map((d) => (
            <button
              key={d.type}
              type="button"
              className={`picker__item${current?.type === d.type ? ' is-selected' : ''}`}
              onClick={() => setSelected(d.type)}
              onDoubleClick={() => onPick(d.type)}
              title={d.description}
            >
              <Thumb def={d} />
              <span className="picker__name">{variantLabel(family, d)}</span>
              <span className="picker__model">
                {d.maker && <span className="palette__maker">{d.maker}</span>}
                {d.model}
              </span>
            </button>
          ))}
          {!list.length && <p className="muted">条件に合う機種がありません</p>}
        </div>
        {current && (
          <div className="picker__detail">
            <div>
              <strong>{current.name}</strong>{' '}
              <span className="muted">
                {current.maker ? `${current.maker} ` : ''}
                {current.model}
              </span>
            </div>
            {current.description && <p className="small muted picker__desc">{current.description}</p>}
            {(current.params?.length ?? 0) > 0 && (
              <p className="small">
                {current.params!.map((p) => p.label).join('・')} は、{mode === 'add' ? '置いたあと' : '変えたあと'}にプロパティで選べます。
              </p>
            )}
            {dropped > 0 && <p className="small warning-text">この機種には同じ端子がないため、電線 {dropped} 本が外れます。</p>}
          </div>
        )}
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="primary" disabled={!current || (mode === 'replace' && current.type === initial)} onClick={() => current && onPick(current.type)}>
            {mode === 'add' ? '置く' : 'この機種に変える'}
          </button>
        </div>
      </div>
    </div>
  );
}

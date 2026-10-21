import { useState } from 'react';
import type { DiagramSettings, Sheet } from '../model/diagram';
import type { PrintOptions } from './PrintView';

interface Props {
  sheets: Sheet[];
  settings: DiagramSettings;
  onSettings: (patch: Partial<DiagramSettings>) => void;
  onPrint: (options: PrintOptions) => void;
  onClose: () => void;
}

/** 印刷・PDF の設定（図面枠の内容、用紙、印刷するシートと一覧） */
export function PrintDialog({ sheets, settings, onSettings, onPrint, onClose }: Props) {
  const [opts, setOpts] = useState<PrintOptions>({
    paper: 'A3',
    sheets: sheets.map((s) => s.id),
    bom: true,
    wires: true,
    io: true,
    issues: true,
    markers: true,
    notes: true,
  });
  const set = (patch: Partial<PrintOptions>) => setOpts((o) => ({ ...o, ...patch }));
  const toggleSheet = (id: string) => set({ sheets: opts.sheets.includes(id) ? opts.sheets.filter((x) => x !== id) : [...opts.sheets, id] });
  const text = (key: 'title' | 'author' | 'revision', label: string, placeholder: string) => (
    <label className="field">
      <span>{label}</span>
      <input
        defaultValue={settings[key] ?? ''}
        placeholder={placeholder}
        onBlur={(e) => e.target.value !== (settings[key] ?? '') && onSettings({ [key]: e.target.value.trim() || undefined })}
      />
    </label>
  );
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal print-dialog" onClick={(e) => e.stopPropagation()}>
        <h2>印刷・PDF</h2>
        <p className="muted small">ブラウザの印刷画面が開きます。PDF にするには、送信先（プリンター）で「PDF に保存」を選んでください。</p>
        <div className="print-dialog__grid">
          <section>
            <h3>図面枠</h3>
            {text('title', '図面名', '例: 第2ライン コンベア制御盤')}
            {text('author', '作成', '例: 山田')}
            {text('revision', '版', '例: A')}
          </section>
          <section>
            <h3>用紙（横向き）</h3>
            <div className="print-dialog__row">
              {(['A3', 'A4'] as const).map((p) => (
                <label key={p}>
                  <input type="radio" checked={opts.paper === p} onChange={() => set({ paper: p })} /> {p}
                </label>
              ))}
            </div>
            <h3>シート</h3>
            {sheets.map((s, i) => (
              <label key={s.id} className="print-dialog__check">
                <input type="checkbox" checked={opts.sheets.includes(s.id)} onChange={() => toggleSheet(s.id)} /> {i + 1}. {s.name}
              </label>
            ))}
            <h3>一覧・表示</h3>
            {(
              [
                ['bom', '部品表'],
                ['wires', '線番表'],
                ['io', 'I/O 表'],
                ['issues', 'チェック結果'],
                ['markers', '線番（マークチューブ）'],
                ['notes', '機器のコメント'],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="print-dialog__check">
                <input type="checkbox" checked={opts[k]} onChange={(e) => set({ [k]: e.target.checked })} /> {label}
              </label>
            ))}
          </section>
        </div>
        <div className="modal__actions">
          <button type="button" onClick={onClose}>
            キャンセル
          </button>
          <button type="button" className="primary" disabled={!opts.sheets.length && !opts.bom && !opts.wires && !opts.io && !opts.issues} onClick={() => onPrint(opts)}>
            印刷・PDF に保存…
          </button>
        </div>
      </div>
    </div>
  );
}

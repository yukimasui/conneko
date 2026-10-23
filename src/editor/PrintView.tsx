import { useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { CheckIssue, Severity } from '../check/checkDiagram';
import { getDeviceDefinition } from '../devices/registry';
import { bomRows, ioRows, wireRows } from '../export/reports';
import { pageNameOf, printableArea, printPageCss } from '../export/printPages';
import { renderSheetSvg } from '../export/sheetSvg';
import { sheetsOf, type Diagram } from '../model/diagram';
import { buildSchematic } from '../schematic/layout';
import type { PaperSize } from '../schematic/model';
import { sheetSvg } from '../schematic/svg';

export type { PaperSize };

export interface PrintOptions {
  /** 概念図のシートと一覧の用紙（展開図はシートごとの用紙） */
  paper: PaperSize;
  /** 印刷するシートのID */
  sheets: string[];
  /** 印刷する展開図のシートのID（端子台接続図など複数ページになるシートはすべてのページ） */
  schematic: string[];
  bom: boolean;
  wires: boolean;
  io: boolean;
  issues: boolean;
  markers: boolean;
  notes: boolean;
}

const SEVERITY_NAMES: Record<Severity, string> = { error: 'エラー', warning: '警告', info: '情報' };

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

/** 図面枠（右下の表題欄） */
function TitleBlock({ diagram, page, pages, sheetName }: { diagram: Diagram; page: number; pages: number; sheetName: string }) {
  const s = diagram.settings ?? {};
  return (
    <table className="print-title">
      <tbody>
        <tr>
          <th>図面名</th>
          <td colSpan={3}>{s.title || '（無題）'}</td>
        </tr>
        <tr>
          <th>内容</th>
          <td>{sheetName}</td>
          <th>ページ</th>
          <td>
            {page} / {pages}
          </td>
        </tr>
        <tr>
          <th>作成</th>
          <td>{s.author ?? ''}</td>
          <th>版</th>
          <td>{s.revision ?? ''}</td>
        </tr>
        <tr>
          <th>日付</th>
          <td>{today()}</td>
          <th colSpan={2} className="print-title__app">
            Conneko v{__APP_VERSION__}
          </th>
        </tr>
      </tbody>
    </table>
  );
}

/**
 * 印刷用のページ（印刷のときだけ表示する）。シートごとの図面と、展開図のページ、部品表・線番表・I/O 表・チェック結果。
 * 表示したらブラウザの印刷を開き、印刷が終わったら onDone を呼ぶ。
 */
export function PrintView({ diagram, issues, options, onDone }: { diagram: Diagram; issues: CheckIssue[]; options: PrintOptions; onDone: () => void }) {
  const paper = printableArea(options.paper);
  const sheets = sheetsOf(diagram).filter((s) => options.sheets.includes(s.id));
  const drawings = useMemo(
    () => sheets.map((s) => ({ sheet: s, ...renderSheetSvg(diagram, s.id, getDeviceDefinition, { markers: options.markers, notes: options.notes }) })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [diagram, options],
  );
  // 展開図のページ（図面枠・表題欄・ページ番号は展開図の中に描いてある）
  const schematicPages = useMemo(() => {
    if (!options.schematic.length || !diagram.schematic?.sheets.length) return [];
    const { doc } = buildSchematic(diagram, getDeviceDefinition);
    return doc.sheets.filter((p) => options.schematic.includes(p.source ?? p.id)).map((p) => ({ page: p, svg: sheetSvg(doc, p) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diagram, options]);
  const bom = options.bom ? bomRows(diagram, getDeviceDefinition) : [];
  const wires = options.wires ? wireRows(diagram, getDeviceDefinition).rows : [];
  const io = options.io ? ioRows(diagram, getDeviceDefinition) : [];
  const reportPages = [options.bom && '部品表', options.wires && '線番表', options.io && io.length > 0 && 'I/O 表', options.issues && 'チェック結果'].filter(Boolean) as string[];
  const pages = drawings.length + reportPages.length;

  // 表示したら 1 回だけ印刷を開く（onDone が描画のたびに変わっても開き直さない）
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const done = () => doneRef.current();
    window.addEventListener('afterprint', done);
    // 描画が終わってから印刷を開く
    const t = window.setTimeout(() => window.print(), 150);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener('afterprint', done);
    };
  }, []);

  const pageStyle = { width: `${paper.w}mm`, height: `${paper.h}mm` };
  let n = 0;
  return createPortal(
    <div className="print-root">
      <style>{printPageCss(options.paper, schematicPages.map((p) => p.page.paper))}</style>
      {drawings.map((d) => (
        <section key={d.sheet.id} className="print-page" style={pageStyle}>
          <div className="print-drawing" dangerouslySetInnerHTML={{ __html: d.svg.replace('<svg ', '<svg preserveAspectRatio="xMidYMid meet" ').replace(/ width="\d+" height="\d+"/, ' width="100%" height="100%"') }} />
          <TitleBlock diagram={diagram} page={++n} pages={pages} sheetName={`シート「${d.sheet.name}」`} />
        </section>
      ))}
      {schematicPages.map(({ page: p, svg }) => (
        <section
          key={p.id}
          className="print-page is-schematic"
          // 用紙ちょうどの高さにすると、丸めで次のページにはみ出すことがあるので少し小さくする
          style={{ width: `${p.paper.width - 1}mm`, height: `${p.paper.height - 1}mm`, page: pageNameOf(p.paper) }}
          dangerouslySetInnerHTML={{ __html: svg.replace(/ width="[\d.]+mm" height="[\d.]+mm"/, ' width="100%" height="100%"') }}
        />
      ))}
      {options.bom && (
        <section className="print-page is-report" style={{ width: `${paper.w}mm` }}>
          <h2>部品表</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>メーカー</th>
                <th>型式</th>
                <th>名称</th>
                <th>仕様</th>
                <th>数量</th>
                <th>機器名</th>
              </tr>
            </thead>
            <tbody>
              {bom.map((r) => (
                <tr key={`${r.model}|${r.spec}|${r.ids[0]}`}>
                  <td>{r.maker}</td>
                  <td>
                    {r.model}
                    {r.estimated ? ' ※' : ''}
                  </td>
                  <td>{r.name}</td>
                  <td>{r.spec}</td>
                  <td className="num">{r.qty}</td>
                  <td>{r.ids.join(' ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {bom.some((r) => r.estimated) && <p className="print-note">※ 機器データに推定の値を含みます。型式・仕様はメーカーの資料で確認してください。</p>}
          <TitleBlock diagram={diagram} page={++n} pages={pages} sheetName="部品表" />
        </section>
      )}
      {options.wires && (
        <section className="print-page is-report" style={{ width: `${paper.w}mm` }}>
          <h2>線番表</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>シート</th>
                <th>線番</th>
                <th>接続元</th>
                <th>接続先</th>
                <th>電線</th>
                <th>コメント</th>
              </tr>
            </thead>
            <tbody>
              {wires.map((r) => (
                <tr key={r.id}>
                  <td>{r.sheetName}</td>
                  <td>{r.wireNo}</td>
                  <td>{r.from}</td>
                  <td>{r.to}</td>
                  <td>{r.spec}</td>
                  <td>{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TitleBlock diagram={diagram} page={++n} pages={pages} sheetName="線番表" />
        </section>
      )}
      {options.io && io.length > 0 && (
        <section className="print-page is-report" style={{ width: `${paper.w}mm` }}>
          <h2>I/O 表</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>PLC</th>
                <th>ユニット</th>
                <th>番号</th>
                <th>入出力</th>
                <th>コメント</th>
                <th>接続先</th>
              </tr>
            </thead>
            <tbody>
              {io.map((r) => (
                <tr key={`${r.unit}|${r.address}`}>
                  <td>{r.host}</td>
                  <td>
                    {r.unit} {r.model}
                  </td>
                  <td>{r.address}</td>
                  <td>{r.dir}</td>
                  <td>{r.comment}</td>
                  <td>{r.connections}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <TitleBlock diagram={diagram} page={++n} pages={pages} sheetName="I/O 表" />
        </section>
      )}
      {options.issues && (
        <section className="print-page is-report" style={{ width: `${paper.w}mm` }}>
          <h2>チェック結果</h2>
          {issues.length ? (
            <table className="print-table">
              <thead>
                <tr>
                  <th>重要度</th>
                  <th>内容</th>
                </tr>
              </thead>
              <tbody>
                {issues.map((i) => (
                  <tr key={i.key}>
                    <td>{SEVERITY_NAMES[i.severity]}</td>
                    <td>
                      {i.message}
                      {i.estimated ? '（推定の値を含む機器に関する指摘）' : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p>指摘はありません。</p>
          )}
          <p className="print-note">配線チェックの結果は参考です。法令・規格への適合や安全を保証するものではありません。</p>
          <TitleBlock diagram={diagram} page={++n} pages={pages} sheetName="チェック結果" />
        </section>
      )}
    </div>,
    document.body,
  );
}

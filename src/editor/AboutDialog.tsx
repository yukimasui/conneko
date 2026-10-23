import { useEffect } from 'react';
import licenses from 'virtual:third-party-licenses';
import logoUrl from '../assets/conneko-logo.webp?inline';

/** 「Conneko について」: バージョン、ライセンスの要約、免責、商標、同梱の外部ライブラリのライセンス */
export function AboutDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal about" onClick={(e) => e.stopPropagation()}>
        <img className="about__logo" src={logoUrl} alt="Conneko のロゴ" />
        <h2>Conneko v{__APP_VERSION__}</h2>
        <p className="muted">生産設備の電気配線とエア回路を、専門知識や専用 CAD なしで手軽に描ける作図ツール。</p>
        <section>
          <h3>ライセンス（Conneko License 1.0）</h3>
          <ul>
            <li>個人・教育機関・研究機関・非営利団体は、無償で使用・改変・再配布できます。</li>
            <li>企業が導入を検討するための試し使い（評価利用）は、無償で使えます。</li>
            <li>
              企業が実際の設備の配線設計・作図・保守などの業務に使う場合は、<strong>事前に作成者に連絡し、許諾を得てください</strong>。
            </li>
          </ul>
          <p className="small">
            全文:{' '}
            <a href="https://github.com/yukimasui/conneko/blob/main/LICENSE" target="_blank" rel="noreferrer">
              LICENSE
            </a>
            ／ 連絡先:{' '}
            <a href="https://github.com/yukimasui" target="_blank" rel="noreferrer">
              https://github.com/yukimasui
            </a>
            ／ Copyright (c) 2026 yukimasui
          </p>
        </section>
        <section>
          <h3>免責</h3>
          <p className="small">
            配線チェックの結果・機器のデータ（推定の値を含みます）・作成した図面は参考です。法令・規格への適合や安全を保証するものではありません。
            実際の設計・施工・安全の判断は、有資格者・専門家の責任で行ってください。本ソフトウェアは無保証で提供されます。
          </p>
          <p className="small muted">記載の会社名・製品名は各社の商標または登録商標です。本ソフトウェアは各メーカーとは関係がありません。</p>
        </section>
        <details className="about__oss">
          <summary>同梱している外部ライブラリのライセンス（{licenses.length} 件）</summary>
          {licenses.map((l) => (
            <div key={l.name} className="about__lib">
              <strong>
                {l.name} {l.version}
              </strong>{' '}
              <span className="muted">{l.license}</span>
              {l.text && <pre>{l.text}</pre>}
            </div>
          ))}
        </details>
        <div className="modal__actions">
          <button type="button" className="primary" onClick={onClose}>
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}

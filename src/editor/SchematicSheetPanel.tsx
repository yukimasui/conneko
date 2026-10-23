/**
 * 展開図のシートの作成（種類を選ぶ画面）と、右のパネルのシートの設定（種類ごと）。
 */
import { useState } from 'react';
import type { DiagramSettings } from '../model/diagram';
import { PAPER_SIZES } from '../schematic/format';
import { defaultRails, ROW_PITCH, sheetKindName, type SchematicBuild } from '../schematic/layout';
import { newSchematicSheet, type PaperSize, type Rails, type Schematic, type SchematicSheet, type SheetKind } from '../schematic/model';

/** 作れるシートの種類（kind が undefined の展開接続図は、母線のあり・なしで制御回路と主回路に分ける） */
type NewKind = 'control' | 'main' | SheetKind;

const NEW_KINDS: { kind: NewKind; label: string; name: string; description: string }[] = [
  { kind: 'control', label: '制御回路（展開接続図）', name: '制御回路', description: '左に P24・N24 などの母線を並べ、接点・コイル・表示灯の段を描きます。「自動で並べる」で段を組めます。' },
  { kind: 'main', label: '主回路（展開接続図）', name: '主回路', description: 'R・S・T の ○ から遮断器・電磁接触器・サーマル・電動機を縦に描き、分岐（CP など）は横に出します。' },
  { kind: 'io', label: 'PLC の I/O 図', name: 'I/O 図', description: 'PLC のユニットごとに端子・アドレス・コメントを表に並べ、各点から機器を通って電源へ線を出します（自動で作ります）。' },
  { kind: 'rack', label: 'PLC のユニット構成図', name: 'ユニット構成', description: 'CPU・ベースユニットと装着したユニットの並び、入出力番号の範囲、内部電源の収支を描きます（自動で作ります）。' },
  { kind: 'terminal', label: '端子台接続図', name: '端子台接続図', description: '端子台ごとに、端子の両側の接続先と線番の表を作ります（自動で作ります）。' },
  { kind: 'pneumatic', label: '空圧回路図', name: '空圧回路図', description: 'エア源・3 点セット・電磁弁・速度制御弁・シリンダを JIS の空圧記号で描きます。概念図のエア機器とチューブから自動で作ります。' },
  { kind: 'bom', label: '部品表', name: '部品表', description: '機器を型式・仕様ごとにまとめた表です（自動で作ります）。' },
  { kind: 'cover', label: '表紙・図面目次', name: '表紙', description: '図面名・作成者・版と、全ページの目次です。いちばん前に入れます（自動で作ります）。' },
];

const PAPERS = Object.keys(PAPER_SIZES) as PaperSize[];

export function NewSheetDialog(props: {
  build: SchematicBuild;
  schematic: Schematic;
  onCreate: (sheet: SchematicSheet, first: boolean) => void;
  onClose: () => void;
}) {
  const { build } = props;
  const [kind, setKind] = useState<NewKind>('control');
  const spec = NEW_KINDS.find((k) => k.kind === kind)!;
  const [name, setName] = useState('');
  const [paper, setPaper] = useState<PaperSize>(props.schematic.settings?.paper ?? 'A3');
  const hosts = kind === 'io' ? build.ioHosts : kind === 'rack' ? build.rackHosts : [];
  const [plc, setPlc] = useState('');
  const needsPlc = kind === 'io' || kind === 'rack';
  const noPlc = needsPlc && hosts.length === 0;

  const create = () => {
    const base = newSchematicSheet(props.schematic);
    const sheet: SchematicSheet = { ...base, name: name.trim() || spec.name, items: [] };
    if (paper !== (props.schematic.settings?.paper ?? 'A3')) sheet.paper = paper;
    if (kind === 'control') sheet.rails = defaultRails(build.railCandidates);
    else if (kind !== 'main') sheet.kind = kind;
    if (kind === 'io') sheet.rails = defaultRails(build.railCandidates);
    if (needsPlc && (plc || hosts[0])) sheet.plc = plc || hosts[0].id;
    props.onCreate(sheet, kind === 'cover');
  };

  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal schem-new" onClick={(e) => e.stopPropagation()}>
        <h2>シートを追加</h2>
        <div className="schem-new__kinds" role="radiogroup">
          {NEW_KINDS.map((k) => (
            <label key={k.kind} className={`schem-new__kind${kind === k.kind ? ' is-active' : ''}`}>
              <input type="radio" name="kind" checked={kind === k.kind} onChange={() => setKind(k.kind)} />
              <span>
                <b>{k.label}</b>
                <span className="small muted">{k.description}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="schem-new__fields">
          <label className="field">
            <span>シート名</span>
            <input type="text" value={name} placeholder={spec.name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="field">
            <span>用紙</span>
            <select value={paper} onChange={(e) => setPaper(e.target.value as PaperSize)}>
              {PAPERS.map((p) => (
                <option key={p} value={p}>
                  {p} 横
                </option>
              ))}
            </select>
          </label>
          {needsPlc && (
            <label className="field">
              <span>PLC</span>
              <select value={plc || hosts[0]?.id || ''} onChange={(e) => setPlc(e.target.value)} disabled={noPlc}>
                {hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.id}（{h.model}）
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {noPlc && <p className="small error-text">図面に {kind === 'io' ? 'I/O を持つ' : 'ユニットを装着できる'} PLC がありません。概念図に PLC を置いてから作ってください。</p>}
        <div className="modal__actions">
          <button type="button" onClick={props.onClose}>
            キャンセル
          </button>
          <button type="button" className="primary" onClick={create} disabled={noPlc}>
            追加
          </button>
        </div>
      </div>
    </div>
  );
}

/** シートの設定（何も選んでいないときの右のパネル） */
export function SheetSettings(props: {
  build: SchematicBuild;
  schematic: Schematic;
  sheet: SchematicSheet;
  onChange: (update: (s: Schematic) => Schematic) => void;
  onExport: () => void;
  /** 自動で並べ、結果の説明を返す */
  onAuto: () => string;
  settings: DiagramSettings;
  onSettings: (patch: Partial<DiagramSettings>) => void;
}) {
  const { sheet, build } = props;
  const [autoMessage, setAutoMessage] = useState('');
  const setSheet = (patch: Partial<SchematicSheet>) =>
    props.onChange((s) => ({ ...s, sheets: s.sheets.map((x) => (x.id === sheet.id ? { ...x, ...patch } : x)) }));
  const setRails = (patch: Partial<Rails>) => setSheet({ rails: { ...sheet.rails, ...patch } });
  const options = [...build.railCandidates];
  for (const ref of [sheet.rails?.supply, sheet.rails?.common]) {
    if (ref && !options.some((o) => o.ref === ref)) options.push({ ref, label: ref, conductor: '+' });
  }
  const placed = build.elements.filter((e) => e.placed).length;
  const paper = sheet.paper ?? props.schematic.settings?.paper ?? 'A3';

  const railSelect = (label: string, value: string | undefined, onSet: (ref: string | undefined) => void) => (
    <label className="field">
      <span>{label}</span>
      <select value={value ?? ''} onChange={(e) => onSet(e.target.value || undefined)}>
        <option value="">なし</option>
        {options.map((o) => (
          <option key={o.ref} value={o.ref}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
  const checkList = (items: { id: string; label: string }[], chosen: string[] | undefined, onSet: (next: string[] | undefined) => void) => {
    const on = new Set(chosen ?? items.map((i) => i.id));
    return items.map((i) => (
      <label key={i.id} className="small schem-list__toggle">
        <input
          type="checkbox"
          checked={on.has(i.id)}
          onChange={(e) => {
            const next = items.map((x) => x.id).filter((x) => (x === i.id ? e.target.checked : on.has(x)));
            // すべて選んだときは指定を省く（あとから足したものも入る）
            onSet(next.length === items.length ? undefined : next);
          }}
        />
        {i.label}
      </label>
    ));
  };
  const plcSelect = (hosts: { id: string; model: string }[]) => (
    <label className="field">
      <span>PLC</span>
      {hosts.length ? (
        <select value={sheet.plc ?? hosts[0].id} onChange={(e) => setSheet({ plc: e.target.value, units: undefined })}>
          {hosts.map((h) => (
            <option key={h.id} value={h.id}>
              {h.id}（{h.model}）
            </option>
          ))}
        </select>
      ) : (
        <span className="small muted">図面に PLC がありません</span>
      )}
    </label>
  );

  let body: React.ReactNode;
  switch (sheet.kind) {
    case 'terminal': {
      const blocks = [...new Map(build.elements.filter((e) => e.def.category === 'terminal').map((e) => [e.device, e.def.model] as const))];
      body = (
        <>
          <p className="small muted">端子台ごとに、端子の両側（上段・ネジ側と、下段・コネクタ側）の接続先と線番の表を、概念図の接続から自動で作ります。</p>
          <div className="field">
            <span>表にする端子台</span>
            {blocks.length === 0 && <span className="small muted">図面に端子台がありません</span>}
            {checkList(
              blocks.map(([d, m]) => ({ id: d, label: `${d}（${m}）` })),
              sheet.blocks,
              (blocksNext) => setSheet({ blocks: blocksNext }),
            )}
          </div>
        </>
      );
      break;
    }
    case 'io': {
      const host = build.ioHosts.find((h) => h.id === sheet.plc) ?? build.ioHosts[0];
      body = (
        <>
          <p className="small muted">ユニットごとに端子・アドレス・コメントの表を左に並べ、各点から相手の機器を通って右の母線へ線を出します。コメントは概念図の I/O 割付で入れます。</p>
          {plcSelect(build.ioHosts)}
          {host && (
            <div className="field">
              <span>I/O 図にするユニット</span>
              {checkList(
                host.units.map((u) => ({ id: u.id, label: `${u.id}（${u.model}）` })),
                sheet.units,
                (units) => setSheet({ units }),
              )}
            </div>
          )}
          {railSelect('電源側の母線（P24 など）', sheet.rails?.supply, (supply) => setRails({ supply }))}
          {railSelect('戻り側の母線（N24 など）', sheet.rails?.common, (common) => setRails({ common }))}
        </>
      );
      break;
    }
    case 'rack':
      body = (
        <>
          <p className="small muted">CPU・ベースユニットと装着したユニットの並び、入出力番号の範囲、内部電源の収支を描きます。ユニットの構成は概念図の PLC エディタで変えます。</p>
          {plcSelect(build.rackHosts)}
        </>
      );
      break;
    case 'bom':
      body = <p className="small muted">図面の機器を型式・仕様ごとにまとめた表です（出力の「部品表（CSV）」と同じ内容）。</p>;
      break;
    case 'pneumatic':
      body = (
        <p className="small muted">
          上の段にシリンダなどのアクチュエータ、その下に速度制御弁と電磁弁を弁ごとに縦に並べ、下の主管の左にエア源と 3 点セットを描きます。ソレノイド・オートスイッチの横には、つないだ PLC の入出力番号を書きます。配管は概念図で変えます。
        </p>
      );
      break;
    case 'cover':
      body = <p className="small muted">下の「図面の情報」の図面名・作成者・版と、全ページの目次を書きます。</p>;
      break;
    default:
      body = (
        <>
          {railSelect('電源側の母線（P24・R など）', sheet.rails?.supply, (supply) => setRails({ supply }))}
          {railSelect('戻り側の母線（N24・S など）', sheet.rails?.common, (common) => setRails({ common }))}
          <label className="field">
            <span>母線の並べ方</span>
            <select value={sheet.rails?.layout ?? 'left'} onChange={(e) => setRails({ layout: e.target.value === 'sides' ? 'sides' : undefined })}>
              <option value="left">左にまとめる（段の終わりから戻り側へ戻す）</option>
              <option value="sides">左右に分ける（ラダー図の形）</option>
            </select>
          </label>
          <p className="small muted">母線にした電位につながる端子は、線を個別に引かず母線へ引き出します。母線を選ばないシートは主回路として扱います。</p>
          <button type="button" onClick={() => setAutoMessage(props.onAuto())}>
            自動で並べる（{sheet.rails?.supply ? '未配置の段' : '主回路'}）
          </button>
          <p className="small muted">
            {autoMessage ||
              (sheet.rails?.supply
                ? '電源側の母線から接点・コイル・表示灯・PLC の入出力点をたどり、コイルなどごとに 1 段にして並べます（自己保持などの枝は下の段）。置いた記号は動かしません。'
                : '一次電源から遮断器・電磁接触器・サーマル・電動機を縦に並べ、制御電源の分岐などは横向きで右に並べます。置いた記号は動かしません。')}
          </p>
          <div className="small muted">
            配置済み {placed} / {build.elements.length} 個。1 枚 {build.rowsOf(sheet.id)} 段（段の間隔 {ROW_PITCH}mm）。
          </div>
        </>
      );
  }

  return (
    <div className="schem-settings">
      <div className="panel-title">
        {sheet.name}
        <span className="muted small">（{sheetKindName(sheet)}）</span>
      </div>
      <label className="field">
        <span>このシートの用紙</span>
        <select value={paper} onChange={(e) => setSheet({ paper: e.target.value as PaperSize })}>
          {PAPERS.map((p) => (
            <option key={p} value={p}>
              {p} 横
            </option>
          ))}
        </select>
      </label>
      {body}
      <hr />
      <div className="field">
        <span>図面の情報（表題欄・表紙）</span>
        <input type="text" placeholder="図面名" value={props.settings.title ?? ''} onChange={(e) => props.onSettings({ title: e.target.value || undefined })} />
        <input type="text" placeholder="作成者" value={props.settings.author ?? ''} onChange={(e) => props.onSettings({ author: e.target.value || undefined })} />
        <input type="text" placeholder="版（例: A）" value={props.settings.revision ?? ''} onChange={(e) => props.onSettings({ revision: e.target.value || undefined })} />
      </div>
      <hr />
      <button type="button" className="primary" onClick={props.onExport}>
        展開図 JSON を書き出す（DXF 用）
      </button>
      <p className="small muted">
        書き出した JSON は、リポジトリの tools/dxf の Python スクリプトで DXF に変換します（<code>uv run conneko_dxf.py 展開図.json 出力.dxf</code>）。
      </p>
      {!sheet.kind && (
        <p className="small muted">
          線は概念図の接続から自動で引きます。展開図の上では線を足したり消したりできないので、接続を変えるときは概念図で直してください。
        </p>
      )}
    </div>
  );
}

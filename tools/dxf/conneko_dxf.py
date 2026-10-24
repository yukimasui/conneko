"""Conneko の展開図 JSON（conneko-schematic）を DXF に変換する。

展開図 JSON は座標・記号・線・文字がすべて解決済みなので、ここでは図形を DXF に写すだけにする
（形式は docs/schematic-dxf.md、型は src/schematic/format.ts）。

    uv run conneko_dxf.py 入力.json 出力.dxf [--split] [--png]

- 既定では全シートを 1 つの DXF のモデル空間に横に並べる。--split でシートごとに別の DXF にする
  （出力.dxf の代わりに 出力-<シートID>.dxf）。
- --png で、書き出した DXF を PNG にも描く（確認用。matplotlib が必要: uv sync --extra preview）。
- DXF は AutoCAD 2013 形式（IJCAD で開く想定）。文字は MS ゴシックの文字スタイルにする。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

import ezdxf
from ezdxf import units
from ezdxf.document import Drawing
from ezdxf.enums import TextEntityAlignment
from ezdxf.layouts import BaseLayout

FORMAT = "conneko-schematic"
SUPPORTED_VERSION = 1

DXF_VERSION = "R2013"
TEXT_STYLE = "CONNEKO"
TEXT_FONT = "msgothic.ttc"
# 破線（機械的な連動）。全長 1.5mm = 線 1.0mm + 空き 0.5mm。src/schematic/svg.ts の DASH と同じ
DASH_LINETYPE = "CONNEKO_DASH"
DASH_PATTERN = [1.5, 1.0, -0.5]
# 線の接続点（黒丸）の直径
DOT_DIAMETER = 1.2
# --split しないときのシートどうしの間隔
SHEET_GAP = 20.0

ALIGN = {
    "left": TextEntityAlignment.MIDDLE_LEFT,
    "center": TextEntityAlignment.MIDDLE_CENTER,
    "right": TextEntityAlignment.MIDDLE_RIGHT,
}

Point = tuple[float, float]


class SchematicError(Exception):
    """展開図 JSON の形式の誤り"""


def load_schematic(path: Path) -> dict[str, Any]:
    data = json.loads(path.read_text(encoding="utf-8"))
    if data.get("format") != FORMAT:
        raise SchematicError(f"format が {FORMAT} ではありません: {data.get('format')!r}")
    if not isinstance(data.get("version"), int) or data["version"] > SUPPORTED_VERSION:
        raise SchematicError(f"対応していない version です: {data.get('version')!r}（対応: {SUPPORTED_VERSION} まで）")
    if data.get("unit") != "mm":
        raise SchematicError(f"unit は mm だけに対応しています: {data.get('unit')!r}")
    return data


def new_document(schematic: dict[str, Any]) -> Drawing:
    doc = ezdxf.new(DXF_VERSION, setup=False)
    doc.units = units.MM
    doc.header["$MEASUREMENT"] = 1  # メートル法
    doc.header["$LTSCALE"] = 1.0
    doc.styles.add(TEXT_STYLE, font=TEXT_FONT)
    doc.linetypes.add(DASH_LINETYPE, pattern=DASH_PATTERN, description="Conneko 破線 __ __ __")
    for name, layer in schematic["layers"].items():
        doc.layers.add(name, color=int(layer.get("color", 7)))
    for name, symbol in schematic["symbols"].items():
        add_block(doc, name, symbol)
    return doc


def offset(p: list[float], origin: Point) -> Point:
    return (p[0] + origin[0], p[1] + origin[1])


def add_polyline(
    layout: BaseLayout, points: list[list[float]], origin: Point, *, closed: bool = False, dashed: bool = False, layer: str = "0"
) -> None:
    attribs: dict[str, Any] = {"layer": layer}
    if dashed:
        attribs["linetype"] = DASH_LINETYPE
    pts = [offset(p, origin) for p in points]
    if len(pts) == 2 and not closed:
        layout.add_line(pts[0], pts[1], dxfattribs=attribs)
    else:
        layout.add_lwpolyline(pts, close=closed, dxfattribs=attribs)


def add_text(
    layout: BaseLayout, at: list[float], text: str, height: float, align: str = "center", rotation: float = 0.0, layer: str = "0"
) -> None:
    if not text:
        return
    entity = layout.add_text(text, height=height, rotation=rotation, dxfattribs={"style": TEXT_STYLE, "layer": layer})
    entity.set_placement((at[0], at[1]), align=ALIGN.get(align, TextEntityAlignment.MIDDLE_CENTER))


def add_block(doc: Drawing, name: str, symbol: dict[str, Any]) -> None:
    """記号をブロックにする。図形は画層 0 に描き、配置した画層の色・線種を受け継がせる"""
    block = doc.blocks.new(name=name)
    origin: Point = (0.0, 0.0)
    for p in symbol["primitives"]:
        kind = p["kind"]
        if kind == "line":
            add_polyline(block, p["points"], origin, closed=p.get("closed", False), dashed=p.get("dashed", False))
        elif kind == "circle":
            block.add_circle(tuple(p["center"]), p["r"])
        elif kind == "arc":
            block.add_arc(tuple(p["center"]), p["r"], p["start"], p["end"])
        elif kind == "text":
            add_text(block, p["at"], p["text"], p["height"], p.get("align", "center"))
        else:
            raise SchematicError(f"記号 {name} に不明な図形があります: {kind!r}")
    for a in symbol.get("attributes", []):
        attdef = block.add_attdef(a["tag"], insert=tuple(a["at"]), text="", height=a["height"], dxfattribs={"style": TEXT_STYLE})
        attdef.set_placement(tuple(a["at"]), align=ALIGN.get(a.get("align", "center"), TextEntityAlignment.MIDDLE_CENTER))


def upside_down(rotation: float) -> bool:
    """記号の回転で属性の文字が逆さ（180°）か上から読む向き（270°）になるか（svg.ts の upsideDown と同じ）"""
    r = round(rotation) % 360
    return r in (180, 270)


def add_dot(layout: BaseLayout, at: Point, layer: str) -> None:
    """塗りつぶした円（幅のある閉じたポリライン。AutoCAD の DONUT と同じ作り）"""
    r = DOT_DIAMETER / 4
    w = DOT_DIAMETER / 2
    layout.add_lwpolyline(
        [(at[0] - r, at[1], w, w, 1.0), (at[0] + r, at[1], w, w, 1.0)],
        format="xyseb",
        close=True,
        dxfattribs={"layer": layer},
    )


def add_sheet(doc: Drawing, schematic: dict[str, Any], sheet: dict[str, Any], origin: Point) -> None:
    msp = doc.modelspace()
    for pl in sheet.get("polylines", []):
        add_polyline(msp, pl["points"], origin, closed=pl.get("closed", False), dashed=pl.get("dashed", False), layer=pl["layer"])
    for ins in sheet.get("inserts", []):
        if ins["symbol"] not in schematic["symbols"]:
            raise SchematicError(f"シート {sheet['id']} に定義のない記号があります: {ins['symbol']}")
        ref = msp.add_blockref(
            ins["symbol"], offset(ins["at"], origin), dxfattribs={"layer": ins["layer"], "rotation": ins.get("rotation", 0)}
        )
        values = {k: v for k, v in (ins.get("attributes") or {}).items() if v}
        ref.add_auto_attribs(values)
        flip = upside_down(ins.get("rotation", 0))
        for attrib in ref.attribs:
            attrib.dxf.layer = "TAG"
            if flip:
                # 逆さ・上から読む向きになる文字は 180° 回して読める向きにし、左寄せ・右寄せを入れ替えて記号の外側へ伸ばす
                attrib.dxf.rotation = (attrib.dxf.rotation + 180) % 360
                attrib.dxf.halign = {0: 2, 2: 0}.get(attrib.dxf.halign, attrib.dxf.halign)
    for dot in sheet.get("dots", []):
        add_dot(msp, offset(dot["at"], origin), dot["layer"])
    for t in sheet.get("texts", []):
        add_text(msp, list(offset(t["at"], origin)), t["text"], t["height"], t.get("align", "center"), t.get("rotation", 0), t["layer"])


def convert(schematic: dict[str, Any], out: Path, *, split: bool = False) -> list[Path]:
    """展開図 JSON を DXF にする。書き出したファイルの一覧を返す"""
    sheets = schematic["sheets"]
    written: list[Path] = []
    if split:
        for sheet in sheets:
            doc = new_document(schematic)
            add_sheet(doc, schematic, sheet, (0.0, 0.0))
            path = out.with_name(f"{out.stem}-{sheet['id']}{out.suffix}")
            save(doc, path)
            written.append(path)
    else:
        doc = new_document(schematic)
        x = 0.0
        for sheet in sheets:
            add_sheet(doc, schematic, sheet, (x, 0.0))
            x += sheet["paper"]["width"] + SHEET_GAP
        save(doc, out)
        written.append(out)
    return written


def save(doc: Drawing, path: Path) -> None:
    auditor = doc.audit()
    if auditor.has_errors:
        for e in auditor.errors:
            print(f"DXF の監査でエラー: {e.message}", file=sys.stderr)
        raise SchematicError(f"{path}: DXF の監査でエラーが {len(auditor.errors)} 件あります")
    doc.saveas(path, encoding="utf-8")


# 確認用の PNG で MS ゴシックが無いときに代わりに使うフォント（DXF の中身は変えない）
PREVIEW_FALLBACK_FONTS = ["NotoSansCJK-Regular.ttc", "NotoSansCJKjp-Regular.otf", "ipag.ttf"]


def render_png(dxf_path: Path) -> Path:
    from ezdxf.addons.drawing import matplotlib as draw
    from ezdxf.fonts import fonts

    png = dxf_path.with_suffix(".png")
    doc = ezdxf.readfile(dxf_path)
    if not fonts.font_manager.has_font(TEXT_FONT):
        fallback = next((f for f in PREVIEW_FALLBACK_FONTS if fonts.font_manager.has_font(f)), None)
        if fallback and TEXT_STYLE in doc.styles:
            doc.styles.get(TEXT_STYLE).dxf.font = fallback
    draw.qsave(doc.modelspace(), str(png), bg="#FFFFFF", dpi=200)
    return png


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Conneko の展開図 JSON（conneko-schematic）を DXF に変換する")
    parser.add_argument("input", type=Path, help="展開図 JSON")
    parser.add_argument("output", type=Path, nargs="?", help="出力する DXF（省略時は入力と同じ名前の .dxf）")
    parser.add_argument("--split", action="store_true", help="シートごとに別の DXF にする")
    parser.add_argument("--png", action="store_true", help="確認用に PNG にも描く（matplotlib が必要）")
    args = parser.parse_args(argv)

    out = args.output or args.input.with_suffix(".dxf")
    try:
        schematic = load_schematic(args.input)
        written = convert(schematic, out, split=args.split)
    except (SchematicError, json.JSONDecodeError, KeyError) as e:
        print(f"エラー: {e}", file=sys.stderr)
        return 1
    for path in written:
        print(f"DXF を出力: {path}")
        if args.png:
            print(f"PNG を出力: {render_png(path)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())

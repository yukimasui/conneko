"""conneko_dxf.py のテスト。見本の展開図 JSON（samples/sample.json）を DXF にして読み戻す。

    uv run python -m unittest
"""

from __future__ import annotations

import copy
import json
import tempfile
import unittest
from pathlib import Path

import ezdxf

import conneko_dxf

SAMPLE = Path(__file__).parent / "samples" / "sample.json"


class ConvertTest(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp = tempfile.TemporaryDirectory()
        self.dir = Path(self.tmp.name)
        self.schematic = conneko_dxf.load_schematic(SAMPLE)

    def tearDown(self) -> None:
        self.tmp.cleanup()

    def test_全シートを1つのDXFにする(self) -> None:
        out = self.dir / "sample.dxf"
        self.assertEqual(conneko_dxf.convert(self.schematic, out), [out])
        doc = ezdxf.readfile(out)
        self.assertEqual(doc.dxfversion, "AC1027")  # AutoCAD 2013
        self.assertEqual(doc.header["$INSUNITS"], 4)  # mm
        self.assertFalse(doc.audit().has_errors)

        # 記号はすべてブロックになり、配置の数だけ INSERT がある
        for name in self.schematic["symbols"]:
            self.assertIn(name, doc.blocks)
        msp = doc.modelspace()
        inserts = msp.query("INSERT")
        self.assertEqual(len(inserts), sum(len(s["inserts"]) for s in self.schematic["sheets"]))

        # レイヤーと色
        for name, layer in self.schematic["layers"].items():
            self.assertEqual(doc.layers.get(name).color, layer["color"])

        # 属性（機器名・端子番号）は TAG レイヤーの ATTRIB になる
        tags = {a.dxf.text for i in inserts for a in i.attribs if a.dxf.tag == "TAG"}
        self.assertTrue({"PB1", "PB2", "THR1", "MC1", "PL1"} <= tags)
        self.assertTrue(all(a.dxf.layer == "TAG" for i in inserts for a in i.attribs))

        # 日本語の文字は MS ゴシックの文字スタイルで書かれる
        texts = [t for t in msp.query("TEXT") if "自己保持" in t.dxf.text]
        self.assertEqual(len(texts), 1)
        self.assertEqual(texts[0].dxf.style, conneko_dxf.TEXT_STYLE)
        self.assertEqual(doc.styles.get(conneko_dxf.TEXT_STYLE).dxf.font, conneko_dxf.TEXT_FONT)

        # 破線（機械的な連動）は Conneko の線種
        dashed = [e for b in doc.blocks for e in b if e.dxf.hasattr("linetype") and e.dxf.linetype == conneko_dxf.DASH_LINETYPE]
        self.assertGreater(len(dashed), 0)

    def test_2枚目は1枚目の右に並ぶ(self) -> None:
        out = self.dir / "sample.dxf"
        conneko_dxf.convert(self.schematic, out)
        msp = ezdxf.readfile(out).modelspace()
        first = self.schematic["sheets"][0]
        x0 = first["paper"]["width"] + conneko_dxf.SHEET_GAP
        pb2 = next(i for i in msp.query("INSERT") if any(a.dxf.text == "PB2" for a in i.attribs))
        expected = next(ins for ins in self.schematic["sheets"][1]["inserts"] if ins["attributes"].get("TAG") == "PB2")
        self.assertAlmostEqual(pb2.dxf.insert.x, expected["at"][0] + x0)
        self.assertAlmostEqual(pb2.dxf.insert.y, expected["at"][1])

    def test_シートごとに分ける(self) -> None:
        out = self.dir / "sample.dxf"
        written = conneko_dxf.convert(self.schematic, out, split=True)
        self.assertEqual([p.name for p in written], ["sample-D1.dxf", "sample-D2.dxf", "sample-D3.dxf"])
        for p in written:
            self.assertFalse(ezdxf.readfile(p).audit().has_errors)

    def test_形式の違うJSONは読まない(self) -> None:
        bad = copy.deepcopy(self.schematic)
        bad["format"] = "conneko-diagram"
        path = self.dir / "bad.json"
        path.write_text(json.dumps(bad), encoding="utf-8")
        with self.assertRaises(conneko_dxf.SchematicError):
            conneko_dxf.load_schematic(path)

        newer = copy.deepcopy(self.schematic)
        newer["version"] = conneko_dxf.SUPPORTED_VERSION + 1
        path.write_text(json.dumps(newer), encoding="utf-8")
        with self.assertRaises(conneko_dxf.SchematicError):
            conneko_dxf.load_schematic(path)

    def test_定義のない記号はエラー(self) -> None:
        bad = copy.deepcopy(self.schematic)
        bad["sheets"][1]["inserts"][0]["symbol"] = "no-such-symbol"
        with self.assertRaises(conneko_dxf.SchematicError):
            conneko_dxf.convert(bad, self.dir / "bad.dxf")


if __name__ == "__main__":
    unittest.main()

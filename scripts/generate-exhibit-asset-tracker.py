#!/usr/bin/env python3
"""Generate exhibit-asset-tracker.xlsx from embedded sheet data."""

from __future__ import annotations

import csv
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "docs" / "assets"

EXHIBITS_HEADERS = [
    "exhibitId",
    "sceneObjectName",
    "type",
    "zone",
    "status",
    "in_gallery_main",
    "folder_path",
    "focus_glb_file",
    "focus_glb_exists",
    "audio_file",
    "audio_exists",
    "video_file",
    "video_exists",
    "image_file",
    "image_exists",
    "in_manifest",
    "manifest_buttons",
    "focusGlbUrl",
    "notes",
    "last_updated",
    "owner",
]

EXHIBITS_ROWS = [
    [
        "demo_box",
        "exhibit_demo_box",
        "audio",
        "architecture",
        "制作中",
        "N",
        "exhibits/demo_box/",
        "focus_demo_box.glb",
        "N",
        "demo.mp3",
        "N",
        "",
        "",
        "",
        "",
        "Y",
        "btn_play, btn_pause, btn_end",
        "/exhibits/demo_box/focus_demo_box.glb",
        "灰白测试厅首个音频展品",
        "2026-05-28",
        "",
    ],
]

SCENE_HEADERS = ["asset_key", "path", "exists", "status", "notes"]

SCENE_ROWS = [
    ["gallery_main", "models/gallery_main.glb", "N", "待制作", "灰白测试厅 + COL_* + exhibit_demo_box"],
    ["bgm_architecture", "audio/bgm_architecture.mp3", "N", "待制作", "进入 SPACE 后 architecture 分区 BGM"],
    ["wall_art", "media/art_01.jpg", "N", "可选", "北墙代码画框贴图"],
]

LEGEND_ROWS = [
    ["字段/值", "说明"],
    ["status: 待制作", "尚未开始建模或导出"],
    ["status: 制作中", "DCC 进行中或待入库"],
    ["status: 已入库", "文件已放入 public 对应路径"],
    ["status: 需调整", "已入库但命名/尺度/manifest 需改"],
    ["status: 已验收", "联调通过"],
    ["Y / N", "文件或绑定是否就绪；入库后改为 Y"],
    ["exhibitId", "与 manifest.json 的 exhibitId 一致"],
    ["sceneObjectName", "gallery_main 内 hit mesh，规则 exhibit_<exhibitId>"],
    ["focus_glb_file", "位于 folder_path 下，建议 focus_<exhibitId>.glb"],
    ["in_manifest", "manifest.json 是否已有该条目（代码可先配好为 Y）"],
    ["维护顺序", "新增行 → 建目录 → 做 glb/媒体 → 更新 manifest → 改 Y"],
    ["对照文档", "docs/gallery-mesh-naming.md / docs/asset-manifest.md"],
]


def write_csv(path: Path, headers: list[str], rows: list[list[str]]) -> None:
    with path.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)


def write_xlsx(path: Path) -> None:
    try:
        from openpyxl import Workbook
        from openpyxl.styles import Font
    except ImportError as exc:
        raise SystemExit(
            "openpyxl is required to build .xlsx. Install with: pip install openpyxl"
        ) from exc

    wb = Workbook()
    header_font = Font(bold=True)

    ws1 = wb.active
    ws1.title = "exhibits"
    ws1.append(EXHIBITS_HEADERS)
    for cell in ws1[1]:
        cell.font = header_font
    for row in EXHIBITS_ROWS:
        ws1.append(row)

    ws2 = wb.create_sheet("scene_assets")
    ws2.append(SCENE_HEADERS)
    for cell in ws2[1]:
        cell.font = header_font
    for row in SCENE_ROWS:
        ws2.append(row)

    ws3 = wb.create_sheet("legend")
    for row in LEGEND_ROWS:
        ws3.append(row)
    for cell in ws3[1]:
        cell.font = header_font

    wb.save(path)


def main() -> None:
    ASSETS.mkdir(parents=True, exist_ok=True)

    write_csv(ASSETS / "exhibit-asset-tracker-exhibits.csv", EXHIBITS_HEADERS, EXHIBITS_ROWS)
    write_csv(ASSETS / "exhibit-asset-tracker-scene_assets.csv", SCENE_HEADERS, SCENE_ROWS)
    write_csv(ASSETS / "exhibit-asset-tracker-legend.csv", LEGEND_ROWS[0], LEGEND_ROWS[1:])

    write_xlsx(ASSETS / "exhibit-asset-tracker.xlsx")
    print(f"Wrote tracker files under {ASSETS}")


if __name__ == "__main__":
    main()

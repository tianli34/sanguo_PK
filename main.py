# 文件名: main.py
# 用途: 程序主入口文件，运行武将对决模拟并生成战斗报告
"""三国武将对决模拟入口"""

import argparse
import random
import sys
from pathlib import Path
from typing import Optional

from src import Warrior, BattleEngine
from src.battle_events import build_battle_replay, replay_to_json
from src.battle_report import AggregateReporter, BattleReporter

# 双方武将的默认配置
DEFAULT_WARRIORS = {
    "a": {
        "name": "马超",
        "martialarts": 98,
        "agility": 95,
        "strength": 92,
        "courage": 94,
        "sp": 98,
    },
    "b": {
        "name": "许褚",
        "martialarts": 95,
        "agility": 80,
        "strength": 99,
        "courage": 96,
        "sp": 100,
    },
}

STAT_FIELDS = ("martialarts", "agility", "strength", "courage", "sp")

STAT_LABELS = {
    "martialarts": "武艺",
    "agility": "敏捷",
    "strength": "力量",
    "courage": "胆气",
    "sp": "体力",
}


def build_parser() -> argparse.ArgumentParser:
    """构建命令行参数解析器"""
    parser = argparse.ArgumentParser(description="三国武将对决模拟")
    parser.add_argument("-n", "--battles", type=int, default=1, help="模拟场次（默认 1）")
    parser.add_argument(
        "--seed",
        type=int,
        default=None,
        help="随机种子；设置后结果可复现，第 i 场使用 seed + i（默认不设置，保持随机）",
    )
    parser.add_argument(
        "--json",
        dest="json_path",
        type=Path,
        default=None,
        help="单场战斗的结构化 JSON 战报输出路径",
    )

    for side, defaults in DEFAULT_WARRIORS.items():
        prefix = side.upper()
        parser.add_argument(
            f"--{side}-name", default=defaults["name"], help=f"{prefix}队武将名"
        )
        for field in STAT_FIELDS:
            parser.add_argument(
                f"--{side}-{field}",
                type=int,
                default=defaults[field],
                help=f"{prefix}队 {STAT_LABELS[field]}（默认 {defaults[field]}）",
            )

    return parser


def create_warrior(args: argparse.Namespace, side: str) -> Warrior:
    """根据命令行参数创建武将"""
    return Warrior(
        getattr(args, f"{side}_name"),
        side.upper(),
        **{field: getattr(args, f"{side}_{field}") for field in STAT_FIELDS},
    )


def apply_seed(seed: Optional[int], battle_index: int) -> None:
    """为第 battle_index 场战斗设置随机种子

    按场次派生种子，使同一 seed 下前 k 场的结果与 -n k 完全一致；
    未指定 seed 时不干预全局随机状态，保持原有随机行为。
    """
    if seed is not None:
        random.seed(seed + battle_index)


def main() -> None:
    """运行单挑模拟"""
    # Windows 默认 GBK 无法输出 ▶⚔☠ 等符号，统一使用 UTF-8
    # 必须在解析参数前设置，否则 -h 帮助信息仍会使用 GBK
    for stream in (sys.stdout, sys.stderr):
        if hasattr(stream, "reconfigure"):
            stream.reconfigure(encoding="utf-8")

    parser = build_parser()
    args = parser.parse_args()
    if args.battles < 1:
        parser.error("--battles 必须大于等于 1")
    if args.json_path is not None and args.battles != 1:
        parser.error("--json 仅支持单场战斗（--battles 1）")

    print(f"三国武将对决系统 - {args.battles}场单挑模拟")
    print("=" * 70)
    if args.seed is not None:
        print(f"随机种子: {args.seed}")

    # 每场战斗都需要全新的武将实例，先保存初始快照用于汇总战报
    original_a = create_warrior(args, "a")
    original_b = create_warrior(args, "b")
    snapshot_a = original_a.snapshot()
    snapshot_b = original_b.snapshot()

    if args.battles == 1:
        # 单场战报
        apply_seed(args.seed, 0)
        reporter = BattleReporter([original_a], [original_b])
        engine = BattleEngine([original_a], [original_b])
        result = engine.run()
        print(reporter.generate_full_report(result))
        if args.json_path is not None:
            replay = build_battle_replay(
                result,
                reporter.initial_snapshots_a,
                reporter.initial_snapshots_b,
                seed=args.seed,
            )
            args.json_path.parent.mkdir(parents=True, exist_ok=True)
            args.json_path.write_text(replay_to_json(replay), encoding="utf-8")
            print(f"\nJSON 战报已保存: {args.json_path}")
        return

    # 多场汇总战报
    print("模拟进行中...")
    reporter = AggregateReporter(original_a.name, original_b.name)

    for i in range(args.battles):
        apply_seed(args.seed, i)
        engine = BattleEngine([create_warrior(args, "a")], [create_warrior(args, "b")])
        result = engine.run()
        reporter.add_battle_result(result)

        if (i + 1) % 10 == 0:
            print(f"  已完成 {i + 1}/{args.battles} 场...")

    print()
    print(reporter.generate_aggregate_report([snapshot_a], [snapshot_b]))


if __name__ == "__main__":
    main()

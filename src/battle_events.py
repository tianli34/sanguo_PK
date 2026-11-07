# 文件名: battle_events.py
# 用途: 将战斗引擎日志转换为可重复播放的结构化 JSON 事件
"""战斗事件序列化，不参与任何战斗判定或数值计算。"""

import json
from typing import Optional, Sequence

from src.battle_engine import BattleResult
from src.constants import SP_EXPANSION_FACTOR
from src.warrior import WarriorSnapshot


def _initial_state(snapshot: WarriorSnapshot) -> dict:
    return {
        "hp": snapshot.hp,
        "max_hp": snapshot.hp_real,
        "sp": snapshot.sp,
        "max_sp": snapshot.sp_real,
        "courage": snapshot.courage,
        "alive": snapshot.is_alive,
    }


def _warrior_data(snapshot: WarriorSnapshot) -> dict:
    return {
        "name": snapshot.name,
        "side": snapshot.team,
        "martialarts": snapshot.martialarts,
        "agility": snapshot.agility,
        "strength": snapshot.strength,
        "courage": snapshot.courage,
        "sp": snapshot.sp_real / SP_EXPANSION_FACTOR,
        "initial": _initial_state(snapshot),
    }


def _detail_state(details: dict, prefix: str) -> dict:
    return {
        "hp": details[f"{prefix}_hp_before"],
        "sp": details[f"{prefix}_sp_before"],
        "courage": details[f"{prefix}_courage_before"],
    }


def _detail_state_after(details: dict, prefix: str) -> dict:
    return {
        "hp": details[f"{prefix}_hp_after"],
        "sp": details[f"{prefix}_sp_after"],
        "courage": details[f"{prefix}_courage_after"],
        "alive": details[f"{prefix}_alive"],
    }


def build_battle_replay(
    result: BattleResult,
    initial_a: Sequence[WarriorSnapshot],
    initial_b: Sequence[WarriorSnapshot],
    seed: Optional[int] = None,
) -> dict:
    """把一次完整模拟转换为前端可直接消费的事件战报。"""
    snapshots = list(initial_a) + list(initial_b)
    side_by_name = {
        warrior.name: warrior.team
        for warrior in result.team_a + result.team_b
    }
    warriors = [_warrior_data(snapshot) for snapshot in snapshots]
    initial_states = {warrior["side"]: warrior["initial"] for warrior in warriors}
    events = []

    for sequence, log in enumerate(result.logs):
        details = log.details
        event = {
            "sequence": sequence,
            "type": log.event_type,
            "tick": log.tick,
            "round": log.round_num,
            "description": log.description,
        }

        if log.event_type == "attack":
            attacker_name = details["attacker"]
            defender_name = details["defender"]
            attacker_side = side_by_name[attacker_name]
            defender_side = side_by_name[defender_name]
            before = {
                attacker_side: _detail_state(details, "attacker"),
                defender_side: _detail_state(details, "target"),
            }
            after = {
                attacker_side: _detail_state_after(details, "attacker"),
                defender_side: _detail_state_after(details, "target"),
            }
            event.update(
                {
                    "attacker": attacker_side,
                    "defender": defender_side,
                    "attacker_name": attacker_name,
                    "defender_name": defender_name,
                    "defense": details["defense"],
                    "success": details["success"],
                    "defense_rate": details["defense_rate"],
                    "defender_ap_percent": details["defender_ap_percent"],
                    "attack_interval_ticks": details["attack_interval_ticks"],
                    "global_attack_interval_ticks": details["global_attack_interval_ticks"],
                    "damage_to_defender": details["damage_to_defender"],
                    "damage_to_attacker": details["damage_to_attacker"],
                    "before": before,
                    "after": after,
                }
            )
        elif log.event_type == "clash":
            states = details.get("states", {})
            before = {}
            after = {}
            for name, state in states.items():
                side = side_by_name[name]
                before[side] = state["before"]
                after[side] = state["after"]
            event.update(
                {
                    "participants": [
                        side_by_name[name] for name in details["participants"]
                    ],
                    "participant_names": details["participants"],
                    "damages": details["damages"],
                    "sp_costs": details["sp_costs"],
                    "before": before,
                    "after": after,
                }
            )

        if log.event_type in ("battle_end", "timeout"):
            event["outcome"] = result.outcome.value
            event["winner"] = result.winner_team

        events.append(event)

    final_states = {
        warrior.team: {
            "hp": warrior.hp,
            "max_hp": warrior.hp_real,
            "sp": warrior.sp,
            "max_sp": warrior.sp_real,
            "courage": warrior.courage,
            "alive": warrior.is_alive,
        }
        for warrior in result.team_a + result.team_b
    }

    return {
        "schema_version": 1,
        "seed": seed,
        "warriors": warriors,
        "initial_states": initial_states,
        "events": events,
        "result": {
            "outcome": result.outcome.value,
            "winner": result.winner_team,
            "rounds": result.rounds,
            "ticks": result.ticks,
            "states": final_states,
        },
    }


def replay_to_json(replay: dict) -> str:
    """输出 UTF-8 友好的、可稳定重放的 JSON 文本。"""
    return json.dumps(replay, ensure_ascii=False, indent=2)

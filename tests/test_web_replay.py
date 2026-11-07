# 文件名: tests/test_web_replay.py
# 用途: 验证网页战报序列化、可复现性与本地模拟接口

import json
import random
import sys
import unittest
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src import BattleEngine, Warrior
from src.battle_events import build_battle_replay
from web_server import simulate


def make_warriors():
    return (
        Warrior("马超", "A", martialarts=98, agility=95, strength=92, courage=94, sp=98),
        Warrior("许褚", "B", martialarts=95, agility=80, strength=99, courage=96, sp=100),
    )


def make_replay(seed=42):
    warrior_a, warrior_b = make_warriors()
    snapshots_a = [warrior_a.snapshot()]
    snapshots_b = [warrior_b.snapshot()]
    random.seed(seed)
    result = BattleEngine([warrior_a], [warrior_b]).run()
    return build_battle_replay(result, snapshots_a, snapshots_b, seed=seed)


class BattleReplayTest(unittest.TestCase):
    def test_replay_is_json_serializable_and_matches_result(self):
        replay = make_replay()
        json.dumps(replay, ensure_ascii=False)
        self.assertEqual(replay["schema_version"], 1)
        self.assertEqual(replay["seed"], 42)
        self.assertEqual(len(replay["warriors"]), 2)
        self.assertTrue(any(event["type"] == "attack" for event in replay["events"]))
        self.assertIn(replay["result"]["outcome"], {"team_a_win", "team_b_win", "draw", "timeout"})
        for side in ("A", "B"):
            self.assertIn("max_hp", replay["result"]["states"][side])
            self.assertIn("alive", replay["result"]["states"][side])

    def test_attack_event_contains_both_sides_before_and_after(self):
        replay = make_replay()
        attack = next(event for event in replay["events"] if event["type"] == "attack")
        self.assertEqual(set(attack["before"]), {"A", "B"})
        self.assertEqual(set(attack["after"]), {"A", "B"})
        for side in ("A", "B"):
            self.assertGreaterEqual(attack["before"][side]["hp"], attack["after"][side]["hp"])
            self.assertGreaterEqual(attack["before"][side]["sp"], attack["after"][side]["sp"])
            self.assertIn("courage", attack["after"][side])

    def test_replaying_state_snapshots_reaches_engine_final_state(self):
        replay = make_replay()
        states = replay["initial_states"]
        for event in replay["events"]:
            for side, after in event.get("after", {}).items():
                states[side] = {**states[side], **after}
        for side in ("A", "B"):
            final = replay["result"]["states"][side]
            for field in ("hp", "sp", "courage", "alive"):
                self.assertEqual(states[side][field], final[field])

    def test_same_seed_produces_identical_replay(self):
        self.assertEqual(make_replay(123), make_replay(123))


class WebSimulationTest(unittest.TestCase):
    def test_http_simulation_helper_uses_engine_output(self):
        replay = simulate({"seed": 42})
        self.assertEqual(replay, make_replay(42))

    def test_invalid_stats_are_rejected(self):
        with self.assertRaises(ValueError):
            simulate({"seed": 1, "warriors": {"a": {"strength": 0}}})


if __name__ == "__main__":
    unittest.main()

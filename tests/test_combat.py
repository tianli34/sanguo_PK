# 文件名: tests/test_combat.py
# 用途: 战斗系统核心公式与流程的单元测试

import random
import subprocess
import sys
import unittest
from pathlib import Path

# 支持直接运行 python tests/test_combat.py
PROJECT_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(PROJECT_ROOT))

from src import (
    BattleEngine,
    BattleOutcome,
    DefenseType,
    Warrior,
    calculate_base_damage,
    check_clash_condition,
)
from src.battle_report import BattleReporter
from src.clash import calculate_clash_damage
from src.constants import MAX_ROUNDS, MAX_TICKS
from src.defense import calculate_defense_rate


def make_warrior(name="测试", team="A", **overrides):
    """创建带默认属性的测试武将"""
    stats = dict(martialarts=90, agility=90, strength=90, courage=80, sp=90)
    stats.update(overrides)
    return Warrior(name, team, **stats)


class WarriorTest(unittest.TestCase):
    def test_attributes_decay_with_stamina(self):
        warrior = make_warrior()
        full = (warrior.martialarts, warrior.agility, warrior.strength)

        warrior.sp *= 0.3
        low = (warrior.martialarts, warrior.agility, warrior.strength)

        for low_value, full_value in zip(low, full):
            self.assertLessEqual(low_value, full_value)
        self.assertLess(low[1], full[1])

    def test_attack_sp_cost_is_positive(self):
        self.assertGreater(make_warrior().attack_sp_cost(), 0)


class DamageTest(unittest.TestCase):
    def test_stronger_attacker_deals_more_damage(self):
        strong = make_warrior("强", "A", martialarts=100, strength=100)
        weak = make_warrior("弱", "B", martialarts=20, strength=20)

        self.assertGreater(
            calculate_base_damage(strong, weak),
            calculate_base_damage(weak, strong),
        )


class DefenseTest(unittest.TestCase):
    def test_defense_rate_within_bounds(self):
        defender = make_warrior(
            "守", "A", martialarts=100, agility=100, strength=100, courage=120
        )
        attacker = make_warrior(
            "攻", "B", martialarts=1, agility=1, strength=1, courage=1
        )

        for defense_type in DefenseType:
            for ap in (0, 150, 300):
                defender.ap = ap
                rate = calculate_defense_rate(defense_type, defender, attacker)
                self.assertGreaterEqual(rate, 0.05)
                self.assertLessEqual(rate, 0.95)


class ClashTest(unittest.TestCase):
    def test_equal_warriors_take_equal_damage(self):
        damage_a, damage_b, sp_a, sp_b = calculate_clash_damage(
            make_warrior("甲", "A"), make_warrior("乙", "B")
        )

        self.assertAlmostEqual(damage_a, damage_b)
        self.assertAlmostEqual(sp_a, sp_b)
        self.assertGreater(damage_a, 0)

    def test_clash_requires_close_ap(self):
        first = make_warrior("甲", "A")
        second = make_warrior("乙", "B")

        first.ap, second.ap = 100, 110
        self.assertTrue(check_clash_condition([first, second]))

        second.ap = 200
        self.assertFalse(check_clash_condition([first, second]))


class BattleEngineTest(unittest.TestCase):
    def test_battle_terminates(self):
        random.seed(42)
        warrior_a = make_warrior(
            "马超", "A", martialarts=98, agility=95, strength=92, courage=94, sp=98
        )
        warrior_b = make_warrior(
            "许褚", "B", martialarts=95, agility=80, strength=99, courage=96, sp=100
        )

        result = BattleEngine([warrior_a], [warrior_b]).run()

        self.assertIn(result.outcome, set(BattleOutcome))
        self.assertLessEqual(result.rounds, MAX_ROUNDS)
        self.assertLessEqual(result.ticks, MAX_TICKS)
        self.assertTrue(result.logs)

    def test_full_report_renders(self):
        random.seed(7)
        warrior_a = make_warrior("甲", "A")
        warrior_b = make_warrior("乙", "B")
        reporter = BattleReporter([warrior_a], [warrior_b])

        result = BattleEngine([warrior_a], [warrior_b]).run()
        report = reporter.generate_full_report(result)

        self.assertIn("甲", report)
        self.assertIn("乙", report)
        self.assertIn("战斗结果", report)

    def test_attack_log_sp_cost_matches_actual_deduction(self):
        """战报记录的攻击体力消耗必须等于真实扣减量

        attack_sp_cost() 依赖当前 SP 百分比，若在扣减后重复计算会得到不同结果。
        """
        random.seed(42)
        warrior_a = make_warrior(
            "马超", "A", martialarts=98, agility=95, strength=92, courage=94, sp=98
        )
        warrior_b = make_warrior(
            "许褚", "B", martialarts=95, agility=80, strength=99, courage=96, sp=100
        )

        result = BattleEngine([warrior_a], [warrior_b]).run()
        attack_logs = [log for log in result.logs if log.event_type == "attack"]
        self.assertTrue(attack_logs)

        for log in attack_logs:
            details = log.details
            actual = details["attacker_sp_before"] - details["attacker_sp_after"]
            self.assertAlmostEqual(
                details["attacker_sp_cost"],
                actual,
                places=6,
                msg=f"tick={log.tick} 战报体力消耗与实际扣减不一致",
            )


class SeedTest(unittest.TestCase):
    def test_apply_seed_is_deterministic(self):
        from main import apply_seed

        apply_seed(123, 0)
        first = [random.random() for _ in range(5)]
        apply_seed(123, 0)
        second = [random.random() for _ in range(5)]

        self.assertEqual(first, second)

    def test_apply_seed_varies_by_battle_index(self):
        from main import apply_seed

        apply_seed(123, 0)
        first = random.random()
        apply_seed(123, 1)
        second = random.random()

        self.assertNotEqual(first, second)

    def test_apply_seed_none_leaves_random_state_untouched(self):
        from main import apply_seed

        random.seed(7)
        state_before = random.getstate()
        apply_seed(None, 3)

        self.assertEqual(random.getstate(), state_before)


class CliSeedTest(unittest.TestCase):
    def test_same_seed_produces_identical_output(self):
        cmd = [
            sys.executable,
            str(PROJECT_ROOT / "main.py"),
            "--seed",
            "123",
            "-n",
            "3",
        ]
        first = subprocess.run(
            cmd, cwd=str(PROJECT_ROOT), capture_output=True, timeout=60
        )
        second = subprocess.run(
            cmd, cwd=str(PROJECT_ROOT), capture_output=True, timeout=60
        )

        self.assertEqual(first.returncode, 0, first.stderr.decode("utf-8", "replace"))
        self.assertEqual(second.returncode, 0, second.stderr.decode("utf-8", "replace"))
        self.assertIn("随机种子: 123".encode("utf-8"), first.stdout)
        self.assertEqual(first.stdout, second.stdout)


if __name__ == "__main__":
    unittest.main()

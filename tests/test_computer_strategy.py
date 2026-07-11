import random
import unittest

from backend import computer_strategy as strategy


class TestComputerStrategy(unittest.TestCase):
    def test_special_card_rules(self):
        self.assertEqual(strategy.round_payoff(1, 5), 1)
        self.assertEqual(strategy.round_payoff(5, 1), -1)
        self.assertEqual(strategy.round_payoff(2, 4), 1)
        self.assertEqual(strategy.round_payoff(4, 2), -1)
        self.assertEqual(strategy.round_payoff(5, 4), 1)
        self.assertEqual(strategy.round_payoff(3, 3), 0)

    def test_number_choice_is_legal_and_seeded(self):
        state = {
            "cpu_remaining": [1, 3, 5],
            "player_remaining": [2, 4, 5],
            "score_diff": -1,
            "round_index": 2,
            "difficulty": "expert",
        }
        first = strategy.choose_number_card(**state, rng=random.Random(99))
        second = strategy.choose_number_card(**state, rng=random.Random(99))
        self.assertEqual(first, second)
        self.assertIn(first, state["cpu_remaining"])

    def test_all_difficulties_keep_multiple_actions_possible(self):
        for difficulty in strategy.DIFFICULTY_PROFILES:
            observed = {
                strategy.choose_number_card(
                    strategy.NUMBER_CARDS,
                    strategy.NUMBER_CARDS,
                    difficulty=difficulty,
                    rng=random.Random(seed),
                )
                for seed in range(100)
            }
            self.assertGreaterEqual(len(observed), 2, difficulty)

    def test_history_prediction_only_uses_completed_observations(self):
        observations = strategy.empty_observations()
        for _ in range(12):
            strategy.record_number_sequence(observations, [1, 2, 3, 4, 5])
        beginner = strategy.predict_number_distribution(
            strategy.NUMBER_CARDS, 0, "beginner", observations
        )
        expert = strategy.predict_number_distribution(
            strategy.NUMBER_CARDS, 0, "expert", observations
        )
        self.assertAlmostEqual(beginner[1], beginner[5])
        self.assertGreater(expert[1], expert[5])

    def test_function_resolution_order(self):
        cpu, player = strategy.resolve_function_actions(
            [1, 2, 3, 4, 5],
            [5, 4, 3, 2, 1],
            ("K", 1),
            ("Q", 1),
        )
        self.assertEqual(cpu, [4, 2, 3, 4, 5])
        self.assertEqual(player, [1, 5, 3, 2, 1])

    def test_function_choice_is_legal(self):
        action = strategy.choose_function_action(
            [1, 2, 3, 4, 5],
            [5, 4, 3, 2, 1],
            ["Q", "K"],
            ["J", "JK"],
            difficulty="expert",
            rng=random.Random(7),
        )
        self.assertIn(action[0], {"Q", "K"})
        self.assertIn(action[1], range(1, 6))

    def test_export_manifest_matches_profiles(self):
        manifest = strategy.policy_manifest()
        self.assertEqual(manifest["schemaVersion"], strategy.SCHEMA_VERSION)
        self.assertEqual(
            set(manifest["difficultyProfiles"]),
            {"beginner", "intermediate", "expert"},
        )

    def test_difficulty_balance_against_repeatable_habit(self):
        rates = {
            difficulty: strategy.simulate_habit_balance(3000, difficulty, 12345)[
                "cpuWinRate"
            ]
            for difficulty in strategy.DIFFICULTY_PROFILES
        }
        self.assertGreater(rates["intermediate"], rates["beginner"] + 0.08)
        self.assertGreater(rates["expert"], rates["intermediate"] + 0.08)
        self.assertLessEqual(rates["expert"], 0.67)

    def test_advanced_difficulty_balance_is_ordered(self):
        rates = {
            difficulty: strategy.simulate_advanced_habit_balance(
                600, difficulty, 24680
            )["cpuWinRate"]
            for difficulty in strategy.DIFFICULTY_PROFILES
        }
        self.assertLess(rates["beginner"], rates["intermediate"])
        self.assertLess(rates["intermediate"], rates["expert"])
        self.assertLessEqual(rates["expert"], 0.70)

    def test_headless_benchmark_suite_covers_every_mode(self):
        report = strategy.simulate_benchmark_suite(5, 123)
        self.assertEqual(report["gamesPerScenario"], 5)
        for difficulty in strategy.DIFFICULTY_PROFILES:
            self.assertEqual(
                set(report["scenarios"][difficulty]),
                {
                    "basicRandom",
                    "basicHabit",
                    "advancedRandom",
                    "advancedHabit",
                },
            )


if __name__ == "__main__":
    unittest.main()

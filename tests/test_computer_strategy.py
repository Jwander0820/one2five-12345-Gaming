import random
import unittest
import json
from pathlib import Path
from itertools import permutations

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

    def test_expert_uses_habits_beyond_the_immediate_round(self):
        histories = []
        for sequence in ([1, 2, 3, 4, 5], [1, 2, 5, 4, 3]):
            observations = strategy.empty_observations()
            for _ in range(20):
                strategy.record_number_sequence(observations, sequence)
            histories.append(observations)
        # The next-card prediction is identical; only later rounds differ.
        predictions = [strategy.predict_number_distribution(
            [2, 3, 4, 5], 1, "expert", history
        ) for history in histories]
        self.assertEqual(predictions[0], predictions[1])
        scores = [strategy.score_number_actions(
            [1, 3, 4, 5], [2, 3, 4, 5], 0, 1, "expert", history
        ) for history in histories]
        self.assertGreater(abs(scores[0][4] - scores[1][4]), 0.4)

    def test_expert_does_not_throw_away_best_number_move(self):
        observations = strategy.empty_observations()
        for _ in range(20):
            strategy.record_number_sequence(observations, [1, 2, 3, 4, 5])
        for seed in range(100):
            self.assertEqual(strategy.choose_number_card(
                [1, 3, 5], [3, 4, 5], 0, 2, "expert", observations,
                random.Random(seed),
            ), 3)

    def test_mixed_solver_resists_counterplay_and_excludes_dominated_moves(self):
        matrix = [[0, -1, 1], [1, 0, -1], [-1, 1, 0], [-2, -2, -2]]
        probabilities = strategy._solve_matrix(matrix, 768)
        self.assertAlmostEqual(sum(probabilities), 1.0)
        self.assertEqual(probabilities[3], 0.0)
        # A pure move loses to a counter. The mixed policy approaches value zero.
        for column in range(3):
            value = sum(p * row[column] for p, row in zip(probabilities, matrix))
            self.assertGreater(value, -0.03)

    def test_expert_takes_guaranteed_match_clinching_function_move(self):
        cpu = [1, 2, 3, 4, 5]
        player = [1, 4, 2, 5, 3]
        distribution = strategy.expert_function_distribution(
            cpu, player, ["J", "K", "JK"], ["J"], cpu_major_score=1,
        )
        self.assertAlmostEqual(sum(distribution.values()), 1.0)
        for action in distribution:
            for position in range(1, 6):
                resolved = strategy.resolve_function_actions(cpu, player, action, ("J", position))
                self.assertGreater(strategy.board_score_diff(*resolved), 0)
        for seed in range(30):
            self.assertEqual(strategy.choose_function_action(
                cpu, player, ["J", "K", "JK"], ["J"], 1, "expert",
                rng=random.Random(seed),
            ), ("K", 4))

    def test_joker_positions_share_one_strategic_action(self):
        distribution = strategy.expert_function_distribution(
            [1, 2, 3, 4, 5], [5, 4, 3, 2, 1], ["JK"], ["JK"],
        )
        self.assertEqual(distribution, {("JK", 1): 1.0})

    def test_expert_keeps_forced_wins_across_all_player_boards(self):
        cpu = strategy.NUMBER_CARDS
        actions = [(card, position) for card in strategy.FUNCTION_CARDS for position in range(1, 6)]
        checked = 0
        for player in permutations(strategy.NUMBER_CARDS):
            worst = {
                action: min(strategy.board_score_diff(*strategy.resolve_function_actions(
                    cpu, player, action, ("J", position)
                )) for position in range(1, 6)) for action in actions
            }
            if max(worst.values()) <= 0:
                continue
            checked += 1
            distribution = strategy.expert_function_distribution(
                cpu, player, strategy.FUNCTION_CARDS, ["J"],
            )
            for action in distribution:
                self.assertGreater(worst[action], 0, (player, action))
        self.assertGreater(checked, 0)

    def test_python_matches_shared_browser_fixtures(self):
        fixtures = json.loads(Path(__file__).with_name("expert_strategy_fixtures.json").read_text())
        observations = strategy.empty_observations()
        for sequence in fixtures["numberHistory"]:
            strategy.record_number_sequence(observations, sequence)
        for card, position in fixtures["functionHistory"]:
            strategy.record_function_action(observations, card, position)
        for entry in fixtures.get("advancedNumbers", []):
            state = entry["state"]
            scores = strategy.score_number_actions(
                state["cpuRemaining"], state["playerRemaining"], 0, state["roundIndex"],
                "expert", observations, advanced_context={
                    "cpu_board": state["cpuBoard"], "player_board": state["playerBoard"],
                    "cpu_cards": state["cpuCards"], "player_cards": state["playerCards"],
                    "cpu_major_score": state.get("cpuMajorScore", 0),
                },
            )
            for card, score in scores.items():
                self.assertAlmostEqual(score, entry["scores"][str(card)], places=9)
        for fixture in fixtures["numbers"]:
            state = fixture["state"]
            scores = strategy.score_number_actions(
                state["cpuRemaining"], state["playerRemaining"], state["scoreDiff"],
                state["roundIndex"], "expert", observations,
            )
            for card, score in scores.items():
                self.assertAlmostEqual(score, fixture["scores"][str(card)], places=9)
        for fixture in fixtures["functions"]:
            state = fixture["state"]
            distribution = strategy.expert_function_distribution(
                state["cpuBoard"], state["playerBoard"], state["cpuCards"],
                state["playerCards"], state["cpuMajorScore"], observations,
            )
            expected = {
                (entry["action"]["card"], entry["action"]["position"]): entry["probability"]
                for entry in fixture["distribution"]
            }
            self.assertEqual(distribution.keys(), expected.keys())
            for action, probability in distribution.items():
                self.assertAlmostEqual(probability, expected[action], places=9)

    def test_advanced_number_search_accounts_for_remaining_function_cards(self):
        observations = strategy.empty_observations()
        for _ in range(30):
            strategy.record_number_sequence(observations, [1, 2, 3, 4, 5])
        context = {"cpu_board": [1, 2, 4], "player_board": [1, 2, 3],
                   "cpu_cards": ["JK"], "player_cards": ["J"]}
        # Identical revealed numbers; changing only the remaining function card
        # reverses the correct choice. Both JOKERs cancel, a single JOKER flips.
        self.assertEqual(strategy.choose_number_card(
            [3, 5], [4, 5], round_index=3, difficulty="expert",
            observations=observations, advanced_context=context,
        ), 3)
        context["player_cards"] = ["JK"]
        self.assertEqual(strategy.choose_number_card(
            [3, 5], [4, 5], round_index=3, difficulty="expert",
            observations=observations, advanced_context=context,
        ), 5)

    def test_tactical_evidence_distinguishes_random_and_board_aware_actions(self):
        context = {"cpu_board": [3, 5, 4, 2, 1], "player_board": [1, 2, 3, 4, 5],
                   "cpu_cards": list(strategy.FUNCTION_CARDS), "player_cards": list(strategy.FUNCTION_CARDS)}
        random_observations = strategy.empty_observations()
        tactical_observations = strategy.empty_observations()
        rng = random.Random(93)
        for _ in range(300):
            strategy.record_function_action(random_observations, rng.choice(strategy.FUNCTION_CARDS),
                                            rng.randrange(1, 6), context=context)
            strategy.record_function_action(tactical_observations, "JK", 1, context=context)
        self.assertLess(strategy.opponent_counter_weight(random_observations), 0.15)
        self.assertGreater(strategy.opponent_counter_weight(tactical_observations), 0.60)
        distribution = strategy.expert_function_distribution(
            context["cpu_board"], context["player_board"], context["cpu_cards"],
            context["player_cards"], observations=random_observations,
        )
        self.assertLess(sum(p for (card, _), p in distribution.items() if card == "JK"), 0.05)
        # Recent behavior must also be able to undo an earlier tactical estimate.
        for _ in range(200):
            strategy.record_function_action(tactical_observations, rng.choice(strategy.FUNCTION_CARDS),
                                            rng.randrange(1, 6), context=context)
        self.assertLess(strategy.opponent_counter_weight(tactical_observations), 0.20)

    def test_function_habits_are_conditioned_on_available_cards(self):
        observations = strategy.empty_observations()
        context = {"cpu_board": [1, 2, 3, 4, 5], "player_board": [5, 4, 3, 2, 1],
                   "cpu_cards": list(strategy.FUNCTION_CARDS), "player_cards": list(strategy.FUNCTION_CARDS)}
        for _ in range(30):
            context["player_cards"] = list(strategy.FUNCTION_CARDS)
            strategy.record_function_action(observations, "J", 2, context=context)
            context["player_cards"] = ["Q", "K", "JK"]
            strategy.record_function_action(observations, "Q", 4, context=context)
        first = strategy.predict_function_distribution(strategy.FUNCTION_CARDS, "expert", observations)
        later = strategy.predict_function_distribution(["Q", "K", "JK"], "expert", observations)
        self.assertEqual(max(first, key=first.get), ("J", 2))
        self.assertEqual(max(later, key=later.get), ("Q", 4))
        self.assertAlmostEqual(sum(first.values()), 1)
        self.assertAlmostEqual(sum(later.values()), 1)

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
        # Expert intentionally exploits a repeated sequence; no artificial cap.
        self.assertGreater(rates["expert"], 0.90)

    def test_advanced_difficulty_balance_is_ordered(self):
        rates = {
            difficulty: strategy.simulate_advanced_habit_balance(
                600, difficulty, 24680
            )["cpuWinRate"]
            for difficulty in strategy.DIFFICULTY_PROFILES
        }
        self.assertLess(rates["beginner"], rates["intermediate"])
        self.assertLess(rates["intermediate"], rates["expert"])
        self.assertGreater(rates["expert"], 0.72)

    def test_advanced_expert_exploits_fixed_numbers_with_random_functions(self):
        # This was the failing opponent: predictable numbers, unpredictable
        # functions. Check another order too, so 12345 cannot be special-cased.
        for sequence in ([1, 2, 3, 4, 5], [5, 4, 3, 2, 1]):
            result = strategy.simulate_advanced_balance(
                120, "expert", 9309, player_sequence=sequence, fixed_numbers=True,
            )
            self.assertGreater(result["cpuWinRate"], 0.80, (sequence, result))

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

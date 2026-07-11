"""Rule-based computer strategy for the 1-2-3-4-5 card game.

The browser cannot execute Python on GitHub Pages, so this module is the
canonical strategy definition and also exports the small policy manifest used
by the static JavaScript runtime.  There is no model training or server-side
state involved.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


NUMBER_CARDS = (1, 2, 3, 4, 5)
FUNCTION_CARDS = ("J", "Q", "K", "JK")
SCHEMA_VERSION = 1
OBSERVATION_DECAY = 0.98
OBSERVATION_CONFIDENCE_GAMES = 10

# Scores are normalized before Gaussian noise is added.  The values below are
# deliberately readable and are verified by the balance simulation tests.
DIFFICULTY_PROFILES: dict[str, dict[str, float | int]] = {
    "beginner": {
        "lookahead": 1,
        "history_weight": 0.0,
        "random_rate": 0.55,
        "noise_sigma": 1.0,
        "blunder_rate": 0.12,
        "function_random_rate": 0.45,
        "function_noise_sigma": 0.90,
        "function_blunder_rate": 0.45,
        "worst_case_weight": 0.0,
        "reserve_weight": 0.0,
    },
    "intermediate": {
        "lookahead": 3,
        "history_weight": 0.30,
        "random_rate": 0.22,
        "noise_sigma": 0.42,
        "blunder_rate": 0.0,
        "function_random_rate": 0.70,
        "function_noise_sigma": 0.95,
        "function_blunder_rate": 0.0,
        "worst_case_weight": 0.0,
        "reserve_weight": 0.22,
    },
    "expert": {
        "lookahead": 5,
        "history_weight": 0.24,
        "random_rate": 0.10,
        "noise_sigma": 0.28,
        "blunder_rate": 0.0,
        "function_random_rate": 0.28,
        "function_noise_sigma": 0.42,
        "function_blunder_rate": 0.0,
        "worst_case_weight": 0.30,
        "reserve_weight": 0.36,
    },
}

FUNCTION_RESERVE_VALUE = {"J": 0.8, "Q": 0.8, "K": 1.2, "JK": 1.8}


def round_payoff(cpu_card: int, player_card: int) -> int:
    """Return +1 for a CPU win, -1 for a player win, otherwise 0."""

    if cpu_card == player_card:
        return 0
    if (cpu_card, player_card) in {(1, 5), (2, 4)}:
        return 1
    if (player_card, cpu_card) in {(1, 5), (2, 4)}:
        return -1
    return 1 if cpu_card > player_card else -1


def _terminal_utility(score_diff: int) -> float:
    if score_diff > 0:
        return 4.0 + score_diff * 0.2
    if score_diff < 0:
        return -4.0 + score_diff * 0.2
    return 0.0


@lru_cache(maxsize=None)
def _future_value(
    cpu_remaining: tuple[int, ...],
    player_remaining: tuple[int, ...],
    score_diff: int,
    depth: int,
) -> float:
    if not cpu_remaining:
        return _terminal_utility(score_diff)
    if depth <= 0:
        return score_diff * 0.6

    row_values: list[float] = []
    for cpu_card in cpu_remaining:
        continuations = []
        next_cpu = tuple(card for card in cpu_remaining if card != cpu_card)
        for player_card in player_remaining:
            next_player = tuple(card for card in player_remaining if card != player_card)
            continuations.append(
                _future_value(
                    next_cpu,
                    next_player,
                    score_diff + round_payoff(cpu_card, player_card),
                    depth - 1,
                )
            )
        row_values.append(sum(continuations) / len(continuations))
    return max(row_values)


def _empty_number_counts() -> list[dict[str, float]]:
    return [{str(card): 0.0 for card in NUMBER_CARDS} for _ in range(5)]


def _empty_function_counts() -> dict[str, Any]:
    return {
        "cards": {card: 0.0 for card in FUNCTION_CARDS},
        "positions": {str(position): 0.0 for position in range(1, 6)},
    }


def empty_observations() -> dict[str, Any]:
    return {
        "completed_sequences": 0,
        "number_counts": _empty_number_counts(),
        "function_counts": _empty_function_counts(),
    }


def _profile(difficulty: str) -> Mapping[str, float | int]:
    try:
        return DIFFICULTY_PROFILES[difficulty]
    except KeyError as exc:
        raise ValueError(f"Unknown difficulty: {difficulty}") from exc


def predict_number_distribution(
    player_remaining: Sequence[int],
    round_index: int,
    difficulty: str,
    observations: Mapping[str, Any] | None = None,
) -> dict[int, float]:
    """Blend a uniform prior with position-frequency observations."""

    remaining = tuple(sorted(set(player_remaining)))
    if not remaining:
        return {}

    profile = _profile(difficulty)
    uniform = 1.0 / len(remaining)
    history_cap = float(profile["history_weight"])
    if not observations or history_cap <= 0:
        return {card: uniform for card in remaining}

    counts_by_round = observations.get("number_counts", [])
    counts = counts_by_round[round_index] if round_index < len(counts_by_round) else {}
    smoothed = {card: float(counts.get(str(card), 0.0)) + 1.0 for card in remaining}
    smoothed_total = sum(smoothed.values())
    samples = sum(float(counts.get(str(card), 0.0)) for card in NUMBER_CARDS)
    confidence = min(1.0, samples / OBSERVATION_CONFIDENCE_GAMES)
    history_weight = history_cap * confidence
    return {
        card: (1.0 - history_weight) * uniform
        + history_weight * smoothed[card] / smoothed_total
        for card in remaining
    }


def score_number_actions(
    cpu_remaining: Sequence[int],
    player_remaining: Sequence[int],
    score_diff: int,
    round_index: int,
    difficulty: str,
    observations: Mapping[str, Any] | None = None,
) -> dict[int, float]:
    cpu_cards = tuple(sorted(set(cpu_remaining)))
    player_cards = tuple(sorted(set(player_remaining)))
    if not cpu_cards or len(cpu_cards) != len(player_cards):
        raise ValueError("Both sides must have the same non-zero number of cards")

    profile = _profile(difficulty)
    depth = min(int(profile["lookahead"]), len(cpu_cards))
    prediction = predict_number_distribution(
        player_cards, round_index, difficulty, observations
    )
    scores: dict[int, float] = {}
    for cpu_card in cpu_cards:
        next_cpu = tuple(card for card in cpu_cards if card != cpu_card)
        score = 0.0
        for player_card, probability in prediction.items():
            next_player = tuple(card for card in player_cards if card != player_card)
            new_diff = score_diff + round_payoff(cpu_card, player_card)
            continuation = _future_value(next_cpu, next_player, new_diff, depth - 1)
            score += probability * continuation
        scores[cpu_card] = score
    return scores


def _choose_from_scores(
    scores: Mapping[Any, float],
    difficulty: str,
    rng: random.Random,
    score_scale: float,
    phase: str = "number",
) -> Any:
    profile = _profile(difficulty)
    actions = list(scores)
    random_key = "function_random_rate" if phase == "function" else "random_rate"
    blunder_key = "function_blunder_rate" if phase == "function" else "blunder_rate"
    sigma_key = "function_noise_sigma" if phase == "function" else "noise_sigma"
    if rng.random() < float(profile[random_key]):
        return rng.choice(actions)

    if rng.random() < float(profile[blunder_key]):
        ordered = sorted(actions, key=scores.__getitem__)
        return rng.choice(ordered[: max(1, math.ceil(len(ordered) / 2))])

    sigma = float(profile[sigma_key])
    return max(
        actions,
        key=lambda action: scores[action] / score_scale + rng.gauss(0.0, sigma),
    )


def choose_number_card(
    cpu_remaining: Sequence[int],
    player_remaining: Sequence[int],
    score_diff: int = 0,
    round_index: int = 0,
    difficulty: str = "intermediate",
    observations: Mapping[str, Any] | None = None,
    rng: random.Random | None = None,
) -> int:
    scores = score_number_actions(
        cpu_remaining,
        player_remaining,
        score_diff,
        round_index,
        difficulty,
        observations,
    )
    return int(_choose_from_scores(scores, difficulty, rng or random.Random(), 5.0))


def _apply_jq(board: list[int], card: str, position: int) -> None:
    index = position - 1
    target = (index - 1) % 5 if card == "J" else (index + 1) % 5
    board[index], board[target] = board[target], board[index]


def resolve_function_actions(
    cpu_board: Sequence[int],
    player_board: Sequence[int],
    cpu_action: tuple[str, int],
    player_action: tuple[str, int],
) -> tuple[list[int], list[int]]:
    """Resolve actions in the same J/Q -> K -> JOKER order as the UI."""

    cpu = list(cpu_board)
    player = list(player_board)
    cpu_card, cpu_position = cpu_action
    player_card, player_position = player_action

    if player_card in {"J", "Q"}:
        _apply_jq(player, player_card, player_position)
    if cpu_card in {"J", "Q"}:
        _apply_jq(cpu, cpu_card, cpu_position)
    if player_card == "K":
        index = player_position - 1
        player[index], cpu[index] = cpu[index], player[index]
    if cpu_card == "K":
        index = cpu_position - 1
        player[index], cpu[index] = cpu[index], player[index]
    if player_card == "JK":
        player, cpu = cpu, player
    if cpu_card == "JK":
        player, cpu = cpu, player
    return cpu, player


def board_score_diff(cpu_board: Sequence[int], player_board: Sequence[int]) -> int:
    return sum(round_payoff(cpu, player) for cpu, player in zip(cpu_board, player_board))


def predict_function_distribution(
    player_cards: Sequence[str],
    difficulty: str,
    observations: Mapping[str, Any] | None = None,
) -> dict[tuple[str, int], float]:
    cards = tuple(card for card in FUNCTION_CARDS if card in player_cards)
    actions = [(card, position) for card in cards for position in range(1, 6)]
    if not actions:
        return {}

    profile = _profile(difficulty)
    history_cap = float(profile["history_weight"])
    if not observations or history_cap <= 0:
        probability = 1.0 / len(actions)
        return {action: probability for action in actions}

    function_counts = observations.get("function_counts", {})
    card_counts = function_counts.get("cards", {})
    position_counts = function_counts.get("positions", {})
    card_weights = {card: float(card_counts.get(card, 0.0)) + 1.0 for card in cards}
    position_weights = {
        position: float(position_counts.get(str(position), 0.0)) + 1.0
        for position in range(1, 6)
    }
    observed_samples = sum(float(card_counts.get(card, 0.0)) for card in FUNCTION_CARDS)
    history_weight = history_cap * min(
        1.0, observed_samples / OBSERVATION_CONFIDENCE_GAMES
    )
    learned_raw = {
        action: card_weights[action[0]] * position_weights[action[1]] for action in actions
    }
    learned_total = sum(learned_raw.values())
    uniform = 1.0 / len(actions)
    return {
        action: (1.0 - history_weight) * uniform
        + history_weight * learned_raw[action] / learned_total
        for action in actions
    }


def score_function_actions(
    cpu_board: Sequence[int],
    player_board: Sequence[int],
    cpu_cards: Sequence[str],
    player_cards: Sequence[str],
    cpu_major_score: int = 0,
    difficulty: str = "intermediate",
    observations: Mapping[str, Any] | None = None,
) -> dict[tuple[str, int], float]:
    profile = _profile(difficulty)
    cpu_actions = [
        (card, position)
        for card in FUNCTION_CARDS
        if card in cpu_cards
        for position in range(1, 6)
    ]
    player_distribution = predict_function_distribution(
        player_cards, difficulty, observations
    )
    if not cpu_actions or not player_distribution:
        raise ValueError("Both sides need at least one function card")

    worst_weight = float(profile["worst_case_weight"])
    scores: dict[tuple[str, int], float] = {}
    for cpu_action in cpu_actions:
        outcomes: list[tuple[float, float]] = []
        for player_action, probability in player_distribution.items():
            resolved_cpu, resolved_player = resolve_function_actions(
                cpu_board, player_board, cpu_action, player_action
            )
            diff = board_score_diff(resolved_cpu, resolved_player)
            major = 1 if diff > 0 else -1 if diff < 0 else 0
            clinch_bonus = 2.0 if major > 0 and cpu_major_score >= 1 else 0.0
            outcomes.append((12.0 * major + diff + clinch_bonus, probability))

        expected = sum(value * probability for value, probability in outcomes)
        worst = min(value for value, _ in outcomes)
        reserve_cost = 0.0
        if len(cpu_cards) > 1:
            reserve_cost = (
                float(profile["reserve_weight"])
                * FUNCTION_RESERVE_VALUE[cpu_action[0]]
            )
        scores[cpu_action] = (
            (1.0 - worst_weight) * expected + worst_weight * worst - reserve_cost
        )
    return scores


def choose_function_action(
    cpu_board: Sequence[int],
    player_board: Sequence[int],
    cpu_cards: Sequence[str],
    player_cards: Sequence[str],
    cpu_major_score: int = 0,
    difficulty: str = "intermediate",
    observations: Mapping[str, Any] | None = None,
    rng: random.Random | None = None,
) -> tuple[str, int]:
    scores = score_function_actions(
        cpu_board,
        player_board,
        cpu_cards,
        player_cards,
        cpu_major_score,
        difficulty,
        observations,
    )
    return _choose_from_scores(
        scores, difficulty, rng or random.Random(), 17.0, phase="function"
    )


def record_number_sequence(observations: dict[str, Any], sequence: Sequence[int]) -> None:
    counts = observations.setdefault("number_counts", _empty_number_counts())
    for row in counts:
        for card in NUMBER_CARDS:
            row[str(card)] = float(row.get(str(card), 0.0)) * OBSERVATION_DECAY
    for index, card in enumerate(sequence[:5]):
        counts[index][str(card)] = float(counts[index].get(str(card), 0.0)) + 1.0
    observations["completed_sequences"] = int(observations.get("completed_sequences", 0)) + 1


def record_function_action(
    observations: dict[str, Any], card: str, position: int
) -> None:
    counts = observations.setdefault("function_counts", _empty_function_counts())
    for key in FUNCTION_CARDS:
        counts["cards"][key] = float(counts["cards"].get(key, 0.0)) * OBSERVATION_DECAY
    for key in range(1, 6):
        text_key = str(key)
        counts["positions"][text_key] = (
            float(counts["positions"].get(text_key, 0.0)) * OBSERVATION_DECAY
        )
    counts["cards"][card] = float(counts["cards"].get(card, 0.0)) + 1.0
    text_position = str(position)
    counts["positions"][text_position] = (
        float(counts["positions"].get(text_position, 0.0)) + 1.0
    )


def policy_manifest() -> dict[str, Any]:
    return {
        "schemaVersion": SCHEMA_VERSION,
        "observationDecay": OBSERVATION_DECAY,
        "observationConfidenceGames": OBSERVATION_CONFIDENCE_GAMES,
        "numberCards": list(NUMBER_CARDS),
        "functionCards": list(FUNCTION_CARDS),
        "functionReserveValue": FUNCTION_RESERVE_VALUE,
        "difficultyProfiles": DIFFICULTY_PROFILES,
    }


def export_policy(output_directory: str | Path) -> Path:
    directory = Path(output_directory)
    directory.mkdir(parents=True, exist_ok=True)
    output = directory / "computer-strategy-policy.js"
    payload = json.dumps(policy_manifest(), ensure_ascii=False, separators=(",", ":"))
    output.write_text(
        "// Generated by backend/computer_strategy.py; do not edit.\n"
        f"window.COMPUTER_STRATEGY_POLICY={payload};\n",
        encoding="utf-8",
    )
    return output


def simulate_basic_balance(
    games: int, difficulty: str, seed: int = 12345
) -> dict[str, float | int]:
    rng = random.Random(seed)
    cpu_wins = player_wins = draws = 0
    for _ in range(games):
        cpu_remaining = list(NUMBER_CARDS)
        player_sequence = list(NUMBER_CARDS)
        rng.shuffle(player_sequence)
        player_remaining = list(NUMBER_CARDS)
        score_diff = 0
        for round_index, player_card in enumerate(player_sequence):
            cpu_card = choose_number_card(
                cpu_remaining,
                player_remaining,
                score_diff,
                round_index,
                difficulty,
                rng=rng,
            )
            score_diff += round_payoff(cpu_card, player_card)
            cpu_remaining.remove(cpu_card)
            player_remaining.remove(player_card)
        if score_diff > 0:
            cpu_wins += 1
        elif score_diff < 0:
            player_wins += 1
        else:
            draws += 1
    return {
        "games": games,
        "cpuWins": cpu_wins,
        "playerWins": player_wins,
        "draws": draws,
        "cpuWinRate": cpu_wins / games if games else 0.0,
    }


def simulate_habit_balance(
    games: int,
    difficulty: str,
    seed: int = 12345,
    player_sequence: Sequence[int] = NUMBER_CARDS,
) -> dict[str, float | int]:
    """Simulate repeated matches against a player with a positional habit."""

    if sorted(player_sequence) != list(NUMBER_CARDS):
        raise ValueError("player_sequence must be a permutation of 1..5")
    rng = random.Random(seed)
    observations = empty_observations()
    cpu_wins = player_wins = draws = 0
    for _ in range(games):
        cpu_remaining = list(NUMBER_CARDS)
        player_remaining = list(NUMBER_CARDS)
        score_diff = 0
        for round_index, player_card in enumerate(player_sequence):
            cpu_card = choose_number_card(
                cpu_remaining,
                player_remaining,
                score_diff,
                round_index,
                difficulty,
                observations,
                rng,
            )
            score_diff += round_payoff(cpu_card, player_card)
            cpu_remaining.remove(cpu_card)
            player_remaining.remove(player_card)
        record_number_sequence(observations, player_sequence)
        if score_diff > 0:
            cpu_wins += 1
        elif score_diff < 0:
            player_wins += 1
        else:
            draws += 1
    return {
        "games": games,
        "cpuWins": cpu_wins,
        "playerWins": player_wins,
        "draws": draws,
        "cpuWinRate": cpu_wins / games if games else 0.0,
    }


def simulate_advanced_balance(
    games: int,
    difficulty: str,
    seed: int = 12345,
    habitual: bool = False,
    player_sequence: Sequence[int] = NUMBER_CARDS,
) -> dict[str, float | int]:
    """Simulate advanced matches without involving the browser UI."""

    if sorted(player_sequence) != list(NUMBER_CARDS):
        raise ValueError("player_sequence must be a permutation of 1..5")
    rng = random.Random(seed)
    observations = empty_observations()
    cpu_match_wins = player_match_wins = draws = 0
    function_positions = (1, 2, 3, 4)

    for _ in range(games):
        cpu_functions = list(FUNCTION_CARDS)
        player_functions = list(FUNCTION_CARDS)
        cpu_major = player_major = cpu_minor = player_minor = 0
        major_round = 1

        while True:
            round_sequence = list(player_sequence)
            if not habitual:
                rng.shuffle(round_sequence)
            cpu_remaining = list(NUMBER_CARDS)
            player_remaining = list(NUMBER_CARDS)
            cpu_board: list[int] = []
            player_board: list[int] = []
            score_diff = 0
            for round_index, player_card in enumerate(round_sequence):
                cpu_card = choose_number_card(
                    cpu_remaining,
                    player_remaining,
                    score_diff,
                    round_index,
                    difficulty,
                    observations,
                    rng,
                )
                cpu_board.append(cpu_card)
                player_board.append(player_card)
                score_diff += round_payoff(cpu_card, player_card)
                cpu_remaining.remove(cpu_card)
                player_remaining.remove(player_card)

            player_function = (
                player_functions[0] if habitual else rng.choice(player_functions)
            )
            player_position = (
                function_positions[(major_round - 1) % len(function_positions)]
                if habitual
                else rng.randrange(1, 6)
            )
            cpu_action = choose_function_action(
                cpu_board,
                player_board,
                cpu_functions,
                player_functions,
                cpu_major,
                difficulty,
                observations,
                rng,
            )
            resolved_cpu, resolved_player = resolve_function_actions(
                cpu_board,
                player_board,
                cpu_action,
                (player_function, player_position),
            )
            diff = board_score_diff(resolved_cpu, resolved_player)
            cpu_round_wins = sum(
                round_payoff(cpu, player) > 0
                for cpu, player in zip(resolved_cpu, resolved_player)
            )
            player_round_wins = sum(
                round_payoff(cpu, player) < 0
                for cpu, player in zip(resolved_cpu, resolved_player)
            )
            cpu_minor += cpu_round_wins
            player_minor += player_round_wins
            if diff > 0:
                cpu_major += 1
            elif diff < 0:
                player_major += 1

            record_number_sequence(observations, round_sequence)
            record_function_action(observations, player_function, player_position)
            cpu_functions.remove(cpu_action[0])
            player_functions.remove(player_function)

            done_by_score = cpu_major >= 2 or player_major >= 2
            tie_after_three = major_round >= 3 and cpu_major == player_major
            if done_by_score or (major_round >= 3 and not tie_after_three) or major_round == 4:
                break
            major_round += 1

        if cpu_major > player_major or (
            cpu_major == player_major and cpu_minor > player_minor
        ):
            cpu_match_wins += 1
        elif player_major > cpu_major or player_minor > cpu_minor:
            player_match_wins += 1
        else:
            draws += 1

    return {
        "games": games,
        "cpuWins": cpu_match_wins,
        "playerWins": player_match_wins,
        "draws": draws,
        "cpuWinRate": cpu_match_wins / games if games else 0.0,
    }


def simulate_advanced_habit_balance(
    games: int,
    difficulty: str,
    seed: int = 12345,
    player_sequence: Sequence[int] = NUMBER_CARDS,
) -> dict[str, float | int]:
    return simulate_advanced_balance(
        games,
        difficulty,
        seed,
        habitual=True,
        player_sequence=player_sequence,
    )


def simulate_benchmark_suite(games: int, seed: int = 12345) -> dict[str, Any]:
    """Run every mode/difficulty benchmark and return a JSON-ready report."""

    report: dict[str, Any] = {
        "gamesPerScenario": games,
        "seed": seed,
        "scenarios": {},
    }
    for difficulty in DIFFICULTY_PROFILES:
        report["scenarios"][difficulty] = {
            "basicRandom": simulate_basic_balance(games, difficulty, seed),
            "basicHabit": simulate_habit_balance(games, difficulty, seed),
            "advancedRandom": simulate_advanced_balance(
                games, difficulty, seed, habitual=False
            ),
            "advancedHabit": simulate_advanced_balance(
                games, difficulty, seed, habitual=True
            ),
        }
    return report


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--export", metavar="DIRECTORY", help="export static policy")
    parser.add_argument("--simulate", type=int, metavar="GAMES", help="run headless balance simulation")
    parser.add_argument(
        "--benchmark",
        choices=(
            "basic-random",
            "basic-habit",
            "advanced-random",
            "advanced-habit",
            "suite",
        ),
        default="suite",
        help="simulation scenario (default: suite)",
    )
    parser.add_argument(
        "--difficulty", choices=tuple(DIFFICULTY_PROFILES), default="intermediate"
    )
    parser.add_argument("--seed", type=int, default=12345)
    parser.add_argument("--report", metavar="FILE", help="also write simulation JSON to FILE")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)
    if not args.export and args.simulate is None:
        _build_parser().print_help()
        return 0
    if args.export:
        print(export_policy(args.export))
    if args.simulate is not None:
        benchmarks = {
            "basic-random": lambda: simulate_basic_balance(
                args.simulate, args.difficulty, args.seed
            ),
            "basic-habit": lambda: simulate_habit_balance(
                args.simulate, args.difficulty, args.seed
            ),
            "advanced-random": lambda: simulate_advanced_balance(
                args.simulate, args.difficulty, args.seed, habitual=False
            ),
            "advanced-habit": lambda: simulate_advanced_balance(
                args.simulate, args.difficulty, args.seed, habitual=True
            ),
            "suite": lambda: simulate_benchmark_suite(args.simulate, args.seed),
        }
        result = benchmarks[args.benchmark]()
        serialized = json.dumps(result, ensure_ascii=False, indent=2)
        print(serialized)
        if args.report:
            report_path = Path(args.report)
            report_path.parent.mkdir(parents=True, exist_ok=True)
            report_path.write_text(serialized + "\n", encoding="utf-8")
            print(report_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

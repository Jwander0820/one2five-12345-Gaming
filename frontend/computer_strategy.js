(function attachComputerStrategy(global) {
  "use strict";

  const policy = global.COMPUTER_STRATEGY_POLICY;
  if (!policy) {
    global.ComputerStrategy = { available: false };
    return;
  }

  const STORAGE_KEY = `one2five.strategy.v${policy.schemaVersion}`;
  const NUMBER_CARDS = policy.numberCards;
  const FUNCTION_CARDS = policy.functionCards;

  const emptyModeObservations = () => ({
    completedSequences: 0,
    numberCounts: Array.from({ length: 5 }, () =>
      Object.fromEntries(NUMBER_CARDS.map((card) => [String(card), 0])),
    ),
    functionCounts: {
      cards: Object.fromEntries(FUNCTION_CARDS.map((card) => [card, 0])),
      positions: Object.fromEntries([1, 2, 3, 4, 5].map((position) => [String(position), 0])),
    },
  });

  const emptyStore = () => ({
    schemaVersion: policy.schemaVersion,
    modes: {
      basic: emptyModeObservations(),
      advanced: emptyModeObservations(),
    },
  });

  const sanitizeMode = (candidate) => {
    const clean = emptyModeObservations();
    if (!candidate || typeof candidate !== "object") return clean;
    clean.completedSequences = Number.isFinite(candidate.completedSequences)
      ? Math.max(0, candidate.completedSequences)
      : 0;
    if (Array.isArray(candidate.numberCounts)) {
      clean.numberCounts.forEach((row, roundIndex) => {
        NUMBER_CARDS.forEach((card) => {
          const value = Number(candidate.numberCounts?.[roundIndex]?.[String(card)]);
          row[String(card)] = Number.isFinite(value) && value >= 0 ? value : 0;
        });
      });
    }
    FUNCTION_CARDS.forEach((card) => {
      const value = Number(candidate.functionCounts?.cards?.[card]);
      clean.functionCounts.cards[card] = Number.isFinite(value) && value >= 0 ? value : 0;
    });
    [1, 2, 3, 4, 5].forEach((position) => {
      const value = Number(candidate.functionCounts?.positions?.[String(position)]);
      clean.functionCounts.positions[String(position)] = Number.isFinite(value) && value >= 0 ? value : 0;
    });
    return clean;
  };

  const loadStore = () => {
    try {
      const parsed = JSON.parse(global.localStorage.getItem(STORAGE_KEY));
      if (parsed?.schemaVersion !== policy.schemaVersion) return emptyStore();
      return {
        schemaVersion: policy.schemaVersion,
        modes: {
          basic: sanitizeMode(parsed.modes?.basic),
          advanced: sanitizeMode(parsed.modes?.advanced),
        },
      };
    } catch (_error) {
      return emptyStore();
    }
  };

  let observationStore = loadStore();

  const saveStore = () => {
    try {
      global.localStorage.setItem(STORAGE_KEY, JSON.stringify(observationStore));
      return true;
    } catch (_error) {
      return false;
    }
  };

  const profileFor = (difficulty) =>
    policy.difficultyProfiles[difficulty] ?? policy.difficultyProfiles.intermediate;

  const roundPayoff = (cpuCard, playerCard) => {
    if (cpuCard === playerCard) return 0;
    if ((cpuCard === 1 && playerCard === 5) || (cpuCard === 2 && playerCard === 4)) return 1;
    if ((playerCard === 1 && cpuCard === 5) || (playerCard === 2 && cpuCard === 4)) return -1;
    return cpuCard > playerCard ? 1 : -1;
  };

  const terminalUtility = (scoreDiff) => {
    if (scoreDiff > 0) return 4 + scoreDiff * 0.2;
    if (scoreDiff < 0) return -4 + scoreDiff * 0.2;
    return 0;
  };

  const futureValue = (cpuRemaining, playerRemaining, scoreDiff, depth, memo) => {
    if (cpuRemaining.length === 0) return terminalUtility(scoreDiff);
    if (depth <= 0) return scoreDiff * 0.6;
    const key = `${cpuRemaining.join("")}|${playerRemaining.join("")}|${scoreDiff}|${depth}`;
    if (memo.has(key)) return memo.get(key);

    let best = -Infinity;
    cpuRemaining.forEach((cpuCard) => {
      const nextCpu = cpuRemaining.filter((card) => card !== cpuCard);
      let total = 0;
      playerRemaining.forEach((playerCard) => {
        const nextPlayer = playerRemaining.filter((card) => card !== playerCard);
        total += futureValue(
          nextCpu,
          nextPlayer,
          scoreDiff + roundPayoff(cpuCard, playerCard),
          depth - 1,
          memo,
        );
      });
      best = Math.max(best, total / playerRemaining.length);
    });
    memo.set(key, best);
    return best;
  };

  const predictNumberDistribution = ({ playerRemaining, roundIndex, difficulty, observations }) => {
    const profile = profileFor(difficulty);
    const uniform = 1 / playerRemaining.length;
    const historyCap = profile.history_weight;
    if (!observations || historyCap <= 0) {
      return Object.fromEntries(playerRemaining.map((card) => [card, uniform]));
    }

    const counts = observations.numberCounts[roundIndex] ?? {};
    const samples = NUMBER_CARDS.reduce((sum, card) => sum + Number(counts[String(card)] ?? 0), 0);
    const confidence = Math.min(1, samples / policy.observationConfidenceGames);
    const historyWeight = historyCap * confidence;
    const smoothed = Object.fromEntries(
      playerRemaining.map((card) => [card, Number(counts[String(card)] ?? 0) + 1]),
    );
    const total = playerRemaining.reduce((sum, card) => sum + smoothed[card], 0);
    return Object.fromEntries(
      playerRemaining.map((card) => [
        card,
        (1 - historyWeight) * uniform + historyWeight * smoothed[card] / total,
      ]),
    );
  };

  const scoreNumberActions = ({
    cpuRemaining,
    playerRemaining,
    scoreDiff = 0,
    roundIndex = 0,
    difficulty = "intermediate",
    mode = "basic",
  }) => {
    const cpuCards = [...new Set(cpuRemaining)].sort();
    const playerCards = [...new Set(playerRemaining)].sort();
    if (cpuCards.length === 0 || cpuCards.length !== playerCards.length) return [];
    const profile = profileFor(difficulty);
    const depth = Math.min(profile.lookahead, cpuCards.length);
    const prediction = predictNumberDistribution({
      playerRemaining: playerCards,
      roundIndex,
      difficulty,
      observations: observationStore.modes[mode] ?? observationStore.modes.basic,
    });
    const memo = new Map();
    return cpuCards.map((cpuCard) => {
      const nextCpu = cpuCards.filter((card) => card !== cpuCard);
      let score = 0;
      playerCards.forEach((playerCard) => {
        const nextPlayer = playerCards.filter((card) => card !== playerCard);
        score += prediction[playerCard] * futureValue(
          nextCpu,
          nextPlayer,
          scoreDiff + roundPayoff(cpuCard, playerCard),
          depth - 1,
          memo,
        );
      });
      return { action: cpuCard, score };
    });
  };

  const gaussian = (rng) => {
    let first = 0;
    let second = 0;
    while (first === 0) first = rng();
    while (second === 0) second = rng();
    return Math.sqrt(-2 * Math.log(first)) * Math.cos(2 * Math.PI * second);
  };

  const chooseFromScores = (entries, difficulty, scoreScale, rng = Math.random, phase = "number") => {
    if (entries.length === 0) return null;
    const profile = profileFor(difficulty);
    const randomRate = phase === "function" ? profile.function_random_rate : profile.random_rate;
    const blunderRate = phase === "function" ? profile.function_blunder_rate : profile.blunder_rate;
    const noiseSigma = phase === "function" ? profile.function_noise_sigma : profile.noise_sigma;
    if (rng() < randomRate) return entries[Math.floor(rng() * entries.length)].action;

    const ordered = [...entries].sort((left, right) => left.score - right.score);
    if (rng() < blunderRate) {
      const lowerHalf = ordered.slice(0, Math.max(1, Math.ceil(ordered.length / 2)));
      return lowerHalf[Math.floor(rng() * lowerHalf.length)].action;
    }

    let best = entries[0].action;
    let bestScore = -Infinity;
    entries.forEach((entry) => {
      const noisyScore = entry.score / scoreScale + gaussian(rng) * noiseSigma;
      if (noisyScore > bestScore) {
        bestScore = noisyScore;
        best = entry.action;
      }
    });
    return best;
  };

  const chooseNumberCard = (state, rng = Math.random) =>
    chooseFromScores(scoreNumberActions(state), state.difficulty ?? "intermediate", 5, rng);

  const applyJQ = (board, card, position) => {
    const index = position - 1;
    const target = card === "J" ? (index + 4) % 5 : (index + 1) % 5;
    [board[index], board[target]] = [board[target], board[index]];
  };

  const resolveFunctionActions = (cpuBoard, playerBoard, cpuAction, playerAction) => {
    let cpu = [...cpuBoard];
    let player = [...playerBoard];
    if (playerAction.card === "J" || playerAction.card === "Q") {
      applyJQ(player, playerAction.card, playerAction.position);
    }
    if (cpuAction.card === "J" || cpuAction.card === "Q") {
      applyJQ(cpu, cpuAction.card, cpuAction.position);
    }
    if (playerAction.card === "K") {
      const index = playerAction.position - 1;
      [player[index], cpu[index]] = [cpu[index], player[index]];
    }
    if (cpuAction.card === "K") {
      const index = cpuAction.position - 1;
      [player[index], cpu[index]] = [cpu[index], player[index]];
    }
    if (playerAction.card === "JK") [player, cpu] = [cpu, player];
    if (cpuAction.card === "JK") [player, cpu] = [cpu, player];
    return { cpuBoard: cpu, playerBoard: player };
  };

  const boardScoreDiff = (cpuBoard, playerBoard) =>
    cpuBoard.reduce((sum, cpuCard, index) => sum + roundPayoff(cpuCard, playerBoard[index]), 0);

  const predictFunctionDistribution = ({ playerCards, difficulty, observations }) => {
    const actions = playerCards.flatMap((card) =>
      [1, 2, 3, 4, 5].map((position) => ({ card, position })),
    );
    const profile = profileFor(difficulty);
    const uniform = 1 / actions.length;
    if (!observations || profile.history_weight <= 0) {
      return actions.map((action) => ({ action, probability: uniform }));
    }

    const cardCounts = observations.functionCounts.cards;
    const positionCounts = observations.functionCounts.positions;
    const samples = FUNCTION_CARDS.reduce((sum, card) => sum + Number(cardCounts[card] ?? 0), 0);
    const historyWeight = profile.history_weight
      * Math.min(1, samples / policy.observationConfidenceGames);
    const weighted = actions.map((action) => ({
      action,
      weight: (Number(cardCounts[action.card] ?? 0) + 1)
        * (Number(positionCounts[String(action.position)] ?? 0) + 1),
    }));
    const total = weighted.reduce((sum, entry) => sum + entry.weight, 0);
    return weighted.map((entry) => ({
      action: entry.action,
      probability: (1 - historyWeight) * uniform + historyWeight * entry.weight / total,
    }));
  };

  const scoreFunctionActions = ({
    cpuBoard,
    playerBoard,
    cpuCards,
    playerCards,
    cpuMajorScore = 0,
    difficulty = "intermediate",
    mode = "advanced",
  }) => {
    const profile = profileFor(difficulty);
    const cpuActions = cpuCards.flatMap((card) =>
      [1, 2, 3, 4, 5].map((position) => ({ card, position })),
    );
    const playerDistribution = predictFunctionDistribution({
      playerCards,
      difficulty,
      observations: observationStore.modes[mode] ?? observationStore.modes.advanced,
    });
    return cpuActions.map((cpuAction) => {
      const outcomes = playerDistribution.map(({ action: playerAction, probability }) => {
        const resolved = resolveFunctionActions(cpuBoard, playerBoard, cpuAction, playerAction);
        const diff = boardScoreDiff(resolved.cpuBoard, resolved.playerBoard);
        const major = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        const clinchBonus = major > 0 && cpuMajorScore >= 1 ? 2 : 0;
        return { utility: 12 * major + diff + clinchBonus, probability };
      });
      const expected = outcomes.reduce(
        (sum, outcome) => sum + outcome.utility * outcome.probability,
        0,
      );
      const worst = Math.min(...outcomes.map((outcome) => outcome.utility));
      const reserveCost = cpuCards.length > 1
        ? profile.reserve_weight * policy.functionReserveValue[cpuAction.card]
        : 0;
      return {
        action: cpuAction,
        score: (1 - profile.worst_case_weight) * expected
          + profile.worst_case_weight * worst
          - reserveCost,
      };
    });
  };

  const chooseFunctionAction = (state, rng = Math.random) =>
    chooseFromScores(
      scoreFunctionActions(state),
      state.difficulty ?? "intermediate",
      17,
      rng,
      "function",
    );

  const recordNumberSequence = (mode, sequence) => {
    const observations = observationStore.modes[mode] ?? observationStore.modes.basic;
    observations.numberCounts.forEach((row) => {
      NUMBER_CARDS.forEach((card) => {
        row[String(card)] = Number(row[String(card)] ?? 0) * policy.observationDecay;
      });
    });
    sequence.slice(0, 5).forEach((card, roundIndex) => {
      const row = observations.numberCounts[roundIndex];
      row[String(card)] = Number(row[String(card)] ?? 0) + 1;
    });
    observations.completedSequences += 1;
    saveStore();
  };

  const recordFunctionAction = (mode, card, position) => {
    const observations = observationStore.modes[mode] ?? observationStore.modes.advanced;
    FUNCTION_CARDS.forEach((key) => {
      observations.functionCounts.cards[key] =
        Number(observations.functionCounts.cards[key] ?? 0) * policy.observationDecay;
    });
    [1, 2, 3, 4, 5].forEach((key) => {
      observations.functionCounts.positions[String(key)] =
        Number(observations.functionCounts.positions[String(key)] ?? 0) * policy.observationDecay;
    });
    observations.functionCounts.cards[card] += 1;
    observations.functionCounts.positions[String(position)] += 1;
    saveStore();
  };

  const clearObservations = () => {
    observationStore = emptyStore();
    try {
      global.localStorage.removeItem(STORAGE_KEY);
    } catch (_error) {
      return false;
    }
    return true;
  };

  const getObservationSummary = () => ({
    basic: observationStore.modes.basic.completedSequences,
    advanced: observationStore.modes.advanced.completedSequences,
  });

  global.ComputerStrategy = Object.freeze({
    available: true,
    schemaVersion: policy.schemaVersion,
    difficulties: Object.freeze(Object.keys(policy.difficultyProfiles)),
    chooseNumberCard,
    chooseFunctionAction,
    scoreNumberActions,
    scoreFunctionActions,
    resolveFunctionActions,
    roundPayoff,
    recordNumberSequence,
    recordFunctionAction,
    clearObservations,
    getObservationSummary,
  });
})(window);

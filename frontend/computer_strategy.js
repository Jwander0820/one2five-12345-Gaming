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
    functionContexts: {},
    functionTactics: { samples: 0, advantage: 0 },
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
    for (let mask = 1; mask < 16; mask += 1) {
      const cards = FUNCTION_CARDS.filter((_, i) => mask & (1 << i));
      const key = cards.join("|");
      const row = candidate.functionContexts?.[key];
      if (!row || typeof row !== "object") continue;
      clean.functionContexts[key] = {};
      for (const card of cards) for (let position = 1; position <= 5; position += 1) {
        const action = `${card}:${position}`;
        const value = Number(row[action]);
        if (Number.isFinite(value) && value >= 0) clean.functionContexts[key][action] = value;
      }
    }
    const samples = Number(candidate.functionTactics?.samples);
    const advantage = Number(candidate.functionTactics?.advantage);
    if (Number.isFinite(samples) && samples >= 0 && Number.isFinite(advantage)) {
      clean.functionTactics = { samples, advantage: Math.max(-samples, Math.min(samples, advantage)) };
    }
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
    cpuBoard = [], playerBoard = [], cpuCards: cpuFunctions, playerCards: playerFunctions,
    cpuMajorScore = 0,
  }) => {
    const cpuCards = [...new Set(cpuRemaining)].sort();
    const playerCards = [...new Set(playerRemaining)].sort();
    if (cpuCards.length === 0 || cpuCards.length !== playerCards.length) return [];
    const profile = profileFor(difficulty);
    const depth = Math.min(profile.lookahead, cpuCards.length);
    const observations = observationStore.modes[mode] ?? observationStore.modes.basic;
    if (difficulty === "expert" && mode === "advanced" && cpuFunctions && playerFunctions) {
      return scoreAdvancedNumbers(cpuCards, playerCards, roundIndex, observations, {
        cpuBoard, playerBoard, cpuCards: cpuFunctions, playerCards: playerFunctions, cpuMajorScore,
      });
    }
    const prediction = predictNumberDistribution({
      playerRemaining: playerCards,
      roundIndex,
      difficulty,
      observations,
    });
    const memo = new Map();
    const predictionMemo = new Map();
    const useHistorySearch = difficulty === "expert"
      && observations.numberCounts.some((row) => Object.values(row).some((value) => value > 0));
    const expertFuture = (cpu, player, diff) => {
      if (cpu.length === 0) return terminalUtility(diff);
      const index = roundIndex + cpuCards.length - cpu.length;
      const key = `${cpu.join("")}|${player.join("")}|${diff}`;
      if (memo.has(key)) return memo.get(key);
      const predictionKey = `${player.join("")}|${index}`;
      if (!predictionMemo.has(predictionKey)) {
        predictionMemo.set(predictionKey, predictNumberDistribution({
          playerRemaining: player, roundIndex: index, difficulty, observations,
        }));
      }
      const distribution = predictionMemo.get(predictionKey);
      const value = Math.max(...cpu.map((cpuCard) => {
        const nextCpu = cpu.filter((card) => card !== cpuCard);
        return player.reduce((total, playerCard) => total + distribution[playerCard] * expertFuture(
          nextCpu,
          player.filter((card) => card !== playerCard),
          diff + roundPayoff(cpuCard, playerCard),
        ), 0);
      }));
      memo.set(key, value);
      return value;
    };
    return cpuCards.map((cpuCard) => {
      const nextCpu = cpuCards.filter((card) => card !== cpuCard);
      let score = 0;
      playerCards.forEach((playerCard) => {
        const nextPlayer = playerCards.filter((card) => card !== playerCard);
        const diff = scoreDiff + roundPayoff(cpuCard, playerCard);
        score += prediction[playerCard] * (useHistorySearch
          ? expertFuture(nextCpu, nextPlayer, diff)
          : futureValue(nextCpu, nextPlayer, diff, depth - 1, memo));
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
    if (difficulty === "expert") {
      const best = Math.max(...entries.map((entry) => entry.score));
      const tied = entries.filter((entry) => entry.score >= best - 1e-9);
      return tied[Math.floor(rng() * tied.length)].action;
    }
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

    const key = FUNCTION_CARDS.filter((card) => playerCards.includes(card)).join("|");
    const joint = observations.functionContexts?.[key] ?? {};
    const jointSamples = Object.values(joint).reduce((sum, value) => sum + value, 0);
    if (difficulty === "expert" && jointSamples > 0) {
      const weight = profile.history_weight * Math.min(1, jointSamples / policy.observationConfidenceGames);
      return actions.map((action) => ({ action, probability: (1 - weight) * uniform
        + weight * ((joint[`${action.card}:${action.position}`] ?? 0) + 1) / (jointSamples + actions.length) }));
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

  // Fictitious play finds a mixed response to a distribution of counterplays.
  // Dominated actions never receive probability, even during warmup.
  const solveMatrix = (matrix, iterations, prune = true) => {
    matrix = matrix.map((row) => row.map((value) => Math.floor(value * 1e8 + 0.5)));
    const active = matrix.map((_, i) => i).filter((i) => !prune || !matrix.some((other, j) =>
      i !== j && other.every((value, k) => value >= matrix[i][k] - 1e-9)
        && other.some((value, k) => value > matrix[i][k] + 1e-9)));
    const rows = active.map((i) => matrix[i]);
    const rowTotals = rows.map((row) => row.reduce((sum, value) => sum + value, 0) / row.length);
    const columnTotals = Array(rows[0].length).fill(0);
    const counts = Array(rows.length).fill(0);
    for (let step = 0; step < iterations; step += 1) {
      let chosen = step % rows.length;
      for (let i = 1; i < rows.length; i += 1) {
        const candidate = (step + i) % rows.length;
        if (rowTotals[candidate] > rowTotals[chosen]) chosen = candidate;
      }
      counts[chosen] += 1;
      rows[chosen].forEach((value, column) => { columnTotals[column] += value; });
      let reply = 0;
      columnTotals.forEach((value, column) => {
        if (value < columnTotals[reply]) reply = column;
      });
      rows.forEach((row, i) => { rowTotals[i] += row[reply]; });
    }
    const probabilities = Array(matrix.length).fill(0);
    active.forEach((i, index) => { probabilities[i] = counts[index] / iterations; });
    return probabilities;
  };

  const counterWeight = (observations) => {
    const profile = profileFor("expert");
    const { samples = 0, advantage = 0 } = observations?.functionTactics ?? {};
    if (samples <= 0) return profile.opponent_weight;
    const skill = Math.max(0, Math.min(1, (advantage / samples - 0.05) / 0.45));
    const learned = profile.opponent_weight_min
      + skill * (profile.opponent_weight_max - profile.opponent_weight_min);
    const confidence = Math.min(1, samples / 16);
    return (1 - confidence) * profile.opponent_weight + confidence * learned;
  };

  const functionActions = (cards) => FUNCTION_CARDS.filter((card) => cards.includes(card)).flatMap((card) =>
      (card === "JK" ? [1] : [1, 2, 3, 4, 5]).map((position) => ({ card, position })));

  // Only immutable rule outcomes are shared between decisions, never learned scores.
  const functionDiffCache = new Map();
  const functionDiffs = (cpuBoard, playerBoard, actions, replies) => {
    const key = `${cpuBoard.join("")}|${playerBoard.join("")}|${actions.map((a) => a.card).join("")}|${replies.map((a) => a.card).join("")}`;
    if (functionDiffCache.has(key)) return functionDiffCache.get(key);
    const diffs = actions.map((action) => replies.map((reply) => {
      const resolved = resolveFunctionActions(cpuBoard, playerBoard, action, reply);
      return boardScoreDiff(resolved.cpuBoard, resolved.playerBoard);
    }));
    if (functionDiffCache.size >= 4096) functionDiffCache.delete(functionDiffCache.keys().next().value);
    functionDiffCache.set(key, diffs);
    return diffs;
  };

  const functionModel = (cpuCards, playerCards, observations) => {
    const actions = functionActions(cpuCards);
    const replies = functionActions(playerCards);
    const predicted = predictFunctionDistribution({
      playerCards: FUNCTION_CARDS.filter((card) => playerCards.includes(card)),
      difficulty: "expert", observations,
    });
    const prediction = replies.map((reply) => predicted.reduce((sum, { action, probability }) =>
      sum + (action.card === reply.card && (action.card === "JK" || action.position === reply.position)
        ? probability : 0), 0));
    return { actions, replies, prediction, weight: counterWeight(observations) };
  };

  const evaluateFunctions = (cpuBoard, playerBoard, cpuCards, cpuMajorScore, model, iterations) => {
    const { actions, replies, prediction, weight } = model;
    const profile = profileFor("expert");
    const diffs = functionDiffs(cpuBoard, playerBoard, actions, replies);
    const guaranteed = [];
    const matrix = actions.map((action, i) => {
      const outcomes = diffs[i].map((diff) => {
        const major = diff > 0 ? 1 : diff < 0 ? -1 : 0;
        const clinch = major > 0 && cpuMajorScore >= 1 ? 2 : 0;
        const reserve = cpuCards.length > 1 && !clinch
          ? profile.reserve_weight * policy.functionReserveValue[action.card] : 0;
        return 12 * major + diff + clinch - reserve;
      });
      const expected = outcomes.reduce((sum, value, j) => sum + value * prediction[j], 0);
      guaranteed.push(Math.min(...diffs[i]) > 0);
      return outcomes.map((value) => weight * value + (1 - weight) * expected);
    });
    const hasForcedWin = guaranteed.some(Boolean);
    const candidates = actions.map((_, i) => i).filter((i) => !hasForcedWin || guaranteed[i]);
    const selected = candidates.map((i) => matrix[i]);
    const probabilities = solveMatrix(selected, iterations, iterations >= 100);
    const value = Math.min(...replies.map((_, column) => selected.reduce((sum, row, i) =>
      sum + probabilities[i] * row[column], 0)));
    const distribution = candidates.map((i, index) => ({ action: actions[i], probability: probabilities[index] }))
      .filter((entry) => entry.probability > 0);
    return { distribution, value };
  };

  const expertFunctionDistribution = ({
    cpuBoard, playerBoard, cpuCards, playerCards, cpuMajorScore = 0, mode = "advanced",
  }) => {
    const model = functionModel(cpuCards, playerCards, observationStore.modes[mode] ?? observationStore.modes.advanced);
    if (!model.actions.length || !model.replies.length) return [];
    return evaluateFunctions(cpuBoard, playerBoard, cpuCards, cpuMajorScore,
      model, profileFor("expert").solver_iterations).distribution;
  };

  const permutations = (cards) => cards.length === 0 ? [[]] : cards.flatMap((card) =>
    permutations(cards.filter((value) => value !== card)).map((tail) => [card, ...tail]));

  const scoreAdvancedNumbers = (cpuCards, playerCards, roundIndex, observations, context) => {
    if (context.cpuBoard.length !== roundIndex || context.playerBoard.length !== roundIndex
      || [...context.cpuBoard, ...cpuCards].sort().join("") !== "12345"
      || [...context.playerBoard, ...playerCards].sort().join("") !== "12345") {
      throw new Error("Advanced search needs revealed prefixes and legal remaining cards");
    }
    const profile = profileFor("expert");
    const model = functionModel(context.cpuCards, context.playerCards, observations);
    const scenarios = permutations(playerCards).map((sequence) => {
      let remaining = playerCards;
      let probability = 1;
      sequence.forEach((card, i) => {
        probability *= predictNumberDistribution({ playerRemaining: remaining,
          roundIndex: roundIndex + i, difficulty: "expert", observations })[card];
        remaining = remaining.filter((value) => value !== card);
      });
      return { sequence, probability };
    });
    const sampled = new Map();
    for (let sample = 0; sample < profile.planning_samples; sample += 1) {
      const quantile = (sample + 0.5) / profile.planning_samples;
      let cumulative = 0;
      let selected = scenarios.at(-1).sequence;
      for (const { sequence, probability } of scenarios) {
        cumulative += probability;
        if (quantile < cumulative) { selected = sequence; break; }
      }
      const key = selected.join("");
      if (!sampled.has(key)) sampled.set(key, { sequence: selected, probability: 0 });
      sampled.get(key).probability += 1 / profile.planning_samples;
    }
    return cpuCards.map((first) => {
      const tails = permutations(cpuCards.filter((card) => card !== first));
      const width = Math.min(profile.planning_width, tails.length);
      const candidates = Array.from({ length: width }, (_, i) => tails[Math.floor((i + 0.5) * tails.length / width)]);
      const score = Math.max(...candidates.map((tail) => [...sampled.values()].reduce(
        (total, { sequence, probability }) => total + probability * evaluateFunctions(
          [...context.cpuBoard, first, ...tail], [...context.playerBoard, ...sequence],
          context.cpuCards, context.cpuMajorScore, model, profile.planning_iterations,
        ).value, 0)));
      return { action: first, score };
    });
  };

  const chooseFunctionAction = (state, rng = Math.random) => {
    if (state.difficulty === "expert") {
      const distribution = expertFunctionDistribution(state);
      const roll = rng();
      let cumulative = 0;
      for (const entry of distribution) {
        cumulative += entry.probability;
        if (roll < cumulative) return entry.action;
      }
      return distribution.at(-1)?.action ?? null;
    }
    return chooseFromScores(
      scoreFunctionActions(state),
      state.difficulty ?? "intermediate",
      17,
      rng,
      "function",
    );
  };

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

  const recordFunctionAction = (mode, card, position, context = null) => {
    const observations = observationStore.modes[mode] ?? observationStore.modes.advanced;
    if (context) {
      const { actions, replies } = functionModel(context.cpuCards, context.playerCards, null);
      const diffs = functionDiffs(context.cpuBoard, context.playerBoard, actions, replies);
      const cpuWeights = actions.map((action) => 1 / (context.cpuCards.length * (action.card === "JK" ? 1 : 5)));
      const values = replies.map((_, j) => diffs.reduce((sum, row, i) => sum + cpuWeights[i]
        * (-12 * Math.sign(row[j]) - row[j]), 0));
      const average = values.reduce((sum, value, j) => sum
        + value / (context.playerCards.length * (replies[j].card === "JK" ? 1 : 5)), 0);
      const spread = Math.max(...values.map((value) => Math.abs(value - average)));
      const evidence = observations.functionTactics;
      evidence.samples *= policy.observationDecay;
      evidence.advantage *= policy.observationDecay;
      if (spread > 1e-9) {
        const chosen = replies.findIndex((action) => action.card === card
          && action.position === (card === "JK" ? 1 : position));
        evidence.samples += 1;
        evidence.advantage += (values[chosen] - average) / spread;
      }
      const key = FUNCTION_CARDS.filter((value) => context.playerCards.includes(value)).join("|");
      const joint = observations.functionContexts[key] ??= {};
      Object.keys(joint).forEach((action) => { joint[action] *= policy.observationDecay; });
      const action = `${card}:${position}`;
      joint[action] = (joint[action] ?? 0) + 1;
    }
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
    expertFunctionDistribution,
    getOpponentCounterWeight: (mode = "advanced") => counterWeight(observationStore.modes[mode]),
    resolveFunctionActions,
    roundPayoff,
    recordNumberSequence,
    recordFunctionAction,
    clearObservations,
    getObservationSummary,
  });
})(window);

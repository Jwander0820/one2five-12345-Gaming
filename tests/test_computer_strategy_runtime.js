const assert = require("node:assert/strict");
const path = require("node:path");
const fixtures = require("./expert_strategy_fixtures.json");

global.window = global;
const memory = new Map();
global.localStorage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
  removeItem: (key) => memory.delete(key),
};

require(path.resolve(__dirname, "../frontend/assets/generated/computer-strategy-policy.js"));
require(path.resolve(__dirname, "../frontend/computer_strategy.js"));

assert.equal(global.ComputerStrategy.available, true);
assert.equal(global.ComputerStrategy.roundPayoff(1, 5), 1);
assert.equal(global.ComputerStrategy.roundPayoff(5, 1), -1);

const chosen = global.ComputerStrategy.chooseNumberCard(
  {
    cpuRemaining: [1, 3, 5],
    playerRemaining: [2, 4, 5],
    scoreDiff: -1,
    roundIndex: 2,
    difficulty: "expert",
    mode: "basic",
  },
  () => 0.5,
);
assert.ok([1, 3, 5].includes(chosen));

const resolved = global.ComputerStrategy.resolveFunctionActions(
  [1, 2, 3, 4, 5],
  [5, 4, 3, 2, 1],
  { card: "K", position: 1 },
  { card: "Q", position: 1 },
);
assert.deepEqual(resolved.cpuBoard, [4, 2, 3, 4, 5]);
assert.deepEqual(resolved.playerBoard, [1, 5, 3, 2, 1]);

global.ComputerStrategy.recordNumberSequence("basic", [1, 2, 3, 4, 5]);
assert.equal(global.ComputerStrategy.getObservationSummary().basic, 1);
global.ComputerStrategy.clearObservations();
assert.equal(global.ComputerStrategy.getObservationSummary().basic, 0);

const strategy = global.ComputerStrategy;
for (const sequence of fixtures.numberHistory) {
  strategy.recordNumberSequence("basic", sequence);
  strategy.recordNumberSequence("advanced", sequence);
}
const endgame = {
  cpuRemaining: [1, 3, 5], playerRemaining: [3, 4, 5],
  scoreDiff: 0, roundIndex: 2, difficulty: "expert", mode: "basic",
};
for (const roll of [0, 0.1, 0.5, 0.999999]) {
  assert.equal(strategy.chooseNumberCard(endgame, () => roll), 3);
}
const forcedWin = {
  cpuBoard: [1, 2, 3, 4, 5], playerBoard: [1, 4, 2, 5, 3],
  cpuCards: ["J", "K", "JK"], playerCards: ["J"],
  cpuMajorScore: 1, difficulty: "expert",
};
for (const roll of [0, 0.1, 0.5, 0.999999]) {
  assert.deepEqual(strategy.chooseFunctionAction(forcedWin, () => roll), { card: "K", position: 4 });
}

// Both runtimes verify the same fixtures without spawning another runtime.
for (const [card, position] of fixtures.functionHistory) {
  strategy.recordFunctionAction("advanced", card, position);
}
fixtures.numbers.forEach(({ state, scores }) => {
  for (const { action, score } of strategy.scoreNumberActions(state)) {
    assert.ok(Math.abs(score - scores[action]) < 1e-9);
  }
});
fixtures.advancedNumbers.forEach(({ state, scores }) => {
  const beforeState = JSON.stringify(state);
  const beforeMemory = JSON.stringify([...memory]);
  for (const { action, score } of strategy.scoreNumberActions(state)) {
    assert.ok(Math.abs(score - scores[action]) < 1e-9, `advanced number ${action}`);
  }
  assert.equal(JSON.stringify(state), beforeState);
  assert.equal(JSON.stringify([...memory]), beforeMemory);
});
fixtures.functions.forEach(({ state, distribution: reference }) => {
  const distribution = strategy.expertFunctionDistribution(state);
  assert.ok(Math.abs(distribution.reduce((sum, entry) => sum + entry.probability, 0) - 1) < 1e-9);
  const keyed = (entries) => Object.fromEntries(entries.map(({ action, probability }) =>
    [`${action.card}:${action.position}`, probability]));
  const actual = keyed(distribution);
  const expected = keyed(reference);
  for (const key of new Set([...Object.keys(actual), ...Object.keys(expected)])) {
    assert.ok(Math.abs((actual[key] ?? 0) - (expected[key] ?? 0)) < 1e-9, key);
  }
});
strategy.clearObservations();

const tacticalContext = {
  cpuBoard: [3, 5, 4, 2, 1], playerBoard: [1, 2, 3, 4, 5],
  cpuCards: ["J", "Q", "K", "JK"], playerCards: ["J", "Q", "K", "JK"],
};
for (let i = 0; i < 100; i += 1) strategy.recordFunctionAction("advanced", "JK", 1, tacticalContext);
assert.ok(strategy.getOpponentCounterWeight() > 0.6);
// Reload persisted evidence and ensure a legacy store can still be read.
const runtimePath = path.resolve(__dirname, "../frontend/computer_strategy.js");
delete require.cache[runtimePath];
require(runtimePath);
assert.ok(global.ComputerStrategy.getOpponentCounterWeight() > 0.6);
global.ComputerStrategy.clearObservations();
const legacy = {
  schemaVersion: global.COMPUTER_STRATEGY_POLICY.schemaVersion,
  modes: { advanced: { completedSequences: 7, numberCounts: [] } },
};
memory.set(`one2five.strategy.v${legacy.schemaVersion}`, JSON.stringify(legacy));
delete require.cache[runtimePath];
require(runtimePath);
assert.equal(global.ComputerStrategy.getObservationSummary().advanced, 7);
assert.equal(global.ComputerStrategy.getOpponentCounterWeight(), 0.35);
global.ComputerStrategy.clearObservations();

console.log("computer strategy runtime checks passed");

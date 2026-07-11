const assert = require("node:assert/strict");
const path = require("node:path");

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

console.log("computer strategy runtime checks passed");

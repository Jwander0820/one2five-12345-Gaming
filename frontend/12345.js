const TOTAL_ROUNDS = 5;
const MODE = {
  BASIC: "basic",
  ADVANCED: "advanced",
};
const CARD_LABELS = ["J", "Q", "K", "JK"];

const state = {
  mode: MODE.BASIC,
  cpuDeck: [],
  playerDeck: [1, 2, 3, 4, 5],
  cpuHistory: [],
  playerHistory: [],
  scoreboard: {
    cpu: { win: 0, lose: 0, draw: 0 },
    player: { win: 0, lose: 0, draw: 0 },
  },
  advanced: {
    majorRound: 1,
    majorScore: { cpu: 0, player: 0, draw: 0 },
    minorScore: { cpu: 0, player: 0, draw: 0 },
    cpuCards: [...CARD_LABELS],
    playerCards: [...CARD_LABELS],
    awaitingNext: false,
    matchFinished: false,
  },
};

const cpuArea = document.getElementById("cpu-area");
const playerArea = document.getElementById("player-area");
const cpuFuncRow = document.getElementById("cpu-func-row");
const playerFuncRow = document.getElementById("player-func-row");
const advancedBoardTools = document.getElementById("advanced-board-tools");
const roundOutcomeRow = document.getElementById("round-outcome-row");
const playerHand = document.getElementById("player-hand");
const roundTableBody = document.querySelector("#round-table tbody");
const finalResult = document.getElementById("final-result");
const hint = document.getElementById("hint");
const gameTitle = document.getElementById("game-title");
const gameSubtitle = document.getElementById("game-subtitle");
const rulesList = document.getElementById("rules-list");
const roundProgress = document.getElementById("round-progress");

const advancedControls = document.getElementById("advanced-controls");
const advancedStatus = document.getElementById("advanced-status");
const cardsLeft = document.getElementById("cards-left");
const majorRoundPill = document.getElementById("major-round-pill");
const majorScorePill = document.getElementById("major-score-pill");
const minorScorePill = document.getElementById("minor-score-pill");
const playerCardSelect = document.getElementById("player-card-select");
const playerPosSelect = document.getElementById("player-pos-select");
const resolveAdvancedBtn = document.getElementById("resolve-advanced-btn");
const nextMajorBtn = document.getElementById("next-major-btn");
const effectLog = document.getElementById("effect-log");
const beforeCpu = document.getElementById("before-cpu");
const beforePlayer = document.getElementById("before-player");
const afterCpu = document.getElementById("after-cpu");
const afterPlayer = document.getElementById("after-player");

const modeBasicBtn = document.getElementById("mode-basic");
const modeAdvancedBtn = document.getElementById("mode-advanced");

const stepChooseMode = document.getElementById("step-choose-mode");
const stepPlayFive = document.getElementById("step-play-five");
const stepResolveCard = document.getElementById("step-resolve-card");

const cardText = (card) => (card === "JK" ? "JOKER" : card);

const shuffle = (list) => {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const compareCards = (cpu, player) => {
  if (cpu === player) return "DRAW";
  if ((player === 1 && cpu === 5) || (player === 2 && cpu === 4)) return "WIN";
  if ((cpu === 1 && player === 5) || (cpu === 2 && player === 4)) return "LOSE";
  return player > cpu ? "WIN" : "LOSE";
};

const applyJQ = (deck, card, pos) => {
  const i = pos - 1;
  if (card === "J") {
    const target = i === 0 ? deck.length - 1 : i - 1;
    [deck[i], deck[target]] = [deck[target], deck[i]];
  }
  if (card === "Q") {
    const target = i === deck.length - 1 ? 0 : i + 1;
    [deck[i], deck[target]] = [deck[target], deck[i]];
  }
};

const applyK = (playerDeck, cpuDeck, pos) => {
  const i = pos - 1;
  [playerDeck[i], cpuDeck[i]] = [cpuDeck[i], playerDeck[i]];
};

const applyJoker = (playerDeck, cpuDeck) => {
  const playerCopy = [...playerDeck];
  playerDeck.splice(0, playerDeck.length, ...cpuDeck);
  cpuDeck.splice(0, cpuDeck.length, ...playerCopy);
};


const resultLabel = (result) => {
  if (result === "WIN") return "WIN";
  if (result === "LOSE") return "LOSE";
  return "DRAW";
};

const renderOutcomeRow = (cpuBoard, playerBoard) => {
  roundOutcomeRow.innerHTML = "";
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const chip = document.createElement("div");
    chip.className = "outcome-chip";
    if (playerBoard[i] !== undefined && cpuBoard[i] !== undefined) {
      const r = compareCards(cpuBoard[i], playerBoard[i]);
      chip.textContent = resultLabel(r);
      chip.classList.add(r.toLowerCase());
    } else {
      chip.textContent = "-";
    }
    roundOutcomeRow.appendChild(chip);
  }
};
const createSlot = (className = "slot") => {
  const slot = document.createElement("div");
  slot.className = className;
  return slot;
};

const buildFunctionRow = () => {
  cpuFuncRow.innerHTML = "";
  playerFuncRow.innerHTML = "";
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    cpuFuncRow.appendChild(createSlot("func-slot"));
    playerFuncRow.appendChild(createSlot("func-slot"));
  }
};

const clearFunctionPlacement = () => {
  buildFunctionRow();
};

const renderFunctionPlacement = (cpuCard, cpuPos, playerCard, playerPos) => {
  clearFunctionPlacement();
  const cpuSlots = cpuFuncRow.querySelectorAll(".func-slot");
  const playerSlots = playerFuncRow.querySelectorAll(".func-slot");
  cpuSlots[cpuPos - 1].textContent = cardText(cpuCard);
  cpuSlots[cpuPos - 1].classList.add("active");
  playerSlots[playerPos - 1].textContent = cardText(playerCard);
  playerSlots[playerPos - 1].classList.add("active");
};

const buildSlots = () => {
  cpuArea.innerHTML = "";
  playerArea.innerHTML = "";
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    cpuArea.appendChild(createSlot());
    playerArea.appendChild(createSlot());
  }
};

const renderBoardToArea = (cpuBoard, playerBoard) => {
  const cpuSlots = cpuArea.querySelectorAll(".slot");
  const playerSlots = playerArea.querySelectorAll(".slot");
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    cpuSlots[i].textContent = cpuBoard[i];
    playerSlots[i].textContent = playerBoard[i];
  }
};

const renderMiniRow = (el, arr) => {
  el.innerHTML = "";
  arr.forEach((n) => {
    const chip = document.createElement("span");
    chip.className = "mini-chip";
    chip.textContent = n;
    el.appendChild(chip);
  });
};

const clearEffectPanel = () => {
  effectLog.innerHTML = "<li>尚未執行功能卡效果。</li>";
  [beforeCpu, beforePlayer, afterCpu, afterPlayer].forEach((el) => {
    el.innerHTML = "";
  });
};

const renderEffectPanel = ({ logs, beforeCpuBoard, beforePlayerBoard, afterCpuBoard, afterPlayerBoard }) => {
  effectLog.innerHTML = "";
  logs.forEach((msg) => {
    const li = document.createElement("li");
    li.textContent = msg;
    effectLog.appendChild(li);
  });
  renderMiniRow(beforeCpu, beforeCpuBoard);
  renderMiniRow(beforePlayer, beforePlayerBoard);
  renderMiniRow(afterCpu, afterCpuBoard);
  renderMiniRow(afterPlayer, afterPlayerBoard);
};

const setStepState = (el, { active = false, done = false }) => {
  el.classList.toggle("active", active);
  el.classList.toggle("done", done);
};

const updateGuide = () => {
  const finishedFive = state.playerHistory.length === TOTAL_ROUNDS;
  setStepState(stepChooseMode, { active: false, done: true });
  setStepState(stepPlayFive, { active: !finishedFive, done: finishedFive });

  if (state.mode === MODE.BASIC) {
    setStepState(stepResolveCard, { active: false, done: true });
  } else {
    setStepState(stepResolveCard, {
      active: finishedFive && !state.advanced.awaitingNext,
      done: state.advanced.awaitingNext || !finishedFive,
    });
  }
};

const updateRoundProgress = () => {
  roundProgress.textContent = `回合 ${state.playerHistory.length} / ${TOTAL_ROUNDS}`;
};

const updateScoreboardView = () => {
  ["win", "lose", "draw"].forEach((result) => {
    document.getElementById(`cpu-${result}`).textContent = state.scoreboard.cpu[result];
    document.getElementById(`player-${result}`).textContent = state.scoreboard.player[result];
  });
};

const renderPlayerHand = () => {
  playerHand.innerHTML = "";
  state.playerDeck.forEach((value) => {
    const card = document.createElement("button");
    card.className = "card";
    card.type = "button";
    card.draggable = true;
    card.dataset.value = String(value);
    card.textContent = value;

    card.addEventListener("click", () => playRound(value));
    card.addEventListener("dragstart", (event) => {
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", String(value));
    });
    card.addEventListener("dragend", () => card.classList.remove("dragging"));

    playerHand.appendChild(card);
  });
};

const pushCardToArea = (area, value, roundIndex) => {
  const slots = area.querySelectorAll(".slot");
  slots[roundIndex].textContent = value;
};

const renderRoundRow = (majorRound, roundIndex, cpuValue, playerValue, result) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${state.mode === MODE.ADVANCED ? `${majorRound}-${roundIndex + 1}` : roundIndex + 1}</td>
    <td>${cpuValue}</td>
    <td>${playerValue}</td>
    <td>${result}</td>
  `;
  roundTableBody.appendChild(tr);
};

const resetRound = () => {
  state.cpuDeck = shuffle([1, 2, 3, 4, 5]);
  state.playerDeck = [1, 2, 3, 4, 5];
  state.cpuHistory = [];
  state.playerHistory = [];
  state.advanced.awaitingNext = false;
  buildSlots();
  clearFunctionPlacement();
  clearEffectPanel();
  renderOutcomeRow([], []);
  renderPlayerHand();
  renderOutcomeRow(state.cpuHistory, state.playerHistory);
  updateRoundProgress();
  updateGuide();
};

const renderAdvancedCardOptions = () => {
  playerCardSelect.innerHTML = "";
  state.advanced.playerCards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card;
    option.textContent = cardText(card);
    playerCardSelect.appendChild(option);
  });

  resolveAdvancedBtn.disabled =
    state.playerHistory.length !== TOTAL_ROUNDS ||
    state.advanced.playerCards.length === 0 ||
    state.advanced.awaitingNext ||
    state.advanced.matchFinished;
};

const updateAdvancedDashboard = () => {
  const major = state.advanced.majorScore;
  const minor = state.advanced.minorScore;

  majorRoundPill.textContent = `大局 ${state.advanced.majorRound} / 3+`;
  majorScorePill.textContent = `大局比數 玩家 ${major.player} : ${major.cpu} 電腦`;
  minorScorePill.textContent = `小分 玩家 ${minor.player} : ${minor.cpu} 電腦`;

  const label = state.advanced.playerCards.map((card) => cardText(card)).join(", ");
  cardsLeft.textContent = `剩餘功能卡：${label || "（無）"}`;
};

const countBoardResult = (cpuBoard, playerBoard) => {
  let playerWins = 0;
  let cpuWins = 0;
  let draws = 0;

  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const result = compareCards(cpuBoard[i], playerBoard[i]);
    if (result === "WIN") playerWins += 1;
    if (result === "LOSE") cpuWins += 1;
    if (result === "DRAW") draws += 1;
  }

  return { playerWins, cpuWins, draws };
};

const advancedShouldEnd = () => {
  const { majorScore, majorRound } = state.advanced;
  const doneByScore = majorScore.player >= 2 || majorScore.cpu >= 2;
  const tieAfterThree = majorRound >= 3 && majorScore.player === majorScore.cpu;
  return doneByScore || (majorRound >= 3 && !tieAfterThree) || majorRound === 4;
};

const finalizeAdvancedMatch = () => {
  const { majorScore, minorScore } = state.advanced;
  state.advanced.matchFinished = true;

  if (majorScore.player > majorScore.cpu) {
    finalResult.textContent = `進階模式結束：玩家勝利（大局 ${majorScore.player}:${majorScore.cpu}）`;
    finalResult.className = "final-result win";
    state.scoreboard.player.win += 1;
    state.scoreboard.cpu.lose += 1;
  } else if (majorScore.player < majorScore.cpu) {
    finalResult.textContent = `進階模式結束：電腦勝利（大局 ${majorScore.cpu}:${majorScore.player}）`;
    finalResult.className = "final-result lose";
    state.scoreboard.player.lose += 1;
    state.scoreboard.cpu.win += 1;
  } else if (minorScore.player > minorScore.cpu) {
    finalResult.textContent = `進階模式結束：玩家以小分勝（${minorScore.player}:${minorScore.cpu}）`;
    finalResult.className = "final-result win";
    state.scoreboard.player.win += 1;
    state.scoreboard.cpu.lose += 1;
  } else if (minorScore.player < minorScore.cpu) {
    finalResult.textContent = `進階模式結束：電腦以小分勝（${minorScore.cpu}:${minorScore.player}）`;
    finalResult.className = "final-result lose";
    state.scoreboard.player.lose += 1;
    state.scoreboard.cpu.win += 1;
  } else {
    finalResult.textContent = "進階模式結束：完全平手";
    finalResult.className = "final-result draw";
    state.scoreboard.player.draw += 1;
    state.scoreboard.cpu.draw += 1;
  }

  hint.textContent = "本場進階對局已完成，可點 Restart 重開。";
  nextMajorBtn.classList.add("hidden");
  resolveAdvancedBtn.disabled = true;
  updateScoreboardView();
};

const startNextMajorRound = () => {
  if (!state.advanced.awaitingNext || state.advanced.matchFinished) return;

  state.advanced.majorRound += 1;
  state.advanced.awaitingNext = false;

  hint.textContent = `進入第 ${state.advanced.majorRound} 大局：請先打完 5 回合，再擺放功能卡。`;
  finalResult.textContent = `進階進行中：大局 玩家 ${state.advanced.majorScore.player} : 電腦 ${state.advanced.majorScore.cpu}`;
  finalResult.className = "final-result";

  nextMajorBtn.classList.add("hidden");
  resetRound();
  renderAdvancedCardOptions();
  updateAdvancedDashboard();
};

const settleAdvancedMajorRound = () => {
  if (
    state.playerHistory.length < TOTAL_ROUNDS ||
    state.advanced.playerCards.length === 0 ||
    state.advanced.awaitingNext ||
    state.advanced.matchFinished
  ) {
    return;
  }

  const playerCard = playerCardSelect.value;
  const playerPos = Number(playerPosSelect.value);
  if (!state.advanced.playerCards.includes(playerCard)) return;

  const cpuCard = state.advanced.cpuCards[Math.floor(Math.random() * state.advanced.cpuCards.length)];
  const cpuPos = Math.floor(Math.random() * TOTAL_ROUNDS) + 1;

  const playerBoard = [...state.playerHistory];
  const cpuBoard = [...state.cpuHistory];
  const beforePlayerBoard = [...playerBoard];
  const beforeCpuBoard = [...cpuBoard];
  const logs = [
    `玩家將 ${cardText(playerCard)} 放在位置 ${playerPos}，電腦將 ${cardText(cpuCard)} 放在位置 ${cpuPos}。`,
  ];

  renderFunctionPlacement(cpuCard, cpuPos, playerCard, playerPos);

  if (playerCard === "J" || playerCard === "Q") {
    applyJQ(playerBoard, playerCard, playerPos);
    logs.push(`玩家 ${cardText(playerCard)} 先觸發，玩家盤面調整完成。`);
  }
  if (cpuCard === "J" || cpuCard === "Q") {
    applyJQ(cpuBoard, cpuCard, cpuPos);
    logs.push(`電腦 ${cardText(cpuCard)} 觸發，電腦盤面調整完成。`);
  }
  if (playerCard === "K") {
    applyK(playerBoard, cpuBoard, playerPos);
    logs.push(`玩家 K 觸發，交換雙方位置 ${playerPos}。`);
  }
  if (cpuCard === "K") {
    applyK(playerBoard, cpuBoard, cpuPos);
    logs.push(`電腦 K 觸發，交換雙方位置 ${cpuPos}。`);
  }
  if (playerCard === "JK") {
    applyJoker(playerBoard, cpuBoard);
    logs.push("玩家 JOKER 觸發，雙方整體盤面互換。");
  }
  if (cpuCard === "JK") {
    applyJoker(playerBoard, cpuBoard);
    logs.push("電腦 JOKER 觸發，雙方整體盤面互換。");
  }

  renderBoardToArea(cpuBoard, playerBoard);
  renderOutcomeRow(cpuBoard, playerBoard);
  renderEffectPanel({ logs, beforeCpuBoard, beforePlayerBoard, afterCpuBoard: cpuBoard, afterPlayerBoard: playerBoard });

  const { playerWins, cpuWins, draws } = countBoardResult(cpuBoard, playerBoard);
  state.advanced.minorScore.player += playerWins;
  state.advanced.minorScore.cpu += cpuWins;
  state.advanced.minorScore.draw += draws;

  if (playerWins > cpuWins) state.advanced.majorScore.player += 1;
  else if (playerWins < cpuWins) state.advanced.majorScore.cpu += 1;
  else state.advanced.majorScore.draw += 1;

  state.advanced.playerCards = state.advanced.playerCards.filter((card) => card !== playerCard);
  state.advanced.cpuCards = state.advanced.cpuCards.filter((card) => card !== cpuCard);

  state.advanced.awaitingNext = true;

  advancedStatus.textContent = `第 ${state.advanced.majorRound} 大局：玩家 ${cardText(playerCard)}(${playerPos})、電腦 ${cardText(cpuCard)}(${cpuPos})。小局 ${playerWins}:${cpuWins}（和局 ${draws}）。`;

  if (playerWins > cpuWins) {
    finalResult.textContent = `第 ${state.advanced.majorRound} 大局結果：玩家勝 (${playerWins}:${cpuWins})`;
    finalResult.className = "final-result win";
  } else if (playerWins < cpuWins) {
    finalResult.textContent = `第 ${state.advanced.majorRound} 大局結果：電腦勝 (${cpuWins}:${playerWins})`;
    finalResult.className = "final-result lose";
  } else {
    finalResult.textContent = `第 ${state.advanced.majorRound} 大局結果：平手 (${playerWins}:${cpuWins})`;
    finalResult.className = "final-result draw";
  }

  updateAdvancedDashboard();
  updateGuide();
  renderAdvancedCardOptions();

  if (advancedShouldEnd()) {
    finalizeAdvancedMatch();
  } else {
    hint.textContent = "此大局效果與結果已展示。請按「下一大局」繼續。";
    nextMajorBtn.classList.remove("hidden");
  }
};

const finalizeBasicGame = () => {
  const { playerWins, cpuWins } = countBoardResult(state.cpuHistory, state.playerHistory);

  if (playerWins > cpuWins) {
    finalResult.textContent = `本局結束：玩家勝利（${playerWins}:${cpuWins}）`;
    finalResult.className = "final-result win";
    state.scoreboard.player.win += 1;
    state.scoreboard.cpu.lose += 1;
  } else if (playerWins < cpuWins) {
    finalResult.textContent = `本局結束：電腦勝利（${cpuWins}:${playerWins}）`;
    finalResult.className = "final-result lose";
    state.scoreboard.player.lose += 1;
    state.scoreboard.cpu.win += 1;
  } else {
    finalResult.textContent = `本局結束：平手（${playerWins}:${cpuWins}）`;
    finalResult.className = "final-result draw";
    state.scoreboard.player.draw += 1;
    state.scoreboard.cpu.draw += 1;
  }

  hint.textContent = "本局已完成，點擊 Restart 開始下一局。";
  updateScoreboardView();
};

const playRound = (playerValue) => {
  if (state.mode === MODE.ADVANCED && (state.advanced.awaitingNext || state.advanced.matchFinished)) return;
  if (!state.playerDeck.includes(playerValue) || state.playerHistory.length >= TOTAL_ROUNDS) return;

  const roundIndex = state.playerHistory.length;
  const cpuValue = state.cpuDeck[roundIndex];

  state.playerHistory.push(playerValue);
  state.cpuHistory.push(cpuValue);
  state.playerDeck = state.playerDeck.filter((v) => v !== playerValue);

  pushCardToArea(cpuArea, cpuValue, roundIndex);
  pushCardToArea(playerArea, playerValue, roundIndex);

  const roundResult = compareCards(cpuValue, playerValue);
  renderRoundRow(state.advanced.majorRound, roundIndex, cpuValue, playerValue, roundResult);

  renderPlayerHand();
  renderOutcomeRow(state.cpuHistory, state.playerHistory);
  updateRoundProgress();
  updateGuide();

  if (state.playerHistory.length === TOTAL_ROUNDS) {
    if (state.mode === MODE.BASIC) {
      finalizeBasicGame();
    } else {
      hint.textContent = "5 回合完成，請擺放功能卡並執行效果（會顯示前後盤面與流程）。";
      resolveAdvancedBtn.disabled = false;
    }
  } else {
    hint.textContent = `已完成第 ${state.playerHistory.length} 回合，請繼續出牌。`;
  }
};

const resetMatch = () => {
  roundTableBody.innerHTML = "";
  finalResult.textContent = "尚未完成本局。";
  finalResult.className = "final-result";
  nextMajorBtn.classList.add("hidden");

  if (state.mode === MODE.ADVANCED) {
    state.advanced.majorRound = 1;
    state.advanced.majorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.minorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.cpuCards = [...CARD_LABELS];
    state.advanced.playerCards = [...CARD_LABELS];
    state.advanced.awaitingNext = false;
    state.advanced.matchFinished = false;
    advancedStatus.textContent = "進階模式：先完成 5 回合，再擺放功能卡；系統會逐步展示效果流程與前後盤面。";
    hint.textContent = "進階模式：先完成第 1 大局的 5 回合。";
    renderAdvancedCardOptions();
    updateAdvancedDashboard();
  } else {
    hint.textContent = "拖曳或點擊下方玩家卡牌開始出牌。";
    advancedStatus.textContent = "";
  }

  resetRound();
};

const setMode = (mode) => {
  state.mode = mode;
  const isAdvanced = mode === MODE.ADVANCED;

  modeBasicBtn.classList.toggle("active", !isAdvanced);
  modeAdvancedBtn.classList.toggle("active", isAdvanced);
  advancedControls.classList.toggle("hidden", !isAdvanced);
  advancedBoardTools.classList.toggle("hidden", !isAdvanced);

  if (isAdvanced) {
    gameTitle.textContent = "1-2-3-4-5 遊戲（進階規則）";
    gameSubtitle.innerHTML = "可視化功能卡擺放：<strong>J / Q / K / JOKER</strong>，執行後會保留結果畫面，方便觀察策略。";
    rulesList.innerHTML = `
      <li>每大局先進行 5 回合出牌（不可重複）。</li>
      <li>雙方把功能卡擺放到指定位置，再執行效果。</li>
      <li>執行後會展示「效果流程 + 前後盤面」，按「下一大局」才繼續。</li>
    `;
  } else {
    gameTitle.textContent = "1-2-3-4-5 遊戲（基本規則）";
    gameSubtitle.innerHTML = "大數字勝，例外：<strong>1 勝 5、2 勝 4</strong>。每張牌只能出一次。";
    rulesList.innerHTML = `
      <li>每回合從玩家手牌出 1 張。</li>
      <li>共 5 回合，系統會顯示 WIN / LOSE / DRAW。</li>
      <li>按 Restart 可快速再開一局。</li>
    `;
  }

  resetMatch();
};

playerArea.addEventListener("dragover", (event) => {
  event.preventDefault();
});

playerArea.addEventListener("drop", (event) => {
  event.preventDefault();
  const value = Number(event.dataTransfer.getData("text/plain"));
  playRound(value);
});

document.getElementById("restart-btn").addEventListener("click", resetMatch);
resolveAdvancedBtn.addEventListener("click", settleAdvancedMajorRound);
nextMajorBtn.addEventListener("click", startNextMajorRound);
modeBasicBtn.addEventListener("click", () => setMode(MODE.BASIC));
modeAdvancedBtn.addEventListener("click", () => setMode(MODE.ADVANCED));

setMode(MODE.BASIC);
updateScoreboardView();

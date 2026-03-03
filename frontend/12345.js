const TOTAL_ROUNDS = 5;
const MODE = {
  BASIC: "basic",
  ADVANCED: "advanced",
};
const CARD_LABELS = ["J", "Q", "K", "JK"];

const integrations = {
  onRoundComplete: (_payload) => {},
  onMatchComplete: (_payload) => {},
};

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
  },
};

const cpuArea = document.getElementById("cpu-area");
const playerArea = document.getElementById("player-area");
const playerHand = document.getElementById("player-hand");
const roundTableBody = document.querySelector("#round-table tbody");
const finalResult = document.getElementById("final-result");
const hint = document.getElementById("hint");
const gameTitle = document.getElementById("game-title");
const gameSubtitle = document.getElementById("game-subtitle");
const rulesList = document.getElementById("rules-list");
const advancedControls = document.getElementById("advanced-controls");
const advancedStatus = document.getElementById("advanced-status");
const playerCardSelect = document.getElementById("player-card-select");
const playerPosSelect = document.getElementById("player-pos-select");
const resolveAdvancedBtn = document.getElementById("resolve-advanced-btn");
const modeBasicBtn = document.getElementById("mode-basic");
const modeAdvancedBtn = document.getElementById("mode-advanced");

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

const createSlot = () => {
  const slot = document.createElement("div");
  slot.className = "slot";
  return slot;
};

const buildSlots = () => {
  cpuArea.innerHTML = "";
  playerArea.innerHTML = "";
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    cpuArea.appendChild(createSlot());
    playerArea.appendChild(createSlot());
  }
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
  buildSlots();
  renderPlayerHand();
};

const renderAdvancedCardOptions = () => {
  playerCardSelect.innerHTML = "";
  state.advanced.playerCards.forEach((card) => {
    const option = document.createElement("option");
    option.value = card;
    option.textContent = card === "JK" ? "JOKER" : card;
    playerCardSelect.appendChild(option);
  });
};

const settleAdvancedMajorRound = () => {
  if (state.playerHistory.length < TOTAL_ROUNDS) return;
  const playerCard = playerCardSelect.value;
  const playerPos = Number(playerPosSelect.value);
  if (!state.advanced.playerCards.includes(playerCard)) return;

  const cpuCard = state.advanced.cpuCards[Math.floor(Math.random() * state.advanced.cpuCards.length)];
  const cpuPos = Math.floor(Math.random() * 5) + 1;

  const playerBoard = [...state.playerHistory];
  const cpuBoard = [...state.cpuHistory];

  if (playerCard === "J" || playerCard === "Q") applyJQ(playerBoard, playerCard, playerPos);
  if (cpuCard === "J" || cpuCard === "Q") applyJQ(cpuBoard, cpuCard, cpuPos);
  if (playerCard === "K") applyK(playerBoard, cpuBoard, playerPos);
  if (cpuCard === "K") applyK(playerBoard, cpuBoard, cpuPos);
  if (playerCard === "JK") applyJoker(playerBoard, cpuBoard);
  if (cpuCard === "JK") applyJoker(playerBoard, cpuBoard);

  let playerWins = 0;
  let cpuWins = 0;
  let draws = 0;
  for (let i = 0; i < 5; i += 1) {
    const result = compareCards(cpuBoard[i], playerBoard[i]);
    if (result === "WIN") playerWins += 1;
    if (result === "LOSE") cpuWins += 1;
    if (result === "DRAW") draws += 1;
  }

  state.advanced.minorScore.player += playerWins;
  state.advanced.minorScore.cpu += cpuWins;
  state.advanced.minorScore.draw += draws;

  if (playerWins > cpuWins) state.advanced.majorScore.player += 1;
  else if (playerWins < cpuWins) state.advanced.majorScore.cpu += 1;
  else state.advanced.majorScore.draw += 1;

  state.advanced.playerCards = state.advanced.playerCards.filter((c) => c !== playerCard);
  state.advanced.cpuCards = state.advanced.cpuCards.filter((c) => c !== cpuCard);

  advancedStatus.textContent = `第 ${state.advanced.majorRound} 大局：玩家 ${playerCard}(${playerPos}) / 電腦 ${cpuCard}(${cpuPos})，小局 ${playerWins}:${cpuWins}`;

  const isAfterThird = state.advanced.majorRound >= 3;
  const major = state.advanced.majorScore;
  const doneByScore = major.player >= 2 || major.cpu >= 2;
  const tieNeedFourth = isAfterThird && major.player === major.cpu;

  if (doneByScore || (isAfterThird && !tieNeedFourth) || state.advanced.majorRound === 4) {
    if (major.player > major.cpu) {
      finalResult.textContent = `進階模式結束：玩家勝利（大局 ${major.player}:${major.cpu}）`;
      finalResult.className = "final-result win";
      state.scoreboard.player.win += 1;
      state.scoreboard.cpu.lose += 1;
    } else if (major.player < major.cpu) {
      finalResult.textContent = `進階模式結束：電腦勝利（大局 ${major.cpu}:${major.player}）`;
      finalResult.className = "final-result lose";
      state.scoreboard.player.lose += 1;
      state.scoreboard.cpu.win += 1;
    } else if (state.advanced.minorScore.player > state.advanced.minorScore.cpu) {
      finalResult.textContent = `進階模式結束：玩家以小分勝（${state.advanced.minorScore.player}:${state.advanced.minorScore.cpu}）`;
      finalResult.className = "final-result win";
      state.scoreboard.player.win += 1;
      state.scoreboard.cpu.lose += 1;
    } else if (state.advanced.minorScore.player < state.advanced.minorScore.cpu) {
      finalResult.textContent = `進階模式結束：電腦以小分勝（${state.advanced.minorScore.cpu}:${state.advanced.minorScore.player}）`;
      finalResult.className = "final-result lose";
      state.scoreboard.player.lose += 1;
      state.scoreboard.cpu.win += 1;
    } else {
      finalResult.textContent = "進階模式結束：完全平手";
      finalResult.className = "final-result draw";
      state.scoreboard.player.draw += 1;
      state.scoreboard.cpu.draw += 1;
    }
    hint.textContent = "本局已完成，點擊 Restart 開始下一局。";
    updateScoreboardView();
    integrations.onMatchComplete({ ...state.advanced });
    return;
  }

  state.advanced.majorRound += 1;
  hint.textContent = `進入第 ${state.advanced.majorRound} 大局，請完成 5 回合出牌。`;
  finalResult.textContent = `進階進行中：大局 玩家 ${major.player} : 電腦 ${major.cpu}`;
  finalResult.className = "final-result";
  resetRound();
  renderAdvancedCardOptions();
};

const finalizeBasicGame = () => {
  const wins = state.playerHistory.filter((_, i) => compareCards(state.cpuHistory[i], state.playerHistory[i]) === "WIN").length;
  const loses = state.playerHistory.filter((_, i) => compareCards(state.cpuHistory[i], state.playerHistory[i]) === "LOSE").length;

  if (wins > loses) {
    finalResult.textContent = `本局結束：玩家勝利（${wins}:${loses}）`;
    finalResult.className = "final-result win";
    state.scoreboard.player.win += 1;
    state.scoreboard.cpu.lose += 1;
  } else if (wins < loses) {
    finalResult.textContent = `本局結束：電腦勝利（${loses}:${wins}）`;
    finalResult.className = "final-result lose";
    state.scoreboard.player.lose += 1;
    state.scoreboard.cpu.win += 1;
  } else {
    finalResult.textContent = `本局結束：平手（${wins}:${loses}）`;
    finalResult.className = "final-result draw";
    state.scoreboard.player.draw += 1;
    state.scoreboard.cpu.draw += 1;
  }

  hint.textContent = "本局已完成，點擊 Restart 開始下一局。";
  updateScoreboardView();

  integrations.onMatchComplete({
    cpuHistory: [...state.cpuHistory],
    playerHistory: [...state.playerHistory],
    scoreboard: JSON.parse(JSON.stringify(state.scoreboard)),
  });
};

const playRound = (playerValue) => {
  if (!state.playerDeck.includes(playerValue) || state.playerHistory.length >= TOTAL_ROUNDS) {
    return;
  }

  const cpuValue = state.cpuDeck[state.playerHistory.length];
  const roundIndex = state.playerHistory.length;

  state.playerHistory.push(playerValue);
  state.cpuHistory.push(cpuValue);
  state.playerDeck = state.playerDeck.filter((v) => v !== playerValue);

  pushCardToArea(cpuArea, cpuValue, roundIndex);
  pushCardToArea(playerArea, playerValue, roundIndex);

  const roundResult = compareCards(cpuValue, playerValue);
  renderRoundRow(state.advanced.majorRound, roundIndex, cpuValue, playerValue, roundResult);

  integrations.onRoundComplete({
    round: roundIndex + 1,
    cpu: cpuValue,
    player: playerValue,
    result: roundResult,
  });

  renderPlayerHand();

  if (state.playerHistory.length === TOTAL_ROUNDS) {
    if (state.mode === MODE.BASIC) {
      finalizeBasicGame();
    } else {
      hint.textContent = "已完成 5 回合，請選擇功能卡與位置後按下「結算本大局」。";
    }
  } else {
    hint.textContent = `已完成第 ${state.playerHistory.length} 回合，請繼續出牌。`;
  }
};

const resetMatch = () => {
  roundTableBody.innerHTML = "";
  finalResult.textContent = "尚未完成本局。";
  finalResult.className = "final-result";

  if (state.mode === MODE.ADVANCED) {
    state.advanced.majorRound = 1;
    state.advanced.majorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.minorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.cpuCards = [...CARD_LABELS];
    state.advanced.playerCards = [...CARD_LABELS];
    renderAdvancedCardOptions();
    advancedStatus.textContent = "每大局可選 1 張功能卡，四張卡整場各只能用一次。";
    hint.textContent = "進階模式：先完成第 1 大局的 5 回合，再結算功能卡。";
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

  if (isAdvanced) {
    gameTitle.textContent = "1-2-3-4-5 遊戲（進階規則）";
    gameSubtitle.innerHTML = "三大局制，含 <strong>J / Q / K / JOKER</strong> 功能卡；同分可比小分。";
    rulesList.innerHTML = `
      <li>每大局先進行 5 回合出牌（不可重複）。</li>
      <li>再選 1 張功能卡與位置，依序觸發後結算大局。</li>
      <li>共三大局；若同分可加開第四局並比較小分。</li>
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
modeBasicBtn.addEventListener("click", () => setMode(MODE.BASIC));
modeAdvancedBtn.addEventListener("click", () => setMode(MODE.ADVANCED));

setMode(MODE.BASIC);
updateScoreboardView();

const TOTAL_ROUNDS = 5;
const MODE = {
  BASIC: "basic",
  ADVANCED: "advanced",
};
const CARD_LABELS = ["J", "Q", "K", "JK"];
const PLAYER_CARD_VALUES = [1, 2, 3, 4, 5];

const state = {
  mode: MODE.BASIC,
  cpuDeck: [],
  playerDeck: [...PLAYER_CARD_VALUES],
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
    selectedCard: null,
    selectedPos: null,
    modalOpen: false,
    awaitingNext: false,
    matchFinished: false,
  },
};

const gameShell = document.getElementById("game-shell");
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
const modeNote = document.getElementById("mode-note");
const roundProgress = document.getElementById("round-progress");
const resolutionPill = document.getElementById("resolution-pill");

const advancedControls = document.getElementById("advanced-controls");
const advancedIntro = document.getElementById("advanced-intro");
const advancedStatus = document.getElementById("advanced-status");
const cardsLeft = document.getElementById("cards-left");
const majorRoundPill = document.getElementById("major-round-pill");
const majorScorePill = document.getElementById("major-score-pill");
const minorScorePill = document.getElementById("minor-score-pill");
const openAdvancedModalBtn = document.getElementById("open-advanced-modal-btn");
const funcPlacementSummary = document.getElementById("func-placement-summary");
const resolveAdvancedBtn = document.getElementById("resolve-advanced-btn");
const nextMajorBtn = document.getElementById("next-major-btn");
const effectPanel = document.getElementById("effect-panel");
const effectLog = document.getElementById("effect-log");
const beforeCpu = document.getElementById("before-cpu");
const beforePlayer = document.getElementById("before-player");
const afterCpu = document.getElementById("after-cpu");
const afterPlayer = document.getElementById("after-player");

const advancedModal = document.getElementById("advanced-modal");
const advancedModalBackdrop = document.getElementById("advanced-modal-backdrop");
const closeAdvancedModalBtn = document.getElementById("close-advanced-modal-btn");
const advancedModalIntro = document.getElementById("advanced-modal-intro");
const modalPlayerFuncHand = document.getElementById("modal-player-func-hand");
const modalPlayerFuncTargets = document.getElementById("modal-player-func-targets");
const modalFuncPlacementSummary = document.getElementById("modal-func-placement-summary");
const modalCpuBoard = document.getElementById("modal-cpu-board");
const modalPlayerBoard = document.getElementById("modal-player-board");
const modalCpuCardsLeft = document.getElementById("modal-cpu-cards-left");
const modalPlayerCardsLeft = document.getElementById("modal-player-cards-left");

const modeBasicBtn = document.getElementById("mode-basic");
const modeAdvancedBtn = document.getElementById("mode-advanced");

const stepChooseMode = document.getElementById("step-choose-mode");
const stepPlayFive = document.getElementById("step-play-five");
const stepResolveCard = document.getElementById("step-resolve-card");

const infoPanels = [...document.querySelectorAll(".info-panel")];
const stackedInfoPanels = window.matchMedia("(max-width: 1100px)");

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

const isAdvancedResolutionVisible = () =>
  state.mode === MODE.ADVANCED && state.playerHistory.length === TOTAL_ROUNDS;

const isAdvancedRoundSettled = () =>
  isAdvancedResolutionVisible() && (state.advanced.awaitingNext || state.advanced.matchFinished);

const isInteractionLocked = () =>
  state.mode === MODE.ADVANCED && (state.advanced.awaitingNext || state.advanced.matchFinished);

const clearAdvancedSelection = () => {
  state.advanced.selectedCard = null;
  state.advanced.selectedPos = null;
};

const openAdvancedModal = () => {
  if (!isAdvancedResolutionVisible() || isAdvancedRoundSettled()) return;
  state.advanced.modalOpen = true;
};

const closeAdvancedModal = () => {
  state.advanced.modalOpen = false;
};

const createSlot = (className = "slot") => {
  const slot = document.createElement("div");
  slot.className = className;
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

const renderBoardToArea = (cpuBoard, playerBoard) => {
  const cpuSlots = cpuArea.querySelectorAll(".slot");
  const playerSlots = playerArea.querySelectorAll(".slot");

  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const cpuValue = cpuBoard[i];
    const playerValue = playerBoard[i];

    cpuSlots[i].textContent = cpuValue ?? "";
    playerSlots[i].textContent = playerValue ?? "";

    cpuSlots[i].classList.toggle("filled", cpuValue !== undefined);
    playerSlots[i].classList.toggle("filled", playerValue !== undefined);
  }
};

const renderOutcomeRow = (cpuBoard, playerBoard) => {
  roundOutcomeRow.innerHTML = "";

  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const chip = document.createElement("div");
    const index = document.createElement("span");
    const text = document.createElement("span");

    chip.className = "outcome-chip";
    index.className = "outcome-index";
    text.className = "outcome-text";
    index.textContent = `位置 ${i + 1}`;

    if (playerBoard[i] !== undefined && cpuBoard[i] !== undefined) {
      const result = compareCards(cpuBoard[i], playerBoard[i]);
      text.textContent = resultLabel(result);
      chip.classList.add(result.toLowerCase());
    } else {
      text.textContent = "待定";
      chip.classList.add("waiting");
    }

    chip.append(index, text);
    roundOutcomeRow.appendChild(chip);
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

const renderBoardSnapshotRow = (el, arr) => {
  el.innerHTML = "";
  for (let i = 0; i < TOTAL_ROUNDS; i += 1) {
    const chip = document.createElement("span");
    chip.className = "mini-chip";
    chip.textContent = arr[i] ?? "-";
    el.appendChild(chip);
  }
};

const renderCardChipRow = (el, cards, tone) => {
  el.innerHTML = "";

  if (!cards.length) {
    const chip = document.createElement("span");
    chip.className = "card-chip empty";
    chip.textContent = "無";
    el.appendChild(chip);
    return;
  }

  cards.forEach((card) => {
    const chip = document.createElement("span");
    chip.className = `card-chip ${tone}`;
    chip.textContent = cardText(card);
    el.appendChild(chip);
  });
};

const renderAdvancedDecisionContext = () => {
  renderBoardSnapshotRow(modalCpuBoard, state.cpuHistory);
  renderBoardSnapshotRow(modalPlayerBoard, state.playerHistory);
  renderCardChipRow(modalCpuCardsLeft, state.advanced.cpuCards, "enemy");
  renderCardChipRow(modalPlayerCardsLeft, state.advanced.playerCards, "player");
};

const setStepState = (el, { active = false, done = false }) => {
  el.classList.toggle("active", active);
  el.classList.toggle("current-step", active);
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
      active: finishedFive && !isAdvancedRoundSettled(),
      done: isAdvancedRoundSettled(),
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

const setHint = (message) => {
  hint.textContent = message;
};

const updatePlacementSummary = () => {
  const { selectedCard, selectedPos, playerCards } = state.advanced;
  let message = "尚未選擇功能卡與位置。";

  if (playerCards.length === 0) {
    message = "功能卡已全部使用完畢。";
  } else if (selectedCard && selectedPos) {
    message = `已選擇 ${cardText(selectedCard)} 放在位置 ${selectedPos}。`;
  } else if (selectedCard) {
    message = `已選擇 ${cardText(selectedCard)}，接著請選位置。`;
  } else if (selectedPos) {
    message = `已選擇位置 ${selectedPos}，接著請選 1 張功能卡。`;
  }

  funcPlacementSummary.textContent = message;
  modalFuncPlacementSummary.textContent = message;
};

const renderPlayerHand = () => {
  playerHand.innerHTML = "";
  const locked = isInteractionLocked();

  PLAYER_CARD_VALUES.forEach((value) => {
    const card = document.createElement("button");
    const used = !state.playerDeck.includes(value);

    card.className = "card";
    card.type = "button";
    card.dataset.value = String(value);

    if (used) {
      const valueSpan = document.createElement("span");
      const usedLabel = document.createElement("span");
      valueSpan.textContent = value;
      usedLabel.textContent = "已出";
      usedLabel.className = "card-used-label";
      card.classList.add("used", "locked");
      card.disabled = true;
      card.append(valueSpan, usedLabel);
    } else {
      card.textContent = value;
      card.draggable = !locked;
      card.disabled = locked;

      if (locked) {
        card.classList.add("locked");
      } else {
        const addSelection = () => card.classList.add("selected");
        const removeSelection = () => {
          if (!card.matches(":focus")) card.classList.remove("selected");
        };

        card.addEventListener("pointerenter", addSelection);
        card.addEventListener("pointerleave", removeSelection);
        card.addEventListener("focus", addSelection);
        card.addEventListener("blur", () => card.classList.remove("selected"));
        card.addEventListener("click", () => {
          card.classList.add("selected");
          playRound(value);
        });
        card.addEventListener("dragstart", (event) => {
          card.classList.add("selected", "dragging");
          playerArea.classList.add("drop-active");
          event.dataTransfer.setData("text/plain", String(value));
        });
        card.addEventListener("dragend", () => {
          card.classList.remove("selected", "dragging");
          playerArea.classList.remove("drop-active");
        });
      }
    }

    playerHand.appendChild(card);
  });
};

const pushCardToArea = (area, value, roundIndex) => {
  const slots = area.querySelectorAll(".slot");
  slots[roundIndex].textContent = value;
  slots[roundIndex].classList.add("filled");
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

const chooseAdvancedCard = (card) => {
  if (!state.advanced.playerCards.includes(card) || isInteractionLocked()) return;
  state.advanced.selectedCard = state.advanced.selectedCard === card ? null : card;
  renderAdvancedCardOptions();
};

const chooseAdvancedPosition = (pos) => {
  if (isInteractionLocked()) return;
  state.advanced.selectedPos = state.advanced.selectedPos === pos ? null : pos;
  renderAdvancedCardOptions();
};

const renderAdvancedFunctionHand = () => {
  modalPlayerFuncHand.innerHTML = "";
  const canInteract = isAdvancedResolutionVisible() && !isInteractionLocked();

  CARD_LABELS.forEach((card) => {
    const cardEl = document.createElement("button");
    const used = !state.advanced.playerCards.includes(card);

    cardEl.className = "card func-card";
    cardEl.type = "button";
    cardEl.dataset.card = card;

    if (used) {
      const valueSpan = document.createElement("span");
      const usedLabel = document.createElement("span");
      valueSpan.textContent = cardText(card);
      usedLabel.textContent = "已用";
      usedLabel.className = "card-used-label";
      cardEl.classList.add("used", "locked");
      cardEl.disabled = true;
      cardEl.append(valueSpan, usedLabel);
    } else {
      cardEl.textContent = cardText(card);
      cardEl.classList.toggle("selected", state.advanced.selectedCard === card);
      cardEl.disabled = !canInteract;

      if (!canInteract) {
        cardEl.classList.add("locked");
      } else {
        cardEl.addEventListener("click", () => chooseAdvancedCard(card));
      }
    }

    modalPlayerFuncHand.appendChild(cardEl);
  });
};

const renderAdvancedTargets = () => {
  modalPlayerFuncTargets.innerHTML = "";
  const canInteract = isAdvancedResolutionVisible() && !isInteractionLocked();

  for (let pos = 1; pos <= TOTAL_ROUNDS; pos += 1) {
    const slot = document.createElement("button");
    const index = document.createElement("span");
    const content = document.createElement("span");
    const selected = state.advanced.selectedPos === pos;

    slot.className = "func-target-slot";
    slot.type = "button";
    slot.dataset.pos = String(pos);
    index.className = "func-target-index";
    content.className = "func-target-card";
    index.textContent = `位置 ${pos}`;

    if (selected && state.advanced.selectedCard) {
      content.textContent = cardText(state.advanced.selectedCard);
      slot.classList.add("selected");
    } else if (selected) {
      content.textContent = "已選";
      slot.classList.add("selected");
    } else {
      content.textContent = "選擇";
    }

    if (state.advanced.selectedCard && canInteract) {
      slot.classList.add("armed");
    }

    if (!canInteract) {
      slot.classList.add("locked");
      slot.disabled = true;
    } else {
      slot.addEventListener("click", () => chooseAdvancedPosition(pos));
    }

    slot.append(index, content);
    modalPlayerFuncTargets.appendChild(slot);
  }
};

const renderAdvancedCardOptions = () => {
  renderAdvancedDecisionContext();
  renderAdvancedFunctionHand();
  renderAdvancedTargets();
  updatePlacementSummary();

  resolveAdvancedBtn.disabled =
    state.playerHistory.length !== TOTAL_ROUNDS ||
    state.advanced.playerCards.length === 0 ||
    !state.advanced.selectedCard ||
    !state.advanced.selectedPos ||
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

const syncUiState = () => {
  const resolutionVisible = isAdvancedResolutionVisible();
  const settled = isAdvancedRoundSettled();
  const awaitingResolution = state.mode === MODE.ADVANCED && resolutionVisible && !settled;

  if (!awaitingResolution) {
    closeAdvancedModal();
  }

  advancedControls.classList.toggle("hidden", !resolutionVisible);
  advancedControls.classList.toggle("awaiting-resolution", awaitingResolution);
  advancedBoardTools.classList.toggle("hidden", !settled);
  effectPanel.classList.toggle("hidden", !settled);

  resolutionPill.classList.toggle("hidden", !resolutionVisible);
  resolutionPill.classList.toggle("success", settled);
  if (resolutionVisible) {
    resolutionPill.textContent = settled ? "已完成功能卡結算" : "等待功能卡結算";
  }

  openAdvancedModalBtn.classList.toggle("hidden", !awaitingResolution);
  advancedModal.classList.toggle("hidden", !(awaitingResolution && state.advanced.modalOpen));

  gameShell.classList.toggle("awaiting-resolution", awaitingResolution);
  gameShell.classList.toggle("locked", isInteractionLocked());
  playerHand.classList.toggle("locked", isInteractionLocked());
  playerArea.classList.toggle("locked", isInteractionLocked());

  if (state.mode !== MODE.ADVANCED) {
    advancedIntro.textContent = "5 小局完成後會彈出功能卡視窗，讓你選卡與放置位置。";
    advancedModalIntro.textContent = "先選 1 張功能卡，再選位置。";
  } else if (!resolutionVisible) {
    advancedIntro.textContent = "完成 5 小局後，會自動跳出功能卡視窗。";
    advancedModalIntro.textContent = "先選 1 張功能卡，再選位置。";
  } else if (!settled) {
    advancedIntro.textContent = "功能卡尚未結算，可透過彈出視窗選卡與位置。";
    advancedModalIntro.textContent = "先選 1 張功能卡，再選擇要放置的局數位置。";
  } else if (state.advanced.matchFinished) {
    advancedIntro.textContent = "本場進階對局已完成，保留結算結果供你檢視。";
    advancedModalIntro.textContent = "本場進階對局已完成。";
  } else {
    advancedIntro.textContent = "已展示功能卡位置與盤面差異，準備進入下一大局。";
    advancedModalIntro.textContent = "此大局已完成功能卡結算。";
  }
};

const resetRound = () => {
  state.cpuDeck = shuffle(PLAYER_CARD_VALUES);
  state.playerDeck = [...PLAYER_CARD_VALUES];
  state.cpuHistory = [];
  state.playerHistory = [];
  state.advanced.awaitingNext = false;
  clearAdvancedSelection();

  buildSlots();
  clearFunctionPlacement();
  clearEffectPanel();
  renderPlayerHand();
  renderBoardToArea([], []);
  renderOutcomeRow([], []);
  updateRoundProgress();
  updateGuide();
  renderAdvancedCardOptions();
  syncUiState();
};

const finalizeAdvancedMatch = () => {
  const { majorScore, minorScore } = state.advanced;
  state.advanced.matchFinished = true;
  closeAdvancedModal();

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

  setHint("現在可按「重新開始」再玩一場。");
  nextMajorBtn.classList.add("hidden");
  resolveAdvancedBtn.disabled = true;
  updateScoreboardView();
  syncUiState();
};

const startNextMajorRound = () => {
  if (!state.advanced.awaitingNext || state.advanced.matchFinished) return;

  state.advanced.majorRound += 1;
  state.advanced.awaitingNext = false;
  closeAdvancedModal();

  setHint(`現在請完成第 ${state.advanced.majorRound} 大局的 5 回合出牌。`);
  finalResult.textContent = `進階進行中：大局 玩家 ${state.advanced.majorScore.player} : 電腦 ${state.advanced.majorScore.cpu}`;
  finalResult.className = "final-result";
  advancedStatus.textContent = "完成 5 小局後，系統會跳出功能卡視窗。";

  nextMajorBtn.classList.add("hidden");
  resetRound();
  renderAdvancedCardOptions();
  updateAdvancedDashboard();
  syncUiState();
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

  const playerCard = state.advanced.selectedCard;
  const playerPos = state.advanced.selectedPos;
  if (!playerCard || !playerPos || !state.advanced.playerCards.includes(playerCard)) return;

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
  clearAdvancedSelection();
  closeAdvancedModal();

  state.advanced.awaitingNext = true;

  advancedStatus.textContent =
    `第 ${state.advanced.majorRound} 大局：玩家 ${cardText(playerCard)}(${playerPos})、` +
    `電腦 ${cardText(cpuCard)}(${cpuPos})。小局 ${playerWins}:${cpuWins}（和局 ${draws}）。`;

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
  syncUiState();

  if (advancedShouldEnd()) {
    finalizeAdvancedMatch();
  } else {
    setHint("現在請按「進入下一大局」。");
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

  setHint("現在可按「重新開始」再玩一局。");
  updateScoreboardView();
  syncUiState();
};

const playRound = (playerValue) => {
  if (state.mode === MODE.ADVANCED && isInteractionLocked()) return;
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
  syncUiState();

  if (state.playerHistory.length === TOTAL_ROUNDS) {
    if (state.mode === MODE.BASIC) {
      finalizeBasicGame();
    } else {
      openAdvancedModal();
      setHint("功能卡視窗已開啟，現在請選擇功能卡與位置。");
      advancedStatus.textContent = "請在彈出視窗中選擇功能卡與放置位置。";
      renderAdvancedCardOptions();
      syncUiState();
    }
  } else if (state.mode === MODE.ADVANCED) {
    setHint(`現在請完成第 ${state.advanced.majorRound} 大局的下一回合。`);
  } else {
    setHint("現在請選下一張數字牌。");
  }
};

const resetMatch = () => {
  roundTableBody.innerHTML = "";
  finalResult.textContent = state.mode === MODE.ADVANCED ? "進階對局尚未完成。" : "本局尚未完成。";
  finalResult.className = "final-result";
  nextMajorBtn.classList.add("hidden");
  closeAdvancedModal();

  if (state.mode === MODE.ADVANCED) {
    state.advanced.majorRound = 1;
    state.advanced.majorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.minorScore = { cpu: 0, player: 0, draw: 0 };
    state.advanced.cpuCards = [...CARD_LABELS];
    state.advanced.playerCards = [...CARD_LABELS];
    clearAdvancedSelection();
    state.advanced.awaitingNext = false;
    state.advanced.matchFinished = false;
    advancedStatus.textContent = "完成 5 小局後，系統會跳出功能卡視窗。";
    setHint("現在請完成第 1 大局的 5 回合出牌。");
  } else {
    advancedStatus.textContent = "";
    setHint("現在請選 1 張數字牌。");
  }

  resetRound();
  renderAdvancedCardOptions();
  updateAdvancedDashboard();
  syncUiState();
};

const setMode = (mode) => {
  state.mode = mode;
  const isAdvanced = mode === MODE.ADVANCED;

  modeBasicBtn.classList.toggle("active", !isAdvanced);
  modeAdvancedBtn.classList.toggle("active", isAdvanced);

  if (isAdvanced) {
    gameTitle.textContent = "1-2-3-4-5 遊戲（進階規則）";
    gameSubtitle.innerHTML =
      "先完成 5 回合，再用 <strong>J / Q / K / JOKER</strong> 改變盤面，最後比較大局與小分。";
    modeNote.textContent = "每大局先完成 5 回合，再進入功能卡結算；功能卡整場各只能使用一次。";
    rulesList.innerHTML = `
      <li>每大局先完成 5 回合出牌，所有數字仍不可重複。</li>
      <li>第 5 回合後會跳出功能卡視窗，選 1 張功能卡與要放置的位置。</li>
      <li>三大局內比分高者勝；若平手則比較加開局與小分。</li>
    `;
  } else {
    gameTitle.textContent = "1-2-3-4-5 遊戲（基本規則）";
    gameSubtitle.innerHTML = "大數字勝，例外：<strong>1 勝 5、2 勝 4</strong>。每張牌只能出一次。";
    modeNote.textContent = "先完成 5 回合出牌，再查看每回合勝負與本局結果。";
    rulesList.innerHTML = `
      <li>每回合從玩家手牌出 1 張，五個數字各用一次。</li>
      <li>主戰場會即時顯示每個位置的勝負結果。</li>
      <li>本局結束後，可直接從主畫面重新開始。</li>
    `;
  }

  resetMatch();
};

playerArea.addEventListener("dragenter", (event) => {
  event.preventDefault();
  if (!isInteractionLocked()) playerArea.classList.add("drop-active");
});

playerArea.addEventListener("dragover", (event) => {
  event.preventDefault();
  if (!isInteractionLocked()) playerArea.classList.add("drop-active");
});

playerArea.addEventListener("dragleave", (event) => {
  const nextTarget = event.relatedTarget;
  if (!nextTarget || !playerArea.contains(nextTarget)) {
    playerArea.classList.remove("drop-active");
  }
});

playerArea.addEventListener("drop", (event) => {
  event.preventDefault();
  playerArea.classList.remove("drop-active");
  const value = Number(event.dataTransfer.getData("text/plain"));
  playRound(value);
});

infoPanels.forEach((panel) => {
  panel.addEventListener("toggle", () => {
    if (!stackedInfoPanels.matches || !panel.open) return;
    infoPanels.forEach((other) => {
      if (other !== panel) other.open = false;
    });
  });
});

document.getElementById("restart-btn").addEventListener("click", resetMatch);
openAdvancedModalBtn.addEventListener("click", () => {
  openAdvancedModal();
  syncUiState();
});
closeAdvancedModalBtn.addEventListener("click", () => {
  closeAdvancedModal();
  syncUiState();
});
advancedModalBackdrop.addEventListener("click", () => {
  closeAdvancedModal();
  syncUiState();
});
resolveAdvancedBtn.addEventListener("click", settleAdvancedMajorRound);
nextMajorBtn.addEventListener("click", startNextMajorRound);
modeBasicBtn.addEventListener("click", () => setMode(MODE.BASIC));
modeAdvancedBtn.addEventListener("click", () => setMode(MODE.ADVANCED));

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && state.advanced.modalOpen) {
    closeAdvancedModal();
    syncUiState();
  }
});

setMode(MODE.BASIC);
updateScoreboardView();

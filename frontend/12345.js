const TOTAL_ROUNDS = 5;

const integrations = {
  onRoundComplete: (_payload) => {},
  onMatchComplete: (_payload) => {},
};

const state = {
  cpuDeck: [],
  playerDeck: [1, 2, 3, 4, 5],
  cpuHistory: [],
  playerHistory: [],
  scoreboard: {
    cpu: { win: 0, lose: 0, draw: 0 },
    player: { win: 0, lose: 0, draw: 0 },
  },
};

const cpuArea = document.getElementById("cpu-area");
const playerArea = document.getElementById("player-area");
const playerHand = document.getElementById("player-hand");
const roundTableBody = document.querySelector("#round-table tbody");
const finalResult = document.getElementById("final-result");
const hint = document.getElementById("hint");

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

const renderRoundRow = (roundIndex, cpuValue, playerValue, result) => {
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td>${roundIndex + 1}</td>
    <td>${cpuValue}</td>
    <td>${playerValue}</td>
    <td>${result}</td>
  `;
  roundTableBody.appendChild(tr);
};

const finalizeGame = () => {
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
  renderRoundRow(roundIndex, cpuValue, playerValue, roundResult);

  integrations.onRoundComplete({
    round: roundIndex + 1,
    cpu: cpuValue,
    player: playerValue,
    result: roundResult,
  });

  renderPlayerHand();

  if (state.playerHistory.length === TOTAL_ROUNDS) {
    finalizeGame();
  } else {
    hint.textContent = `已完成第 ${state.playerHistory.length} 回合，請繼續出牌。`;
  }
};

const resetMatch = () => {
  state.cpuDeck = shuffle([1, 2, 3, 4, 5]);
  state.playerDeck = [1, 2, 3, 4, 5];
  state.cpuHistory = [];
  state.playerHistory = [];

  roundTableBody.innerHTML = "";
  finalResult.textContent = "尚未完成本局。";
  finalResult.className = "final-result";
  hint.textContent = "拖曳或點擊下方玩家卡牌開始出牌。";

  buildSlots();
  renderPlayerHand();
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

resetMatch();
updateScoreboardView();

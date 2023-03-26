const allowDrop = (event) => {
  event.preventDefault();
};

const drag = (event) => {
  event.dataTransfer.setData("text", event.target.id);
};

let array = [0, 1, 2, 3, 4];

function getRandomValue() {
  if (array.length === 0) {
    return null;
  }
  const randomIndex = Math.floor(Math.random() * array.length);
  const randomValue = array[randomIndex];
  array.splice(randomIndex, 1);
  return randomValue;
}

const placeCard = (areaCards, src, playHistory, player) => {
  for (let i = 0; i < areaCards.length; i++) {
    if (!areaCards[i].hasChildNodes()) {
      areaCards[i].appendChild(src);
      src.style.display = "block";
      playHistory[player + 'History'].push(src.id);
      break;
    }
  }
};

const player1Turn = () => {
  const player1Cards = document.querySelectorAll("#player1 .card");
  const areaCards = document.querySelectorAll("#center-top .card");
  const random_card = getRandomValue();
  const src = player1Cards[random_card].firstElementChild;
  placeCard(areaCards, src, playHistory, 'player1');
};

let playHistory = {
  player1History: [],
  player2History: []
};

const drop = (event) => {
  event.preventDefault();
  const data = event.dataTransfer.getData("text");
  const src = document.getElementById(data);
  const srcParent = src.closest(".player");
  const tgt = event.currentTarget;

  if (tgt.id === "center-top" || tgt.id === "center-bottom") {
    if (srcParent.id === "player2" && tgt.id === "center-bottom") {
      const areaCards = document.querySelectorAll("#center-bottom .card");
      placeCard(areaCards, src, playHistory, 'player2');
      player1Turn();
      console.log(playHistory)
      if (playHistory.player2History.length === 5) {
        player2Finish();
      }
    }
  }
};

//處理點擊卡牌事件
const handleClick = (event) => {
  const src = event.target;
  const srcParent = src.closest(".player");
  const areaCards = document.querySelectorAll("#center-bottom .card");

  placeCard(areaCards, src, playHistory, 'player2');
  player1Turn();
  console.log(playHistory);
  if (playHistory.player2History.length === 5) {
    player2Finish();
  }
};

// 重設遊戲
const resetButton = document.getElementById("resetButton");
resetButton.addEventListener("click", () => {
  console.log("翻桌(╯‵□′)╯︵┻━┻");
  playHistory = { player1History: [], player2History: [] };  //重設變數
  array = [0, 1, 2, 3, 4];  //重設變數
  const player1Cards = document.querySelectorAll("#player1 .card");
  const player2Cards = document.querySelectorAll("#player2 .card");
  const areaCards = document.querySelectorAll(".center .card");
  // 將所有卡牌回到初始位置
  for (let i = 0; i < player1Cards.length; i++) {
    if (player1Cards[i].hasChildNodes()) {
      player1Cards[i].appendChild(document.getElementById("p1_drag" + (i + 1)));
    }
  }
  for (let i = 0; i < player2Cards.length; i++) {
    if (player2Cards[i].hasChildNodes()) {
      player2Cards[i].appendChild(document.getElementById("p2_drag" + (i + 1)));
    }
  }
  for (let i = 0; i < areaCards.length; i++) {
    if (areaCards[i].hasChildNodes()) {
      areaCards[i].removeChild(areaCards[i].firstElementChild);
    }
  }
});

const player2Finish = () => {
  // player2 完成牌局的相關操作
  // 向後端請求結果
  console.log("後端做事");
  fetch('http://localhost:5000/game_result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(playHistory)
  })
    .then(response => response.json())
    .then(result => {
      // 處理後端回傳的結果
      console.log("Success:", JSON.stringify(result));
      if (result === 'Player 1 wins') {
        updateScore('player1', 'win');
        updateScore('player2', 'lose');
      } else if (result === 'Player 2 wins') {
        updateScore('player1', 'lose');
        updateScore('player2', 'win');
      } else {
        updateScore('player1', 'draw');
        updateScore('player2', 'draw');
      }
    })
    .catch(error => {
      console.error("Error:", error);
    });
};

const updateScore = (player, result) => {
  if (result === 'win') {
    document.getElementById(`${player}-win`).textContent = parseInt(document.getElementById(`${player}-win`).textContent) + 1;
  } else if (result === 'lose') {
    document.getElementById(`${player}-lose`).textContent = parseInt(document.getElementById(`${player}-lose`).textContent) + 1;
  } else if (result === 'draw') {
    document.getElementById(`${player}-draw`).textContent = parseInt(document.getElementById(`${player}-draw`).textContent) + 1;
  }
};

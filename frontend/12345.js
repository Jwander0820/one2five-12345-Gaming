const allowDrop = (event) => {
  event.preventDefault();
};

const drag = (event) => {
  event.dataTransfer.setData("text", event.target.id);
};

var array = [0, 1, 2, 3, 4]
function getRandomValue() {
  if (array.length === 0) {
    return null;
  }
  var randomIndex = Math.floor(Math.random() * array.length);
  var randomValue = array[randomIndex];
  array.splice(randomIndex, 1);
  return randomValue;
}

const player1Turn = () => {
  const player1Cards = document.querySelectorAll("#player1 .card");
  const areaCards = document.querySelectorAll("#center-top .card");
  const random_card = getRandomValue();
  const src = player1Cards[random_card].firstElementChild
  for (let j = 0; j < areaCards.length; j++) {
    if (!areaCards[j].hasChildNodes()) {
      areaCards[j].appendChild(src);
      src.style.display = "block";
      playHistory.player1History.push(src.id);
      break;
    }
  }
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
      for (let i = 0; i < areaCards.length; i++) {
        if (!areaCards[i].hasChildNodes()) {
          areaCards[i].appendChild(src);
          src.style.display = "block";
          playHistory.player2History.push(src.id);
          player1Turn();
          console.log(playHistory)
          break;
        }
      }
    }
  }
};

// 重設遊戲
const resetButton = document.getElementById("resetButton");
resetButton.addEventListener("click", () => {
  console.log("翻桌(╯‵□′)╯︵┻━┻")
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

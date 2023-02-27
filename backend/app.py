from flask import Flask, request, jsonify
from flask_cors import CORS

from game_logic import resolve_game_result, process_game_result

app = Flask(__name__)
CORS(app)


# 後端 Flask 和前端 JavaScript 在不同的域下，您還需要在後端 Flask 上設置允許跨域請求的支持，以便前端 JavaScript 代码可以與後端通信。
# 在 Flask 中，可以使用 flask-cors 模塊來實現跨域請求的支持

@app.route('/')
def index():
    return 'API is alive!!'


@app.route("/game_result", methods=["POST"])
def game_result():
    # 從請求中獲取playHistory
    playHistory = request.get_json()
    # 處理playHistory並回傳結果
    player1_history, player2_history = resolve_game_result(playHistory)
    # 根據結果判斷勝負
    result = process_game_result(player1_history, player2_history)
    return jsonify(result)


if __name__ == '__main__':
    app.run(debug=True)

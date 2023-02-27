def resolve_game_result(playHistory):
    """
    從前端回傳的資料中解析出玩家1(電腦)和玩家2的出牌結果清單
    :param playHistory:
    :return:
    """
    player1_history = playHistory["player1History"]
    player1_history = [int(history.split("_")[-1][-1]) for history in player1_history]
    player2_history = playHistory["player2History"]
    player2_history = [int(history.split("_")[-1][-1]) for history in player2_history]
    return player1_history, player2_history


def process_game_result(player1, player2):
    """
    計算遊戲勝負結果
    :param player1: player1出牌順序(清單)
    :param player2: player2出牌順序(清單)
    :return:
    """
    player1_score = 0
    player2_score = 0
    for i in range(5):
        if player1[i] == player2[i]:
            continue
        elif (player1[i] == 1 and player2[i] == 5) or (player1[i] == 2 and player2[i] == 4):
            player1_score += 1
        elif (player1[i] == 5 and player2[i] == 1) or (player1[i] == 4 and player2[i] == 2):
            player2_score += 1
        elif player1[i] > player2[i]:
            player1_score += 1
        else:
            player2_score += 1
    if player1_score > player2_score:
        return "Player 1 wins"
    elif player1_score < player2_score:
        return "Player 2 wins"
    else:
        return "It's a tie"

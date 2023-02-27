import random

from backend import game_logic


def generate_test_case():
    player1 = random.sample(range(1, 6), 5)
    player2 = random.sample(range(1, 6), 5)
    return player1, player2


player1_wins = 0
player2_wins = 0
ties = 0

for i in range(100000):
    player1, player2 = generate_test_case()
    result = game_logic.process_game_result(player1, player2)
    if result == "Player 1 wins":
        player1_wins += 1
    elif result == "Player 2 wins":
        player2_wins += 1
    else:
        ties += 1

print("Player 1 wins:", player1_wins)
print("Player 2 wins:", player2_wins)
print("Ties:", ties)

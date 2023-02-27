import random
import unittest

from backend import game_logic


def generate_test_case():
    player1 = random.sample(range(1, 6), 5)
    player2 = random.sample(range(1, 6), 5)
    return player1, player2


class TestGameLogic(unittest.TestCase):
    def test_compare(self):
        for i in range(100):
            player1, player2 = generate_test_case()
            result = game_logic.process_game_result(player1, player2)
            player1_score = 0
            player2_score = 0
            for j in range(5):
                if player1[j] == player2[j]:
                    continue
                elif (player1[j] == 1 and player2[j] == 5) or (player1[j] == 2 and player2[j] == 4):
                    player1_score += 1
                elif (player1[j] == 5 and player2[j] == 1) or (player1[j] == 4 and player2[j] == 2):
                    player2_score += 1
                elif player1[j] > player2[j]:
                    player1_score += 1
                else:
                    player2_score += 1
            if player1_score > player2_score and result != "Player 1 wins":
                self.fail(
                    f"Incorrect result for player1={player1} and player2={player2}. Expected Player 1 wins but got {result}")
            elif player1_score < player2_score and result != "Player 2 wins":
                self.fail(
                    f"Incorrect result for player1={player1} and player2={player2}. Expected Player 2 wins but got {result}")
            elif player1_score == player2_score and result != "It's a tie":
                self.fail(
                    f"Incorrect result for player1={player1} and player2={player2}. Expected It's a tie but got {result}")


if __name__ == '__main__':
    unittest.main()

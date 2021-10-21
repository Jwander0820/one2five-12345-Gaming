# -*- coding: utf-8 -*-
"""
基本規則 : 類似剪刀石頭布，改為12345，共五次出拳機會，且不能重複
1,2,3,4,5 共五局一次出一種數字，且不能重複，每個數字都要出一次
1. 數字越大者 : 勝
2. 但 1 勝過 5
3. 但 2 勝過 4
"""
"""
進階規則 : 以基本規則為基底，新增J、Q、K、Joker 四種功能卡
功能卡 : 共三大局，整場遊戲僅能使用一次
    J : 將指定位置的牌 向左交換
    Q : 將指定位置的牌 向右交換
    K : 將指定位置的牌與 對手 交換(J、Q使用完後發動)
    Jocker : 雙方玩家的局面 交換(最後發動)
以基本規則對決一局後，將對決順序排開，審視局面可以使用一張功能卡 (or多張?)擺放在不同位置上
選定好功能卡，並決定要放在哪個位置發動，雙方玩家攤開功能卡，重新整理盤勢，決定該局勝負，勝者得一點
比賽共三局，功能卡不得重複使用，最終三局比完，得分高者勝
若是因為和局導致雙方比數相同，則加開第四局
加開規則:
    1. 基礎版:雙方再對決一局，拿剩下的功能卡對決
    2. 瘋狂版:雙方再對決一局
        a.此時四張功能卡都能使用(or四張可同時使用?)，一動決勝負
        b.四張卡都能使用，雙方依序四動，一次可以出一張or不出，每次出完盤整，四動完結算遊戲
"""
import random
class GAME12345 (object):
    def BaseRule(self):
        match = [1, 2, 3, 4, 5] # 對手的牌
        match_hash = {1:[2,3,4], 2:[3,5], 3:[4,5], 4:[2,5], 5:[1]} 
        # 雜湊表用於處理勝利條件，若是對手等於1，則勝利條件為玩家出2 or 3 or 4
        random.shuffle(match) # 電腦的牌隨機洗牌
        i = 0 # 計次
        enemy = [] # 對手的牌
        player = [] # 玩家的牌
        enemy_deck = [1, 2, 3, 4, 5] # 對手的牌庫
        player_deck = [1, 2, 3, 4, 5] # 玩家的牌庫
        enemy_point = 0 # 對手的分數
        player_point = 0 # 玩家的分數
        draw = 0 # 和局數
        print('請輸入1,2,3,4,5其中一個數字')
        
        while i < 5: # 五局
            try: #若是輸入的值不符合規則，則會跳出迴圈，並提示輸入正確的格式
                nums = int(input('請輸入第 '+str(i + 1)+' 個數: '))
                if nums > 5 or nums < 1: # 限制數字的條件
                    print('請輸入1至5區間內的數字')
                    continue
                if nums in player: # 限制不能重複出牌
                    print('請勿輸入重複的數字')
                    continue
            except:
                print('請輸入指定的數字') # 若是輸入浮點數之類的會報錯
                continue
            
            print('對手出',match[i])
            print('玩家出',nums)
            
            enemy.append(match[i]) # 將對手出過的牌加入清單中
            player.append(nums) # 將玩家出過的牌加入清單中
            enemy_deck.remove(match[i]) # 將對手出過的牌移出牌庫
            player_deck.remove(nums) # 將玩家出過的牌移出牌庫
            
            if nums in match_hash[match[i]]:
                player_point += 1
                print('這局你贏了')
            elif nums == match[i]:
                draw += 1
                print('這局平手')
            else:
                enemy_point += 1
                print('這局你輸了')
            
            i += 1
            if i < 5:
                print('對手出過了', enemy)
                print('玩家出過了', player)
                print('對手牌庫剩下', enemy_deck)
                print('玩家牌庫剩下', player_deck)
        
        print('對手的出牌順序', enemy)
        print('玩家的出牌順序', player)
        print('最終結果')
        print('對手得分 : ', enemy_point)
        print('玩家得分 : ', player_point,'\n')
        if player_point > enemy_point:
            print('恭喜你獲得最終勝利')
        elif player_point == enemy_point:
            print('和局')
        else:
            print('你輸了QQ')
            
        return enemy,player
    
    def BaseRule_for_Advance(self):
        match = [1, 2, 3, 4, 5] # 對手的牌
        match_hash = {1:[2,3,4], 2:[3,5], 3:[4,5], 4:[2,5], 5:[1]} 
        # 雜湊表用於處理勝利條件，若是對手等於1，則勝利條件為玩家出2 or 3 or 4
        random.shuffle(match) # 電腦的牌隨機洗牌
        i = 0 # 計次
        enemy = [] # 對手的牌
        player = [] # 玩家的牌
        enemy_deck = [1, 2, 3, 4, 5] # 對手的牌庫
        player_deck = [1, 2, 3, 4, 5] # 玩家的牌庫
        enemy_point = 0 # 對手的分數
        player_point = 0 # 玩家的分數
        draw = 0 # 和局數
        print('請輸入1,2,3,4,5其中一個數字')
        
        while i < 5: # 五局
            try: #若是輸入的值不符合規則，則會跳出迴圈，並提示輸入正確的格式
                nums = int(input('請輸入第 '+str(i + 1)+' 個數: '))
                if nums > 5 or nums < 1: # 限制數字的條件
                    print('請輸入1至5區間內的數字')
                    continue
                if nums in player: # 限制不能重複出牌
                    print('請勿輸入重複的數字')
                    continue
            except:
                print('請輸入指定的數字') # 若是輸入浮點數之類的會報錯
                continue
            
            print('對手出',match[i])
            print('玩家出',nums)
            
            enemy.append(match[i]) # 將對手出過的牌加入清單中
            player.append(nums) # 將玩家出過的牌加入清單中
            enemy_deck.remove(match[i]) # 將對手出過的牌移出牌庫
            player_deck.remove(nums) # 將玩家出過的牌移出牌庫
            
            if nums in match_hash[match[i]]:
                player_point += 1
                print('這局你贏了')
            elif nums == match[i]:
                draw += 1
                print('這局平手')
            else:
                enemy_point += 1
                print('這局你輸了')
            
            i += 1
            if i < 5:
                print('對手出過了', enemy)
                print('玩家出過了', player)
                print('對手牌庫剩下', enemy_deck)
                print('玩家牌庫剩下', player_deck)
        
        print('對手的出牌順序', enemy)
        print('玩家的出牌順序', player)
            
        return enemy,player
    
    def Autoversion(self,input_list):
        match = [1, 2, 3, 4, 5] # 對手的牌
        match_hash = {1:[2,3,4], 2:[3,5], 3:[4,5], 4:[2,5], 5:[1]} 
        # 雜湊表用於處理勝利條件，若是對手等於1，則勝利條件為玩家出2 or 3 or 4
        random.shuffle(match) # 電腦的牌隨機洗牌
        i = 0 # 計次
        enemy = [] # 對手的牌
        player = [] # 玩家的牌
        enemy_deck = [1, 2, 3, 4, 5] # 對手的牌庫
        player_deck = [1, 2, 3, 4, 5] # 玩家的牌庫
        enemy_point = 0 # 對手的分數
        player_point = 0 # 玩家的分數
        draw = 0 # 和局數
        
        while i < 5: # 五局
            try: #若是輸入的值不符合規則，則會跳出迴圈，並提示輸入正確的格式
                nums = input_list[i]
                if nums > 5 or nums < 1: # 限制數字的條件
                    continue
                if nums in player: # 限制不能重複出牌
                    continue
            except:
                continue
            
            enemy.append(match[i]) # 將對手出過的牌加入清單中
            player.append(nums) # 將玩家出過的牌加入清單中
            enemy_deck.remove(match[i]) # 將對手出過的牌移出牌庫
            player_deck.remove(nums) # 將玩家出過的牌移出牌庫
            
            if nums in match_hash[match[i]]:
                player_point += 1
            elif nums == match[i]:
                draw += 1
            else:
                enemy_point += 1
            
            i += 1
        
        return enemy_point,player_point
    
    def who_win(self, enemy, player):
        # 接受最後結果的清單，提供雙方得分以及勝負
        match_hash = {1:[2,3,4], 2:[3,5], 3:[4,5], 4:[2,5], 5:[1]}
        enemy_point = 0 # 對手的分數
        player_point = 0 # 玩家的分數
        draw = 0 # 和局數
        result = [0, 0, 0] # 第一個是對手得分 第二個是玩家得分 第三個是和局
        for i in range(5):
            if player[i] in match_hash[enemy[i]]:
                player_point += 1
            elif player[i] == enemy[i]:
                draw += 1
            else:
                enemy_point += 1
        if player_point > enemy_point:
            result[1] = 1
        elif player_point == enemy_point:
            result[2] = 1
        else:
            result[0] = 1
        return result
        
    def AdvanceRule(self):
        enemy,player = GAME12345().BaseRule_for_Advance()
        enemy_deck = ['J', 'Q', 'K', 'JK'] # 對手的功能牌庫
        player_deck = ['J', 'Q', 'K', 'JK'] # 玩家的功能牌庫
        print('選擇你的功能卡要放置的位置 1-5')
        
        
        
        
        
        
        
        
if __name__ == '__main__':
    # GAME12345().BaseRule()
    input_list = [1,2,3,4,5]
    # GAME12345().Autoversion(input_list)
    # GAME12345().AdvanceRule()
    enemy = [1,2,3,4,5]
    player = [2,1,4,5,3]
    x = GAME12345().who_win(enemy, player)
    print(x)

# -*- coding: utf-8 -*-
"""
基本規則 : 類似剪刀石頭布，改為12345，共五次出拳機會，且不能重複
1,2,3,4,5 共五局一次出一種數字，且不能重複，每個數字都要出一次
1. 數字越大者 : 勝
2. 但 1 勝過 5
3. 但 2 勝過 4

進階規則 : 以基本規則為基底，新增J、Q、K、Joker 四張功能卡
共三大局，三局內比分高者勝利，若比數相同則加開第四局，若再和局則往下比較小局賽點分數，分數高者勝
功能卡 : 共三大局，整場遊戲僅能使用一次
    J : 將指定位置的牌 向左交換
    Q : 將指定位置的牌 向右交換
    K : 將指定位置的牌與 對手 交換(J、Q使用完後發動)
    Jocker : 雙方玩家的局面 交換(最後發動)
以基本規則對決一局後，將對決順序排開，審視局面可以使用一張功能卡 (or多張?)擺放在不同位置上
選定好功能卡，並決定要放在哪個位置發動，雙方玩家攤開功能卡，重新整理盤勢，決定該局勝負，勝者得一點
比賽共三局，功能卡不得重複使用，最終三局比完，大局得分高者勝
若是因為和局導致雙方比數相同，則加開第四局，若再和局則往下比較小局得分，得分高者勝
若第四局再和局那就和局XD，該情況比分為[0, 0, 4]，發生機率非常低
加開第四局的規則:
    1. 基礎版:雙方再對決一局，拿剩下的功能卡對決 (已完成)[version 2.0]
    2. 瘋狂版:雙方再對決一局
        a.四張功能卡都能使用，選用一張，一決勝負
        b. 四張功能卡都能使用，可選用多張，功能卡位置不能重複，一決勝負
        c.四張功能卡都能使用，而雙方依序四次動作，一次可以出一張卡 or 不出，
        每次出完功能卡便整理局勢 四次動作結束後，結算遊戲
"""
import random
class GAME12345 (object):
    def BaseRule(self):
        # 基本規則函式
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
    
    def BaseRule_Autotest(self,input_list):
        # 基本規則函式 - 用於自動測試使用
        enemy = [1, 2, 3, 4, 5] # 對手的牌
        random.shuffle(enemy) # 電腦的牌隨機洗牌
        # 回傳大局得分和小局得分的清單 [對手:玩家:和局] = [x, y, z]
        return GAME12345().who_win(enemy, input_list)
    
    def BaseRule_Autotest_Case_Analysis(self,input_list):
        # 基本規則函式 - 用於自動測試使用
        # 此處僅回傳case做案例分析
        case = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
        enemy = [1, 2, 3, 4, 5] # 對手的牌
        random.shuffle(enemy) # 電腦的牌隨機洗牌
        
        result,p = GAME12345().who_win(enemy, input_list)
        if p == [5,0,0] or p == [0,5,0]: # 0
            case[0] = 1
        elif p == [4,1,0] or p == [1,4,0]: # 1
            case[1] = 1
        elif p == [0,1,4] or p == [1,0,4]: # 2 # 發生機率為0
            case[2] = 1
        elif p == [4,0,1] or p == [0,4,1]: # 3
            case[3] = 1    
        elif p == [3,2,0] or p == [2,3,0]: # 4
            case[4] = 1    
        elif p == [3,0,2] or p == [0,3,2]: # 5
            case[5] = 1   
        elif p == [2,0,3] or p == [3,0,2]: # 6 # 發生機率為0
            case[6] = 1            
        elif p == [3,1,1] or p == [1,3,1]: # 7
            case[7] = 1
        elif p == [2,1,2] or p == [1,2,2]: # 8
            case[8] = 1
        elif p == [0,0,5]: # 9 # 三種和局案例
            case[9] = 1
        elif p == [1,1,3]: # 10
            case[10] = 1   
        elif p == [2,2,1]: # 11
            case[11] = 1
        return case
    
    def BaseRule_for_Advance(self):
        # 基本規則函式 - 用於提供給進階規則使用，執行一次完成5小局，回傳雙方局面，提供給後續進階版本使用
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
    
    def who_win(self, enemy, player):
        # 接受最後結果的清單，提供雙方得分以及勝負，回傳兩筆清單，一筆為大局比分，一筆為小局得分
        match_hash = {1:[2,3,4], 2:[3,5], 3:[4,5], 4:[2,5], 5:[1]}
        enemy_point = 0 # 對手的分數
        player_point = 0 # 玩家的分數
        draw = 0 # 和局數
        result = [0, 0, 0] # 第一個是對手得分 第二個是玩家得分 第三個是和局
        Match_point = [0, 0, 0]
        for i in range(5):
            if player[i] in match_hash[enemy[i]]:
                player_point += 1
            elif player[i] == enemy[i]:
                draw += 1
            else:
                enemy_point += 1
        Match_point[0] = enemy_point
        Match_point[1] = player_point
        Match_point[2] = draw
        if player_point > enemy_point:
            result[1] = 1
        elif player_point == enemy_point:
            result[2] = 1
        else:
            result[0] = 1
        return result,Match_point # 回傳大局得分和小局得分(清單)
        
    def function_card_JQ(self, deck, card, nums):
        # 功能卡 J、Q 的函式 - 用於進階規則
        nums = nums - 1 # -1 是為了將人類邏輯轉換成python邏輯
        if card == 'J': # J 向左交換
            tmp = deck[nums - 1]
            deck[nums - 1] = deck[nums]
            deck[nums] = tmp
        if card == 'Q': # Q 向右交換
            if nums < 4:
                tmp = deck[nums + 1]
                deck[nums + 1] = deck[nums]
                deck[nums] = tmp
            else: # 位置=5的特例，因為超過清單範圍不會自己回到起點
                tmp = deck[0]
                deck[0] = deck[nums]
                deck[nums] = tmp
        return deck
    def function_card_K(self, deck1, deck2, nums):
        # 功能卡 K 的函式，用於進階規則
        nums = nums - 1
        tmp = deck2[nums] # 被交換的目標暫存至tmp變數
        deck2[nums] = deck1[nums] # 將被交換的目標複製成我方數字
        deck1[nums] = tmp # 將我方數字複製成tmp變數
        return deck1,deck2
    def function_card_JOKER(self, deck1, deck2):
        # 功能卡 Joker 的函式，用於進階規則
        return deck2,deck1 # 直接輸入的清單交換位置回傳出去
    
    def Advanceloop(self, enemy_deck, player_deck, result, Match_point):
        # 用於進階規則的三大局迴圈組件，執行一次等於開啟一大局
        enemy,player = GAME12345().BaseRule_for_Advance()
        print('對手的功能牌庫',enemy_deck)
        print('玩家的功能牌庫',player_deck)
        again = 0
        while again < 1:
            try: #若是輸入的值不符合規則，則會跳出迴圈，並提示輸入正確的格式
                card = str(input('選擇你的功能卡 : '))
                card = card.upper() # 小寫英文字自動轉換成大寫
                if card not in player_deck:
                    print('請輸入牌庫內的功能卡')
                    continue
            except:
                print('請輸入牌庫內的功能卡') # 若是輸入浮點數之類的會報錯
            again += 1    
        while again < 2:
            try:
                nums = int(input('選擇功能卡要放置的位置 1-5 : '))
                if nums > 5 or nums < 1: # 限制數字的條件
                    print('請輸入1至5區間內的數字')
                    continue
            except:
                print('請輸入指定的數字')
                continue
            again += 1
        tmp_card = random.randrange(len(enemy_deck)) # 隨機抽選0~n某個位置的數字(卡片)
        enemy_card = enemy_deck[tmp_card] # 取出該位置的卡片存到變數中
        enemy_nums = random.randrange(5) + 1 # 隨機抽選1~5，作為放置在某個位置上
        
        player_deck.remove(card) # 將玩家出過的牌移出牌庫
        enemy_deck.remove(enemy_card) # 將電腦出過的牌移出牌庫
        
        print('對手出了功能卡:',enemy_card,'放置在',enemy_nums,'位置上')
        print('玩家出了功能卡:',card,'放置在',nums,'位置上')      
        # 功能卡判斷條件，觸發順序大原則為J
        if card == 'J' or card == 'Q':
            player = GAME12345().function_card_JQ(player, card,nums)
        if enemy_card == 'J' or enemy_card == 'Q':
            enemy = GAME12345().function_card_JQ(enemy, enemy_card, enemy_nums)
        if card == 'K':
            player,enemy = GAME12345().function_card_K(player, enemy, nums)
        if enemy_card == 'K':
            player,enemy = GAME12345().function_card_K(player, enemy, enemy_nums)                
        if card == 'JK':
            player,enemy = GAME12345().function_card_JOKER(player, enemy)
        if enemy_card == 'JK':
            player,enemy = GAME12345().function_card_JOKER(player, enemy)
        
        print('盤面結果')
        print('對手的盤面', enemy)
        print('玩家的盤面', player)
        
        who_win,point = GAME12345().who_win(enemy, player)
        if who_win[0] == 1:
            print('這局你輸了')
        elif who_win[1] == 1:
            print('這局你贏了')
        else:
            print('和局')
        result = [who_win[0]+result[0], who_win[1]+result[1], who_win[2]+result[2]] 
        Match_point = [point[0]+Match_point[0], point[1]+Match_point[1], point[2]+Match_point[2]]
        print(result,Match_point) # 印出大局得分、小局得分
        return enemy_deck,player_deck,result,Match_point
            
    def AdvanceRule(self):
        enemy_deck = ['J', 'Q', 'K', 'JK'] # 對手的功能牌庫
        player_deck = ['J', 'Q', 'K', 'JK'] # 玩家的功能牌庫
        result = [0, 0, 0] # 大局記分板 # 第一個是對手得分 第二個是玩家得分 第三個是和局
        Match_point = [0, 0, 0] #小局記分板
        for i in range(3): # 三局制
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop(enemy_deck,player_deck,result,Match_point)
            if result[0] == 2:
                print('你輸了QQ')
                break
            elif result[1] == 2:
                print('你獲得了最終勝利')
                break
            elif result[2] == 2 and result[0] == 1:
                print('你輸了QQ')
                break
            elif result[2] == 2 and result[1] == 1:
                print('你獲得了最終勝利')
                break
        if result[1] == result[0]: # 加開第四局的情況有兩種[0,0,3]、[1,1,1]
            print('和局，準備加開最後一局')
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop(enemy_deck,player_deck,result,Match_point)
            if result[0] > result[1]:
                print('你輸了QQ')
            elif result[1] > result[0]:
                print('你獲得了最終勝利')
            elif Match_point[0] > Match_point[1]: # 若再和局[1,1,2]，則比較小局得分
                print('你輸了QQ')
            elif Match_point[1] > Match_point[0]:
                print('你獲得了最終勝利')
            else:
                print('和局') # 這機率應該滿低的?[0,0,4]&[1,1,2]小局比分又相同
        return result,Match_point
# =============================================================================
# 進階規則 - 自動測試區塊
# =============================================================================
    def Advanceloop_Autotest(self, enemy_deck, player_deck, result, Match_point):
        # 進階規則函式 - 用於自動測試使用(以基本規則函視為組件)
        enemy = [1, 2, 3, 4, 5] # 對手的牌
        player = [1, 2, 3, 4, 5] # 模擬玩家的牌
        random.shuffle(enemy) # 電腦的牌隨機洗牌
        random.shuffle(player)
        
        tmp_card = random.randrange(len(enemy_deck)) # 隨機抽選0~n某個位置的數字(卡片) #應該可優化成直接使用隨機清單?
        enemy_card = enemy_deck[tmp_card] # 取出該位置的卡片存到變數中
        enemy_nums = random.randrange(5) + 1 # 隨機抽選1~5，作為放置在某個位置上
        
        tmp_card = random.randrange(len(player_deck))
        card = player_deck[tmp_card] 
        nums = random.randrange(5) + 1
        
        player_deck.remove(card) # 將玩家出過的牌移出牌庫
        enemy_deck.remove(enemy_card) # 將電腦出過的牌移出牌庫    
        # 功能卡判斷條件，觸發順序大原則為J
        if card == 'J' or card == 'Q':
            player = GAME12345().function_card_JQ(player, card,nums)
        if enemy_card == 'J' or enemy_card == 'Q':
            enemy = GAME12345().function_card_JQ(enemy, enemy_card, enemy_nums)
        if card == 'K':
            player,enemy = GAME12345().function_card_K(player, enemy, nums)
        if enemy_card == 'K':
            player,enemy = GAME12345().function_card_K(player, enemy, enemy_nums)                
        if card == 'JK':
            player,enemy = GAME12345().function_card_JOKER(player, enemy)
        if enemy_card == 'JK':
            player,enemy = GAME12345().function_card_JOKER(player, enemy)
        
        who_win,point = GAME12345().who_win(enemy, player)
        result = [who_win[0]+result[0], who_win[1]+result[1], who_win[2]+result[2]] 
        Match_point = [point[0]+Match_point[0], point[1]+Match_point[1], point[2]+Match_point[2]]
        
        return enemy_deck,player_deck,result,Match_point

    def AdvanceRule_Autotest(self):
        enemy_deck = ['J', 'Q', 'K', 'JK'] # 對手的功能牌庫
        player_deck = ['J', 'Q', 'K', 'JK'] # 玩家的功能牌庫
        result = [0, 0, 0] # 大局記分板 # 第一個是對手得分 第二個是玩家得分 第三個是和局
        Match_point = [0, 0, 0] #小局記分板
        case = [0, 0, 0] # [對手勝:玩家勝:和局]
        for i in range(3): # 三局制
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop_Autotest(enemy_deck,player_deck,result,Match_point)
            if result[0] == 2: # [2,0,0],[2,1,0],[2,0,1]
                case[0] = 1
                break
            elif result[1] == 2:# [0,2,0],[1,2,0],[0,2,1]
                case[1] = 1
                break
            elif result[2] == 2 and result[0] == 1: # [1,0,2]
                case[0] = 1
                break
            elif result[2] == 2 and result[1] == 1: # [0,1,2]
                case[1] = 1
                break
        if result[1] == result[0]: # 加開第四局的情況有兩種[0,0,3]、[1,1,1]，以下為和局案例處理
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop_Autotest(enemy_deck,player_deck,result,Match_point)
            if result[0] > result[1]: # [1,0,3],[2,1,1]
                case[0] = 1
            elif result[1] > result[0]: # [0,1,3],[1,2,1]
                case[1] = 1
            elif Match_point[0] > Match_point[1]: # 若再和局[1,1,2]，則比較小局得分
                # [1,1,2]案例下，小局得分對手勝利比數
                case[0] = 1
            elif Match_point[1] > Match_point[0]:
                # [1,1,2]案例下，小局得分玩家勝利比數
                case[1] = 1
            elif result == [1,1,2] and Match_point[1] == Match_point[0]: # [1,1,2]同時小局比分又相同
                case[2] = 1 #多加條件 result == [1,1,2]為了避免[0,0,4]也被算進來，因為四和局也代表小分相同
            else:
                # [0,0,4]和局，這機率應該滿低的? 千萬次隨機測試中機率約為0.27%
                case[2] = 1
        return result,Match_point,case
    
        
    def AdvanceRule_Autotest_Case_Analysis(self):
        enemy_deck = ['J', 'Q', 'K', 'JK'] # 對手的功能牌庫
        player_deck = ['J', 'Q', 'K', 'JK'] # 玩家的功能牌庫
        result = [0, 0, 0] # 大局記分板 # 第一個是對手得分 第二個是玩家得分 第三個是和局
        Match_point = [0, 0, 0] #小局記分板
        case = [0, 0, 0, 0, 0, 0, 0, 0, 0] # 九種大局比分案例
        # 相同案例會合併作計算(因為機率相同)，如[2,0,0]和[0,2,0]算做同一案例，winner共九種案例
        # 勝利 = WIN = W；敗北 = LOSE = L；和局 = DRAW = D；勝敗都以單一視角考慮
        # [直落二: 二勝一和: 二勝一敗: 一勝二和: 二勝一敗一和: 一勝三和: 小分勝: 小分和: 四和]
        # [2W : 2W1D : 2W1L : 1W2D : 2W1L1D : 1W3D : 1W1L2D小分W : 1W1L2D小分D : 4D]
        for i in range(3): # 三局制
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop_Autotest(enemy_deck,player_deck,result,Match_point)
            if result == [2,0,0] or result == [0,2,0]: # [2,0,0],[0,2,0]
                case[0] = 1
                break
            elif result == [2,0,1] or result == [0,2,1]: # [2,0,1],[0,2,1]
                case[1] = 1
                break
            elif result == [2,1,0] or result == [1,2,0]: # [2,1,0],[1,2,0]
                case[2] = 1
                break
            elif result == [1,0,2] or result == [0,1,2]: # [1,0,2],[0,1,2]
                case[3] = 1
                break
        if result[1] == result[0]: # 加開第四局的情況有兩種[1,1,1],[0,0,3]，以下為和局案例處理
            enemy_deck,player_deck,result,Match_point = GAME12345().Advanceloop_Autotest(enemy_deck,player_deck,result,Match_point)
            if result == [2,1,1] or result == [1,2,1]: # [2,1,1],[1,2,1]
                case[4] = 1
            elif result == [1,0,3] or result == [0,1,3]: # [1,0,3],[0,1,3]
                case[5] = 1
            elif result == [1,1,2] and Match_point[0] > Match_point[1]: # 若再和局[1,1,2]，則比較小局得分
                # [1,1,2]案例下，小局得分對手勝利比數
                case[6] = 1
            elif result == [1,1,2] and Match_point[1] > Match_point[0]:
                # [1,1,2]案例下，小局得分玩家勝利比數
                case[6] = 1
            elif result == [1,1,2] and Match_point[1] == Match_point[0]: # [1,1,2]同時小局比分又相同
                case[7] = 1
            else:
                # [0,0,4]和局，這機率應該滿低的? # 多次一百萬次隨機測試中完全沒有出現該案例，證明該案例為不可能出現的情況
                case[8] = 1
        return result,Match_point,case
    
    
if __name__ == '__main__':
    # GAME12345().BaseRule() #基本規則版本
    GAME12345().AdvanceRule() #進階規則版本
    again = 0
    while again < 1:
        try:
            YNlist = ['Y','N']
            more = str(input('你要再玩一次嗎? : (Y/N)'))
            more = more.upper()
            if more not in YNlist:
                print('請輸入Y/N')
                continue
            if more == 'Y':
                # GAME12345().BaseRule() #基本規則版本
                GAME12345().AdvanceRule() #進階規則版本
                again += -1
            elif more == 'N':
                None
        except:
            print('請輸入Y/N')
        again += 1

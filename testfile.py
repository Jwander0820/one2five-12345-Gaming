# -*- coding: utf-8 -*-
from one2five_Gaming import *

# 功能區塊
# GAME12345().BaseRule() #基本規則版本
    
# GAME12345().AdvanceRule() #進階規則版本

# 測試區塊1 : 模擬基本規則的對決
enemy_point_sum = 0
player_point_sum = 0
draw_sum = 0
for i in range(100): 
    input_list = [1,2,3,4,5]
    random.shuffle(input_list)
    ep,pp,d = GAME12345().BaseRule_Autotest(input_list)
    # 一局基本規則下，ep = 對方所得點數，pp = 玩家所得點數
    enemy_point_sum = enemy_point_sum + ep #統計多局下雙方得點的總和
    player_point_sum = player_point_sum + pp
    draw_sum = draw_sum + d
print(enemy_point_sum,player_point_sum,draw_sum)
# 測試結果模擬基本規則下對局一百萬次，結果為[2001117,2001204,997679]
# 對手勝利與玩家勝利比數接近，比例約為2:2:1
# 隨機對決的測試結果為具有公平性

# 測試區塊2 : 模擬進階規則的對決

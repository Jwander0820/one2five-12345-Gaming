# -*- coding: utf-8 -*-
from one2five_Gaming import *

enemy_point_sum = 0
player_point_sum = 0
for i in range(100): # 模擬對決
    input_list = [1,2,3,4,5]
    random.shuffle(input_list)
    ep,pp = GAME12345().Autoversion(input_list)
    
    enemy_point_sum = enemy_point_sum + ep
    player_point_sum = player_point_sum + pp

# print(enemy_point_sum,player_point_sum)

x = [1,0,0]
y = [1,1,0]
y = [x[0]+y[0],x[1]+y[1],x[2]+y[2]]
print(y)
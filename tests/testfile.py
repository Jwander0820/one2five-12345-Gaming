# -*- coding: utf-8 -*-
from one2five_Gaming import *
import time

# =============================================================================
# 功能區塊
# =============================================================================

# GAME12345().BaseRule() #基本規則版本
# GAME12345().AdvanceRule() #進階規則版本

# =============================================================================
# 測試區塊
# =============================================================================
# 四種測試案例
# 測試案例1 : 模擬基本規則的對決 - 勝敗情況簡易分析
# 測試案例2 : 模擬基本規則的對決 - 勝敗案例分析
# 測試案例3 : 模擬進階規則的對決 - 勝敗情況簡易分析
# 測試案例4 : 模擬進階規則的對決 - 勝敗案例分析

test_case = 0

# 測試案例1 : 模擬基本規則的對決 - 勝敗情況簡易分析
if test_case == 1:
    # 百萬次測試時間約10秒
    result = [0, 0, 0] # 大局得分(在基本測試中則代表勝利的次數)
    Match_point = [0, 0, 0] # 小局得分
    # 順序 => [對手勝利次數, 玩家勝利次數. 和局數]
    time_start = time.time()
    
    for i in range(100000): 
        input_list = [1,2,3,4,5]
        random.shuffle(input_list) # 將輸入隨機洗牌
        oneset,setpoint = GAME12345().BaseRule_Autotest(input_list)
        # oneset為一輪的勝負(大局得分)，setpoint為5小局得分
        result = [oneset[0]+result[0], oneset[1]+result[1], oneset[2]+result[2]] 
        Match_point = [setpoint[0]+Match_point[0], setpoint[1]+Match_point[1], setpoint[2]+Match_point[2]]
    print(result,Match_point)
    
    time_end = time.time()
    time_c = time_end - time_start
    print('time cost : ', time_c)
    
    # 測試結果模擬基本規則下對局一千萬次，結果為小局得分總和比[19999895, 19997129, 10002976]
    # 對手勝利與玩家勝利比數[3667487, 3666824, 2665689]
    # 勝率約為36.67% (敗率相同)；和局機率為26.65%
    # 證明基本規則的遊戲方式具有公平性


# 測試案例2 : 模擬基本規則的對決 - 勝敗案例分析
if test_case == 2:
    case_sum = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] # 12種案例對應各種情況
    time_start = time.time()
    
    for i in range(100000): 
        input_list = [1,2,3,4,5]
        random.shuffle(input_list) # 將輸入隨機洗牌
        case = GAME12345().BaseRule_Autotest_Case_Analysis(input_list)
    
        case_sum = [case_sum[0]+case[0], case_sum[1]+case[1], case_sum[2]+case[2]
                      , case_sum[3]+case[3], case_sum[4]+case[4], case_sum[5]+case[5]
                      , case_sum[6]+case[6], case_sum[7]+case[7], case_sum[8]+case[8]
                      , case_sum[9]+case[9], case_sum[10]+case[10], case_sum[11]+case[11]]
    print(case_sum)
    
    time_end = time.time()
    time_c = time_end - time_start
    print('time cost : ', time_c)
    # 測試結果模擬基本規則下對局一千萬次，結果為:
    # [501110, 666584, 0, 500256, 2501965, 666936, 0, 1500783, 998918, 83358, 831089, 1749001]
    # [5.00, 6.66, 0, 5.00, 25.00, 6.66, 0, 15.00, 10.00, 0.83, 8.33, 17.5] 百分率(%)
    # [0,1,4],[1,0,4]和[2,0,3],[0,2,3]為不可能發生的情況，因為和局代表卡片完全相同
    # 四和局會剩下一張卡，必然和局，而三和局會剩下兩張卡，必然和局[0,0,5]或一勝一敗[1,1,3]
    
# 測試案例3 : 模擬進階規則的對決 - 勝敗情況簡易分析
if test_case == 3:
    # 百萬次測試時間約49秒
    result = [0, 0, 0] # 大局得分
    Match_point = [0, 0, 0] # 小局得分
    case = [0, 0, 0]# [對手勝利次數:玩家勝利次數:和局數]
    time_start = time.time()
    
    for i in range(100000): 
        oneset,setpoint,who_win = GAME12345().AdvanceRule_Autotest()
        # oneset為大局得分，setpoint為小局得分總和，who_win為一輪的勝負[對方勝,玩家勝,和局]
        result = [oneset[0]+result[0], oneset[1]+result[1], oneset[2]+result[2]] 
        Match_point = [setpoint[0]+Match_point[0], setpoint[1]+Match_point[1], setpoint[2]+Match_point[2]]
        case = [who_win[0]+case[0], who_win[1]+case[1], who_win[2]+case[2]]
    print(result,Match_point,case)
    
    time_end = time.time()
    time_c = time_end - time_start
    print('time cost : ', time_c)
    # 測試結果模擬基本規則下對局一千萬次，結果為小局得分總和比[11237776, 11232699, 6760162]
    # 對手勝利與玩家勝利比數為[4915482, 4912730, 171788]
    # 勝率約為49.14% (拜率相同)；和局機率為1.72%
    # 證明進階規則的遊戲方式具有公平性 (一億次的結果類似，和局率為1.72%)


# 測試案例4 : 模擬進階規則的對決 - 勝敗案例分析
# 相同案例會合併作計算(因為機率相同)，如[2,0,0]和[0,2,0]算做同一案例，共九種案例
# 勝利 = WIN = W；敗北 = LOSE = L；和局 = DRAW = D；勝敗都以單一視角考慮
# [直落二: 二勝一和: 二勝一敗: 一勝二和: 二勝一敗一和: 一勝三和: 小分勝: 小分和: 四和]
# [2W : 2W1D : 2W1L : 1W2D : 2W1L1D : 1W3D : 1W1L2D小分W : 1W1L2D小分D : 4D]
if test_case == 4:
    result = [0, 0, 0] # 大局得分
    Match_point = [0, 0, 0] # 小局得分
    case = [0, 0, 0, 0, 0, 0, 0, 0, 0] # 九種案例對應其發生次數
    # [2W : 2W1D : 2W1L : 1W2D : 2W1L1D : 1W3D : 1W1L2D小分W : 1W1L2D小分D : 4D]
    time_start = time.time()
    
    for i in range(100000): 
        oneset,setpoint,who_win = GAME12345().AdvanceRule_Autotest_Case_Analysis()

        result = [oneset[0]+result[0], oneset[1]+result[1], oneset[2]+result[2]] 
        Match_point = [setpoint[0]+Match_point[0], setpoint[1]+Match_point[1], setpoint[2]+Match_point[2]]
        case = [who_win[0]+case[0], who_win[1]+case[1], who_win[2]+case[2]
                  , who_win[3]+case[3], who_win[4]+case[4], who_win[5]+case[5]
                  , who_win[6]+case[6], who_win[7]+case[7], who_win[8]+case[8]]
    print(result,Match_point,case)
    
    time_end = time.time()
    time_c = time_end - time_start
    print('time cost : ', time_c)
    
    # 模擬進階規則對決一億次，case為九種案例的次數
    # [29520439, 13720297, 22657791, 12307907, 15831291, 939762, 3301985, 1445275, 275253]
    # [29.52, 13.72, 22.66, 12.31, 15.83, 0.94, 3.30, 1.45, 0.27] # 百分率(%)









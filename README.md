# 1-2-3-4-5 遊戲

# 基本規則
類似剪刀石頭布，改為12345，共五次出拳機會，且不能重複

**1,2,3,4,5 五個數字共五局，一次出一種數字，且不能重複，每個數字都要出一次**

* 數字越大者 勝利
* 但 1 勝過 5
* 但 2 勝過 4


基本規則的遊戲

1. 使用Github Pages部屬的靜態網頁!
https://jwander0820.github.io/one2five-12345-Gaming/

    玩家為下方黑桃撲克牌，拖曳卡牌到個人的置牌區中會自動放入卡牌，依序由左至右擺放，五張卡牌出完將紀錄勝負結果於上方表格中，
點擊Restart即可重新開啟新一局遊戲。


2. Python環境
```Python
from one2five_Gaming import *
GAME12345().BaseRule()
```

3. Windows EXE 

    windows系統下可以執行 **one2five_Gaming_BaseRule.exe**

## 細則
1 勝過 5 <br> 
2 勝過 1, 4 <br> 
3 勝過 1, 2 <br> 
4 勝過 1, 3 <br> 
5 勝過 2, 3, 4 <br>

## 基本規則範例
對手依序出了 [ 3, 2, 1, 4, 5 ] <br> 
玩家依序出了 [ 5, 4, 2, 3, 1 ] <br>


局數|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 3| 2| 1| 4| 5
玩家| 5| 4| 2| 3| 1
勝負|WIN|LOSE|WIN|LOSE|WIN


最終結果 : 玩家勝利

***

# 進階規則
1. 以基本規則為基礎，**一局的流程為一輪基本規則+雙方比拚功能卡**，共三大局，三局內比分高者勝利

2. **四種不同功能卡在遊戲中僅能各使用一次，選定功能卡放置在指定位置上發動效果**

3. 若三局雙方比分相同則加開第四局，若再和局則往下比較小局賽點分數總和，比分高者勝利


進階規則的遊戲
```
from one2five_Gaming import *
GAME12345().AdvanceRule()
```
或是在windows系統下可以執行 **one2five_Gaming_AdvancedRule.exe**

## 功能卡說明
**新增 J、Q、K、JOKER 四張功能卡**

**功能卡說明** : 整場遊戲僅能使用一次，使用過後接下來就不能使用同一張功能卡

* J : 將指定位置的牌 **向左交換** *(若卡牌放在最左邊則是跟最右邊的卡牌交換位置)*
* Q : 將指定位置的牌 **向右交換** *(若卡牌放在最右邊則是跟最左邊的卡牌交換位置)*
* K : 將指定位置的牌 **與對手同位置的牌交換** *(J、Q使用完後發動 )*
* JOKER : 雙方玩家的 **局面互換** *(最後發動 )*

遊戲的判斷機制為，J、Q先觸發，K再觸發，最後才觸發JOKER (J = Q > K > JOKER)(觸發順序為玩家的卡先觸發)

**位置說明**
-|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
位置| **1**| **2**| **3**| **4**| **5**
對手| x| x| x| x| x
玩家| x| x| x| x| x

**依照出牌的順序作排列，第一局的牌即稱為位置1，第二局的牌稱為位置2，依此類推**

### 第四局

若是在三局比完後出現比分相同的情況，則再加開最後一局比賽，比分高者勝

加開第四局的規則

1. 基礎版 : 雙方再對決一局，拿出剩下的功能卡對決 (已完成)
2. 瘋狂版 : 雙方再對決一局<br> 
  a. 四張功能卡都能使用，選用一張，一決勝負 <br> 
  b. 四張功能卡都能使用，可選用多張，功能卡位置不能重複，一決勝負 <br> 
  c. 四張功能卡都能使用，而雙方依序四次動作，一次可以出一張卡 or 不出，每次出完功能卡便整理局勢 
  四次動作結束後，結算遊戲 <br>
  
  
  
#註記1:或許瘋狂版的三種情況可以抽出來做成單一局決勝負的版本(基本規則一局後加上功能卡去操作局勢)

#註記2:或許可以加入條件，例如在三大局結束後若是和局，可以透過判斷剩下的功能卡加上小局的分數作勝負的判斷，
例如剩下了J、Q功能卡可以小局分數+1、K+2、JOKER+3，加到雙方小局分數後再比較分數，分數高者勝


## 進階規則範例
**第一大局**，經過一輪後(五小局) <br>
對手依序出了 [ 3, 2, 1, 4, 5 ] <br> 
玩家依序出了 [ 4, 5, 2, 3, 1 ] <br>
下方為雙方玩家使用功能卡並放置在各自位置時的盤面 <br>


**0. 對方使用功能卡Q放置在位置2上，玩家使用功能卡K放置在位置4上**

第一大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手功能卡| |Q| | |
對手| 3| 2| 1| 4| 5
玩家| 4| 5| 2| 3| 1
玩家功能卡| | | | K|

**1. 首先對手使用功能卡Q在位置2上，所以將對手盤面位置2和位置3的數字互換(向右交換)(2 <=> 1)**

第一大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 3| **1**| **2**| 4| 5
玩家| 4| 5| 2| 3| 1
玩家功能卡| | | | K|

**2. 接下來玩家使用功能卡K在位置4上，所以將位置4上的卡與對手相同位置上的卡互換(3 <=> 4)**

第一大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 3| 1| 2| **3**| 5
玩家| 4| 5| 2| **4**| 1

**3. 第一大局盤整完畢，第一大局結果為平手(和局)**

第一大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 3| 1| 2| 3| 5
玩家| 4| 5| 2| 4| 1
勝負|WIN|LOSE|DRAW|WIN|WIN

**4. 大局得分| 對手 : 玩家 : 和局 | 0 : 1 : 0 ； (小局得分| 對手 : 玩家 : 和局 | 1: 3 : 1 )**
***
**第二大局** <br>
對手依序出了 [ 3, 1, 4, 5, 2 ] <br> 
玩家依序出了 [ 1, 5, 4, 3, 2 ] <br>
下方為雙方玩家使用功能卡並放置在各自位置時的盤面 <br>
**0. 對方使用功能卡JK放置在位置5上，玩家使用功能卡J放置在位置1上**

第二大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手功能卡| | | | | JK
對手| 3| 1| 4| 5| 2
玩家| 1| 5| 4| 3| 2
玩家功能卡| J| | | |

**1. 首先玩家使用功能卡J在位置1上，所以將玩家盤面的位置1和位置5的數字互換(1 <=> 2)**

第二大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手功能卡| | | | | JK
對手| 3| 1| 4| 5| 2
玩家| **2**| 5| 4| 3| **1**

**2. 接下來對手使用功能卡JK，所以將雙方玩家的盤面互換**

第二大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 2| 5| 4| 3| 1
玩家| 3| 1| 4| 5| 2

**3. 第二大局盤整完畢，第二大局結果為玩家勝利**

第二大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 2| 5| 4| 3| 1
玩家| 3| 1| 4| 5| 2
勝負|WIN|WIN|DRAW|WIN|WIN

**4. 大局得分| 對手 : 玩家 : 和局 | 0 : 2 : 0 ； (小局得分| 對手 : 玩家 : 和局 | 1 : 7 : 2 )**


**最終玩家獲勝**

***
<br> <br> <br> <br>

## 基本規則案例分析
案例分析實作參見testfile的測試案例1、2
### 基本規則的遊戲勝率
雙方**隨機出牌**的情況下，模擬基本規則下對局一千萬次 

[對手勝利局數 , 玩家勝利局數 , 和局數] = [3667487, 3666824, 2665689] <br>
遊戲的勝(敗)率約為36.67%；和局機率約為26.65% <br>
基本規則的遊戲方式具有公平性 <br>

### 基本規則的所有情況案例分析

雙方**隨機出牌**的情況下，模擬基本規則下對局一千萬次 <br>
同一種組合的勝敗視為同一種案例，僅分析該案例出現的機率，合併共12種案例 <br>
注意:以下的可能性組合為一小局內的組合 <br>

案例|可能性|可能性|發生機率
:---:|:---:|:---:|---:
#0 |[5,0,0]|[0,5,0] |  5.00 %
#1 |[4,1,0]|[1,4,0] |  6.66 %
#2 |[0,1,4]|[1,0,4] |  **0.00 %**
#3 |[4,0,1]|[0,4,1] |  5.00 %
#4 |[3,2,0]|[2,3,0] | 25.00 %
#5 |[3,0,2]|[0,3,2] |  6.66 %
#6 |[2,0,3]|[3,0,2] |  **0.00 %**
#7 |[3,1,1]|[1,3,1] | 15.00 %
#8 |[2,1,2]|[1,2,2] | 10.00 %
#9 |[0,0,5]|	   |  **0.83 %**
#10 |[1,1,3]|	   |  8.33 %
#11 |[2,2,1]|	   | 17.50 %

原始數據，依序#0 ~ #11 共12種案例 <br>
[501110, 666584, 0, 500256, 2501965, 666936, 0, 1500783, 998918, 83358, 831089, 1749001] <br>


## 進階規則案例分析
案例分析實作參見testfile的測試案例3、4
### 進階規則的遊戲勝率
雙方**隨機出牌**的情況下，模擬基本規則下對局一千萬次

[對手勝利局數 , 玩家勝利局數 , 和局數] = [4915482, 4912730, 171788] <br>
遊戲的勝(敗)率約為49.14%；和局機率約為1.72% <br>
進階規則的遊戲方式具有公平性 <br>

### 進階規則的所有情況案例分析
雙方**隨機出牌**的情況下，模擬進階規則下對局一億次 <br>
同一種組合的勝敗視為同一種案例，僅分析該案例出現的機率，合併共9種案例 <br>
注意:以下的可能性組合為完整一輪進階規則下可能的**大局比數**產生的勝敗 <br>

案例|可能性|可能性|發生機率
:---:|:---:|:---:|---:
#0 |[2,0,0]|[0,2,0] |29.52 %
#1 |[2,0,1]|[0,2,1] |13.72 %
#2 |[2,1,0]|[1,2,0] |22.66 %
#3 |[1,0,2]|[0,1,2] |12.31 %
#4 |[2,1,1]|[1,2,1] |15.83 %
#5 |[1,0,3]|[0,1,3] |**0.94 %**
#6 |[1,1,2]|+小分勝利 |3.30 %
#7 |[1,1,2]|+小分和局 |1.44 %
#8 |[0,0,4]| |**0.27 %**

原始數據，依序#0 ~ #8 共9種案例 <br>
[29520439, 13720297, 22657791, 12307907, 15831291, 939762, 3301985, 1445275, 275253] <br>

***

以上的案例分析完全是基於**隨機出牌**的情況下，也就是J、Q、K、Joker等功能卡也是隨便擺放在任意位置上，完全沒有考慮盤面的情況，
因此僅能說明在隨機的情況下不同案例的發生機率，若是加入了玩家的思考可能會讓案例的發生機率(or玩家個人勝率)產生變化。<br>

舉例說明，對手盤面[2,3,5,4,1] : 玩家盤面[1,2,3,4,5]，此刻對手盤面占盡優勢，但是已知對手沒有Joker而我方有Joker，
玩家的思考下通常會做出**正確**的選擇，使用Joker穩穩拿下一局勝利(此案例下對手無法故意讓自己輸再被Joker反轉)，而對手則要想辦法降低對手小局得分等等。
若是在隨機的情況下，往往不一定做出最正確的選擇，因此仍會有所差異。
所剩功能卡| J | Q | K |Joker
:---:|:---:|:---:|:---:|:---:
對手| J| Q| K| 
玩家| | Q| K| Joker

第二大局|第一局|第二局|第三局|第四局|第五局
:---:|:---:|:---:|:---:|:---:|:---:
對手| 2| 3| 5| 4| 1
玩家| 1| 2| 3| 4| 5

思考層面 範例<br>
1. 對手假定玩家使用Joker情況下，對手要將小局得分降到最低的情況下只有 J5 or Q4 這兩種選擇(讓自己故意輸兩小局)，將小局得分變成3:2 <br>
2. 而玩家搞不好可以再多一層思考，若是賭對方會將4和1互換將傷害減至最小的情況，或許可以不使用Joker，而是使用K3，
將玩家的3與對手的5互換，如此一來若是對手下J5 or Q4 的情況再加上K3的互換，可以讓玩家方不用使出Joker仍能取得勝利<br>

<br>
玩家的思考層面是有許多變化的，或許能找到不同情況下的相對最佳解，進而提高勝率

我相信玩家vs隨機電腦的勝率一定會比隨機vs隨機的勝率來的高，也許也能嘗試使用機器學習去模擬對局XD



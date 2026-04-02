// main.ink - 游戏主故事入口
// 江湖神医 - 完整故事线

INCLUDE common.ink
INCLUDE chapter1.ink

// ==================== 游戏开场 ====================

-> game_start

=== game_start ===
# background: title
# music: main_theme

江湖神医

一款以中医为题材的卡牌 roguelike 游戏

* [开始游戏] -> intro
* [加载存档] -> load_game

=== intro ===
# background: ink_painting
# music: peaceful

大周朝，天下大乱，瘟疫四起。

你是一位刚入行的游方郎中，背着祖传的医书药箱，行走江湖，治病救人。

你的目标是：成为闻名天下的神医。

* [踏上江湖之路] -> chapter1_start

=== load_game ===
{ 
    - loadGame():
        存档加载成功。
        -> continue_game
    - else:
        没有找到存档。
        -> game_start
}

=== continue_game ===
你继续之前的旅程...

{ chapter1_completed:
    -> chapter2_start
- else:
    -> chapter1_start
}

=== chapter2_start ===
# background: city
# music: city_theme

第二章 · 进城

你的名声传到了县城，这里的病人更多，病情也更复杂。

（第二章内容待续...）

-> END

// ==================== 外部函数 ====================

EXTERNAL loadGame()

=== function loadGame ===
// 由 JavaScript 实现
~ return false

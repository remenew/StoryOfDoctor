// common.ink - 公共函数和变量
// 所有故事文件都应该 INCLUDE 这个文件

// ==================== 全局变量 ====================

VAR player_name = "游方郎中"
VAR reputation = 0
VAR money = 100
VAR day = 1

// 章节进度
VAR chapter1_completed = false
VAR chapter2_unlocked = false

// 统计
VAR total_patients_healed = 0
VAR total_battles_won = 0
VAR total_battles_lost = 0

// ==================== 外部函数声明 ====================

// 游戏系统函数（由 JavaScript 实现）
EXTERNAL getCurrentLocation()
EXTERNAL getCurrentPatient()
EXTERNAL getPatientName()
EXTERNAL getPatientsCount()
EXTERNAL modifyReputation(amount)
EXTERNAL modifyMoney(amount)
EXTERNAL startBattle(patientId)
EXTERNAL goToMap()
EXTERNAL showMessage(message)
EXTERNAL log(message)

// ==================== 常用函数 ====================

// 增加声望
=== function add_rep(amount)
    ~ reputation += amount
    { modifyReputation(amount) }

// 减少声望
=== function sub_rep(amount)
    ~ reputation -= amount
    { modifyReputation(-amount) }

// 增加金钱
=== function add_money(amount)
    ~ money += amount
    { modifyMoney(amount) }

// 减少金钱
=== function sub_money(amount)
    ~ money -= amount
    { modifyMoney(-amount) }

// 记录病人治愈
=== function patient_healed
    ~ total_patients_healed += 1

// 记录战斗胜利
=== function battle_won
    ~ total_battles_won += 1

// 记录战斗失败
=== function battle_lost
    ~ total_battles_lost += 1

// ==================== 条件判断函数 ====================

// 检查是否有足够金钱
=== function has_money(amount)
    ~ return money >= amount

// 检查声望等级
=== function get_rep_level
    { reputation >= 50:
        ~ return "著名"
    - else:
        { reputation >= 20:
            ~ return "有名"
        - else:
            { reputation >= 0:
                ~ return "普通"
            - else:
                ~ return "无名"
            }
        }
    }

// 获取旁白描述文本
=== function get_narrator_text(location)
    { location == "村口":
        ~ return "村口的老槐树下，几位村民神色焦急地等待着。"
    - else:
        { location == "集市":
            ~ return "集市上人来人往，一位病人躺在药铺门口，面色苍白。"
        - else:
            { location == "客栈":
                ~ return "客栈的大堂里，店小二正在照顾一位咳嗽不止的客人。"
            - else:
                { location == "码头":
                    ~ return "码头的渔船上，一位渔夫捂着胸口，痛苦地呻吟着。"
                - else:
                    ~ return "你来到了目的地，看到等待治疗的病人。"
                }
            }
        }
    }

// ==================== 常用对话模板（隧道）====================

// 村民对话开场
=== villager_greeting ===
{~村民：大夫！您可来了！|村民：救命啊大夫！|村民：太好了，有大夫来了！}
->->

// 病人感谢
=== patient_thanks ===
{~多谢大夫救命之恩！|大夫真是神医啊！|感激不尽，大夫！|谢谢大夫，我感觉好多了！}
->->

// 病人失望
=== patient_disappointed ===
{~唉，看来我的病难治啊...|难道没救了吗...|罢了罢了...|也许这就是我的命吧...}
->->

// 旁白描述（隧道版本）
=== narrator_description(location) ===
{ location == "村口":
    村口的老槐树下，几位村民神色焦急地等待着。
- else:
    { location == "集市":
        集市上人来人往，一位病人躺在药铺门口，面色苍白。
    - else:
        { location == "客栈":
            客栈的大堂里，店小二正在照顾一位咳嗽不止的客人。
        - else:
            { location == "码头":
                码头的渔船上，一位渔夫捂着胸口，痛苦地呻吟着。
            - else:
                你来到了目的地，看到等待治疗的病人。
            }
        }
    }
}
->->

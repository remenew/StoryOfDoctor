# 江湖神医 - 技术架构文档

**版本**: v1.1  
**日期**: 2026-03-31  
**技术栈**: Phaser 3 + Vite + JavaScript (ES6+)

---

## 目录

1. [项目概述](#一项目概述)
2. [技术架构](#二技术架构)
3. [功能架构](#三功能架构)
4. [数据流程](#四数据流程)
5. [核心系统详解](#五核心系统详解)
6. [项目结构](#六项目结构)
7. [配置文件说明](#七配置文件说明)

---

## 一、项目概述

### 1.1 项目定位
《江湖神医》是一款以中医为题材的卡牌 roguelike 游戏，玩家扮演游方郎中，通过卡牌组合治疗疾病，在乱世中成长。

### 1.2 核心玩法
- **卡牌战斗**: 使用草药卡牌治疗疾病
- **组合技系统**: 君臣佐使配伍触发组合效果
- **技能系统**: 独立技能槽，回合冷却机制
- **疾病系统**: 基于真实中医疾病数据

### 1.3 技术选型
| 技术 | 用途 | 版本 |
|------|------|------|
| Phaser 3 | 游戏引擎 | v3.80.1 |
| Vite | 构建工具 | v5.4.x |
| JavaScript | 开发语言 | ES6+ |
| iconv-lite | 编码转换 | (CSV处理) |

---

## 二、技术架构

### 2.1 整体架构图

```
┌─────────────────────────────────────────────────────────────┐
│                        游戏层 (Game Layer)                   │
├─────────────────────────────────────────────────────────────┤
│  BattleScene    MapScene    MenuScene    ResultsScene       │
│       │            │           │             │              │
├───────┼────────────┼───────────┼─────────────┼──────────────┤
│                    系统层 (System Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  BattleSystem   DeckSystem   ComboSystem   SkillSystem      │
│       │            │            │             │              │
│  DiseaseAttack  DiseaseCard  PlayerAttr    EconomySystem    │
│  DeckBuilder    System       ibutesSystem                   │
├─────────────────────────────────────────────────────────────┤
│                    对象层 (Object Layer)                     │
├─────────────────────────────────────────────────────────────┤
│  Card    Disease    Patient    Enemy    ComboDetector       │
├─────────────────────────────────────────────────────────────┤
│                    数据层 (Data Layer)                       │
├─────────────────────────────────────────────────────────────┤
│  cards.json  diseases.json  combos.json  levels.json        │
│  skills.json patients.json  herbs.csv   formula.csv         │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 场景架构

```
BootScene (启动)
    │
    ▼
MenuScene (菜单)
    │
    ▼
MapScene (地图)
    │
    ├──► BattleScene (战斗) ──► ResultsScene (结果)
    │       │
    │       └──► 返回 MapScene
    │
    └──► 其他场景 (商店、事件等)
```

### 2.3 核心设计模式

#### 2.3.1 注册表模式 (Registry Pattern)
```javascript
// BootScene.js
this.registry.set('cardsData', cardsData);
this.registry.set('diseasesData', diseasesData);
this.registry.set('combosData', combosData);
```

#### 2.3.2 状态机模式 (State Machine)
```javascript
// BattleSystem.js
const PHASES = {
  DISEASE_INTENT: 'disease_intent',    // 疾病意图阶段
  PLAYER_PLAY: 'player_play',          // 玩家出牌阶段
  RESOLUTION: 'resolution',            // 结算阶段
  END_TURN: 'end_turn'                 // 回合结束
};
```

#### 2.3.3 观察者模式 (Observer Pattern)
```javascript
// 事件驱动架构
this.events.on('card-played', this.onCardPlayed, this);
this.events.on('combo-triggered', this.onComboTriggered, this);
this.events.on('turn-ended', this.onTurnEnded, this);
```

---

## 三、功能架构

### 3.1 功能模块图

```
┌────────────────────────────────────────────────────────────┐
│                      核心功能模块                           │
├─────────────┬─────────────┬─────────────┬────────────────┤
│   战斗系统   │   卡牌系统   │   疾病系统   │    经济系统     │
├─────────────┼─────────────┼─────────────┼────────────────┤
│ • 回合管理  │ • 牌库管理  │ • 疾病数据  │ • 收入支出     │
│ • 阶段控制  │ • 抽牌弃牌  │ • 攻击卡组  │ • 每日结算     │
│ • 胜负判定  │ • 卡牌效果  │ • 有效草药  │ • 商店交易     │
├─────────────┼─────────────┼─────────────┼────────────────┤
│   技能系统   │   组合技系统 │   病人系统   │    地图系统     │
├─────────────┼─────────────┼─────────────┼────────────────┤
│ • 技能槽    │ • 滑动检测  │ • 属性管理  │ • 节点导航     │
│ • 冷却管理  │ • 效果触发  │ • 好感度    │ • 事件触发     │
│ • 效果应用  │ • 加成计算  │ • 治疗加成  │ • 进度保存     │
└─────────────┴─────────────┴─────────────┴────────────────┘
```

### 3.2 核心功能详解

#### 3.2.1 战斗系统 (BattleSystem)
```javascript
class BattleSystem {
  // 核心职责
  - 管理战斗阶段流转
  - 处理回合逻辑
  - 判定胜负条件
  - 协调各子系统
  
  // 主要方法
  + startBattle(diseaseId)     // 开始战斗
  + playCard(card)             // 出牌
  + endPlayerTurn()            // 结束玩家回合
  + resolveDiseaseAttack()     // 结算疾病攻击
  + checkWinCondition()        // 检查胜利条件
}
```

#### 3.2.2 卡牌系统 (DeckSystem)
```javascript
class DeckSystem {
  // 核心职责
  - 管理牌库生命周期
  - 处理抽牌弃牌逻辑
  - 根据疾病构建卡组
  
  // 主要方法
  + initializeDeck(cardIds)           // 初始化牌库
  + buildBattleDeckFromDisease(id)    // 根据疾病构建卡组
  + drawCards(count)                  // 抽牌
  + discardCard(cardId)               // 弃牌
  + shuffle()                         // 洗牌
}
```

#### 3.2.3 疾病卡牌系统 (DiseaseCardSystem)
```javascript
class DiseaseCardSystem {
  // 核心职责
  - 管理疾病与草药关联
  - 构建战斗卡组
  - 计算草药攻击力
  
  // 主要方法
  + getEffectiveHerbs(diseaseId)      // 获取有效草药
  + buildBattleDeck(diseaseId)        // 构建战斗卡组
  + isEffectiveHerb(diseaseId, herb)  // 判断是否有效
  + getHerbAttack(diseaseId, herb)    // 获取草药攻击力
}
```

#### 3.2.4 疾病攻击卡组构建器 (DiseaseAttackDeckBuilder)
```javascript
class DiseaseAttackDeckBuilder {
  // 核心职责
  - 根据疾病病机构建攻击卡组
  - 生成外感六淫、内伤七情、不内外因攻击牌
  - 生成大招牌
  
  // 构建逻辑
  1. 解析病机要点 → 提取外感六淫牌
  2. 随机抽取内伤七情牌 (1-2张)
  3. 随机抽取不内外因牌 (1-2张)
  4. 生成大招牌 (攻击力×2-5倍)
}
```

---

## 四、数据流程

### 4.1 战斗流程数据流

```
┌─────────────┐
│  开始战斗    │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  DiseaseCardSystem.buildBattleDeck()    │
│  - 从 diseases.json 获取 effectiveHerbs │
│  - 匹配 cards.json 中的草药卡牌         │
│  - 随机抽取其他草药凑成10张             │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  DeckSystem.initializeDeck()            │
│  - 存储卡牌额外数据 (attack, role等)    │
│  - 初始化抽牌堆、弃牌堆                 │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  BattleScene.drawCards()                │
│  - 抽取5张手牌                          │
│  - 合并卡牌数据与额外数据                 │
│  - 创建 Card 对象                       │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  玩家出牌 → Card.play()                 │
│  - 计算治疗效果: baseHeal + attack      │
│  - 应用品质加成                         │
│  - 触发组合技检测                       │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  ComboSystem.detectCombos()             │
│  - 滑动窗口检测已出牌序列               │
│  - 匹配 combos.json 中的组合条件        │
│  - 触发组合技效果                       │
└─────────────────────────────────────────┘
       │
       ▼
┌─────────────────────────────────────────┐
│  BattleSystem.resolveDiseaseAttack()    │
│  - 疾病抽取攻击意图                     │
│  - 应用伤害到病人                       │
│  - 检查游戏结束条件                     │
└─────────────────────────────────────────┘
```

### 4.2 疾病-草药数据关联流程

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   disease.csv   │────▶│   formula.csv   │────▶│   herbs.csv     │
│   (疾病数据)     │     │   (方剂数据)     │     │   (草药数据)     │
└─────────────────┘     └─────────────────┘     └─────────────────┘
        │                       │                       │
        │ 代表方剂              │ 方解                  │ 名称匹配
        │                       │                       │
        ▼                       ▼                       ▼
┌─────────────────────────────────────────────────────────────────┐
│              diseases.json (合并后)                              │
│  {                                                               │
│    id: "lung_0000",                                              │
│    name: "感冒风寒束表证",                                        │
│    formula: "荆防败毒散",                                        │
│    effectiveHerbs: [                                             │
│      { name: "荆芥", role: "君", attack: 20 },                   │
│      { name: "防风", role: "臣", attack: 15 },                   │
│      ...                                                         │
│    ]                                                             │
│  }                                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 治疗效果计算流程

```
┌─────────────────────────────────────────────────────────────┐
│  治疗效果计算 (Card.getFinalHealValue())                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  IF 是有效药物 (isEffective = true):                        │
│    基础治疗值 = card.data.effects.heal.value               │
│    攻击力加成 = card.attack (君20/臣15/佐10/使5)            │
│    最终治疗值 = 基础治疗值 + 攻击力加成                     │
│                                                             │
│  ELSE (非有效药物):                                         │
│    最终治疗值 = card.attack (-10 ~ +10 随机值)              │
│                                                             │
│  品质加成:                                                  │
│    common:     × 1.0                                       │
│    uncommon:   × 1.1 (+10%)                                │
│    rare:       × 1.2 (+20%)                                │
│    legendary:  × 1.3 (+30%)                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 五、核心系统详解

### 5.1 卡牌系统

#### 5.1.1 卡牌数据结构
```javascript
// Card 类属性
{
  // 基础属性 (来自 cards.json)
  data: {
    id: "mahuang",
    name: "麻黄",
    type: "herb",           // herb / secret / magic
    rarity: "common",       // common/uncommon/rare/legendary
    qiCost: 1,
    effects: [{ type: "heal", value: 8 }],
    description: "发汗解表，宣肺平喘"
  },
  
  // 疾病相关属性 (来自 DiseaseCardSystem)
  isEffective: true,        // 是否是有效药物
  role: "君",               // 角色: 君/臣/佐/使
  attack: 20,               // 攻击力 (治疗加成)
  isSpecial: false,         // 是否是名贵草药
  specialEffect: null       // 特殊效果 (如人参的精气加成)
}
```

#### 5.1.2 卡牌类型
| 类型 | 说明 | 数量 |
|------|------|------|
| `herb` | 草药牌，治疗基础 | ~830张 |
| `secret` | 秘方牌，经典方剂 | 12张 |
| `magic` | 巫术牌，祝由术法 | 4张 |

### 5.2 疾病系统

#### 5.2.1 疾病数据结构
```javascript
// diseases.json
{
  id: "lung_0000",
  name: "感冒风寒束表证",
  diseaseName: "感冒",
  syndrome: "风寒束表证",
  formula: "荆防败毒散",
  difficulty: "normal",     // normal/hard/veryHard/terminal
  location: "肺系病证",
  pathology: "风寒外束，卫阳被郁...",
  
  // 战斗配置
  baseHealth: 80,
  targetHealth: 100,
  attackDeck: [...],        // 攻击卡组 (动态生成)
  
  // 草药关联
  effectiveHerbs: [...],    // 有效草药列表
  totalAttackPower: 100     // 攻击力总和
}
```

#### 5.2.2 难度配置
```javascript
// difficultyLevels
{
  normal: {
    name: "一般",
    attackBase: 20,
    ultimateCooldown: 8,
    ultimateMultiplier: 0.9
  },
  hard: {
    name: "较难",
    attackBase: 25,
    ultimateCooldown: 5,
    ultimateMultiplier: 1.2
  },
  veryHard: {
    name: "极难",
    attackBase: 31,
    ultimateCooldown: 4,
    ultimateMultiplier: 1.8
  },
  terminal: {
    name: "绝症",
    attackBase: 38,
    ultimateCooldown: 3,
    ultimateMultiplier: 2.5
  }
}
```

### 5.3 组合技系统

#### 5.3.1 组合技检测算法
```javascript
// 滑动窗口检测
class ComboSystem {
  detectCombos(playedCards) {
    const triggeredCombos = [];
    
    for (const combo of this.combos) {
      const requiredCards = combo.requiredCards;
      
      // 在已出牌序列中滑动检测
      for (let i = 0; i <= playedCards.length - requiredCards.length; i++) {
        const window = playedCards.slice(i, i + requiredCards.length);
        
        if (this.matchCombo(window, requiredCards)) {
          triggeredCombos.push(combo);
          break;
        }
      }
    }
    
    return triggeredCombos;
  }
}
```

#### 5.3.2 组合技效果
| 组合名称 | 所需卡牌 | 效果 |
|---------|---------|------|
| 君臣佐使 | herb × 3 | 治疗效果 × 1.5 |
| 麻黄桂枝 | 麻黄 + 桂枝 | 治疗 + 18 |
| ... | ... | ... |

### 5.4 技能系统

#### 5.4.1 技能槽架构
```javascript
class SkillSystem {
  constructor(scene, config) {
    this.maxSlots = config.maxSlots || 2;  // 最大槽位数
    this.slots = [];                        // 已装备技能
    this.cooldowns = new Map();             // 冷却状态
  }
  
  equipSkill(skillId, slotIndex) {
    // 装备技能到指定槽位
  }
  
  useSkill(slotIndex) {
    // 使用技能，检查冷却
    if (this.cooldowns.get(slotIndex) === 0) {
      this.applySkillEffect(slotIndex);
      this.setCooldown(slotIndex, skill.cooldown);
    }
  }
}
```

#### 5.4.2 技能类型
| 类别 | 代表技能 | 效果 |
|------|---------|------|
| 调气 | 针灸·通络 | 本回合精气上限+1 |
| 化解 | 推拿·舒筋 | 移除异常状态 |
| 魂魄 | 叫魂 | 死亡时复活 |
| 道术 | 禳灾 | 组合技效果×2 |

---

## 六、项目结构

```
med/
├── data/                          # 原始数据文件
│   ├── disease.csv               # 疾病数据
│   ├── formula.csv               # 方剂数据
│   └── herbs.csv                 # 草药数据
│
├── doc/                          # 文档
│   ├── design- v1.1.md           # 设计文档
│   ├── technical-architecture.md # 技术架构文档
│   └── design-review-report.md   # 设计审查报告
│
├── scripts/                      # 构建脚本
│   ├── generate-disease-cards.mjs
│   ├── fix-card-types.mjs
│   └── ...
│
├── src/
│   ├── config/                   # 配置文件
│   │   ├── cards.json           # 卡牌数据
│   │   ├── diseases.json        # 疾病数据
│   │   ├── combos.json          # 组合技数据
│   │   ├── levels.json          # 关卡数据
│   │   ├── skills.json          # 技能数据
│   │   └── patients.json        # 病人数据
│   │
│   ├── objects/                  # 游戏对象
│   │   ├── Card.js              # 卡牌对象
│   │   ├── Disease.js           # 疾病对象
│   │   ├── Patient.js           # 病人对象
│   │   ├── ComboDetector.js     # 组合技检测器
│   │   └── SkillSlot.js         # 技能槽UI
│   │
│   ├── systems/                  # 核心系统
│   │   ├── BattleSystem.js      # 战斗系统
│   │   ├── DeckSystem.js        # 牌库系统
│   │   ├── ComboSystem.js       # 组合技系统
│   │   ├── SkillSystem.js       # 技能系统
│   │   ├── DiseaseCardSystem.js # 疾病卡牌系统
│   │   ├── DiseaseAttackDeckBuilder.js # 攻击卡组构建器
│   │   ├── PlayerAttributesSystem.js   # 玩家属性系统
│   │   └── EconomySystem.js     # 经济系统
│   │
│   ├── ui/                       # UI组件
│   │   ├── PlayerAttributesUI.js
│   │   ├── EconomyUI.js
│   │   └── SkillPanelUI.js
│   │
│   ├── scenes/                   # 游戏场景
│   │   ├── BootScene.js         # 启动场景
│   │   ├── MenuScene.js         # 菜单场景
│   │   ├── MapScene.js          # 地图场景
│   │   ├── BattleScene.js       # 战斗场景
│   │   └── ResultsScene.js      # 结果场景
│   │
│   ├── data/                     # 运行时数据
│   │   └── PlayerAttributes.js  # 玩家属性数据
│   │
│   ├── utils/                    # 工具函数
│   │   └── helpers.js           # 辅助函数
│   │
│   ├── main.js                   # 入口文件
│   └── style.css                 # 样式文件
│
├── index.html                    # HTML入口
├── package.json                  # 项目配置
└── vite.config.js               # Vite配置
```

---

## 七、配置文件说明

### 7.1 cards.json
```javascript
{
  meta: { version, source, description },
  cardTypes: {
    herb: { name, color, description },
    secret: { name, color, description },
    magic: { name, color, description }
  },
  cards: [
    {
      id: "mahuang",
      name: "麻黄",
      type: "herb",
      rarity: "common",
      qiCost: 1,
      effects: [{ type: "heal", value: 8 }],
      chapter1: true,
      starter: true
    }
  ]
}
```

### 7.2 diseases.json
```javascript
{
  meta: {
    version,
    source,
    effectiveHerbsMeta: {
      roleAttackPower: { 君: 20, 臣: 15, 佐: 10, 使: 5 },
      specialHerbs: ["人参", "西洋参", "党参"]
    }
  },
  probabilityLevels: { ... },
  difficultyLevels: { ... },
  categories: { ... },
  patientTemplates: { ... },
  diseases: [
    {
      id: "lung_0000",
      name: "感冒风寒束表证",
      formula: "荆防败毒散",
      difficulty: "normal",
      effectiveHerbs: [...],
      totalAttackPower: 100
    }
  ]
}
```

### 7.3 combos.json
```javascript
{
  combos: [
    {
      id: "jun_chen_zuo_shi",
      name: "君臣佐使",
      description: "三药合用，各司其职，效果倍增",
      requiredCards: ["herb", "herb", "herb"],
      effect: { type: "healMultiplier", value: 1.5 }
    }
  ]
}
```

### 7.4 skills.json
```javascript
{
  skills: [
    {
      id: "skill_acupuncture_01",
      name: "针灸·通络",
      category: "调气",
      cooldown: 3,
      effect: { type: "staminaBoost", value: 1 },
      chapter1: true
    }
  ]
}
```

---

## 附录

### A. 数据生成流程

1. **CSV → JSON**: 使用 `iconv-lite` 处理 GBK 编码的 CSV 文件
2. **方剂解析**: 解析方解字段提取君臣佐使角色
3. **疾病关联**: 根据代表方剂关联有效草药
4. **数据合并**: 将 disease-cards.json 合并到 diseases.json

### B. 关键数值

| 数值 | 说明 |
|------|------|
| 君药攻击力 | 20 |
| 臣药攻击力 | 15 |
| 佐药攻击力 | 10 |
| 使药攻击力 | 5 |
| 随机牌攻击力范围 | -10 ~ +10 |
| 手牌上限 | 5张 |
| 战斗卡组大小 | 10张 |
| 技能槽数量 | 2个 |

---

*文档生成时间: 2026-03-31*  
*版本: v1.1*

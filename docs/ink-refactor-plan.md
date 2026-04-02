# Ink系统重构方案 - 使用Phaser-Ink-JS插件

## 研究结论

### 关于 phaser-ink-js 插件

经过搜索，**不存在官方的 `phaser-ink-js` npm 插件**。但存在以下相关资源：

1. **inkjs** - 官方的 Ink JavaScript 运行时库（已在使用）
2. **phaser-ink-demo** - 社区示例项目，展示如何集成 Ink 到 Phaser
3. **VampiroInkPhaser** - 完整的游戏示例

### 推荐方案

基于研究，建议**不引入外部插件**，而是：
1. 优化现有的 `InkStoryManager` 类
2. 创建一个 Phaser 插件风格的封装
3. 参考社区最佳实践改进架构

---

## 当前系统分析

### 现有架构

```
StoryScene
├── InkStoryManager (核心管理类)
│   ├── inkjs.Story 实例
│   ├── 外部函数绑定
│   └── 状态管理
├── StoryUI (UI渲染)
│   ├── 打字机效果
│   ├── 选项按钮
│   └── 背景切换
└── 事件系统
    ├── ink-start-battle
    ├── ink-goto-map
    └── story-change-background
```

### 存在的问题

| 问题 | 影响 |
|------|------|
| 外部函数复杂 | 需要手动绑定大量函数到 inkjs |
| 状态同步困难 | Ink变量与游戏状态不同步 |
| 代码耦合 | StoryScene 与 Ink 逻辑紧密耦合 |
| 缺乏插件化 | 难以在其他场景复用 |

---

## 重构方案

### 方案一：Phaser插件化封装（推荐）

将 Ink 系统封装为 Phaser 插件，提供标准 API。

#### 新架构

```
Phaser Game
├── plugins:
│   └── InkPlugin (全局插件)
│       ├── story: inkjs.Story
│       ├── continueStory()
│       ├── makeChoice()
│       ├── bindExternalFunction()
│       └── events: onStoryUpdate, onChoicePresented
│
├── StoryScene
│   └── 使用 this.plugins.get('InkPlugin')
│       ├── 监听事件更新UI
│       └── 调用插件API推进故事
│
└── OtherScenes
    └── 可通过插件访问故事状态
```

#### 核心文件

1. **src/plugins/InkPlugin.js** - Phaser插件
2. **src/story/StoryController.js** - 故事控制器（简化版）
3. **src/ui/StoryUI.js** - UI组件（优化）
4. **src/config/story-config.js** - 故事配置

#### 插件API设计

```javascript
// 安装插件
game.config.plugins = {
  global: [
    { key: 'InkPlugin', plugin: InkPlugin, start: true }
  ]
};

// 在场景中使用
class StoryScene extends Phaser.Scene {
  create() {
    const ink = this.plugins.get('InkPlugin');
    
    // 加载故事
    ink.loadStory(storyJson);
    
    // 绑定外部函数
    ink.bindExternalFunction('getCurrentLocation', () => {
      return this.registry.get('currentLocation');
    });
    
    // 监听事件
    ink.on('story-update', (content) => {
      this.ui.showText(content.text);
      if (content.choices) {
        this.ui.showChoices(content.choices);
      }
    });
    
    // 推进故事
    ink.continueStory();
  }
}
```

### 方案二：简化Ink使用

如果 Ink 系统过于复杂，可以简化为仅用于静态文本显示。

#### 简化架构

```
StoryScene
├── StoryParser (解析JSON)
│   └── 提取文本段落和选项
├── StoryUI
│   └── 显示文本和选项
└── 无外部函数绑定
```

#### 适用场景
- 不需要复杂的状态管理
- 故事分支简单
- 不需要与游戏系统深度集成

---

## 推荐实施方案

### 采用方案一：Phaser插件化

#### 实施步骤

**阶段1：创建InkPlugin**
```javascript
// src/plugins/InkPlugin.js
export default class InkPlugin extends Phaser.Plugins.BasePlugin {
  constructor(pluginManager) {
    super(pluginManager);
    this.story = null;
    this.externalFunctions = new Map();
  }
  
  loadStory(json) {
    this.story = new inkjs.Story(json);
    this._bindExternalFunctions();
  }
  
  continueStory() {
    if (!this.story.canContinue) {
      this.emit('story-end');
      return null;
    }
    
    const text = this.story.Continue();
    const tags = this.story.currentTags;
    const choices = this.story.currentChoices.map(c => c.text);
    
    this.emit('story-update', { text, tags, choices });
    return { text, tags, choices };
  }
  
  makeChoice(index) {
    this.story.ChooseChoiceIndex(index);
    return this.continueStory();
  }
  
  bindExternalFunction(name, fn) {
    this.externalFunctions.set(name, fn);
  }
  
  _bindExternalFunctions() {
    for (const [name, fn] of this.externalFunctions) {
      this.story.BindExternalFunction(name, fn);
    }
  }
}
```

**阶段2：重构StoryScene**
```javascript
// src/scenes/StoryScene.js
export default class StoryScene extends Phaser.Scene {
  create() {
    this.ink = this.plugins.get('InkPlugin');
    this.ui = new StoryUI(this);
    
    // 设置事件监听
    this.ink.on('story-update', this.onStoryUpdate, this);
    this.ink.on('story-end', this.onStoryEnd, this);
    
    // 加载故事
    const storyData = this.cache.json.get('storyData');
    this.ink.loadStory(storyData);
    
    // 开始故事
    this.ink.continueStory();
  }
  
  onStoryUpdate(content) {
    this.ui.showText(content.text);
    if (content.choices.length > 0) {
      this.ui.showChoices(content.choices, (index) => {
        this.ink.makeChoice(index);
      });
    }
  }
}
```

**阶段3：优化StoryUI**
- 分离文本显示和选项显示
- 添加动画效果
- 支持背景切换

**阶段4：简化外部函数**
- 只保留必要的函数
- 使用事件系统替代部分函数

#### 文件变更

| 文件 | 操作 | 说明 |
|------|------|------|
| src/plugins/InkPlugin.js | 新建 | Phaser插件封装 |
| src/scenes/StoryScene.js | 重写 | 使用插件API |
| src/systems/InkStoryManager.js | 删除 | 被插件替代 |
| src/ui/StoryUI.js | 优化 | 简化接口 |
| src/config/story-config.js | 新建 | 故事配置 |
| src/story/*.ink | 保留 | 故事源文件 |
| src/config/main.json | 保留 | 编译后的故事 |

#### 配置更新

```javascript
// src/main.js
const config = {
  // ...
  plugins: {
    global: [
      { 
        key: 'InkPlugin', 
        plugin: InkPlugin, 
        start: true,
        mapping: 'ink'
      }
    ]
  }
};
```

---

## 预期收益

1. **解耦** - StoryScene 与 Ink 实现解耦
2. **复用** - 插件可在多个场景使用
3. **简化** - 统一的API接口
4. **可测试** - 插件可独立测试
5. **可扩展** - 易于添加新功能

---

## 风险评估

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 重构引入bug | 中 | 保留旧代码备份，逐步替换 |
| 外部函数失效 | 中 | 完整测试所有外部函数 |
| 性能下降 | 低 | 插件化不会显著影响性能 |

---

## 决策点

请选择：

1. **采用方案一** - 创建Phaser插件（推荐）
2. **采用方案二** - 简化Ink使用
3. **保持现状** - 仅优化现有代码

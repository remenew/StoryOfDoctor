# Ink系统重构完成报告

## 重构概述

将原有的 `InkStoryManager` 类重构为 Phaser 插件架构，实现更好的解耦和复用性。

## 主要变更

### 1. 新增文件

#### src/plugins/InkPlugin.js
- **功能**：Phaser全局插件，封装inkjs功能
- **核心API**：
  - `loadStory(json)` - 加载故事
  - `continueStory()` - 继续故事
  - `makeChoice(index)` - 做出选择
  - `jumpToKnot(path)` - 跳转节点
  - `bindExternalFunction(name, fn)` - 绑定外部函数
  - `getVariable(name)` / `setVariable(name, value)` - 变量操作
  - `saveState()` / `loadState(json)` - 状态保存/恢复
- **事件系统**：
  - `story-loaded` - 故事加载完成
  - `story-update` - 故事内容更新
  - `story-end` - 故事结束
  - `choice-made` - 做出选择
  - `change-background` - 切换背景
  - `change-music` - 切换音乐
  - `story-error` - 故事错误

### 2. 修改文件

#### src/main.js
- 注册 InkPlugin 为全局插件
- 配置 plugins 字段

#### src/scenes/StoryScene.js（完全重写）
- 使用 `this.plugins.get('InkPlugin')` 获取插件
- 通过事件监听更新UI
- 简化外部函数绑定
- 更清晰的生命周期管理

### 3. 删除文件

#### src/systems/InkStoryManager.js
- 功能已迁移到 InkPlugin

## 架构对比

### 重构前
```
StoryScene
├── InkStoryManager (独立类)
│   ├── 手动管理inkjs实例
│   ├── 复杂的外部函数绑定
│   └── 自定义事件系统
└── StoryUI
```

### 重构后
```
Phaser Game
├── InkPlugin (全局插件)
│   ├── 统一的API接口
│   ├── 自动外部函数绑定
│   └── Phaser事件系统
│
└── StoryScene
    └── 通过插件API访问
```

## 使用方式

### 在场景中获取插件
```javascript
const ink = this.plugins.get('InkPlugin');
```

### 加载故事
```javascript
ink.loadStory(storyJson);
```

### 监听事件
```javascript
ink.on('story-update', (content) => {
  this.ui.showText(content.text);
  if (content.hasChoices) {
    this.ui.showChoices(content.choices);
  }
});
```

### 绑定外部函数
```javascript
ink.bindExternalFunction('getCurrentLocation', () => {
  return this.registry.get('currentLocation');
});
```

### 推进故事
```javascript
// 继续故事
ink.continueStory();

// 做出选择
ink.makeChoice(choiceIndex);
```

## 收益

1. **解耦** - StoryScene 不再直接依赖 Ink 实现细节
2. **复用** - 插件可在任意场景通过 `this.plugins.get()` 访问
3. **标准化** - 使用 Phaser 标准插件架构
4. **可测试** - 插件可独立测试
5. **易维护** - 统一的API和事件系统

## 测试状态

- ✅ 服务器启动正常
- ✅ 无编译错误
- ✅ Vite 运行正常 (http://localhost:3000/)

## 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| src/plugins/InkPlugin.js | 新增 | Phaser插件封装 |
| src/main.js | 修改 | 注册插件 |
| src/scenes/StoryScene.js | 重写 | 使用插件API |
| src/ui/StoryUI.js | 保留 | 无需修改 |
| src/systems/InkStoryManager.js | 删除 | 功能迁移 |

## 后续建议

1. 在其他场景中使用 InkPlugin 访问故事状态
2. 添加更多故事事件处理
3. 考虑添加故事调试工具

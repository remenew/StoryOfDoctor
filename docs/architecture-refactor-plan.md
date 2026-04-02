# 游戏架构整合方案

## 1. 数据层整合

### 1.1 统一地点-病人数据源

**当前问题：**
- `locations.json` 和 `levels.json` 都定义关卡数据
- 病人数据分散在两个文件中

**整合方案：**
```
保留 locations.json 作为唯一地点数据源
保留 levels.json 仅用于章节定义（chapters数组）
删除 levels.json 中的 levels 数组
```

**修改后的 levels.json：**
```json
{
  "meta": {
    "version": "2.0.0",
    "description": "章节配置"
  },
  "chapters": [
    { "id": "chapter_1", "name": "初入江湖", ... },
    { "id": "chapter_2", "name": "小有名气", ... }
  ]
}
```

### 1.2 病人数据引用关系

**当前：** locations.json 内嵌完整病人数据
**优化：** locations.json 引用 patients.json 中的病人ID

```json
// locations.json
{
  "locations": [
    {
      "id": "loc_chapter_1_0",
      "patientRefs": ["patient_farmer_01", "patient_scholar_01"]
    }
  ]
}
```

运行时合并数据：
```javascript
// 在 BootScene 或 MapScene 中
const location = locationsData.locations[0];
const patients = location.patientRefs.map(ref => 
  patientsData.patients.find(p => p.id === ref)
);
```

## 2. 场景层整合

### 2.1 场景流转优化

**当前流程：**
```
MenuScene -> StoryScene(intro) -> MapScene -> BattleScene
```

**优化流程：**
```
MenuScene -> MapScene -> [可选]StoryScene(story) -> BattleScene
```

**理由：**
- intro文本移到MapScene第一地点点击时显示
- StoryScene仅用于完整故事分支（如特殊事件）
- 减少不必要的场景切换

### 2.2 MapScene 职责明确

**当前问题：**
- 同时处理地点显示和故事触发
- 从多个数据源获取数据

**优化后职责：**
1. 显示地点列表
2. 点击地点显示病人列表
3. 第一地点首次点击触发intro文本
4. 选择病人进入BattleScene

### 2.3 BattleScene 契约简化

**当前：** 处理3种契约（新MapScene、旧MapScene、Legacy）
**优化：** 仅处理1种契约

```javascript
// 统一契约
{
  locationId: string,
  patientId: string,
  diseaseId: string,
  runSeed: string,
  currentHp: number
}
```

## 3. Ink系统整合

### 3.1 Ink与游戏状态同步

**当前问题：**
- Ink变量（reputation, money）与游戏系统不同步
- 外部函数实现复杂

**优化方案：**

**选项A：简化Ink使用（推荐）**
- Ink仅用于显示静态故事文本
- 游戏状态由JavaScript管理
- 减少外部函数绑定

**选项B：完全集成**
- 游戏状态完全由Ink变量驱动
- JavaScript仅作为渲染层
- 需要大量重构

### 3.2 Ink文件组织

```
src/story/
├── main.ink          # 故事入口（简化）
├── chapter1.ink      # 第一章故事
├── common.ink        # 公共函数
└── events/           # 特殊事件
    ├── random_event.ink
    └── village_elder.ink
```

## 4. 文件清理清单

### 4.1 删除/合并的文件

| 文件 | 操作 | 说明 |
|------|------|------|
| levels.json | 修改 | 删除levels数组，保留chapters |
| data/patients.json | 删除 | 与src/config/patients.json重复 |
| 旧版story文件 | 删除 | 清理未使用的ink文件 |

### 4.2 需要修改的文件

| 文件 | 修改内容 |
|------|----------|
| MapScene.js | 简化init逻辑，移除StoryScene依赖 |
| BattleScene.js | 移除旧契约兼容代码 |
| MenuScene.js | 直接进入MapScene，不经过StoryScene |
| StoryScene.js | 保留但减少使用频率 |
| locations.json | 添加patientRefs字段 |

## 5. 实施步骤

### 阶段1：数据层整合
1. 修改 levels.json，删除levels数组
2. 修改 locations.json，添加patientRefs
3. 更新 BootScene 数据加载逻辑

### 阶段2：场景层简化
1. 修改 MenuScene，直接进入MapScene
2. 修改 MapScene，处理intro显示
3. 简化 BattleScene 契约处理

### 阶段3：Ink系统优化
1. 简化Ink脚本，减少外部函数
2. 更新 InkStoryManager
3. 测试故事流程

### 阶段4：清理
1. 删除冗余文件
2. 更新文档
3. 全面测试

## 6. 预期收益

1. **代码简化**：减少30%兼容代码
2. **数据一致**：单一数据源，避免矛盾
3. **维护容易**：清晰的文件职责
4. **性能提升**：减少不必要的数据处理

# 架构整合完成报告

## 执行时间
2026-04-02

## 主要修改

### 1. 数据层整合

#### levels.json
- **修改内容**：删除了 `levels` 数组（约570行）
- **保留内容**：`chapters` 数组，用于章节定义
- **版本**：从 1.0.0 升级到 2.0.0

#### locations.json
- **修改内容**：
  - 添加 `patientRefs` 字段，引用 `patients.json` 中的病人ID
  - 添加 `diseaseIds` 字段，定义每个病人的疾病
  - 移除内嵌的完整病人数据
- **版本**：从 2.0.0 升级到 2.1.0
- **数据关系**：
  ```
  locations.json → patientRefs → patients.json
                → diseaseIds  → diseases.json
  ```

### 2. 场景层简化

#### MenuScene.js
- **修改前**：MenuScene → StoryScene(intro) → MapScene
- **修改后**：MenuScene → MapScene（直接）
- **开场白处理**：移到 MapScene 第一地点点击时显示

#### MapScene.js（完全重写）
- **新增功能**：
  - `_showIntro()` 方法：显示开场白遮罩层
  - `_getLocationPatients()` 方法：合并 locations 和 patients 数据
  - `introShown` 状态管理
- **数据结构**：支持 `patientRefs` 和 `diseaseIds`
- **契约更新**：
  ```javascript
  // 来自 MenuScene
  { runSeed, startHp, showIntro }
  
  // 来自 BattleScene（胜利）
  { locationId, patientId, remainingHp }
  ```

#### BattleScene.js
- **简化 init()**：移除3种契约兼容，仅保留1种标准契约
- **移除**：
  - 旧 MapScene 节点结构兼容
  - Legacy level 数据兼容
  - `nodeIndex` 相关代码
- **保留**：
  - 标准契约处理
  - 开发测试模式

### 3. 文件结构优化

```
src/config/
├── levels.json      # 仅章节定义（简化）
├── locations.json   # 地点-病人关联（使用引用）
├── patients.json    # 病人模板（独立）
└── main.json        # Ink故事（保留）

src/scenes/
├── MenuScene.js     # 简化，直接进入MapScene
├── MapScene.js      # 重写，支持新数据结构
├── BattleScene.js   # 简化契约处理
└── StoryScene.js    # 保留，减少使用
```

## 数据流图

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  MenuScene  │────▶│  MapScene   │────▶│ BattleScene │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
                    ┌─────────────┐
                    │  开场白显示  │
                    │ (首次进入)   │
                    └─────────────┘
```

## 收益

1. **代码简化**
   - BattleScene init() 从 80 行减少到 40 行
   - 移除 3 种契约兼容逻辑
   - 减少 50% 条件分支

2. **数据一致**
   - 单一数据源（locations.json）
   - 病人数据通过引用关联
   - 避免数据重复和矛盾

3. **维护容易**
   - 清晰的文件职责
   - 简化的场景流转
   - 明确的数据关系

4. **用户体验**
   - 减少场景切换等待
   - 开场白与地图融合
   - 更流畅的游戏流程

## 测试状态

- [x] 服务器启动正常
- [x] 无编译错误
- [x] Vite 运行正常 (http://localhost:3000/)

## 后续建议

1. **Ink系统优化**：考虑进一步简化 Ink 使用，仅用于静态文本
2. **StoryScene**：保留用于特殊故事事件（如随机事件、剧情分支）
3. **数据验证**：添加 JSON Schema 验证，确保数据完整性
4. **单元测试**：为新的数据合并逻辑添加测试

## 相关文档

- `docs/architecture-refactor-plan.md` - 详细整合方案
- `docs/design.md` - 设计文档（需更新）

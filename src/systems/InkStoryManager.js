/**
 * InkStoryManager - Ink 叙事系统管理器
 * 
 * 封装 inkjs 运行时，提供与游戏系统的接口
 * 负责加载故事、管理状态、绑定外部函数
 */

import { Story } from 'inkjs';
import { Compiler } from 'inkjs/full';

/**
 * Ink 故事管理器类
 */
export default class InkStoryManager {
  /**
   * @param {Phaser.Scene} scene - 所属场景
   * @param {Object} options - 配置选项
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.story = null;
    this.storyData = null;
    this.variables = new Map();
    this.externalFunctions = new Map();
    this.history = []; // 对话历史
    
    // 配置
    this.options = {
      autoSave: true,
      saveKey: 'ink_story_state',
      allowExternalFunctionFallback: true, // 允许外部函数 fallback（返回 null）
      ...options
    };
    
    this.isStoryLoaded = false;
  }

  /**
   * 加载 Ink 故事（从 JSON 数据）
   * @param {Object} storyData - 编译后的 Ink JSON 数据
   * @returns {boolean} 是否加载成功
   */
  loadStory(storyData) {
    try {
      this.story = new Story(storyData);
      this.storyData = storyData;
      this.isStoryLoaded = true;
      this.history = [];
      
      // 设置外部函数 fallback 行为
      if (this.options.allowExternalFunctionFallback) {
        this.story.allowExternalFunctionFallbacks = true;
      }
      
      // 绑定外部函数
      this._bindExternalFunctions();
      
      // 恢复变量（如果有存档）
      if (this.options.autoSave) {
        this._loadVariables();
      }
      
      console.log('[InkStoryManager] 故事加载成功');
      return true;
    } catch (error) {
      console.error('[InkStoryManager] 故事加载失败:', error);
      return false;
    }
  }

  /**
   * 编译并加载 Ink 脚本（从字符串）
   * @param {string} inkScript - Ink 脚本字符串
   * @returns {boolean} 是否加载成功
   */
  compileAndLoad(inkScript) {
    try {
      const compiler = new Compiler(inkScript);
      const storyData = compiler.compile();
      return this.loadStory(storyData);
    } catch (error) {
      console.error('[InkStoryManager] 编译失败:', error);
      return false;
    }
  }

  /**
   * 继续故事（获取下一段内容）
   * @returns {Object|null} 故事内容对象 { text, tags, choices }
   */
  continue() {
    if (!this.story || !this.story.canContinue) {
      return null;
    }

    try {
      // 获取文本
      const text = this.story.Continue();
      
      // 获取标签
      const tags = this.story.currentTags || [];
      
      // 获取选项
      const choices = this.getChoices();
      
      // 记录历史
      this.history.push({
        text,
        tags,
        timestamp: Date.now()
      });
      
      // 自动保存
      if (this.options.autoSave) {
        this._saveVariables();
      }
      
      return {
        text,
        tags,
        choices,
        hasChoices: choices.length > 0,
        canContinue: this.story.canContinue
      };
    } catch (error) {
      console.error('[InkStoryManager] 继续故事失败:', error);
      return null;
    }
  }

  /**
   * 获取当前选项列表
   * @returns {Array} 选项数组 { index, text, tags }
   */
  getChoices() {
    if (!this.story) return [];
    
    return this.story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
      tags: choice.tags || [],
      sourcePath: choice.sourcePath
    }));
  }

  /**
   * 选择选项
   * @param {number} choiceIndex - 选项索引
   * @returns {boolean} 是否选择成功
   */
  chooseChoice(choiceIndex) {
    if (!this.story) return false;
    
    try {
      this.story.ChooseChoiceIndex(choiceIndex);
      
      // 自动保存
      if (this.options.autoSave) {
        this._saveVariables();
      }
      
      return true;
    } catch (error) {
      console.error('[InkStoryManager] 选择选项失败:', error);
      return false;
    }
  }

  /**
   * 获取变量值
   * @param {string} name - 变量名
   * @returns {any} 变量值
   */
  getVariable(name) {
    if (!this.story) return null;
    
    try {
      return this.story.variablesState[name];
    } catch (error) {
      console.warn(`[InkStoryManager] 获取变量 ${name} 失败:`, error);
      return null;
    }
  }

  /**
   * 设置变量值
   * @param {string} name - 变量名
   * @param {any} value - 变量值
   * @returns {boolean} 是否设置成功
   */
  setVariable(name, value) {
    if (!this.story) return false;
    
    try {
      // 检查变量是否存在于故事中
      const varNames = Object.keys(this.story.variablesState);
      if (!varNames.includes(name)) {
        // 变量不存在，跳过设置
        return false;
      }
      
      this.story.variablesState[name] = value;
      
      // 自动保存
      if (this.options.autoSave) {
        this._saveVariables();
      }
      
      return true;
    } catch (error) {
      console.error(`[InkStoryManager] 设置变量 ${name} 失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有变量
   * @returns {Object} 变量对象
   */
  getAllVariables() {
    if (!this.story) return {};
    
    const vars = {};
    const varNames = this.story.variablesState._globalVariables || [];
    
    for (const name of varNames) {
      vars[name] = this.getVariable(name);
    }
    
    return vars;
  }

  /**
   * 绑定外部函数（供 Ink 脚本调用）
   * @param {string} name - 函数名
   * @param {Function} fn - 函数实现
   */
  bindExternalFunction(name, fn) {
    this.externalFunctions.set(name, fn);
    
    // 如果故事已加载，立即绑定
    if (this.story) {
      this._bindSingleFunction(name, fn);
    }
  }

  /**
   * 绑定所有外部函数
   * @private
   */
  _bindExternalFunctions() {
    if (!this.story) return;
    
    for (const [name, fn] of this.externalFunctions) {
      this._bindSingleFunction(name, fn);
    }
    
    // 绑定默认的游戏系统函数
    this._bindDefaultFunctions();
  }

  /**
   * 绑定单个外部函数
   * @private
   */
  _bindSingleFunction(name, fn) {
    if (!this.story) return;
    
    try {
      this.story.BindExternalFunction(name, (...args) => {
        try {
          return fn(...args);
        } catch (error) {
          console.error(`[InkStoryManager] 外部函数 ${name} 执行失败:`, error);
          return null;
        }
      });
    } catch (error) {
      console.warn(`[InkStoryManager] 绑定函数 ${name} 失败:`, error);
    }
  }

  /**
   * 绑定默认的游戏系统函数
   * @private
   */
  _bindDefaultFunctions() {
    if (!this.story) return;
    
    // 获取当前地点
    this.bindExternalFunction('getCurrentLocation', () => {
      return this.scene.currentLocation?.id || '';
    });
    
    // 获取当前病人
    this.bindExternalFunction('getCurrentPatient', () => {
      return this.scene.currentPatient?.id || '';
    });
    
    // 获取病人名称
    this.bindExternalFunction('getPatientName', () => {
      return this.scene.currentPatient?.name || '未知病人';
    });
    
    // 获取病人数量
    this.bindExternalFunction('getPatientsCount', () => {
      return this.scene.currentLocation?.patients?.length || 0;
    });
    
    // 修改声望
    this.bindExternalFunction('modifyReputation', (amount) => {
      if (this.scene.playerAttributes) {
        this.scene.playerAttributes.modifyReputation(amount);
      }
    });
    
    // 修改金钱
    this.bindExternalFunction('modifyMoney', (amount) => {
      if (this.scene.economySystem) {
        this.scene.economySystem.addIncome(amount, '故事奖励');
      }
    });
    
    // 触发战斗
    this.bindExternalFunction('startBattle', (patientId) => {
      this.scene.events.emit('ink-start-battle', patientId);
    });
    
    // 跳转到地图
    this.bindExternalFunction('goToMap', () => {
      this.scene.events.emit('ink-goto-map');
    });
    
    // 显示提示
    this.bindExternalFunction('showMessage', (message) => {
      if (this.scene.showMessage) {
        this.scene.showMessage(message);
      }
    });
    
    // 记录日志
    this.bindExternalFunction('log', (message) => {
      console.log('[Ink Story]', message);
    });

    // 加载游戏存档
    this.bindExternalFunction('loadGame', () => {
      const savedGame = localStorage.getItem('medgod_game_state');
      if (savedGame) {
        try {
          const gameState = JSON.parse(savedGame);
          // 恢复游戏状态
          if (this.scene.registry) {
            this.scene.registry.set('savedGame', gameState);
          }
          return true;
        } catch (e) {
          console.warn('[InkStoryManager] 加载存档失败:', e);
          return false;
        }
      }
      return false;
    });
  }

  /**
   * 跳转到指定节点（Knot）
   * @param {string} knotName - 节点名称
   * @returns {boolean} 是否跳转成功
   */
  jumpToKnot(knotName) {
    if (!this.story) return false;
    
    try {
      this.story.ChoosePathString(knotName);
      return true;
    } catch (error) {
      console.error(`[InkStoryManager] 跳转到节点 ${knotName} 失败:`, error);
      return false;
    }
  }

  /**
   * 检查故事是否可以继续
   * @returns {boolean}
   */
  canContinue() {
    return this.story ? this.story.canContinue : false;
  }

  /**
   * 检查是否有选项
   * @returns {boolean}
   */
  hasChoices() {
    return this.story ? this.story.currentChoices.length > 0 : false;
  }

  /**
   * 获取历史记录
   * @returns {Array} 历史记录数组
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * 清除历史记录
   */
  clearHistory() {
    this.history = [];
  }

  /**
   * 保存变量到本地存储
   * @private
   */
  _saveVariables() {
    if (!this.story) return;
    
    try {
      const vars = this.getAllVariables();
      const saveData = {
        variables: vars,
        saveTime: Date.now(),
        storyPath: this.story.state.currentPathString
      };
      
      localStorage.setItem(this.options.saveKey, JSON.stringify(saveData));
    } catch (error) {
      console.warn('[InkStoryManager] 保存变量失败:', error);
    }
  }

  /**
   * 从本地存储加载变量
   * @private
   */
  _loadVariables() {
    try {
      const saveData = localStorage.getItem(this.options.saveKey);
      if (!saveData) return;
      
      const { variables, storyPath } = JSON.parse(saveData);
      
      // 恢复变量
      for (const [name, value] of Object.entries(variables)) {
        this.setVariable(name, value);
      }
      
      // 恢复路径
      if (storyPath) {
        this.jumpToKnot(storyPath);
      }
      
      console.log('[InkStoryManager] 变量恢复成功');
    } catch (error) {
      console.warn('[InkStoryManager] 加载变量失败:', error);
    }
  }

  /**
   * 保存完整故事状态
   * @returns {Object} 故事状态对象
   */
  saveState() {
    if (!this.story) return null;
    
    try {
      return {
        storyState: this.story.state.ToJson(),
        variables: this.getAllVariables(),
        history: this.history,
        saveTime: Date.now()
      };
    } catch (error) {
      console.error('[InkStoryManager] 保存状态失败:', error);
      return null;
    }
  }

  /**
   * 加载故事状态
   * @param {Object} state - 故事状态对象
   * @returns {boolean} 是否加载成功
   */
  loadState(state) {
    if (!this.story || !state) return false;
    
    try {
      this.story.state.LoadJson(state.storyState);
      this.history = state.history || [];
      return true;
    } catch (error) {
      console.error('[InkStoryManager] 加载状态失败:', error);
      return false;
    }
  }

  /**
   * 重置故事
   */
  reset() {
    if (this.storyData) {
      this.loadStory(this.storyData);
    }
    this.history = [];
  }

  /**
   * 销毁管理器
   */
  destroy() {
    if (this.options.autoSave) {
      this._saveVariables();
    }
    this.story = null;
    this.storyData = null;
    this.externalFunctions.clear();
    this.variables.clear();
  }
}

/**
 * InkPlugin - Phaser插件封装
 * 
 * 将inkjs封装为Phaser插件，提供统一的故事管理API
 * 支持事件驱动架构，与Phaser场景解耦
 */

import { Story } from 'inkjs';

/**
 * Ink故事插件
 * @extends Phaser.Plugins.BasePlugin
 */
export default class InkPlugin extends Phaser.Plugins.BasePlugin {
  /**
   * @param {Phaser.Plugins.PluginManager} pluginManager - 插件管理器
   */
  constructor(pluginManager) {
    super(pluginManager);

    /** @type {Story|null} inkjs故事实例 */
    this.story = null;

    /** @type {Map<string, Function>} 外部函数映射 */
    this.externalFunctions = new Map();

    /** @type {boolean} 是否已加载故事 */
    this.isLoaded = false;

    /** @type {string|null} 当前故事状态 */
    this.currentState = null;

    /** @type {Phaser.Events.EventEmitter} 事件发射器 */
    this.eventEmitter = new Phaser.Events.EventEmitter();
  }

  /**
   * 监听事件
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} context - 上下文
   */
  on(event, callback, context) {
    this.eventEmitter.on(event, callback, context);
    return this;
  }

  /**
   * 监听事件（仅一次）
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   * @param {Object} context - 上下文
   */
  once(event, callback, context) {
    this.eventEmitter.once(event, callback, context);
    return this;
  }

  /**
   * 取消监听
   * @param {string} event - 事件名称
   * @param {Function} callback - 回调函数
   */
  off(event, callback) {
    this.eventEmitter.off(event, callback);
    return this;
  }

  /**
   * 触发事件
   * @param {string} event - 事件名称
   * @param {...*} args - 参数
   */
  emit(event, ...args) {
    this.eventEmitter.emit(event, ...args);
    return this;
  }

  /**
   * 加载故事
   * @param {Object} storyJson - 编译后的Ink JSON数据
   * @param {Object} options - 配置选项
   * @param {boolean} options.autoBindFunctions - 是否自动绑定外部函数
   * @returns {boolean} 是否加载成功
   */
  loadStory(storyJson, options = {}) {
    try {
      this.story = new Story(storyJson);
      this.isLoaded = true;

      // 自动绑定外部函数
      if (options.autoBindFunctions !== false) {
        this._bindExternalFunctions();
      }

      this.emit('story-loaded', { success: true });
      return true;
    } catch (error) {
      console.error('[InkPlugin] 加载故事失败:', error);
      this.emit('story-loaded', { success: false, error });
      return false;
    }
  }

  /**
   * 继续故事
   * @returns {Object|null} 故事内容对象，包含text, tags, choices, hasChoices
   */
  continueStory() {
    if (!this.isLoaded || !this.story) {
      console.warn('[InkPlugin] 故事未加载');
      return null;
    }

    // 检查故事是否结束
    if (!this.story.canContinue && this.story.currentChoices.length === 0) {
      this.emit('story-end');
      return null;
    }

    try {
      let text = '';
      let tags = [];

      // 继续故事直到有选项或无法继续
      if (this.story.canContinue) {
        text = this.story.Continue();
        tags = this.story.currentTags || [];
      }

      // 处理标签
      this._processTags(tags);

      // 获取选项
      const choices = this.story.currentChoices.map((choice, index) => ({
        index,
        text: choice.text,
        tags: choice.tags || []
      }));

      const content = {
        text: text.trim(),
        tags,
        choices,
        hasChoices: choices.length > 0,
        canContinue: this.story.canContinue
      };

      this.emit('story-update', content);
      return content;
    } catch (error) {
      console.error('[InkPlugin] 继续故事失败:', error);
      this.emit('story-error', { error });
      return null;
    }
  }

  /**
   * 做出选择
   * @param {number} choiceIndex - 选项索引
   * @returns {Object|null} 选择后的故事内容
   */
  makeChoice(choiceIndex) {
    if (!this.isLoaded || !this.story) {
      console.warn('[InkPlugin] 故事未加载');
      return null;
    }

    try {
      if (choiceIndex >= 0 && choiceIndex < this.story.currentChoices.length) {
        this.story.ChooseChoiceIndex(choiceIndex);
        this.emit('choice-made', { index: choiceIndex });
        return this.continueStory();
      } else {
        console.warn('[InkPlugin] 无效的选项索引:', choiceIndex);
        return null;
      }
    } catch (error) {
      console.error('[InkPlugin] 做出选择失败:', error);
      this.emit('story-error', { error });
      return null;
    }
  }

  /**
   * 跳转到指定节点
   * @param {string} knotPath - 节点路径（如"chapter1.start"）
   * @returns {boolean} 是否跳转成功
   */
  jumpToKnot(knotPath) {
    if (!this.isLoaded || !this.story) {
      console.warn('[InkPlugin] 故事未加载');
      return false;
    }

    try {
      this.story.ChoosePathString(knotPath);
      this.emit('knot-jumped', { knotPath });
      return true;
    } catch (error) {
      console.error('[InkPlugin] 跳转节点失败:', error);
      return false;
    }
  }

  /**
   * 绑定外部函数
   * @param {string} name - 函数名称
   * @param {Function} fn - 函数实现
   * @param {boolean} lookaheadSafe - 是否支持lookahead
   */
  bindExternalFunction(name, fn, lookaheadSafe = false) {
    this.externalFunctions.set(name, { fn, lookaheadSafe });
    
    // 如果故事已加载，立即绑定
    if (this.isLoaded && this.story) {
      try {
        this.story.BindExternalFunction(name, fn, lookaheadSafe);
      } catch (error) {
        console.warn(`[InkPlugin] 绑定外部函数失败: ${name}`, error);
      }
    }
  }

  /**
   * 解除绑定外部函数
   * @param {string} name - 函数名称
   */
  unbindExternalFunction(name) {
    this.externalFunctions.delete(name);
  }

  /**
   * 获取Ink变量值
   * @param {string} name - 变量名
   * @returns {*} 变量值
   */
  getVariable(name) {
    if (!this.isLoaded || !this.story) {
      return null;
    }
    try {
      return this.story.variablesState[name];
    } catch (error) {
      console.warn(`[InkPlugin] 获取变量失败: ${name}`, error);
      return null;
    }
  }

  /**
   * 设置Ink变量值
   * @param {string} name - 变量名
   * @param {*} value - 变量值
   */
  setVariable(name, value) {
    if (!this.isLoaded || !this.story) {
      return;
    }
    try {
      this.story.variablesState[name] = value;
      this.emit('variable-changed', { name, value });
    } catch (error) {
      console.warn(`[InkPlugin] 设置变量失败: ${name}`, error);
    }
  }

  /**
   * 观察变量变化
   * @param {string} name - 变量名
   * @param {Function} callback - 回调函数
   */
  observeVariable(name, callback) {
    if (!this.isLoaded || !this.story) {
      return;
    }
    try {
      this.story.ObserveVariable(name, callback);
    } catch (error) {
      console.warn(`[InkPlugin] 观察变量失败: ${name}`, error);
    }
  }

  /**
   * 保存故事状态
   * @returns {string} 序列化的状态字符串
   */
  saveState() {
    if (!this.isLoaded || !this.story) {
      return null;
    }
    try {
      this.currentState = this.story.state.ToJson();
      return this.currentState;
    } catch (error) {
      console.error('[InkPlugin] 保存状态失败:', error);
      return null;
    }
  }

  /**
   * 加载故事状态
   * @param {string} stateJson - 序列化的状态字符串
   * @returns {boolean} 是否加载成功
   */
  loadState(stateJson) {
    if (!this.isLoaded || !this.story) {
      return false;
    }
    try {
      this.story.state.LoadJson(stateJson);
      this.currentState = stateJson;
      this.emit('state-loaded', { success: true });
      return true;
    } catch (error) {
      console.error('[InkPlugin] 加载状态失败:', error);
      this.emit('state-loaded', { success: false, error });
      return false;
    }
  }

  /**
   * 重置故事
   */
  reset() {
    if (this.story) {
      this.story.ResetState();
      this.emit('story-reset');
    }
  }

  /**
   * 检查是否有选项
   * @returns {boolean}
   */
  hasChoices() {
    return this.isLoaded && this.story && this.story.currentChoices.length > 0;
  }

  /**
   * 获取当前选项
   * @returns {Array}
   */
  getCurrentChoices() {
    if (!this.isLoaded || !this.story) {
      return [];
    }
    return this.story.currentChoices.map((choice, index) => ({
      index,
      text: choice.text,
      tags: choice.tags || []
    }));
  }

  /**
   * 绑定所有外部函数
   * @private
   */
  _bindExternalFunctions() {
    if (!this.story) return;

    for (const [name, { fn, lookaheadSafe }] of this.externalFunctions) {
      try {
        this.story.BindExternalFunction(name, fn, lookaheadSafe);
      } catch (error) {
        console.warn(`[InkPlugin] 绑定外部函数失败: ${name}`, error);
      }
    }
  }

  /**
   * 处理标签
   * @param {Array<string>} tags - 标签数组
   * @private
   */
  _processTags(tags) {
    for (const tag of tags) {
      // 解析标签
      const [key, ...valueParts] = tag.split(':');
      const value = valueParts.join(':').trim();

      // 触发标签事件
      this.emit('tag', { key: key.trim(), value });

      // 处理特定标签
      switch (key.trim()) {
        case 'background':
          this.emit('change-background', { background: value });
          break;
        case 'music':
          this.emit('change-music', { music: value });
          break;
        case 'sound':
          this.emit('play-sound', { sound: value });
          break;
        case 'portrait':
          this.emit('change-portrait', { portrait: value });
          break;
        case 'event':
          this.emit('story-event', { event: value });
          break;
      }
    }
  }

  /**
   * 销毁插件
   */
  destroy() {
    this.story = null;
    this.externalFunctions.clear();
    this.isLoaded = false;
    this.currentState = null;
    
    if (this.eventEmitter) {
      this.eventEmitter.removeAllListeners();
      this.eventEmitter = null;
    }
    
    super.destroy();
  }
}

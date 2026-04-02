/**
 * StoryScene - 故事场景
 * 
 * 使用InkPlugin插件显示Ink叙事内容
 * 处理对话、选项和故事流程
 * 
 * Init data contracts
 * ───────────────────
 *   FROM MenuScene:   { storyData: Object, mode: 'intro'|'story', startKnot: string }
 *   FROM MapScene:    { storyData: Object, mode: 'story', returnScene: string }
 *   FROM BattleScene: { storyState: string, returnScene: string }
 */

import Phaser from 'phaser';
import StoryUI from '../ui/StoryUI.js';

/**
 * 故事场景类
 */
export default class StoryScene extends Phaser.Scene {
  /**
   * @param {Object} config - 场景配置
   */
  constructor(config = {}) {
    super({ key: 'StoryScene', ...config });

    /** @type {InkPlugin|null} Ink插件实例 */
    this.ink = null;

    /** @type {StoryUI|null} UI实例 */
    this.storyUI = null;

    /** @type {Object|null} 故事数据 */
    this.storyData = null;

    /** @type {string} 返回场景 */
    this.returnScene = 'MapScene';

    /** @type {string} 模式：intro/story */
    this.mode = 'story';

    /** @type {string|null} 起始节点 */
    this.startKnot = null;

    /** @type {Object} 返回数据 */
    this.returnData = {};

    /** @type {string|null} 保存的故事状态 */
    this.savedState = null;
  }

  /**
   * 初始化场景
   * @param {Object} data - 传入的数据
   */
  init(data) {
    this.storyData = data.storyData;
    this.returnScene = data.returnScene || 'MapScene';
    this.mode = data.mode || 'story';
    this.startKnot = data.startKnot || null;
    this.savedState = data.storyState || null;
    this.returnData = data.returnData || {};

    console.log('[StoryScene] 初始化', { 
      mode: this.mode, 
      startKnot: this.startKnot,
      hasSavedState: !!this.savedState 
    });
  }

  /**
   * 预加载资源
   */
  preload() {
    // 如果提供了URL，加载故事JSON
    if (this.storyData && typeof this.storyData === 'string') {
      this.load.json('storyData', this.storyData);
    }
  }

  /**
   * 创建场景
   */
  create() {
    // 获取Ink插件
    this.ink = this.plugins.get('InkPlugin');
    if (!this.ink) {
      console.error('[StoryScene] InkPlugin未找到');
      this._returnToMap();
      return;
    }

    // 创建背景
    this._createBackground();

    // 创建UI
    this.storyUI = new StoryUI(this, {
      typewriterSpeed: this.mode === 'intro' ? 15 : 25
    });

    // 设置UI继续回调
    this.storyUI.setOnContinue(() => {
      this._onContinueClicked();
    });

    // 绑定Ink事件
    this._bindInkEvents();

    // 绑定外部函数
    this._bindExternalFunctions();

    // 加载故事
    this._loadStory();

    // 键盘输入
    this.input.keyboard.on('keydown-SPACE', () => {
      this._onContinueClicked();
    });

    this.input.keyboard.on('keydown-ENTER', () => {
      this._onContinueClicked();
    });

    // 点击跳过打字
    this.input.on('pointerdown', () => {
      if (this.storyUI && this.storyUI.isTyping) {
        this.storyUI.completeTyping();
      }
    });

    console.log('[StoryScene] 创建完成');
  }

  /**
   * 绑定Ink事件
   * @private
   */
  _bindInkEvents() {
    // 故事更新事件
    this.ink.on('story-update', (content) => {
      this._onStoryUpdate(content);
    });

    // 故事结束事件
    this.ink.on('story-end', () => {
      this._onStoryEnd();
    });

    // 标签事件
    this.ink.on('change-background', ({ background }) => {
      this._changeBackground(background);
    });

    this.ink.on('change-music', ({ music }) => {
      console.log('[StoryScene] 切换音乐:', music);
    });

    this.ink.on('play-sound', ({ sound }) => {
      console.log('[StoryScene] 播放音效:', sound);
    });

    this.ink.on('story-event', ({ event }) => {
      this._handleStoryEvent(event);
    });

    // 错误事件
    this.ink.on('story-error', ({ error }) => {
      console.error('[StoryScene] 故事错误:', error);
      this._returnToMap();
    });
  }

  /**
   * 绑定外部函数
   * @private
   */
  _bindExternalFunctions() {
    // 游戏系统函数
    this.ink.bindExternalFunction('getCurrentLocation', () => {
      return this.registry.get('currentLocation') || 'village';
    });

    this.ink.bindExternalFunction('getCurrentPatient', () => {
      return this.registry.get('currentPatient') || 'unknown';
    });

    this.ink.bindExternalFunction('getPatientName', () => {
      const patient = this.registry.get('currentPatientData');
      return patient?.name || '患者';
    });

    this.ink.bindExternalFunction('getPatientsCount', () => {
      const patients = this.registry.get('healedPatients') || [];
      return patients.length;
    });

    this.ink.bindExternalFunction('modifyReputation', (amount) => {
      const current = this.registry.get('reputation') || 0;
      this.registry.set('reputation', current + amount);
      console.log('[StoryScene] 声望变化:', amount, '当前:', current + amount);
    });

    this.ink.bindExternalFunction('modifyMoney', (amount) => {
      const current = this.registry.get('money') || 0;
      this.registry.set('money', current + amount);
      console.log('[StoryScene] 金钱变化:', amount, '当前:', current + amount);
    });

    this.ink.bindExternalFunction('startBattle', (patientId) => {
      this._startBattle(patientId);
    });

    this.ink.bindExternalFunction('goToMap', () => {
      this._returnToMap();
    });

    this.ink.bindExternalFunction('showMessage', (message) => {
      this.showMessage(message);
    });

    this.ink.bindExternalFunction('log', (message) => {
      console.log('[Ink]', message);
    });

    // 存档相关函数
    this.ink.bindExternalFunction('loadGame', () => {
      // 检查是否有存档
      const savedRun = localStorage.getItem('medgod_run_state');
      const hasSave = !!savedRun;
      console.log('[StoryScene] 检查存档:', hasSave);
      return hasSave;
    });

    this.ink.bindExternalFunction('saveGame', () => {
      // 保存游戏状态
      const saveData = {
        reputation: this.registry.get('reputation') || 0,
        money: this.registry.get('money') || 0,
        timestamp: Date.now()
      };
      localStorage.setItem('medgod_save', JSON.stringify(saveData));
      console.log('[StoryScene] 游戏已保存');
      return true;
    });
  }

  /**
   * 加载故事
   * @private
   */
  _loadStory() {
    let storyJson = this.storyData;

    // 如果是字符串URL，从缓存获取
    if (typeof storyJson === 'string') {
      storyJson = this.cache.json.get('storyData');
    }

    if (!storyJson) {
      console.error('[StoryScene] 没有故事数据');
      this._returnToMap();
      return;
    }

    // 加载故事到插件
    const success = this.ink.loadStory(storyJson);

    if (success) {
      // 恢复保存的状态
      if (this.savedState) {
        this.ink.loadState(this.savedState);
      }

      // 跳转到指定节点
      if (this.startKnot) {
        this.ink.jumpToKnot(this.startKnot);
      }

      // 开始故事
      this.ink.continueStory();
    } else {
      console.error('[StoryScene] 故事加载失败');
      this._returnToMap();
    }
  }

  /**
   * 故事更新处理
   * @param {Object} content - 故事内容
   * @private
   */
  _onStoryUpdate(content) {
    if (!content) return;

    // 显示文本
    this.storyUI.showText(content.text, {
      tags: content.tags,
      useTypewriter: true
    });

    // 显示选项
    if (content.hasChoices) {
      this.storyUI.showChoices(content.choices, (choiceIndex) => {
        this.ink.makeChoice(choiceIndex);
      });
    }
  }

  /**
   * 处理继续点击
   * @private
   */
  _onContinueClicked() {
    if (this.storyUI.isTyping) {
      this.storyUI.completeTyping();
      return;
    }

    // 如果有选项，不继续
    if (this.ink.hasChoices()) {
      return;
    }

    // 继续故事
    this.ink.continueStory();
  }

  /**
   * 故事结束处理
   * @private
   */
  _onStoryEnd() {
    console.log('[StoryScene] 故事结束');

    if (this.mode === 'intro') {
      // 开场白模式：直接返回
      this._returnToMap();
    } else {
      // 故事模式：延迟后返回
      this.time.delayedCall(1000, () => {
        this._returnToMap();
      });
    }
  }

  /**
   * 处理故事事件
   * @param {string} event - 事件名称
   * @private
   */
  _handleStoryEvent(event) {
    console.log('[StoryScene] 故事事件:', event);

    switch (event) {
      case 'start_battle':
        this._startBattle();
        break;
      case 'goto_map':
        this._returnToMap();
        break;
      case 'chapter_complete':
        this.registry.set('chapterCompleted', true);
        break;
    }
  }

  /**
   * 创建背景
   * @private
   */
  _createBackground() {
    this.background = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x1a1a2e
    );
  }

  /**
   * 切换背景
   * @param {string} bgName - 背景名称
   * @private
   */
  _changeBackground(bgName) {
    const backgrounds = {
      'village': 0x2d4a3e,
      'city': 0x3d3d5c,
      'sunset': 0x8b4513,
      'title': 0x1a1a2e,
      'ink_painting': 0xf5f5dc
    };

    const color = backgrounds[bgName] || 0x1a1a2e;

    this.tweens.add({
      targets: this.background,
      fillColor: color,
      duration: 500
    });
  }

  /**
   * 开始战斗
   * @param {string} patientId - 病人ID
   * @private
   */
  _startBattle(patientId) {
    console.log('[StoryScene] 开始战斗:', patientId);

    // 保存故事状态
    const storyState = this.ink.saveState();

    // 切换到战斗场景
    this.scene.start('BattleScene', {
      patientId: patientId,
      returnScene: 'StoryScene',
      storyState: storyState
    });
  }

  /**
   * 返回地图
   * @private
   */
  _returnToMap() {
    console.log('[StoryScene] 返回地图:', this.returnScene);
    this.scene.start(this.returnScene, this.returnData);
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   */
  showMessage(message) {
    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      {
        fontFamily: 'Noto Serif SC, serif',
        fontSize: '24px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    text.setOrigin(0.5);
    text.setDepth(2000);

    this.tweens.add({
      targets: text,
      y: text.y - 50,
      alpha: 0,
      duration: 2000,
      onComplete: () => {
        text.destroy();
      }
    });
  }

  /**
   * 更新场景
   */
  update() {
    // 每帧更新逻辑
  }

  /**
   * 关闭场景
   */
  shutdown() {
    console.log('[StoryScene] 关闭');

    if (this.storyUI) {
      this.storyUI.destroy();
      this.storyUI = null;
    }

    // 清理事件监听
    if (this.ink) {
      this.ink.off('story-update');
      this.ink.off('story-end');
      this.ink.off('change-background');
      this.ink.off('story-error');
    }
  }
}

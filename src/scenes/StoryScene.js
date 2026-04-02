/**
 * StoryScene - 故事场景
 * 
 * 用于显示Ink叙事内容，处理对话、选项和故事流程
 * 支持两种模式：
 * - intro: 开场白模式，显示静态文本，点击后返回地图
 * - story: 完整故事模式，支持选项和分支
 */

import Phaser from 'phaser';
import InkStoryManager from '../systems/InkStoryManager.js';
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

    this.storyManager = null;
    this.storyUI = null;
    this.storyData = null;
    this.returnScene = null;
    this.mode = 'story'; // 'intro' 或 'story'
    this.startKnot = null;
    this.returnData = null;
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
    this.returnData = data.returnData || null;

    console.log('[StoryScene] 初始化', { mode: this.mode, startKnot: this.startKnot });
  }

  /**
   * 预加载资源
   */
  preload() {
    // 加载故事JSON（如果提供了URL）
    if (this.storyData && typeof this.storyData === 'string') {
      this.load.json('storyData', this.storyData);
    }
  }

  /**
   * 创建场景
   */
  create() {
    // 创建背景
    this._createBackground();

    // 创建UI
    this.storyUI = new StoryUI(this, {
      typewriterSpeed: this.mode === 'intro' ? 15 : 25
    });

    // 设置UI回调
    this.storyUI.setOnContinue(() => {
      this._onContinueClicked();
    });

    // 创建故事管理器
    this.storyManager = new InkStoryManager(this, {
      autoSave: this.mode === 'story',
      saveKey: 'ink_story_state'
    });

    // 绑定额外的事件
    this._bindStoryEvents();

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
      if (this.storyUI.isTyping) {
        this.storyUI.completeTyping();
      }
    });

    console.log('[StoryScene] 创建完成');
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

    if (this.mode === 'intro') {
      // 开场白模式：点击后直接返回地图
      this._returnToMap();
    } else {
      // 故事模式：继续故事
      this._continueStory();
    }
  }

  /**
   * 创建背景
   * @private
   */
  _createBackground() {
    // 默认背景
    this.background = this.add.rectangle(
      this.scale.width / 2,
      this.scale.height / 2,
      this.scale.width,
      this.scale.height,
      0x1a1a2e
    );

    // 监听背景变更事件
    this.events.on('story-change-background', (bgName) => {
      this._changeBackground(bgName);
    });
  }

  /**
   * 切换背景
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
   * 绑定故事事件
   * @private
   */
  _bindStoryEvents() {
    // 监听战斗开始事件
    this.events.on('ink-start-battle', (patientId) => {
      this._startBattle(patientId);
    });

    // 监听返回地图事件
    this.events.on('ink-goto-map', () => {
      this._returnToMap();
    });

    // 监听音乐变更
    this.events.on('story-change-music', (musicName) => {
      console.log('[StoryScene] 切换音乐:', musicName);
    });
  }

  /**
   * 加载故事
   * @private
   */
  _loadStory() {
    let storyData = this.storyData;

    // 如果是字符串URL，从缓存获取
    if (typeof storyData === 'string') {
      storyData = this.cache.json.get('storyData');
    }

    console.log('[StoryScene] 加载故事数据:', storyData ? '有数据' : '无数据');

    if (!storyData) {
      console.error('[StoryScene] 没有故事数据');
      this._returnToMap();
      return;
    }

    // 加载故事
    const success = this.storyManager.loadStory(storyData);
    console.log('[StoryScene] 故事加载结果:', success);

    if (success) {
      // 如果指定了起始节点，跳转过去
      if (this.startKnot) {
        this.storyManager.jumpToKnot(this.startKnot);
      }

      // 开始显示故事
      if (this.mode === 'intro') {
        this._showIntro();
      } else {
        this._continueStory();
      }
    } else {
      console.error('[StoryScene] 故事加载失败');
      this._returnToMap();
    }
  }

  /**
   * 显示开场白
   * @private
   */
  _showIntro() {
    console.log('[StoryScene] 显示开场白');

    // 获取开场白内容
    const content = this.storyManager.continue();

    if (content && content.text) {
      // 显示文本（无选项）
      this.storyUI.showText(content.text, {
        tags: content.tags,
        useTypewriter: true
      });

      // 开场白模式下，不显示选项，点击任意处返回
      console.log('[StoryScene] 开场白显示完成，点击任意处继续');
    } else {
      console.warn('[StoryScene] 开场白内容为空');
      this._returnToMap();
    }
  }

  /**
   * 继续故事
   * @private
   */
  _continueStory() {
    if (!this.storyManager) return;

    // 如果有选项，不继续
    if (this.storyManager.hasChoices()) {
      return;
    }

    console.log('[StoryScene] 继续故事...');

    // 获取下一段内容
    const content = this.storyManager.continue();

    console.log('[StoryScene] 故事内容:', content);

    if (content) {
      // 显示文本
      this.storyUI.showText(content.text, {
        tags: content.tags,
        useTypewriter: true
      });

      // 显示选项
      if (content.hasChoices) {
        this.storyUI.showChoices(content.choices, (choiceIndex) => {
          this._makeChoice(choiceIndex);
        });
      }
    } else {
      // 故事结束
      this._onStoryEnd();
    }
  }

  /**
   * 做出选择
   * @private
   */
  _makeChoice(choiceIndex) {
    // 清除选项
    this.storyUI.clearChoices();

    // 选择
    this.storyManager.chooseChoice(choiceIndex);

    // 继续
    this._continueStory();
  }

  /**
   * 故事结束
   * @private
   */
  _onStoryEnd() {
    console.log('[StoryScene] 故事结束');

    // 延迟后返回
    this.time.delayedCall(1000, () => {
      this._returnToMap();
    });
  }

  /**
   * 开始战斗
   * @private
   */
  _startBattle(patientId) {
    console.log('[StoryScene] 开始战斗:', patientId);

    // 保存故事状态
    const storyState = this.storyManager.saveState();

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
    console.log('[StoryScene] 返回地图');
    // 如果有返回数据，传递给返回场景
    if (this.returnData) {
      this.scene.start(this.returnScene, this.returnData);
    } else {
      this.scene.start(this.returnScene);
    }
  }

  /**
   * 显示消息
   * @param {string} message - 消息内容
   */
  showMessage(message) {
    // 创建临时消息显示
    const text = this.add.text(
      this.scale.width / 2,
      this.scale.height / 2,
      message,
      {
        fontFamily: 'Arial',
        fontSize: '24px',
        color: '#ffd700',
        stroke: '#000000',
        strokeThickness: 4
      }
    );
    text.setOrigin(0.5);
    text.setDepth(2000);

    // 动画
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

    if (this.storyManager) {
      this.storyManager.destroy();
      this.storyManager = null;
    }

    if (this.storyUI) {
      this.storyUI.destroy();
      this.storyUI = null;
    }
  }
}

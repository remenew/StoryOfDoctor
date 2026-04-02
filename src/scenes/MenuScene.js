/**
 * 主菜单场景
 */

import { isFirstTime, markPlayed, clearSavedGame, Storage } from '../utils/helpers.js';

const MAP_SAVE_KEY = 'medgod_run_state';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    // 背景
    this.add.rectangle(width / 2, height / 2, width, height, 0xf5f1e8);

    // 标题
    const title = this.add.text(width / 2, height / 3, '江湖神医', {
      fontSize: '48px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    title.setOrigin(0.5);

    // 副标题
    const subtitle = this.add.text(width / 2, height / 3 + 50, '中医卡牌游戏', {
      fontSize: '18px',
      color: '#4a4a4a'
    });
    subtitle.setOrigin(0.5);

    // 开始游戏按钮
    const startBtn = this.createButton(width / 2, height / 2 + 30, '开始游戏', () => {
      this.startGame();
    });

    // 检查是否有保存的地图进度
    const savedRun = Storage.get(MAP_SAVE_KEY);
    if (savedRun) {
      this.createButton(width / 2, height / 2 + 90, '继续游戏', () => {
        this.continueGame(savedRun);
      });
    }

    // 帮助按钮
    this.createButton(width / 2, height / 2 + 150, '帮助', () => {
      this.showHelp();
    });

    // 测试：故事模式入口
    this.createButton(width / 2, height / 2 + 210, '测试故事', () => {
      this.testStory();
    });

    // 检查是否首次游玩
    if (isFirstTime()) {
      this.showTutorialHint();
    }

    // 键盘快捷键
    this.input.keyboard.on('keydown-SPACE', () => {
      this.startGame();
    });
  }

  createButton(x, y, text, callback) {
    const button = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, 160, 40, 0xffffff);
    bg.setStrokeStyle(2, 0x1a1a1a);
    button.add(bg);

    const label = this.add.text(0, 0, text, {
      fontSize: '16px',
      color: '#1a1a1a'
    });
    label.setOrigin(0.5);
    button.add(label);

    bg.setInteractive({ useHandCursor: true });

    bg.on('pointerover', () => {
      bg.setFillStyle(0xf0f0f0);
    });

    bg.on('pointerout', () => {
      bg.setFillStyle(0xffffff);
    });

    bg.on('pointerdown', callback);

    return button;
  }

  startGame() {
    markPlayed();

    // Clear any existing run, start fresh
    Storage.remove(MAP_SAVE_KEY);

    // Generate a run seed from the current timestamp
    const runSeed = String(Date.now());

    // 直接进入地图场景，开场白在MapScene第一地点显示
    this.scene.start('MapScene', {
      runSeed: runSeed,
      startHp: 100,
      showIntro: true  // 标记需要显示开场白
    });
  }

  continueGame(savedRun) {
    // Resume — MapScene's fallback path reads from localStorage directly
    this.scene.start('MapScene', {});
  }

  /**
   * 测试故事模式
   * 加载Ink故事并进入StoryScene
   */
  testStory() {
    // 加载故事JSON
    this.load.json('storyData', 'src/config/main.json');
    
    this.load.once('complete', () => {
      const storyData = this.cache.json.get('storyData');
      
      // 进入故事场景
      this.scene.start('StoryScene', {
        storyData: storyData,
        mode: 'story',
        startKnot: 'game_start',
        returnScene: 'MenuScene'
      });
    });
    
    this.load.start();
  }

  showHelp() {
    // 创建帮助弹窗
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const overlay = this.add.rectangle(width / 2, height / 2, width, height, 0x000000, 0.7);
    overlay.setInteractive();

    const helpBox = this.add.rectangle(width / 2, height / 2, 400, 350, 0xf5f1e8);
    helpBox.setStrokeStyle(2, 0x1a1a1a);

    const helpTitle = this.add.text(width / 2, height / 2 - 140, '游戏说明', {
      fontSize: '20px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    helpTitle.setOrigin(0.5);

    const helpText = this.add.text(width / 2, height / 2 - 20,
      '目标：将病人健康值提升到目标值\n\n' +
      '操作：\n' +
      '• 点击卡牌选中，再次点击病人打出\n' +
      '• 每张卡牌消耗真气，真气每回合恢复\n' +
      '• 点击"结束回合"让病症行动\n' +
      '• 某些卡牌组合会触发隐藏效果\n\n' +
      '快捷键：\n' +
      '• 1-5：选中对应手牌\n' +
      '• E：结束回合\n' +
      '• ESC：取消选中', {
      fontSize: '12px',
      color: '#4a4a4a',
      align: 'left'
    });
    helpText.setOrigin(0.5);

    const closeBtn = this.createButton(width / 2, height / 2 + 130, '关闭', () => {
      overlay.destroy();
      helpBox.destroy();
      helpTitle.destroy();
      helpText.destroy();
      closeBtn.destroy();
    });
  }

  showTutorialHint() {
    const width = this.cameras.main.width;

    const hint = this.add.text(width / 2, 550, '首次游玩将进入引导模式', {
      fontSize: '12px',
      color: '#4a4a4a'
    });
    hint.setOrigin(0.5);

    // 闪烁动画
    this.tweens.add({
      targets: hint,
      alpha: 0.5,
      duration: 1000,
      yoyo: true,
      repeat: -1
    });
  }
}
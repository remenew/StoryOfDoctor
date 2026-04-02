/**
 * 启动场景
 * 负责加载资源和初始化
 */

import cardsData from '../config/cards.json';
import diseasesData from '../config/diseases.json';
import combosData from '../config/combos.json';
import levelsData from '../config/levels.json';
import locationsData from '../config/locations.json';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload() {
    // MVP阶段使用纯色占位，无需加载图片资源
    // 显示加载文字
    const width = this.cameras.main.width;
    const height = this.cameras.main.height;

    const loadingText = this.add.text(width / 2, height / 2, '加载中...', {
      fontSize: '24px',
      color: '#1a1a1a'
    });
    loadingText.setOrigin(0.5);
  }

  create() {
    // 存储游戏数据到注册表
    this.registry.set('cardsData', cardsData);
    this.registry.set('diseasesData', diseasesData);
    this.registry.set('combosData', combosData);
    this.registry.set('levelsData', levelsData);
    this.registry.set('locationsData', locationsData);

    // 检查是否有保存的游戏
    const savedGame = this.checkSavedGame();
    if (savedGame) {
      this.registry.set('savedGame', savedGame);
    }

    // 跳转到菜单
    this.scene.start('MenuScene');
  }

  checkSavedGame() {
    try {
      const saved = localStorage.getItem('medgod_game_state');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed to load saved game:', e);
    }
    return null;
  }
}
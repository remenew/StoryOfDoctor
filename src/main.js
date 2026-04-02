/**
 * 江湖神医 - 主入口
 * Chinese Medicine Card Game
 */

import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene.js';
import { MenuScene } from './scenes/MenuScene.js';
import { MapScene } from './scenes/MapScene.js';
import { BattleScene } from './scenes/BattleScene.js';
import StoryScene from './scenes/StoryScene.js';

// 游戏配置
const config = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 960,
  height: 640,
  backgroundColor: '#f5f1e8', // 宣纸色背景
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [BootScene, MenuScene, MapScene, BattleScene, StoryScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false
    }
  }
};

// 启动游戏
const game = new Phaser.Game(config);

// 开发模式下暴露到全局（调试用）
if (import.meta.env.DEV) {
  window.game = game;
}
/**
 * 病症对象
 */

import DiseaseAttackDeckBuilder from '../systems/DiseaseAttackDeckBuilder.js';

export class Disease {
  constructor(scene, data, rng) {
    this.scene = scene;
    this.data = data;
    this.rng = rng;
    this.name = data.name;
    this.mainSymptom = data.mainSymptom || data.differentialPoints || data.description || '';
    this.probability = data.probability || 'common';
    this.difficulty = data.difficulty || 'normal';

    // 使用DiseaseAttackDeckBuilder动态构建攻击卡组
    const deckBuilder = new DiseaseAttackDeckBuilder();
    const attackDeck = data.id 
      ? deckBuilder.buildAttackDeck(data.id)
      : (data.attackDeck || []);

    // 分离普通牌与大招牌
    this.normalCards = attackDeck.filter(c => !c.isUltimate);
    this.ultimateCards = attackDeck.filter(c => c.isUltimate) || [];

    // 大招冷却参数（从 difficultyLevels 读取）
    const diffData = scene.registry.get('diseasesData')?.difficultyLevels?.[this.difficulty] || {};
    this.ultimateCooldown = diffData.ultimateCooldown || 6;
    this.telegraphTurns = diffData.ultimateTelegraph || 1;
    this.currentUltimateIndex = 0;

    this.turnCount = 0;
    this.normalIndex = 0;
    this.pendingUltimate = false;
    this.currentIntent = null;

    this.container = null;
    this.nameText = null;
    this.symptomText = null;
    this.intentText = null;
    this.difficultyText = null;
    this.bg = null;

    this.create();
    this.drawNextIntent();
  }

  create() {
    const { scene, data } = this;

    // 创建容器（右上角）
    this.container = scene.add.container(780, 100);

    // 病症背景
    const bgColor = this.getDifficultyColor();
    this.bg = scene.add.rectangle(0, 0, 160, 130, bgColor);
    this.bg.setStrokeStyle(2, 0xc41e3a);
    this.container.add(this.bg);

    // 难度标签
    const difficultyNames = {
      easy: '容易',
      normal: '一般',
      hard: '较难',
      veryHard: '极难',
      terminal: '绝症'
    };
    this.difficultyText = scene.add.text(-70, -55, difficultyNames[this.difficulty] || '一般', {
      fontSize: '10px',
      color: '#c41e3a',
      fontStyle: 'bold'
    });
    this.container.add(this.difficultyText);

    // 病症名称
    this.nameText = scene.add.text(0, -30, data.name, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#c41e3a',
      wordWrap: { width: 150 },
      align: 'center'
    });
    this.nameText.setOrigin(0.5);
    this.container.add(this.nameText);

    // 主症显示
    const symptomStr = this.mainSymptom.length > 20
      ? this.mainSymptom.slice(0, 20) + '…'
      : this.mainSymptom;
    this.symptomText = scene.add.text(0, 8, symptomStr, {
      fontSize: '9px',
      color: '#4a4a4a',
      wordWrap: { width: 140 },
      align: 'center'
    });
    this.symptomText.setOrigin(0.5);
    this.container.add(this.symptomText);

    // 意图显示
    this.intentText = scene.add.text(0, 45, '', {
      fontSize: '11px',
      color: '#1a1a1a',
      fontStyle: 'bold'
    });
    this.intentText.setOrigin(0.5);
    this.container.add(this.intentText);
  }

  getDifficultyColor() {
    const colors = {
      easy: 0xe8f5e9,
      normal: 0xfff9c4,
      hard: 0xffe0b2,
      veryHard: 0xffccbc,
      terminal: 0xfce4ec
    };
    return colors[this.difficulty] || 0xfff9f9;
  }

  /**
   * 抽取下一个攻击意图（支持大招冷却逻辑）
   */
  drawNextIntent() {
    if (this.normalCards.length === 0 && this.ultimateCards.length === 0) {
      this.currentIntent = null;
      this.intentText.setText('喘息中...');
      this.intentText.setColor('#888888');
      return null;
    }

    this.turnCount++;

    // 大招触发
    if (this.ultimateCards.length > 0 && this.turnCount % this.ultimateCooldown === 0) {
      // 循环使用多个大招
      const ultimateCard = this.ultimateCards[this.currentUltimateIndex % this.ultimateCards.length];
      this.currentIntent = { ...ultimateCard };
      this.pendingUltimate = true;
      this.currentUltimateIndex++;
      this.intentText.setText(`⚠ 大招: -${this.currentIntent.damage}`);
      this.intentText.setColor('#ff0000');
      this.intentText.setFontSize('13px');
      // 背景闪烁预警
      this.scene.tweens.add({
        targets: this.bg,
        fillColor: 0xff6666,
        duration: 200,
        yoyo: true,
        repeat: 2
      });
      return this.currentIntent;
    }

    // 大招预警（提前 telegraphTurns 回合变色）
    if (this.ultimateCards.length > 0) {
      const turnsToUlt = this.ultimateCooldown - (this.turnCount % this.ultimateCooldown);
      if (turnsToUlt <= this.telegraphTurns) {
        this.intentText.setColor('#ff6600');
      } else {
        this.intentText.setColor('#1a1a1a');
      }
    }
    this.intentText.setFontSize('11px');

    // 普通牌循环
    if (this.normalCards.length === 0) {
      this.currentIntent = null;
      this.intentText.setText('喘息中...');
      return null;
    }
    if (this.normalIndex >= this.normalCards.length) {
      this.normalCards = this.rng.shuffle([...this.normalCards]);
      this.normalIndex = 0;
    }
    this.currentIntent = this.normalCards[this.normalIndex++];
    this.pendingUltimate = false;
    this.intentText.setText(`意图: -${this.currentIntent.damage}`);
    return this.currentIntent;
  }

  /**
   * 执行攻击
   * @returns {object} 攻击数据（含 isUltimate 标志）
   */
  attack() {
    const attack = this.currentIntent
      ? { ...this.currentIntent, isUltimate: this.pendingUltimate }
      : { name: '喘息', damage: 0, isUltimate: false };

    // 普通攻击动画
    this.scene.tweens.add({
      targets: this.container,
      x: this.container.x - 30,
      duration: 150,
      yoyo: true,
      ease: 'easeOut'
    });

    // 大招额外动画（放大）
    if (this.pendingUltimate) {
      this.scene.tweens.add({
        targets: this.container,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 200,
        yoyo: true,
        ease: 'Power2'
      });
    }

    // 抽取下一个意图
    this.drawNextIntent();

    return attack;
  }

  /**
   * 显示意图预警动画
   */
  showIntentWarning() {
    this.scene.tweens.add({
      targets: this.bg,
      alpha: 0.5,
      duration: 300,
      yoyo: true,
      repeat: 2
    });
  }

  destroy() {
    this.container.destroy();
  }
}

/**
 * 玩家属性UI组件
 * 显示四大核心属性：声望值、道德值、健康值、精力值
 */

export class PlayerAttributesUI {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {PlayerAttributes} attributes - 属性对象
   * @param {object} config - 配置对象
   */
  constructor(scene, attributes, config = {}) {
    this.scene = scene;
    this.attributes = attributes;
    
    // 位置配置
    this.x = config.x ?? 100;
    this.y = config.y ?? 50;
    this.width = config.width ?? 200;
    
    // UI元素
    this.container = null;
    this.reputationText = null;
    this.moralityText = null;
    this.healthText = null;
    this.energyText = null;
    this.levelText = null;
    
    // 动画元素
    this.changeAnimations = [];
    
    this.create();
    
    // 绑定属性对象
    if (attributes) {
      attributes.bindUI(this);
    }
  }

  /**
   * 创建UI
   */
  create() {
    const { scene } = this;
    
    // 创建容器
    this.container = scene.add.container(this.x, this.y);
    
    // 背景
    const bg = scene.add.rectangle(0, 0, this.width, 120, 0xf5f1e8);
    bg.setStrokeStyle(1, 0xd4c9a8);
    this.container.add(bg);
    
    // 标题
    const title = scene.add.text(0, -50, '玩家属性', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    title.setOrigin(0.5);
    this.container.add(title);
    
    // 声望等级
    this.levelText = scene.add.text(0, -35, '', {
      fontSize: '10px',
      color: '#666666'
    });
    this.levelText.setOrigin(0.5);
    this.container.add(this.levelText);
    
    // 声望值
    this.reputationText = scene.add.text(-this.width/2 + 10, -15, '', {
      fontSize: '11px',
      color: '#4a4a4a'
    });
    this.reputationText.setOrigin(0, 0.5);
    this.container.add(this.reputationText);
    
    // 道德值
    this.moralityText = scene.add.text(-this.width/2 + 10, 5, '', {
      fontSize: '11px',
      color: '#4a4a4a'
    });
    this.moralityText.setOrigin(0, 0.5);
    this.container.add(this.moralityText);
    
    // 健康值
    this.healthText = scene.add.text(-this.width/2 + 10, 25, '', {
      fontSize: '11px',
      color: '#4a4a4a'
    });
    this.healthText.setOrigin(0, 0.5);
    this.container.add(this.healthText);
    
    // 精力值
    this.energyText = scene.add.text(-this.width/2 + 10, 45, '', {
      fontSize: '11px',
      color: '#4a4a4a'
    });
    this.energyText.setOrigin(0, 0.5);
    this.container.add(this.energyText);
    
    // 初始更新
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    if (!this.attributes) return;
    
    const data = this.attributes.getData();
    
    // 更新声望等级
    const levelInfo = data.reputationLevel;
    this.levelText.setText(`${levelInfo.name} · ${levelInfo.title}`);
    
    // 更新声望值
    this.reputationText.setText(
      `声望: ${data.reputation}/${this.attributes.maxReputation}`
    );
    
    // 更新道德值（带颜色）
    const moralityColor = this.getMoralityColor(data.morality);
    this.moralityText.setText(
      `道德: ${data.morality} (${data.moralityStance.name})`
    );
    this.moralityText.setColor(moralityColor);
    
    // 更新健康值（带颜色）
    const healthColor = data.healthStatus.color;
    this.healthText.setText(
      `健康: ${data.health}/${this.attributes.maxHealth} [${data.healthStatus.name}]`
    );
    this.healthText.setColor(healthColor);
    
    // 更新精力值
    this.energyText.setText(
      `精力: ${data.energy}/${this.attributes.maxEnergy}`
    );
  }

  /**
   * 获取道德值颜色
   * @param {number} morality - 道德值
   * @returns {string} 颜色代码
   */
  getMoralityColor(morality) {
    if (morality >= 50) return '#2d5a27';  // 绿色
    if (morality >= 0) return '#4a4a4a';   // 灰色
    if (morality >= -30) return '#c49a2a'; // 橙色
    return '#c41e3a';                      // 红色
  }

  /**
   * 显示属性变化动画
   * @param {string} attribute - 属性名
   * @param {number} change - 变化量
   * @param {number} y - Y位置
   */
  showChangeAnimation(attribute, change, y) {
    const { scene } = this;
    
    const text = scene.add.text(0, y, 
      change > 0 ? `+${change}` : `${change}`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: change > 0 ? '#2d5a27' : '#c41e3a'
    });
    text.setOrigin(0.5);
    
    this.container.add(text);
    
    // 动画
    scene.tweens.add({
      targets: text,
      y: y - 30,
      alpha: 0,
      duration: 1000,
      ease: 'easeOut',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  /**
   * 显示惩罚提示
   * @param {string} type - 惩罚类型
   * @param {string} description - 描述
   */
  showPenaltyNotification(type, description) {
    const { scene } = this;
    
    const notification = scene.add.text(0, -80, `⚠ ${description}`, {
      fontSize: '12px',
      fontStyle: 'bold',
      color: '#c41e3a',
      backgroundColor: '#ffffff',
      padding: { x: 8, y: 4 }
    });
    notification.setOrigin(0.5);
    
    this.container.add(notification);
    
    // 闪烁动画
    scene.tweens.add({
      targets: notification,
      alpha: 0,
      duration: 200,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        scene.tweens.add({
          targets: notification,
          y: -100,
          alpha: 0,
          duration: 1000,
          onComplete: () => notification.destroy()
        });
      }
    });
  }

  /**
   * 显示等级提升提示
   * @param {object} levelInfo - 等级信息
   */
  showLevelUpNotification(levelInfo) {
    const { scene } = this;
    
    const notification = scene.add.container(0, -100);
    
    const bg = scene.add.rectangle(0, 0, 180, 50, 0xfdfaf4);
    bg.setStrokeStyle(2, 0x2d5a27);
    notification.add(bg);
    
    const title = scene.add.text(0, -10, '声望提升！', {
      fontSize: '12px',
      color: '#2d5a27'
    });
    title.setOrigin(0.5);
    notification.add(title);
    
    const levelName = scene.add.text(0, 8, `${levelInfo.name} · ${levelInfo.title}`, {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    levelName.setOrigin(0.5);
    notification.add(levelName);
    
    this.container.add(notification);
    
    // 动画
    scene.tweens.add({
      targets: notification,
      y: -120,
      alpha: 0,
      duration: 2000,
      delay: 1500,
      ease: 'easeOut',
      onComplete: () => notification.destroy()
    });
  }

  /**
   * 设置位置
   * @param {number} x - X坐标
   * @param {number} y - Y坐标
   */
  setPosition(x, y) {
    this.x = x;
    this.y = y;
    if (this.container) {
      this.container.setPosition(x, y);
    }
  }

  /**
   * 设置可见性
   * @param {boolean} visible - 是否可见
   */
  setVisible(visible) {
    if (this.container) {
      this.container.setVisible(visible);
    }
  }

  /**
   * 销毁
   */
  destroy() {
    if (this.container) {
      this.container.destroy();
    }
  }
}

/**
 * 经济系统UI组件
 * 显示金钱、收入支出、财务摘要
 */

export class EconomyUI {
  /**
   * 构造函数
   * @param {Phaser.Scene} scene - 场景对象
   * @param {EconomySystem} economy - 经济系统对象
   * @param {object} config - 配置对象
   */
  constructor(scene, economy, config = {}) {
    this.scene = scene;
    this.economy = economy;
    
    // 位置配置
    this.x = config.x ?? 860;
    this.y = config.y ?? 400;
    this.width = config.width ?? 200;
    
    // UI元素
    this.container = null;
    this.moneyText = null;
    this.incomeText = null;
    this.expenseText = null;
    this.changeAnimations = [];
    
    this.create();
  }

  /**
   * 创建UI
   */
  create() {
    const { scene } = this;
    
    // 创建容器
    this.container = scene.add.container(this.x, this.y);
    
    // 背景
    const bg = scene.add.rectangle(0, 0, this.width, 100, 0xfdfaf4);
    bg.setStrokeStyle(1, 0xd4c9a8);
    this.container.add(bg);
    
    // 标题
    const title = scene.add.text(0, -40, '钱袋', {
      fontSize: '14px',
      fontStyle: 'bold',
      color: '#1a1a1a'
    });
    title.setOrigin(0.5);
    this.container.add(title);
    
    // 金钱显示
    this.moneyText = scene.add.text(0, -15, '', {
      fontSize: '18px',
      fontStyle: 'bold',
      color: '#c49a2a'
    });
    this.moneyText.setOrigin(0.5);
    this.container.add(this.moneyText);
    
    // 今日收入
    this.incomeText = scene.add.text(-this.width/2 + 10, 10, '', {
      fontSize: '11px',
      color: '#2d5a27'
    });
    this.incomeText.setOrigin(0, 0.5);
    this.container.add(this.incomeText);
    
    // 今日支出
    this.expenseText = scene.add.text(-this.width/2 + 10, 30, '', {
      fontSize: '11px',
      color: '#c41e3a'
    });
    this.expenseText.setOrigin(0, 0.5);
    this.container.add(this.expenseText);
    
    // 初始更新
    this.updateDisplay();
  }

  /**
   * 更新显示
   */
  updateDisplay() {
    if (!this.economy) return;
    
    const summary = this.economy.getFinancialSummary();
    
    // 更新金钱显示
    this.moneyText.setText(`${summary.currentBalance} 文`);
    
    // 更新今日收入
    this.incomeText.setText(`今日收入: +${summary.todayIncome} 文`);
    
    // 更新今日支出
    this.expenseText.setText(`今日支出: -${summary.todayExpense} 文`);
  }

  /**
   * 显示金钱变化动画
   * @param {number} change - 变化量
   */
  showMoneyChange(change) {
    const { scene } = this;
    
    const text = scene.add.text(0, -15, 
      change > 0 ? `+${change}` : `${change}`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: change > 0 ? '#2d5a27' : '#c41e3a'
    });
    text.setOrigin(0.5);
    
    this.container.add(text);
    
    // 动画
    scene.tweens.add({
      targets: text,
      y: -45,
      alpha: 0,
      duration: 1000,
      ease: 'easeOut',
      onComplete: () => {
        text.destroy();
      }
    });
  }

  /**
   * 显示余额不足提示
   * @param {number} required - 需要金额
   * @param {number} available - 可用金额
   */
  showInsufficientFunds(required, available) {
    const { scene } = this;
    
    const notification = scene.add.text(0, -70, 
      `⚠ 余额不足！需要 ${required} 文，仅有 ${available} 文`, {
      fontSize: '11px',
      fontStyle: 'bold',
      color: '#c41e3a',
      backgroundColor: '#ffffff',
      padding: { x: 6, y: 3 }
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
          y: -90,
          alpha: 0,
          duration: 800,
          onComplete: () => notification.destroy()
        });
      }
    });
  }

  /**
   * 显示治疗收入提示
   * @param {object} data - 治疗收入数据
   */
  showTreatmentIncome(data) {
    const { scene } = this;
    
    const container = scene.add.container(0, -80);
    
    // 背景
    const bg = scene.add.rectangle(0, 0, 160, 50, 0xfdfaf4);
    bg.setStrokeStyle(1, 0x2d5a27);
    container.add(bg);
    
    // 标题
    const title = scene.add.text(0, -12, '治疗收入', {
      fontSize: '11px',
      color: '#2d5a27'
    });
    title.setOrigin(0.5);
    container.add(title);
    
    // 金额
    const amount = scene.add.text(0, 8, `+${data.income} 文`, {
      fontSize: '16px',
      fontStyle: 'bold',
      color: '#2d5a27'
    });
    amount.setOrigin(0.5);
    container.add(amount);
    
    this.container.add(container);
    
    // 动画
    scene.tweens.add({
      targets: container,
      y: -100,
      alpha: 0,
      duration: 2000,
      delay: 1000,
      ease: 'easeOut',
      onComplete: () => container.destroy()
    });
  }

  /**
   * 显示每日结算提示
   * @param {object} data - 每日结算数据
   */
  showDailySettlement(data) {
    const { scene } = this;
    
    const container = scene.add.container(0, -80);
    
    // 背景
    const bgColor = data.paid ? 0xfdfaf4 : 0xfff0f0;
    const borderColor = data.paid ? 0xd4c9a8 : 0xc41e3a;
    const bg = scene.add.rectangle(0, 0, 160, 50, bgColor);
    bg.setStrokeStyle(1, borderColor);
    container.add(bg);
    
    // 标题
    const titleText = data.paid ? '每日支出' : '无法维持生活';
    const titleColor = data.paid ? '#4a4a4a' : '#c41e3a';
    const title = scene.add.text(0, -12, titleText, {
      fontSize: '11px',
      color: titleColor
    });
    title.setOrigin(0.5);
    container.add(title);
    
    // 金额或健康下降
    if (data.paid) {
      const amount = scene.add.text(0, 8, `-${data.healthCost} 文`, {
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#c41e3a'
      });
      amount.setOrigin(0.5);
      container.add(amount);
    } else {
      const warning = scene.add.text(0, 8, `健康 -${data.healthDecline}`, {
        fontSize: '14px',
        fontStyle: 'bold',
        color: '#c41e3a'
      });
      warning.setOrigin(0.5);
      container.add(warning);
    }
    
    this.container.add(container);
    
    // 动画
    scene.tweens.add({
      targets: container,
      y: -100,
      alpha: 0,
      duration: 2000,
      delay: 1500,
      ease: 'easeOut',
      onComplete: () => container.destroy()
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

/**
 * StoryUI - 故事对话UI组件
 * 
 * 显示Ink故事文本、选项和角色对话
 * 支持打字机效果、选项按钮、标签解析
 */

/**
 * 故事UI类
 */
export default class StoryUI {
  /**
   * @param {Phaser.Scene} scene - 所属场景
   * @param {Object} options - 配置选项
   */
  constructor(scene, options = {}) {
    this.scene = scene;
    this.container = null;
    this.textBox = null;
    this.textObject = null;
    this.choicesContainer = null;
    this.nameTag = null;
    this.background = null;
    this.continueIndicator = null;

    // 配置
    this.options = {
      x: scene.scale.width / 2,
      y: scene.scale.height - 150,
      width: 800,
      height: 200,
      padding: 20,
      textStyle: {
        fontFamily: 'Arial',
        fontSize: '18px',
        color: '#ffffff',
        wordWrap: { width: 760 }
      },
      nameTagStyle: {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffd700',
        fontStyle: 'bold'
      },
      choiceStyle: {
        fontFamily: 'Arial',
        fontSize: '16px',
        color: '#ffffff',
        backgroundColor: '#333333'
      },
      typewriterSpeed: 30, // 打字机效果速度（ms/字符）
      autoHide: false,
      ...options
    };

    this.isTyping = false;
    this.currentText = '';
    this.typingTimer = null;
    this.onChoiceSelected = null;
    this.onContinue = null;

    this._createUI();
  }

  /**
   * 创建UI元素
   * @private
   */
  _createUI() {
    const { x, y, width, height, padding } = this.options;

    // 创建容器
    this.container = this.scene.add.container(x, y);
    this.container.setDepth(1000);
    this.container.setVisible(false);

    // 创建背景
    this.background = this.scene.add.graphics();
    this._drawBackground();
    this.container.add(this.background);

    // 创建名字标签
    this.nameTag = this.scene.add.text(
      -width / 2 + padding,
      -height / 2 + 10,
      '',
      this.options.nameTagStyle
    );
    this.container.add(this.nameTag);

    // 创建文本框
    this.textBox = this.scene.add.rectangle(
      0,
      0,
      width - padding * 2,
      height - padding * 2 - 30,
      0x000000,
      0
    );
    this.container.add(this.textBox);

    // 创建文本对象
    this.textObject = this.scene.add.text(
      -width / 2 + padding,
      -height / 2 + 40,
      '',
      this.options.textStyle
    );
    this.container.add(this.textObject);

    // 创建继续指示器
    this.continueIndicator = this.scene.add.text(
      width / 2 - 30,
      height / 2 - 25,
      '▼',
      {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#ffffff'
      }
    );
    this.continueIndicator.setVisible(false);
    this.container.add(this.continueIndicator);

    // 创建选项容器
    this.choicesContainer = this.scene.add.container(0, height / 2 + 30);
    this.container.add(this.choicesContainer);

    // 点击继续
    this.background.setInteractive(
      new Phaser.Geom.Rectangle(-width / 2, -height / 2, width, height),
      Phaser.Geom.Rectangle.Contains
    );
    this.background.on('pointerdown', () => {
      if (!this.isTyping && this.onContinue) {
        this.onContinue();
      }
    });

    // 闪烁动画
    this.scene.tweens.add({
      targets: this.continueIndicator,
      alpha: 0.3,
      duration: 500,
      yoyo: true,
      repeat: -1
    });
  }

  /**
   * 绘制背景
   * @private
   */
  _drawBackground() {
    const { width, height } = this.options;
    this.background.clear();

    // 主背景
    this.background.fillStyle(0x000000, 0.85);
    this.background.fillRoundedRect(-width / 2, -height / 2, width, height, 10);

    // 边框
    this.background.lineStyle(2, 0x666666, 1);
    this.background.strokeRoundedRect(-width / 2, -height / 2, width, height, 10);

    // 装饰线
    this.background.lineStyle(1, 0x444444, 1);
    this.background.lineBetween(-width / 2 + 10, -height / 2 + 35, width / 2 - 10, -height / 2 + 35);
  }

  /**
   * 显示故事内容
   * @param {string} text - 故事文本
   * @param {Object} options - 显示选项
   * @param {string} options.speaker - 说话者名称
   * @param {Array} options.tags - 标签数组
   * @param {boolean} options.useTypewriter - 是否使用打字机效果
   */
  showText(text, options = {}) {
    const { speaker, tags = [], useTypewriter = true } = options;

    // 停止之前的打字效果
    this._stopTyping();

    // 设置说话者名称
    if (speaker) {
      this.nameTag.setText(speaker);
      this.nameTag.setVisible(true);
    } else {
      this.nameTag.setVisible(false);
    }

    // 解析标签
    const parsedText = this._parseTags(text, tags);
    this.currentText = parsedText;

    // 显示文本
    if (useTypewriter) {
      this._startTyping(parsedText);
    } else {
      this.textObject.setText(parsedText);
      this._showContinueIndicator();
    }

    this.container.setVisible(true);
  }

  /**
   * 开始打字机效果
   * @private
   */
  _startTyping(text) {
    this.isTyping = true;
    this.textObject.setText('');
    this.continueIndicator.setVisible(false);

    let index = 0;
    const chars = Array.from(text);

    this.typingTimer = this.scene.time.addEvent({
      delay: this.options.typewriterSpeed,
      callback: () => {
        if (index < chars.length) {
          this.textObject.text += chars[index];
          index++;
        } else {
          this._stopTyping();
          this._showContinueIndicator();
        }
      },
      callbackScope: this,
      loop: true
    });
  }

  /**
   * 停止打字机效果
   * @private
   */
  _stopTyping() {
    if (this.typingTimer) {
      this.typingTimer.remove();
      this.typingTimer = null;
    }
    this.isTyping = false;
  }

  /**
   * 立即完成打字
   */
  completeTyping() {
    if (this.isTyping) {
      this._stopTyping();
      this.textObject.setText(this.currentText);
      this._showContinueIndicator();
    }
  }

  /**
   * 显示继续指示器
   * @private
   */
  _showContinueIndicator() {
    this.continueIndicator.setVisible(true);
  }

  /**
   * 隐藏继续指示器
   * @private
   */
  _hideContinueIndicator() {
    this.continueIndicator.setVisible(false);
  }

  /**
   * 解析标签
   * @private
   */
  _parseTags(text, tags) {
    // 处理背景标签
    const backgroundTag = tags.find(tag => tag.startsWith('background:'));
    if (backgroundTag) {
      const bgName = backgroundTag.split(':')[1].trim();
      this.scene.events.emit('story-change-background', bgName);
    }

    // 处理音乐标签
    const musicTag = tags.find(tag => tag.startsWith('music:'));
    if (musicTag) {
      const musicName = musicTag.split(':')[1].trim();
      this.scene.events.emit('story-change-music', musicName);
    }

    return text;
  }

  /**
   * 显示选项
   * @param {Array} choices - 选项数组 { index, text, tags }
   * @param {Function} onSelect - 选择回调
   */
  showChoices(choices, onSelect) {
    // 清除旧选项
    this.choicesContainer.removeAll(true);

    if (!choices || choices.length === 0) {
      return;
    }

    this.onChoiceSelected = onSelect;

    const buttonWidth = 250;
    const buttonHeight = 40;
    const spacing = 10;
    const startY = -(choices.length * (buttonHeight + spacing)) / 2;

    choices.forEach((choice, index) => {
      const buttonY = startY + index * (buttonHeight + spacing);

      // 创建按钮背景
      const button = this.scene.add.rectangle(0, buttonY, buttonWidth, buttonHeight, 0x333333);
      button.setInteractive({ useHandCursor: true });

      // 创建按钮文本
      const buttonText = this.scene.add.text(0, buttonY, choice.text, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#ffffff'
      });
      buttonText.setOrigin(0.5);

      // 悬停效果
      button.on('pointerover', () => {
        button.setFillStyle(0x555555);
      });

      button.on('pointerout', () => {
        button.setFillStyle(0x333333);
      });

      // 点击事件
      button.on('pointerdown', () => {
        if (this.onChoiceSelected) {
          this.onChoiceSelected(choice.index);
        }
      });

      this.choicesContainer.add([button, buttonText]);
    });

    // 隐藏继续指示器（有选项时不显示）
    this._hideContinueIndicator();
  }

  /**
   * 清除选项
   */
  clearChoices() {
    this.choicesContainer.removeAll(true);
    this.onChoiceSelected = null;
  }

  /**
   * 隐藏UI
   */
  hide() {
    this._stopTyping();
    this.container.setVisible(false);
    this.clearChoices();
  }

  /**
   * 显示UI
   */
  show() {
    this.container.setVisible(true);
  }

  /**
   * 设置继续回调
   * @param {Function} callback
   */
  setOnContinue(callback) {
    this.onContinue = callback;
  }

  /**
   * 设置位置
   * @param {number} x
   * @param {number} y
   */
  setPosition(x, y) {
    this.container.setPosition(x, y);
  }

  /**
   * 设置大小
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {
    this.options.width = width;
    this.options.height = height;
    this._drawBackground();
  }

  /**
   * 销毁UI
   */
  destroy() {
    this._stopTyping();
    if (this.container) {
      this.container.destroy();
    }
  }
}

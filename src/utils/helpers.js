/**
 * 工具函数模块
 */

/**
 * 带种子的随机数生成器
 * 使用 Fisher-Yates 洗牌算法
 */
export class SeededRandom {
  constructor(seed) {
    this.seed = seed;
    // 使用简单的线性同余生成器
    this.state = seed;
  }

  /**
   * 生成 [0, 1) 范围的随机数
   */
  next() {
    this.state = (this.state * 1103515245 + 12345) & 0x7fffffff;
    return this.state / 0x7fffffff;
  }

  /**
   * 生成 [min, max] 范围的整数
   */
  nextInt(min, max) {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /**
   * Fisher-Yates 洗牌算法（带种子）
   */
  shuffle(array) {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = this.nextInt(0, i);
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}

/**
 * 延迟函数
 */
export function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 插值函数
 */
export function lerp(start, end, t) {
  return start + (end - start) * t;
}

/**
 * 限制值在范围内
 */
export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/**
 * 安全的 localStorage 操作
 */
export const Storage = {
  get(key, defaultValue = null) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : defaultValue;
    } catch (e) {
      console.warn(`Storage.get error for key "${key}":`, e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.warn(`Storage.set error for key "${key}":`, e);
      return false;
    }
  },

  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.warn(`Storage.remove error for key "${key}":`, e);
      return false;
    }
  }
};

/**
 * 是否首次游玩
 */
export function isFirstTime() {
  return !Storage.get('medgod_played_before', false);
}

/**
 * 标记已游玩
 */
export function markPlayed() {
  Storage.set('medgod_played_before', true);
}

/**
 * 获取保存的游戏状态
 */
export function getSavedGame() {
  return Storage.get('medgod_game_state', null);
}

/**
 * 保存游戏状态
 */
export function saveGame(state) {
  Storage.set('medgod_game_state', {
    ...state,
    timestamp: Date.now()
  });
}

/**
 * 清除保存的游戏状态
 */
export function clearSavedGame() {
  Storage.remove('medgod_game_state');
}
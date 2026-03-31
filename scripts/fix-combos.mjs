/**
 * 修复combos.json中引用的已移除技能牌
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 已移除的技能牌映射到草药牌
const CARD_REPLACEMENTS = {
  'zhenjiu': 'chaihu',      // 针灸 → 柴胡
  'tuina': 'danggui',       // 推拿 → 当归
  'baguan': 'chenpi',       // 拔罐 → 陈皮
  'qigong': 'baizhu',       // 气功 → 白术
  'aijiu': 'ganjiang',      // 艾灸 → 干姜
  'guasha': 'jiegeng',      // 刮痧 → 桔梗
  'zhuyou': 'fuling',       // 祝由 → 茯苓
  'qigu': 'renshen',        // 歧黄 → 人参
  'fuzhou': 'fangfeng'      // 符咒 → 防风
};

const combosPath = path.join(__dirname, '..', 'src', 'config', 'combos.json');

// 读取文件
let content = fs.readFileSync(combosPath, 'utf-8');

// 替换所有引用的技能牌
let replaceCount = 0;
for (const [oldCard, newCard] of Object.entries(CARD_REPLACEMENTS)) {
  const regex = new RegExp(`"${oldCard}"`, 'g');
  const matches = content.match(regex);
  if (matches) {
    content = content.replace(regex, `"${newCard}"`);
    console.log(`替换 ${oldCard} → ${newCard}: ${matches.length} 处`);
    replaceCount += matches.length;
  }
}

// 保存文件
fs.writeFileSync(combosPath, content, 'utf-8');
console.log(`\n共替换 ${replaceCount} 处引用`);
console.log(`文件已保存: ${combosPath}`);

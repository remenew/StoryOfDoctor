/**
 * 修复卡牌类型命名：将 drug 改为 herb
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cardsPath = path.join(__dirname, '..', 'src', 'config', 'cards.json');
const cardsData = JSON.parse(fs.readFileSync(cardsPath, 'utf-8'));

let fixCount = 0;

// 修复所有卡牌的 type 字段
for (const card of cardsData.cards) {
  if (card.type === 'drug') {
    card.type = 'herb';
    fixCount++;
  }
}

console.log(`修复了 ${fixCount} 张卡牌的类型：drug → herb`);

// 保存文件
fs.writeFileSync(cardsPath, JSON.stringify(cardsData, null, 2), 'utf-8');
console.log(`已保存到: ${cardsPath}`);

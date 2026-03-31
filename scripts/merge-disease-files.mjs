/**
 * 合并 disease-cards.json 到 diseases.json
 * 将 effectiveHerbs 添加到 diseases.json 的每个疾病中
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取文件
const diseasesPath = path.join(__dirname, '..', 'src', 'config', 'diseases.json');
const diseaseCardsPath = path.join(__dirname, '..', 'src', 'config', 'disease-cards.json');

const diseasesData = JSON.parse(fs.readFileSync(diseasesPath, 'utf-8'));
const diseaseCardsData = JSON.parse(fs.readFileSync(diseaseCardsPath, 'utf-8'));

console.log(`diseases.json 中有 ${diseasesData.diseases.length} 个疾病`);
console.log(`disease-cards.json 中有 ${Object.keys(diseaseCardsData.diseases).length} 个疾病`);

// 合并数据
let mergedCount = 0;
let notFoundCount = 0;

for (const disease of diseasesData.diseases) {
  const cardData = diseaseCardsData.diseases[disease.id];
  
  if (cardData && cardData.effectiveHerbs) {
    // 添加 effectiveHerbs 到疾病数据
    disease.effectiveHerbs = cardData.effectiveHerbs;
    disease.totalAttackPower = cardData.totalAttackPower || 0;
    mergedCount++;
  } else {
    // 初始化空数组
    disease.effectiveHerbs = [];
    disease.totalAttackPower = 0;
    notFoundCount++;
    console.log(`  未找到有效草药: ${disease.id} - ${disease.name}`);
  }
}

console.log(`\n合并成功: ${mergedCount} 个疾病`);
console.log(`未找到草药数据: ${notFoundCount} 个疾病`);

// 添加元数据
if (!diseasesData.meta.effectiveHerbsMeta) {
  diseasesData.meta.effectiveHerbsMeta = {
    description: '疾病有效草药关联数据',
    roleAttackPower: diseaseCardsData.meta.roleAttackPower,
    specialHerbs: diseaseCardsData.meta.specialHerbs
  };
}

// 保存合并后的文件
fs.writeFileSync(diseasesPath, JSON.stringify(diseasesData, null, 2), 'utf-8');
console.log(`\n合并完成，已保存到: ${diseasesPath}`);

// 备份并删除 disease-cards.json
const backupPath = path.join(__dirname, '..', 'src', 'config', 'disease-cards.json.bak');
fs.copyFileSync(diseaseCardsPath, backupPath);
fs.unlinkSync(diseaseCardsPath);
console.log(`已备份并删除 disease-cards.json`);
console.log(`备份位置: ${backupPath}`);

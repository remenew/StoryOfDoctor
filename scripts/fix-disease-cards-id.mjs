/**
 * 修复 disease-cards.json 的ID格式，使其与 diseases.json 匹配
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 读取 diseases.json 获取ID映射
const diseasesPath = path.join(__dirname, '..', 'src', 'config', 'diseases.json');
const diseasesData = JSON.parse(fs.readFileSync(diseasesPath, 'utf-8'));

// 读取 disease-cards.json
const diseaseCardsPath = path.join(__dirname, '..', 'src', 'config', 'disease-cards.json');
const diseaseCardsData = JSON.parse(fs.readFileSync(diseaseCardsPath, 'utf-8'));

// 创建映射：疾病名称 -> diseases.json ID
const nameToIdMap = new Map();
for (const disease of diseasesData.diseases) {
  const key = `${disease.diseaseName}·${disease.syndrome}`;
  nameToIdMap.set(key, disease.id);
}

console.log(` diseases.json 中有 ${nameToIdMap.size} 个疾病`);

// 更新 disease-cards.json 中的ID
const newDiseases = {};
let matchedCount = 0;
let unmatchedCount = 0;

for (const [oldId, disease] of Object.entries(diseaseCardsData.diseases)) {
  const newId = nameToIdMap.get(disease.name);
  
  if (newId) {
    newDiseases[newId] = {
      ...disease,
      id: newId
    };
    matchedCount++;
  } else {
    // 保留原有ID（无法匹配的疾病）
    newDiseases[oldId] = disease;
    unmatchedCount++;
    console.log(`  未匹配: ${disease.name} (${oldId})`);
  }
}

console.log(`\n匹配成功: ${matchedCount} 个`);
console.log(`未匹配: ${unmatchedCount} 个`);

// 保存结果
const output = {
  ...diseaseCardsData,
  diseases: newDiseases
};

fs.writeFileSync(diseaseCardsPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`\n文件已保存: ${diseaseCardsPath}`);

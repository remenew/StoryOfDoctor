/**
 * 将 levels.json 转换为地点-病人结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const levelsPath = path.join(__dirname, '..', 'src', 'config', 'levels.json');
const levelsData = JSON.parse(fs.readFileSync(levelsPath, 'utf-8'));

// 将关卡转换为地点-病人结构
const locations = [];

// 按章节分组
const chapters = {};
for (const level of levelsData.levels) {
  if (!chapters[level.chapter]) {
    chapters[level.chapter] = [];
  }
  chapters[level.chapter].push(level);
}

// 为每个章节创建地点
let locationIndex = 0;
for (const [chapterId, levels] of Object.entries(chapters)) {
  // 每个地点包含1-3个病人
  const patientsPerLocation = Math.ceil(levels.length / 2);
  
  for (let i = 0; i < levels.length; i++) {
    const level = levels[i];
    
    // 创建地点（每1-2个关卡合并为一个地点）
    if (i % 2 === 0 || i === levels.length - 1) {
      const locationPatients = [];
      
      // 添加当前关卡的病人
      locationPatients.push({
        id: `patient_${level.id}`,
        name: level.patientName,
        identity: getIdentityFromName(level.patientName),
        disease: level.diseaseId,
        diseaseSeverity: getSeverityFromHealth(level.patientHealth, level.targetHealth),
        health: level.patientHealth,
        targetHealth: level.targetHealth,
        description: level.description
      });
      
      // 如果有下一个关卡，也添加（最多2个病人）
      if (i + 1 < levels.length && i % 2 === 0) {
        const nextLevel = levels[i + 1];
        locationPatients.push({
          id: `patient_${nextLevel.id}`,
          name: nextLevel.patientName,
          identity: getIdentityFromName(nextLevel.patientName),
          disease: nextLevel.diseaseId,
          diseaseSeverity: getSeverityFromHealth(nextLevel.patientHealth, nextLevel.targetHealth),
          health: nextLevel.patientHealth,
          targetHealth: nextLevel.targetHealth,
          description: nextLevel.description
        });
      }
      
      locations.push({
        id: `loc_${chapterId}_${locationIndex}`,
        chapter: chapterId,
        name: getLocationName(chapterId, locationIndex),
        description: getLocationDescription(locationPatients),
        type: getLocationType(locationPatients),
        patients: locationPatients,
        position: getLocationPosition(chapterId, locationIndex),
        reward: level.reward
      });
      
      locationIndex++;
    }
  }
}

// 辅助函数
function getIdentityFromName(name) {
  if (name.includes('村民')) return '村民';
  if (name.includes('书生')) return '书生';
  if (name.includes('老农')) return '农夫';
  if (name.includes('渔夫')) return '渔夫';
  if (name.includes('商人')) return '商人';
  if (name.includes('樵夫')) return '樵夫';
  return '平民';
}

function getSeverityFromHealth(health, target) {
  const ratio = health / target;
  if (ratio < 0.5) return 'critical';
  if (ratio < 0.7) return 'severe';
  if (ratio < 0.9) return 'moderate';
  return 'mild';
}

function getLocationName(chapter, index) {
  const names = {
    'chapter_1': ['村口', '集市', '客栈', '码头'],
    'chapter_2': ['县城', '药铺', '书院', '茶馆'],
    'chapter_3': ['府城', '衙门', '寺庙', '山庄'],
    'chapter_4': ['京城', '御医院', '皇宫', '江湖']
  };
  const chapterNames = names[chapter] || ['地点'];
  return chapterNames[index % chapterNames.length] || `地点${index + 1}`;
}

function getLocationDescription(patients) {
  if (patients.length === 1) {
    return `这里有${patients[0].name}等待治疗`;
  }
  return `这里有${patients.length}位病人等待治疗`;
}

function getLocationType(patients) {
  const hasCritical = patients.some(p => p.diseaseSeverity === 'critical');
  const hasSevere = patients.some(p => p.diseaseSeverity === 'severe');
  
  if (hasCritical) return 'emergency';
  if (hasSevere) return 'hard';
  return 'normal';
}

function getLocationPosition(chapter, index) {
  // 简化的位置计算
  const baseX = 200 + (index % 2) * 400;
  const baseY = 100 + Math.floor(index / 2) * 150;
  return { x: baseX, y: baseY };
}

// 创建新的数据结构
const newData = {
  meta: {
    version: '2.0.0',
    description: '地点-病人关联配置'
  },
  chapters: levelsData.chapters,
  locations: locations
};

// 保存新文件
const outputPath = path.join(__dirname, '..', 'src', 'config', 'locations.json');
fs.writeFileSync(outputPath, JSON.stringify(newData, null, 2), 'utf-8');

console.log(`创建了 ${locations.length} 个地点`);
console.log(`文件已保存到: ${outputPath}`);

// 显示前3个地点作为示例
console.log('\n示例地点:');
for (let i = 0; i < Math.min(3, locations.length); i++) {
  const loc = locations[i];
  console.log(`\n${loc.name} (${loc.id}):`);
  console.log(`  病人: ${loc.patients.map(p => p.name).join(', ')}`);
  console.log(`  疾病: ${loc.patients.map(p => p.disease).join(', ')}`);
}

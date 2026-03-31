/**
 * 生成疾病-草药关联数据脚本
 * 数据链路: disease.csv ──[代表方剂]──▶ formula.csv ──[方解]──▶ herb名称 ──[name]──▶ herbs.csv
 */

const fs = require('fs');
const path = require('path');
const iconv = require('iconv-lite');

// 草药角色攻击力映射
const ROLE_ATTACK_POWER = {
  '君': 20,
  '臣': 15,
  '佐': 10,
  '使': 5
};

// 名贵草药特殊属性
const SPECIAL_HERBS = {
  '人参': {
    baseAttack: 10,
    staminaBoost: 1, // 增加每回合出牌次数
    description: '大补元气，复脉固脱，补脾益肺，生津养血，安神益智'
  },
  '西洋参': {
    baseAttack: 8,
    staminaBoost: 1,
    description: '补气养阴，清热生津'
  },
  '党参': {
    baseAttack: 6,
    staminaBoost: 0,
    description: '健脾益肺，养血生津'
  }
};

/**
 * 读取CSV文件（GBK编码）
 * @param {string} filePath - 文件路径
 * @returns {string} 解码后的内容
 */
function readCSV(filePath) {
  const buffer = fs.readFileSync(filePath);
  return iconv.decode(buffer, 'gbk');
}

/**
 * 解析CSV行
 * @param {string} line - CSV行
 * @returns {string[]} 字段数组
 */
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
}

/**
 * 解析方剂组成和方解
 * @param {string} composition - 组成字段
 * @param {string} analysis - 方解字段
 * @returns {Array} 草药列表[{name, role, attack}]
 */
function parseFormula(composition, analysis) {
  const herbs = [];
  
  if (!composition || !analysis) return herbs;
  
  // 解析方解中的角色分配
  // 格式示例: "君：麻黄、桂枝；臣：杏仁；佐：炙甘草"
  const rolePattern = /([君臣佐使])[：:]([^；;]+)/g;
  let match;
  
  while ((match = rolePattern.exec(analysis)) !== null) {
    const role = match[1];
    const herbNames = match[2].split(/[,，、]/).map(n => n.trim()).filter(n => n);
    
    for (const herbName of herbNames) {
      // 清理草药名称（去除剂量等信息）
      const cleanName = herbName.replace(/\d+[g克]/g, '').trim();
      
      if (cleanName) {
        herbs.push({
          name: cleanName,
          role: role,
          attack: ROLE_ATTACK_POWER[role] || 5
        });
      }
    }
  }
  
  return herbs;
}

/**
 * 从herbs.csv查找草药信息
 * @param {string} herbName - 草药名称
 * @param {Array} herbsData - 草药数据
 * @returns {Object|null} 草药信息
 */
function findHerbInfo(herbName, herbsData) {
  // 尝试完全匹配
  let herb = herbsData.find(h => h.name === herbName);
  
  // 尝试包含匹配
  if (!herb) {
    herb = herbsData.find(h => herbName.includes(h.name) || h.name.includes(herbName));
  }
  
  return herb || null;
}

/**
 * 主函数
 */
function main() {
  const dataDir = path.join(__dirname, '..', 'data');
  const outputDir = path.join(__dirname, '..', 'src', 'config');
  
  // 读取草药数据
  console.log('读取草药数据...');
  const herbsContent = readCSV(path.join(dataDir, 'herbs.csv'));
  const herbsLines = herbsContent.split('\n').filter(line => line.trim());
  const herbsData = [];
  
  for (let i = 1; i < herbsLines.length; i++) {
    const fields = parseCSVLine(herbsLines[i]);
    if (fields.length >= 3) {
      herbsData.push({
        id: fields[0],
        name: fields[1],
        catalog: fields[2],
        description: fields[3] || ''
      });
    }
  }
  
  console.log(`加载了 ${herbsData.length} 种草药`);
  
  // 读取方剂数据
  console.log('读取方剂数据...');
  const formulaContent = readCSV(path.join(dataDir, 'formula.csv'));
  const formulaLines = formulaContent.split('\n').filter(line => line.trim());
  const formulaData = {};
  
  for (let i = 1; i < formulaLines.length; i++) {
    const fields = parseCSVLine(formulaLines[i]);
    if (fields.length >= 5) {
      const formulaName = fields[1]; // 方剂名称
      const composition = fields[2]; // 组成
      const analysis = fields[4]; // 方解
      
      formulaData[formulaName] = {
        name: formulaName,
        composition: composition,
        analysis: analysis,
        herbs: parseFormula(composition, analysis)
      };
    }
  }
  
  console.log(`加载了 ${Object.keys(formulaData).length} 个方剂`);
  
  // 读取疾病数据并生成关联
  console.log('读取疾病数据...');
  const diseaseContent = readCSV(path.join(dataDir, 'disease.csv'));
  const diseaseLines = diseaseContent.split('\n').filter(line => line.trim());
  const diseaseCards = {};
  
  for (let i = 1; i < diseaseLines.length; i++) {
    const fields = parseCSVLine(diseaseLines[i]);
    if (fields.length >= 7) {
      const diseaseId = `disease_${String(i - 1).padStart(4, '0')}`;
      const category = fields[0]; // 病系
      const diseaseName = fields[1]; // 病名
      const syndrome = fields[2]; // 证型名称
      const pathology = fields[3]; // 病机要点
      const treatment = fields[5]; // 治法要点
      const formula = fields[6]; // 代表方剂
      
      // 查找方剂信息
      const formulaInfo = formulaData[formula];
      let effectiveHerbs = [];
      
      if (formulaInfo && formulaInfo.herbs.length > 0) {
        effectiveHerbs = formulaInfo.herbs.map(h => {
          const herbInfo = findHerbInfo(h.name, herbsData);
          const specialHerb = SPECIAL_HERBS[h.name];
          
          return {
            name: h.name,
            role: h.role,
            attack: h.attack,
            herbId: herbInfo ? herbInfo.id : null,
            catalog: herbInfo ? herbInfo.catalog : null,
            isSpecial: !!specialHerb,
            specialEffect: specialHerb ? {
              baseAttack: specialHerb.baseAttack,
              staminaBoost: specialHerb.staminaBoost,
              description: specialHerb.description
            } : null
          };
        });
      }
      
      diseaseCards[diseaseId] = {
        id: diseaseId,
        name: `${diseaseName}·${syndrome}`,
        category: category,
        pathology: pathology,
        treatment: treatment,
        formula: formula,
        effectiveHerbs: effectiveHerbs,
        totalAttackPower: effectiveHerbs.reduce((sum, h) => sum + h.attack, 0)
      };
    }
  }
  
  console.log(`生成了 ${Object.keys(diseaseCards).length} 个疾病-草药关联`);
  
  // 保存结果
  const output = {
    meta: {
      version: '1.0.0',
      description: '疾病与有效草药关联数据',
      generatedAt: new Date().toISOString(),
      roleAttackPower: ROLE_ATTACK_POWER,
      specialHerbs: Object.keys(SPECIAL_HERBS)
    },
    diseases: diseaseCards
  };
  
  const outputPath = path.join(outputDir, 'disease-cards.json');
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2), 'utf-8');
  
  console.log(`数据已保存到: ${outputPath}`);
  
  // 打印示例
  const sampleKeys = Object.keys(diseaseCards).slice(0, 3);
  console.log('\n示例数据:');
  for (const key of sampleKeys) {
    const disease = diseaseCards[key];
    console.log(`\n${disease.name} (${disease.formula}):`);
    console.log(`  有效草药: ${disease.effectiveHerbs.map(h => `${h.name}(${h.role}:${h.attack})`).join(', ')}`);
    console.log(`  总攻击力: ${disease.totalAttackPower}`);
  }
}

main().catch(console.error);

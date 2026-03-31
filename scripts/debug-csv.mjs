import fs from 'fs';
import path from 'path';
import iconv from 'iconv-lite';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readCSV(filePath) {
  const buffer = fs.readFileSync(filePath);
  return iconv.decode(buffer, 'gbk');
}

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

const dataDir = path.join(__dirname, '..', 'data');

// 读取并显示方剂数据的前几行
console.log('=== 方剂数据示例 ===');
const formulaContent = readCSV(path.join(dataDir, 'formula.csv'));
const formulaLines = formulaContent.split('\n').filter(line => line.trim());

// 打印表头
const headers = parseCSVLine(formulaLines[0]);
console.log('表头:', headers);

// 打印前3个方剂的详细信息
for (let i = 1; i <= 3 && i < formulaLines.length; i++) {
  const fields = parseCSVLine(formulaLines[i]);
  console.log(`\n方剂 ${i}:`);
  console.log('  名称:', fields[1]);
  console.log('  组成:', fields[2]?.substring(0, 100) + '...');
  console.log('  功效:', fields[3]?.substring(0, 100) + '...');
  console.log('  方解:', fields[4]?.substring(0, 200) + '...');
}

// 检查方解中是否包含君臣佐使
console.log('\n=== 检查方解中的君臣佐使 ===');
let hasRolePattern = 0;
for (let i = 1; i < formulaLines.length; i++) {
  const fields = parseCSVLine(formulaLines[i]);
  const analysis = fields[4] || '';
  if (analysis.includes('君') || analysis.includes('臣') || analysis.includes('佐') || analysis.includes('使')) {
    hasRolePattern++;
    if (hasRolePattern <= 3) {
      console.log(`\n${fields[1]}:`);
      console.log('  方解:', analysis.substring(0, 300));
    }
  }
}
console.log(`\n共有 ${hasRolePattern} 个方剂包含君臣佐使信息`);

/**
 * 编译 Ink 脚本为 JSON
 * 使用 inkjs 的 Compiler
 * 只编译入口文件 (main.ink)，它会自动包含其他文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Compiler } from 'inkjs/full';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const storyDir = path.join(__dirname, '..', 'src', 'story');
const outputDir = path.join(__dirname, '..', 'src', 'config');

// 确保输出目录存在
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// 创建文件处理器 - 实现 IFileHandler 接口
class InkFileHandler {
  constructor(basePath) {
    this.basePath = basePath;
  }

  /**
   * 解析 Ink 文件名 - 返回文件完整路径
   * @param {string} filename - 文件名
   * @param {string|null} sourceFilename - 源文件名（用于相对路径解析）
   * @returns {string} 完整文件路径
   */
  ResolveInkFilename(filename, sourceFilename = null) {
    // 处理相对路径
    if (filename.startsWith('./') || filename.startsWith('../')) {
      const dir = sourceFilename ? path.dirname(sourceFilename) : this.basePath;
      return path.resolve(dir, filename);
    }
    // 处理绝对路径（相对于 storyDir）
    return path.join(this.basePath, filename);
  }

  /**
   * 加载 Ink 文件内容
   * @param {string} filename - 文件名
   * @param {string|null} sourceFilename - 源文件名
   * @returns {string} 文件内容
   */
  LoadInkFileContents(filename, sourceFilename = null) {
    try {
      return fs.readFileSync(filename, 'utf-8');
    } catch (error) {
      console.error(`无法加载文件: ${filename}`);
      throw new Error(`Cannot open ${filename}: ${error.message}`);
    }
  }
}

// 只编译入口文件 main.ink
// 其他文件通过 INCLUDE 指令被包含
const entryFile = 'main.ink';
const inputPath = path.join(storyDir, entryFile);
const outputFile = entryFile.replace('.ink', '.json');
const outputPath = path.join(outputDir, outputFile);

console.log(`编译 Ink 故事文件...`);

const fileHandler = new InkFileHandler(storyDir);

try {
  // 读取 Ink 文件
  const inkScript = fs.readFileSync(inputPath, 'utf-8');

  // 编译
  const compiler = new Compiler(inkScript, {
    fileHandler: fileHandler,
    sourceFilename: inputPath,
    errorHandler: (message, errorType) => {
      console.error(`编译错误 [${errorType}]: ${message}`);
    }
  });

  const story = compiler.Compile();

  // 获取 JSON 数据
  const storyData = story.ToJson();

  // 保存 JSON
  fs.writeFileSync(outputPath, storyData, 'utf-8');

  console.log(`✓ ${entryFile} -> ${outputFile}`);
  console.log(`  输出路径: ${outputPath}`);
  console.log('\n编译成功！');
} catch (error) {
  console.error(`✗ ${entryFile} 编译失败:`, error.message);
  process.exit(1);
}

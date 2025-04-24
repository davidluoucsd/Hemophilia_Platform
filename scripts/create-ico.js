/**
 * HAL问卷系统 - 创建ICO图标脚本
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

// 目标大小
const sizes = [16, 24, 32, 48, 64, 128, 256];
const svgPath = path.join(__dirname, '../public/app-icon.svg');
const outputDir = path.join(__dirname, '../public');

async function createIco() {
  try {
    console.log('开始创建ICO图标...');
    
    // 检查SVG文件是否存在
    if (!fs.existsSync(svgPath)) {
      console.error('SVG文件不存在:', svgPath);
      return;
    }
    
    // 创建不同大小的PNG文件
    const pngBuffers = [];
    
    for (const size of sizes) {
      console.log(`生成 ${size}x${size} 的图像...`);
      const pngBuffer = await sharp(svgPath)
        .resize(size, size)
        .png()
        .toBuffer();
      
      pngBuffers.push(pngBuffer);
    }
    
    // 将PNG转换为ICO
    console.log('将PNG转换为ICO...');
    const icoBuffer = await toIco(pngBuffers);
    
    // 保存ICO文件
    const icoPath = path.join(outputDir, 'app-icon.ico');
    fs.writeFileSync(icoPath, icoBuffer);
    
    console.log('ICO图标创建成功:', icoPath);
  } catch (error) {
    console.error('创建ICO图标失败:', error);
  }
}

createIco(); 
/**
 * HAL问卷系统 - Electron 预加载脚本
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

const { contextBridge, ipcRenderer } = require('electron');

// 暴露安全的API给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
  // 保存文件函数
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  
  // 添加应用版本信息
  getAppInfo: () => {
    return {
      version: '1.0.0',
      author: '罗骏哲（Junzhe Luo）',
      name: 'HAL问卷系统'
    };
  },
  
  // 获取平台信息
  getPlatform: () => process.platform
}); 
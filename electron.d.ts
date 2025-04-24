/**
 * HAL问卷系统 - Electron类型声明
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

// 为Window对象扩展electronAPI属性
interface Window {
  electronAPI?: {
    saveFile: (data: { 
      content: string | Buffer | ArrayBuffer | Uint8Array, 
      fileName: string,
      fileType: 'csv' | 'xlsx' | string
    }) => Promise<{ 
      success: boolean, 
      message?: string, 
      filePath?: string 
    }>;
    
    getAppInfo: () => {
      version: string;
      author: string;
      name: string;
    };
    
    getPlatform: () => string;
  };
} 
/**
 * HAL问卷系统 - Electron 主进程文件
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

const { app, BrowserWindow, Menu, dialog, shell, ipcMain } = require('electron');
const path = require('path');
const serve = require('electron-serve');
const fs = require('fs');

// 是否是开发环境
const isDev = process.env.NODE_ENV === 'development';
const port = process.env.PORT || 3000;

// 加载Next.js生成的静态文件
const loadURL = serve({ directory: 'out' });

// 定义主窗口
let mainWindow;

function createWindow() {
  // 创建浏览器窗口
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: path.join(__dirname, 'public', 'app-icon.ico')
  });

  // 设置应用菜单
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '打印',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.print()
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              title: '关于 HAL问卷系统',
              message: 'HAL问卷系统',
              detail: '版本: 1.0.0\n版权所有 © 2025 罗骏哲（Junzhe Luo）\n\n本软件用于评估血友病患者的关节健康和功能状态。',
              buttons: ['确定'],
              icon: path.join(__dirname, 'public', 'app-icon.ico')
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  // 加载应用 - 开发环境使用localhost，生产环境使用静态文件
  if (isDev) {
    mainWindow.loadURL(`http://localhost:${port}/`);
    mainWindow.webContents.openDevTools();
  } else {
    loadURL(mainWindow);
    // 调试用 - 临时打开开发者工具查看错误
    // mainWindow.webContents.openDevTools();
  }

  // 窗口准备好后再显示，避免白屏
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 监听窗口关闭事件
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 处理外部链接，在默认浏览器中打开
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

// 当Electron完成初始化时，创建窗口
app.whenReady().then(() => {
  createWindow();

  // 在macOS上，当点击dock图标且没有其他窗口打开时，重新创建一个窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// 当所有窗口关闭时退出应用，在macOS上除外
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// 处理导出到本地文件的请求
ipcMain.handle('save-file', async (event, { content, fileName, fileType }) => {
  const options = {
    title: '保存文件',
    defaultPath: fileName,
    filters: []
  };
  
  if (fileType === 'csv') {
    options.filters.push({ name: 'CSV文件', extensions: ['csv'] });
  } else if (fileType === 'xlsx') {
    options.filters.push({ name: 'Excel文件', extensions: ['xlsx'] });
  }
  
  const { canceled, filePath } = await dialog.showSaveDialog(options);
  if (canceled || !filePath) {
    return { success: false, message: '操作取消' };
  }
  
  try {
    fs.writeFileSync(filePath, content);
    return { success: true, filePath };
  } catch (err) {
    return { success: false, message: `保存失败: ${err.message}` };
  }
}); 
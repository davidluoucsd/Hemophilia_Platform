# HAL问卷系统

血友病活动列表（HAL）问卷系统，用于评估血友病患者的关节健康和功能状态。

## 功能特点

- 患者信息收集与管理
- HAL问卷填写与评分计算
- 结果数据可视化展示
- 数据导出（CSV、Excel）功能
- 批量导出患者评估记录
- 可作为桌面应用安装使用

## 技术栈

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Electron
- Chart.js
- Zustand 状态管理

## 开发指南

### 环境要求

- Node.js 18+ 
- npm 9+

### 安装依赖

```bash
cd hemophilia-next
npm install
```

### 开发模式

启动Next.js开发服务器：

```bash
npm run dev
```

启动Electron开发模式：

```bash
npm run electron-dev
```

### 构建应用

构建Web应用：

```bash
npm run build
```

构建桌面应用：

```bash
npm run electron-build
```

## 构建可执行文件 (exe)

要构建Windows可执行文件，请按照以下步骤操作：

1. 确保已安装所有依赖：
   ```bash
   npm install
   ```

2. 创建应用图标：
   ```bash
   npm run create-ico
   ```

3. 构建应用：
   ```bash
   npm run electron-build
   ```

4. 构建完成后，可执行文件将位于`dist`目录中。

## 分发应用

构建完成后，以下文件将位于`dist`目录中：

- `HAL问卷系统 Setup 1.0.0.exe` - 安装程序
- `hal-questionnaire-1.0.0-win.zip` - 便携版压缩包

## 版权信息

© 2024 罗骏哲（Junzhe Luo）. 版权所有.

未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。

/**
 * HAL问卷系统 - 条形图组件
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

// 注册Chart.js组件
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// 类型定义
interface BarChartComponentProps {
  labels: string[];
  values: number[];
  sumScore: number | null;
}

// 图表颜色配置
const chartColors = {
  primary: 'rgba(66, 133, 244, 0.7)',
  highlight: 'rgba(66, 133, 244, 1)',
  border: 'rgba(66, 133, 244, 1)',
  background: 'rgba(66, 133, 244, 0.1)',
};

const BarChartComponent: React.FC<BarChartComponentProps> = ({ labels, values, sumScore }) => {
  // 准备图表数据
  const data = {
    labels,
    datasets: [
      {
        label: 'HAL得分',
        data: values,
        backgroundColor: chartColors.primary,
        borderColor: chartColors.border,
        borderWidth: 1,
      },
    ],
  };
  
  // 图表配置选项
  const options: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: '分数',
        },
      },
      x: {
        title: {
          display: true,
          text: '功能域',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: `HAL评估得分图表 (总分: ${sumScore !== null ? sumScore.toFixed(1) : 'N/A'})`,
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `得分: ${context.parsed.y.toFixed(1)}`;
          }
        }
      }
    },
  };
  
  return <Bar data={data} options={options} />;
};

export default BarChartComponent; 
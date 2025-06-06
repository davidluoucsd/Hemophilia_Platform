/**
 * HAL问卷系统 - 得分图表组件
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useEffect, useState } from 'react';
import { DomainScores } from '../types';
import { getDomainTitle } from '../utils/exportUtils';
import dynamic from 'next/dynamic';

// 类型定义
interface ChartComponentProps {
  labels: string[];
  values: number[];
  sumScore: number | null;
}

// 动态导入 Chart 组件，不在服务端渲染
const ChartComponent = dynamic(
  () => import('./chart/BarChartComponent').then((mod) => mod.default),
  { ssr: false }
);

interface ScoreChartProps {
  domainScores: DomainScores;
  sumScore: number | null;
}

// 标准域列表，仅展示这些域
const STANDARD_DOMAINS = ['LSKS', 'LEGS', 'ARMS', 'TRANS', 'SELFC', 'HOUSEH', 'LEISPO'];

const ScoreChart: React.FC<ScoreChartProps> = ({ domainScores, sumScore }) => {
  const [isClient, setIsClient] = useState(false);
  
  useEffect(() => {
    setIsClient(true);
  }, []);
  
  // 提取有效的标准域得分
  const domainEntries = Object.entries(domainScores)
    .filter(([domain, score]) => 
      STANDARD_DOMAINS.includes(domain) && 
      score !== null && 
      typeof score === 'number'
    );
  
  const labels = domainEntries.map(([domain]) => getDomainTitle(domain));
  const values = domainEntries.map(([_, score]) => score as number);
  
  return (
    <div className="score-chart">
      {isClient && values.length > 0 && (
        <ChartComponent 
          labels={labels} 
          values={values}
          sumScore={sumScore}
        />
      )}
      {isClient && values.length === 0 && (
        <div className="h-full flex items-center justify-center text-gray-500">
          没有可用的评分数据展示
        </div>
      )}
    </div>
  );
};

export default ScoreChart; 
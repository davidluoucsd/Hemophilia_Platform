/**
 * HAL问卷系统 - 结果页面
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useHalStore } from '../store';
import ProgressIndicator from '../components/ProgressIndicator';
import ScoreChart from '../components/ScoreChart';
import { 
  formatDate, 
  exportToCSV, 
  exportToExcel, 
  batchExport,
  getDomainTitle,
  prepareExportData
} from '../utils/exportUtils';

// 域名标题映射
const DOMAIN_TITLES: Record<string, string> = {
  LSKS: "成人血友病活动列表-躺坐跪站",
  LEGS: "成人血友病活动列表-下肢功能",
  ARMS: "成人血友病活动列表-上肢功能",
  TRANS: "成人血友病活动列表-交通工具",
  SELFC: "成人血友病活动列表-自我照料",
  HOUSEH: "成人血友病活动列表-家务劳动",
  LEISPO: "成人血友病活动列表-休闲体育",
};

// 域名对应的图标和描述
const DOMAIN_DETAILS: Record<string, { icon: string, description: string }> = {
  LSKS: { 
    icon: '🧍', 
    description: '衡量患者在进行躯干相关活动时的能力表现'
  },
  LEGS: { 
    icon: '🚶', 
    description: '评估患者在使用下肢进行日常活动的功能水平'
  },
  ARMS: { 
    icon: '💪', 
    description: '测量患者上肢功能在各种日常任务中的表现'
  },
  TRANS: { 
    icon: '🚌', 
    description: '评价患者使用各种交通工具的能力'
  },
  SELFC: { 
    icon: '🛀', 
    description: '衡量患者在个人护理方面的自理能力'
  },
  HOUSEH: { 
    icon: '🧹', 
    description: '评估患者完成家务活动的能力水平'
  },
  LEISPO: { 
    icon: '⚽', 
    description: '衡量患者参与休闲活动和体育运动的能力'
  },
};

// 分数评估等级判定
const getScoreLevel = (score: number | null): { level: string, color: string } => {
  if (score === null) return { level: '未知', color: 'gray-500' };
  
  if (score <= 20) return { level: '重度受限', color: 'red-600' };
  if (score <= 40) return { level: '中度受限', color: 'orange-500' };
  if (score <= 60) return { level: '轻度受限', color: 'yellow-600' };
  if (score <= 80) return { level: '轻微受限', color: 'blue-500' };
  return { level: '正常功能', color: 'green-600' };
};

const ResultPage: React.FC = () => {
  const router = useRouter();
  const { 
    patientInfo, 
    answers, 
    assessmentResult,
    isLoading, 
    setLoading,
    calculateResults,
    setCurrentStep,
    clearData,
    // 患者记录管理函数
    addPatientRecord,
    patientRecords,
    getPatientRecords
  } = useHalStore();
  
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'excel'>('excel');
  const [showChart, setShowChart] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [loadingState, setLoadingState] = useState<string>('初始化');
  const [recordAdded, setRecordAdded] = useState<boolean>(false);
  
  // 检查客户端挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 数据加载和处理
  useEffect(() => {
    if (!isMounted) return;
    
    let isActive = true;
    
    async function loadAndCalculate() {
      try {
        setLoadingState('检查患者信息');
        
        if (!patientInfo) {
          // 如果没有患者信息，重定向到首页
          router.push('/');
          return;
        }
        
        // 设置当前步骤为结果页
        setCurrentStep('results');
        
        if (!assessmentResult && isActive) {
          // 如果还没有计算结果，计算结果
          setLoadingState('计算评估结果');
          calculateResults();
        }
        
        // 将当前患者添加到记录列表中（如果尚未添加）
        if (patientInfo && assessmentResult && !recordAdded) {
          addPatientRecord();
          setRecordAdded(true);
        }
        
        setLoadingState('加载完成');
      } catch (error) {
        console.error('加载结果页时出错:', error);
        setLoadingState('出错');
      }
    }
    
    loadAndCalculate();
    
    // 清理函数
    return () => {
      isActive = false;
    };
  }, [isMounted, patientInfo, assessmentResult, calculateResults, router, setCurrentStep, addPatientRecord, recordAdded]);
  
  // 返回确认页
  const handleBackToConfirm = () => {
    router.push('/confirm');
  };
  
  // 开始新的评估
  const handleStartNew = async () => {
    try {
      setLoadingState('清除数据');
      await clearData();
      router.push('/');
    } catch (error) {
      console.error('清除数据时出错:', error);
      setLoadingState('清除数据出错');
    }
  };
  
  // 导出当前结果
  const handleExportCurrentResult = async () => {
    if (!patientInfo || !assessmentResult || !assessmentResult.domainScores) return;
    
    setExporting(true);
    try {
      setLoadingState('导出当前患者数据');
      if (exportFormat === 'csv') {
        exportToCSV(patientInfo, answers, assessmentResult.domainScores, assessmentResult.haemqolScores);
      } else {
        exportToExcel(patientInfo, answers, assessmentResult.domainScores, assessmentResult.haemqolScores);
      }
      setLoadingState('导出完成');
    } catch (error) {
      console.error('导出失败:', error);
      setLoadingState('导出失败');
    } finally {
      setExporting(false);
    }
  };
  
  // 批量导出所有结果
  const handleBatchExport = async () => {
    const records = getPatientRecords();
    if (!records || records.length === 0) {
      alert('没有可导出的患者记录');
      return;
    }
    
    setExporting(true);
    try {
      setLoadingState('批量导出所有患者数据');
      batchExport(records, exportFormat);
      setLoadingState('导出完成');
    } catch (error) {
      console.error('批量导出失败:', error);
      setLoadingState('导出失败');
    } finally {
      setExporting(false);
    }
  };
  
  // 如果还未挂载，显示简单的骨架屏
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center p-4">
        <div className="w-full max-w-4xl">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-6"></div>
            <div className="h-64 bg-gray-200 rounded mb-6"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (isLoading || !patientInfo || !assessmentResult) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="text-center">
          <div className="mb-4 text-lg">{loadingState}...</div>
          <div className="w-12 h-12 border-2 border-blue-600 rounded-full border-t-transparent animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }
  
  const { domainScores, newEncodedScores, sumScore } = assessmentResult;
  const patientCount = patientRecords.length;
  const sumScoreLevel = getScoreLevel(sumScore);
  
  return (
    <div className="min-h-screen flex flex-col items-center p-4 pb-16">
      <div className="w-full max-w-4xl">
        <ProgressIndicator 
          currentStep={4}
          totalSteps={4}
          labels={['患者信息', '生存质量问卷', 'HAL问卷', '结果']}
        />
        
        <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">评估结果</h1>
          
          {/* 患者信息卡片 */}
          <div className="mb-8 bg-gray-50 rounded-lg p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-blue-700 mb-4">患者基本信息</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">姓名</div>
                <div className="font-medium">{patientInfo.patientName}</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">年龄</div>
                <div className="font-medium">
                  {patientInfo.age} 岁
                  {patientInfo.ageGroup && <span className="ml-2 text-sm text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">({patientInfo.ageGroup})</span>}
                </div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">体重</div>
                <div className="font-medium">{patientInfo.weight} kg</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">身高</div>
                <div className="font-medium">{patientInfo.height} cm</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">治疗频率</div>
                <div className="font-medium">{patientInfo.treatmentTimes} 次/周</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">治疗剂量</div>
                <div className="font-medium">{patientInfo.treatmentDose} IU/kg</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">评估日期</div>
                <div className="font-medium">{formatDate(patientInfo.evaluationDate)}</div>
              </div>
              <div className="bg-white p-3 rounded-md border-l-4 border-blue-500 shadow-sm">
                <div className="text-xs text-gray-500 mb-1">下次随访</div>
                <div className="font-medium">{formatDate(patientInfo.nextDate)}</div>
              </div>
            </div>
          </div>
          
          {/* 添加HAEMO-QoL-A问卷结果区块 */}
          {assessmentResult.haemqolScores && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold text-blue-700 mb-5">HAEMO-QoL-A生存质量量表评估</h2>
              
              <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 p-6 rounded-lg shadow-sm mb-6">
                <div className="text-center">
                  <div className="text-4xl font-bold text-indigo-600 mb-1">
                    {assessmentResult.haemqolScores.total !== null ? assessmentResult.haemqolScores.total.toFixed(1) : 'N/A'}
                  </div>
                  <div className="font-medium text-indigo-800">生存质量总分</div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">第一部分：日常生活影响</h3>
                  <div className="flex items-center justify-between mb-1">
                    <span>得分：</span>
                    <span className="font-bold text-indigo-600">
                      {assessmentResult.haemqolScores.part1 !== null ? assessmentResult.haemqolScores.part1.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${assessmentResult.haemqolScores.part1 || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">第二部分：情绪及心情影响</h3>
                  <div className="flex items-center justify-between mb-1">
                    <span>得分：</span>
                    <span className="font-bold text-indigo-600">
                      {assessmentResult.haemqolScores.part2 !== null ? assessmentResult.haemqolScores.part2.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${assessmentResult.haemqolScores.part2 || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">第三部分：工作生活影响</h3>
                  <div className="flex items-center justify-between mb-1">
                    <span>得分：</span>
                    <span className="font-bold text-indigo-600">
                      {assessmentResult.haemqolScores.part3 !== null ? assessmentResult.haemqolScores.part3.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${assessmentResult.haemqolScores.part3 || 0}%` }}
                    />
                  </div>
                </div>
                
                <div className="bg-white p-4 rounded-lg border shadow-sm">
                  <h3 className="font-medium text-gray-700 mb-2">第四部分：治疗经历影响</h3>
                  <div className="flex items-center justify-between mb-1">
                    <span>得分：</span>
                    <span className="font-bold text-indigo-600">
                      {assessmentResult.haemqolScores.part4 !== null ? assessmentResult.haemqolScores.part4.toFixed(1) : 'N/A'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-indigo-600 h-2.5 rounded-full" 
                      style={{ width: `${assessmentResult.haemqolScores.part4 || 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* 总分展示 */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-blue-700 mb-5">HAL功能活动评估</h2>
            
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 rounded-lg shadow-sm mb-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-600 mb-1">
                  {sumScore !== null ? sumScore.toFixed(1) : 'N/A'}
                </div>
                <div className="font-medium text-blue-800">国标总分</div>
                <div className={`text-sm mt-2 px-3 py-1 rounded-full inline-block bg-${sumScoreLevel.color} bg-opacity-20 text-${sumScoreLevel.color}`}>
                  {sumScoreLevel.level}
                </div>
              </div>
            </div>
            
            {/* 功能显示切换 */}
            <div className="flex justify-end mb-3">
              <button 
                onClick={() => setShowChart(!showChart)}
                className="px-3 py-1 text-sm bg-white border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              >
                {showChart ? '隐藏图表' : '显示图表'}
              </button>
            </div>
            
            {/* 得分图表 */}
            {showChart && (
              <div className="mb-6 p-4 border border-blue-200 rounded-lg shadow-sm" style={{ height: '320px' }}>
                <ScoreChart domainScores={domainScores} sumScore={sumScore} />
              </div>
            )}
            
            {/* 标准域得分展示 */}
            <div className="mb-8">
              <h3 className="font-semibold text-gray-700 mb-3">功能域得分</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { key: 'LSKS', label: '躺坐跪站' },
                  { key: 'LEGS', label: '下肢功能' },
                  { key: 'ARMS', label: '上肢功能' },
                  { key: 'TRANS', label: '交通工具' },
                  { key: 'SELFC', label: '自我照料' },
                  { key: 'HOUSEH', label: '家务劳动' },
                  { key: 'LEISPO', label: '休闲体育' }
                ].map(item => {
                  const score = domainScores[item.key as keyof typeof domainScores];
                  if (typeof score !== 'number') return null;
                  
                  const details = DOMAIN_DETAILS[item.key];
                  const scoreLevel = getScoreLevel(score);
                  
                  return (
                    <div key={item.key} className="domain-score-card border bg-white p-4 rounded-lg shadow-sm hover:shadow-md transition-all">
                      <div className="flex items-start">
                        <div className="text-2xl mr-3">{details?.icon || '📊'}</div>
                        <div className="flex-grow">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-medium text-gray-800">{item.label}</h4>
                            <div className={`text-lg font-bold text-${scoreLevel.color}`}>
                              {score.toFixed(1)}
                            </div>
                          </div>
                          <div className="text-xs text-gray-600 mb-2">{details?.description || '功能评估得分'}</div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div 
                              className={`bg-${scoreLevel.color} h-2.5 rounded-full`} 
                              style={{ width: `${score}%` }}
                            />
                          </div>
                          <div className={`text-xs mt-1 text-right text-${scoreLevel.color}`}>
                            {scoreLevel.level}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* 重编码得分展示 */}
            <div className="mb-6">
              <h3 className="font-semibold text-gray-700 mb-3">重编码得分</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { key: 'UPPER', label: '上肢活动' },
                  { key: 'LOWBAS', label: '基础下肢' },
                  { key: 'LOWCOM', label: '复杂下肢' }
                ].map(item => {
                  const score = newEncodedScores[item.key as keyof typeof newEncodedScores];
                  if (typeof score !== 'number') return null;
                  
                  const scoreLevel = getScoreLevel(score);
                  
                  return (
                    <div key={item.key} className="bg-white p-3 rounded-lg border shadow-sm">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-700">{item.label}：</span>
                        <span className={`font-bold text-${scoreLevel.color}`}>{score.toFixed(1)}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`bg-${scoreLevel.color} h-2 rounded-full`} 
                          style={{ width: `${score}%` }}
                        />
                      </div>
                      <div className={`text-xs mt-1 text-right text-${scoreLevel.color}`}>
                        {scoreLevel.level}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          
          {/* 导出和导航按钮 */}
          <div className="mt-10 border-t pt-6 border-gray-200">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <button
                onClick={handleBackToConfirm}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                返回确认页
              </button>
              
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex items-center">
                  <select 
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as 'csv' | 'excel')}
                    className="mr-2 p-2 border rounded-md text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="excel">Excel (.xlsx)</option>
                    <option value="csv">CSV (.csv)</option>
                  </select>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleExportCurrentResult}
                      disabled={exporting}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors disabled:bg-green-300 whitespace-nowrap flex items-center gap-1"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                      {exporting ? '导出中...' : '导出当前'}
                    </button>
                    
                    <button
                      onClick={handleBatchExport}
                      disabled={exporting || patientCount <= 0}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:bg-blue-300 whitespace-nowrap flex items-center gap-1"
                      title={patientCount <= 0 ? '无患者记录可导出' : `导出全部${patientCount}条记录`}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v3.586l-1.293-1.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V8z" clipRule="evenodd" />
                      </svg>
                      {exporting ? '导出中...' : `导出全部(${patientCount})`}
                    </button>
                  </div>
                </div>
                
                <button
                  onClick={handleStartNew}
                  className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  开始新的评估
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>Copyright © 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
        </footer>
      </div>
    </div>
  );
};

export default ResultPage; 
/**
 * HAL问卷系统 - 确认页面
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
import { useHalStore } from '../../shared/store';
import ProgressIndicator from '../../shared/components/ProgressIndicator';
import { formatDate } from '../../shared/utils/exportUtils';
import { getQuestionTitle } from '../../shared/utils/questions';
import { QUESTION_SECTIONS } from '../../shared/utils/questions';
import { HAEMQOL_SECTIONS, formatHaemqolAnswerText } from '../haemqol/questions';

const ConfirmPage: React.FC = () => {
  const router = useRouter();
  const { 
    patientInfo, 
    answers, 
    haemqolAnswers,
    isLoading, 
    loadData,
    setCurrentStep
  } = useHalStore();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [loadingStage, setLoadingStage] = useState<string>('初始化');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  
  // 初始化所有部分为展开状态
  useEffect(() => {
    const sections: Record<string, boolean> = {};
    QUESTION_SECTIONS.forEach((_, index) => {
      sections[`section-${index}`] = true; // 默认展开所有部分
    });
    HAEMQOL_SECTIONS.forEach((_, index) => {
      sections[`haemqol-section-${index}`] = true; // 默认展开所有HAEMO-QoL-A部分
    });
    setExpandedSections(sections);
  }, []);
  
  // 切换部分的展开/折叠状态
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionId]: !prev[sectionId]
    }));
  };
  
  // 检查客户端挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 处理数据加载，与挂载状态分离
  useEffect(() => {
    if (!isMounted) return;
    
    // 只在组件已挂载且未初始化时运行
    let isActive = true;
    async function loadSavedData() {
      setLoading(true);
      setLoadingStage('加载数据中');
      try {
        await loadData();
        
        if (isActive && !patientInfo) {
          // 如果没有患者信息，重定向到首页
          setLoadingStage('无患者信息，准备重定向');
          router.push('/');
          return;
        }
        
        if (isActive) {
          // 设置当前步骤为确认页
          setLoadingStage('设置当前步骤');
          setCurrentStep('confirm');
        }
      } catch (error) {
        console.error('数据加载错误:', error);
        setLoadingStage('加载出错');
      } finally {
        if (isActive) {
          setLoadingStage('加载完成');
          setLoading(false);
        }
      }
    }
    
    loadSavedData();
    
    // 清理函数
    return () => {
      isActive = false;
    };
  }, [isMounted, loadData, setCurrentStep, router]);
  
  // 返回问卷页面
  const handleBackToQuestionnaire = () => {
    router.push('/patient/questionnaire');
  };
  
  // 编辑HAEMO-QoL-A问卷
  const handleEditHaemqolAnswers = () => {
    router.push('/patient/haemqol');
  };
  
  // 提交并查看结果
  const handleViewResults = () => {
    router.push('/patient/result');
  };
  
  // 编辑患者信息
  const handleEditPatientInfo = () => {
    router.push('/patient/info');
  };
  
  // 编辑问卷回答
  const handleEditAnswers = () => {
    router.push('/patient/questionnaire');
  };
  
  // 格式化HAL回答展示
  const formatAnswer = (value: string): string => {
    switch (value) {
      case '1': return '不可能完成';
      case '2': return '能完成但总是有困难';
      case '3': return '大部分时间有困难';
      case '4': return '有时有困难';
      case '5': return '很少有困难';
      case '6': return '从未有困难';
      case '8': return '不适用';
      default: return '未回答';
    }
  };

  // 获取答案值对应的颜色
  const getAnswerColor = (value: string): string => {
    switch (value) {
      case '1': return 'text-red-600'; // 严重困难
      case '2': return 'text-red-500';
      case '3': return 'text-orange-500';
      case '4': return 'text-yellow-600';
      case '5': return 'text-green-600';
      case '6': return 'text-green-700'; // 没有困难
      case '8': return 'text-gray-500'; // 不适用
      default: return 'text-gray-400';
    }
  };

  // 获取HAEMO-QoL-A答案值对应的颜色
  const getHaemqolAnswerColor = (value: string, isReverse: boolean = false): string => {
    // 对于正向题目，颜色需要反转
    if (isReverse) {
      switch (value) {
        case '0': return 'text-green-700'; // 最好
        case '1': return 'text-green-600';
        case '2': return 'text-yellow-600';
        case '3': return 'text-orange-500';
        case '4': return 'text-red-500';
        case '5': return 'text-red-600'; // 最差
        default: return 'text-gray-400';
      }
    } else {
      // 负向题目
      switch (value) {
        case '0': return 'text-green-700'; // 最好
        case '1': return 'text-green-600';
        case '2': return 'text-yellow-600';
        case '3': return 'text-orange-500';
        case '4': return 'text-red-500';
        case '5': return 'text-red-600'; // 最差
        default: return 'text-gray-400';
      }
    }
  };
  
  // 如果还未挂载，显示简单的骨架屏
  if (!isMounted) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">正在加载...</h1>
          <div className="h-8 bg-gray-200 rounded animate-pulse mb-4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-10 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  if (loading || isLoading || !patientInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-3xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">正在加载数据...</h1>
          <p className="text-center text-gray-600 mb-4">{loadingStage}</p>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center p-4 pb-16">
      <div className="w-full max-w-4xl">
        <ProgressIndicator 
          currentStep={3}
          totalSteps={4}
          labels={['患者信息', '生存质量问卷', 'HAL问卷', '结果']}
        />
        
        <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-center mb-6">确认信息</h1>
          
          {/* 患者信息卡片 */}
          <div className="mb-8 bg-gray-50 rounded-lg p-5 shadow-sm">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-blue-700">患者基本信息</h2>
              <button 
                onClick={handleEditPatientInfo}
                className="px-3 py-1 text-sm bg-white border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  编辑
                </span>
              </button>
            </div>
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
          
          {/* HAEMO-QoL-A问卷回答部分 - 调整到HAL前面 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-blue-700">HAEMO-QoL-A问卷回答</h2>
              <button 
                onClick={handleEditHaemqolAnswers}
                className="px-3 py-1 text-sm bg-white border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  编辑
                </span>
              </button>
            </div>
            
            <div className="space-y-6">
              {HAEMQOL_SECTIONS.map((section, sectionIndex) => {
                const sectionId = `haemqol-section-${sectionIndex}`;
                const isExpanded = expandedSections[sectionId];
                
                // 检查此部分是否有回答的问题
                const hasAnsweredQuestions = section.questions.some(q => 
                  haemqolAnswers[`hq${q.id}`] !== undefined && haemqolAnswers[`hq${q.id}`] !== ''
                );
                
                if (!hasAnsweredQuestions) return null;
                
                return (
                  <div key={sectionId} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                    <div 
                      className="flex justify-between items-center p-4 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => toggleSection(sectionId)}
                    >
                      <h3 className="font-medium text-gray-800">{section.title} - {section.description}</h3>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {section.questions.map(question => {
                          const questionId = `hq${question.id}` as keyof typeof haemqolAnswers;
                          const answer = haemqolAnswers[questionId];
                          
                          if (!answer) return null;
                          
                          return (
                            <div 
                              key={questionId} 
                              className="bg-white p-3 rounded-md border-l-4 border-blue-100 hover:shadow-md transition-shadow"
                            >
                              <div className="text-xs text-gray-500 mb-1">问题 {question.id}</div>
                              <div className="font-medium text-gray-800 mb-2">{question.title}</div>
                              <div className={`${getHaemqolAnswerColor(answer, question.isReverse)} font-semibold`}>
                                {formatHaemqolAnswerText(answer)} ({answer})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* HAL问卷回答部分 - 调整到HAEMO-QoL-A后面 */}
          <div className="mb-8">
            <div className="flex justify-between items-center mb-5">
              <h2 className="text-xl font-semibold text-blue-700">HAL问卷回答</h2>
              <button 
                onClick={handleEditAnswers}
                className="px-3 py-1 text-sm bg-white border border-blue-500 text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
              >
                <span className="flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                  编辑
                </span>
              </button>
            </div>
            
            <div className="space-y-6">
              {QUESTION_SECTIONS.map((section, sectionIndex) => {
                const sectionId = `section-${sectionIndex}`;
                const isExpanded = expandedSections[sectionId];
                
                // 检查此部分是否有回答的问题
                const hasAnsweredQuestions = section.questions.some(q => 
                  answers[`q${q.id}`] !== undefined && answers[`q${q.id}`] !== ''
                );
                
                if (!hasAnsweredQuestions) return null;
                
                return (
                  <div key={sectionId} className="bg-gray-50 rounded-lg overflow-hidden shadow-sm">
                    <div 
                      className="flex justify-between items-center p-4 cursor-pointer bg-gray-100 hover:bg-gray-200 transition-colors"
                      onClick={() => toggleSection(sectionId)}
                    >
                      <h3 className="font-medium text-gray-800">{section.title}</h3>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-5 w-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                        viewBox="0 0 20 20" 
                        fill="currentColor"
                      >
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </div>
                    
                    {isExpanded && (
                      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                        {section.questions.map(question => {
                          const questionId = `q${question.id}` as keyof typeof answers;
                          const answer = answers[questionId];
                          
                          if (!answer) return null;
                          
                          return (
                            <div 
                              key={questionId} 
                              className="bg-white p-3 rounded-md border-l-4 border-blue-100 hover:shadow-md transition-shadow"
                            >
                              <div className="text-xs text-gray-500 mb-1">问题 {question.id}</div>
                              <div className="font-medium text-gray-800 mb-2">{question.title}</div>
                              <div className={`${getAnswerColor(answer)} font-semibold`}>
                                {formatAnswer(answer)} ({answer})
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 导航按钮 */}
          <div className="flex flex-col md:flex-row justify-between gap-4 mt-8">
            <button
              onClick={handleBackToQuestionnaire}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              返回HAL问卷
            </button>
            
            <button
              onClick={handleViewResults}
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
            >
              确认信息并查看结果
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
        
        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>© 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
        </footer>
      </div>
    </div>
  );
};

export default ConfirmPage; 
/**
 * 评估结果页面 - 增强版
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
import { QUESTION_SECTIONS } from '../../shared/utils/questions';
import { HAEMQOL_SECTIONS, formatHaemqolAnswerText } from '../../patient/haemqol/questions';
import { QuestionId, HaemqolQuestionId } from '../../shared/types';

// 答案格式化函数
const formatHalAnswerText = (value: string): string => {
  switch (value) {
    case '1': return '不可能做到';
    case '2': return '总是困难';
    case '3': return '有时困难';
    case '4': return '从来不困难';
    case '5': return '不知道';
    case '6': return '不适用';
    case '8': return '从未尝试';
    default: return '未选择';
  }
};

export default function ResultPage() {
  const router = useRouter();
  const { 
    answers, 
    haemqolAnswers, 
    patientInfo, 
    assessmentResult, 
    calculateResults, 
    loadData,
    currentUser 
  } = useHalStore();
  
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'hal-details' | 'haemqol-details'>('summary');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const initializeData = async () => {
      try {
        if (!currentUser) {
          router.push('/patient/login');
          return;
        }

        await loadData();
        calculateResults();
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, [currentUser, loadData, calculateResults, router]);

  // 返回dashboard
  const handleBack = () => {
    router.push('/patient/dashboard');
  };

  // 切换section展开状态
  const toggleSection = (sectionKey: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionKey]: !prev[sectionKey]
    }));
  };

  // 计算完成度
  const halCompletionRate = () => {
    const totalQuestions = QUESTION_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0);
    const answeredQuestions = Object.keys(answers).filter(key => answers[key as QuestionId]).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  const haemqolCompletionRate = () => {
    const totalQuestions = HAEMQOL_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0);
    const answeredQuestions = Object.keys(haemqolAnswers).filter(key => haemqolAnswers[key as HaemqolQuestionId]).length;
    return Math.round((answeredQuestions / totalQuestions) * 100);
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">正在加载结果...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* 页面标题 */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">问卷评估结果</h1>
        <p className="text-gray-600">查看您的问卷完成情况和详细回答记录</p>
      </div>

      {/* 返回按钮 */}
      <div className="mb-6">
        <button 
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回任务中心
        </button>
      </div>

      {/* 标签页导航 */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('summary')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'summary'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              评估总结
            </button>
            <button
              onClick={() => setActiveTab('hal-details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'hal-details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              HAL 详细回答 ({halCompletionRate()}%)
            </button>
            <button
              onClick={() => setActiveTab('haemqol-details')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'haemqol-details'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              HAEMO-QoL-A 详细回答 ({haemqolCompletionRate()}%)
            </button>
          </nav>
        </div>
      </div>

      {/* 评估总结标签页 */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          {/* 基本信息 */}
          {patientInfo && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <span className="text-gray-600">姓名:</span>
                  <span className="ml-2 font-medium">{patientInfo.patientName}</span>
                </div>
                <div>
                  <span className="text-gray-600">年龄:</span>
                  <span className="ml-2 font-medium">{patientInfo.age} 岁</span>
                </div>
                <div>
                  <span className="text-gray-600">评估日期:</span>
                  <span className="ml-2 font-medium">{patientInfo.evaluationDate || '未填写'}</span>
                </div>
              </div>
            </div>
          )}

          {/* 完成度统计 */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">问卷完成度</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-blue-900">HAL 血友病活动列表</h4>
                  <span className="text-blue-600 font-semibold">{halCompletionRate()}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ width: `${halCompletionRate()}%` }}
                  ></div>
                </div>
                <p className="text-blue-700 text-sm mt-2">
                  已完成 {Object.keys(answers).filter(key => answers[key as QuestionId]).length} / {QUESTION_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0)} 题
                </p>
              </div>
              
              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-green-900">HAEMO-QoL-A 生存质量量表</h4>
                  <span className="text-green-600 font-semibold">{haemqolCompletionRate()}%</span>
                </div>
                <div className="w-full bg-green-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full"
                    style={{ width: `${haemqolCompletionRate()}%` }}
                  ></div>
                </div>
                <p className="text-green-700 text-sm mt-2">
                  已完成 {Object.keys(haemqolAnswers).filter(key => haemqolAnswers[key as HaemqolQuestionId]).length} / {HAEMQOL_SECTIONS.reduce((sum, section) => sum + section.questions.length, 0)} 题
                </p>
              </div>
            </div>
          </div>

          {/* 评估结果（如果有的话）- 仅医生端可见 */}
          {assessmentResult && currentUser?.role === 'doctor' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">评估结果（仅医生可见）</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(assessmentResult.domainScores).map(([domain, score]) => (
                  <div key={domain} className="bg-gray-50 rounded p-3">
                    <div className="text-sm text-gray-600">{domain}</div>
                    <div className="text-lg font-semibold">
                      {score !== null && typeof score === 'number' && !isNaN(score) ? score.toFixed(1) : 'N/A'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 患者端提示信息 */}
          {currentUser?.role === 'patient' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
              <div className="flex items-start">
                <svg className="h-6 w-6 text-blue-600 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-2">问卷已完成</h3>
                  <p className="text-blue-800">
                    您的问卷回答已保存成功。详细的评估结果将由您的医生进行分析和解读。
                    如需了解评估结果，请咨询您的主治医生。
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* HAL详细回答标签页 */}
      {activeTab === 'hal-details' && (
        <div className="space-y-6">
          {QUESTION_SECTIONS.map((section, sectionIndex) => {
            const sectionKey = `hal-section-${sectionIndex}`;
            const isExpanded = expandedSections[sectionKey];
            const sectionAnswers = section.questions.filter(q => answers[`q${q.id}` as QuestionId]);
            
            return (
              <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      已回答 {sectionAnswers.length} / {section.questions.length} 题
                    </p>
                  </div>
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6 border-t">
                    <div className="space-y-4">
                      {section.questions.map((question) => {
                        const questionId = `q${question.id}` as QuestionId;
                        const answer = answers[questionId];
                        
                        return (
                          <div key={question.id} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1 mr-4">
                              <div className="flex items-start">
                                <span className="bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded text-sm mr-3">
                                  Q{question.id}
                                </span>
                                <p className="text-gray-800">{question.title}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {answer ? (
                                <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {formatHalAnswerText(answer)}
                                </div>
                              ) : (
                                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                                  未回答
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* HAEMO-QoL-A详细回答标签页 */}
      {activeTab === 'haemqol-details' && (
        <div className="space-y-6">
          {HAEMQOL_SECTIONS.map((section, sectionIndex) => {
            const sectionKey = `haemqol-section-${sectionIndex}`;
            const isExpanded = expandedSections[sectionKey];
            const sectionAnswers = section.questions.filter(q => haemqolAnswers[`hq${q.id}` as HaemqolQuestionId]);
            
            return (
              <div key={sectionIndex} className="bg-white rounded-lg shadow-sm border">
                <button
                  onClick={() => toggleSection(sectionKey)}
                  className="w-full p-6 text-left flex items-center justify-between hover:bg-gray-50"
                >
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{section.title}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      已回答 {sectionAnswers.length} / {section.questions.length} 题
                    </p>
                  </div>
                  <svg 
                    className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {isExpanded && (
                  <div className="px-6 pb-6 border-t">
                    <div className="space-y-4">
                      {section.questions.map((question) => {
                        const questionId = `hq${question.id}` as HaemqolQuestionId;
                        const answer = haemqolAnswers[questionId];
                        
                        return (
                          <div key={question.id} className="flex justify-between items-start py-3 border-b border-gray-100 last:border-b-0">
                            <div className="flex-1 mr-4">
                              <div className="flex items-start">
                                <span className="bg-green-100 text-green-800 font-semibold px-2 py-1 rounded text-sm mr-3">
                                  Q{question.id}
                                </span>
                                <p className="text-gray-800">{question.title}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {answer ? (
                                <div className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                                  {answer} - {formatHaemqolAnswerText(answer)}
                                </div>
                              ) : (
                                <div className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">
                                  未回答
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 底部操作按钮 */}
      <div className="mt-8 flex justify-between">
        <button 
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回任务中心
        </button>
        
        <button 
          onClick={() => window.print()}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z" />
          </svg>
          打印结果
        </button>
      </div>
      
      <footer className="mt-10 text-center text-sm text-gray-500">
        <p>© 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
      </footer>
    </div>
  );
} 
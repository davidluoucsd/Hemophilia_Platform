/**
 * HAEMO-QoL-A问卷系统 - 问卷页面
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
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
import { HAEMQOL_SECTIONS, formatHaemqolAnswerText } from './questions';
import { checkAllHaemqolQuestionsAnswered, getUnansweredHaemqolQuestions } from './scoring';
import { HaemqolQuestionId, HaemqolAnswerValue } from '../types';

const HaemQoLPage: React.FC = () => {
  const router = useRouter();
  const { 
    patientInfo, 
    haemqolAnswers, 
    setHaemqolAnswer, 
    setCurrentStep, 
    isLoading, 
    loadData 
  } = useHalStore();
  
  const [activeSection, setActiveSection] = useState<number>(0);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isShowingWarning, setIsShowingWarning] = useState<boolean>(false);
  
  // 检查页面挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 处理数据加载
  useEffect(() => {
    if (!isMounted) return;
    
    let isActive = true;
    
    async function initialize() {
      if (!patientInfo) {
        try {
          await loadData();
          if (isActive && !patientInfo) {
            // 如果未找到患者信息，重定向到首页
            router.push('/');
            return;
          }
        } catch (error) {
          console.error('加载数据出错:', error);
          router.push('/');
          return;
        }
      }
      
      // 设置当前步骤
      setCurrentStep('haemqol');
      
      // 检查未回答的问题
      const unanswered = getUnansweredHaemqolQuestions(haemqolAnswers);
      setUnansweredQuestions(unanswered);
    }
    
    initialize();
    
    // 清理函数
    return () => {
      isActive = false;
    };
  }, [isMounted, patientInfo, loadData, router, setCurrentStep, haemqolAnswers]);
  
  // 处理下一步点击
  const handleNextClick = () => {
    // 检查是否所有问题均已回答
    const unanswered = getUnansweredHaemqolQuestions(haemqolAnswers);
    
    if (unanswered.length > 0) {
      // 如果有未回答的问题，显示警告
      setUnansweredQuestions(unanswered);
      setIsShowingWarning(true);
      
      // 滚动到第一个未回答的问题
      const firstUnanswered = unanswered[0];
      const element = document.getElementById(`question-${firstUnanswered}`);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        element.classList.add('pulse-animation');
        setTimeout(() => {
          element.classList.remove('pulse-animation');
        }, 2000);
      }
    } else {
      // 所有问题已回答，进入HAL问卷页面
      router.push('/questionnaire');
    }
  };
  
  // 处理上一步点击
  const handlePrevClick = () => {
    router.push('/');
  };
  
  // 处理答案变更
  const handleAnswerChange = (questionId: number, value: HaemqolAnswerValue) => {
    const key = `hq${questionId}` as HaemqolQuestionId;
    setHaemqolAnswer(key, value);
    
    // 从未回答列表中移除已回答的问题
    if (unansweredQuestions.includes(questionId)) {
      setUnansweredQuestions(prev => prev.filter(id => id !== questionId));
    }
    
    // 如果正在显示警告，隐藏警告
    if (isShowingWarning) {
      setIsShowingWarning(false);
    }
  };
  
  // 检查问题是否未回答
  const isQuestionUnanswered = (questionId: number): boolean => {
    return unansweredQuestions.includes(questionId);
  };
  
  // 渲染答案选项
  const renderAnswerOptions = (questionId: number) => {
    const key = `hq${questionId}` as HaemqolQuestionId;
    const selectedValue = haemqolAnswers[key] || '';
    
    return (
      <div className="flex flex-wrap gap-2 mt-2">
        {[0, 1, 2, 3, 4, 5].map((value) => {
          const valueStr = value.toString() as HaemqolAnswerValue;
          const isSelected = selectedValue === valueStr;
          
          return (
            <button
              key={value}
              type="button"
              onClick={() => handleAnswerChange(questionId, valueStr)}
              className={`px-3 py-2 rounded-lg text-sm sm:text-base transition-colors
                ${isSelected
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200'
                }
              `}
              aria-label={`选择 ${value}: ${formatHaemqolAnswerText(valueStr)}`}
              aria-pressed={isSelected}
            >
              <span className="font-semibold">{value}</span>
              <span className="hidden sm:inline ml-1 text-xs">
                ({formatHaemqolAnswerText(valueStr)})
              </span>
            </button>
          );
        })}
      </div>
    );
  };
  
  if (!isMounted || isLoading || !patientInfo) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-4">正在加载问卷...</h1>
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center pb-20">
      <div className="w-full max-w-4xl p-4">
        <ProgressIndicator 
          currentStep={1}
          totalSteps={4}
          labels={['患者信息', '生存质量问卷', 'HAL问卷', '结果']}
        />
        
        <div className="mt-6 p-6 bg-white rounded-lg shadow-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
            <h1 className="text-2xl font-bold text-center mb-6">HAEMO-QoL-A 成人血友病患者生存质量量表</h1>
            <div className="mt-2 sm:mt-0 text-sm">
              <span className="text-gray-600">患者: </span>
              <span className="font-semibold">{patientInfo.patientName}</span>
              <span className="mx-2 text-gray-400">|</span>
              <span className="text-gray-600">年龄: </span>
              <span className="font-semibold">{patientInfo.age}岁</span>
            </div>
          </div>
          
          {/* 问卷说明 */}
          <div className="mb-6 bg-blue-50 p-4 rounded-lg">
            <h2 className="font-semibold text-blue-700 mb-2">问卷说明</h2>
            <p className="text-gray-700 text-sm">
              该问卷旨在了解血友病及其治疗如何影响您的生活质量。请回答所有问题，这些问题没有正确或错误的答案。
              每个问题使用0-5分制评价，其中0表示"从来没有"，5表示"总是"。请为每个问题选择一个最能代表您情况的答案。
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {[0, 1, 2, 3, 4, 5].map(value => (
                <div key={value} className="inline-flex items-center bg-white px-2 py-1 rounded border border-gray-200">
                  <span className="font-semibold mr-1">{value}</span>
                  <span className="text-xs text-gray-600">{formatHaemqolAnswerText(value.toString() as HaemqolAnswerValue)}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* 分段导航 */}
          <div className="flex overflow-x-auto pb-2 mb-6 border-b">
            {HAEMQOL_SECTIONS.map((section, index) => (
              <button
                key={section.id}
                className={`px-4 py-2 whitespace-nowrap mr-2 rounded-t-lg transition-colors ${
                  activeSection === index
                    ? 'bg-blue-100 text-blue-800 font-medium'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                onClick={() => setActiveSection(index)}
              >
                {section.title}
              </button>
            ))}
          </div>
          
          {/* 警告提示 */}
          {isShowingWarning && (
            <div className="mb-6 bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    您有 <strong>{unansweredQuestions.length}</strong> 个问题尚未回答。请回答所有问题后再继续。
                  </p>
                </div>
              </div>
            </div>
          )}
          
          {/* 当前部分的问题 */}
          <div className="mb-8">
            <div className="mb-4">
              <h2 className="text-xl font-semibold text-blue-800">{HAEMQOL_SECTIONS[activeSection].title}</h2>
              <p className="text-gray-600 mt-1">{HAEMQOL_SECTIONS[activeSection].description}</p>
            </div>
            
            <div className="space-y-8">
              {HAEMQOL_SECTIONS[activeSection].questions.map(question => {
                const isUnanswered = isQuestionUnanswered(question.id);
                
                return (
                  <div 
                    key={question.id}
                    id={`question-${question.id}`}
                    className={`p-4 rounded-lg transition-all ${
                      isUnanswered 
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className="bg-blue-100 text-blue-800 font-semibold px-2 py-1 rounded-full mr-3 text-sm">
                        {question.id}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium">{question.title}</p>
                        {isUnanswered && (
                          <p className="text-red-500 text-sm mt-1">请回答此问题</p>
                        )}
                        {renderAnswerOptions(question.id)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* 导航按钮 */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevClick}
              className="px-6 py-3 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              返回患者信息
            </button>
            
            <div className="flex gap-2">
              {activeSection < HAEMQOL_SECTIONS.length - 1 && (
                <button
                  onClick={() => setActiveSection(prev => Math.min(prev + 1, HAEMQOL_SECTIONS.length - 1))}
                  className="px-6 py-3 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 transition-colors"
                >
                  下一部分
                </button>
              )}
              
              <button
                onClick={handleNextClick}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
              >
                完成问卷并继续
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        
        <footer className="mt-6 text-center text-sm text-gray-500">
          <p>© 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
        </footer>
      </div>
      
      {/* 脉动动画样式 */}
      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.5); }
          70% { box-shadow: 0 0 0 10px rgba(220, 38, 38, 0); }
          100% { box-shadow: 0 0 0 0 rgba(220, 38, 38, 0); }
        }
        
        .pulse-animation {
          animation: pulse 1.5s infinite;
        }
      `}</style>
    </div>
  );
};

export default HaemQoLPage; 
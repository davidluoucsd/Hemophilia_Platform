/**
 * HAL问卷系统 - 问卷填写页
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import ProgressIndicator from '../components/ProgressIndicator';
import Question from '../components/Question';
import { useHalStore } from '../store';
import { QuestionId, AnswerValue } from '../types';
import { QUESTION_SECTIONS } from '../utils/questions';
import { checkAllQuestionsAnswered, getUnansweredQuestions } from '../utils/scoring';

export default function QuestionnairePage() {
  const router = useRouter();
  const { answers, setAnswer, loadData, setCurrentStep } = useHalStore();
  const [isLoading, setIsLoading] = useState(true);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [showValidation, setShowValidation] = useState(false);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [completedSections, setCompletedSections] = useState<Record<number, boolean>>({});
  
  // 监听窗口大小变化，调整视图
  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    
    // 初始化
    handleResize();
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // 用于滚动到未回答的问题
  const questionRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // 加载数据
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        await loadData();
        // 检查已完成的部分
        updateCompletedSections();
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadSavedData();
  }, [loadData]);
  
  // 更新已完成的部分
  const updateCompletedSections = () => {
    const completed: Record<number, boolean> = {};
    
    QUESTION_SECTIONS.forEach((section, index) => {
      const allQuestionsAnswered = section.questions.every(q => {
        const questionId = `q${q.id}` as QuestionId;
        return !!answers[questionId];
      });
      
      completed[index] = allQuestionsAnswered;
    });
    
    setCompletedSections(completed);
  };

  // 处理答案变化
  const handleAnswerChange = (questionId: string, value: AnswerValue) => {
    setAnswer(questionId, value);
    
    // 更新已完成的部分
    setTimeout(() => {
      updateCompletedSections();
    }, 100);
    
    // 如果之前显示了验证提示，重新验证
    if (showValidation) {
      const unanswered = getUnansweredQuestions(answers);
      setUnansweredQuestions(unanswered);
    }
  };

  // 处理表单提交
  const handleSubmit = () => {
    const unanswered = getUnansweredQuestions(answers);
    setUnansweredQuestions(unanswered);
    setShowValidation(true);
    
    if (unanswered.length > 0) {
      // 滚动到第一个未回答的问题
      const firstUnanswered = unanswered[0];
      const ref = questionRefs.current[`question-${firstUnanswered}`];
      if (ref) {
        ref.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }
    
    // 所有问题已回答，前往确认页
    setCurrentStep('confirm');
    router.push('/confirm');
  };

  // 返回上一页
  const handleBack = () => {
    router.push('/');
  };
  
  // 切换到下一部分
  const handleNextSection = () => {
    if (activeSectionIndex < QUESTION_SECTIONS.length - 1) {
      setActiveSectionIndex(prev => prev + 1);
      
      // 滚动到下一部分
      const nextSectionRef = sectionRefs.current[`section-${activeSectionIndex + 1}`];
      if (nextSectionRef) {
        nextSectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // 如果是最后一部分，触发提交
      handleSubmit();
    }
  };
  
  // 切换到上一部分
  const handlePrevSection = () => {
    if (activeSectionIndex > 0) {
      setActiveSectionIndex(prev => prev - 1);
      
      // 滚动到上一部分
      const prevSectionRef = sectionRefs.current[`section-${activeSectionIndex - 1}`];
      if (prevSectionRef) {
        prevSectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } else {
      // 如果是第一部分，返回上一页
      handleBack();
    }
  };
  
  // 直接跳转到指定部分
  const handleSectionClick = (index: number) => {
    setActiveSectionIndex(index);
    
    // 滚动到选中的部分
    const sectionRef = sectionRefs.current[`section-${index}`];
    if (sectionRef) {
      sectionRef.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  // 设置当前活动的部分（通过滚动监测）
  useEffect(() => {
    const handleScroll = () => {
      if (isMobileView) return; // 移动视图下不监听
      
      // 找出当前在视图中的部分
      for (let i = 0; i < QUESTION_SECTIONS.length; i++) {
        const sectionRef = sectionRefs.current[`section-${i}`];
        if (!sectionRef) continue;
        
        const rect = sectionRef.getBoundingClientRect();
        // 如果部分顶部在视图顶部附近，认为是当前部分
        if (rect.top <= 150 && rect.bottom >= 0) {
          setActiveSectionIndex(i);
          break;
        }
      }
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobileView]);

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">加载中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 pb-16">
      <h1 className="page-title">血友病活动列表（HAL）问卷</h1>
      
      <ProgressIndicator 
        currentStep={2}
        totalSteps={4}
        labels={['患者信息', '问卷填写', '确认信息', '查看结果']}
      />

      {/* 导航按钮 */}
      <div className="flex justify-between mb-6">
        <button 
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回基本信息
        </button>
        
        <button 
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all"
        >
          继续
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      {/* 验证提示 */}
      {showValidation && unansweredQuestions.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in">
          <p className="font-medium">请回答所有问题后继续</p>
          <p className="text-sm">未回答的问题已高亮显示</p>
          <p className="text-sm mt-1">共有 {unansweredQuestions.length} 个问题未回答</p>
        </div>
      )}

      {/* 问卷布局：分为侧边导航和内容区 */}
      <div className={`form-section flex ${isMobileView ? 'flex-col' : 'flex-row'}`}>
        {/* 部分导航栏 - 较大屏幕显示在左侧，移动设备显示在顶部 */}
        <div className={`
          sections-nav 
          ${isMobileView 
            ? 'w-full mb-6 overflow-x-auto flex flex-row pb-2' 
            : 'w-64 mr-6 sticky top-4 self-start max-h-[calc(100vh-120px)] overflow-y-auto'}
        `}>
          <div className={`${isMobileView ? 'flex w-max' : 'space-y-2'}`}>
            {QUESTION_SECTIONS.map((section, index) => (
              <div 
                key={`nav-section-${index}`}
                className={`
                  section-nav-item cursor-pointer p-3 rounded-lg
                  ${isMobileView ? 'mr-2 min-w-max' : ''}
                  ${activeSectionIndex === index 
                    ? 'bg-blue-100 text-blue-700 font-medium' 
                    : 'hover:bg-gray-100'}
                  ${completedSections[index] 
                    ? 'border-l-4 border-green-500 pl-2' 
                    : 'border-l-4 border-transparent pl-2'}
                  transition-all
                `}
                onClick={() => handleSectionClick(index)}
              >
                <div className="flex items-center">
                  {completedSections[index] ? (
                    <svg className="h-5 w-5 text-green-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="h-5 w-5 flex items-center justify-center bg-gray-200 text-gray-700 rounded-full mr-2 text-xs">
                      {index + 1}
                    </span>
                  )}
                  <span className="text-sm">{section.title}</span>
                </div>
              </div>
            ))}
          </div>
          
          {/* 完成度指示器 - 在侧边栏底部显示 */}
          {!isMobileView && (
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <div className="text-sm text-gray-700">问卷完成度</div>
              <div className="flex items-center mt-2">
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full"
                    style={{ 
                      width: `${Object.values(completedSections).filter(Boolean).length / QUESTION_SECTIONS.length * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-sm text-blue-600 font-medium">
                  {Object.values(completedSections).filter(Boolean).length}/{QUESTION_SECTIONS.length}
                </span>
              </div>
            </div>
          )}
        </div>
        
        {/* 问卷内容区域 */}
        <div className="flex-1">
          <form id="halForm" className="space-y-12">
            {QUESTION_SECTIONS.map((section, sectionIndex) => (
              <div 
                key={`section-${sectionIndex}`} 
                className={`section-content pb-8 ${sectionIndex !== activeSectionIndex && isMobileView ? 'hidden' : ''}`}
                ref={(el) => {
                  sectionRefs.current[`section-${sectionIndex}`] = el;
                }}
              >
                <div className="sticky top-0 z-10 bg-white py-4 border-b border-gray-200 mb-6">
                  <h2 className="text-xl font-semibold text-blue-700 flex items-center">
                    <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-800 rounded-full mr-3 text-sm font-bold">
                      {sectionIndex + 1}
                    </span>
                    {section.title}
                  </h2>
                  {section.description && (
                    <p className="text-sm text-gray-600 mt-2 ml-11">{section.description}</p>
                  )}
                </div>

                <div className="landscape-optimize">
                  {section.questions.map((question) => {
                    const questionId = `q${question.id}` as QuestionId;
                    const isUnanswered = showValidation && unansweredQuestions.includes(question.id);
                    
                    return (
                      <div
                        key={questionId}
                        className="mb-6 animate-slide-up"
                        style={{ animationDelay: `${(question.id % 10) * 50}ms` }}
                        ref={(el) => {
                          questionRefs.current[`question-${question.id}`] = el;
                        }}
                      >
                        <Question
                          id={questionId}
                          number={question.id}
                          title={question.title}
                          value={answers[questionId] || ''}
                          onChange={handleAnswerChange}
                          highlight={isUnanswered}
                        />
                      </div>
                    );
                  })}
                </div>
                
                {/* 每个部分底部的导航按钮 */}
                <div className="flex justify-between mt-8 pt-4 border-t border-gray-200">
                  <button 
                    type="button"
                    onClick={handlePrevSection}
                    className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    {sectionIndex === 0 ? '返回基本信息' : '上一部分'}
                  </button>
                  
                  <button 
                    type="button"
                    onClick={handleNextSection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
                  >
                    {sectionIndex === QUESTION_SECTIONS.length - 1 ? '完成问卷' : '下一部分'}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </form>
        </div>
      </div>
      
      {/* 底部导航按钮 */}
      <div className="flex justify-between mt-8 no-print">
        <button 
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回基本信息
        </button>
        
        <button 
          onClick={handleSubmit}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm"
        >
          继续
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <footer className="mt-10 text-center text-sm text-gray-500">
        <p>© 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
      </footer>
    </div>
  );
}
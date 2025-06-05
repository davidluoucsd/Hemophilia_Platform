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
import { useRouter, useSearchParams } from 'next/navigation';
import { useHalStore } from '../../shared/store';
import { HAEMQOL_SECTIONS, formatHaemqolAnswerText } from './questions';
import { checkAllHaemqolQuestionsAnswered, getUnansweredHaemqolQuestions } from './scoring';
import { HaemqolQuestionId, HaemqolAnswerValue } from '../../shared/types';
import { generateRandomHaemqolAnswers } from '../../shared/utils/testUtils';
import { 
  loadTaskSpecificAnswers, 
  saveTaskSpecificAnswers,
  getOrCreatePatientTask
} from '../../shared/utils/database';

const HaemQoLPage: React.FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const taskId = searchParams.get('taskId');
  
  const { 
    haemqolAnswers, 
    setHaemqolAnswer, 
    setCurrentStep, 
    isLoading, 
    loadData,
    currentUser,
    patientInfo,
    setHaemqolAnswers
  } = useHalStore();
  
  const [activeSection, setActiveSection] = useState<number>(0);
  const [unansweredQuestions, setUnansweredQuestions] = useState<number[]>([]);
  const [isMounted, setIsMounted] = useState<boolean>(false);
  const [isShowingWarning, setIsShowingWarning] = useState<boolean>(false);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isMobileView, setIsMobileView] = useState<boolean>(false);
  const [completedSections, setCompletedSections] = useState<Record<number, boolean>>({});
  const [showValidation, setShowValidation] = useState<boolean>(false);
  
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
  
  // 检查页面挂载状态
  useEffect(() => {
    setIsMounted(true);
  }, []);
  
  // 处理数据加载 - 只在组件首次挂载时执行
  useEffect(() => {
    if (!isMounted || isInitialized) return;
    
    let isActive = true;
    
    async function initialize() {
      try {
        // 检查是否有用户登录
        if (!currentUser) {
          router.push('/patient/login');
          return;
        }

        // 如果没有患者信息，尝试加载
        if (!patientInfo) {
          await loadData();
        }
        
        // 如果有任务ID，加载任务特定数据
        if (taskId && currentUser?.id) {
          console.log(`🔄 Loading task-specific HAEMO-QoL-A data for task ${taskId}`);
          try {
            const taskAnswers = await loadTaskSpecificAnswers(taskId, 'haemqol', currentUser.id);
            if (Object.keys(taskAnswers).length > 0) {
              console.log(`✅ Loaded ${Object.keys(taskAnswers).length} task-specific HAEMO-QoL-A answers`);
              setHaemqolAnswers(taskAnswers as any);
            } else {
              console.log('📝 No task-specific data found, starting fresh questionnaire');
              // Clear any existing answers to start fresh
              setHaemqolAnswers({});
            }
          } catch (error) {
            console.warn('⚠️ Failed to load task-specific data:', error);
          }
        }
        
        if (isActive) {
          // 设置当前步骤
          setCurrentStep('haemqol');
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('加载数据出错:', error);
        if (isActive) {
          router.push('/patient/login');
        }
      }
    }
    
    initialize();
    
    // 清理函数
    return () => {
      isActive = false;
    };
  }, [isMounted, isInitialized, currentUser, patientInfo, loadData, router, setCurrentStep, taskId, setHaemqolAnswers]);
  
  // 单独处理未回答问题的检查和完成状态
  useEffect(() => {
    if (isInitialized) {
      const unanswered = getUnansweredHaemqolQuestions(haemqolAnswers);
      setUnansweredQuestions(unanswered);
      
      // 更新已完成的部分
      const completed: Record<number, boolean> = {};
      HAEMQOL_SECTIONS.forEach((section, index) => {
        const allQuestionsAnswered = section.questions.every(q => {
          const questionId = `hq${q.id}` as HaemqolQuestionId;
          return !!haemqolAnswers[questionId];
        });
        completed[index] = allQuestionsAnswered;
      });
      setCompletedSections(completed);
    }
  }, [haemqolAnswers, isInitialized]);
  
  // 处理下一步点击
  const handleNextClick = () => {
    // 检查是否所有问题均已回答
    const unanswered = getUnansweredHaemqolQuestions(haemqolAnswers);
    setUnansweredQuestions(unanswered);
    setShowValidation(true);
    
    if (unanswered.length > 0) {
      // 如果有未回答的问题，滚动到第一个未回答的问题
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
      // 所有问题已回答，跳转到结果页面进行保存
      console.log('HAEMO-QoL-A问卷完成，跳转到结果页面...');
      router.push('/patient/result');
    }
  };
  
  // 处理上一步点击
  const handlePrevClick = () => {
    router.push('/patient/dashboard');
  };
  
  // 处理答案变更
  const handleAnswerChange = async (questionId: number, value: HaemqolAnswerValue) => {
    const key = `hq${questionId}` as HaemqolQuestionId;
    setHaemqolAnswer(key, value);
    
    // 如果有任务ID，保存到任务特定存储
    if (taskId && currentUser?.id) {
      try {
        // 获取当前所有答案（包括刚设置的）
        const currentAnswers = { ...haemqolAnswers, [key]: value };
        await saveTaskSpecificAnswers(taskId, 'haemqol', currentAnswers as any, currentUser.id);
        console.log(`💾 Saved task-specific answer for task ${taskId}: ${key}=${value}`);
      } catch (error) {
        console.warn('⚠️ Failed to save task-specific answer:', error);
      }
    }
    
    // 从未回答列表中移除已回答的问题
    if (unansweredQuestions.includes(questionId)) {
      setUnansweredQuestions(prev => prev.filter(id => id !== questionId));
    }
    
    // 如果正在显示警告，隐藏警告
    if (isShowingWarning) {
      setIsShowingWarning(false);
      setShowValidation(false);
    }
  };
  
  // 检查问题是否未回答
  const isQuestionUnanswered = (questionId: number): boolean => {
    return showValidation && unansweredQuestions.includes(questionId);
  };
  
  // 随机填充问卷 (测试功能)
  const handleRandomFill = () => {
    const randomAnswers = generateRandomHaemqolAnswers();
    
    // 批量设置答案，使用正确的类型
    Object.entries(randomAnswers).forEach(([questionId, value]) => {
      const id = parseInt(questionId.replace('hq', ''));
      const key = `hq${id}` as HaemqolQuestionId;
      setHaemqolAnswer(key, value);
    });
  };
  
  // 切换到下一部分
  const handleNextSection = () => {
    if (activeSection < HAEMQOL_SECTIONS.length - 1) {
      setActiveSection(prev => prev + 1);
      
      // 滚动到下一部分
      setTimeout(() => {
        const nextSectionElement = document.getElementById(`section-${activeSection + 1}`);
        if (nextSectionElement) {
          nextSectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // 如果是最后一部分，触发提交
      handleNextClick();
    }
  };
  
  // 切换到上一部分
  const handlePrevSection = () => {
    if (activeSection > 0) {
      setActiveSection(prev => prev - 1);
      
      // 滚动到上一部分
      setTimeout(() => {
        const prevSectionElement = document.getElementById(`section-${activeSection - 1}`);
        if (prevSectionElement) {
          prevSectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // 如果是第一部分，返回Dashboard
      handlePrevClick();
    }
  };
  
  // 直接跳转到指定部分
  const handleSectionClick = (index: number) => {
    setActiveSection(index);
    
    // 滚动到选中的部分
    setTimeout(() => {
      const sectionElement = document.getElementById(`section-${index}`);
      if (sectionElement) {
        sectionElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };
  
  // 渲染答案选项 - 优化以减少闪烁
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
              onClick={() => {
                // 避免重复设置相同值
                if (selectedValue !== valueStr) {
                  handleAnswerChange(questionId, valueStr);
                }
              }}
              className={`px-3 py-2 rounded-lg text-sm sm:text-base transition-colors duration-200
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
  
  // 显示加载状态
  if (!isMounted || isLoading || !isInitialized) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">正在加载问卷...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 pb-16">
      <h1 className="page-title">HAEMO-QoL-A 成人血友病患者生存质量量表</h1>
      
      {/* 导航按钮 */}
      <div className="flex justify-between mb-6">
        <button 
          onClick={handlePrevClick}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回任务中心
        </button>
        
        <div className="flex gap-3">
          <button 
            onClick={handleRandomFill}
            className="px-4 py-2 border border-orange-300 text-orange-600 rounded-md hover:bg-orange-50 flex items-center gap-2 shadow-sm transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            随机填充 (测试)
          </button>
          
          <button 
            onClick={handleNextClick}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm transition-all"
          >
            完成问卷
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
            </div>
          </div>

      {/* 验证提示 */}
      {showValidation && unansweredQuestions.length > 0 && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 animate-fade-in">
          <p className="font-medium">请回答所有问题后继续</p>
          <p className="text-sm">未回答的问题已高亮显示</p>
          <p className="text-sm mt-1">共有 {unansweredQuestions.length} 个问题未回答</p>
        </div>
      )}
          
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
            {HAEMQOL_SECTIONS.map((section, index) => (
              <div 
                key={`nav-section-${index}`}
                className={`
                  section-nav-item cursor-pointer p-3 rounded-lg
                  ${isMobileView ? 'mr-2 min-w-max' : ''}
                  ${activeSection === index 
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
                      width: `${Object.values(completedSections).filter(Boolean).length / HAEMQOL_SECTIONS.length * 100}%` 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-sm text-blue-600 font-medium">
                  {Object.values(completedSections).filter(Boolean).length}/{HAEMQOL_SECTIONS.length}
                </span>
              </div>
            </div>
          )}
        </div>
          
        {/* 问卷内容区域 */}
        <div className="flex-1">
          <div className="space-y-12">
            {HAEMQOL_SECTIONS.map((section, sectionIndex) => (
              <div 
                key={`section-${sectionIndex}`} 
                className={`section-content pb-8 ${sectionIndex !== activeSection && isMobileView ? 'hidden' : ''}`}
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
                const isUnanswered = isQuestionUnanswered(question.id);
                
                return (
                  <div 
                    key={question.id}
                    id={`question-${question.id}`}
                        className={`mb-6 p-4 rounded-lg transition-all animate-slide-up ${
                      isUnanswered 
                        ? 'bg-red-50 border border-red-200'
                        : 'bg-gray-50 hover:bg-gray-100'
                    }`}
                        style={{ animationDelay: `${(question.id % 10) * 50}ms` }}
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
                    {sectionIndex === 0 ? '返回任务中心' : '上一部分'}
            </button>
            
                <button
                    type="button"
                    onClick={handleNextSection}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
              >
                    {sectionIndex === HAEMQOL_SECTIONS.length - 1 ? '完成问卷' : '下一部分'}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* 底部导航按钮 */}
      <div className="flex justify-between mt-8 no-print">
        <button 
          onClick={handlePrevClick}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回任务中心
        </button>
        
        <button 
          onClick={handleNextClick}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2 shadow-sm"
        >
          完成问卷
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>

      <footer className="mt-10 text-center text-sm text-gray-500">
        <p>© 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
      </footer>
      
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
        
        @keyframes slide-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-slide-up {
          animation: slide-up 0.3s ease-out forwards;
        }
        
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
        
        .page-title {
          font-size: 2rem;
          font-weight: bold;
          color: #1f2937;
          margin-bottom: 2rem;
          text-align: center;
        }
        
        .form-section {
          background: white;
          border-radius: 1rem;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
          padding: 2rem;
        }
        
        .landscape-optimize {
          column-count: 1;
        }
        
        @media (min-width: 1024px) and (orientation: landscape) {
          .landscape-optimize {
            column-count: 1;
          }
        }
        
        .no-print {
          /* Styles for elements that shouldn't appear in print */
        }
      `}</style>
    </div>
  );
};

export default HaemQoLPage; 
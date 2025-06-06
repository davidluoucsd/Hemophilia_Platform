/**
 * 评估结果页面 - 增强版
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useHalStore } from '../../shared/store';
import { QUESTION_SECTIONS } from '../../shared/utils/questions';
import { HAEMQOL_SECTIONS, formatHaemqolAnswerText } from '../../patient/haemqol/questions';
import { QuestionId, HaemqolQuestionId } from '../../shared/types';
import { 
  submitQuestionnaireResponse, 
  getCurrentTask, 
  assignQuestionnaire,
  getPatientAssignedTasks,
  getPatientQuestionnaireHistory,
  saveTaskSpecificAnswers,
  getPatientDashboardData, 
  clearUserSession,
  loadUserSpecificAnswers,
  loadUserSpecificHaemqolAnswers,
  loadUserSpecificPatientInfo,
  performDatabaseMaintenance,
  validateUserData,
  loadTaskSpecificAnswers,
  getTaskAnswersHistory,
  getOrCreatePatientTask
} from '../../shared/utils/database';

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
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | null>(null);
  const [hasInitialized, setHasInitialized] = useState(false);
  const isSavingRef = useRef(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    const initializeData = async () => {
      // Prevent multiple initializations
      if (hasInitialized) return;
      
      console.log('🔍 initializeData called');
      try {
        if (!currentUser) {
          console.log('❌ No currentUser, redirecting to login');
          router.push('/patient/login');
          return;
        }
        
        console.log('🔍 Loading data...');
        await loadData();
        console.log('🔍 Calculating results...');
        calculateResults();
        
        setHasInitialized(true);
        
        // Disable auto-save to prevent duplicates - users can manually save
        console.log('🔍 Auto-save disabled, users can use manual save button');
        
      } catch (error) {
        console.error('加载数据失败:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only run once when currentUser is available
    if (currentUser && !hasInitialized) {
      initializeData();
    }
  }, [currentUser]); // Simplified dependencies to prevent multiple runs

  // Cleanup timeouts on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Check if auto-save should happen
  const checkShouldAutoSave = async () => {
    if (!currentUser) return false;
    
    const halAnswersCount = Object.keys(answers).length;
    const haemqolAnswersCount = Object.keys(haemqolAnswers).length;
    
    // Only auto-save if there are actually answers and questionnaires are complete
    if (halAnswersCount === 0 && haemqolAnswersCount === 0) {
      return false;
    }
    
    // Check if already saved recently (prevent duplicate saves)
    const lastSaveKey = `last_save_${currentUser.id}`;
    const lastSave = sessionStorage.getItem(lastSaveKey);
    if (lastSave) {
      const lastSaveTime = new Date(lastSave);
      const timeDiff = Date.now() - lastSaveTime.getTime();
      // Don't auto-save if saved within last 5 minutes
      if (timeDiff < 5 * 60 * 1000) {
        console.log('⏭️ Skipping auto-save, recently saved');
        return false;
      }
    }
    
    // Check if we already have responses saved in database for current answers
    try {
      const historyResult = await getPatientQuestionnaireHistory(currentUser.id);
      if (historyResult.success && historyResult.data) {
        const existingResponses = historyResult.data;
        
        // Check if we have HAL responses that match current answers
        if (halAnswersCount > 0) {
          const existingHalResponse = existingResponses.find(r => 
            r.questionnaire_type === 'hal' && 
            r.answers && 
            Object.keys(r.answers).length >= halAnswersCount - 5 // Allow some tolerance
          );
          if (existingHalResponse) {
            console.log('⏭️ HAL responses already exist in database, skipping auto-save');
          }
        }
        
        // Check if we have GAD-7 & PHQ-9 responses that match current answers
        if (haemqolAnswersCount > 0) {
          const existingHaemqolResponse = existingResponses.find(r => 
            r.questionnaire_type === 'haemqol' && 
            r.answers && 
            Object.keys(r.answers).length >= haemqolAnswersCount - 5 // Allow some tolerance
          );
          if (existingHaemqolResponse) {
            console.log('⏭️ GAD-7 & PHQ-9 responses already exist in database, skipping auto-save');
            return false;
          }
        }
      }
    } catch (error) {
      console.warn('Failed to check existing responses:', error);
      // Continue with auto-save if check fails
    }
    
    return true;
  };

  // Save questionnaire results to database with debouncing and prevention of duplicate calls
  const saveResultsToDatabase = useCallback(async () => {
    console.log('🔍 saveResultsToDatabase called');
    console.log('🔍 currentUser:', currentUser);
    
    // Prevent duplicate calls
    if (isSavingRef.current) {
      console.log('⏭️ Save already in progress, skipping');
      return;
    }
    
    if (!currentUser) {
      console.log('❌ No currentUser, returning early');
      return;
    }
    
    isSavingRef.current = true;
    setIsSaving(true);
    setSaveStatus('saving');
    
    try {
      const halCompletion = halCompletionRate();
      const haemqolCompletion = haemqolCompletionRate();

      console.log('🔍 Saving results to database:', { 
        patientId: currentUser.id, 
        halCompletion, 
        haemqolCompletion,
        halAnswersCount: Object.keys(answers).length,
        haemqolAnswersCount: Object.keys(haemqolAnswers).length
      });

      // Mark save time to prevent duplicates
      const lastSaveKey = `last_save_${currentUser.id}`;
      sessionStorage.setItem(lastSaveKey, new Date().toISOString());

      let saveSuccessful = false;

      // Save HAL results if any answers exist
      console.log('🔍 Checking HAL answers:', Object.keys(answers).length);
      if (Object.keys(answers).length > 0) {
        console.log('✅ HAL has answers, proceeding to save...');
        try {
          if (halCompletion >= 80) {
            console.log('📝 HAL questionnaire complete, getting or creating task...');
            const taskResult = await getOrCreatePatientTask(currentUser.id, 'hal', 'patient_self');
            
            if (taskResult.success && taskResult.data) {
              // Save task-specific answers for this questionnaire instance
              await saveTaskSpecificAnswers(
                taskResult.data.id.toString(), 
                'hal', 
                answers, 
                currentUser.id
              );
              
              const halScores = assessmentResult ? {
                ...assessmentResult.domainScores,
                sumScore: assessmentResult.sumScore
              } : {};
              
              console.log('Submitting HAL response:', {
                taskId: taskResult.data.id,
                scores: halScores
              });
              
              const submitResult = await submitQuestionnaireResponse(
                taskResult.data.id.toString(),
                currentUser.id,
                'hal',
                answers,
                halScores,
                assessmentResult?.sumScore || undefined
              );

              if (submitResult.success) {
                console.log('✅ HAL results saved successfully with independent task ID:', taskResult.data.id);
                saveSuccessful = true;
              } else {
                console.error('Failed to save HAL results:', submitResult.error);
                setSaveStatus('error');
              }
            } else {
              console.error('Failed to get or create HAL task:', taskResult.error);
            }
          } else {
            console.log('HAL questionnaire not complete enough to save (completion:', halCompletion, '%)');
          }
        } catch (error) {
          console.error('Error saving HAL results:', error);
        }
      }
      
      // Save GAD-7 & PHQ-9 results if any answers exist
      console.log('🔍 Checking GAD-7 & PHQ-9 answers:', Object.keys(haemqolAnswers).length);
      if (Object.keys(haemqolAnswers).length > 0) {
        console.log('✅ GAD-7 & PHQ-9 has answers, proceeding to save...');
        try {
          if (haemqolCompletion >= 80) {
            console.log('📝 GAD-7 & PHQ-9 questionnaire complete, getting or creating task...');
            const taskResult = await getOrCreatePatientTask(currentUser.id, 'haemqol', 'patient_self');
            
            if (taskResult.success && taskResult.data) {
              // Save task-specific answers for this questionnaire instance
              await saveTaskSpecificAnswers(
                taskResult.data.id.toString(), 
                'haemqol', 
                haemqolAnswers, 
                currentUser.id
              );
              
              // Calculate GAD-7 & PHQ-9 scores
              const haemqolScores = calculateHaemqolScores();
              
              console.log('Submitting GAD-7 & PHQ-9 response:', {
                taskId: taskResult.data.id,
                scores: haemqolScores
              });
              
              const submitResult = await submitQuestionnaireResponse(
                taskResult.data.id.toString(),
                currentUser.id,
                'haemqol',
                haemqolAnswers,
                haemqolScores,
                haemqolScores.totalScore
              );
              
              if (submitResult.success) {
                console.log('✅ GAD-7 & PHQ-9 results saved successfully with independent task ID:', taskResult.data.id);
                saveSuccessful = true;
              } else {
                console.error('Failed to save GAD-7 & PHQ-9 results:', submitResult.error);
                setSaveStatus('error');
              }
            } else {
              console.error('Failed to get or create GAD-7 & PHQ-9 task:', taskResult.error);
            }
          } else {
            console.log('GAD-7 & PHQ-9 questionnaire not complete enough to save (completion:', haemqolCompletion, '%)');
          }
        } catch (error) {
          console.error('Error saving GAD-7 & PHQ-9 results:', error);
        }
      }

      if (saveSuccessful) {
        setSaveStatus('saved');
        console.log('✅ All questionnaire results saved successfully');
        // Clear save status after 3 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setSaveStatus(null);
        }, 3000);
      } else if (!saveSuccessful && (Object.keys(answers).length > 0 || Object.keys(haemqolAnswers).length > 0)) {
        // Only set error if we had data to save but failed
        setSaveStatus('error');
        console.log('❌ Failed to save some questionnaire results');
        // Clear error status after 5 seconds
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
        timeoutRef.current = setTimeout(() => {
          setSaveStatus(null);
        }, 5000);
      }

    } catch (error) {
      console.error('Error in saveResultsToDatabase:', error);
      setSaveStatus('error');
      // Clear error status after 5 seconds
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        setSaveStatus(null);
      }, 5000);
    } finally {
      setIsSaving(false);
      isSavingRef.current = false;
    }
  }, [currentUser, answers, haemqolAnswers, assessmentResult]);
  
  // Calculate GAD-7 & PHQ-9 scores
  const calculateHaemqolScores = () => {
    // GAD-7 & PHQ-9 维度计算分数
    const dimensions = {
      gad7: Array.from({length: 7}, (_, i) => `hq${i + 1}`),      // hq1-hq7 (GAD-7)
      phq9: Array.from({length: 9}, (_, i) => `hq${i + 8}`)       // hq8-hq16 (PHQ-9)
    };

    const domainScores: Record<string, any> = {};
    let totalScore = 0;
    let answeredQuestions = 0;

    Object.entries(dimensions).forEach(([dimension, questions]) => {
      let dimensionScore = 0;
      let dimensionAnswers = 0;
      
      questions.forEach(q => {
        const answer = haemqolAnswers[q as HaemqolQuestionId];
        if (answer) {
          const score = parseInt(answer);
          if (!isNaN(score)) {
            dimensionScore += score;
            dimensionAnswers++;
            answeredQuestions++;
          }
        }
      });
      
      domainScores[dimension] = {
        score: dimensionScore,
        possible: dimensionAnswers * 3,  // 每题最高3分
        percentage: dimensionAnswers > 0 ? Math.round((dimensionScore / (dimensionAnswers * 3)) * 100) : 0
      };
      
      totalScore += dimensionScore;
    });

    return {
      domainScores,
      totalScore: totalScore,
      total_possible: answeredQuestions * 3,
      total_percentage: answeredQuestions > 0 ? Math.round((totalScore / (answeredQuestions * 3)) * 100) : 0
    };
  };
  
  // 返回dashboard
  const handleBack = () => {
    router.push('/patient/dashboard');
  };

  // Debug function to check task status
  const handleDebugTasks = async () => {
    console.log('🔍 DEBUG: Checking task status in database for user:', currentUser?.id);
    
    try {
      // Get task data using existing functions
      const tasksResult = await getPatientAssignedTasks(currentUser?.id || '');
      if (tasksResult.success && tasksResult.data) {
        console.log('📋 User tasks in database:', tasksResult.data);
        tasksResult.data.forEach((task: any, index: number) => {
          console.log(`Task ${index + 1}:`, {
            id: task.id,
            type: task.questionnaire_id,
            status: task.status,
            progress: task.progress,
            completed_at: task.completed_at,
            created_at: task.created_at
          });
        });
      }
      
      // Get response data
      const responsesResult = await getPatientQuestionnaireHistory(currentUser?.id || '');
      if (responsesResult.success && responsesResult.data) {
        console.log('📝 User responses in database:', responsesResult.data);
        responsesResult.data.forEach((response: any, index: number) => {
          console.log(`Response ${index + 1}:`, {
            id: response.id,
            task_id: response.task_id,
            type: response.questionnaire_type,
            total_score: response.total_score,
            completed_at: response.completed_at
          });
        });
      }
    } catch (error) {
      console.error('❌ Debug error:', error);
    }
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
      <div className="mb-6 flex justify-between items-center">
        <button 
          onClick={handleBack}
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-all"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          返回任务中心
        </button>

        <div className="flex items-center gap-3">
          {/* 手动保存按钮 */}
          <button
            onClick={saveResultsToDatabase}
            disabled={isSaving || Object.keys(answers).length === 0 && Object.keys(haemqolAnswers).length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                保存中...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                保存结果
              </>
            )}
          </button>

          {/* 调试按钮 */}
          <button
            onClick={handleDebugTasks}
            className="px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2 text-sm"
            title="查看数据库状态"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            调试
          </button>

          {/* 保存状态指示器 - 简化版本 */}
          <div className="min-w-[100px] flex justify-center">
            {saveStatus === 'saving' && (
              <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                保存中...
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                已保存
              </div>
            )}
            {saveStatus === 'error' && (
              <div className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm flex items-center gap-2">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                保存失败
              </div>
            )}
          </div>
        </div>
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
                                GAD-7 & PHQ-9 详细回答 ({haemqolCompletionRate()}%)
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
                  <h4 className="font-medium text-green-900">GAD-7 & PHQ-9 心理健康筛查量表</h4>
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

      {/* GAD-7 & PHQ-9详细回答标签页 */}
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
                    <p>© 2025 罗骏哲（Junzhe Luo）. 版权所有.</p>
        </footer>
    </div>
  );
} 
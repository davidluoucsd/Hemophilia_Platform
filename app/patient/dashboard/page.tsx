/**
 * Patient Dashboard - Task-based Interface
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
import { getPatientDashboardData, clearUserSession } from '../../shared/utils/database';
import { PatientDashboardData, Task } from '../../shared/types/database';

// Task card component
interface TaskCardProps {
  title: string;
  description: string;
  status: 'not_started' | 'in_progress' | 'completed' | 'expired';
  progress: number;
  estimatedTime: number;
  onStart: () => void;
  dueDate?: string;
  priority?: 'normal' | 'urgent';
}

const TaskCard: React.FC<TaskCardProps> = ({
  title,
  description,
  status,
  progress,
  estimatedTime,
  onStart,
  dueDate,
  priority
}) => {
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'in_progress': return 'bg-blue-50 border-blue-200';
      case 'expired': return 'bg-red-50 border-red-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed': return '已完成';
      case 'in_progress': return '进行中';
      case 'expired': return '已过期';
      default: return '未开始';
    }
  };

  const getButtonText = () => {
    switch (status) {
      case 'completed': return '查看结果';
      case 'in_progress': return '继续填写';
      case 'expired': return '重新开始';
      default: return '开始填写';
    }
  };

  return (
    <div className={`rounded-xl p-6 border-2 transition-all hover:shadow-lg ${getStatusColor()}`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-gray-600 text-sm">{description}</p>
        </div>
        {priority === 'urgent' && (
          <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
            紧急
          </span>
        )}
      </div>

      {/* Progress bar */}
      {status !== 'not_started' && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>进度</span>
            <span>{progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                status === 'completed' ? 'bg-green-500' : 
                status === 'in_progress' ? 'bg-blue-500' : 'bg-gray-400'
              }`}
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      {/* Task details */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center space-x-4 text-sm text-gray-500">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>约 {estimatedTime} 分钟</span>
          </div>
          {dueDate && (
            <div className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span>截止: {new Date(dueDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'completed' ? 'bg-green-100 text-green-800' :
          status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
          status === 'expired' ? 'bg-red-100 text-red-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {getStatusText()}
        </span>
      </div>

      {/* Action button */}
      <button
        onClick={onStart}
        disabled={status === 'expired'}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          status === 'completed' 
            ? 'bg-green-600 hover:bg-green-700 text-white' :
          status === 'in_progress'
            ? 'bg-blue-600 hover:bg-blue-700 text-white' :
          status === 'expired'
            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' :
            'bg-green-600 hover:bg-green-700 text-white'
        }`}
      >
        {getButtonText()}
      </button>
    </div>
  );
};

export default function PatientDashboard() {
  const router = useRouter();
  const { currentUser, logout, answers, haemqolAnswers, loadData } = useHalStore();
  const [dashboardData, setDashboardData] = useState<PatientDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Task status based on questionnaire answers
  const [taskStatuses, setTaskStatuses] = useState<{
    haemqol: { status: 'not_started' | 'in_progress' | 'completed', progress: number },
    hal: { status: 'not_started' | 'in_progress' | 'completed', progress: number }
  }>({
    haemqol: { status: 'not_started', progress: 0 },
    hal: { status: 'not_started', progress: 0 }
  });

  // Calculate task status based on answers
  const calculateTaskStatus = () => {
    // HAEMO-QoL-A task status (41 questions: hq1-hq41)
    const haemqolTotalQuestions = 41;
    const haemqolAnsweredQuestions = Object.entries(haemqolAnswers).filter(([key, value]) => 
      key.startsWith('hq') && value && value.trim() !== ''
    ).length;
    const haemqolProgress = Math.round((haemqolAnsweredQuestions / haemqolTotalQuestions) * 100);
    
    let haemqolStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (haemqolAnsweredQuestions === haemqolTotalQuestions) {
      haemqolStatus = 'completed';
    } else if (haemqolAnsweredQuestions > 0) {
      haemqolStatus = 'in_progress';
    }

    // HAL task status (42 questions: q1-q42)
    const halTotalQuestions = 42;
    const halAnsweredQuestions = Object.entries(answers).filter(([key, value]) => 
      key.startsWith('q') && value && value.trim() !== ''
    ).length;
    const halProgress = Math.round((halAnsweredQuestions / halTotalQuestions) * 100);
    
    let halStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (halAnsweredQuestions === halTotalQuestions) {
      halStatus = 'completed';
    } else if (halAnsweredQuestions > 0) {
      halStatus = 'in_progress';
    }

    setTaskStatuses({
      haemqol: { status: haemqolStatus, progress: haemqolProgress },
      hal: { status: halStatus, progress: halProgress }
    });
  };

  // Load dashboard data
  useEffect(() => {
    const loadDashboardData = async () => {
      if (!currentUser?.id) {
        router.push('/patient/login');
        return;
      }

      try {
        // Load questionnaire data first
        await loadData();
        
        const result = await getPatientDashboardData(currentUser.id);
        if (result.success && result.data) {
          setDashboardData(result.data);
        } else {
          setError(result.error || '加载数据失败');
        }
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        setError('加载数据时出现错误');
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentUser, router, loadData]);

  // Calculate task statuses when answers change
  useEffect(() => {
    calculateTaskStatus();
  }, [answers, haemqolAnswers]);

  // Handle logout
  const handleLogout = async () => {
    try {
      // Clear user session
      await clearUserSession();
      
      // Clear all questionnaire data to prevent data leakage to next user
      const { clearAllData } = useHalStore.getState();
      await clearAllData();
      
      // Update store state
      logout();
      
      // Navigate to home
      router.push('/');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Handle task start
  const handleTaskStart = (taskType: string) => {
    switch (taskType) {
      case 'haemqol':
        if (taskStatuses.haemqol.status === 'completed') {
          router.push('/patient/result');
        } else {
          router.push('/patient/haemqol');
        }
        break;
      case 'hal':
        if (taskStatuses.hal.status === 'completed') {
          router.push('/patient/result');
        } else {
          router.push('/patient/questionnaire');
        }
        break;
      default:
        console.warn('Unknown task type:', taskType);
    }
  };

  // Navigate to personal info
  const handlePersonalInfo = () => {
    router.push('/patient/info');
  };

  // Calculate overall progress
  const completedTasks = Object.values(taskStatuses).filter(task => task.status === 'completed').length;
  const totalTasks = Object.keys(taskStatuses).length;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">正在加载...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-xl shadow-lg">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/patient/login')}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            返回登录
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                HAL血友病生活质量评估系统
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">
                欢迎，{dashboardData?.patient.name || currentUser?.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-gray-500 hover:text-gray-700 flex items-center"
              >
                <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                退出
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome section */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                患者任务中心
              </h2>
              <p className="text-gray-600">
                请根据医生安排完成以下问卷任务。您可以随时暂停并继续填写。
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handlePersonalInfo}
                className="flex items-center px-4 py-2 text-green-600 border border-green-600 rounded-lg hover:bg-green-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                个人信息
              </button>
            </div>
          </div>
        </div>

        {/* Task cards grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* HAEMO-QoL-A Task */}
          <TaskCard
            title="HAEMO-QoL-A 生存质量量表"
            description="评估血友病患者的生活质量，包括身体健康、情感状态、社会功能等多个维度。"
            status={taskStatuses.haemqol.status}
            progress={taskStatuses.haemqol.progress}
            estimatedTime={15}
            onStart={() => handleTaskStart('haemqol')}
            priority="normal"
          />

          {/* HAL Task */}
          <TaskCard
            title="HAL 血友病活动列表"
            description="评估血友病对日常活动的影响程度，帮助制定个性化的治疗和生活管理方案。"
            status={taskStatuses.hal.status}
            progress={taskStatuses.hal.progress}
            estimatedTime={10}
            onStart={() => handleTaskStart('hal')}
            priority="normal"
          />
        </div>

        {/* Quick info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Patient info summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">姓名:</span>
                <span className="font-medium">{dashboardData?.patient.name || currentUser?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">年龄:</span>
                <span className="font-medium">{dashboardData?.patient.age || '未填写'} {dashboardData?.patient.age ? '岁' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">患者ID:</span>
                <span className="font-medium">{dashboardData?.patient.id || currentUser?.id}</span>
              </div>
            </div>
          </div>

          {/* Task progress summary */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">任务进度</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">待完成:</span>
                <span className="font-medium text-orange-600">
                  {totalTasks - completedTasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">已完成:</span>
                <span className="font-medium text-green-600">
                  {completedTasks}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">总计:</span>
                <span className="font-medium">
                  {totalTasks}
                </span>
              </div>
            </div>
          </div>

          {/* Medical info (limited view) */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">医疗信息</h3>
            <div className="space-y-3">
              {dashboardData?.medical_info?.evaluation_date ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">评估日期:</span>
                    <span className="font-medium">
                      {new Date(dashboardData.medical_info.evaluation_date).toLocaleDateString()}
                    </span>
                  </div>
                  {dashboardData.medical_info.next_follow_up && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">下次随访:</span>
                      <span className="font-medium">
                        {new Date(dashboardData.medical_info.next_follow_up).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-gray-500 text-sm">医疗信息由医生填写</p>
              )}
            </div>
          </div>
        </div>

        {/* Help section */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">使用说明</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            <li>• 您可以随时暂停问卷填写，系统会自动保存您的进度</li>
            <li>• 建议在安静的环境中填写问卷，确保答案的准确性</li>
            <li>• 如有疑问，请联系您的主治医生</li>
            <li>• 问卷结果将用于评估和改善您的治疗方案</li>
          </ul>
        </div>
      </div>
    </div>
  );
} 
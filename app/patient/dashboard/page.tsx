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
import { 
  getPatientDashboardData, 
  getPatientQuestionnaireHistory, 
  getPatientAssignedTasks,
  clearUserSession,
  loadUserSpecificAnswers,
  loadUserSpecificHaemqolAnswers,
  loadUserSpecificPatientInfo,
  performDatabaseMaintenance,
  validateUserData,
  loadTaskSpecificAnswers,
  saveTaskSpecificAnswers,
  getTaskAnswersHistory
} from '../../shared/utils/database';
import { PatientDashboardData, Task, Response } from '../../shared/types/database';

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
  const [activeTab, setActiveTab] = useState<'tasks' | 'history'>('tasks');
  const [questionnaireHistory, setQuestionnaireHistory] = useState<Response[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  
  // Task status based on database assigned tasks and completion
  const [taskStatuses, setTaskStatuses] = useState<{
    haemqol: { 
      status: 'not_started' | 'in_progress' | 'completed', 
      progress: number,
      answered: number,
      total: number,
      task: any,
      hasActiveTask: boolean
    },
    hal: { 
      status: 'not_started' | 'in_progress' | 'completed', 
      progress: number,
      answered: number,
      total: number,
      task: any,
      hasActiveTask: boolean
    }
  }>({
    haemqol: { status: 'not_started', progress: 0, answered: 0, total: 41, task: null, hasActiveTask: false },
    hal: { status: 'not_started', progress: 0, answered: 0, total: 42, task: null, hasActiveTask: false }
  });

  // Calculate task statuses based on assigned tasks and local answers
  const calculateTaskStatus = async () => {
    console.log('📊 Calculating task statuses...');
    console.log('📋 Total assigned tasks:', assignedTasks.length);
    console.log('🔍 HAL answers object:', answers, 'keys:', Object.keys(answers));
    console.log('🔍 HAEMO-QoL-A answers object:', haemqolAnswers, 'keys:', Object.keys(haemqolAnswers));
    
    // Group tasks by questionnaire type
    const halTasks = assignedTasks.filter(task => task.questionnaire_id === 'hal');
    const haemqolTasks = assignedTasks.filter(task => task.questionnaire_id === 'haemqol');
    
    console.log('🔹 HAL tasks found:', halTasks.length);
    console.log('🔹 HAEMO-QoL-A tasks found:', haemqolTasks.length);
    
    // FIXED: Function to determine which task to use for display
    // Prioritize active tasks (not_started or in_progress) to ensure proper task independence
    const selectTaskForDisplay = (tasks: Task[], taskType: string) => {
      if (tasks.length === 0) return null;
      
      console.log(`🔍 ${taskType} task selection:`, tasks);
      
      // FIXED: Find truly active tasks first (not_started or in_progress)
      const activeTasks = tasks.filter(task => 
        task.status === 'not_started' || task.status === 'in_progress'
      );
      
      if (activeTasks.length > 0) {
        // Use the newest active task (ensures latest doctor assignment is shown)
        activeTasks.sort((a, b) => Number(b.id) - Number(a.id));
        console.log(`📌 ${taskType}: Found ${activeTasks.length} active tasks, using newest:`, activeTasks[0].id);
        return activeTasks[0];
      }
      
      // No active tasks, use the most recent completed task for history display
      const completedTasks = tasks.filter(task => task.status === 'completed');
      if (completedTasks.length > 0) {
        completedTasks.sort((a, b) => Number(b.id) - Number(a.id));
        console.log(`📌 ${taskType}: No active tasks, using most recent completed:`, completedTasks[0].id);
        return completedTasks[0];
      }
      
      // Fallback to any task (shouldn't happen)
      tasks.sort((a, b) => Number(b.id) - Number(a.id));
      console.log(`📌 ${taskType}: Using fallback task:`, tasks[0].id);
      return tasks[0];
    };
    
    const selectedHalTask = selectTaskForDisplay(halTasks, 'HAL');
    const selectedHaemqolTask = selectTaskForDisplay(haemqolTasks, 'HAEMO-QoL-A');
    
    // Load task-specific data if we have active tasks
    let halTaskAnswers = answers;
    let haemqolTaskAnswers = haemqolAnswers;
    
    if (selectedHalTask && currentUser?.id) {
      try {
        const taskAnswers = await loadTaskSpecificAnswers(selectedHalTask.id.toString(), 'hal', currentUser.id);
        if (Object.keys(taskAnswers).length > 0) {
          console.log(`📝 Loaded HAL task-specific answers for task ${selectedHalTask.id}:`, Object.keys(taskAnswers).length);
          halTaskAnswers = taskAnswers as typeof answers;
        } else {
          console.log(`📝 No task-specific HAL answers found for task ${selectedHalTask.id}, using user data`);
        }
      } catch (error) {
        console.warn('Failed to load HAL task-specific answers:', error);
      }
    }
    
    if (selectedHaemqolTask && currentUser?.id) {
      try {
        const taskAnswers = await loadTaskSpecificAnswers(selectedHaemqolTask.id.toString(), 'haemqol', currentUser.id);
        if (Object.keys(taskAnswers).length > 0) {
          console.log(`📝 Loaded HAEMQOL task-specific answers for task ${selectedHaemqolTask.id}:`, Object.keys(taskAnswers).length);
          haemqolTaskAnswers = taskAnswers as typeof haemqolAnswers;
        } else {
          console.log(`📝 No task-specific HAEMQOL answers found for task ${selectedHaemqolTask.id}, using user data`);
        }
      } catch (error) {
        console.warn('Failed to load HAEMQOL task-specific answers:', error);
      }
    }
    
    // Calculate HAL status
    const halAnswered = Object.keys(halTaskAnswers).length;
    const halTotal = 42;
    const halProgress = Math.round((halAnswered / halTotal) * 100);
    const halSampleAnswers = Object.entries(halTaskAnswers).slice(0, 3);
    
    let halStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (halAnswered === halTotal) {
      halStatus = 'completed';
    } else if (halAnswered > 0) {
      halStatus = 'in_progress';
    }

    console.log('📝 HAL local answers:', {
      answered: halAnswered,
      total: halTotal,
      status: halStatus,
      progress: halProgress,
      sampleAnswers: halSampleAnswers
    });

    // Set HAL task information
    let halTaskInfo = null;
    if (selectedHalTask) {
      halTaskInfo = {
        id: selectedHalTask.id,
        status: selectedHalTask.status,
        progress: selectedHalTask.progress,
        completed_at: selectedHalTask.completed_at
      };
      console.log('✅ HAL task found:', halTaskInfo);
    } else {
      console.log('❌ No HAL task assigned');
    }

    // Calculate HAEMO-QoL-A status
    const haemqolAnswered = Object.keys(haemqolTaskAnswers).length;
    const haemqolTotal = 41;
    const haemqolProgress = Math.round((haemqolAnswered / haemqolTotal) * 100);

    let haemqolStatus: 'not_started' | 'in_progress' | 'completed' = 'not_started';
    if (haemqolAnswered === haemqolTotal) {
      haemqolStatus = 'completed';
    } else if (haemqolAnswered > 0) {
      haemqolStatus = 'in_progress';
    }

    console.log('📝 HAEMO-QoL-A local answers:', {
      answered: haemqolAnswered,
      total: haemqolTotal,
      status: haemqolStatus,
      progress: haemqolProgress
    });

    // Set HAEMO-QoL-A task information
    let haemqolTaskInfo = null;
    if (selectedHaemqolTask) {
      haemqolTaskInfo = {
        id: selectedHaemqolTask.id,
        status: selectedHaemqolTask.status,
        progress: selectedHaemqolTask.progress,
        completed_at: selectedHaemqolTask.completed_at
      };
      console.log('✅ HAEMO-QoL-A task found:', haemqolTaskInfo);
    } else {
      console.log('❌ No HAEMO-QoL-A task assigned');
    }

    const finalStatuses = {
      hal: {
        status: halStatus,
        progress: halProgress,
        answered: halAnswered,
        total: halTotal,
        task: halTaskInfo,
        // FIXED: Check if there's a truly active task (not just incomplete)
        hasActiveTask: !!(selectedHalTask && (selectedHalTask.status === 'not_started' || selectedHalTask.status === 'in_progress'))
      },
      haemqol: {
        status: haemqolStatus,
        progress: haemqolProgress,
        answered: haemqolAnswered,
        total: haemqolTotal,
        task: haemqolTaskInfo,
        // FIXED: Check if there's a truly active task (not just incomplete)
        hasActiveTask: !!(selectedHaemqolTask && (selectedHaemqolTask.status === 'not_started' || selectedHaemqolTask.status === 'in_progress'))
      }
    };

    console.log('🎯 Final statuses:', finalStatuses);
    setTaskStatuses(finalStatuses);
  };

  // Load dashboard data function
  const loadDashboardData = async (forceRefresh = false) => {
    if (!currentUser?.id) {
      router.push('/patient/login');
      return;
    }

    if (forceRefresh) {
      setIsLoading(true);
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

      // Load questionnaire history (patient can see their own history)
      try {
        const historyResult = await getPatientQuestionnaireHistory(currentUser.id);
        if (historyResult.success && historyResult.data) {
          setQuestionnaireHistory(historyResult.data);
        }
      } catch (historyError) {
        console.log('Note: Could not load questionnaire history:', historyError);
      }

      // Load assigned tasks
      try {
        const tasksResult = await getPatientAssignedTasks(currentUser.id);
        if (tasksResult.success && tasksResult.data) {
          setAssignedTasks(tasksResult.data);
          console.log('📋 Loaded tasks:', tasksResult.data.length, 'tasks');
        }
      } catch (taskError) {
        console.log('Note: Could not load assigned tasks:', taskError);
      }

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      setError('加载数据时出现错误');
    } finally {
      setIsLoading(false);
    }
  };

  // Load dashboard data on mount
  useEffect(() => {
    loadDashboardData();
  }, [currentUser, router]);

  // Add page visibility change listener for auto-refresh
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && currentUser?.id) {
        console.log('🔄 Page became visible, refreshing dashboard data...');
        loadDashboardData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser]);

  // Manual refresh function
  const handleRefresh = () => {
    console.log('🔄 Manual refresh triggered');
    loadDashboardData(true);
  };

  // Debug function to inspect database
  const handleDebugDatabase = async () => {
    console.log('🔍 DEBUG: Comprehensive data inspection for user:', currentUser?.id);
    
    try {
      if (!currentUser?.id) {
        console.log('❌ No current user ID available');
        return;
      }
      
      // 1. Validate user data
      console.log('📊 Validating user data...');
      const validation = await validateUserData(currentUser.id);
      console.log('📊 Validation results:', validation);
      
      if (validation.issues.length > 0) {
        console.log('⚠️ Issues found:');
        validation.issues.forEach((issue, index) => {
          console.log(`  ${index + 1}. ${issue}`);
        });
        
        // Ask if user wants to run maintenance
        const runMaintenance = confirm(
          `Found ${validation.issues.length} data issues. Would you like to run database maintenance to fix them?`
        );
        
        if (runMaintenance) {
          console.log('🔧 Running database maintenance...');
          await performDatabaseMaintenance(currentUser.id);
          
          // Re-validate after maintenance
          console.log('🔄 Re-validating after maintenance...');
          const postMaintenanceValidation = await validateUserData(currentUser.id);
          console.log('📊 Post-maintenance validation:', postMaintenanceValidation);
          
          if (postMaintenanceValidation.issues.length === 0) {
            console.log('✅ All issues resolved!');
            
            // Reload data after maintenance
            console.log('🔄 Reloading data...');
            await loadData();
          } else {
            console.log('⚠️ Some issues remain:', postMaintenanceValidation.issues);
          }
        }
      } else {
        console.log('✅ No data issues found');
      }
      
      // 2. Check current store state
      console.log('💾 Current store state:');
      console.log('  - HAL answers:', Object.keys(answers).length, 'questions');
      console.log('  - HAEMO-QoL-A answers:', Object.keys(haemqolAnswers).length, 'questions');
      console.log('  - Sample HAL answers:', Object.entries(answers).slice(0, 5));
      
      // 3. Check sessionStorage
      console.log('🗄️ SessionStorage inspection:');
      const halKey = `hal_answers_${currentUser.id}`;
      const haemqolKey = `haemqol_answers_${currentUser.id}`;
      const patientKey = `patient_info_${currentUser.id}`;
      
      const sessionHAL = sessionStorage.getItem(halKey);
      const sessionHAEMQOL = sessionStorage.getItem(haemqolKey);
      const sessionPatient = sessionStorage.getItem(patientKey);
      
      console.log('  - HAL sessionStorage size:', sessionHAL?.length || 0, 'chars');
      console.log('  - HAEMQOL sessionStorage size:', sessionHAEMQOL?.length || 0, 'chars');
      console.log('  - Patient sessionStorage size:', sessionPatient?.length || 0, 'chars');
      
      if (sessionHAL) {
        try {
          const halData = JSON.parse(sessionHAL);
          console.log('  - HAL sessionStorage answers:', Object.keys(halData).length);
        } catch (error) {
          console.log('  - ❌ HAL sessionStorage data corrupted:', error);
        }
      }
      
      // 4. Check IndexedDB directly
      console.log('💿 IndexedDB inspection:');
      try {
        const directHAL = await loadUserSpecificAnswers(currentUser.id);
        const directHAEMQOL = await loadUserSpecificHaemqolAnswers(currentUser.id);
        const directPatient = await loadUserSpecificPatientInfo(currentUser.id);
        
        console.log('  - IndexedDB HAL answers:', Object.keys(directHAL).length);
        console.log('  - IndexedDB HAEMQOL answers:', Object.keys(directHAEMQOL).length);
        console.log('  - IndexedDB patient info:', directPatient ? 'exists' : 'missing');
      } catch (error) {
        console.log('  - ❌ IndexedDB access error:', error);
      }
      
      // 5. Get task data using existing functions
      const tasksResult = await getPatientAssignedTasks(currentUser?.id || '');
      if (tasksResult.success && tasksResult.data) {
        console.log('📋 User tasks in database:', tasksResult.data);
        tasksResult.data.forEach((task, index) => {
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
      
      // 6. Get response data using existing functions
      const responsesResult = await getPatientQuestionnaireHistory(currentUser?.id || '');
      if (responsesResult.success && responsesResult.data) {
        console.log('📝 User responses in database:', responsesResult.data);
        responsesResult.data.forEach((response, index) => {
          console.log(`Response ${index + 1}:`, {
            id: response.id,
            task_id: response.task_id,
            type: response.questionnaire_type,
            total_score: response.total_score,
            completed_at: response.completed_at
          });
        });
      }
      
      // 7. Additional debugging info
      console.log('🔧 Browser info:');
      console.log('  - User agent:', navigator.userAgent);
      console.log('  - Storage available:', 'sessionStorage' in window, 'indexedDB' in window);
      console.log('  - Current URL:', window.location.href);
      console.log('  - Timestamp:', new Date().toISOString());
      
    } catch (error) {
      console.error('❌ Debug inspection failed:', error);
    }
  };

  // Calculate task statuses when answers or assigned tasks change
  useEffect(() => {
    const runCalculateTaskStatus = async () => {
      await calculateTaskStatus();
    };
    runCalculateTaskStatus();
  }, [answers, haemqolAnswers, assignedTasks]);

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

  // Handle task start - allow retaking questionnaires
  const handleTaskStart = (taskType: string) => {
    // Find the appropriate task for this questionnaire type
    let taskId: string | null = null;
    
    if (taskType === 'haemqol' && taskStatuses.haemqol.task) {
      taskId = taskStatuses.haemqol.task.id.toString();
    } else if (taskType === 'hal' && taskStatuses.hal.task) {
      taskId = taskStatuses.hal.task.id.toString();
    }
    
    console.log(`🔗 Starting ${taskType} task with ID:`, taskId);
    
    switch (taskType) {
      case 'haemqol':
        // Pass task ID if available
        const haemqolUrl = taskId ? `/patient/haemqol?taskId=${taskId}` : '/patient/haemqol';
        router.push(haemqolUrl);
        break;
      case 'hal':
        // Pass task ID if available
        const halUrl = taskId ? `/patient/questionnaire?taskId=${taskId}` : '/patient/questionnaire';
        router.push(halUrl);
        break;
      default:
        console.warn('Unknown task type:', taskType);
    }
  };

  // Handle view results
  const handleViewResults = () => {
    router.push('/patient/result');
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
                onClick={handleRefresh}
                disabled={isLoading}
                className="text-gray-500 hover:text-gray-700 flex items-center disabled:opacity-50"
                title="刷新数据"
              >
                <svg className={`w-5 h-5 mr-1 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                刷新
              </button>
              <button
                onClick={handleDebugDatabase}
                className="text-gray-500 hover:text-gray-700 flex items-center text-xs"
                title="调试数据库"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                调试
              </button>
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

        {/* Tab Navigation */}
        <div className="bg-white rounded-xl shadow-sm mb-8">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'tasks'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('tasks')}
              >
                当前任务
              </button>
              <button
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'history'
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('history')}
              >
                问卷历史 ({questionnaireHistory.length})
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'tasks' && (
          <>
            {/* Task cards grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* HAEMO-QoL-A Task */}
              <TaskCard
                title="HAEMO-QoL-A 生存质量量表"
                description={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'haemqol')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.instructions || "评估血友病患者的生活质量，包括身体健康、情感状态、社会功能等多个维度。";
                })()}
                status={taskStatuses.haemqol.status}
                progress={taskStatuses.haemqol.progress}
                estimatedTime={15}
                onStart={() => handleTaskStart('haemqol')}
                priority={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'haemqol')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.priority || 'normal';
                })() as 'normal' | 'urgent'}
                dueDate={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'haemqol')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.due_date || undefined;
                })()}
              />

              {/* HAL Task */}
              <TaskCard
                title="HAL 血友病活动列表"
                description={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'hal')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.instructions || "评估血友病对日常活动的影响程度，帮助制定个性化的治疗和生活管理方案。";
                })()}
                status={taskStatuses.hal.status}
                progress={taskStatuses.hal.progress}
                estimatedTime={10}
                onStart={() => handleTaskStart('hal')}
                priority={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'hal')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.priority || 'normal';
                })() as 'normal' | 'urgent'}
                dueDate={(() => {
                  const tasks = assignedTasks.filter(t => t.questionnaire_id === 'hal')
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                  const latestTask = tasks[0];
                  return latestTask?.due_date || undefined;
                })()}
              />
            </div>

            {/* Historical Tasks - Show older tasks for reference */}
            {(() => {
              // Group tasks by questionnaire type and filter out the latest ones already shown
              const halTasks = assignedTasks.filter(t => t.questionnaire_id === 'hal')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              const haemqolTasks = assignedTasks.filter(t => t.questionnaire_id === 'haemqol')
                .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
              
              // Exclude the latest task for each type (already shown in main cards)
              const historicalTasks = [
                ...halTasks.slice(1), // Skip the first (latest) HAL task
                ...haemqolTasks.slice(1) // Skip the first (latest) HAEMO-QoL-A task
              ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

              if (historicalTasks.length === 0) return null;

              return (
                <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">
                    历史任务记录 ({historicalTasks.length} 个)
                  </h3>
                  <div className="space-y-4">
                    {historicalTasks.map((task) => (
                      <div key={task.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              {task.questionnaire_id === 'haemqol' ? 'HAEMO-QoL-A' : 'HAL'} 问卷
                            </h4>
                            <p className="text-sm text-gray-600">{task.instructions || '医生分配的问卷任务'}</p>
                          </div>
                          <span className={`px-2 py-1 text-xs rounded-full ${
                            task.status === 'completed' ? 'bg-green-100 text-green-800' :
                            task.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {task.status === 'completed' ? '已完成' :
                             task.status === 'in_progress' ? '进行中' : '未开始'}
                          </span>
                        </div>
                        <div className="text-sm text-gray-500">
                          分配日期: {new Date(task.created_at).toLocaleDateString('zh-CN')}
                          {task.due_date && (
                            <> • 截止日期: {new Date(task.due_date).toLocaleDateString('zh-CN')}</>
                          )}
                          {task.completed_at && (
                            <> • 完成日期: {new Date(task.completed_at).toLocaleDateString('zh-CN')}</>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {activeTab === 'history' && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">问卷完成历史</h3>
            {questionnaireHistory.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-gray-400 text-4xl mb-4">📋</div>
                <p className="text-gray-500">暂无问卷历史记录</p>
                <p className="text-sm text-gray-400 mt-2">完成问卷后，历史记录会显示在这里</p>
              </div>
            ) : (
              <div className="space-y-6">
                {questionnaireHistory.map((response, index) => (
                  <div key={response.id} className="border rounded-lg p-6 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium text-gray-900 mb-1">
                          {response.questionnaire_type === 'haemqol' ? 'HAEMO-QoL-A 生存质量量表' : 'HAL 血友病活动列表'}
                        </h4>
                        <p className="text-sm text-gray-600">
                          第 {questionnaireHistory.filter(r => r.questionnaire_type === response.questionnaire_type).length - index} 次完成
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-semibold text-green-600">
                          总分: {response.total_score}
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(response.created_at).toLocaleDateString()} {new Date(response.created_at).toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                    
                    {/* Response details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 pt-4 border-t">
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">评估结果</h5>
                        <div className="text-sm text-gray-600">
                          <p>完成时间: {new Date(response.created_at).toLocaleString()}</p>
                          <p>问卷类型: {response.questionnaire_type === 'haemqol' ? 'HAEMO-QoL-A' : 'HAL'}</p>
                          {response.questionnaire_type === 'haemqol' && (
                            <p>生活质量评分: {response.total_score}/164 分</p>
                          )}
                          {response.questionnaire_type === 'hal' && (
                            <p>活动限制评分: {response.total_score}/168 分</p>
                          )}
                        </div>
                      </div>
                      <div>
                        <h5 className="font-medium text-gray-700 mb-2">答案概览</h5>
                        <div className="text-sm text-gray-600 max-h-32 overflow-y-auto">
                          {Object.entries(typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers).slice(0, 5).map(([key, value]) => (
                            <div key={key} className="mb-1">
                              <span className="font-medium">{key}:</span> {String(value)}
                            </div>
                          ))}
                          {Object.keys(typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers).length > 5 && (
                            <div className="text-gray-400 italic">
                              还有 {Object.keys(typeof response.answers === 'string' ? JSON.parse(response.answers) : response.answers).length - 5} 个答案...
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

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
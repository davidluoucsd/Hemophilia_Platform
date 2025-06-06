/**
 * Patient Detail Page - Comprehensive Patient Management
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useHalStore } from '../../../shared/store';
import { useTranslation } from '../../../shared/hooks/useTranslation';
import PageWrapper from '../../../shared/components/PageWrapper';
import { 
  getPatientInfo, 
  getMedicalInfo, 
  saveMedicalInfo, 
  getPatientTasks, 
  assignQuestionnaire,
  getPatientQuestionnaireHistory 
} from '../../../shared/utils/database';
import { Patient, MedicalInfo, Task, Response } from '../../../shared/types/database';
import { generateDetailedCSVHeaders, generatePatientCSVRow } from '../../../shared/utils/score-analysis';
import ScoreDetailView from '../../../shared/components/ScoreDetailView';

type TabType = 'basic' | 'questionnaires' | 'tasks' | 'medical';

const PatientDetailPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;
  const { t } = useTranslation();

  const { currentUser, logout } = useHalStore();

  const [activeTab, setActiveTab] = useState<TabType>('basic');
  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Medical info form data
  const [medicalFormData, setMedicalFormData] = useState({
    treatment_frequency: '',
    treatment_dose: '',
    evaluation_date: '',
    next_follow_up: '',
    diagnosis_info: '',
    treatment_plan: '',
    notes: ''
  });

  // Task assignment modal
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignmentData, setAssignmentData] = useState({
    questionnaireType: 'haemqol' as 'haemqol' | 'hal',
    due_date: '',
    priority: 'normal' as 'normal' | 'urgent',
    instructions: ''
  });

  // Load patient data
  useEffect(() => {
    const loadPatientData = async () => {
      if (!currentUser || currentUser.role !== 'doctor') {
        router.push('/doctor/login');
        return;
      }

      if (!patientId) {
        setError('患者ID无效');
        return;
      }

      setIsLoading(true);
      try {
        // Load patient basic info
        const patientResult = await getPatientInfo(patientId);
        if (patientResult.success && patientResult.data) {
          setPatient(patientResult.data);
        } else {
          setError('未找到患者信息');
          return;
        }

        // Load medical info
        const medicalResult = await getMedicalInfo(patientId);
        if (medicalResult.success && medicalResult.data) {
          setMedicalInfo(medicalResult.data);
          setMedicalFormData({
            treatment_frequency: medicalResult.data.treatment_frequency.toString(),
            treatment_dose: medicalResult.data.treatment_dose.toString(),
            evaluation_date: medicalResult.data.evaluation_date.split('T')[0],
            next_follow_up: medicalResult.data.next_follow_up.split('T')[0],
            diagnosis_info: medicalResult.data.diagnosis_info || '',
            treatment_plan: medicalResult.data.treatment_plan || '',
            notes: medicalResult.data.notes || ''
          });
        }

        // Load tasks
        const tasksResult = await getPatientTasks(patientId);
        if (tasksResult.success && tasksResult.data) {
          setTasks(tasksResult.data);
        }

        // Load questionnaire responses
        const responsesResult = await getPatientQuestionnaireHistory(patientId);
        console.log('🔍 Debug - 查询问卷历史结果:', responsesResult);
        if (responsesResult.success && responsesResult.data) {
          console.log('🔍 Debug - 找到的问卷数量:', responsesResult.data.length);
          console.log('🔍 Debug - 问卷数据:', responsesResult.data);
          setResponses(responsesResult.data);
        } else {
          console.log('🔍 Debug - 查询问卷历史失败:', responsesResult.error);
          setResponses([]);
        }

      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('加载患者数据时出现错误');
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
  }, [patientId, currentUser, router]);

  // Handle medical info form submission
  const handleMedicalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !patient) return;

    setIsSaving(true);
    try {
      const medicalData = {
        patient_id: patient.id,
        treatment_frequency: parseInt(medicalFormData.treatment_frequency) || 0,
        treatment_dose: parseFloat(medicalFormData.treatment_dose) || 0,
        evaluation_date: new Date(medicalFormData.evaluation_date).toISOString(),
        next_follow_up: new Date(medicalFormData.next_follow_up).toISOString(),
        doctor_id: currentUser.id,
        diagnosis_info: medicalFormData.diagnosis_info,
        treatment_plan: medicalFormData.treatment_plan,
        notes: medicalFormData.notes
      };

      const result = await saveMedicalInfo(medicalData);
      if (result.success) {
        setMedicalInfo(result.data || null);
        alert('医疗信息保存成功');
      } else {
        setError(result.error || '保存失败');
      }
    } catch (error) {
      console.error('Error saving medical info:', error);
      setError('保存医疗信息时出现错误');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle questionnaire assignment
  const handleAssignQuestionnaire = async () => {
    if (!patient || !currentUser) return;

    try {
      const result = await assignQuestionnaire(
        patient.id,
        assignmentData.questionnaireType,
        {
          due_date: assignmentData.due_date ? new Date(assignmentData.due_date).toISOString() : undefined,
          priority: assignmentData.priority,
          instructions: assignmentData.instructions
        }
      );

      if (result.success) {
        setShowAssignModal(false);
        
        // Reset assignment form
        setAssignmentData({
          questionnaireType: 'haemqol',
          due_date: '',
          priority: 'normal',
          instructions: ''
        });
        
        // Reload all patient data to ensure everything is up to date
        await reloadPatientData();
        
        alert('问卷分配成功');
      } else {
        setError(result.error || '分配失败');
      }
    } catch (error) {
      console.error('Error assigning questionnaire:', error);
      setError('分配问卷时出现错误');
    }
  };
  
  // Function to reload all patient data
  const reloadPatientData = async () => {
    if (!patientId) return;
    
    try {
      // Reload tasks
      const tasksResult = await getPatientTasks(patientId);
      if (tasksResult.success && tasksResult.data) {
        setTasks(tasksResult.data);
        console.log('🔄 Reloaded tasks:', tasksResult.data.length);
      }

      // Reload questionnaire responses  
      const responsesResult = await getPatientQuestionnaireHistory(patientId);
      if (responsesResult.success && responsesResult.data) {
        setResponses(responsesResult.data);
        console.log('🔄 Reloaded responses:', responsesResult.data.length);
      }
    } catch (error) {
      console.error('Error reloading patient data:', error);
    }
  };

  // Export patient data to CSV with detailed scores
  const exportToCSV = () => {
    if (!patient) return;

    const csvData = [];
    
    // Use detailed headers
    const headers = generateDetailedCSVHeaders();
    csvData.push(headers.join(','));

    // Get latest responses for analysis
    const latestResponses = responses
      .sort((a, b) => new Date(b.completed_at || b.created_at).getTime() - new Date(a.completed_at || a.created_at).getTime())
      .reduce((acc, response) => {
        if (!acc[response.questionnaire_type]) {
          acc[response.questionnaire_type] = response;
        }
        return acc;
      }, {} as Record<string, Response>);

    // Generate detailed patient row
    const patientRow = generatePatientCSVRow(
      patient,
      medicalInfo,
      Object.values(latestResponses)
    );

    csvData.push(patientRow.map(item => `"${item}"`).join(','));

    // Create and download CSV
    const csvContent = csvData.join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `patient_${patient.id}_${patient.name}_detailed_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

  // Get task status color
  const getTaskStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'not_started': return 'bg-gray-100 text-gray-800';
      case 'expired': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载患者信息...</p>
        </div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || '未找到患者'}</p>
          <button
            onClick={() => router.push('/doctor/patients')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            返回患者列表
          </button>
        </div>
      </div>
    );
  }

  return (
    <PageWrapper>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push('/doctor/patients')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">
                {t('doctor.patientDetails')} - {patient.name}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={exportToCSV}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
              >
{t('doctor.exportCSV')}
              </button>
              <span className="text-sm text-gray-700">{currentUser?.name}</span>
              <button
                onClick={logout}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                注销
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Patient Summary */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-500">患者ID</h3>
              <p className="text-lg font-semibold text-gray-900">{patient.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">姓名</h3>
              <p className="text-lg font-semibold text-gray-900">{patient.name}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">年龄</h3>
              <p className="text-lg font-semibold text-gray-900">{patient.age}岁</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">体重/身高</h3>
              <p className="text-lg font-semibold text-gray-900">{patient.weight}kg / {patient.height}cm</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              {[
                { id: 'basic', name: t('doctor.basicInfo'), icon: '👤' },
                { id: 'questionnaires', name: t('doctor.questionnaireHistory'), icon: '📋' },
                { id: 'tasks', name: t('doctor.taskManagement'), icon: '✅' },
                { id: 'medical', name: t('doctor.medicalInfo'), icon: '🏥' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as TabType)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {/* Basic Information Tab */}
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">基础信息</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">患者ID</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.id}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">姓名</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">年龄</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.age}岁</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">体重</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.weight}kg</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">身高</label>
                    <p className="mt-1 text-sm text-gray-900">{patient.height}cm</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">创建时间</label>
                    <p className="mt-1 text-sm text-gray-900">{formatDate(patient.created_at)}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Questionnaires Tab */}
            {activeTab === 'questionnaires' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">问卷历史记录</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => router.push(`/doctor/patients/${patientId}/analysis`)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {t('doctor.detailedAnalysis')}
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t('doctor.assignNewQuestionnaire')}
                    </button>
                  </div>
                </div>
                
                {responses.length > 0 ? (
                  <div className="space-y-6">
                    {responses.map((response) => (
                      <ScoreDetailView key={response.id} response={response} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">{t('doctor.noQuestionnaireRecords')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Tasks Tab */}
            {activeTab === 'tasks' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium text-gray-900">{t('doctor.taskManagement')}</h3>
                  <div className="flex space-x-3">
                    <button
                      onClick={reloadPatientData}
                      className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      {t('doctor.refreshData')}
                    </button>
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      {t('doctor.assignNewQuestionnaire')}
                    </button>
                  </div>
                </div>
                
                {tasks.length > 0 ? (
                  <div className="space-y-4">
                    {tasks.map((task) => (
                      <div key={task.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium text-gray-900">
                            {task.questionnaire_id === 'haemqol' ? 'GAD-7 & PHQ-9' : 'HAL'} {t('doctor.questionnaireSuffix')}
                          </h4>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTaskStatusColor(task.status)}`}>
                            {task.status === 'completed' ? t('doctor.statusCompleted') :
                             task.status === 'in_progress' ? t('doctor.statusInProgress') :
                             task.status === 'not_started' ? t('doctor.statusNotStarted') : t('doctor.statusExpired')}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">{t('doctor.createdTime')}：</span>
                            <span className="text-gray-900">{formatDate(task.created_at)}</span>
                          </div>
                          {task.due_date && (
                            <div>
                              <span className="text-gray-500">{t('doctor.dueTime')}：</span>
                              <span className="text-gray-900">{formatDate(task.due_date)}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-gray-500">{t('doctor.progress')}：</span>
                            <span className="text-gray-900">{task.progress}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">{t('doctor.priority')}：</span>
                            <span className="text-gray-900">{task.priority === 'urgent' ? t('doctor.priorityUrgent') : t('doctor.priorityNormal')}</span>
                          </div>
                        </div>
                        {task.instructions && (
                          <div className="mt-2">
                            <span className="text-gray-500 text-sm">{t('doctor.instructions')}：</span>
                            <p className="text-gray-900 text-sm">{task.instructions}</p>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-gray-500">{t('doctor.noAssignedTasks')}</p>
                  </div>
                )}
              </div>
            )}

            {/* Medical Information Tab */}
            {activeTab === 'medical' && (
              <div className="space-y-6">
                <h3 className="text-lg font-medium text-gray-900">{t('doctor.medicalInfoManagement')}</h3>
                
                <form onSubmit={handleMedicalSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('doctor.weeklyTreatmentFrequency')}</label>
                      <input
                        type="number"
                        min="0"
                        value={medicalFormData.treatment_frequency}
                        onChange={(e) => setMedicalFormData({...medicalFormData, treatment_frequency: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('doctor.weeklyFrequencyPlaceholder')}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('doctor.treatmentDoseUnit')}</label>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={medicalFormData.treatment_dose}
                        onChange={(e) => setMedicalFormData({...medicalFormData, treatment_dose: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder={t('doctor.dosagePlaceholder')}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('doctor.evaluationDateLabel')}</label>
                      <input
                        type="date"
                        value={medicalFormData.evaluation_date}
                        onChange={(e) => setMedicalFormData({...medicalFormData, evaluation_date: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700">{t('doctor.nextFollowUpDate')}</label>
                      <input
                        type="date"
                        value={medicalFormData.next_follow_up}
                        onChange={(e) => setMedicalFormData({...medicalFormData, next_follow_up: e.target.value})}
                        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('doctor.diagnosisInfo')}</label>
                    <textarea
                      rows={3}
                      value={medicalFormData.diagnosis_info}
                      onChange={(e) => setMedicalFormData({...medicalFormData, diagnosis_info: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('doctor.diagnosisPlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('doctor.treatmentPlan')}</label>
                    <textarea
                      rows={3}
                      value={medicalFormData.treatment_plan}
                      onChange={(e) => setMedicalFormData({...medicalFormData, treatment_plan: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('doctor.treatmentPlanPlaceholder')}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">{t('doctor.doctorNotes')}</label>
                    <textarea
                      rows={3}
                      value={medicalFormData.notes}
                      onChange={(e) => setMedicalFormData({...medicalFormData, notes: e.target.value})}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder={t('doctor.notesPlaceholder')}
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSaving ? t('doctor.saving') : t('doctor.saveMedicalInfo')}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Assignment Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">{t('doctor.assignQuestionnaire')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor.questionnaireType')}</label>
                  <select
                    value={assignmentData.questionnaireType}
                    onChange={(e) => setAssignmentData({...assignmentData, questionnaireType: e.target.value as 'haemqol' | 'hal'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                                              <option value="haemqol">{t('questionnaire.haemqol.title')}</option>
                    <option value="hal">{t('questionnaire.hal.title')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor.dueDate')}</label>
                  <input
                    type="date"
                    value={assignmentData.due_date}
                    onChange={(e) => setAssignmentData({...assignmentData, due_date: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor.priority')}</label>
                  <select
                    value={assignmentData.priority}
                    onChange={(e) => setAssignmentData({...assignmentData, priority: e.target.value as 'normal' | 'urgent'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="normal">{t('doctor.priorityNormal')}</option>
                    <option value="urgent">{t('doctor.priorityUrgent')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('doctor.instructions')}</label>
                  <textarea
                    rows={3}
                    value={assignmentData.instructions}
                    onChange={(e) => setAssignmentData({...assignmentData, instructions: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder={t('doctor.instructionsPlaceholder')}
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  {t('doctor.cancel')}
                </button>
                <button
                  onClick={handleAssignQuestionnaire}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  {t('doctor.assign')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
    </PageWrapper>
  );
};

export default PatientDetailPage; 
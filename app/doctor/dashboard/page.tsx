/**
 * HAL问卷系统 - 医生端Dashboard (Enhanced with Real Data)
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHalStore } from '../../shared/store';
import { useTranslation } from '../../shared/hooks/useTranslation';
import PageWrapper from '../../shared/components/PageWrapper';
import { 
  getAllPatients, 
  getPatientQuestionnaireHistory,
  getMedicalInfo 
} from '../../shared/utils/database';
import { 
  generateDetailedCSVHeaders, 
  generatePatientCSVRow 
} from '../../shared/utils/score-analysis';

const DoctorDashboardPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    currentUser, 
    logout, 
    doctorDashboardData, 
    isDoctorLoading, 
    doctorError,
    loadDoctorDashboard,
    refreshDoctorData 
  } = useHalStore();

  const [refreshing, setRefreshing] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    // Load dashboard data when component mounts
    if (currentUser?.role === 'doctor') {
      loadDoctorDashboard();
    }
  }, [currentUser, loadDoctorDashboard]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshDoctorData();
    setRefreshing(false);
  };

  const handleNavigateToPatients = () => {
    router.push('/doctor/patients');
  };

  // Batch export all patient data
  const handleBatchExport = async () => {
    setIsExporting(true);
    try {
      // Get all patients
      const patientsResult = await getAllPatients();
      if (!patientsResult.success || !patientsResult.data) {
        alert(t('doctor.getPatientListFailed'));
        return;
      }

      const csvData = [];
      
      // Headers
      const headers = generateDetailedCSVHeaders();
      csvData.push(headers.join(','));

      // For each patient, get their responses and medical info
      for (const patient of patientsResult.data) {
        try {
          // Get patient's questionnaire history
          const responsesResult = await getPatientQuestionnaireHistory(patient.id);
          const responses = responsesResult.success ? responsesResult.data || [] : [];

          // Get medical info
          const medicalResult = await getMedicalInfo(patient.id);
          const medicalInfo = medicalResult.success ? medicalResult.data : null;

          if (responses.length > 0) {
            // Generate a row with all responses for this patient
            const row = generatePatientCSVRow(patient, medicalInfo || undefined, responses);
            csvData.push(row.join(','));
          } else {
            // Generate a row with basic patient info even if no responses
            const row = generatePatientCSVRow(patient, medicalInfo || undefined, []);
            csvData.push(row.join(','));
          }
        } catch (error) {
          console.error(`Error processing patient ${patient.name}:`, error);
        }
      }

      // Download CSV
      const csvContent = csvData.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      
      if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `所有患者数据_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      alert(t('doctor.exportSuccess'));
    } catch (error) {
      console.error('Batch export error:', error);
      alert(t('doctor.exportFailed'));
    } finally {
      setIsExporting(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!currentUser || currentUser.role !== 'doctor') {
    return (
      <PageWrapper>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <p className="text-gray-600 mb-4">{t('doctor.accessDenied')}</p>
            <button
              onClick={() => router.push('/doctor/login')}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {t('doctor.goToDoctorLogin')}
            </button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="min-h-screen bg-gray-50">
      {/* 顶部导航栏 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">
                {t('doctor.systemTitle')}
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleBatchExport}
                disabled={isExporting}
                className="px-3 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isExporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    {t('doctor.exporting')}
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {t('doctor.batchExport')}
                  </>
                )}
              </button>
              <button
                onClick={handleRefresh}
                disabled={refreshing || isDoctorLoading}
                className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {refreshing || isDoctorLoading ? t('doctor.refreshing') : t('doctor.refreshData')}
              </button>
              <span className="text-sm text-gray-700">
                {t('doctor.welcome')}，{currentUser?.name || t('doctor.dashboard')}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
              >
                {t('navigation.logout')}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* 主要内容区域 */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* 错误提示 */}
          {doctorError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{doctorError}</p>
                </div>
              </div>
            </div>
          )}

          {/* 统计卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('doctor.totalPatients')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isDoctorLoading ? '...' : doctorDashboardData?.total_patients || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('doctor.activePatients')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isDoctorLoading ? '...' : doctorDashboardData?.active_patients || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-yellow-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('doctor.pendingTasks')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isDoctorLoading ? '...' : doctorDashboardData?.pending_tasks || 0}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">{t('doctor.completedThisWeek')}</p>
                  <p className="text-2xl font-semibold text-gray-900">
                    {isDoctorLoading ? '...' : doctorDashboardData?.completed_this_week || 0}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 功能区域 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 快速操作 */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('doctor.quickActions')}</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleNavigateToPatients}
                    className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                    {t('doctor.patientManagement')}
                  </button>
                  
                  <button
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                    {t('doctor.questionnaireManagement')}
                  </button>
                  
                  <button
                    disabled
                    className="w-full px-4 py-3 bg-gray-100 text-gray-500 rounded-md cursor-not-allowed flex items-center justify-center"
                  >
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                    </svg>
                    {t('doctor.dataAnalysis')}
                  </button>
                </div>
              </div>
            </div>

            {/* 最近完成的问卷 */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">{t('doctor.recentCompletions')}</h3>
                {isDoctorLoading ? (
                  <div className="text-center py-8">
                    <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                    <p className="mt-2 text-sm text-gray-500">{t('common.loading')}</p>
                  </div>
                ) : doctorDashboardData?.recent_completions && doctorDashboardData.recent_completions.length > 0 ? (
                  <div className="space-y-3">
                    {doctorDashboardData.recent_completions.map((completion, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                        <div>
                          <p className="font-medium text-gray-900">{completion.patient_name}</p>
                          <p className="text-sm text-gray-500">{completion.questionnaire_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-500">{formatDate(completion.completed_at)}</p>
                          {completion.score && (
                            <p className="text-sm font-medium text-green-600">{t('doctor.score')}: {completion.score}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-gray-500">{t('doctor.noCompletions')}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* 版权信息 */}
      <footer className="bg-white border-t mt-12">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500">
            <p>Copyright © 2025 罗骏哲（Junzhe Luo）. 版权所有.</p>
          </div>
        </div>
      </footer>
    </div>
    </PageWrapper>
  );
};

export default DoctorDashboardPage; 
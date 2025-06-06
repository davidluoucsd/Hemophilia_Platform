/**
 * HAL问卷系统 - 医生端患者管理
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
import { Patient } from '../../shared/types/database';
import { useTranslation } from '../../shared/hooks/useTranslation';
import PageWrapper from '../../shared/components/PageWrapper';

const DoctorPatientsPage: React.FC = () => {
  const router = useRouter();
  const { t } = useTranslation();
  const { 
    currentUser, 
    logout,
    patientList,
    selectedPatient,
    isDoctorLoading,
    doctorError,
    loadPatientList,
    searchPatientList,
    createPatient,
    selectPatient,
    assignQuestionnaireToPatient,
    setDoctorError
  } = useHalStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [newPatientData, setNewPatientData] = useState({
    id: '',
    name: '',
    age: '',
    weight: '',
    height: '',
    doctor_id: currentUser?.id || ''
  });

  useEffect(() => {
    if (currentUser?.role === 'doctor') {
      loadPatientList();
    }
  }, [currentUser, loadPatientList]);

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await searchPatientList(searchQuery);
  };

  const handleAddPatient = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data
    if (!newPatientData.id || !newPatientData.name) {
      setDoctorError('Patient ID and name are required');
      return;
    }

    const patientData: Omit<Patient, 'created_at' | 'updated_at'> = {
      id: newPatientData.id,
      name: newPatientData.name,
      age: parseInt(newPatientData.age) || 0,
      weight: parseFloat(newPatientData.weight) || 0,
      height: parseFloat(newPatientData.height) || 0,
      doctor_id: currentUser?.id
    };

    const success = await createPatient(patientData);
    if (success) {
      setShowAddModal(false);
      setNewPatientData({
        id: '',
        name: '',
        age: '',
        weight: '',
        height: '',
        doctor_id: currentUser?.id || ''
      });
    }
  };

  const handleAssignQuestionnaire = async (questionnaireType: 'haemqol' | 'hal') => {
    if (!selectedPatient) return;
    
    const success = await assignQuestionnaireToPatient(selectedPatient.id, questionnaireType);
    if (success) {
      setShowAssignModal(false);
      selectPatient(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (!currentUser || currentUser.role !== 'doctor') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Access denied. Doctor login required.</p>
          <button
            onClick={() => router.push('/doctor/login')}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Doctor Login
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
                onClick={() => router.push('/doctor/dashboard')}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
              </button>
              <h1 className="text-xl font-semibold text-gray-900">{t('doctor.patientManagement')}</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-700">
                {currentUser?.name || '医生'}
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
              >
                注销
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          
          {/* Error Display */}
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
                <div className="ml-auto">
                  <button
                    onClick={() => setDoctorError(null)}
                    className="text-red-400 hover:text-red-600"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <form onSubmit={handleSearch} className="flex">
                <input
                  type="text"
                  placeholder={t('doctor.searchPatients')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  disabled={isDoctorLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {t('doctor.search')}
                </button>
              </form>
            </div>
                          <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                {t('doctor.addNewPatient')}
              </button>
          </div>

          {/* Patient List */}
          {isDoctorLoading ? (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="text-center py-8">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-2 text-sm text-gray-500">加载患者列表...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              {patientList.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          患者信息
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          基本数据
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          创建时间
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          操作
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {patientList.map((patient) => (
                        <tr key={patient.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {patient.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {patient.id}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              年龄: {patient.age}岁
                            </div>
                            <div className="text-sm text-gray-500">
                              {patient.weight}kg / {patient.height}cm
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(patient.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => {
                                  selectPatient(patient);
                                  setShowAssignModal(true);
                                }}
                                className="px-3 py-1 bg-blue-100 text-blue-800 rounded text-xs hover:bg-blue-200"
                              >
                                分配问卷
                              </button>
                              <button
                                onClick={() => router.push(`/doctor/patients/${patient.id}`)}
                                className="px-3 py-1 bg-gray-100 text-gray-800 rounded text-xs hover:bg-gray-200"
                              >
                                查看详情
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <svg className="w-12 h-12 mx-auto text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                  </svg>
                  <p className="text-gray-500 mb-4">暂无患者数据</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    添加第一个患者
                  </button>
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Add Patient Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">添加新患者</h3>
              <form onSubmit={handleAddPatient} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    患者ID *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientData.id}
                    onChange={(e) => setNewPatientData({...newPatientData, id: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="例如: P001"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    患者姓名 *
                  </label>
                  <input
                    type="text"
                    required
                    value={newPatientData.name}
                    onChange={(e) => setNewPatientData({...newPatientData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="患者姓名"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    年龄
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="120"
                    value={newPatientData.age}
                    onChange={(e) => setNewPatientData({...newPatientData, age: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="年龄"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      体重 (kg)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newPatientData.weight}
                      onChange={(e) => setNewPatientData({...newPatientData, weight: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="体重"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      身高 (cm)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.1"
                      value={newPatientData.height}
                      onChange={(e) => setNewPatientData({...newPatientData, height: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="身高"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    disabled={isDoctorLoading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isDoctorLoading ? '添加中...' : '添加患者'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Questionnaire Modal */}
      {showAssignModal && selectedPatient && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                为 {selectedPatient.name} 分配问卷
              </h3>
              <div className="space-y-3">
                <button
                  onClick={() => handleAssignQuestionnaire('haemqol')}
                  disabled={isDoctorLoading}
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                                      分配 GAD-7 & PHQ-9 问卷
                </button>
                <button
                  onClick={() => handleAssignQuestionnaire('hal')}
                  disabled={isDoctorLoading}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  分配 HAL 问卷
                </button>
              </div>
              <div className="flex justify-end pt-4">
                <button
                  onClick={() => {
                    setShowAssignModal(false);
                    selectPatient(null);
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
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

export default DoctorPatientsPage; 
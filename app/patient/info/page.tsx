/**
 * Patient Info Page - Basic Information Only (Permission Separated)
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
import { getCurrentUserSession, savePatientBasicInfo, getMedicalInfo } from '../../shared/utils/database';
import { Patient, MedicalInfo } from '../../shared/types/database';
import { generateRandomPatientBasicInfo } from '../../shared/utils/testUtils';

export default function PatientInfoPage() {
  const router = useRouter();
  const { currentUser, setCurrentStep } = useHalStore();
  
  // Basic patient info (editable by patient)
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    weight: '',
    height: ''
  });
  
  // Medical info (read-only for patient)
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load existing patient data
  useEffect(() => {
    const loadPatientData = async () => {
      if (!currentUser?.id) {
        router.push('/patient/login');
        return;
      }

      setIsLoading(true);
      try {
        const session = await getCurrentUserSession();
        if (!session || session.role !== 'patient') {
          router.push('/patient/login');
          return;
        }

        // Pre-fill with current user data if available
        if (currentUser) {
          setFormData({
            name: currentUser.name || '',
            age: '',
            weight: '',
            height: ''
          });
        }

        // Try to load medical info (may not be available for new patients)
        try {
          const medicalResult = await getMedicalInfo(currentUser.id);
          if (medicalResult.success && medicalResult.data) {
            setMedicalInfo(medicalResult.data);
          }
        } catch (error) {
          // Medical info not available - this is normal for new patients
          console.log('Medical info not available yet');
        }

      } catch (error) {
        console.error('Error loading patient data:', error);
        setErrors({ general: '加载患者信息失败' });
      } finally {
        setIsLoading(false);
      }
    };

    loadPatientData();
    setCurrentStep('info');
  }, [currentUser, router, setCurrentStep]);

  // Handle form input changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  // Random fill basic info (testing feature)
  const handleRandomFill = () => {
    const randomInfo = generateRandomPatientBasicInfo();
    setFormData({
      name: randomInfo.patientName || formData.name,
      age: randomInfo.age || '',
      weight: randomInfo.weight || '',
      height: randomInfo.height || ''
    });
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '请输入姓名';
    }
    
    const age = parseInt(formData.age);
    if (!formData.age || isNaN(age) || age < 1 || age > 120) {
      newErrors.age = '请输入有效的年龄 (1-120)';
    }
    
    const weight = parseFloat(formData.weight);
    if (!formData.weight || isNaN(weight) || weight < 10 || weight > 300) {
      newErrors.weight = '请输入有效的体重 (10-300 kg)';
    }
    
    const height = parseFloat(formData.height);
    if (!formData.height || isNaN(height) || height < 50 || height > 250) {
      newErrors.height = '请输入有效的身高 (50-250 cm)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    if (!currentUser?.id) return;

    setIsSaving(true);
    try {
      // Save basic patient info
      const patientData: Omit<Patient, 'created_at' | 'updated_at'> = {
        id: currentUser.id,
        name: formData.name.trim(),
        age: parseInt(formData.age),
        weight: parseFloat(formData.weight),
        height: parseFloat(formData.height),
        doctor_id: medicalInfo?.doctor_id
      };

      const result = await savePatientBasicInfo(patientData);
      
      if (result.success) {
        // Navigate to dashboard
        router.push('/patient/dashboard');
      } else {
        setErrors({ general: result.error || '保存失败，请重试' });
      }
    } catch (error) {
      console.error('Error saving patient info:', error);
      setErrors({ general: '保存患者信息时出现错误，请重试' });
    } finally {
      setIsSaving(false);
    }
  };

  // Skip to dashboard (for existing patients who don't want to update info)
  const handleSkipToDashboard = () => {
    router.push('/patient/dashboard');
  };

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <h1 className="text-xl font-semibold text-gray-900">
              HAL血友病生活质量评估系统
            </h1>
            <span className="text-gray-600">
              {currentUser?.name}
            </span>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Message */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            个人信息确认
          </h2>
          <p className="text-gray-600">
            请确认或更新您的基础信息，医疗相关信息将由医生填写。完成后即可开始填写问卷。
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Basic Info Form */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-semibold text-gray-900">基础信息</h3>
                <button
                  type="button"
                  onClick={handleRandomFill}
                  className="text-sm px-3 py-1 text-blue-600 border border-blue-600 rounded hover:bg-blue-50 transition-colors"
                >
                  随机填充 (测试)
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                      姓名 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.name ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入您的姓名"
                    />
                    {errors.name && (
                      <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                      年龄 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleChange}
                      min="1"
                      max="120"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.age ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入年龄"
                    />
                    {errors.age && (
                      <p className="mt-1 text-sm text-red-500">{errors.age}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                      体重 (kg) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleChange}
                      min="10"
                      max="300"
                      step="0.1"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.weight ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入体重"
                    />
                    {errors.weight && (
                      <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
                      身高 (cm) <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleChange}
                      min="50"
                      max="250"
                      step="0.1"
                      className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                        errors.height ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="请输入身高"
                    />
                    {errors.height && (
                      <p className="mt-1 text-sm text-red-500">{errors.height}</p>
                    )}
                  </div>
                </div>

                {errors.general && (
                  <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                    {errors.general}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-4 pt-4">
                  <button
                    type="button"
                    onClick={handleSkipToDashboard}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                  >
                    跳过，进入任务中心
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? '保存中...' : '保存并继续'}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Medical Info (Read-only) */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">医疗信息</h3>
              {medicalInfo ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">评估日期</label>
                    <p className="text-gray-900">{new Date(medicalInfo.evaluation_date).toLocaleDateString()}</p>
                  </div>
                  {medicalInfo.next_follow_up && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">下次随访</label>
                      <p className="text-gray-900">{new Date(medicalInfo.next_follow_up).toLocaleDateString()}</p>
                    </div>
                  )}
                  <div className="text-sm text-gray-500 bg-gray-50 p-3 rounded">
                    <p>治疗相关信息由您的主治医生填写和管理。</p>
                  </div>
                </div>
              ) : (
                <div className="text-gray-500 text-center py-8">
                  <svg className="w-12 h-12 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p>医疗信息将由医生填写</p>
                  <p className="text-sm mt-2">包括治疗频率、剂量等信息</p>
                </div>
              )}
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 rounded-xl p-6 mt-6">
              <h4 className="text-blue-900 font-medium mb-2">填写说明</h4>
              <ul className="text-blue-800 text-sm space-y-1">
                <li>• 基础信息可以随时更新</li>
                <li>• 医疗信息由医生管理</li>
                <li>• 完成信息确认后开始问卷</li>
                <li>• 问卷进度会自动保存</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
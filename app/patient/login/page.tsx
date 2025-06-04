/**
 * Patient Login Page with ID Verification
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useHalStore } from '../../shared/store';
import { checkPatientExists, setUserSession } from '../../shared/utils/database';

export default function PatientLogin() {
  const router = useRouter();
  const { setUserRole, setCurrentUser, setIsAuthenticated } = useHalStore();
  
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'id' | 'name'>('id'); // Two-step process

  // Handle patient ID verification
  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId.trim()) {
      setError('请输入患者ID');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Check if patient exists in database
      const result = await checkPatientExists(patientId.trim());
      
      if (result.success) {
        if (result.data) {
          // Patient exists - proceed to name verification
          setName(result.data.name); // Pre-fill the name
          setStep('name');
        } else {
          // Patient doesn't exist - proceed to name input for new registration
          setStep('name');
        }
      } else {
        setError(result.error || '验证失败，请重试');
      }
    } catch (error) {
      console.error('Patient ID verification error:', error);
      setError('系统错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle name verification and login
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('请输入您的姓名');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      // Check patient again to get latest data
      const result = await checkPatientExists(patientId.trim());
      
      if (result.success && result.data) {
        // Existing patient - verify name matches
        if (result.data.name.toLowerCase() === name.trim().toLowerCase()) {
          // Name matches - proceed with login
          await handleSuccessfulLogin(result.data.id, result.data.name, true);
        } else {
          setError('姓名与记录不符，请检查输入');
        }
      } else {
        // New patient - create session and proceed to info page
        await handleSuccessfulLogin(patientId.trim(), name.trim(), false);
      }
    } catch (error) {
      console.error('Patient login error:', error);
      setError('登录失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful login
  const handleSuccessfulLogin = async (id: string, userName: string, isExistingPatient: boolean) => {
    try {
      // Clear previous user's data to ensure data isolation
      const { clearAllData } = useHalStore.getState();
      await clearAllData();
      
      // Set user session
      await setUserSession({
        user_id: id,
        role: 'patient',
        name: userName,
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });

      // Update Zustand store
      setUserRole('patient');
      setCurrentUser({
        id: id,
        name: userName,
        role: 'patient'
      });
      setIsAuthenticated(true);

      // Navigate based on patient status
      if (isExistingPatient) {
        // Existing patient - go to dashboard
        router.push('/patient/dashboard');
      } else {
        // New patient - go to info page to fill basic information
        router.push('/patient/info');
      }
    } catch (error) {
      console.error('Error setting up user session:', error);
      setError('登录过程中出现错误，请重试');
    }
  };

  // Go back to ID input
  const handleBackToId = () => {
    setStep('id');
    setName('');
    setError('');
  };

  // Go back to home
  const handleBackToHome = () => {
    router.push('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">患者端登录</h1>
          <p className="text-gray-600">
            {step === 'id' ? '请输入您的患者ID' : '请验证您的姓名'}
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${step === 'id' ? 'bg-green-500' : 'bg-green-300'}`}></div>
            <div className="w-8 h-0.5 bg-gray-200"></div>
            <div className={`w-3 h-3 rounded-full ${step === 'name' ? 'bg-green-500' : 'bg-gray-200'}`}></div>
          </div>
        </div>

        {/* ID Input Form */}
        {step === 'id' && (
          <form onSubmit={handleIdSubmit} className="space-y-6">
            <div>
              <label htmlFor="patientId" className="block text-sm font-medium text-gray-700 mb-2">
                患者ID *
              </label>
              <input
                type="text"
                id="patientId"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="请输入您的患者ID"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBackToHome}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                返回首页
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '验证中...' : '下一步'}
              </button>
            </div>
          </form>
        )}

        {/* Name Verification Form */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                患者姓名 *
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="请输入您的姓名"
                required
                autoFocus
              />
              <p className="text-sm text-gray-500 mt-1">
                ID: {patientId}
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <div className="flex space-x-3">
              <button
                type="button"
                onClick={handleBackToId}
                className="flex-1 py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                返回上一步
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? '验证中...' : '登录'}
              </button>
            </div>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            首次使用？系统会引导您填写基本信息
          </p>
        </div>
      </div>
    </div>
  );
} 
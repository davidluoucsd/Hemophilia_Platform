/**
 * Patient Login Page with ID Verification
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
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
import { patientLogin } from '../../shared/utils/patient-sync';
import { useTranslation } from '../../shared/hooks/useTranslation';
import PageWrapper from '../../shared/components/PageWrapper';

export default function PatientLogin() {
  const router = useRouter();
  const { setUserRole, setCurrentUser, setIsAuthenticated } = useHalStore();
  const { t } = useTranslation();
  
  const [patientId, setPatientId] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'id' | 'name'>('id'); // Two-step process

  // Handle patient ID verification
  const handleIdSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!patientId.trim()) {
      setError(t('auth.pleaseEnterPatientId'));
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
          setError(result.error || t('auth.verificationFailed'));
        }
      } catch (error) {
        console.error('Patient ID verification error:', error);
        setError(t('auth.systemError'));
      } finally {
      setIsLoading(false);
    }
  };

  // Handle name verification and login
  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError(t('auth.pleaseEnterName'));
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
          setError(t('auth.nameNotMatch'));
        }
      } else {
        // New patient - create session and proceed to info page
        await handleSuccessfulLogin(patientId.trim(), name.trim(), false);
      }
    } catch (error) {
      console.error('Patient login error:', error);
      setError(t('auth.loginFailed'));
    } finally {
      setIsLoading(false);
    }
  };

  // Handle successful login
  const handleSuccessfulLogin = async (id: string, userName: string, shouldCheckExisting: boolean = true) => {
    try {
      // Clear previous user's data to ensure data isolation
      const { clearAllData } = useHalStore.getState();
      await clearAllData();
      
      // Use enhanced patient login that creates database record immediately
      const loginResult = await patientLogin(id, userName);
      
      if (!loginResult.success) {
        setError(t('auth.loginFailed'));
        return;
      }

      // Update Zustand store
      setUserRole('patient');
      setCurrentUser({
        id: id,
        name: userName,
        role: 'patient'
      });
      setIsAuthenticated(true);

      // Navigate based on patient status
      if (shouldCheckExisting && loginResult.patient && !loginResult.isNewPatient) {
        // Existing patient with complete data - go to dashboard
        router.push('/patient/dashboard');
      } else {
        // New patient or incomplete data - go to info page to fill/update basic information
        router.push('/patient/info');
      }
    } catch (error) {
      console.error('Error setting up user session:', error);
      setError(t('auth.loginProcessError'));
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
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('auth.patientLogin')}</h1>
          <p className="text-gray-600">
            {step === 'id' ? t('auth.enterPatientId') : t('auth.verifyName')}
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
                {t('auth.patientIdRequired')}
              </label>
              <input
                type="text"
                id="patientId"
                value={patientId}
                onChange={(e) => setPatientId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('auth.enterPatientIdPlaceholder')}
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
                {t('auth.backToHome')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? t('auth.verifying') : t('auth.nextStep')}
              </button>
            </div>
          </form>
        )}

        {/* Name Verification Form */}
        {step === 'name' && (
          <form onSubmit={handleNameSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                {t('auth.patientNameRequired')}
              </label>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder={t('auth.enterNamePlaceholder')}
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
                {t('auth.backToPrevious')}
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? t('auth.verifying') : t('auth.login')}
              </button>
            </div>
          </form>
        )}

        {/* Help Text */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500">
            {t('auth.firstTimeHelp')}
          </p>
        </div>
        </div>
      </div>
    </PageWrapper>
  );
} 
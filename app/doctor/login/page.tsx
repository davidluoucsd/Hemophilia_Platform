/**
 * HAL问卷系统 - 医生端登录页面
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
import { setUserSession } from '../../shared/utils/database';
import { useTranslation } from '../../shared/hooks/useTranslation';
import PageWrapper from '../../shared/components/PageWrapper';

const DoctorLoginPage: React.FC = () => {
  const router = useRouter();
  const { login } = useHalStore();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState({
    doctorName: '',
    password: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // 表单输入变更处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    // 清除对应字段的错误
    if (errors[name]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };
  
  // 表单提交处理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证表单
    const newErrors: Record<string, string> = {};
    
    if (!formData.doctorName.trim()) {
      newErrors.doctorName = t('auth.pleaseEnterDoctorName');
    }
    
    if (!formData.password.trim()) {
      newErrors.password = t('auth.pleaseEnterPassword');
    }
    
    // 如果有错误，显示错误并阻止提交
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    setIsLoading(true);
    
    try {
      // 简单密码验证
      const correctPassword = 'hemophilia2025';
      
      if (formData.password !== correctPassword) {
        setErrors({ password: t('auth.passwordIncorrect') });
        return;
      }
      
      // 模拟登录验证
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 创建医生用户信息
      const doctorUser = {
        id: `doctor_${Date.now()}`,
        name: formData.doctorName,
        role: 'doctor'
      };
      
      // 设置用户session
      await setUserSession({
        user_id: doctorUser.id,
        role: 'doctor',
        name: doctorUser.name,
        login_time: new Date().toISOString(),
        last_activity: new Date().toISOString()
      });
      
      // 设置登录状态
      login('doctor', doctorUser);
      
      // 跳转到医生端Dashboard
      router.push('/doctor/dashboard');
      
    } catch (error) {
      console.error('医生登录失败:', error);
      setErrors({ submit: t('auth.doctorLoginFailed') });
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <PageWrapper>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
        {/* 返回首页按钮 */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/')}
            className="flex items-center text-gray-600 hover:text-gray-800 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('auth.backToHome')}
          </button>
        </div>
        
        {/* 登录卡片 */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <div className="text-blue-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-2">{t('auth.doctorLogin')}</h1>
            <p className="text-gray-600">{t('auth.doctorLoginDescription')}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="mb-6">
              <label htmlFor="doctorName" className="block mb-2 text-sm font-medium text-gray-700">
                {t('auth.doctorNameRequired')}
              </label>
              <input
                type="text"
                id="doctorName"
                name="doctorName"
                value={formData.doctorName}
                onChange={handleChange}
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${errors.doctorName ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={t('auth.enterDoctorName')}
              />
              {errors.doctorName && (
                <p className="mt-1 text-sm text-red-500">{errors.doctorName}</p>
              )}
            </div>
            
            <div className="mb-6">
              <label htmlFor="password" className="block mb-2 text-sm font-medium text-gray-700">
                {t('auth.passwordRequired')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10 ${errors.password ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder={t('auth.enterPassword')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>
            
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {errors.submit}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors disabled:bg-blue-300"
            >
              {isLoading ? t('auth.loginInProgress') : t('auth.login')}
            </button>
          </form>
          
          <div className="mt-6 text-center text-sm text-gray-500">
            <p>{t('auth.defaultPassword')}</p>
            <p className="mt-1">{t('auth.changePasswordNote')}</p>
          </div>
        </div>
        
        {/* 版权信息 */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>{t('app.copyright')}</p>
        </div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default DoctorLoginPage; 
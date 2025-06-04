/**
 * HAL问卷系统 - 首页（双端选择界面）
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useHalStore } from './shared/store';

const HomePage: React.FC = () => {
  const router = useRouter();

  // 处理医生端登录
  const handleDoctorLogin = () => {
    // 清除之前的数据
    const { clearAllData } = useHalStore.getState();
    clearAllData();
    router.push('/doctor/login');
  };

  // 处理患者端登录
  const handlePatientLogin = () => {
    // 清除之前的数据
    const { clearAllData } = useHalStore.getState();
    clearAllData();
    router.push('/patient/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-2xl text-center">
        {/* 系统标题 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            HAL血友病生活质量评估系统
          </h1>
          <p className="text-lg text-gray-600">
            Haemophilia Activities List (HAL) Questionnaire System
          </p>
        </div>

        {/* 系统简介 */}
        <div className="mb-12 p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-semibold text-gray-800 mb-3">系统简介</h2>
          <p className="text-gray-600 leading-relaxed">
            本系统用于评估血友病患者的生活质量，包含HAL问卷和HAEMO-QoL-A问卷两个部分。
            医生可以管理患者数据和查看评估结果，患者可以独立完成问卷填写。
          </p>
        </div>

        {/* 双端选择按钮 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {/* 医生端按钮 */}
          <button
            onClick={handleDoctorLogin}
            className="group p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-blue-200"
          >
            <div className="text-blue-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">医生端登录</h3>
            <p className="text-gray-600">
              管理患者数据、查看评估结果、生成报告
            </p>
          </button>

          {/* 患者端按钮 */}
          <button
            onClick={handlePatientLogin}
            className="group p-8 bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 border-2 border-transparent hover:border-green-200"
          >
            <div className="text-green-600 mb-4">
              <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-gray-800 mb-2">患者端登录</h3>
            <p className="text-gray-600">
              填写问卷、查看个人评估历史
            </p>
          </button>
        </div>

        {/* 版权信息 */}
        <div className="text-center text-sm text-gray-500">
          <p>Copyright © 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
          <p className="mt-1">未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

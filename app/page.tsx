/**
 * HAL问卷系统 - 首页（患者信息页面）
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
import { useHalStore } from './store';
import ProgressIndicator from './components/ProgressIndicator';

const HomePage: React.FC = () => {
  const router = useRouter();
  const { patientInfo, setPatientInfo, loadData, setCurrentStep } = useHalStore();
  
  const [formData, setFormData] = useState({
    patientName: '',
    age: '',
    weight: '',
    height: '',
    treatmentTimes: '',
    treatmentDose: '',
    evaluationDate: new Date().toISOString().split('T')[0],
    nextDate: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // 加载已保存的数据
  useEffect(() => {
    async function loadSavedData() {
      setIsLoading(true);
      try {
        await loadData();
        if (patientInfo) {
          setFormData({
            patientName: patientInfo.patientName || '',
            age: patientInfo.age || '',
            weight: patientInfo.weight || '',
            height: patientInfo.height || '',
            treatmentTimes: patientInfo.treatmentTimes || '',
            treatmentDose: patientInfo.treatmentDose || '',
            evaluationDate: patientInfo.evaluationDate || new Date().toISOString().split('T')[0],
            nextDate: patientInfo.nextDate || ''
          });
        }
        
        // 设置当前步骤为信息页
        setCurrentStep('info');
      } finally {
        setIsLoading(false);
      }
    }
    
    loadSavedData();
  }, [patientInfo, loadData, setCurrentStep]);
  
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
    
    if (!formData.patientName.trim()) {
      newErrors.patientName = '请输入患者姓名';
    }
    
    if (!formData.age || isNaN(Number(formData.age))) {
      newErrors.age = '请输入有效的年龄';
    }
    
    if (!formData.weight || isNaN(Number(formData.weight))) {
      newErrors.weight = '请输入有效的体重';
    }
    
    if (!formData.height || isNaN(Number(formData.height))) {
      newErrors.height = '请输入有效的身高';
    }
    
    if (!formData.treatmentTimes || isNaN(Number(formData.treatmentTimes))) {
      newErrors.treatmentTimes = '请输入有效的治疗次数';
    }
    
    if (!formData.treatmentDose || isNaN(Number(formData.treatmentDose))) {
      newErrors.treatmentDose = '请输入有效的治疗剂量';
    }
    
    if (!formData.evaluationDate) {
      newErrors.evaluationDate = '请选择评估日期';
    }
    
    if (!formData.nextDate) {
      newErrors.nextDate = '请选择下次随访日期';
    }
    
    // 如果有错误，显示错误并阻止提交
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    
    // 保存患者信息
    setIsLoading(true);
    try {
      // 调用保存方法，但不等待其完成
      setPatientInfo(formData);
      
      // 立即导航到HAEMO-QoL-A问卷页面
      router.push('/haemqol');
    } catch (error) {
      console.error('保存患者信息失败:', error);
      setErrors({ submit: '保存患者信息失败，请重试' });
      setIsLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex flex-col items-center p-4">
      <div className="w-full max-w-3xl">
        <ProgressIndicator currentStep={1} totalSteps={4} />
        
        <div className="mt-6 p-6 bg-white rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-center mb-6">患者基本信息</h1>
          
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label htmlFor="patientName" className="block mb-2 text-sm font-medium text-gray-700">
                  患者姓名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="patientName"
                  name="patientName"
                  value={formData.patientName}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.patientName ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入患者姓名"
                />
                {errors.patientName && (
                  <p className="mt-1 text-sm text-red-500">{errors.patientName}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="age" className="block mb-2 text-sm font-medium text-gray-700">
                  年龄 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="age"
                  name="age"
                  value={formData.age}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.age ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入年龄"
                />
                {errors.age && (
                  <p className="mt-1 text-sm text-red-500">{errors.age}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="weight" className="block mb-2 text-sm font-medium text-gray-700">
                  体重 (kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="weight"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.weight ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入体重"
                />
                {errors.weight && (
                  <p className="mt-1 text-sm text-red-500">{errors.weight}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="height" className="block mb-2 text-sm font-medium text-gray-700">
                  身高 (cm) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="height"
                  name="height"
                  value={formData.height}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.height ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入身高"
                />
                {errors.height && (
                  <p className="mt-1 text-sm text-red-500">{errors.height}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="treatmentTimes" className="block mb-2 text-sm font-medium text-gray-700">
                  每周治疗次数 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="treatmentTimes"
                  name="treatmentTimes"
                  value={formData.treatmentTimes}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.treatmentTimes ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入每周治疗次数"
                />
                {errors.treatmentTimes && (
                  <p className="mt-1 text-sm text-red-500">{errors.treatmentTimes}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="treatmentDose" className="block mb-2 text-sm font-medium text-gray-700">
                  治疗剂量 (IU/kg) <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  id="treatmentDose"
                  name="treatmentDose"
                  value={formData.treatmentDose}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.treatmentDose ? 'border-red-500' : 'border-gray-300'}`}
                  placeholder="请输入治疗剂量"
                />
                {errors.treatmentDose && (
                  <p className="mt-1 text-sm text-red-500">{errors.treatmentDose}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="evaluationDate" className="block mb-2 text-sm font-medium text-gray-700">
                  评估日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="evaluationDate"
                  name="evaluationDate"
                  value={formData.evaluationDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.evaluationDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.evaluationDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.evaluationDate}</p>
                )}
              </div>
              
              <div>
                <label htmlFor="nextDate" className="block mb-2 text-sm font-medium text-gray-700">
                  下次随访日期 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  id="nextDate"
                  name="nextDate"
                  value={formData.nextDate}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md ${errors.nextDate ? 'border-red-500' : 'border-gray-300'}`}
                />
                {errors.nextDate && (
                  <p className="mt-1 text-sm text-red-500">{errors.nextDate}</p>
                )}
              </div>
            </div>
            
            {errors.submit && (
              <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-md">
                {errors.submit}
              </div>
            )}
            
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors disabled:bg-blue-300"
              >
                {isLoading ? '保存中...' : '下一步'}
              </button>
            </div>
          </form>
        </div>
        
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Copyright © 2024 罗骏哲（Junzhe Luo）. 版权所有.</p>
        </div>
      </div>
    </div>
  );
};

export default HomePage;

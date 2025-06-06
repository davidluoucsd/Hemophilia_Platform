'use client';

import React from 'react';
import { useTranslation } from '../shared/hooks/useTranslation';
import LanguageSwitcher from '../shared/components/LanguageSwitcher';

export default function DemoPage() {
  const { t, locale } = useTranslation();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      {/* 语言切换器 */}
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('app.title')} - Demo
        </h1>
        <LanguageSwitcher />
      </div>

      {/* 演示内容 */}
      <div className="max-w-4xl mx-auto space-y-8">
        {/* 基本信息卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('common.language')}: {locale === 'zh' ? '中文' : 'English'}
          </h2>
          <p className="text-gray-600 mb-4">
            {t('app.subtitle')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">{t('navigation.dashboard')}</h3>
              <p className="text-sm text-gray-600">{t('patient.dashboard')}</p>
            </div>
            <div className="space-y-2">
              <h3 className="font-medium text-gray-800">{t('navigation.questionnaires')}</h3>
              <p className="text-sm text-gray-600">{t('patient.questionnaires')}</p>
            </div>
          </div>
        </div>

        {/* 问卷信息卡片 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('navigation.questionnaires')}
          </h2>
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-medium text-gray-800">{t('questionnaire.hal.title')}</h3>
              <p className="text-sm text-gray-600">{t('questionnaire.hal.description')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('questionnaire.hal.instructions')}</p>
            </div>
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-medium text-gray-800">{t('questionnaire.haemqol.title')}</h3>
              <p className="text-sm text-gray-600">{t('questionnaire.haemqol.description')}</p>
              <p className="text-xs text-gray-500 mt-1">{t('questionnaire.haemqol.instructions')}</p>
            </div>
          </div>
        </div>

        {/* 按钮演示 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('common.actions')}
          </h2>
          <div className="flex flex-wrap gap-3">
            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              {t('questionnaire.startQuestionnaire')}
            </button>
            <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
              {t('common.save')}
            </button>
            <button className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700">
              {t('common.cancel')}
            </button>
            <button className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
              {t('common.delete')}
            </button>
          </div>
        </div>

        {/* 表单演示 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('patient.personalInfo')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patient.name')}
              </label>
              <input 
                type="text" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('patient.name')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patient.age')}
              </label>
              <input 
                type="number" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('patient.age')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patient.gender')}
              </label>
              <select className="w-full px-3 py-2 border border-gray-300 rounded-md">
                <option value="">{t('patient.gender')}</option>
                <option value="male">{t('patient.male')}</option>
                <option value="female">{t('patient.female')}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('patient.phone')}
              </label>
              <input 
                type="tel" 
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder={t('patient.phone')}
              />
            </div>
          </div>
        </div>

        {/* 状态演示 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {t('tasks.status')}
          </h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-md">
              <span className="text-green-800">{t('questionnaire.completed')}</span>
              <span className="text-sm text-green-600">{t('tasks.completed')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-md">
              <span className="text-yellow-800">{t('questionnaire.progress')}</span>
              <span className="text-sm text-yellow-600">{t('tasks.pending')}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
              <span className="text-gray-800">{t('questionnaire.incomplete')}</span>
              <span className="text-sm text-gray-600">{t('tasks.assigned')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 
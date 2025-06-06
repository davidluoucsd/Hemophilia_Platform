'use client';

import { useLanguageStore } from '../store/language';
import { Locale } from '../../../i18n';

export function useTranslation() {
  const { locale, setLocale, t, messages } = useLanguageStore();

  return {
    locale,
    setLocale,
    t,
    messages,
    // 一些便捷的翻译方法
    formatMessage: (key: string, values?: Record<string, string | number>) => {
      return t(key, values);
    },
    // 获取当前语言信息
    getCurrentLanguage: () => {
      return locale === 'zh' ? { code: 'zh', name: '中文', nativeName: '中文' } 
                              : { code: 'en', name: 'English', nativeName: 'English' };
    },
    // 检查是否为中文
    isZh: () => locale === 'zh',
    // 检查是否为英文
    isEn: () => locale === 'en'
  };
}

// 用于在非组件中使用翻译的函数
export function getTranslation() {
  return useLanguageStore.getState().t;
} 
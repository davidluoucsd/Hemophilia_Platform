'use client';

import { useEffect, useState } from 'react';
import { useLanguageStore, initializeLanguage } from '../store/language';

interface LanguageProviderProps {
  children: React.ReactNode;
}

export default function LanguageProvider({ children }: LanguageProviderProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const initialize = async () => {
      try {
        await initializeLanguage();
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize language:', error);
        setIsInitialized(true); // 即使失败也要继续渲染
      }
    };

    initialize();
  }, []);

  // 显示加载状态，直到语言初始化完成
  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
} 
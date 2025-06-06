'use client';

import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  showLanguageSwitcher?: boolean;
  languageSwitcherPosition?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

export default function PageWrapper({ 
  children, 
  className = '',
  showLanguageSwitcher = true,
  languageSwitcherPosition = 'top-right'
}: PageWrapperProps) {
  const getPositionClasses = () => {
    switch (languageSwitcherPosition) {
      case 'top-left':
        return 'absolute top-4 left-4';
      case 'bottom-right':
        return 'absolute bottom-4 right-4';
      case 'bottom-left':
        return 'absolute bottom-4 left-4';
      default: // top-right
        return 'absolute top-4 right-4';
    }
  };

  return (
    <div className={`relative ${className}`}>
      {showLanguageSwitcher && (
        <div className={`${getPositionClasses()} z-50`}>
          <LanguageSwitcher />
        </div>
      )}
      {children}
    </div>
  );
} 
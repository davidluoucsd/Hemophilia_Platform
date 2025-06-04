/**
 * HAL问卷系统 - 进度指示器组件
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import React from 'react';

interface ProgressIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  orientation?: 'horizontal' | 'vertical';
}

const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({ 
  currentStep, 
  totalSteps,
  labels = [], 
  orientation = 'horizontal'
}) => {
  // 计算进度条宽度百分比
  const progressWidth = `${(currentStep - 1) / (totalSteps - 1) * 100}%`;
  
  // 生成步骤数组
  const steps = Array.from({ length: totalSteps }, (_, i) => i + 1);
  
  return (
    <div className={`
      progress-wrapper relative 
      ${orientation === 'vertical' ? 'flex-col h-auto' : ''}
      my-8 mx-auto w-full max-w-3xl
    `}>
      <div className={`
        progress-indicator relative 
        ${orientation === 'vertical' ? 'flex-col h-auto pl-4' : 'flex-row'}
      `}>
        {/* 背景线 */}
        <div className={`
          progress-line absolute 
          ${orientation === 'vertical' 
            ? 'w-0.5 h-full left-4 top-0' 
            : 'h-0.5 w-full top-1/2 left-0 -translate-y-1/2'}
          bg-gray-200
        `}></div>
        
        {/* 进度条 */}
        <div 
          className={`
            progress-bar absolute bg-blue-500 z-10
            ${orientation === 'vertical' 
              ? 'w-0.5 left-4 top-0' 
              : 'h-0.5 top-1/2 left-0 -translate-y-1/2'}
          `}
          style={{ 
            [orientation === 'vertical' ? 'height' : 'width']: progressWidth 
          }}
        ></div>
        
        {/* 步骤圆点 */}
        {steps.map((step) => {
          const isActive = step === currentStep;
          const isCompleted = step < currentStep;
          
          return (
            <div 
              key={step}
              className={`
                progress-step relative
                ${orientation === 'vertical' ? 'mb-10' : ''}
                ${isActive ? 'active' : ''}
                ${isCompleted ? 'completed' : ''}
              `}
            >
              {/* 步骤圆点内容 */}
              {isCompleted ? (
                // 已完成步骤显示对勾图标
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                // 当前或未完成步骤显示步骤数字
                <span>{step}</span>
              )}
              
              {/* 步骤标签，如果提供 */}
              {labels && labels[step - 1] && (
                <span 
                  className={`
                    step-label whitespace-nowrap select-none
                    ${orientation === 'vertical' 
                      ? 'ml-8 -mt-0.5' 
                      : 'mt-8'}
                    ${isActive ? 'text-blue-600 font-medium' : 'text-gray-500'}
                    ${isCompleted ? 'text-green-600' : ''}
                  `}
                >
                  {labels[step - 1]}
                </span>
              )}
            </div>
          );
        })}
      </div>
      
      {/* 针对小屏幕的标签自适应显示 */}
      <div className="md:hidden mt-10 flex justify-between w-full">
        {labels && labels.length > 0 && orientation === 'horizontal' && currentStep && (
          <div className="text-center w-full">
            <div className="text-sm text-gray-500">当前步骤</div>
            <div className="font-medium text-blue-600">{labels[currentStep - 1]}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressIndicator; 
/**
 * 问题组件
 */

import React from 'react';
import { AnswerValue } from '../types';

interface QuestionProps {
  id: string;
  number: number;
  title: string;
  value: AnswerValue;
  onChange: (id: string, value: AnswerValue) => void;
  highlight?: boolean;
}

const ANSWER_OPTIONS = [
  { value: '1', label: '不可能完成', description: '完全无法完成此活动' },
  { value: '2', label: '能完成但总是有困难', description: '每次都有困难但能完成' },
  { value: '3', label: '大部分时间有困难', description: '大多数时候有困难' },
  { value: '4', label: '有时有困难', description: '有时会有困难' },
  { value: '5', label: '很少有困难', description: '偶尔有轻微困难' },
  { value: '6', label: '从来没有困难', description: '完全没有困难' },
  { value: '8', label: '不适用', description: '此项不适用于我的情况' }
];

// 根据答案值获取颜色
const getColorForValue = (value: string): string => {
  switch (value) {
    case '1': return 'bg-red-100 border-red-400 text-red-800';
    case '2': return 'bg-orange-100 border-orange-400 text-orange-800';
    case '3': return 'bg-yellow-100 border-yellow-400 text-yellow-800';
    case '4': return 'bg-blue-100 border-blue-400 text-blue-800';
    case '5': return 'bg-green-100 border-green-400 text-green-800';
    case '6': return 'bg-green-200 border-green-600 text-green-900';
    case '8': return 'bg-gray-100 border-gray-400 text-gray-800';
    default: return 'bg-white border-gray-300 text-gray-700';
  }
};

const Question: React.FC<QuestionProps> = ({
  id,
  number,
  title,
  value,
  onChange,
  highlight = false
}) => {
  return (
    <div 
      id={`question-${number}`}
      className={`question-block ${highlight ? 'highlight border-red-500 shadow-md' : 'shadow-sm'}`}
    >
      <div className="question-header flex items-center mb-3">
        <span className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-full mr-3 text-sm font-bold">
          {number}
        </span>
        <h3 className="question-title font-medium text-gray-800 flex-grow">
          {title}
        </h3>
      </div>
      
      <div className="radio-group grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
        {ANSWER_OPTIONS.map((option) => (
          <label 
            key={`${id}-${option.value}`}
            className={`
              flex items-center p-3 rounded border cursor-pointer transition-all
              ${value === option.value 
                ? `${getColorForValue(option.value)} shadow-sm` 
                : 'border-gray-200 hover:bg-gray-50'}
            `}
          >
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(id, option.value as AnswerValue)}
              className="text-blue-600 focus:ring-blue-500 h-4 w-4"
            />
            <div className="ml-2">
              <div className="font-medium">{option.label}</div>
              <div className="text-xs mt-0.5 text-gray-600">{option.description}</div>
            </div>
          </label>
        ))}
      </div>
      
      {highlight && (
        <div className="mt-2 text-sm text-red-600">
          请为此问题选择一个答案
        </div>
      )}
    </div>
  );
};

export default Question; 
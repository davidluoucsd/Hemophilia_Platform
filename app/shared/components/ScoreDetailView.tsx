/**
 * Score Detail View Component
 * 
 * Displays detailed questionnaire scores with domain/part breakdowns
 */

'use client';

import React, { useState } from 'react';
import { generateScoreAnalysis } from '../utils/score-analysis';

interface ScoreDetailViewProps {
  response: {
    id: string;
    questionnaire_type: 'hal' | 'haemqol';
    answers: any;
    total_score?: number;
    completed_at?: string;
    created_at: string;
  };
}

const ScoreDetailView: React.FC<ScoreDetailViewProps> = ({ response }) => {
  const [showAnswers, setShowAnswers] = useState(false);

  // Parse answers
  const answers = typeof response.answers === 'string' 
    ? JSON.parse(response.answers) 
    : response.answers;

  // Generate detailed analysis
  const analysis = generateScoreAnalysis(response.questionnaire_type, answers);

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-6 bg-white">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-lg font-semibold text-gray-900">
            {response.questionnaire_type === 'haemqol' ? 'HAEMO-QoL-A 生存质量量表' : 'HAL 血友病活动列表'}
          </h4>
          <p className="text-sm text-gray-500">
            完成时间: {formatDate(response.completed_at || response.created_at)}
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">
            {analysis.totalScore}
          </div>
          <div className="text-sm text-gray-500">
            总分 (满分: {analysis.maxScore})
          </div>
        </div>
      </div>

      {/* Score Breakdown */}
      {response.questionnaire_type === 'haemqol' && 'parts' in analysis && analysis.parts && (
        <div className="mb-6">
          <h5 className="text-md font-medium text-gray-900 mb-3">分部详细得分</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.parts.map((part: any) => (
              <div key={part.key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{part.name}</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {part.score}/{part.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${part.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {part.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {response.questionnaire_type === 'hal' && 'domains' in analysis && analysis.domains && (
        <div className="mb-6">
          <h5 className="text-md font-medium text-gray-900 mb-3">功能域详细得分</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {analysis.domains.map((domain: any) => (
              <div key={domain.key} className="bg-gray-50 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{domain.name}</span>
                  <span className="text-lg font-semibold text-blue-600">
                    {domain.score}/{domain.total}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all"
                    style={{ width: `${domain.percentage}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {domain.percentage.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>

          {/* Special HAL Metrics */}
          {'specialScores' in analysis && analysis.specialScores && (
            <div className="bg-blue-50 rounded-lg p-4">
              <h6 className="text-sm font-medium text-blue-900 mb-3">特殊指标</h6>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">上肢活动:</span>
                  <span className="font-semibold ml-2">{analysis.specialScores.upperLimbActivity}</span>
                </div>
                <div>
                  <span className="text-blue-700">基础下肢:</span>
                  <span className="font-semibold ml-2">{analysis.specialScores.basicLowerLimb}</span>
                </div>
                <div>
                  <span className="text-blue-700">复杂下肢:</span>
                  <span className="font-semibold ml-2">{analysis.specialScores.complexLowerLimb}</span>
                </div>
                <div>
                  <span className="text-blue-700">国标总分:</span>
                  <span className="font-semibold ml-2">{analysis.specialScores.nationalStandardTotal}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Toggle Answer Details */}
      <div className="border-t pt-4">
        <button
          onClick={() => setShowAnswers(!showAnswers)}
          className="flex items-center text-sm text-blue-600 hover:text-blue-800"
        >
          <svg 
            className={`w-4 h-4 mr-2 transition-transform ${showAnswers ? 'rotate-90' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          {showAnswers ? '隐藏' : '查看'}详细答案
        </button>

        {showAnswers && (
          <div className="mt-4 bg-gray-50 rounded-lg p-4">
            <h6 className="text-sm font-medium text-gray-900 mb-3">详细答案</h6>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
              {Object.entries(answers).map(([questionId, answer]) => (
                <div key={questionId} className="flex justify-between py-1">
                  <span className="text-gray-600">{questionId.replace('q', '题').replace('hq', '题')}:</span>
                  <span className="font-medium text-gray-900">{String(answer)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Score Interpretation */}
      <div className="mt-4 bg-yellow-50 rounded-lg p-4">
        <h6 className="text-sm font-medium text-yellow-800 mb-2">分数解读</h6>
        <p className="text-sm text-yellow-700">
          {response.questionnaire_type === 'haemqol' ? (
            <>分数越高表示生活质量越好。满分为 {analysis.maxScore} 分，当前得分 {analysis.totalScore} 分 ({((analysis.totalScore / analysis.maxScore) * 100).toFixed(1)}%)。</>
          ) : (
            <>分数越低表示活动受限程度越轻。满分为 {analysis.maxScore} 分，当前得分 {analysis.totalScore} 分，表示活动受限程度为 {((analysis.totalScore / analysis.maxScore) * 100).toFixed(1)}%。</>
          )}
        </p>
      </div>
    </div>
  );
};

export default ScoreDetailView; 
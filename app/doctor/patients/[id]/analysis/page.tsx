/**
 * Patient Analysis Page - Comprehensive Questionnaire Analysis
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useHalStore } from '../../../../shared/store';
import { 
  getPatientInfo,
  getMedicalInfo,
  getPatientQuestionnaireHistory
} from '../../../../shared/utils/database';
import { Patient, MedicalInfo, Response } from '../../../../shared/types/database';
import { 
  generateScoreAnalysis,
  generateDetailedCSVHeaders,
  generatePatientCSVRow
} from '../../../../shared/utils/score-analysis';

interface ChartData {
  date: string;
  hal_total?: number;
  haemqol_total?: number;
  [key: string]: any;
}

const PatientAnalysisPage: React.FC = () => {
  const router = useRouter();
  const params = useParams();
  const patientId = params.id as string;

  const { currentUser } = useHalStore();

  const [patient, setPatient] = useState<Patient | null>(null);
  const [medicalInfo, setMedicalInfo] = useState<MedicalInfo | null>(null);
  const [responses, setResponses] = useState<Response[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'overview' | 'trends' | 'comparison' | 'export'>('overview');

  // Load patient data
  useEffect(() => {
    const loadData = async () => {
      if (!currentUser || currentUser.role !== 'doctor') {
        router.push('/doctor/login');
        return;
      }

      if (!patientId) {
        setError('患者ID无效');
        return;
      }

      setIsLoading(true);
      try {
        // Load patient basic info
        const patientResult = await getPatientInfo(patientId);
        if (patientResult.success && patientResult.data) {
          setPatient(patientResult.data);
        } else {
          setError('未找到患者信息');
          return;
        }

        // Load medical info
        const medicalResult = await getMedicalInfo(patientId);
        if (medicalResult.success && medicalResult.data) {
          setMedicalInfo(medicalResult.data);
        }

        // Load questionnaire responses
        const responsesResult = await getPatientQuestionnaireHistory(patientId);
        if (responsesResult.success && responsesResult.data) {
          setResponses(responsesResult.data);
        }

      } catch (error) {
        console.error('Error loading patient data:', error);
        setError('加载患者数据时出现错误');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [patientId, currentUser, router]);

  // Generate trend chart data
  const generateTrendData = (): ChartData[] => {
    const trendData: ChartData[] = [];
    
    responses.forEach(response => {
      if (!response.completed_at) return; // Skip if no completion date
      const dateStr = new Date(response.completed_at).toLocaleDateString('zh-CN');
      
      if (response.questionnaire_type === 'hal') {
        const analysis = generateScoreAnalysis('hal', response.answers);
        trendData.push({
          date: dateStr,
          hal_total: analysis.totalScore,
          questionnaire: 'HAL'
        });
      } else if (response.questionnaire_type === 'haemqol') {
        const analysis = generateScoreAnalysis('haemqol', response.answers);
        trendData.push({
          date: dateStr,
          haemqol_total: analysis.totalScore,
          questionnaire: 'HAEMO-QoL-A'
        });
      }
    });

    return trendData.sort((a, b) => {
      const dateA = new Date(a.date.split('/').reverse().join('-'));
      const dateB = new Date(b.date.split('/').reverse().join('-'));
      return dateA.getTime() - dateB.getTime();
    });
  };

  // Export comprehensive patient report
  const exportComprehensiveReport = () => {
    if (!patient) return;

    const csvData = [];
    
    // Headers
    const headers = generateDetailedCSVHeaders();
    csvData.push(headers.join(','));

    // For each response, generate a detailed row
    const row = generatePatientCSVRow(patient, medicalInfo, responses);
    csvData.push(row.join(','));

    const csvContent = csvData.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${patient.name}_comprehensive_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Generate individual patient report
  const generatePatientReport = () => {
    if (!patient || responses.length === 0) return;

    const latestResponse = responses[0];
    if (!latestResponse.completed_at) return;
    const completedDate = new Date(latestResponse.completed_at).toLocaleDateString('zh-CN');
    
    let reportContent = `
# ${patient.name} 患者评估报告

## 基本信息
- 姓名：${patient.name}
- 年龄：${patient.age} 岁
- 体重：${patient.weight} kg
- 身高：${patient.height} cm

## 医疗信息
`;

    if (medicalInfo) {
      const evalDate = medicalInfo.evaluation_date ? 
        new Date(medicalInfo.evaluation_date).toLocaleDateString('zh-CN') : '无';
      const followDate = medicalInfo.next_follow_up ? 
        new Date(medicalInfo.next_follow_up).toLocaleDateString('zh-CN') : '无';
        
      reportContent += `
- 诊断信息：${medicalInfo.diagnosis_info || '无'}
- 治疗频率：${medicalInfo.treatment_frequency} 次/周
- 治疗剂量：${medicalInfo.treatment_dose} IU/kg
- 评估日期：${evalDate}
- 下次随访：${followDate}
`;
    }

    reportContent += `

## 问卷评估结果

### 最新评估（${completedDate}）
`;

    const analysis = generateScoreAnalysis(latestResponse.questionnaire_type, latestResponse.answers);

    if (latestResponse.questionnaire_type === 'hal') {
      reportContent += `
**HAL血友病活动列表评估**
- 总分：${analysis.totalScore.toFixed(1)}分

**各维度得分：**
`;
      if (analysis.domains) {
        analysis.domains.forEach((domain) => {
          reportContent += `- ${domain.name}：${domain.score.toFixed(1)}分\n`;
        });
      }

    } else if (latestResponse.questionnaire_type === 'haemqol') {
      reportContent += `
**HAEMO-QoL-A生存质量评估**
- 总分：${analysis.totalScore.toFixed(1)}分

**各维度得分：**
`;
      if (analysis.parts) {
        analysis.parts.forEach((part) => {
          reportContent += `- ${part.name}：${part.score.toFixed(1)}分\n`;
        });
      }
    }

    if (responses.length > 1) {
      const firstResponse = responses[responses.length - 1];
      const lastResponse = responses[0];
      if (!firstResponse.completed_at || !lastResponse.completed_at) return;
      const firstDate = new Date(firstResponse.completed_at).toLocaleDateString('zh-CN');
      const lastDate = new Date(lastResponse.completed_at).toLocaleDateString('zh-CN');
      
      reportContent += `

### 历史趋势分析
- 评估次数：${responses.length}次
- 首次评估：${firstDate}
- 最新评估：${lastDate}

**改善建议：**
1. 根据评估结果调整治疗方案
2. 关注得分较低的维度，制定针对性改善计划
3. 定期随访，监测治疗效果
4. 鼓励患者积极参与康复活动
`;
    }

    // Download as text file
    const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8;' });
    const link = document.createElement('a');
    
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `${patient.name}_评估报告_${new Date().toISOString().split('T')[0]}.txt`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-4 flex justify-center items-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4">正在加载分析数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    );
  }

  const trendData = generateTrendData();
  const latestResponse = responses[0];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {patient?.name} - 详细分析
            </h1>
            <p className="text-gray-600">问卷结果综合分析和趋势对比</p>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => router.back()}
              className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              返回
            </button>
            <button
              onClick={generatePatientReport}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              生成报告
            </button>
          </div>
        </div>
      </div>

      {/* Navigation tabs */}
      <div className="mb-8">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { key: 'overview', label: '总览' },
              { key: 'trends', label: '趋势分析' },
              { key: 'comparison', label: '结果对比' },
              { key: 'export', label: '数据导出' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveView(tab.key as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeView === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Overview Tab */}
      {activeView === 'overview' && (
        <div className="space-y-6">
          {/* Patient Summary */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">患者概况</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">评估次数</p>
                <p className="text-2xl font-bold text-blue-600">{responses.length}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">最新问卷</p>
                <p className="text-lg font-semibold text-green-600">
                  {latestResponse ? latestResponse.questionnaire_type.toUpperCase() : '无'}
                </p>
              </div>
              <div className="bg-purple-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">最新评分</p>
                <p className="text-2xl font-bold text-purple-600">
                  {latestResponse ? latestResponse.total_score?.toFixed(1) || '计算中' : '无'}
                </p>
              </div>
              <div className="bg-orange-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">下次随访</p>
                <p className="text-sm font-medium text-orange-600">
                  {medicalInfo?.next_follow_up ? 
                    new Date(medicalInfo.next_follow_up).toLocaleDateString('zh-CN') : '待安排'}
                </p>
              </div>
            </div>
          </div>

          {/* Latest Assessment Details */}
          {latestResponse && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4">最新评估详情</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">完成时间</p>
                  <p className="font-medium">
                    {latestResponse.completed_at ? 
                      new Date(latestResponse.completed_at).toLocaleString('zh-CN') : 
                      '未完成'
                    }
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">问卷类型</p>
                  <p className="font-medium">{latestResponse.questionnaire_type === 'hal' ? 'HAL血友病活动列表' : 'HAEMO-QoL-A生存质量评估'}</p>
                </div>
                {latestResponse.total_score && (
                  <div>
                    <p className="text-sm text-gray-600">总分</p>
                    <p className="text-2xl font-bold text-blue-600">{latestResponse.total_score.toFixed(1)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Trends Tab */}
      {activeView === 'trends' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">评分趋势</h2>
            {trendData.length > 0 ? (
              <div className="space-y-4">
                {trendData.map((data, index) => (
                  <div key={index} className="border-l-4 border-blue-500 pl-4">
                    <p className="text-sm text-gray-600">{data.date}</p>
                    <p className="font-medium">{data.questionnaire}</p>
                    <p className="text-lg font-bold text-blue-600">
                      {data.hal_total?.toFixed(1) || data.haemqol_total?.toFixed(1)} 分
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">暂无评估数据</p>
            )}
          </div>
        </div>
      )}

      {/* Comparison Tab */}
      {activeView === 'comparison' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">多次评估对比</h2>
            {responses.length > 1 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        评估日期
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        问卷类型
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        总分
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {responses.map((response, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {response.completed_at ? 
                            new Date(response.completed_at).toLocaleDateString('zh-CN') : 
                            '未完成'
                          }
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {response.questionnaire_type === 'hal' ? 'HAL' : 'HAEMO-QoL-A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                          {response.total_score?.toFixed(1) || '计算中'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">需要至少2次评估才能进行对比分析</p>
            )}
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeView === 'export' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">数据导出</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">综合数据报告</h3>
                  <p className="text-sm text-gray-600">包含患者基本信息、医疗数据和所有评估结果的CSV文件</p>
                </div>
                <button
                  onClick={exportComprehensiveReport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  导出CSV
                </button>
              </div>
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h3 className="font-medium">个体评估报告</h3>
                  <p className="text-sm text-gray-600">详细的患者评估报告，包含分析和建议</p>
                </div>
                <button
                  onClick={generatePatientReport}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                >
                  生成报告
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAnalysisPage; 
/**
 * HAL问卷系统 - 状态管理
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { PatientInfo, HalAnswers, AssessmentResult, PatientRecord } from '../types';
import { loadPatientInfo, loadAnswers, savePatientInfo, saveAnswer, saveAnswers, clearSessionData } from '../utils/db';
import { calculateAllScores, determineAgeGroup } from '../utils/scoring';

// 应用启动时清除之前的数据
if (typeof window !== 'undefined') {
  // 检查是否是刷新页面
  const now = new Date().getTime();
  const lastVisit = localStorage.getItem('hal-last-visit');
  
  // 如果是新会话或者超过30分钟，清除数据
  if (!lastVisit || (now - parseInt(lastVisit)) > 30 * 60 * 1000) {
    localStorage.removeItem('hal-questionnaire-storage');
    sessionStorage.removeItem('hal-questionnaire-storage');
    clearSessionData();
  }
  
  // 更新最后访问时间
  localStorage.setItem('hal-last-visit', now.toString());
  
  // 注册页面关闭事件，清除数据
  window.addEventListener('beforeunload', () => {
    // 在页面关闭时删除存储的数据
    localStorage.removeItem('hal-questionnaire-storage');
    sessionStorage.removeItem('hal-questionnaire-storage');
  });
}

interface HalState {
  // 患者信息
  patientInfo: PatientInfo | null;
  setPatientInfo: (info: PatientInfo) => void;
  
  // 问卷答案
  answers: HalAnswers;
  setAnswer: (questionId: string, value: string) => void;
  setAnswers: (answers: HalAnswers) => void;
  
  // 评估结果
  assessmentResult: AssessmentResult | null;
  calculateResults: () => void;
  
  // 患者记录列表（累加的记录）
  patientRecords: PatientRecord[];
  addPatientRecord: (record?: PatientRecord) => void;
  clearPatientRecords: () => void;
  getPatientRecords: () => PatientRecord[];
  
  // 状态管理
  isLoading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 工作流程
  currentStep: 'info' | 'questionnaire' | 'confirm' | 'results';
  setCurrentStep: (step: 'info' | 'questionnaire' | 'confirm' | 'results') => void;
  
  // 数据操作
  clearData: () => void;
  loadData: () => Promise<void>;
}

export const useHalStore = create<HalState>()(
  persist(
    (set, get) => ({
      // 初始状态
      patientInfo: null,
      answers: {},
      assessmentResult: null,
      patientRecords: [],
      isLoading: false,
      error: null,
      currentStep: 'info',
      
      // 患者信息操作
      setPatientInfo: async (info) => {
        try {
          set({ isLoading: true, error: null });
          // 自动添加年龄段
          const updatedInfo = { 
            ...info, 
            ageGroup: determineAgeGroup(info.age) 
          };
          await savePatientInfo(updatedInfo);
          set({ patientInfo: updatedInfo, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '保存患者信息时出错',
            isLoading: false
          });
        }
      },
      
      // 问卷答案操作
      setAnswer: async (questionId, value) => {
        try {
          set({ isLoading: true, error: null });
          const currentAnswers = get().answers;
          const updatedAnswers = { ...currentAnswers, [questionId]: value };
          await saveAnswer(questionId as any, value as any);
          set({ answers: updatedAnswers, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '保存答案时出错',
            isLoading: false 
          });
        }
      },
      
      setAnswers: async (answers) => {
        try {
          set({ isLoading: true, error: null });
          await saveAnswers(answers);
          set({ answers, isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '保存答案时出错',
            isLoading: false 
          });
        }
      },
      
      // 计算结果
      calculateResults: () => {
        const { answers } = get();
        const results = calculateAllScores(answers);
        set({ assessmentResult: results });
      },
      
      // 患者记录管理函数
      addPatientRecord: (record) => {
        const { patientInfo, answers, assessmentResult } = get();
        
        // 如果提供了特定记录，使用该记录；否则使用当前状态创建新记录
        const newRecord: PatientRecord = record || {
          patientInfo: patientInfo!,
          answers: answers,
          assessmentResult: assessmentResult!,
          timestamp: new Date().toISOString()
        };
        
        // 添加到记录列表中
        const currentRecords = get().patientRecords;
        set({ patientRecords: [...currentRecords, newRecord] });
      },
      
      getPatientRecords: () => {
        return get().patientRecords;
      },
      
      clearPatientRecords: () => {
        set({ patientRecords: [] });
      },
      
      // 状态控制
      setLoading: (isLoading) => set({ isLoading }),
      setError: (error) => set({ error }),
      
      // 步骤控制
      setCurrentStep: (step) => set({ currentStep: step }),
      
      // 数据操作
      clearData: async () => {
        try {
          set({ isLoading: true, error: null });
          await clearSessionData();
          set({
            patientInfo: null,
            answers: {},
            assessmentResult: null,
            currentStep: 'info',
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '清除数据时出错',
            isLoading: false
          });
        }
      },
      
      loadData: async () => {
        try {
          set({ isLoading: true, error: null });
          const patientInfo = await loadPatientInfo();
          const answers = await loadAnswers();
          
          set({
            patientInfo: patientInfo || null,
            answers: answers || {},
            isLoading: false
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : '加载数据时出错',
            isLoading: false
          });
        }
      }
    }),
    {
      name: 'hal-questionnaire-storage',
      storage: createJSONStorage(() => localStorage),
      // 不要持久化以下状态
      partialize: (state) => ({
        patientInfo: state.patientInfo,
        answers: state.answers,
        assessmentResult: state.assessmentResult,
        patientRecords: state.patientRecords,
        currentStep: state.currentStep
      }),
    }
  )
); 
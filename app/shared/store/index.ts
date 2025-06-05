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
import { PatientInfo, HalAnswers, HaemqolAnswers, AssessmentResult, PatientRecord, HaemqolScores } from '../types';
import { 
  loadPatientInfo, 
  loadAnswers, 
  savePatientInfo, 
  saveAnswer, 
  saveAnswers, 
  clearSessionData, 
  loadHaemqolAnswers, 
  saveHaemqolAnswer, 
  saveHaemqolAnswers,
  saveUserSpecificPatientInfo,
  loadUserSpecificPatientInfo,
  saveUserSpecificAnswers,
  loadUserSpecificAnswers,
  saveUserSpecificHaemqolAnswers,
  loadUserSpecificHaemqolAnswers,
  clearUserSpecificData,
  getDoctorDashboardStats,
  getAllPatients,
  createNewPatient,
  searchPatients,
  getPatientTasks,
  assignQuestionnaire
} from '../utils/database';
import { DoctorDashboardData, Patient, Task } from '../types/database';
import { calculateAllScores, determineAgeGroup } from '../utils/scoring';
import { calculateHaemqolScores } from '../../patient/haemqol/scoring';

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

// 用户类型
export type UserRole = 'doctor' | 'patient' | null;

// 当前用户信息
export interface CurrentUser {
  id: string;
  name: string;
  role: string;
}

interface HalState {
  // 身份验证状态
  userRole: UserRole;
  currentUser: CurrentUser | null;
  isAuthenticated: boolean;
  setUserRole: (role: UserRole) => void;
  setCurrentUser: (user: CurrentUser | null) => void;
  setAuthenticated: (authenticated: boolean) => void;
  setIsAuthenticated: (authenticated: boolean) => void;
  login: (role: UserRole, user: CurrentUser) => void;
  logout: () => void;
  
  // 患者信息
  patientInfo: PatientInfo | null;
  setPatientInfo: (info: PatientInfo) => void;
  
  // HAL问卷答案
  answers: HalAnswers;
  setAnswer: (questionId: string, value: string) => void;
  setAnswers: (answers: HalAnswers) => void;
  
  // HAEMO-QoL-A问卷答案
  haemqolAnswers: HaemqolAnswers;
  setHaemqolAnswer: (questionId: string, value: string) => void;
  setHaemqolAnswers: (answers: HaemqolAnswers) => void;
  
  // 评估结果
  assessmentResult: AssessmentResult | null;
  calculateResults: () => void;
  
  // 患者记录列表（累加的记录）
  patientRecords: PatientRecord[];
  addPatientRecord: (record?: PatientRecord) => void;
  clearPatientRecords: () => void;
  getPatientRecords: () => PatientRecord[];
  
  // Doctor-specific state for Stage 3
  doctorDashboardData: DoctorDashboardData | null;
  patientList: Patient[];
  selectedPatient: Patient | null;
  isDoctorLoading: boolean;
  doctorError: string | null;
  
  // Doctor operations
  loadDoctorDashboard: () => Promise<void>;
  loadPatientList: () => Promise<void>;
  searchPatientList: (query: string) => Promise<void>;
  createPatient: (patientData: Omit<Patient, 'created_at' | 'updated_at'>) => Promise<boolean>;
  selectPatient: (patient: Patient | null) => void;
  assignQuestionnaireToPatient: (patientId: string, questionnaireType: 'haemqol' | 'hal', options?: any) => Promise<boolean>;
  refreshDoctorData: () => Promise<void>;
  setDoctorLoading: (loading: boolean) => void;
  setDoctorError: (error: string | null) => void;
  
  // 状态管理
  isLoading: boolean;
  error: string | null;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  
  // 工作流程
  currentStep: 'info' | 'haemqol' | 'questionnaire' | 'confirm' | 'results';
  setCurrentStep: (step: 'info' | 'haemqol' | 'questionnaire' | 'confirm' | 'results') => void;
  
  // 数据操作
  clearData: () => void;
  clearAllData: () => void;
  loadData: () => Promise<void>;
}

export const useHalStore = create<HalState>()(
  persist(
    (set, get) => ({
      // 初始状态
      userRole: null,
      currentUser: null,
      isAuthenticated: false,
      patientInfo: null,
      answers: {},
      haemqolAnswers: {},
      assessmentResult: null,
      patientRecords: [],
      isLoading: false,
      error: null,
      currentStep: 'info',
      
      // Doctor-specific initial state
      doctorDashboardData: null,
      patientList: [],
      selectedPatient: null,
      isDoctorLoading: false,
      doctorError: null,
      
      // 身份验证操作
      setUserRole: (role) => set({ userRole: role }),
      setCurrentUser: (user) => set({ currentUser: user }),
      setAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      setIsAuthenticated: (authenticated) => set({ isAuthenticated: authenticated }),
      
      login: async (role, user) => {
        // Clear any existing data from previous user first
        const currentUser = get().currentUser;
        if (currentUser && currentUser.id !== user.id) {
          console.log('Switching users, clearing previous data...');
          // Clear state
          set({
            patientInfo: null,
            answers: {},
            haemqolAnswers: {},
            assessmentResult: null,
            currentStep: 'info'
          });
        }
        
        // Set new user login state
        set({ 
          userRole: role, 
          currentUser: user, 
          isAuthenticated: true 
        });
        
        // Load new user's data
        try {
          await get().loadData();
        } catch (error) {
          console.error('Error loading user data after login:', error);
        }
      },
      
      logout: () => {
        // Clear all user data including questionnaire answers
        const currentUser = get().currentUser;
        
        set({ 
          userRole: null, 
          currentUser: null, 
          isAuthenticated: false,
          patientInfo: null,
          answers: {},
          haemqolAnswers: {},
          assessmentResult: null,
          currentStep: 'info'
        });
        
        // Clear user-specific data
        if (currentUser?.id) {
          clearUserSpecificData(currentUser.id).catch(error => {
            console.error('Error clearing user-specific data on logout:', error);
          });
        }
        
        // Also clear session storage
        if (typeof window !== 'undefined') {
          clearSessionData().catch(error => {
            console.error('Error clearing session data on logout:', error);
          });
        }
      },
      
      // Doctor-specific operations for Stage 3
      loadDoctorDashboard: async () => {
        const currentUser = get().currentUser;
        if (!currentUser || currentUser.role !== 'doctor') {
          set({ doctorError: 'Access denied: Doctor role required' });
          return;
        }

        try {
          set({ isDoctorLoading: true, doctorError: null });
          const result = await getDoctorDashboardStats(currentUser.id);
          
          if (result.success && result.data) {
            set({ doctorDashboardData: result.data, isDoctorLoading: false });
          } else {
            set({ doctorError: result.error || 'Failed to load dashboard', isDoctorLoading: false });
          }
        } catch (error) {
          set({ 
            doctorError: error instanceof Error ? error.message : 'Failed to load dashboard',
            isDoctorLoading: false 
          });
        }
      },

      loadPatientList: async () => {
        const currentUser = get().currentUser;
        if (!currentUser || currentUser.role !== 'doctor') {
          set({ doctorError: 'Access denied: Doctor role required' });
          return;
        }

        try {
          set({ isDoctorLoading: true, doctorError: null });
          const result = await getAllPatients();
          
          if (result.success && result.data) {
            set({ patientList: result.data, isDoctorLoading: false });
          } else {
            set({ doctorError: result.error || 'Failed to load patients', isDoctorLoading: false });
          }
        } catch (error) {
          set({ 
            doctorError: error instanceof Error ? error.message : 'Failed to load patients',
            isDoctorLoading: false 
          });
        }
      },

      searchPatientList: async (query: string) => {
        const currentUser = get().currentUser;
        if (!currentUser || currentUser.role !== 'doctor') {
          set({ doctorError: 'Access denied: Doctor role required' });
          return;
        }

        try {
          set({ isDoctorLoading: true, doctorError: null });
          
          if (!query.trim()) {
            // If empty query, load all patients
            await get().loadPatientList();
            return;
          }

          const result = await searchPatients(query);
          
          if (result.success && result.data) {
            set({ patientList: result.data, isDoctorLoading: false });
          } else {
            set({ doctorError: result.error || 'Failed to search patients', isDoctorLoading: false });
          }
        } catch (error) {
          set({ 
            doctorError: error instanceof Error ? error.message : 'Failed to search patients',
            isDoctorLoading: false 
          });
        }
      },

      createPatient: async (patientData) => {
        const currentUser = get().currentUser;
        if (!currentUser || currentUser.role !== 'doctor') {
          set({ doctorError: 'Access denied: Doctor role required' });
          return false;
        }

        try {
          set({ isDoctorLoading: true, doctorError: null });
          const result = await createNewPatient(patientData);
          
          if (result.success) {
            // Refresh patient list
            await get().loadPatientList();
            set({ isDoctorLoading: false });
            return true;
          } else {
            set({ doctorError: result.error || 'Failed to create patient', isDoctorLoading: false });
            return false;
          }
        } catch (error) {
          set({ 
            doctorError: error instanceof Error ? error.message : 'Failed to create patient',
            isDoctorLoading: false 
          });
          return false;
        }
      },

      selectPatient: (patient) => {
        set({ selectedPatient: patient });
      },

      assignQuestionnaireToPatient: async (patientId, questionnaireType, options) => {
        const currentUser = get().currentUser;
        if (!currentUser || currentUser.role !== 'doctor') {
          set({ doctorError: 'Access denied: Doctor role required' });
          return false;
        }

        try {
          set({ isDoctorLoading: true, doctorError: null });
          const result = await assignQuestionnaire(patientId, questionnaireType, options);
          
          if (result.success) {
            // Refresh dashboard data
            await get().loadDoctorDashboard();
            set({ isDoctorLoading: false });
            return true;
          } else {
            let errorMessage = result.error || 'Failed to assign questionnaire';
            
            // Handle specific database constraint errors
            if (errorMessage.includes('unique') || errorMessage.includes('constraint')) {
              errorMessage = '数据库约束错误 - 可能需要清理旧数据。请联系技术支持或尝试重新初始化数据库。';
            }
            
            set({ doctorError: errorMessage, isDoctorLoading: false });
            return false;
          }
        } catch (error) {
          let errorMessage = error instanceof Error ? error.message : 'Failed to assign questionnaire';
          
          // Handle specific database constraint errors
          if (errorMessage.includes('unique') || errorMessage.includes('constraint') || 
              errorMessage.includes('user_type') || errorMessage.includes('uniqueness requirements')) {
            errorMessage = '数据库唯一性约束错误 - 请运行数据库修复脚本: 在控制台输入 fixDatabaseSchema()';
          }
          
          set({ 
            doctorError: errorMessage,
            isDoctorLoading: false 
          });
          return false;
        }
      },

      refreshDoctorData: async () => {
        await Promise.all([
          get().loadDoctorDashboard(),
          get().loadPatientList()
        ]);
      },

      setDoctorLoading: (loading) => set({ isDoctorLoading: loading }),
      setDoctorError: (error) => set({ doctorError: error }),
      
      // 患者信息操作
      setPatientInfo: async (info) => {
        try {
          set({ isLoading: true, error: null });
          // 自动添加年龄段
          const updatedInfo = { 
            ...info, 
            ageGroup: determineAgeGroup(info.age) 
          };
          
          // 先更新状态，再保存到存储
          set({ patientInfo: updatedInfo });
          
          // 使用用户特定存储
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            await saveUserSpecificPatientInfo(updatedInfo, currentUser.id);
          } else {
            // 回退到原有存储方式
            await savePatientInfo(updatedInfo);
          }
          
              set({ isLoading: false });
        } catch (error) {
          set({ 
            error: error instanceof Error ? error.message : '保存患者信息时出错',
            isLoading: false
          });
        }
      },
      
      // HAL问卷答案操作
      setAnswer: async (questionId, value) => {
        try {
          const currentAnswers = get().answers;
          const updatedAnswers = { ...currentAnswers, [questionId]: value };
          
          // 立即更新状态
          set({ answers: updatedAnswers });
          
          // 异步保存到数据库
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            await saveUserSpecificAnswers(updatedAnswers, currentUser.id);
          } else {
          await saveAnswer(questionId as any, value as any);
          }
        } catch (error) {
          console.error('保存答案时出错:', error);
        }
      },
      
      setAnswers: async (answers) => {
        try {
          set({ answers });
          
          // 异步保存到数据库
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            await saveUserSpecificAnswers(answers, currentUser.id);
          } else {
          await saveAnswers(answers);
          }
        } catch (error) {
          console.error('保存答案时出错:', error);
        }
      },
      
      // HAEMO-QoL-A问卷答案操作
      setHaemqolAnswer: async (questionId, value) => {
        try {
          const currentAnswers = get().haemqolAnswers;
          const updatedAnswers = { ...currentAnswers, [questionId]: value };
          
          // 立即更新状态
          set({ haemqolAnswers: updatedAnswers });
          
          // 异步保存到数据库
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            await saveUserSpecificHaemqolAnswers(updatedAnswers, currentUser.id);
          } else {
          await saveHaemqolAnswer(questionId as any, value as any);
          }
        } catch (error) {
          console.error('保存HAEMO-QoL-A答案时出错:', error);
        }
      },
      
      setHaemqolAnswers: async (haemqolAnswers) => {
        try {
          set({ haemqolAnswers });
          
          // 异步保存到数据库
          const currentUser = get().currentUser;
          if (currentUser?.id) {
            await saveUserSpecificHaemqolAnswers(haemqolAnswers, currentUser.id);
          } else {
          await saveHaemqolAnswers(haemqolAnswers);
          }
        } catch (error) {
          console.error('保存HAEMO-QoL-A答案时出错:', error);
        }
      },
      
      // 计算结果
      calculateResults: () => {
        const { answers, haemqolAnswers } = get();
        
        // 计算HAL问卷结果
        const halResults = calculateAllScores(answers);
        
        // 计算HAEMO-QoL-A问卷结果
        const haemqolScores = calculateHaemqolScores(haemqolAnswers);
        
        // 综合评估结果
        const completeResults: AssessmentResult = {
          ...halResults,
          haemqolScores
        };
        
        set({ assessmentResult: completeResults });
      },
      
      // 患者记录管理函数
      addPatientRecord: (record) => {
        const { patientInfo, answers, haemqolAnswers, assessmentResult } = get();
        
        // 如果提供了特定记录，使用该记录；否则使用当前状态创建新记录
        const newRecord: PatientRecord = record || {
          patientInfo: patientInfo!,
          answers: answers,
          haemqolAnswers: haemqolAnswers,
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
            haemqolAnswers: {},
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
      
      clearAllData: () => {
        set({
          patientInfo: null,
          answers: {},
          haemqolAnswers: {},
          assessmentResult: null,
          currentStep: 'info',
          isLoading: false
        });
      },
      
      loadData: async () => {
        try {
          set({ isLoading: true, error: null });
          
          const currentUser = get().currentUser;
          const currentAnswers = get().answers;
          const currentHaemqolAnswers = get().haemqolAnswers;
          
          console.log('🔄 Loading data for user:', currentUser?.id, 'Current HAL answers:', Object.keys(currentAnswers).length);
          
          if (currentUser?.id) {
            // Load user-specific data
            const patientInfo = await loadUserSpecificPatientInfo(currentUser.id);
            const answers = await loadUserSpecificAnswers(currentUser.id);
            const haemqolAnswers = await loadUserSpecificHaemqolAnswers(currentUser.id);
            
            console.log('📥 Loaded from storage - HAL:', Object.keys(answers || {}).length, 'HAEMO-QoL-A:', Object.keys(haemqolAnswers || {}).length);
            
            // Prevent data loss - only update if we have data or current data is empty
            const shouldUpdateHAL = Object.keys(answers || {}).length > 0 || Object.keys(currentAnswers).length === 0;
            const shouldUpdateHaemqol = Object.keys(haemqolAnswers || {}).length > 0 || Object.keys(currentHaemqolAnswers).length === 0;
            
            if (!shouldUpdateHAL && Object.keys(currentAnswers).length > 0) {
              console.log('⚠️ Preserving existing HAL answers - loaded data was empty but current data exists');
            }
            
            if (!shouldUpdateHaemqol && Object.keys(currentHaemqolAnswers).length > 0) {
              console.log('⚠️ Preserving existing HAEMO-QoL-A answers - loaded data was empty but current data exists');
            }
            
            set({
              patientInfo: patientInfo || null,
              answers: shouldUpdateHAL ? (answers || {}) : currentAnswers,
              haemqolAnswers: shouldUpdateHaemqol ? (haemqolAnswers || {}) : currentHaemqolAnswers,
              isLoading: false
            });
            
            // Double-check that data is preserved
            const finalState = get();
            console.log('✅ Final state - HAL:', Object.keys(finalState.answers).length, 'HAEMO-QoL-A:', Object.keys(finalState.haemqolAnswers).length);
            
          } else {
            // Fallback to legacy loading
            console.log('🔄 Using legacy loading (no user ID)');
            const patientInfo = await loadPatientInfo();
            const answers = await loadAnswers();
            const haemqolAnswers = await loadHaemqolAnswers();
            
            // Apply same data preservation logic for legacy loading
            const shouldUpdateHAL = Object.keys(answers || {}).length > 0 || Object.keys(currentAnswers).length === 0;
            const shouldUpdateHaemqol = Object.keys(haemqolAnswers || {}).length > 0 || Object.keys(currentHaemqolAnswers).length === 0;
            
            set({
              patientInfo: patientInfo || null,
              answers: shouldUpdateHAL ? (answers || {}) : currentAnswers,
              haemqolAnswers: shouldUpdateHaemqol ? (haemqolAnswers || {}) : currentHaemqolAnswers,
              isLoading: false
            });
          }
        } catch (error) {
          console.error('❌ Error in loadData:', error);
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
        haemqolAnswers: state.haemqolAnswers,
        assessmentResult: state.assessmentResult,
        patientRecords: state.patientRecords,
        currentStep: state.currentStep
      }),
    }
  )
); 
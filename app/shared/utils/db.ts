/**
 * HAL问卷系统 - 数据库工具
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { openDB } from 'idb';
import { PatientRecord, PatientInfo, HalAnswers, QuestionId, AnswerValue, HaemqolAnswers, HaemqolQuestionId, HaemqolAnswerValue } from '../types';

// 数据库名称和版本
const DB_NAME = 'hal-questionnaire';
const DB_VERSION = 1;

// 存储键名
const STORAGE_KEYS = {
  PATIENT_INFO: 'hal-patient-info',
  ANSWERS: 'hal-answers',
  HAEMQOL_ANSWERS: 'hal-haemqol-answers'
};

// 初始化数据库
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      // 创建患者信息存储
      if (!db.objectStoreNames.contains('patientInfo')) {
        db.createObjectStore('patientInfo');
      }
      
      // 创建问卷答案存储
      if (!db.objectStoreNames.contains('halAnswers')) {
        db.createObjectStore('halAnswers');
      }
      
      // 创建患者记录存储
      if (!db.objectStoreNames.contains('patientRecords')) {
        const store = db.createObjectStore('patientRecords', { keyPath: 'id', autoIncrement: true });
        store.createIndex('patientName', 'patientName');
        store.createIndex('evaluationDate', 'evaluationDate');
      }
    }
  });
}

/**
 * 检查是否在浏览器环境
 * @returns 是否在浏览器环境
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * 保存患者信息
 * @param info 患者信息
 */
export async function savePatientInfo(info: PatientInfo): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    // 使用非阻塞模式保存到 sessionStorage
    setTimeout(() => {
      try {
        sessionStorage.setItem(
          STORAGE_KEYS.PATIENT_INFO, 
          JSON.stringify(info)
        );
        console.log('患者信息已保存到 sessionStorage');
      } catch (storageError) {
        console.error('保存到 sessionStorage 出错:', storageError);
        // 尝试备份到 localStorage
        try {
          localStorage.setItem(
            STORAGE_KEYS.PATIENT_INFO,
            JSON.stringify(info)
          );
          console.log('患者信息已备份保存到 localStorage');
        } catch (backupError) {
          console.error('备份保存到 localStorage 也失败:', backupError);
        }
      }
    }, 0);
  } catch (error) {
    console.error('保存患者信息处理出错:', error);
    throw error;
  }
}

/**
 * 加载患者信息
 * @returns 患者信息或undefined
 */
export async function loadPatientInfo(): Promise<PatientInfo | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const infoString = sessionStorage.getItem(STORAGE_KEYS.PATIENT_INFO);
    return infoString ? JSON.parse(infoString) : undefined;
  } catch (error) {
    console.error('加载患者信息出错:', error);
    return undefined;
  }
}

/**
 * 保存单个问题答案
 * @param questionId 问题ID
 * @param value 答案值
 */
export async function saveAnswer(questionId: QuestionId, value: AnswerValue): Promise<void> {
  if (!isBrowser()) return;
  try {
    // 读取现有答案
    const answersString = sessionStorage.getItem(STORAGE_KEYS.ANSWERS) || '{}';
    const answers = JSON.parse(answersString) as HalAnswers;
    
    // 更新答案
    const updatedAnswers = {
      ...answers,
      [questionId]: value
    };
    
    // 保存更新后的答案
    sessionStorage.setItem(
      STORAGE_KEYS.ANSWERS, 
      JSON.stringify(updatedAnswers)
    );
  } catch (error) {
    console.error('保存答案出错:', error);
    throw error;
  }
}

/**
 * 保存所有问题答案
 * @param answers 所有答案
 */
export async function saveAnswers(answers: HalAnswers): Promise<void> {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEYS.ANSWERS, 
      JSON.stringify(answers)
    );
  } catch (error) {
    console.error('保存答案出错:', error);
    throw error;
  }
}

/**
 * 加载所有问题答案
 * @returns 所有答案或空对象
 */
export async function loadAnswers(): Promise<HalAnswers | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.ANSWERS);
    return answersString ? JSON.parse(answersString) : {};
  } catch (error) {
    console.error('加载答案出错:', error);
    return {};
  }
}

/**
 * 保存单个HAEMO-QoL-A问题答案
 * @param questionId 问题ID
 * @param value 答案值
 */
export async function saveHaemqolAnswer(questionId: HaemqolQuestionId, value: HaemqolAnswerValue): Promise<void> {
  if (!isBrowser()) return;
  try {
    // 读取现有答案
    const answersString = sessionStorage.getItem(STORAGE_KEYS.HAEMQOL_ANSWERS) || '{}';
    const answers = JSON.parse(answersString) as HaemqolAnswers;
    
    // 更新答案
    const updatedAnswers = {
      ...answers,
      [questionId]: value
    };
    
    // 保存更新后的答案
    sessionStorage.setItem(
      STORAGE_KEYS.HAEMQOL_ANSWERS, 
      JSON.stringify(updatedAnswers)
    );
  } catch (error) {
    console.error('保存HAEMO-QoL-A答案出错:', error);
    throw error;
  }
}

/**
 * 保存所有HAEMO-QoL-A问题答案
 * @param haemqolAnswers 所有答案
 */
export async function saveHaemqolAnswers(haemqolAnswers: HaemqolAnswers): Promise<void> {
  if (!isBrowser()) return;
  try {
    sessionStorage.setItem(
      STORAGE_KEYS.HAEMQOL_ANSWERS, 
      JSON.stringify(haemqolAnswers)
    );
  } catch (error) {
    console.error('保存HAEMO-QoL-A答案出错:', error);
    throw error;
  }
}

/**
 * 加载所有HAEMO-QoL-A问题答案
 * @returns 所有答案或空对象
 */
export async function loadHaemqolAnswers(): Promise<HaemqolAnswers | undefined> {
  if (!isBrowser()) return undefined;
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.HAEMQOL_ANSWERS);
    return answersString ? JSON.parse(answersString) : {};
  } catch (error) {
    console.error('加载HAEMO-QoL-A答案出错:', error);
    return {};
  }
}

/**
 * 清除所有会话数据
 */
export async function clearSessionData(): Promise<void> {
  if (!isBrowser()) return;
  try {
    // 只清除问卷相关数据
    sessionStorage.removeItem(STORAGE_KEYS.PATIENT_INFO);
    sessionStorage.removeItem(STORAGE_KEYS.ANSWERS);
    sessionStorage.removeItem(STORAGE_KEYS.HAEMQOL_ANSWERS);
  } catch (error) {
    console.error('清除会话数据出错:', error);
    throw error;
  }
}

// 存储患者记录（完整评估）
export async function storePatientRecord(record: PatientRecord) {
  const db = await initDB();
  return db.add('patientRecords', {
    ...record,
    timestamp: new Date().toISOString(),
  });
}

// 加载所有患者记录
export async function loadPatientRecords(): Promise<PatientRecord[]> {
  const db = await initDB();
  return db.getAll('patientRecords');
}

// 本地存储回退方案（当IndexedDB不可用时）
// 注意：这只是一个备用方案，不应该作为主要存储机制
export const localStorageFallback = {
  savePatientInfo: (data: PatientInfo) => {
    localStorage.setItem('patientInfo', JSON.stringify(data));
    return data;
  },
  
  loadPatientInfo: (): PatientInfo | undefined => {
    const data = localStorage.getItem('patientInfo');
    return data ? JSON.parse(data) : undefined;
  },
  
  saveAnswer: (questionId: QuestionId, value: AnswerValue) => {
    const answers = localStorageFallback.loadAnswers() || {};
    answers[questionId] = value;
    localStorage.setItem('halAnswers', JSON.stringify(answers));
    return answers;
  },
  
  saveAnswers: (answers: HalAnswers) => {
    localStorage.setItem('halAnswers', JSON.stringify(answers));
    return answers;
  },
  
  loadAnswers: (): HalAnswers => {
    const data = localStorage.getItem('halAnswers');
    return data ? JSON.parse(data) : {};
  },
  
  clearSessionData: () => {
    localStorage.removeItem('patientInfo');
    localStorage.removeItem('halAnswers');
  }
}; 
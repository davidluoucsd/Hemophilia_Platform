/**
 * HAL问卷系统 - 数据库工具
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { openDB } from 'idb';
import { PatientRecord, PatientInfo, HalAnswers, QuestionId, AnswerValue } from '../types';

// 数据库名称和版本
const DB_NAME = 'hal-questionnaire';
const DB_VERSION = 1;

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

// 存储患者信息
export async function savePatientInfo(data: PatientInfo) {
  const db = await initDB();
  await db.put('patientInfo', data, 'current');
  return data;
}

// 加载患者信息
export async function loadPatientInfo(): Promise<PatientInfo | undefined> {
  const db = await initDB();
  return db.get('patientInfo', 'current');
}

// 存储答案
export async function saveAnswer(questionId: QuestionId, value: AnswerValue) {
  const db = await initDB();
  const answers = await loadAnswers() || {};
  answers[questionId] = value;
  await db.put('halAnswers', answers, 'current');
  return answers;
}

// 批量存储答案
export async function saveAnswers(answers: HalAnswers) {
  const db = await initDB();
  await db.put('halAnswers', answers, 'current');
  return answers;
}

// 加载所有答案
export async function loadAnswers(): Promise<HalAnswers> {
  const db = await initDB();
  const answers = await db.get('halAnswers', 'current');
  return answers || {};
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

// 清除当前会话数据（开始新患者评估时）
export async function clearSessionData() {
  const db = await initDB();
  await db.delete('patientInfo', 'current');
  await db.delete('halAnswers', 'current');
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
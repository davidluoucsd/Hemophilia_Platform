/**
 * Enhanced Database Utilities with Permission Control
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { openDB } from 'idb';
import { 
  PatientInfo, 
  HalAnswers, 
  QuestionId, 
  AnswerValue, 
  HaemqolAnswers, 
  HaemqolQuestionId, 
  HaemqolAnswerValue,
  PatientRecord 
} from '../types';
import {
  Doctor,
  Patient,
  MedicalInfo,
  Task,
  Response,
  UserSession,
  DatabaseResult,
  PermissionCheckResult,
  PatientDashboardData,
  DoctorDashboardData,
  AuditLog
} from '../types/database';

// Database configuration
const DB_NAME = 'hal-questionnaire-v2';
const DB_VERSION = 5;

// Storage keys for session data
const STORAGE_KEYS = {
  PATIENT_INFO: 'hal-patient-info',
  ANSWERS: 'hal-answers',
  HAEMQOL_ANSWERS: 'hal-haemqol-answers',
  USER_SESSION: 'hal-user-session',
  PATIENT_CACHE: 'hal-patient-cache'
};

// Cache for frequently accessed data
const dataCache = new Map<string, { data: any; timestamp: number; ttl: number }>();

// 生成用户特定的存储键名
function getUserSpecificKey(baseKey: string, userId: string): string {
  return `${baseKey}-${userId}`;
}

/**
 * Initialize enhanced database with permission control
 */
export async function initDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion, newVersion) {
      console.log(`Upgrading database from version ${oldVersion} to ${newVersion}`);
      
      // Create doctors table
      if (!db.objectStoreNames.contains('doctors')) {
        const doctorStore = db.createObjectStore('doctors', { keyPath: 'id' });
        doctorStore.createIndex('username', 'username', { unique: true });
        doctorStore.createIndex('email', 'email', { unique: true });
      }

      // Create patients table  
      if (!db.objectStoreNames.contains('patients')) {
        const patientStore = db.createObjectStore('patients', { keyPath: 'id' });
        patientStore.createIndex('name', 'name');
        patientStore.createIndex('created_at', 'created_at');
      }

      // Create medical_info table
      if (!db.objectStoreNames.contains('medical_info')) {
        const medicalStore = db.createObjectStore('medical_info', { keyPath: 'patient_id' });
        medicalStore.createIndex('evaluation_date', 'evaluation_date');
      }

      // Create tasks table
      if (!db.objectStoreNames.contains('tasks')) {
        const taskStore = db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
        taskStore.createIndex('patient_id', 'patient_id');
        taskStore.createIndex('type', 'type');
        taskStore.createIndex('status', 'status');
      }

      // Create responses table for questionnaire answers
      if (!db.objectStoreNames.contains('responses')) {
        const responseStore = db.createObjectStore('responses', { keyPath: 'id', autoIncrement: true });
        responseStore.createIndex('task_id', 'task_id');
        responseStore.createIndex('question_id', 'question_id');
      }

      // Create user_sessions table
      if (!db.objectStoreNames.contains('user_sessions')) {
        db.createObjectStore('user_sessions', { keyPath: 'user_id' });
      }

      // Create audit_logs table
      if (!db.objectStoreNames.contains('audit_logs')) {
        const auditStore = db.createObjectStore('audit_logs', { keyPath: 'id', autoIncrement: true });
        auditStore.createIndex('user_id', 'user_id');
        auditStore.createIndex('action', 'action');
        auditStore.createIndex('timestamp', 'timestamp');
      }
      
      // NEW: Create patient_data table for user-specific patient info
      if (!db.objectStoreNames.contains('patient_data')) {
        const patientDataStore = db.createObjectStore('patient_data', { keyPath: 'user_id' });
        patientDataStore.createIndex('type', 'type');
        patientDataStore.createIndex('timestamp', 'timestamp');
      }
      
      // NEW: Create questionnaire_answers table for persistent storage
      if (!db.objectStoreNames.contains('questionnaire_answers')) {
        const answersStore = db.createObjectStore('questionnaire_answers', { keyPath: 'id', autoIncrement: true });
        answersStore.createIndex('user_id', 'user_id');
        answersStore.createIndex('type', 'type');
        answersStore.createIndex('user_type', ['user_id', 'type'], { unique: true });
        answersStore.createIndex('timestamp', 'timestamp');
      }

      // Legacy tables (keep for compatibility)
      if (!db.objectStoreNames.contains('patientInfo')) {
        db.createObjectStore('patientInfo');
      }
      
      if (!db.objectStoreNames.contains('halAnswers')) {
        db.createObjectStore('halAnswers');
      }
      
      if (!db.objectStoreNames.contains('patientRecords')) {
        const store = db.createObjectStore('patientRecords', { keyPath: 'id', autoIncrement: true });
        store.createIndex('patientName', 'patientName');
        store.createIndex('evaluationDate', 'evaluationDate');
      }
    }
  });
}

/**
 * Check if running in browser environment
 */
function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

/**
 * Get current user session
 */
export async function getCurrentUserSession(): Promise<UserSession | null> {
  if (!isBrowser()) return null;
  
  try {
    const sessionData = sessionStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (sessionData) {
      return JSON.parse(sessionData);
    }
    return null;
  } catch (error) {
    console.error('Error getting user session:', error);
    return null;
  }
}

/**
 * Set user session
 */
export async function setUserSession(session: UserSession): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
    
    // Also store in IndexedDB for persistence
    const db = await initDB();
    await db.put('user_sessions', session);
    
    // Log login action
    await logAuditAction({
      user_id: session.user_id,
      user_role: session.role,
      action: 'login',
      resource_type: 'session',
      details: { login_time: session.login_time }
    });
  } catch (error) {
    console.error('Error setting user session:', error);
  }
}

/**
 * Clear user session (logout)
 */
export async function clearUserSession(): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const session = await getCurrentUserSession();
    
    // Clear session storage
    sessionStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    
    // Clear IndexedDB session
    const db = await initDB();
    if (session) {
      await db.delete('user_sessions', session.user_id);
      
      // Log logout action
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: 'logout',
        resource_type: 'session',
        details: { logout_time: new Date().toISOString() }
      });
    }
  } catch (error) {
    console.error('Error clearing user session:', error);
  }
}

/**
 * Check patient access permissions
 */
export async function checkPatientAccess(patientId: string, requestedAction: 'read' | 'write' = 'read'): Promise<PermissionCheckResult> {
  const session = await getCurrentUserSession();
  
  if (!session) {
    return { allowed: false, reason: 'No active session', required_role: 'patient' };
  }

  if (session.role === 'doctor') {
    // Doctors can access all patient data
    return { allowed: true };
  }

  if (session.role === 'patient') {
    // Patients can only access their own data
    if (session.user_id === patientId) {
      return { allowed: true };
    } else {
      return { allowed: false, reason: 'Can only access own data', required_role: 'patient' };
    }
  }

  return { allowed: false, reason: 'Invalid role', required_role: 'patient' };
}

/**
 * Check doctor access permissions
 */
export async function checkDoctorAccess(): Promise<PermissionCheckResult> {
  const session = await getCurrentUserSession();
  
  if (!session) {
    return { allowed: false, reason: 'No active session', required_role: 'doctor' };
  }

  if (session.role === 'doctor') {
    return { allowed: true };
  }

  return { allowed: false, reason: 'Doctor role required', required_role: 'doctor' };
}

/**
 * Check if patient ID exists in database
 */
export async function checkPatientExists(patientId: string): Promise<DatabaseResult<Patient | null>> {
  try {
    const db = await initDB();
    const patient = await db.get('patients', patientId);
    
    if (patient) {
      return { success: true, data: patient, message: 'Patient found' };
    } else {
      return { success: true, data: null, message: 'Patient not found' };
    }
  } catch (error) {
    console.error('Error checking patient existence:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get patient information with permission check
 */
export async function getPatientInfo(patientId: string): Promise<DatabaseResult<Patient>> {
  const permissionCheck = await checkPatientAccess(patientId, 'read');
  if (!permissionCheck.allowed) {
    return { success: false, error: permissionCheck.reason };
  }

  try {
    // Check cache first
    const cacheKey = `patient_${patientId}`;
    const cached = getCachedData(cacheKey);
    if (cached) {
      return { success: true, data: cached };
    }

    const db = await initDB();
    const patient = await db.get('patients', patientId);
    
    if (patient) {
      // Cache the result
      setCachedData(cacheKey, patient, 300000); // 5 minutes TTL
      
      // Log access
      const session = await getCurrentUserSession();
      if (session) {
        await logAuditAction({
          user_id: session.user_id,
          user_role: session.role,
          action: 'read',
          resource_type: 'patient',
          resource_id: patientId
        });
      }
      
      return { success: true, data: patient };
    } else {
      return { success: false, error: 'Patient not found' };
    }
  } catch (error) {
    console.error('Error getting patient info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create or update patient basic information
 */
export async function savePatientBasicInfo(patient: Omit<Patient, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Patient>> {
  const permissionCheck = await checkPatientAccess(patient.id, 'write');
  if (!permissionCheck.allowed) {
    return { success: false, error: permissionCheck.reason };
  }

  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // Check if patient exists
    const existingPatient = await db.get('patients', patient.id);
    
    const patientData: Patient = {
      ...patient,
      created_at: existingPatient?.created_at || now,
      updated_at: now
    };

    await db.put('patients', patientData);
    
    // Clear cache
    clearCachedData(`patient_${patient.id}`);
    
    // Log action
    const session = await getCurrentUserSession();
    if (session) {
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: existingPatient ? 'update' : 'create',
        resource_type: 'patient',
        resource_id: patient.id,
        details: { updated_fields: Object.keys(patient) }
      });
    }
    
    // Also save to session storage for backward compatibility
    const legacyPatientInfo: PatientInfo = {
      patientName: patient.name,
      age: patient.age.toString(),
      weight: patient.weight.toString(),
      height: patient.height.toString(),
      treatmentTimes: '0',
      treatmentDose: '0',
      evaluationDate: '',
      nextDate: ''
    };
    
    sessionStorage.setItem(STORAGE_KEYS.PATIENT_INFO, JSON.stringify(legacyPatientInfo));
    
    return { success: true, data: patientData };
  } catch (error) {
    console.error('Error saving patient info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get medical information (doctor-only access)
 */
export async function getMedicalInfo(patientId: string): Promise<DatabaseResult<MedicalInfo | null>> {
  const permissionCheck = await checkDoctorAccess();
  if (!permissionCheck.allowed) {
    return { success: false, error: 'Doctor access required for medical information' };
  }

  try {
    const db = await initDB();
    const medicalInfoList = await db.getAllFromIndex('medical_info', 'patient_id', patientId);
    
    // Get the latest medical info
    const latestMedicalInfo = medicalInfoList.sort((a, b) => 
      new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    )[0] || null;
    
    return { success: true, data: latestMedicalInfo };
  } catch (error) {
    console.error('Error getting medical info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Save medical information (doctor-only)
 */
export async function saveMedicalInfo(medicalInfo: Omit<MedicalInfo, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<MedicalInfo>> {
  const permissionCheck = await checkDoctorAccess();
  if (!permissionCheck.allowed) {
    return { success: false, error: 'Doctor access required for medical information' };
  }

  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    const medicalData: Omit<MedicalInfo, 'id'> = {
      ...medicalInfo,
      created_at: now,
      updated_at: now
    };

    const id = await db.add('medical_info', medicalData);
    const savedData = { ...medicalData, id: id.toString() };
    
    // Log action
    const session = await getCurrentUserSession();
    if (session) {
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: 'create',
        resource_type: 'medical_info',
        resource_id: savedData.id,
        details: { patient_id: medicalInfo.patient_id }
      });
    }
    
    return { success: true, data: savedData };
  } catch (error) {
    console.error('Error saving medical info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get patient dashboard data
 */
export async function getPatientDashboardData(patientId: string): Promise<DatabaseResult<PatientDashboardData>> {
  const permissionCheck = await checkPatientAccess(patientId, 'read');
  if (!permissionCheck.allowed) {
    return { success: false, error: permissionCheck.reason };
  }

  try {
    const db = await initDB();
    
    // Get patient basic info
    const patient = await db.get('patients', patientId);
    if (!patient) {
      return { success: false, error: 'Patient not found' };
    }

    // Get tasks
    const allTasks = await db.getAllFromIndex('tasks', 'patient_id', patientId);
    const activeTasks = allTasks.filter(task => task.status !== 'completed');
    const completedTasks = allTasks.filter(task => task.status === 'completed');

    // Get basic medical info (limited for patient view)
    const medicalInfoResult = await getMedicalInfo(patientId);
    const limitedMedicalInfo = medicalInfoResult.success && medicalInfoResult.data ? {
      evaluation_date: medicalInfoResult.data.evaluation_date,
      next_follow_up: medicalInfoResult.data.next_follow_up
    } : undefined;

    const dashboardData: PatientDashboardData = {
      patient,
      medical_info: limitedMedicalInfo,
      active_tasks: activeTasks,
      completed_tasks: completedTasks,
      last_login: (await getCurrentUserSession())?.login_time
    };

    return { success: true, data: dashboardData };
  } catch (error) {
    console.error('Error getting patient dashboard data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Cache management functions
 */
function setCachedData(key: string, data: any, ttl: number = 300000): void {
  dataCache.set(key, {
    data,
    timestamp: Date.now(),
    ttl
  });
}

function getCachedData(key: string): any | null {
  const cached = dataCache.get(key);
  if (!cached) return null;
  
  if (Date.now() - cached.timestamp > cached.ttl) {
    dataCache.delete(key);
    return null;
  }
  
  return cached.data;
}

function clearCachedData(key: string): void {
  dataCache.delete(key);
}

/**
 * Log audit action
 */
async function logAuditAction(logData: Omit<AuditLog, 'id' | 'timestamp' | 'ip_address' | 'user_agent'>): Promise<void> {
  try {
    const db = await initDB();
    
    const auditLog: Omit<AuditLog, 'id'> = {
      ...logData,
      timestamp: new Date().toISOString(),
      ip_address: 'localhost', // In a real app, get from request
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    };

    await db.add('audit_logs', auditLog);
  } catch (error) {
    console.error('Error logging audit action:', error);
  }
}

// Legacy compatibility functions - Keep existing API
export async function savePatientInfo(info: PatientInfo): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.PATIENT_INFO, JSON.stringify(info));
  } catch (error) {
    console.error('Error saving patient info:', error);
  }
}

export async function loadPatientInfo(): Promise<PatientInfo | undefined> {
  if (!isBrowser()) return undefined;
  
  try {
    const infoString = sessionStorage.getItem(STORAGE_KEYS.PATIENT_INFO);
    return infoString ? JSON.parse(infoString) : undefined;
  } catch (error) {
    console.error('Error loading patient info:', error);
    return undefined;
  }
}

export async function saveAnswer(questionId: QuestionId, value: AnswerValue): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.ANSWERS) || '{}';
    const answers = JSON.parse(answersString) as HalAnswers;
    
    const updatedAnswers = {
      ...answers,
      [questionId]: value
    };
    
    sessionStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(updatedAnswers));
  } catch (error) {
    console.error('Error saving answer:', error);
  }
}

export async function saveAnswers(answers: HalAnswers): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.ANSWERS, JSON.stringify(answers));
  } catch (error) {
    console.error('Error saving answers:', error);
  }
}

export async function loadAnswers(): Promise<HalAnswers | undefined> {
  if (!isBrowser()) return undefined;
  
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.ANSWERS);
    return answersString ? JSON.parse(answersString) : {};
  } catch (error) {
    console.error('Error loading answers:', error);
    return {};
  }
}

export async function saveHaemqolAnswer(questionId: HaemqolQuestionId, value: HaemqolAnswerValue): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.HAEMQOL_ANSWERS) || '{}';
    const answers = JSON.parse(answersString) as HaemqolAnswers;
    
    const updatedAnswers = {
      ...answers,
      [questionId]: value
    };
    
    sessionStorage.setItem(STORAGE_KEYS.HAEMQOL_ANSWERS, JSON.stringify(updatedAnswers));
  } catch (error) {
    console.error('Error saving HAEMO-QoL-A answer:', error);
  }
}

export async function saveHaemqolAnswers(haemqolAnswers: HaemqolAnswers): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    sessionStorage.setItem(STORAGE_KEYS.HAEMQOL_ANSWERS, JSON.stringify(haemqolAnswers));
  } catch (error) {
    console.error('Error saving HAEMO-QoL-A answers:', error);
  }
}

export async function loadHaemqolAnswers(): Promise<HaemqolAnswers | undefined> {
  if (!isBrowser()) return undefined;
  
  try {
    const answersString = sessionStorage.getItem(STORAGE_KEYS.HAEMQOL_ANSWERS);
    return answersString ? JSON.parse(answersString) : {};
  } catch (error) {
    console.error('Error loading HAEMO-QoL-A answers:', error);
    return {};
  }
}

export async function clearSessionData(): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    sessionStorage.removeItem(STORAGE_KEYS.PATIENT_INFO);
    sessionStorage.removeItem(STORAGE_KEYS.ANSWERS);
    sessionStorage.removeItem(STORAGE_KEYS.HAEMQOL_ANSWERS);
    
    // Clear cache
    dataCache.clear();
  } catch (error) {
    console.error('Error clearing session data:', error);
  }
}

export async function storePatientRecord(record: PatientRecord) {
  const db = await initDB();
  return db.add('patientRecords', {
    ...record,
    timestamp: new Date().toISOString(),
  });
}

export async function loadPatientRecords(): Promise<PatientRecord[]> {
  const db = await initDB();
  return db.getAll('patientRecords');
}

// 获取当前用户ID
async function getCurrentUserId(): Promise<string | null> {
  const session = await getCurrentUserSession();
  return session?.user_id || null;
}

// 用户特定的数据保存和加载函数
export async function saveUserSpecificPatientInfo(info: PatientInfo, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving patient info');
      return;
    }
    
    const userKey = getUserSpecificKey(STORAGE_KEYS.PATIENT_INFO, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(info));
    
    // Also save to IndexedDB for persistence - use upsert logic
    const db = await initDB();
    
    try {
      // Try to get existing record first
      const existingRecord = await db.get('patient_data', currentUserId);
      if (existingRecord) {
        // Update existing record
        await db.put('patient_data', { 
          user_id: currentUserId, 
          type: 'patient_info',
          data: info, 
          timestamp: new Date().toISOString() 
        });
        console.log('Patient info updated for user:', currentUserId);
      } else {
        // Create new record
        await db.put('patient_data', { 
          user_id: currentUserId, 
          type: 'patient_info',
          data: info, 
          timestamp: new Date().toISOString() 
        });
        console.log('Patient info created for user:', currentUserId);
      }
    } catch (dbError) {
      console.warn('IndexedDB operation failed, using put as fallback:', dbError);
      // Direct put as fallback (will create or update)
      await db.put('patient_data', { 
        user_id: currentUserId, 
        type: 'patient_info',
        data: info, 
        timestamp: new Date().toISOString() 
      });
      console.log('Patient info saved via fallback for user:', currentUserId);
    }
  } catch (error) {
    console.error('Error saving user-specific patient info:', error);
  }
}

export async function loadUserSpecificPatientInfo(userId?: string): Promise<PatientInfo | null> {
  if (!isBrowser()) return null;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return null;
    
    // Try sessionStorage first
    const userKey = getUserSpecificKey(STORAGE_KEYS.PATIENT_INFO, currentUserId);
    const sessionData = sessionStorage.getItem(userKey);
    if (sessionData) {
      console.log('Loaded patient info from sessionStorage for user:', currentUserId);
      return JSON.parse(sessionData);
    }
    
    // Fallback to IndexedDB
    const db = await initDB();
    const dbData = await db.get('patient_data', currentUserId);
    if (dbData && dbData.type === 'patient_info') {
      console.log('Loaded patient info from IndexedDB for user:', currentUserId);
      // Also restore to sessionStorage
      sessionStorage.setItem(userKey, JSON.stringify(dbData.data));
      return dbData.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error loading user-specific patient info:', error);
    return null;
  }
}

export async function saveUserSpecificAnswers(answers: HalAnswers, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving HAL answers');
      return;
    }
    
    const userKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(answers));
    
    // Also save to IndexedDB for persistence
    const db = await initDB();
    
    // Check if record exists - use try/catch for index fallback
    let results = [];
    try {
      results = await db.getAllFromIndex('questionnaire_answers', 'user_type', [currentUserId, 'hal_answers']);
    } catch (indexError) {
      console.warn('user_type index not found, falling back to user_id index:', indexError);
      // Fallback to user_id index and filter manually
      const allUserAnswers = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
      results = allUserAnswers.filter(item => item.type === 'hal_answers');
    }
    
    if (results.length > 0) {
      // Update existing record
      const existingRecord = results[0];
      await db.put('questionnaire_answers', { 
        ...existingRecord,
        data: answers, 
        timestamp: new Date().toISOString() 
      });
      console.log('HAL answers updated for user:', currentUserId);
    } else {
      // Create new record - use put instead of add to avoid key conflicts
      try {
        await db.add('questionnaire_answers', { 
          user_id: currentUserId, 
          type: 'hal_answers',
          data: answers, 
          timestamp: new Date().toISOString() 
        });
        console.log('HAL answers created for user:', currentUserId);
      } catch (addError) {
        // If add fails due to unique constraint, try to update instead
        console.warn('Add failed, attempting to update existing record:', addError);
        const allRecords = await db.getAll('questionnaire_answers');
        const existingRecord = allRecords.find(record => 
          record.user_id === currentUserId && record.type === 'hal_answers'
        );
        if (existingRecord) {
          await db.put('questionnaire_answers', { 
            ...existingRecord,
            data: answers, 
            timestamp: new Date().toISOString() 
          });
          console.log('HAL answers updated via fallback for user:', currentUserId);
        }
      }
    }
  } catch (error) {
    console.error('Error saving user-specific HAL answers:', error);
  }
}

export async function loadUserSpecificAnswers(userId?: string): Promise<HalAnswers> {
  if (!isBrowser()) return {};
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return {};
    
    // Try sessionStorage first
    const userKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, currentUserId);
    const sessionData = sessionStorage.getItem(userKey);
    if (sessionData) {
      console.log('Loaded HAL answers from sessionStorage for user:', currentUserId);
      return JSON.parse(sessionData);
    }
    
    // Fallback to IndexedDB
    const db = await initDB();
    const results = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
    const halData = results.find(item => item.type === 'hal_answers');
    
    if (halData) {
      console.log('Loaded HAL answers from IndexedDB for user:', currentUserId);
      // Also restore to sessionStorage
      sessionStorage.setItem(userKey, JSON.stringify(halData.data));
      return halData.data;
    }
    
    return {};
  } catch (error) {
    console.error('Error loading user-specific HAL answers:', error);
    return {};
  }
}

export async function saveUserSpecificHaemqolAnswers(answers: HaemqolAnswers, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving HAEMO-QoL-A answers');
      return;
    }
    
    const userKey = getUserSpecificKey(STORAGE_KEYS.HAEMQOL_ANSWERS, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(answers));
    
    // Also save to IndexedDB for persistence
    const db = await initDB();
    
    // Check if record exists - use try/catch for index fallback
    let results = [];
    try {
      results = await db.getAllFromIndex('questionnaire_answers', 'user_type', [currentUserId, 'haemqol_answers']);
    } catch (indexError) {
      console.warn('user_type index not found, falling back to user_id index:', indexError);
      // Fallback to user_id index and filter manually
      const allUserAnswers = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
      results = allUserAnswers.filter(item => item.type === 'haemqol_answers');
    }
    
    if (results.length > 0) {
      // Update existing record
      const existingRecord = results[0];
      await db.put('questionnaire_answers', { 
        ...existingRecord,
        data: answers, 
        timestamp: new Date().toISOString() 
      });
      console.log('HAEMO-QoL-A answers updated for user:', currentUserId);
    } else {
      // Create new record - use put instead of add to avoid key conflicts
      try {
        await db.add('questionnaire_answers', { 
          user_id: currentUserId, 
          type: 'haemqol_answers',
          data: answers, 
          timestamp: new Date().toISOString() 
        });
        console.log('HAEMO-QoL-A answers created for user:', currentUserId);
      } catch (addError) {
        // If add fails due to unique constraint, try to update instead
        console.warn('Add failed, attempting to update existing record:', addError);
        const allRecords = await db.getAll('questionnaire_answers');
        const existingRecord = allRecords.find(record => 
          record.user_id === currentUserId && record.type === 'haemqol_answers'
        );
        if (existingRecord) {
          await db.put('questionnaire_answers', { 
            ...existingRecord,
            data: answers, 
            timestamp: new Date().toISOString() 
          });
          console.log('HAEMO-QoL-A answers updated via fallback for user:', currentUserId);
        }
      }
    }
  } catch (error) {
    console.error('Error saving user-specific HAEMO-QoL-A answers:', error);
  }
}

export async function loadUserSpecificHaemqolAnswers(userId?: string): Promise<HaemqolAnswers> {
  if (!isBrowser()) return {};
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return {};
    
    // Try sessionStorage first
    const userKey = getUserSpecificKey(STORAGE_KEYS.HAEMQOL_ANSWERS, currentUserId);
    const sessionData = sessionStorage.getItem(userKey);
    if (sessionData) {
      console.log('Loaded HAEMO-QoL-A answers from sessionStorage for user:', currentUserId);
      return JSON.parse(sessionData);
    }
    
    // Fallback to IndexedDB
    const db = await initDB();
    const results = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
    const haemqolData = results.find(item => item.type === 'haemqol_answers');
    
    if (haemqolData) {
      console.log('Loaded HAEMO-QoL-A answers from IndexedDB for user:', currentUserId);
      // Also restore to sessionStorage
      sessionStorage.setItem(userKey, JSON.stringify(haemqolData.data));
      return haemqolData.data;
    }
    
    return {};
  } catch (error) {
    console.error('Error loading user-specific HAEMO-QoL-A answers:', error);
    return {};
  }
}

// 清除特定用户的数据
export async function clearUserSpecificData(userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) return;
    
    // Clear sessionStorage
    const patientInfoKey = getUserSpecificKey(STORAGE_KEYS.PATIENT_INFO, currentUserId);
    const answersKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, currentUserId);
    const haemqolKey = getUserSpecificKey(STORAGE_KEYS.HAEMQOL_ANSWERS, currentUserId);
    
    sessionStorage.removeItem(patientInfoKey);
    sessionStorage.removeItem(answersKey);
    sessionStorage.removeItem(haemqolKey);
    
    // Clear IndexedDB
    const db = await initDB();
    await db.delete('patient_data', currentUserId);
    await db.delete('questionnaire_answers', `${currentUserId}-hal`);
    await db.delete('questionnaire_answers', `${currentUserId}-haemqol`);
  } catch (error) {
    console.error('Error clearing user-specific data:', error);
  }
} 
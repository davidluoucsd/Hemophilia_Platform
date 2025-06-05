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
const DB_VERSION = 8;

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
        answersStore.createIndex('task_id', 'task_id');
        answersStore.createIndex('timestamp', 'timestamp');
        // Remove unique constraint to allow multiple questionnaire instances
        answersStore.createIndex('user_type', ['user_id', 'type'], { unique: false });
      }
      
      // Handle existing questionnaire_answers store upgrade
      if (oldVersion < 8 && db.objectStoreNames.contains('questionnaire_answers')) {
        // Delete and recreate the store with new schema
        db.deleteObjectStore('questionnaire_answers');
        const answersStore = db.createObjectStore('questionnaire_answers', { keyPath: 'id', autoIncrement: true });
        answersStore.createIndex('user_id', 'user_id');
        answersStore.createIndex('type', 'type');
        answersStore.createIndex('task_id', 'task_id');
        answersStore.createIndex('timestamp', 'timestamp');
        // Remove unique constraint to allow multiple questionnaire instances
        answersStore.createIndex('user_type', ['user_id', 'type'], { unique: false });
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
    // For development/testing, if no session but we're in a doctor context, allow access
    if (typeof window !== 'undefined') {
      const currentPath = window.location.pathname;
      if (currentPath.startsWith('/doctor')) {
        console.warn('No session found but in doctor context, allowing access for development');
        return { allowed: true };
      }
    }
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
 * Create or update patient basic information with proper upsert logic
 */
export async function savePatientBasicInfo(patient: Omit<Patient, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Patient>> {
  const permissionCheck = await checkPatientAccess(patient.id, 'write');
  if (!permissionCheck.allowed) {
    return { success: false, error: permissionCheck.reason };
  }

  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // Check if patient exists - use proper IndexedDB API
    let existingPatient: Patient | undefined;
    try {
      existingPatient = await db.get('patients', patient.id);
    } catch (error) {
      console.log('Patient not found, will create new record');
    }
    
    const patientData: Patient = {
      ...patient,
      created_at: existingPatient?.created_at || now,
      updated_at: now
    };

    // Use put to ensure upsert behavior (create or update)
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
    
    console.log(`Patient basic info ${existingPatient ? 'updated' : 'created'} for ID: ${patient.id}`);
    
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
  // Allow both doctors and patients to access medical info
  const session = await getCurrentUserSession();
  if (!session) {
    return { success: false, error: 'Authentication required' };
  }

  // Check permissions: doctors can access all, patients only their own
  if (session.role === 'patient' && session.user_id !== patientId) {
    return { success: false, error: 'Can only access own medical information' };
  }

  try {
    const db = await initDB();
    
    // Since medical_info uses patient_id as primary key, get directly
    const medicalInfo = await db.get('medical_info', patientId);
    
    return { success: true, data: medicalInfo || null };
  } catch (error) {
    console.error('Error getting medical info:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Save medical information (doctor-only)
 */
export async function saveMedicalInfo(medicalInfo: Omit<MedicalInfo, 'id' | 'created_at' | 'updated_at'>): Promise<DatabaseResult<MedicalInfo>> {
  // Allow both doctors and patients to save medical info
  const session = await getCurrentUserSession();
  if (!session) {
    return { success: false, error: 'Authentication required' };
  }

  // Check permissions: doctors can save for any patient, patients only for themselves
  if (session.role === 'patient' && session.user_id !== medicalInfo.patient_id) {
    return { success: false, error: 'Can only save own medical information' };
  }

  try {
    const db = await initDB();
    const now = new Date().toISOString();
    
    // Check if medical info already exists
    const existingInfo = await db.get('medical_info', medicalInfo.patient_id);
    
    const medicalData: MedicalInfo = {
      ...medicalInfo,
      id: medicalInfo.patient_id, // Use patient_id as id since it's the primary key
      created_at: existingInfo?.created_at || now,
      updated_at: now
    };

    // Use put instead of add to update existing records
    await db.put('medical_info', medicalData);
    
    // Log action
    if (session) {
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: existingInfo ? 'update' : 'create',
        resource_type: 'medical_info',
        resource_id: medicalData.id,
        details: { patient_id: medicalInfo.patient_id }
      });
    }
    
    return { success: true, data: medicalData };
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

// Simplified patient info saving
export async function saveUserSpecificPatientInfo(info: PatientInfo, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving patient info');
      return;
    }
    
    // Save to sessionStorage for immediate availability
    const userKey = getUserSpecificKey(STORAGE_KEYS.PATIENT_INFO, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(info));
    
    // Save to main patients table if we have enough info
    if (info.patientName && info.age && info.weight && info.height) {
      const patientData = {
        id: currentUserId,
        name: info.patientName,
        age: parseInt(info.age) || 0,
        weight: parseFloat(info.weight) || 0,
        height: parseFloat(info.height) || 0
      };
      
      await savePatientBasicInfo(patientData);
    }
    
  } catch (error) {
    console.error('Error saving patient info:', error);
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

// Removed cleanupDuplicateRecords function - no longer needed with simplified storage

// Simplified HAL answers saving
export async function saveUserSpecificAnswers(answers: HalAnswers, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving HAL answers');
      return;
    }

    // Save to sessionStorage for immediate availability
    const userKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(answers));
    console.log('HAL answers saved to sessionStorage for user:', currentUserId, 'answers count:', Object.keys(answers).length);
    
  } catch (error) {
    console.error('Error saving HAL answers:', error);
  }
}

// Simplified HAL answers loading
export async function loadUserSpecificAnswers(userId?: string): Promise<HalAnswers> {
  if (!isBrowser()) return {};
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.log('No user ID available for loading HAL answers');
      return {};
    }
    
    // Try sessionStorage first
    const userKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, currentUserId);
    const sessionData = sessionStorage.getItem(userKey);
    if (sessionData) {
      try {
        const parsedData = JSON.parse(sessionData);
        console.log('Loaded HAL answers from sessionStorage for user:', currentUserId, 'answers count:', Object.keys(parsedData).length);
        return parsedData;
      } catch (parseError) {
        console.warn('Failed to parse sessionStorage HAL data:', parseError);
      }
    }
    
    // Try legacy non-user-specific key as fallback
    const legacyKey = STORAGE_KEYS.ANSWERS;
    const legacyData = sessionStorage.getItem(legacyKey);
    if (legacyData) {
      try {
        const parsedLegacyData = JSON.parse(legacyData);
        const legacyCount = Object.keys(parsedLegacyData).length;
        if (legacyCount > 0) {
          console.log('Found legacy HAL data, migrating to user-specific storage:', currentUserId, 'answers count:', legacyCount);
          // Save to user-specific storage
          sessionStorage.setItem(userKey, legacyData);
          return parsedLegacyData;
        }
      } catch (legacyParseError) {
        console.warn('Failed to parse legacy HAL data:', legacyParseError);
      }
    }
    
    console.log('No HAL answers found for user:', currentUserId);
    return {};
    
  } catch (error) {
    console.error('Error loading HAL answers:', error);
    return {};
  }
}

// Simplified HAEMO-QoL-A answers saving  
export async function saveUserSpecificHaemqolAnswers(answers: HaemqolAnswers, userId?: string): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving HAEMO-QoL-A answers');
      return;
    }
    
    // Save to sessionStorage for immediate availability
    const userKey = getUserSpecificKey(STORAGE_KEYS.HAEMQOL_ANSWERS, currentUserId);
    sessionStorage.setItem(userKey, JSON.stringify(answers));
    console.log('HAEMO-QoL-A answers saved to sessionStorage for user:', currentUserId, 'answers count:', Object.keys(answers).length);
    
  } catch (error) {
    console.error('Error saving HAEMO-QoL-A answers:', error);
  }
}

// Simplified HAEMO-QoL-A answers loading
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
    
    // Try legacy non-user-specific key as fallback  
    const legacyKey = STORAGE_KEYS.HAEMQOL_ANSWERS;
    const legacyData = sessionStorage.getItem(legacyKey);
    if (legacyData) {
      try {
        const parsedLegacyData = JSON.parse(legacyData);
        const legacyCount = Object.keys(parsedLegacyData).length;
        if (legacyCount > 0) {
          console.log('Found legacy HAEMO-QoL-A data, migrating to user-specific storage:', currentUserId);
          // Save to user-specific storage
          sessionStorage.setItem(userKey, legacyData);
          return parsedLegacyData;
        }
      } catch (legacyParseError) {
        console.warn('Failed to parse legacy HAEMO-QoL-A data:', legacyParseError);
      }
    }
    
    return {};
  } catch (error) {
    console.error('Error loading HAEMO-QoL-A answers:', error);
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

/**
 * Doctor-specific database operations for Stage 3 completion
 */

/**
 * Get doctor dashboard statistics
 */
export async function getDoctorDashboardStats(doctorId: string): Promise<DatabaseResult<DoctorDashboardData>> {
  try {
    // Check doctor permissions
    const permissionCheck = await checkDoctorAccess();
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: 'Access denied: Doctor permissions required'
      };
    }

    const db = await initDB();
    
    // Get all patients
    const allPatients = await db.getAll('patients');
    const totalPatients = allPatients.length;
    
    // Get active patients (those with recent activity)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activePatientsCount = allPatients.filter(p => 
      p.updated_at && p.updated_at > thirtyDaysAgo
    ).length;
    
    // Get all tasks
    const allTasks = await db.getAll('tasks');
    const pendingTasks = allTasks.filter(t => t.status === 'not_started' || t.status === 'in_progress').length;
    
    // Get completed tasks this week
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const completedThisWeek = allTasks.filter(t => 
      t.status === 'completed' && t.completed_at && t.completed_at > weekAgo
    ).length;
    
    // Get recent completions
    const recentCompletions = allTasks
      .filter(t => t.status === 'completed' && t.completed_at)
      .sort((a, b) => new Date(b.completed_at!).getTime() - new Date(a.completed_at!).getTime())
      .slice(0, 5)
      .map(task => {
        const patient = allPatients.find(p => p.id === task.patient_id);
        return {
          patient_name: patient?.name || 'Unknown Patient',
          questionnaire_name: task.questionnaire_id === 'haemqol' ? 'HAEMO-QoL-A' : 'HAL',
          completed_at: task.completed_at!,
          score: undefined // Will be filled when we have response data
        };
      });

    // Get doctor info
    const doctor = await db.get('doctors', doctorId);
    
    const dashboardData: DoctorDashboardData = {
      doctor: doctor || { 
        id: doctorId, 
        name: 'Doctor', 
        password_hash: '', 
        created_at: new Date().toISOString() 
      },
      total_patients: totalPatients,
      active_patients: activePatientsCount,
      pending_tasks: pendingTasks,
      completed_this_week: completedThisWeek,
      recent_completions: recentCompletions
    };

    return {
      success: true,
      data: dashboardData,
      message: 'Dashboard stats loaded successfully'
    };

  } catch (error) {
    console.error('Error getting doctor dashboard stats:', error);
    return {
      success: false,
      error: 'Failed to load dashboard statistics'
    };
  }
}

/**
 * Get all patients for doctor management
 */
export async function getAllPatients(): Promise<DatabaseResult<Patient[]>> {
  try {
    // Check doctor permissions
    const permissionCheck = await checkDoctorAccess();
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: 'Access denied: Doctor permissions required'
      };
    }

    const db = await initDB();
    const patients = await db.getAll('patients');
    
    // Sort by most recent activity
    const sortedPatients = patients.sort((a, b) => 
      new Date(b.updated_at || b.created_at).getTime() - 
      new Date(a.updated_at || a.created_at).getTime()
    );

    return {
      success: true,
      data: sortedPatients,
      message: 'Patients loaded successfully'
    };

  } catch (error) {
    console.error('Error getting all patients:', error);
    return {
      success: false,
      error: 'Failed to load patients'
    };
  }
}

/**
 * Create a new patient
 */
export async function createNewPatient(patientData: Omit<Patient, 'created_at' | 'updated_at'>): Promise<DatabaseResult<Patient>> {
  try {
    // Check doctor permissions
    const permissionCheck = await checkDoctorAccess();
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: 'Access denied: Doctor permissions required'
      };
    }

    const db = await initDB();
    
    // Check if patient ID already exists
    const existingPatient = await db.get('patients', patientData.id);
    if (existingPatient) {
      return {
        success: false,
        error: 'Patient ID already exists'
      };
    }

    // Create new patient with timestamps
    const newPatient: Patient = {
      ...patientData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await db.put('patients', newPatient);

    // Create sample questionnaire data for demonstration
    await createSampleQuestionnaireData(db, newPatient.id);

    // Log the creation
    const session = await getCurrentUserSession();
    if (session) {
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: 'create',
        resource_type: 'patient',
        resource_id: newPatient.id,
        details: { patient_name: newPatient.name }
      });
    }

    return {
      success: true,
      data: newPatient,
      message: 'Patient created successfully'
    };

  } catch (error) {
    console.error('Error creating new patient:', error);
    return {
      success: false,
      error: 'Failed to create patient'
    };
  }
}

/**
 * Create sample questionnaire data for new patients
 */
async function createSampleQuestionnaireData(db: any, patientId: string): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Generate realistic sample answers based on patient characteristics
    const generateHALAnswers = (patientId: string) => {
      // Create different patterns based on patient ID for variety
      const seed = parseInt(patientId.slice(-2)) || 50; // Use last 2 digits as seed
      const answers: any = {};
      
      for (let i = 1; i <= 42; i++) {
        // Generate values between 1-6 with patterns based on patient
        let value;
        if (seed < 30) {
          // Lower functioning patient - more 1-3 scores
          value = Math.floor(Math.random() * 3) + 1; // 1-3
        } else if (seed < 70) {
          // Moderate functioning - more 2-5 scores  
          value = Math.floor(Math.random() * 4) + 2; // 2-5
        } else {
          // Higher functioning - more 4-6 scores
          value = Math.floor(Math.random() * 3) + 4; // 4-6
        }
        answers[`q${i}`] = value.toString();
      }
      
      return answers;
    };

    const generateHAEMQOLAnswers = (patientId: string) => {
      const seed = parseInt(patientId.slice(-2)) || 50;
      const answers: any = {};
      
      for (let i = 1; i <= 41; i++) {
        // Generate values between 0-5 with patterns
        let value;
        if (seed < 30) {
          // Better quality of life - more 0-2 scores  
          value = Math.floor(Math.random() * 3); // 0-2
        } else if (seed < 70) {
          // Moderate quality of life - more 1-4 scores
          value = Math.floor(Math.random() * 4) + 1; // 1-4  
        } else {
          // Lower quality of life - more 2-5 scores
          value = Math.floor(Math.random() * 4) + 2; // 2-5
        }
        answers[`hq${i}`] = value.toString();
      }
      
      return answers;
    };

    // Calculate scores for HAL
    const calculateHALScores = (answers: any) => {
      const dimensions = {
        lying_sitting_kneeling_standing: Array.from({length: 8}, (_, i) => `q${i + 1}`),
        lower_extremity_function: Array.from({length: 9}, (_, i) => `q${i + 9}`),
        upper_extremity_function: Array.from({length: 4}, (_, i) => `q${i + 18}`),
        transportation: Array.from({length: 3}, (_, i) => `q${i + 22}`),
        self_care: Array.from({length: 5}, (_, i) => `q${i + 25}`),
        household_tasks: Array.from({length: 6}, (_, i) => `q${i + 30}`),
        leisure_physical: Array.from({length: 7}, (_, i) => `q${i + 36}`)
      };

      const scores: any = {};
      let totalScore = 0;
      let answeredQuestions = 0;

      Object.entries(dimensions).forEach(([dimension, questions]) => {
        let dimensionScore = 0;
        let dimensionAnswers = 0;
        
        questions.forEach(q => {
          if (answers[q]) {
            dimensionScore += parseInt(answers[q]);
            dimensionAnswers++;
            answeredQuestions++;
          }
        });
        
        scores[dimension] = {
          score: dimensionScore,
          possible: dimensionAnswers * 6,
          percentage: dimensionAnswers > 0 ? Math.round((dimensionScore / (dimensionAnswers * 6)) * 100) : 0
        };
        
        totalScore += dimensionScore;
      });

      return {
        ...scores,
        total_score: totalScore,
        total_possible: answeredQuestions * 6,
        total_percentage: answeredQuestions > 0 ? Math.round((totalScore / (answeredQuestions * 6)) * 100) : 0
      };
    };

    // Calculate scores for HAEMO-QoL-A
    const calculateHAEMQOLScores = (answers: any) => {
      const dimensions = {
        physical_health: Array.from({length: 9}, (_, i) => `hq${i + 1}`),
        feelings_emotions: Array.from({length: 11}, (_, i) => `hq${i + 10}`),
        view_of_others: Array.from({length: 9}, (_, i) => `hq${i + 21}`),
        sports_school: Array.from({length: 12}, (_, i) => `hq${i + 30}`)
      };

      const scores: any = {};
      let totalScore = 0;
      let answeredQuestions = 0;

      Object.entries(dimensions).forEach(([dimension, questions]) => {
        let dimensionScore = 0;
        let dimensionAnswers = 0;
        
        questions.forEach(q => {
          if (answers[q]) {
            dimensionScore += parseInt(answers[q]);
            dimensionAnswers++;
            answeredQuestions++;
          }
        });
        
        scores[dimension] = {
          score: dimensionScore,
          possible: dimensionAnswers * 5,
          percentage: dimensionAnswers > 0 ? Math.round((dimensionScore / (dimensionAnswers * 5)) * 100) : 0
        };
        
        totalScore += dimensionScore;
      });

      return {
        ...scores,
        total_score: totalScore,
        total_possible: answeredQuestions * 5,
        total_percentage: answeredQuestions > 0 ? Math.round((totalScore / (answeredQuestions * 5)) * 100) : 0
      };
    };

    // Create HAL response
    const halAnswers = generateHALAnswers(patientId);
    const halScores = calculateHALScores(halAnswers);
    
    const halResponse: Omit<Response, 'id'> = {
      task_id: 'sample-hal-' + patientId,
      patient_id: patientId,
      questionnaire_type: 'hal',
      answers: halAnswers,
      scores: halScores,
      total_score: halScores.total_score,
      completed_at: now,
      is_visible_to_patient: true,
      created_at: now,
      updated_at: now
    };

    // Create HAEMO-QoL-A response  
    const haemqolAnswers = generateHAEMQOLAnswers(patientId);
    const haemqolScores = calculateHAEMQOLScores(haemqolAnswers);
    
    const haemqolResponse: Omit<Response, 'id'> = {
      task_id: 'sample-haemqol-' + patientId,
      patient_id: patientId,
      questionnaire_type: 'haemqol',
      answers: haemqolAnswers,
      scores: haemqolScores,
      total_score: haemqolScores.total_score,
      completed_at: now,
      is_visible_to_patient: true,
      created_at: now,
      updated_at: now
    };

    // Save both responses to database
    await db.add('responses', halResponse);
    await db.add('responses', haemqolResponse);

    console.log(`✅ 为患者 ${patientId} 创建了示例问卷数据 (HAL: ${halScores.total_score}分, HAEMO-QoL-A: ${haemqolScores.total_score}分)`);

  } catch (error) {
    console.error('Error creating sample questionnaire data:', error);
    // Don't throw error - this is not critical for patient creation
  }
}

/**
 * Search patients by name or ID
 */
export async function searchPatients(query: string): Promise<DatabaseResult<Patient[]>> {
  try {
    // Check doctor permissions
    const permissionCheck = await checkDoctorAccess();
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: 'Access denied: Doctor permissions required'
      };
    }

    const db = await initDB();
    const allPatients = await db.getAll('patients');
    
    const searchQuery = query.toLowerCase().trim();
    const filteredPatients = allPatients.filter(patient => 
      patient.name.toLowerCase().includes(searchQuery) ||
      patient.id.toLowerCase().includes(searchQuery)
    );

    return {
      success: true,
      data: filteredPatients,
      message: `Found ${filteredPatients.length} patients`
    };

  } catch (error) {
    console.error('Error searching patients:', error);
    return {
      success: false,
      error: 'Failed to search patients'
    };
  }
}

/**
 * Get patient tasks and activity
 */
export async function getPatientTasks(patientId: string): Promise<DatabaseResult<Task[]>> {
  try {
    // Check doctor permissions
    const permissionCheck = await checkDoctorAccess();
    if (!permissionCheck.allowed) {
      return {
        success: false,
        error: 'Access denied: Doctor permissions required'
      };
    }

    const db = await initDB();
    const allTasks = await db.getAll('tasks');
    
    const patientTasks = allTasks
      .filter(task => task.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return {
      success: true,
      data: patientTasks,
      message: 'Patient tasks loaded successfully'
    };

  } catch (error) {
    console.error('Error getting patient tasks:', error);
    return {
      success: false,
      error: 'Failed to load patient tasks'
    };
  }
}

/**
 * Assign questionnaire to patient
 */
export async function getAllResponses(patientId: string): Promise<DatabaseResult<Response[]>> {
  try {
    const accessCheck = await checkDoctorAccess();
    if (!accessCheck.allowed) {
      return { success: false, error: accessCheck.reason || '权限不足' };
    }

    const db = await initDB();
    
    // Get all responses for the patient
    const responses = await db.getAll('responses');
    const patientResponses = responses.filter(response => response.patient_id === patientId);
    
    // Sort by creation date (newest first)
    patientResponses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: patientResponses };
  } catch (error) {
    console.error('Error getting patient responses:', error);
    return { success: false, error: '获取问卷记录时出现错误' };
  }
}

export async function assignQuestionnaire(
  patientId: string, 
  questionnaireType: 'haemqol' | 'hal',
  options?: {
    due_date?: string;
    priority?: 'normal' | 'urgent';
    instructions?: string;
  }
): Promise<DatabaseResult<Task>> {
  try {
    // Check permissions - allow both doctors and patients to create tasks
    const session = await getCurrentUserSession();
    if (!session) {
      return {
        success: false,
        error: 'No active session'
      };
    }

    // Allow patients to create tasks for themselves
    if (session.role === 'patient' && session.user_id !== patientId) {
      return {
        success: false,
        error: 'Patients can only create tasks for themselves'
      };
    }

    // Allow doctors to create tasks for any patient
    if (session.role === 'doctor') {
      const permissionCheck = await checkDoctorAccess();
      if (!permissionCheck.allowed) {
        return {
          success: false,
          error: 'Access denied: Doctor permissions required'
        };
      }
    }

    const db = await initDB();
    
    // Verify patient exists
    const patient = await db.get('patients', patientId);
    if (!patient) {
      return {
        success: false,
        error: 'Patient not found'
      };
    }

    // Create new task
    const newTask: Omit<Task, 'id'> = {
      patient_id: patientId,
      questionnaire_id: questionnaireType,
      assigned_by_doctor_id: session?.user_id,
      due_date: options?.due_date,
      status: 'not_started',
      progress: 0,
      priority: options?.priority || 'normal',
      instructions: options?.instructions,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const result = await db.add('tasks', newTask);
    const taskWithId = { ...newTask, id: result.toString() };

    // Log the assignment
    if (session) {
      await logAuditAction({
        user_id: session.user_id,
        user_role: session.role,
        action: 'create',
        resource_type: 'task',
        resource_id: taskWithId.id,
        details: { 
          patient_id: patientId,
          questionnaire_type: questionnaireType,
          patient_name: patient.name
        }
      });
    }

    return {
      success: true,
      data: taskWithId,
      message: 'Questionnaire assigned successfully'
    };

  } catch (error) {
    console.error('Error assigning questionnaire:', error);
    return {
      success: false,
      error: 'Failed to assign questionnaire'
    };
  }
}

/**
 * Submit questionnaire response with scores
 */
export async function submitQuestionnaireResponse(
  taskId: string,
  patientId: string,
  questionnaireType: 'haemqol' | 'hal',
  answers: any,
  scores: any,
  totalScore?: number
): Promise<DatabaseResult<Response>> {
  try {
    const db = await initDB();
    
    // First update the task status - handle both string and numeric IDs
    let task;
    let actualTaskId: string | number = taskId;
    
    console.log('🔍 Looking for task with ID:', taskId, 'type:', typeof taskId);
    
    // Try string ID first
    task = await db.get('tasks', taskId);
    console.log('🔍 String ID lookup result:', task);
    
    if (!task) {
      // Try parsing as number if string doesn't work
      const numericId = parseInt(taskId);
      if (!isNaN(numericId)) {
        console.log('🔍 Trying numeric ID:', numericId);
        task = await db.get('tasks', numericId);
        console.log('🔍 Numeric ID lookup result:', task);
        if (task) {
          actualTaskId = numericId;
          console.log('✅ Found task with numeric ID:', numericId);
        }
      }
    } else {
      console.log('✅ Found task with string ID:', taskId);
    }
    
    if (!task) {
      console.warn('⚠️ Task not found for ID:', taskId);
      return { success: false, error: `任务未找到 (ID: ${taskId})` };
    }

    try {
      const now = new Date().toISOString();
      const updatedTask = {
        ...task,
        status: 'completed' as const,
        progress: 100,
        completed_at: now,
        updated_at: now
      };
      
      console.log('🔄 Updating task:', updatedTask);
      
      // Use a transaction to ensure data consistency
      const transaction = db.transaction(['tasks'], 'readwrite');
      const store = transaction.objectStore('tasks');
      await store.put(updatedTask);
      
      // Wait for transaction to complete
      await new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve(true);
        transaction.onerror = () => reject(transaction.error);
      });
      
      console.log('✅ Task status updated to completed:', task.id);
      
      // Verify the update
      const verifyTask = await db.get('tasks', actualTaskId);
      console.log('🔍 Verification - Updated task:', verifyTask);
      
    } catch (updateError) {
      console.error('❌ Failed to update task:', updateError);
      return { success: false, error: `更新任务失败: ${updateError}` };
    }

    // Create response record
    const response: Omit<Response, 'id'> = {
      task_id: actualTaskId.toString(),
      patient_id: patientId,
      questionnaire_type: questionnaireType,
      answers: answers,
      scores: scores,
      total_score: totalScore,
      completed_at: new Date().toISOString(),
      is_visible_to_patient: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const responseId = await db.add('responses', response);
    const savedResponse = await db.get('responses', responseId);

    // Log the action
    const currentUser = await getCurrentUserSession();
    if (currentUser) {
      await logAuditAction({
        user_id: currentUser.user_id,
        user_role: currentUser.role,
        action: 'create',
        resource_type: 'response',
        resource_id: responseId.toString(),
        details: { questionnaire_type: questionnaireType, total_score: totalScore }
      });
    }

    return { success: true, data: savedResponse };
  } catch (error) {
    console.error('Error submitting questionnaire response:', error);
    return { success: false, error: '提交问卷时出现错误' };
  }
}

/**
 * Get task by patient and questionnaire type - prefer active tasks, but return latest if none active
 */
export async function getCurrentTask(patientId: string, questionnaireType: 'haemqol' | 'hal'): Promise<DatabaseResult<Task | null>> {
  try {
    const db = await initDB();
    
    const tasksIndex = db.transaction('tasks').store.index('patient_id');
    const tasks = await tasksIndex.getAll(patientId);
    
    // Filter tasks for this questionnaire type
    const questionnaireTasks = tasks.filter(task => task.questionnaire_id === questionnaireType);
    
    if (questionnaireTasks.length === 0) {
      return { success: true, data: null };
    }
    
    // FIXED: Only return active tasks (not_started or in_progress)
    // Never return completed tasks to ensure task independence
    const activeTask = questionnaireTasks.find(task => 
      task.status === 'not_started' || task.status === 'in_progress'
    );

    if (activeTask) {
      console.log(`✅ Found active ${questionnaireType} task:`, activeTask.id, 'status:', activeTask.status);
      return { success: true, data: activeTask };
    }
    
    // FIXED: Return null instead of completed task to maintain independence
    console.log(`ℹ️ No active ${questionnaireType} task found for patient ${patientId}`);
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting current task:', error);
    return { success: false, error: '获取当前任务时出现错误' };
  }
}

/**
 * Get active task for a specific questionnaire type
 * Ensures each doctor assignment or patient self-start has independent task ID
 */
export async function getActiveTaskForQuestionnaire(
  patientId: string, 
  questionnaireType: 'haemqol' | 'hal'
): Promise<DatabaseResult<Task | null>> {
  try {
    const db = await initDB();
    
    const tasksIndex = db.transaction('tasks').store.index('patient_id');
    const tasks = await tasksIndex.getAll(patientId);
    
    // Find the most recent active task for this questionnaire type
    const activeTasks = tasks
      .filter(task => 
        task.questionnaire_id === questionnaireType && 
        (task.status === 'not_started' || task.status === 'in_progress')
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    if (activeTasks.length > 0) {
      console.log(`✅ Found active ${questionnaireType} task:`, activeTasks[0].id);
      return { success: true, data: activeTasks[0] };
    }
    
    return { success: true, data: null };
  } catch (error) {
    console.error('Error getting active task:', error);
    return { success: false, error: '获取活跃任务时出现错误' };
  }
}

/**
 * Get or create a task for patient self-start questionnaire
 * Simplified to prevent duplicate task creation
 */
export async function getOrCreatePatientTask(
  patientId: string,
  questionnaireType: 'haemqol' | 'hal',
  source: 'doctor_assigned' | 'patient_self' = 'patient_self'
): Promise<DatabaseResult<Task>> {
  try {
    const db = await initDB();
    
    // Check for any existing task for this questionnaire type in the last hour
    const allTasks = await db.getAll('tasks');
    const recentTasks = allTasks.filter(task => 
      task.patient_id === patientId && 
      task.questionnaire_id === questionnaireType
    );
    
    if (recentTasks.length > 0) {
      // Sort by creation time, get the most recent
      recentTasks.sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      const mostRecentTask = recentTasks[0];
      const createdTime = new Date(mostRecentTask.created_at);
      const timeDiff = Date.now() - createdTime.getTime();
      
      // If created within last hour, reuse it
      if (timeDiff < 60 * 60 * 1000) { // 1 hour
        console.log(`⏭️ Reusing recent ${questionnaireType} task:`, mostRecentTask.id, 'created:', mostRecentTask.created_at);
        return { success: true, data: mostRecentTask };
      }
    }
    
    // No recent task found, create a new one
    console.log(`🆕 Creating new ${questionnaireType} task for patient ${patientId} (${source})`);
    
    const newTaskResult = await assignQuestionnaire(patientId, questionnaireType, {
      instructions: source === 'patient_self' ? '患者自主开始的问卷' : '医生分配的问卷',
      priority: 'normal'
    });
    
    if (newTaskResult.success && newTaskResult.data) {
      console.log(`✅ Created new independent ${questionnaireType} task:`, newTaskResult.data.id);
      return newTaskResult;
    }
    
    return { success: false, error: '创建任务失败' };
  } catch (error) {
    console.error('Error getting or creating patient task:', error);
    return { success: false, error: '获取或创建任务时出现错误' };
  }
}

/**
 * Get all tasks for a patient and questionnaire type (including completed)
 * Used for history and analysis
 */
export async function getAllTasksForQuestionnaire(
  patientId: string,
  questionnaireType: 'haemqol' | 'hal'
): Promise<DatabaseResult<Task[]>> {
  try {
    const db = await initDB();
    
    const tasksIndex = db.transaction('tasks').store.index('patient_id');
    const tasks = await tasksIndex.getAll(patientId);
    
    const questionnaireTasks = tasks
      .filter(task => task.questionnaire_id === questionnaireType)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    return { success: true, data: questionnaireTasks };
  } catch (error) {
    console.error('Error getting all tasks for questionnaire:', error);
    return { success: false, error: '获取问卷任务历史时出现错误' };
  }
}

export async function performDatabaseMaintenance(userId?: string): Promise<void> {
  try {
    console.log('🔧 Starting database maintenance...');
    const db = await initDB();
    
    if (userId) {
      // Simplified user-specific maintenance
      console.log('Performing simplified maintenance for user:', userId);
      // Note: Complex cleanup removed to simplify database operations
    } else {
      // System-wide maintenance
      console.log('Performing system-wide database maintenance...');
      
      // Get all questionnaire answers
      const allRecords = await db.getAll('questionnaire_answers');
      console.log('Found', allRecords.length, 'total questionnaire records');
      
      // Group by user and type to find duplicates
      const recordGroups = new Map<string, any[]>();
      
      for (const record of allRecords) {
        const key = `${record.user_id}_${record.type}`;
        if (!recordGroups.has(key)) {
          recordGroups.set(key, []);
        }
        recordGroups.get(key)!.push(record);
      }
      
      // Clean up duplicates for each group
      let duplicateGroupCount = 0;
      let totalDuplicatesRemoved = 0;
      
      for (const [key, records] of recordGroups) {
        if (records.length > 1) {
          duplicateGroupCount++;
          const [userId, type] = key.split('_');
          
          console.log(`Found ${records.length} duplicate ${type} records for user ${userId}`);
          
          // Sort to keep the best record (most recent with most data)
          records.sort((a, b) => {
            // First priority: most data
            const dataCountA = Object.keys(a.data || {}).length;
            const dataCountB = Object.keys(b.data || {}).length;
            if (dataCountA !== dataCountB) return dataCountB - dataCountA;
            
            // Second priority: most recent timestamp
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            if (timeA !== timeB) return timeB - timeA;
            
            // Third priority: highest ID
            return (b.id || 0) - (a.id || 0);
          });
          
          const recordToKeep = records[0];
          const recordsToDelete = records.slice(1);
          
          for (const record of recordsToDelete) {
            await db.delete('questionnaire_answers', record.id);
            totalDuplicatesRemoved++;
            console.log(`Deleted duplicate ${type} record ${record.id} for user ${userId}`);
          }
          
          console.log(`Kept ${type} record ${recordToKeep.id} with ${Object.keys(recordToKeep.data || {}).length} answers for user ${userId}`);
        }
      }
      
      console.log(`✅ Database maintenance complete: ${duplicateGroupCount} duplicate groups found, ${totalDuplicatesRemoved} duplicate records removed`);
    }
  } catch (error) {
    console.error('❌ Database maintenance failed:', error);
  }
}

export async function validateUserData(userId: string): Promise<{
  sessionStorageHAL: number;
  indexedDBHAL: number;
  sessionStorageHAEMQOL: number;
  indexedDBHAEMQOL: number;
  issues: string[];
}> {
  const issues: string[] = [];
  let sessionStorageHAL = 0;
  let indexedDBHAL = 0;
  let sessionStorageHAEMQOL = 0;
  let indexedDBHAEMQOL = 0;
  
  try {
    // Check sessionStorage
    const halKey = getUserSpecificKey(STORAGE_KEYS.ANSWERS, userId);
    const haemqolKey = getUserSpecificKey(STORAGE_KEYS.HAEMQOL_ANSWERS, userId);
    
    const sessionHAL = sessionStorage.getItem(halKey);
    if (sessionHAL) {
      try {
        const halData = JSON.parse(sessionHAL);
        sessionStorageHAL = Object.keys(halData).length;
      } catch (error) {
        issues.push('SessionStorage HAL data is corrupted');
      }
    }
    
    const sessionHAEMQOL = sessionStorage.getItem(haemqolKey);
    if (sessionHAEMQOL) {
      try {
        const haemqolData = JSON.parse(sessionHAEMQOL);
        sessionStorageHAEMQOL = Object.keys(haemqolData).length;
      } catch (error) {
        issues.push('SessionStorage HAEMQOL data is corrupted');
      }
    }
    
    // Check IndexedDB
    const db = await initDB();
    const records = await db.getAllFromIndex('questionnaire_answers', 'user_id', userId);
    
    const halRecords = records.filter(r => r.type === 'hal_answers');
    const haemqolRecords = records.filter(r => r.type === 'haemqol_answers');
    
    if (halRecords.length > 1) {
      issues.push(`Multiple HAL records found in IndexedDB (${halRecords.length})`);
    }
    if (haemqolRecords.length > 1) {
      issues.push(`Multiple HAEMQOL records found in IndexedDB (${haemqolRecords.length})`);
    }
    
    if (halRecords.length > 0) {
      const halRecord = halRecords[0];
      indexedDBHAL = Object.keys(halRecord.data || {}).length;
    }
    
    if (haemqolRecords.length > 0) {
      const haemqolRecord = haemqolRecords[0];
      indexedDBHAEMQOL = Object.keys(haemqolRecord.data || {}).length;
    }
    
    // Check for inconsistencies
    if (sessionStorageHAL > 0 && indexedDBHAL === 0) {
      issues.push('HAL data exists in sessionStorage but missing from IndexedDB');
    }
    if (sessionStorageHAL === 0 && indexedDBHAL > 0) {
      issues.push('HAL data exists in IndexedDB but missing from sessionStorage');
    }
    if (sessionStorageHAEMQOL > 0 && indexedDBHAEMQOL === 0) {
      issues.push('HAEMQOL data exists in sessionStorage but missing from IndexedDB');
    }
    if (sessionStorageHAEMQOL === 0 && indexedDBHAEMQOL > 0) {
      issues.push('HAEMQOL data exists in IndexedDB but missing from sessionStorage');
    }
    
    if (sessionStorageHAL > 0 && indexedDBHAL > 0 && Math.abs(sessionStorageHAL - indexedDBHAL) > 5) {
      issues.push(`HAL data mismatch: sessionStorage(${sessionStorageHAL}) vs IndexedDB(${indexedDBHAL})`);
    }
    if (sessionStorageHAEMQOL > 0 && indexedDBHAEMQOL > 0 && Math.abs(sessionStorageHAEMQOL - indexedDBHAEMQOL) > 5) {
      issues.push(`HAEMQOL data mismatch: sessionStorage(${sessionStorageHAEMQOL}) vs IndexedDB(${indexedDBHAEMQOL})`);
    }
    
  } catch (error) {
    issues.push(`Validation error: ${error}`);
  }
  
  return {
    sessionStorageHAL,
    indexedDBHAL,
    sessionStorageHAEMQOL,
    indexedDBHAEMQOL,
    issues
  };
}

// Add task-based answer storage functions after existing functions

export async function saveTaskSpecificAnswers(
  taskId: string, 
  questionnaireType: 'hal' | 'haemqol',
  answers: HalAnswers | HaemqolAnswers, 
  userId?: string
): Promise<void> {
  if (!isBrowser()) return;
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.warn('No user ID available for saving task-specific answers');
      return;
    }

    // Save to sessionStorage with task-specific key
    const taskKey = `task_${taskId}_${questionnaireType}_answers`;
    sessionStorage.setItem(taskKey, JSON.stringify(answers));
    console.log(`${questionnaireType.toUpperCase()} answers saved to sessionStorage for task:`, taskId, 'answers count:', Object.keys(answers).length);
    
    // Also save to user-specific key for backward compatibility
    const userKey = getUserSpecificKey(
      questionnaireType === 'hal' ? STORAGE_KEYS.ANSWERS : STORAGE_KEYS.HAEMQOL_ANSWERS, 
      currentUserId
    );
    sessionStorage.setItem(userKey, JSON.stringify(answers));
    
    // Save to IndexedDB with task-specific record
    const db = await initDB();
    
    // Clean up any duplicate records for this specific task
    try {
      const allRecords = await db.getAll('questionnaire_answers');
      const taskRecords = allRecords.filter(record => 
        record.task_id === taskId || 
        (record.user_id === currentUserId && record.type === `${questionnaireType}_answers`)
      );
      
      if (taskRecords.length > 1) {
        console.log(`Found ${taskRecords.length} records for task ${taskId}, cleaning up...`);
        
        // Keep the record with task_id if it exists, otherwise keep the most recent
        taskRecords.sort((a, b) => {
          // Prioritize records with task_id
          if (a.task_id && !b.task_id) return -1;
          if (!a.task_id && b.task_id) return 1;
          
          // Then by timestamp
          const timeA = new Date(a.timestamp || 0).getTime();
          const timeB = new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        
        const recordToKeep = taskRecords[0];
        const recordsToDelete = taskRecords.slice(1);
        
        for (const record of recordsToDelete) {
          await db.delete('questionnaire_answers', record.id);
          console.log(`Deleted duplicate task record ${record.id} for task ${taskId}`);
        }
      }
    } catch (cleanupError) {
      console.warn('Cleanup failed:', cleanupError);
    }
    
    const recordData = {
      user_id: currentUserId,
      task_id: taskId,
      type: `${questionnaireType}_answers`,
      data: answers,
      timestamp: new Date().toISOString()
    };
    
    // Try to find existing record for this task
    let existingRecord = null;
    try {
      const allUserRecords = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
      existingRecord = allUserRecords.find(record => record.task_id === taskId);
    } catch (error) {
      console.warn('Could not query existing task records:', error);
    }
    
    if (existingRecord) {
      // Update existing task record
      const updatedRecord = { ...existingRecord, ...recordData };
      await db.put('questionnaire_answers', updatedRecord);
      console.log(`${questionnaireType.toUpperCase()} answers updated for task:`, taskId, 'record id:', updatedRecord.id);
    } else {
      // Create new task record
      try {
        const newId = await db.add('questionnaire_answers', recordData);
        console.log(`${questionnaireType.toUpperCase()} answers created for task:`, taskId, 'new record id:', newId);
      } catch (addError) {
        console.warn('Add failed, trying put:', addError);
        const putRecord = { 
          ...recordData, 
          id: `task_${taskId}_${questionnaireType}_${Date.now()}`
        };
        await db.put('questionnaire_answers', putRecord);
        console.log(`${questionnaireType.toUpperCase()} answers saved via put for task:`, taskId);
      }
    }
    
  } catch (error) {
    console.error(`Error saving task-specific ${questionnaireType} answers:`, error);
  }
}

export async function loadTaskSpecificAnswers(
  taskId: string, 
  questionnaireType: 'hal' | 'haemqol',
  userId?: string
): Promise<HalAnswers | HaemqolAnswers> {
  if (!isBrowser()) return {};
  
  try {
    const currentUserId = userId || await getCurrentUserId();
    if (!currentUserId) {
      console.log('No user ID available for loading task-specific answers');
      return {};
    }
    
    // Try task-specific sessionStorage first
    const taskKey = `task_${taskId}_${questionnaireType}_answers`;
    const taskSessionData = sessionStorage.getItem(taskKey);
    if (taskSessionData) {
      try {
        const parsedData = JSON.parse(taskSessionData);
        const answerCount = Object.keys(parsedData).length;
        console.log(`Loaded ${questionnaireType.toUpperCase()} answers from task sessionStorage:`, taskId, 'answers count:', answerCount);
        if (answerCount > 0) return parsedData;
      } catch (parseError) {
        console.warn(`Failed to parse task sessionStorage ${questionnaireType} data:`, parseError);
      }
    }
    
    // Try IndexedDB for task-specific record
    const db = await initDB();
    let taskData = null;
    
    try {
      const allRecords = await db.getAllFromIndex('questionnaire_answers', 'user_id', currentUserId);
      taskData = allRecords.find(record => record.task_id === taskId);
      
      if (taskData && taskData.data) {
        const answerCount = Object.keys(taskData.data).length;
        console.log(`Loaded ${questionnaireType.toUpperCase()} answers from IndexedDB for task:`, taskId, 'answers count:', answerCount);
        
        // Restore to task-specific sessionStorage
        sessionStorage.setItem(taskKey, JSON.stringify(taskData.data));
        return taskData.data;
      }
    } catch (error) {
      console.warn(`Error loading task-specific ${questionnaireType} answers:`, error);
    }
    
    // Fallback to user-specific data (for backward compatibility)
    console.log(`No task-specific data found for task ${taskId}, falling back to user data`);
    if (questionnaireType === 'hal') {
      return await loadUserSpecificAnswers(currentUserId);
    } else {
      return await loadUserSpecificHaemqolAnswers(currentUserId);
    }
    
  } catch (error) {
    console.error(`Error loading task-specific ${questionnaireType} answers:`, error);
    return {};
  }
}

export async function getTaskAnswersHistory(
  userId: string, 
  questionnaireType: 'hal' | 'haemqol'
): Promise<Array<{ taskId: string; answers: any; timestamp: string; answerCount: number }>> {
  try {
    const db = await initDB();
    const allRecords = await db.getAllFromIndex('questionnaire_answers', 'user_id', userId);
    
    const typeRecords = allRecords.filter(record => 
      record.type === `${questionnaireType}_answers` && record.task_id
    );
    
    const history = typeRecords.map(record => ({
      taskId: record.task_id,
      answers: record.data || {},
      timestamp: record.timestamp || '',
      answerCount: Object.keys(record.data || {}).length
    }));
    
    // Sort by timestamp (newest first)
    history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    console.log(`Found ${history.length} ${questionnaireType} answer histories for user ${userId}`);
    return history;
    
  } catch (error) {
    console.error(`Error getting task answers history:`, error);
    return [];
  }
} 

/**
 * Get patient's own questionnaire history (patients can see their own data)
 */
export async function getPatientQuestionnaireHistory(patientId: string): Promise<DatabaseResult<Response[]>> {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return { success: false, error: '未登录' };
    }

    // Patients can only access their own history
    if (session.role === 'patient' && session.user_id !== patientId) {
      return { success: false, error: '只能查看自己的问卷历史' };
    }

    // For doctors, allow access to any patient's history
    if (session.role === 'doctor') {
      const accessCheck = await checkDoctorAccess();
      if (!accessCheck.allowed) {
        return { success: false, error: accessCheck.reason || '权限不足' };
      }
    }

    const db = await initDB();
    
    // Get all responses for the patient from responses table
    const responses = await db.getAll('responses');
    const patientResponses = responses.filter(response => response.patient_id === patientId);
    
    // Also check questionnaire_answers table for additional data
    const questionnaireAnswers = await db.getAll('questionnaire_answers');
    const patientAnswers = questionnaireAnswers.filter(record => record.user_id === patientId);
    
    console.log('🔍 Debug - Found responses in responses table:', patientResponses.length);
    console.log('🔍 Debug - Found answers in questionnaire_answers table:', patientAnswers.length);
    
    // Enhanced duplicate detection with multiple identifiers per response
    const responseTracker = new Map<string, Set<string>>();
    const responseByTaskId = new Map<string, Response>();
    const responseByTimestamp = new Map<string, Response>();
    
    // Track all existing responses with multiple identifiers
    patientResponses.forEach(response => {
      const key = response.questionnaire_type;
      if (!responseTracker.has(key)) {
        responseTracker.set(key, new Set());
      }
      
      // Track by multiple identifiers to catch all possible duplicates
      const identifiers = [
        response.task_id,
        response.completed_at,
        response.created_at,
        `${response.questionnaire_type}_${response.total_score}_${response.completed_at}`
      ].filter(Boolean);
      
      identifiers.forEach(id => {
        responseTracker.get(key)!.add(id);
        if (response.task_id) responseByTaskId.set(response.task_id, response);
        if (response.completed_at) responseByTimestamp.set(response.completed_at, response);
      });
    });
    
    // Convert questionnaire_answers to Response format for compatibility
    // But only if we don't already have a proper response for the same questionnaire type
    for (const answerRecord of patientAnswers) {
      const questionnaireType = answerRecord.type === 'hal_answers' ? 'hal' : 'haemqol';
      
      // Multiple ways to check for existing responses
      const possibleIdentifiers = [
        answerRecord.task_id,
        answerRecord.timestamp,
        `${questionnaireType}_${answerRecord.timestamp}`
      ].filter(Boolean);
      
      // Check if we already have a response with any of these identifiers
      const typeTracker = responseTracker.get(questionnaireType);
      const hasExistingResponse = typeTracker && possibleIdentifiers.some(id => typeTracker.has(id));
      
      // Additional check: if task_id exists, ensure no response with same task_id
      const hasTaskIdConflict = answerRecord.task_id && responseByTaskId.has(answerRecord.task_id);
      
      if (!hasExistingResponse && !hasTaskIdConflict) {
        // Only create pseudo-response if we don't have a real response for this instance
        const pseudoResponse: Response = {
          id: `ans_${answerRecord.id}`,
          patient_id: patientId,
          task_id: answerRecord.task_id || '',
          questionnaire_type: questionnaireType,
          answers: answerRecord.data || {},
          created_at: answerRecord.timestamp || new Date().toISOString(),
          completed_at: answerRecord.timestamp || new Date().toISOString(),
          updated_at: answerRecord.timestamp || new Date().toISOString(),
          is_visible_to_patient: true,
          total_score: 0 // Will be calculated
        };
        
        // Calculate score based on questionnaire type
        try {
          const { generateScoreAnalysis } = await import('./score-analysis');
          const analysis = generateScoreAnalysis(pseudoResponse.questionnaire_type as 'hal' | 'haemqol', pseudoResponse.answers);
          pseudoResponse.total_score = analysis.totalScore;
        } catch (scoreError) {
          console.warn('Failed to calculate score:', scoreError);
          pseudoResponse.total_score = 0;
        }
        
        patientResponses.push(pseudoResponse);
        console.log(`✅ Added pseudo-response for ${pseudoResponse.questionnaire_type} with score ${pseudoResponse.total_score}`);
        
        // Update tracking for this new response
        if (!responseTracker.has(questionnaireType)) {
          responseTracker.set(questionnaireType, new Set());
        }
        possibleIdentifiers.forEach(id => {
          responseTracker.get(questionnaireType)!.add(id);
        });
      } else {
        console.log(`⏭️ Skipped duplicate ${questionnaireType} record (existing response detected with identifiers: ${possibleIdentifiers.join(', ')})`);
      }
    }
    
    // Sort by creation date (newest first)
    patientResponses.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    console.log('🔍 Debug - Total responses after merge:', patientResponses.length);

    return { success: true, data: patientResponses };
  } catch (error) {
    console.error('Error getting patient questionnaire history:', error);
    return { success: false, error: '获取问卷历史时出现错误' };
  }
}

/**
 * Get patient's assigned tasks (both patients and doctors can see)
 */
export async function getPatientAssignedTasks(patientId: string): Promise<DatabaseResult<Task[]>> {
  try {
    const session = await getCurrentUserSession();
    if (!session) {
      return { success: false, error: '未登录' };
    }

    // Patients can only access their own tasks
    if (session.role === 'patient' && session.user_id !== patientId) {
      return { success: false, error: '只能查看自己的任务' };
    }

    const db = await initDB();
    const allTasks = await db.getAll('tasks');
    
    const patientTasks = allTasks
      .filter(task => task.patient_id === patientId)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return { success: true, data: patientTasks };
  } catch (error) {
    console.error('Error getting patient assigned tasks:', error);
    return { success: false, error: '获取任务列表时出现错误' };
  }
}
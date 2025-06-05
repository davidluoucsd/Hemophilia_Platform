/**
 * Patient Data Synchronization Utilities
 * Ensures patient data created on patient side is visible to doctors
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { Patient } from '../types/database';
import { initDB, setUserSession, getCurrentUserSession } from './database';

/**
 * Create or update patient record with minimal data
 * This ensures patient exists in database immediately after login
 */
export async function ensurePatientExists(patientId: string, name: string): Promise<Patient> {
  try {
    const db = await initDB();
    
    // Check if patient already exists
    let existingPatient = await db.get('patients', patientId);
    
    if (existingPatient) {
      // Update name if it's different
      if (existingPatient.name !== name) {
        existingPatient.name = name;
        existingPatient.updated_at = new Date().toISOString();
        await db.put('patients', existingPatient);
      }
      return existingPatient;
    }
    
    // Create new patient with minimal data
    const newPatient: Patient = {
      id: patientId,
      name: name,
      age: 0, // Will be updated when patient fills info form
      weight: 0,
      height: 0,
      doctor_id: undefined, // Will be assigned by doctor later
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    await db.put('patients', newPatient);
    console.log('Created new patient record:', newPatient);
    
    return newPatient;
  } catch (error) {
    console.error('Error ensuring patient exists:', error);
    throw error;
  }
}

/**
 * Enhanced patient login that creates database record immediately
 */
export async function patientLogin(patientId: string, name: string): Promise<{success: boolean, patient: Patient | null, isNewPatient: boolean}> {
  try {
    // First, ensure patient exists in database
    const patient = await ensurePatientExists(patientId, name);
    
    // Determine if this is a new patient (no meaningful data filled yet)
    const isNewPatient = patient.age === 0 || patient.weight === 0 || patient.height === 0;
    
    // Create user session
    await setUserSession({
      user_id: patientId,
      role: 'patient',
      name: name,
      login_time: new Date().toISOString(),
      last_activity: new Date().toISOString()
    });
    
    console.log('Patient login successful:', { patientId, name, isNewPatient });
    
    return {
      success: true,
      patient: patient,
      isNewPatient: isNewPatient
    };
  } catch (error) {
    console.error('Error during patient login:', error);
    return {
      success: false,
      patient: null,
      isNewPatient: false
    };
  }
}

/**
 * Update patient basic information with proper upsert logic
 */
export async function updatePatientBasicInfo(
  patientId: string, 
  updates: { name?: string; age?: number; weight?: number; height?: number }
): Promise<{success: boolean, patient: Patient | null}> {
  try {
    const db = await initDB();
    
    // Get existing patient or create new structure
    let existingPatient: Patient | undefined;
    try {
      existingPatient = await db.get('patients', patientId);
    } catch (error) {
      console.log('Patient not found, will create new record with provided updates');
    }
    
    // Create patient data with updates
    const now = new Date().toISOString();
    const updatedPatient: Patient = {
      id: patientId,
      name: updates.name || existingPatient?.name || '',
      age: updates.age !== undefined ? updates.age : (existingPatient?.age || 0),
      weight: updates.weight !== undefined ? updates.weight : (existingPatient?.weight || 0),
      height: updates.height !== undefined ? updates.height : (existingPatient?.height || 0),
      doctor_id: existingPatient?.doctor_id,
      created_at: existingPatient?.created_at || now,
      updated_at: now
    };
    
    // Use put for upsert behavior (create or update)
    await db.put('patients', updatedPatient);
    console.log(`Patient basic info ${existingPatient ? 'updated' : 'created'} for ID:`, patientId, updates);
    
    return {
      success: true,
      patient: updatedPatient
    };
  } catch (error) {
    console.error('Error updating patient basic info:', error);
    return {
      success: false,
      patient: null
    };
  }
}

/**
 * Get patient info - works for both patients and doctors
 */
export async function getPatientInfo(patientId: string): Promise<{success: boolean, patient: Patient | null}> {
  try {
    const db = await initDB();
    const patient = await db.get('patients', patientId);
    
    return {
      success: true,
      patient: patient || null
    };
  } catch (error) {
    console.error('Error getting patient info:', error);
    return {
      success: false,
      patient: null
    };
  }
}

/**
 * Sync patient data from legacy storage to new database
 * This helps migrate existing patient data
 */
export async function syncLegacyPatientData(): Promise<void> {
  try {
    // Get current user session
    const session = await getCurrentUserSession();
    if (!session || session.role !== 'patient') {
      return;
    }
    
    // Check if patient exists in new database
    const { success, patient } = await getPatientInfo(session.user_id);
    if (!success || !patient) {
      // Create patient record
      await ensurePatientExists(session.user_id, session.name);
    }
  } catch (error) {
    console.error('Error syncing legacy patient data:', error);
  }
}

/**
 * Validate patient data completeness
 */
export function isPatientDataComplete(patient: Patient): boolean {
  return patient.age > 0 && patient.weight > 0 && patient.height > 0 && patient.name.trim().length > 0;
}

/**
 * Get patient completion status
 */
export function getPatientCompletionStatus(patient: Patient): {
  isComplete: boolean;
  missingFields: string[];
  completionPercentage: number;
} {
  const requiredFields = [
    { key: 'name', label: '姓名', valid: patient.name.trim().length > 0 },
    { key: 'age', label: '年龄', valid: patient.age > 0 },
    { key: 'weight', label: '体重', valid: patient.weight > 0 },
    { key: 'height', label: '身高', valid: patient.height > 0 }
  ];
  
  const completedFields = requiredFields.filter(field => field.valid);
  const missingFields = requiredFields.filter(field => !field.valid).map(field => field.label);
  
  return {
    isComplete: missingFields.length === 0,
    missingFields,
    completionPercentage: Math.round((completedFields.length / requiredFields.length) * 100)
  };
} 
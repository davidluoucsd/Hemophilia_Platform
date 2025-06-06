/**
 * Database Types - Data Model Definitions
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

// Doctor table - 医生表
export interface Doctor {
  id: string;
  name: string;
  password_hash: string;
  department?: string;
  created_at: string;
  updated_at?: string;
}

// Patient table - 患者表 (基础信息，患者可编辑)
export interface Patient {
  id: string;
  name: string;
  age: number;
  weight: number; // kg
  height: number; // cm
  doctor_id?: string; // 关联的医生ID
  created_at: string;
  updated_at: string;
}

// Medical information table - 医疗信息表 (医生专属)
export interface MedicalInfo {
  id: string;
  patient_id: string;
  treatment_frequency: number; // 每周治疗次数
  treatment_dose: number; // 治疗剂量 IU/kg
  evaluation_date: string; // 评估日期
  next_follow_up: string; // 下次随访日期
  doctor_id: string; // 填写医生ID
  diagnosis_info?: string; // 诊断信息
  treatment_plan?: string; // 治疗方案
  notes?: string; // 备注
  created_at: string;
  updated_at: string;
}

// Questionnaire table - 问卷表
export interface Questionnaire {
  id: string;
  name: string;
  type: 'haemqol' | 'hal' | 'custom'; // 问卷类型
  questions_schema: any; // 问卷结构JSON
  target_audience: 'patient' | 'doctor' | 'both'; // 目标用户
  description?: string;
  estimated_time?: number; // 预计完成时间(分钟)
  created_at: string;
  updated_at?: string;
}

// Task table - 任务表
export interface Task {
  id: string;
  patient_id: string;
  questionnaire_id: string;
  assigned_by_doctor_id?: string; // 分配任务的医生ID
  due_date?: string; // 截止时间
  status: 'not_started' | 'in_progress' | 'completed' | 'expired'; // 任务状态
  progress: number; // 进度百分比 0-100
  priority?: 'normal' | 'urgent'; // 优先级
  instructions?: string; // 说明备注
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

// Response table - 回答表
export interface Response {
  id: string;
  task_id: string;
  patient_id: string; // 冗余字段，便于查询
  questionnaire_type: 'haemqol' | 'hal'; // 问卷类型
  answers: any; // 问卷答案JSON
  scores?: any; // 评分结果JSON
  total_score?: number; // 总分
  analysis?: any; // 分析结果JSON
  completed_at?: string;
  is_visible_to_patient: boolean; // 患者是否可见评分结果
  doctor_notes?: string; // 医生备注
  created_at: string;
  updated_at: string;
}

// User session data - 用户会话数据
export interface UserSession {
  user_id: string;
  role: 'doctor' | 'patient';
  name: string;
  login_time: string;
  last_activity: string;
}

// Data access permissions - 数据访问权限
export interface DataPermission {
  user_id: string;
  role: 'doctor' | 'patient';
  resource_type: 'patient' | 'medical_info' | 'response' | 'task';
  resource_id: string;
  permissions: ('read' | 'write' | 'delete')[];
}

// Patient dashboard data - 患者Dashboard数据
export interface PatientDashboardData {
  patient: Patient;
  medical_info?: Partial<MedicalInfo>; // 只显示基础医疗信息，不包含敏感数据
  active_tasks: Task[];
  completed_tasks: Task[];
  last_login?: string;
}

// Doctor dashboard data - 医生Dashboard数据
export interface DoctorDashboardData {
  doctor: Doctor;
  total_patients: number;
  active_patients: number;
  pending_tasks: number;
  completed_this_week: number;
  recent_completions: {
    patient_name: string;
    questionnaire_name: string;
    completed_at: string;
    score?: number;
  }[];
}

// Database operation result - 数据库操作结果
export interface DatabaseResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// Permission check result - 权限检查结果
export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  required_role?: 'doctor' | 'patient';
}

// Data export options - 数据导出选项
export interface ExportOptions {
  format: 'csv' | 'excel' | 'pdf';
  include_scores: boolean;
  include_medical_info: boolean;
  date_range?: {
    start: string;
    end: string;
  };
  patient_ids?: string[];
}

// Audit log - 审计日志
export interface AuditLog {
  id: string;
  user_id: string;
  user_role: 'doctor' | 'patient';
  action: 'create' | 'read' | 'update' | 'delete' | 'login' | 'logout';
  resource_type: string;
  resource_id?: string;
  details?: any;
  ip_address?: string;
  user_agent?: string;
  timestamp: string;
} 
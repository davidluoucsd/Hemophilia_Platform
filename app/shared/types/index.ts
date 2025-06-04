/**
 * HAL问卷系统类型定义
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

// 患者基本信息类型
export interface PatientInfo {
  patientName: string;
  age: string;
  weight: string;
  height: string;
  treatmentTimes: string;
  treatmentDose: string;
  evaluationDate: string;
  nextDate: string;
  ageGroup?: string; // 年龄段分类，自动计算
}

// 问卷答案类型 (q1-q42)
export type QuestionId = `q${number}`;
export type AnswerValue = "1" | "2" | "3" | "4" | "5" | "6" | "8" | "";

export interface HalAnswers {
  [key: QuestionId]: AnswerValue;
}

// 域得分类型 - 按照原始 app.js 中的命名
export interface DomainScores {
  LSKS: number | null;      // 躺坐跪站 (q1-q8)
  LEGS: number | null;      // 下肢功能 (q9-q17)
  ARMS: number | null;      // 上肢功能 (q18-q21)
  TRANS: number | null;     // 交通工具 (q22-q24)
  SELFC: number | null;     // 自我照料 (q25-q29)
  HOUSEH: number | null;    // 家务劳动 (q30-q35)
  LEISPO: number | null;    // 休闲体育 (q36-q42)
  
  // 兼容性字段，为了避免类型错误
  UPP?: number | null;      // 上肢功能 (旧命名) 
  LOWBAS?: number | null;   // 基础下肢功能 (旧命名)
  LOWCOM?: number | null;   // 复杂下肢功能 (旧命名)
  HOUSL?: number | null;    // 家务 (旧命名)
  LEHOW?: number | null;    // 休闲活动 (旧命名)
  WORK?: number | null;     // 工作和学校 (旧命名)
  
  // 扩展导出功能需要的属性
  newEncodedScores?: ReEncodedScores;  // 重编码得分
  sumScore?: number | null;            // 总分
}

// 重新编码得分类型
export interface ReEncodedScores {
  UPPER: number | null;     // 上肢功能 (重新编码)
  LOWBAS: number | null;    // 基本下肢功能 (重新编码)
  LOWCOM: number | null;    // 复杂下肢功能 (重新编码)
}

// 评估结果类型
export interface AssessmentResult {
  domainScores: DomainScores;
  newEncodedScores: ReEncodedScores;
  sumScore: number | null;
  haemqolScores?: HaemqolScores; // 添加HAEMO-QoL-A问卷分数
}

// 患者记录类型（用于存储和导出）
export interface PatientRecord {
  id?: number;                     // 记录ID（可选）
  timestamp?: string;              // 记录时间戳
  patientInfo: PatientInfo;        // 患者信息
  answers: HalAnswers;             // 问卷答案
  haemqolAnswers?: HaemqolAnswers; // HAEMO-QoL-A问卷答案
  assessmentResult: AssessmentResult; // 评估结果
}

// HAEMO-QoL-A问卷答案类型 (q1-q41)
export type HaemqolQuestionId = `hq${number}`;
export type HaemqolAnswerValue = "0" | "1" | "2" | "3" | "4" | "5" | "";

export interface HaemqolAnswers {
  [key: HaemqolQuestionId]: HaemqolAnswerValue;
}

// HAEMO-QoL-A问卷分数类型
export interface HaemqolScores {
  part1: number | null;  // 第一部分分数 (q1-q11)
  part2: number | null;  // 第二部分分数 (q12-q22) 
  part3: number | null;  // 第三部分分数 (q23-q36)
  part4: number | null;  // 第四部分分数 (q37-q41)
  total: number | null;  // 总分
} 
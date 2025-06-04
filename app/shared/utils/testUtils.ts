/**
 * Test Utilities - Random Data Generation for Testing
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { HalAnswers, HaemqolAnswers, PatientInfo } from '../types';

/**
 * Generate random HAL questionnaire answers
 */
export function generateRandomHalAnswers(): HalAnswers {
  const answers: HalAnswers = {};
  
  // HAL questionnaire has 42 questions (q1-q42)
  for (let i = 1; i <= 42; i++) {
    const questionId = `q${i}` as keyof HalAnswers;
    // Random answer between 1-6 (occasionally 8 for "not applicable")
    const possibleAnswers = ['1', '2', '3', '4', '5', '6'];
    if (Math.random() < 0.1) { // 10% chance of "not applicable"
      possibleAnswers.push('8');
    }
    const randomIndex = Math.floor(Math.random() * possibleAnswers.length);
    answers[questionId] = possibleAnswers[randomIndex] as any;
  }
  
  return answers;
}

/**
 * Generate random HAEMO-QoL-A questionnaire answers
 */
export function generateRandomHaemqolAnswers(): HaemqolAnswers {
  const answers: HaemqolAnswers = {};
  
  // HAEMO-QoL-A questionnaire has 41 questions (hq1-hq41)
  for (let i = 1; i <= 41; i++) {
    const questionId = `hq${i}` as keyof HaemqolAnswers;
    // Random answer between 0-5
    const possibleAnswers = ['0', '1', '2', '3', '4', '5'];
    const randomIndex = Math.floor(Math.random() * possibleAnswers.length);
    answers[questionId] = possibleAnswers[randomIndex] as any;
  }
  
  return answers;
}

/**
 * Generate random patient basic information (patient-editable fields only)
 */
export function generateRandomPatientBasicInfo(): Partial<PatientInfo> {
  const names = ['张三', '李四', '王五', '赵六', '钱七', '孙八', '周九', '吴十'];
  const randomName = names[Math.floor(Math.random() * names.length)];
  
  return {
    patientName: randomName,
    age: (18 + Math.floor(Math.random() * 50)).toString(), // Age 18-67
    weight: (45 + Math.floor(Math.random() * 50)).toString(), // Weight 45-94 kg
    height: (150 + Math.floor(Math.random() * 40)).toString(), // Height 150-189 cm
  };
}

/**
 * Generate complete random patient info (including medical fields - for doctor use)
 */
export function generateRandomCompletePatientInfo(): PatientInfo {
  const basicInfo = generateRandomPatientBasicInfo();
  const today = new Date();
  const nextMonth = new Date(today);
  nextMonth.setMonth(today.getMonth() + 1);
  
  return {
    ...basicInfo,
    patientName: basicInfo.patientName!,
    age: basicInfo.age!,
    weight: basicInfo.weight!,
    height: basicInfo.height!,
    treatmentTimes: (1 + Math.floor(Math.random() * 4)).toString(), // 1-4 times per week
    treatmentDose: (20 + Math.floor(Math.random() * 30)).toString(), // 20-49 IU/kg
    evaluationDate: today.toISOString().split('T')[0],
    nextDate: nextMonth.toISOString().split('T')[0],
  };
}

/**
 * Delay function for simulating form filling
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fill HAL questionnaire with random answers (with animation)
 */
export async function autoFillHalQuestionnaire(
  setAnswer: (questionId: string, value: string) => void,
  animationDelay: number = 50
): Promise<void> {
  const answers = generateRandomHalAnswers();
  
  for (const [questionId, value] of Object.entries(answers)) {
    setAnswer(questionId, value);
    await delay(animationDelay);
  }
}

/**
 * Fill HAEMO-QoL-A questionnaire with random answers (with animation)
 */
export async function autoFillHaemqolQuestionnaire(
  setHaemqolAnswer: (questionId: string, value: string) => void,
  animationDelay: number = 50
): Promise<void> {
  const answers = generateRandomHaemqolAnswers();
  
  for (const [questionId, value] of Object.entries(answers)) {
    setHaemqolAnswer(questionId, value);
    await delay(animationDelay);
  }
}

/**
 * Quick fill all questionnaires (no animation - for testing)
 */
export function quickFillAllQuestionnaires(): {
  halAnswers: HalAnswers;
  haemqolAnswers: HaemqolAnswers;
} {
  return {
    halAnswers: generateRandomHalAnswers(),
    haemqolAnswers: generateRandomHaemqolAnswers(),
  };
} 
/**
 * GAD-7 & PHQ-9 问卷系统 - 评分逻辑
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { HaemqolAnswers, HaemqolScores } from '../../shared/types';
import { HAEMQOL_SECTIONS, isReverseQuestion } from './questions';

// 定义问卷各部分的问题编号
const PART_QUESTIONS = {
  gad7: Array.from({ length: 7 }, (_, i) => i + 1),     // 问题1-7
  phq9: Array.from({ length: 9 }, (_, i) => i + 8)      // 问题8-16
};

/**
 * 处理答案值，直接返回原始分数
 * 
 * @param value 原始答案值
 * @param questionId 问题编号
 * @returns 处理后的分数
 */
function processAnswerValue(value: string, questionId: number): number {
  if (value === '' || isNaN(parseInt(value))) {
    return NaN; // 未回答或无效
  }
  
  const numValue = parseInt(value);
  
  // 直接返回原始分数
  return numValue;
}

/**
 * 计算特定部分的分数
 * 
 * @param answers 问卷答案
 * @param partQuestions 部分包含的问题编号数组
 * @returns 分数之和，如果没有有效答案则返回null
 */
function calculatePartScore(answers: HaemqolAnswers, partQuestions: number[]): number | null {
  let sum = 0;
  let validCount = 0;
  
  partQuestions.forEach(qNum => {
    const qId = `hq${qNum}` as keyof HaemqolAnswers;
    const rawValue = answers[qId] || '';
    const processedValue = processAnswerValue(rawValue, qNum);
    
    if (!isNaN(processedValue)) {
      sum += processedValue;
      validCount++;
    }
  });
  
  if (validCount === 0) return null;
  
  // 返回简单的分数总和
  return sum;
}

/**
 * 计算GAD-7和PHQ-9问卷的所有分数
 * 
 * @param answers 问卷答案
 * @returns 所有部分的分数和总分
 */
export function calculateHaemqolScores(answers: HaemqolAnswers): HaemqolScores {
  // 计算各部分分数
  const gad7Score = calculatePartScore(answers, PART_QUESTIONS.gad7);
  const phq9Score = calculatePartScore(answers, PART_QUESTIONS.phq9);
  
  // 计算总分（所有问题的分数总和）
  let totalScore = null;
  const allQuestions = [...PART_QUESTIONS.gad7, ...PART_QUESTIONS.phq9];
  let totalSum = 0;
  let validCount = 0;
  
  allQuestions.forEach(qNum => {
    const qId = `hq${qNum}` as keyof HaemqolAnswers;
    const rawValue = answers[qId] || '';
    const processedValue = processAnswerValue(rawValue, qNum);
    
    if (!isNaN(processedValue)) {
      totalSum += processedValue;
      validCount++;
    }
  });
  
  if (validCount > 0) {
    totalScore = totalSum;
  }
  
  return {
    part1: gad7Score,
    part2: phq9Score,
    part3: null,
    part4: null,
    total: totalScore
  };
}

/**
 * 检查GAD-7和PHQ-9问卷是否所有问题均已回答
 * 
 * @param answers 问卷答案
 * @returns 是否所有问题均已回答
 */
export function checkAllHaemqolQuestionsAnswered(answers: HaemqolAnswers): boolean {
  const totalQuestionCount = HAEMQOL_SECTIONS.reduce(
    (sum, section) => sum + section.questions.length, 
    0
  );
  
  for (let i = 1; i <= totalQuestionCount; i++) {
    const qId = `hq${i}` as keyof HaemqolAnswers;
    if (!answers[qId]) {
      return false;
    }
  }
  
  return true;
}

/**
 * 获取GAD-7和PHQ-9问卷中未回答的问题
 * 
 * @param answers 问卷答案
 * @returns 未回答问题的编号数组
 */
export function getUnansweredHaemqolQuestions(answers: HaemqolAnswers): number[] {
  const unanswered: number[] = [];
  const totalQuestionCount = HAEMQOL_SECTIONS.reduce(
    (sum, section) => sum + section.questions.length, 
    0
  );
  
  for (let i = 1; i <= totalQuestionCount; i++) {
    const qId = `hq${i}` as keyof HaemqolAnswers;
    if (!answers[qId]) {
      unanswered.push(i);
    }
  }
  
  return unanswered;
} 
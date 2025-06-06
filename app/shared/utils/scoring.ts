/**
 * HAL问卷系统 - 评分计算工具
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

import { HalAnswers, DomainScores, ReEncodedScores, AssessmentResult, PatientInfo } from '../types';

/**
 * 问卷领域的定义，包含各个领域的题号
 */
export const DOMAINS = {
  LSKS: [1, 2, 3, 4, 5, 6, 7, 8],            // 躺坐跪站 (q1-q8)
  LEGS: [9, 10, 11, 12, 13, 14, 15, 16, 17], // 下肢功能 (q9-q17)
  ARMS: [18, 19, 20, 21],                    // 上肢功能 (q18-q21)
  TRANS: [22, 23, 24],                       // 交通工具 (q22-q24)
  SELFC: [25, 26, 27, 28, 29],               // 自我照料 (q25-q29)
  HOUSEH: [30, 31, 32, 33, 34, 35],          // 家务劳动 (q30-q35)
  LEISPO: [36, 37, 38, 39, 40, 41, 42]       // 休闲体育 (q36-q42)
};

/**
 * 特殊组题号，需要重新编码
 */
export const SPECIAL_GROUPS = {
  UPPER:   [18,19,20,21,25,26,27,28,29],      // 上肢活动
  LOWBAS:  [8,9,10,11,12,13],                 // 基础下肢
  LOWCOM:  [3,4,5,6,7,14,15,16,17,22]         // 复杂下肢
};

/**
 * 计算标准化得分
 * 
 * @param domainRange 领域包含的题目号数组
 * @param answers 全部答案数据
 * @returns 标准化的领域得分 (0-100)，如果无有效答案则返回null
 */
export function calculateNormalizedScore(domainRange: number[], answers: HalAnswers): number | null {
  let sum = 0;
  let valid = 0;

  domainRange.forEach(qNum => {
    const qId = `q${qNum}` as keyof HalAnswers;
    const val = parseInt(answers[qId] || '', 10);
    if (!isNaN(val) && val !== 8) {
      sum += val; // 1~6
      valid++;
    }
  });

  if (valid === 0) return null;

  // 正确公式: 100 * (sum - valid) / (5 * valid)
  let score = ((sum - valid) * 100) / (5 * valid);
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return parseFloat(score.toFixed(1));
}

/**
 * 重新编码答案值
 * 
 * @param originalVal 原始答案值(1-6,8)
 * @returns 重新编码后的值
 */
export function reEncodeValue(originalVal: number): number {
  switch (originalVal) {
    case 1: return 6; // 不可能完成
    case 2: return 5; // 能完成但总是有困难
    case 3: return 4; // 大部分时间有困难
    case 4: return 3; // 有时有困难
    case 5: return 2; // 很少有困难
    case 6: return 1; // 从来没有困难
    default: return 0; // 8或无效
  }
}

/**
 * 计算重新编码后的得分
 * 
 * @param domainRange 领域包含的题目号数组
 * @param answers 全部答案数据
 * @returns 重新编码后的领域得分 (0-100)，如果无有效答案则返回null
 */
export function calculateReEncodedScore(domainRange: number[], answers: HalAnswers): number | null {
  let sum = 0;
  let valid = 0;

  domainRange.forEach(qNum => {
    const qId = `q${qNum}` as keyof HalAnswers;
    const origVal = parseInt(answers[qId] || '', 10);
    if (!isNaN(origVal) && origVal !== 8) {
      sum += reEncodeValue(origVal);
      valid++;
    }
  });

  if (valid === 0) return null;

  // 正确公式: 100 - ((sum - valid) * (100 / (5 * valid)))
  let score = 100 - ((sum - valid) * (100 / (5 * valid)));
  if (score < 0) score = 0;
  if (score > 100) score = 100;
  return parseFloat(score.toFixed(1));
}

/**
 * 计算所有领域的得分
 * 
 * @param answers 全部答案数据
 * @returns 所有领域的得分对象
 */
export function calculateDomainScores(answers: HalAnswers): DomainScores {
  return {
    LSKS: calculateNormalizedScore(DOMAINS.LSKS, answers),
    LEGS: calculateNormalizedScore(DOMAINS.LEGS, answers),
    ARMS: calculateNormalizedScore(DOMAINS.ARMS, answers),
    TRANS: calculateNormalizedScore(DOMAINS.TRANS, answers),
    SELFC: calculateNormalizedScore(DOMAINS.SELFC, answers),
    HOUSEH: calculateNormalizedScore(DOMAINS.HOUSEH, answers),
    LEISPO: calculateNormalizedScore(DOMAINS.LEISPO, answers),
    
    // 兼容性字段 - 旧版本命名
    UPP: calculateNormalizedScore(DOMAINS.ARMS, answers),
    LOWBAS: null,
    LOWCOM: null,
    HOUSL: calculateNormalizedScore(DOMAINS.HOUSEH, answers),
    LEHOW: calculateNormalizedScore(DOMAINS.LEISPO, answers),
    WORK: null
  };
}

/**
 * 计算重新编码的得分（UPPER/LOWBAS/LOWCOM）
 * 
 * @param answers 全部答案数据
 * @returns 重新编码的领域得分对象
 */
export function calculateReEncodedScores(answers: HalAnswers): ReEncodedScores {
  return {
    UPPER: calculateReEncodedScore(SPECIAL_GROUPS.UPPER, answers),
    LOWBAS: calculateReEncodedScore(SPECIAL_GROUPS.LOWBAS, answers),
    LOWCOM: calculateReEncodedScore(SPECIAL_GROUPS.LOWCOM, answers)
  };
}

/**
 * 计算总分（所有题目的平均值）
 * 
 * @param answers 所有问题的答案
 * @returns 总分，如果没有任何有效分数则返回null
 */
export function calculateSumScore(answers: HalAnswers): number | null {
  // 按原始app.js计算总分 (1~42题的平均值)
  const allQ = Array.from({length:42}, (_,i)=>i+1);
  return calculateNormalizedScore(allQ, answers);
}

/**
 * 计算所有评估得分（重构版本）
 * 此函数集成了所有的评分计算逻辑，包括各领域得分、重新编码得分和总分
 * 
 * @param answers 全部答案数据
 * @returns 完整的评估结果，包含所有得分数据
 */
export function calculateAllScores(answers: HalAnswers): AssessmentResult {
  // 计算各领域标准得分
  const domainScores = calculateDomainScores(answers);
  
  // 计算重新编码的得分
  const newEncodedScores = calculateReEncodedScores(answers);
  
  // 计算总分
  const sumScore = calculateSumScore(answers);
  
  // 构建并返回完整评估结果
  return {
    domainScores: {
      ...domainScores,
      newEncodedScores, // 添加重编码得分到domainScores
      sumScore          // 添加总分到domainScores
    },
    newEncodedScores,
    sumScore
  };
}

/**
 * 根据年龄判定年龄分组
 * 
 * @param age 年龄字符串
 * @returns 年龄组描述
 */
export function determineAgeGroup(age: string): string {
  const n = parseInt(age, 10);
  if (isNaN(n)) return "";
  if (n <= 12) return "儿童";
  if (n <= 18) return "少年";
  if (n <= 39) return "青年";
  return "中年"; // 40及以上
}

/**
 * 检查所有必答题是否已经回答
 * 
 * @param answers 全部答案数据
 * @param totalQ 问题总数
 * @returns 是否全部问题均已回答
 */
export function checkAllQuestionsAnswered(answers: HalAnswers, totalQ: number = 42): boolean {
  for (let i = 1; i <= totalQ; i++) {
    const qId = `q${i}` as keyof HalAnswers;
    if (!answers[qId]) {
      return false;
    }
  }
  return true;
}

/**
 * 获取未回答的问题编号
 * 
 * @param answers 全部答案数据
 * @param totalQ 问题总数
 * @returns 未回答问题的题号数组
 */
export function getUnansweredQuestions(answers: HalAnswers, totalQ: number = 42): number[] {
  const unanswered: number[] = [];
  for (let i = 1; i <= totalQ; i++) {
    const qId = `q${i}` as keyof HalAnswers;
    if (!answers[qId]) {
      unanswered.push(i);
    }
  }
  return unanswered;
} 
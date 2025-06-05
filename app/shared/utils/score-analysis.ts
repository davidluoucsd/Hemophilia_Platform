/**
 * Score Analysis Utilities for Questionnaires
 * 
 * Provides detailed scoring analysis for HAL and HAEMO-QoL-A questionnaires
 */

// 正确的HAL领域定义 - 来自正式评分系统
export const HAL_DOMAINS = {
  LSKS: { // 躺坐跪站
    name: '躺坐跪站',
    questions: [1, 2, 3, 4, 5, 6, 7, 8]
  },
  LEGS: { // 下肢功能
    name: '下肢功能',
    questions: [9, 10, 11, 12, 13, 14, 15, 16, 17]
  },
  ARMS: { // 上肢功能
    name: '上肢功能',
    questions: [18, 19, 20, 21]
  },
  TRANS: { // 交通工具
    name: '交通工具',
    questions: [22, 23, 24]
  },
  SELFC: { // 自我照料
    name: '自我照料',
    questions: [25, 26, 27, 28, 29]
  },
  HOUSEH: { // 家务劳动
    name: '家务劳动',
    questions: [30, 31, 32, 33, 34, 35]
  },
  LEISPO: { // 休闲体育
    name: '休闲体育',
    questions: [36, 37, 38, 39, 40, 41, 42]
  }
};

// HAL特殊分组
export const HAL_SPECIAL_GROUPS = {
  UPPER: [18, 19, 20, 21, 25, 26, 27, 28, 29], // 上肢活动
  LOWBAS: [8, 9, 10, 11, 12, 13], // 基础下肢
  LOWCOM: [3, 4, 5, 6, 7, 14, 15, 16, 17, 22] // 复杂下肢
};

// HAEMO-QoL-A Questionnaire Part Structure
export const HAEMQOL_PARTS = {
  PART1: { // 问卷一
    name: '问卷一（身体健康）',
    questions: ['hq1', 'hq2', 'hq3', 'hq4', 'hq5', 'hq6', 'hq7', 'hq8', 'hq9']
  },
  PART2: { // 问卷二
    name: '问卷二（感受与情绪）',
    questions: ['hq10', 'hq11', 'hq12', 'hq13', 'hq14', 'hq15', 'hq16', 'hq17', 'hq18', 'hq19', 'hq20']
  },
  PART3: { // 问卷三
    name: '问卷三（对他人的看法）',
    questions: ['hq21', 'hq22', 'hq23', 'hq24', 'hq25', 'hq26', 'hq27', 'hq28', 'hq29']
  },
  PART4: { // 问卷四
    name: '问卷四（运动与学校）',
    questions: ['hq30', 'hq31', 'hq32', 'hq33', 'hq34', 'hq35', 'hq36', 'hq37', 'hq38', 'hq39', 'hq40', 'hq41']
  }
};

/**
 * 计算标准化得分 - 正确的HAL计算公式
 * 
 * @param domainQuestions 领域包含的题目号数组
 * @param answers 全部答案数据
 * @returns 标准化的领域得分 (0-100)，如果无有效答案则返回null
 */
function calculateNormalizedScore(domainQuestions: number[], answers: Record<string, string>): { score: number; total: number; percentage: number } {
  let sum = 0;
  let valid = 0;

  domainQuestions.forEach(qNum => {
    const qId = `q${qNum}`;
    const val = parseInt(answers[qId] || '', 10);
    if (!isNaN(val) && val !== 8) { // 排除"不知道"选项
      sum += val; // 1~6
      valid++;
    }
  });

  if (valid === 0) {
    return { score: 0, total: 0, percentage: 0 };
  }

  // 正确公式: 100 * (sum - valid) / (5 * valid)
  let normalizedScore = ((sum - valid) * 100) / (5 * valid);
  if (normalizedScore < 0) normalizedScore = 0;
  if (normalizedScore > 100) normalizedScore = 100;

  const score = parseFloat(normalizedScore.toFixed(1));
  const total = valid * 5; // 最大可能分数
  const percentage = parseFloat(((score / 100) * 100).toFixed(1));

  return { score, total, percentage };
}

/**
 * 重新编码答案值
 */
function reEncodeValue(originalVal: number): number {
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
 */
function calculateReEncodedScore(domainQuestions: number[], answers: Record<string, string>): number | null {
  let sum = 0;
  let valid = 0;

  domainQuestions.forEach(qNum => {
    const qId = `q${qNum}`;
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

// HAL Score Calculation - 使用正确的算法
export function calculateHALDomainScores(answers: Record<string, string>) {
  const domainScores: Record<string, { score: number; total: number; percentage: number }> = {};
  let totalScore = 0;
  let totalQuestions = 0;

  Object.entries(HAL_DOMAINS).forEach(([domainKey, domain]) => {
    const result = calculateNormalizedScore(domain.questions, answers);
    domainScores[domainKey] = result;
    
    // 计算原始分数用于总分
    domain.questions.forEach(qNum => {
      const qId = `q${qNum}`;
      const val = parseInt(answers[qId] || '', 10);
      if (!isNaN(val) && val !== 8) {
        totalScore += val;
        totalQuestions++;
      }
    });
  });

  // 计算HAL特殊指标
  const upperLimbActivity = calculateReEncodedScore(HAL_SPECIAL_GROUPS.UPPER, answers);
  const basicLowerLimb = calculateReEncodedScore(HAL_SPECIAL_GROUPS.LOWBAS, answers);
  const complexLowerLimb = calculateReEncodedScore(HAL_SPECIAL_GROUPS.LOWCOM, answers);
  
  // 计算总分（标准化）
  const overallScore = totalQuestions > 0 ? ((totalScore - totalQuestions) * 100) / (5 * totalQuestions) : 0;
  const nationalStandardTotal = Math.max(0, Math.min(100, parseFloat(overallScore.toFixed(1))));

  return {
    domains: domainScores,
    totalScore: nationalStandardTotal,
    maxPossibleScore: 100, // HAL是标准化分数，最大100
    upperLimbActivity: upperLimbActivity || 0,
    basicLowerLimb: basicLowerLimb || 0,
    complexLowerLimb: complexLowerLimb || 0,
    nationalStandardTotal
  };
}

// HAEMO-QoL-A Score Calculation
export function calculateHAEMQOLPartScores(answers: Record<string, string>) {
  const partScores: Record<string, { score: number; total: number; percentage: number }> = {};
  let totalScore = 0;
  let totalQuestions = 0;

  Object.entries(HAEMQOL_PARTS).forEach(([partKey, part]) => {
    let partScore = 0;
    let partQuestions = 0;

    part.questions.forEach(questionId => {
      const answer = answers[questionId];
      if (answer && answer.trim() !== '') {
        const score = parseInt(answer);
        if (!isNaN(score)) {
          partScore += score;
          partQuestions++;
        }
      }
    });

    const partTotal = partQuestions * 4; // Max score per question is 4
    const percentage = partQuestions > 0 ? (partScore / partTotal) * 100 : 0;

    partScores[partKey] = {
      score: partScore,
      total: partTotal,
      percentage: Math.round(percentage * 10) / 10
    };

    totalScore += partScore;
    totalQuestions += partQuestions;
  });

  return {
    parts: partScores,
    totalScore,
    maxPossibleScore: totalQuestions * 4
  };
}

// Generate detailed score analysis for display
export function generateScoreAnalysis(questionnaireType: 'hal' | 'haemqol', answers: Record<string, string>) {
  if (questionnaireType === 'hal') {
    const analysis = calculateHALDomainScores(answers);
    return {
      type: 'hal',
      totalScore: analysis.totalScore,
      maxScore: analysis.maxPossibleScore,
      domains: Object.entries(analysis.domains).map(([key, domain]) => ({
        key,
        name: HAL_DOMAINS[key as keyof typeof HAL_DOMAINS].name,
        score: domain.score,
        total: domain.total,
        percentage: domain.percentage
      })),
      specialScores: {
        upperLimbActivity: analysis.upperLimbActivity,
        basicLowerLimb: analysis.basicLowerLimb,
        complexLowerLimb: analysis.complexLowerLimb,
        nationalStandardTotal: analysis.nationalStandardTotal
      }
    };
  } else {
    const analysis = calculateHAEMQOLPartScores(answers);
    return {
      type: 'haemqol',
      totalScore: analysis.totalScore,
      maxScore: analysis.maxPossibleScore,
      parts: Object.entries(analysis.parts).map(([key, part]) => ({
        key,
        name: HAEMQOL_PARTS[key as keyof typeof HAEMQOL_PARTS].name,
        score: part.score,
        total: part.total,
        percentage: part.percentage
      }))
    };
  }
}

// Generate CSV headers for detailed export
export function generateDetailedCSVHeaders() {
  return [
    // 基本信息
    '患者名字', '年龄段', '年龄', '体重', '身高',
    
    // 治疗方案
    '用药方案', '每次剂量',
    
    // HAEMO-QoL-A详细分数
    'HAEMO-QoL-A问卷一', 'HAEMO-QoL-A问卷二', 'HAEMO-QoL-A问卷三', 'HAEMO-QoL-A问卷四', 'HAEMO-QoL-A总分',
    
    // HAL详细分数
    'HAL躺坐跪站', 'HAL下肢功能', 'HAL上肢功能', 'HAL交通工具', 'HAL自我照料', 'HAL家务劳动', 'HAL休闲体育',
    'HAL上肢活动', 'HAL基础下肢', 'HAL复杂下肢', 'HAL国标总分',
    
    // 医疗信息
    '评估日期', '下次时间', '医生备注'
  ];
}

// Generate CSV row data for a patient
export function generatePatientCSVRow(
  patient: any,
  medicalInfo: any,
  responses: any[]
) {
  // Get latest scores
  const latestHaemqol = responses.find(r => r.questionnaire_type === 'haemqol');
  const latestHal = responses.find(r => r.questionnaire_type === 'hal');

  // Parse answers and calculate detailed scores
  let haemqolScores = { part1: '', part2: '', part3: '', part4: '', total: '' };
  let halScores = {
    lsks: '', legs: '', arms: '', trans: '', selfc: '', househ: '', leispo: '',
    upperLimb: '', basicLower: '', complexLower: '', nationalTotal: ''
  };

  if (latestHaemqol?.answers) {
    const answers = typeof latestHaemqol.answers === 'string' 
      ? JSON.parse(latestHaemqol.answers) 
      : latestHaemqol.answers;
    const analysis = generateScoreAnalysis('haemqol', answers);
    
    haemqolScores = {
      part1: analysis.parts?.find(p => p.key === 'PART1')?.score?.toString() || '',
      part2: analysis.parts?.find(p => p.key === 'PART2')?.score?.toString() || '',
      part3: analysis.parts?.find(p => p.key === 'PART3')?.score?.toString() || '',
      part4: analysis.parts?.find(p => p.key === 'PART4')?.score?.toString() || '',
      total: analysis.totalScore?.toString() || ''
    };
  }

  if (latestHal?.answers) {
    const answers = typeof latestHal.answers === 'string' 
      ? JSON.parse(latestHal.answers) 
      : latestHal.answers;
    const analysis = generateScoreAnalysis('hal', answers);
    
    halScores = {
      lsks: analysis.domains?.find(d => d.key === 'LSKS')?.score?.toString() || '',
      legs: analysis.domains?.find(d => d.key === 'LEGS')?.score?.toString() || '',
      arms: analysis.domains?.find(d => d.key === 'ARMS')?.score?.toString() || '',
      trans: analysis.domains?.find(d => d.key === 'TRANS')?.score?.toString() || '',
      selfc: analysis.domains?.find(d => d.key === 'SELFC')?.score?.toString() || '',
      househ: analysis.domains?.find(d => d.key === 'HOUSEH')?.score?.toString() || '',
      leispo: analysis.domains?.find(d => d.key === 'LEISPO')?.score?.toString() || '',
      upperLimb: analysis.specialScores?.upperLimbActivity?.toString() || '',
      basicLower: analysis.specialScores?.basicLowerLimb?.toString() || '',
      complexLower: analysis.specialScores?.complexLowerLimb?.toString() || '',
      nationalTotal: analysis.specialScores?.nationalStandardTotal?.toString() || ''
    };
  }

  // Generate age group
  const ageGroup = patient.age < 18 ? '儿童' : patient.age < 60 ? '成人' : '老年';

  return [
    patient.name,
    ageGroup,
    patient.age.toString(),
    patient.weight.toString(),
    patient.height.toString(),
    medicalInfo?.treatment_plan || '',
    medicalInfo?.treatment_dose?.toString() || '',
    haemqolScores.part1,
    haemqolScores.part2,
    haemqolScores.part3,
    haemqolScores.part4,
    haemqolScores.total,
    halScores.lsks,
    halScores.legs,
    halScores.arms,
    halScores.trans,
    halScores.selfc,
    halScores.househ,
    halScores.leispo,
    halScores.upperLimb,
    halScores.basicLower,
    halScores.complexLower,
    halScores.nationalTotal,
    medicalInfo?.evaluation_date || '',
    medicalInfo?.next_follow_up || '',
    medicalInfo?.notes || ''
  ];
} 
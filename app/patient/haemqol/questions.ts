/**
 * GAD-7 & PHQ-9 问卷系统 - 问题定义
 * 
 * @copyright Copyright (c) 2025 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

// 问题定义类型
interface HaemqolQuestion {
  id: number;         // 问题编号
  title: string;      // 问题标题
  isReverse?: boolean; // 是否为正向题目（需要反转计算）
}

// 问卷部分定义类型
interface HaemqolSection {
  id: string;              // 部分ID
  title: string;           // 部分标题
  description: string;     // 部分描述
  questions: HaemqolQuestion[]; // 问题列表
}

// 定义GAD-7和PHQ-9问题
export const HAEMQOL_SECTIONS: HaemqolSection[] = [
  {
    id: "gad7",
    title: "GAD-7 广泛性焦虑障碍筛查量表",
    description: "过去 2 周内，您有多频繁地被以下问题困扰？",
    questions: [
      { id: 1, title: "感到紧张、焦虑或情绪紧张" },
      { id: 2, title: "无法停止或控制担忧" },
      { id: 3, title: "对各种各样的事情担忧过度" },
      { id: 4, title: "难以放松" },
      { id: 5, title: "焦躁不安，很难静静坐着" },
      { id: 6, title: "变得容易恼怒或易怒" },
      { id: 7, title: "感到害怕，好像要发生什么可怕的事" }
    ]
  },
  {
    id: "phq9",
    title: "PHQ-9 患者健康问卷抑郁症筛查量表",
    description: "过去 2 周内，您有多频繁地被以下问题困扰？",
    questions: [
      { id: 8, title: "做事时提不起劲或没有兴趣" },
      { id: 9, title: "感到心情低落、沮丧或绝望" },
      { id: 10, title: "入睡困难、睡不安稳或睡眠过多" },
      { id: 11, title: "感觉疲倦或没有活力" },
      { id: 12, title: "食欲不振或吃太多" },
      { id: 13, title: "觉得自己很糟或自己是个失败者，或让自己或家人失望" },
      { id: 14, title: "对事物专注有困难，如阅读报纸或看电视时" },
      { id: 15, title: "动作或说话缓慢到别人已经觉察到？或正好相反——烦躁或坐立不安、动来动去的情况超过平常" },
      { id: 16, title: "有不如死掉或用某种方式伤害自己的念头" }
    ]
  }
];

// 获取所有问题的平坦列表
export const getAllHaemqolQuestions = (): HaemqolQuestion[] => {
  return HAEMQOL_SECTIONS.flatMap(section => section.questions);
};

// 获取特定问题的详细信息
export const getHaemqolQuestion = (id: number): HaemqolQuestion | undefined => {
  return getAllHaemqolQuestions().find(q => q.id === id);
};

// 获取问题是否为反向计分
export const isReverseQuestion = (id: number): boolean => {
  const question = getHaemqolQuestion(id);
  return question?.isReverse || false;
};

// 获取问题所属的部分ID
export const getQuestionPartId = (id: number): string => {
  for (const section of HAEMQOL_SECTIONS) {
    if (section.questions.some(q => q.id === id)) {
      return section.id;
    }
  }
  return "";
};

// 格式化答案文本
export const formatHaemqolAnswerText = (value: string): string => {
  switch (value) {
    case '0': return '完全没有';
    case '1': return '几天';
    case '2': return '一半以上的天数';
    case '3': return '几乎每天';
    default: return '未回答';
  }
};

// 定义评分说明
export const HAEMQOL_SCORE_DESCRIPTIONS = {
  gad7: "GAD-7 焦虑症状评分",
  phq9: "PHQ-9 抑郁症状评分",
  total: "心理健康总评分"
}; 
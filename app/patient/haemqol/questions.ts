/**
 * HAEMO-QoL-A问卷系统 - 问题定义
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
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

// 定义HAEMO-QoL-A各部分问题
export const HAEMQOL_SECTIONS: HaemqolSection[] = [
  {
    id: "part1",
    title: "第一部分",
    description: "主要是了解最近4周以来血友病对您日常生活的影响",
    questions: [
      { id: 1, title: "关于治疗我感到我是受限的" },
      { id: 2, title: "对找医生、爬楼梯困难" },
      { id: 3, title: "我可以轻松完成日常活动", isReverse: true },
      { id: 4, title: "因为血友病，我不能离开房间" },
      { id: 5, title: "因为疼痛，我必须调整活动内容" },
      { id: 6, title: "我能完成家务劳动", isReverse: true },
      { id: 7, title: "我能在社交活动中自信", isReverse: true },
      { id: 8, title: "我需要依靠他人才能进行室外活动" },
      { id: 9, title: "我能参加体育活动", isReverse: true },
      { id: 10, title: "因为血友病，我不能旅行" },
      { id: 11, title: "当远离家提供急救设施的医疗保健中心时我感到焦虑" }
    ]
  },
  {
    id: "part2",
    title: "第二部分",
    description: "主要是了解最近4周以来血友病对您情绪及心情的影响",
    questions: [
      { id: 12, title: "我对未来充满希望", isReverse: true },
      { id: 13, title: "我担心发生意外" },
      { id: 14, title: "我担心被痛撞" },
      { id: 15, title: "我觉得对他人有自信", isReverse: true },
      { id: 16, title: "我热爱生活", isReverse: true },
      { id: 17, title: "我有些比实际年龄大得多的感觉" },
      { id: 18, title: "我担心血小板缺乏" },
      { id: 19, title: "我能掌控自己的生活", isReverse: true },
      { id: 20, title: "我觉得难以预测何时/何处会有冒险" },
      { id: 21, title: "因不能完成想做的事，我感到沮丧" },
      { id: 22, title: "因为血友病，我难规划未来" }
    ]
  },
  {
    id: "part3",
    title: "第三部分",
    description: "主要是了解最近4周以来血友病对您工作、生活的影响",
    questions: [
      { id: 23, title: "我担心找不到工作或失业" },
      { id: 24, title: "我担心因血友病耽误我的工作或学习" },
      { id: 25, title: "因血友病，我在工作或上学受到限制" },
      { id: 26, title: "我觉得我成了家里的负担" },
      { id: 27, title: "我害怕结婚" },
      { id: 28, title: "血友病影响我和朋友的关系" },
      { id: 29, title: "我担心不能供养我的家人" },
      { id: 30, title: "因担心碰撞受伤我不敢去拥挤的场所" },
      { id: 31, title: "因患血友病，我觉得我不同于其他人" },
      { id: 32, title: "我觉得我与他人同等的机会将减少" },
      { id: 33, title: "我被他人区别对待" },
      { id: 34, title: "我觉得我可以像其他人一样正常生活", isReverse: true },
      { id: 35, title: "血友病妨碍我与他人有亲密关系" },
      { id: 36, title: "我害怕在公共场所出血" }
    ]
  },
  {
    id: "part4",
    title: "第四部分",
    description: "以下问题了解最近4周以来您做治疗的经历",
    questions: [
      { id: 37, title: "血友病治疗影响我的日常生活" },
      { id: 38, title: "血友病注射治疗时，我很紧张" },
      { id: 39, title: "我担心治疗的安全性" },
      { id: 40, title: "我担心被不懂血友病治疗方法的医务人员" },
      { id: 41, title: "我担心血友病治疗产品的可获得性" }
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
    case '0': return '从来没有';
    case '1': return '偶尔';
    case '2': return '有时';
    case '3': return '部分时间';
    case '4': return '大部分时间';
    case '5': return '总是';
    default: return '未回答';
  }
};

// 定义评分说明
export const HAEMQOL_SCORE_DESCRIPTIONS = {
  part1: "日常生活影响分数",
  part2: "情绪及心情影响分数",
  part3: "工作、生活影响分数",
  part4: "治疗经历影响分数",
  total: "总体生存质量分数"
}; 
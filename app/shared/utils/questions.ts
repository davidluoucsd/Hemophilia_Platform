/**
 * HAL问卷系统 - 问题数据
 * 
 * @copyright Copyright (c) 2024 罗骏哲（Junzhe Luo）
 * @author 罗骏哲（Junzhe Luo）
 * 
 * 本软件的版权归罗骏哲所有。
 * 未经版权所有者明确授权，任何人不得复制、修改、合并、出版发行、散布、再授权或销售本软件的副本。
 */

export interface QuestionSection {
  title: string;
  description?: string;
  questions: Question[];
}

export interface Question {
  id: number;
  title: string;
}

export const QUESTION_SECTIONS: QuestionSection[] = [
  {
    title: "第一部分：躯干/坐/跪/站立",
    questions: [
      { id: 1, title: "坐下（如在椅子或沙发上）" },
      { id: 2, title: "使用扶手从椅子上站起" },
      { id: 3, title: "不使用扶手从椅子上站起" },
      { id: 4, title: "跪下/下跪" },
      { id: 5, title: "跪下后站起" },
      { id: 6, title: "长时间跪着" },
      { id: 7, title: "长时间蹲着" },
      { id: 8, title: "长时间站立" }
    ]
  },
  {
    title: "第二部分：下肢功能",
    questions: [
      { id: 9, title: "短距离步行（小于15分钟）" },
      { id: 10, title: "长距离步行（大于15分钟）" },
      { id: 11, title: "在不平的路面行走（例如沙滩、石子路等）" },
      { id: 12, title: "走在不平的街道（如鹅卵石、碎石路等）" },
      { id: 13, title: "散步/遛街" },
      { id: 14, title: "上楼梯" },
      { id: 15, title: "下楼梯" },
      { id: 16, title: "跑（如追公交车）" },
      { id: 17, title: "长时间站立后行走" }
    ]
  },
  {
    title: "第三部分：上肢功能",
    questions: [
      { id: 18, title: "举起重物" },
      { id: 19, title: "用手搬起重物" },
      { id: 20, title: "精细手运动（如打开关按钮等）" },
      { id: 21, title: "够取头顶上方的物体（从高架子上取东西）" }
    ]
  },
  {
    title: "第四部分：使用交通工具",
    questions: [
      { id: 22, title: "骑自行车" },
      { id: 23, title: "进出汽车" },
      { id: 24, title: "使用公共交通工具（汽车、火车、地铁等）" }
    ]
  },
  {
    title: "第五部分：自我照料",
    questions: [
      { id: 25, title: "把全身擦拭（如洗澡或沐浴）" },
      { id: 26, title: "穿外衣、毛衣等" },
      { id: 27, title: "穿裤子、袜子或鞋子" },
      { id: 28, title: "扣纽扣或拉拽衣服上面的拉链" },
      { id: 29, title: "上厕所（蹲便或坐便）" }
    ]
  },
  {
    title: "第六部分：家务劳动",
    questions: [
      { id: 30, title: "外出购物（食物或日常杂货）" },
      { id: 31, title: "洗衣、清洗洗涤" },
      { id: 32, title: "打扫房子" },
      { id: 33, title: "做饭/烹饪劳动作业（煎炒烹饪或辅助）" },
      { id: 34, title: "做其他家务（房子内外、修理等）" },
      { id: 35, title: "园艺（如修剪花草、除草等）" }
    ]
  },
  {
    title: "第七部分：休闲活动和体育运动",
    questions: [
      { id: 36, title: "玩游戏（户外，如和孩子一起）" },
      { id: 37, title: "体育运动（跑步、球类等）" },
      { id: 38, title: "外出娱乐（剧院、博物馆、电影院、酒吧等）" },
      { id: 39, title: "兴趣爱好（阅读、手工等）" },
      { id: 40, title: "跳舞" },
      { id: 41, title: "度假（主动，如海边、滑雪等）" },
      { id: 42, title: "度假（被动，如海滩、假日酒店休息）" }
    ]
  }
];

// 扁平化问题列表，方便查找
export const ALL_QUESTIONS: Question[] = QUESTION_SECTIONS.flatMap(section => section.questions);

// 通过ID查找问题
export function getQuestionById(id: number): Question | undefined {
  return ALL_QUESTIONS.find(q => q.id === id);
}

// 获取问题标题
export function getQuestionTitle(id: number): string {
  const question = getQuestionById(id);
  return question ? question.title : `问题${id}`;
} 
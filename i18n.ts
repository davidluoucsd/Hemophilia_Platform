

// 支持的语言列表
export const locales = ['en', 'zh'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'zh';

// 语言配置
export const config = {
  locales,
  defaultLocale,
  localeCookie: 'locale',
  timeZone: 'Asia/Shanghai'
} as const;

// 获取消息
export async function getMessages(locale: Locale) {
  try {
    return (await import(`./messages/${locale}.json`)).default;
  } catch (error) {
    return (await import(`./messages/${defaultLocale}.json`)).default;
  }
}

 
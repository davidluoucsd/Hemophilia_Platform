import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Locale, defaultLocale } from '../../../i18n';

interface LanguageState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  messages: Record<string, any>;
  setMessages: (messages: Record<string, any>) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      locale: defaultLocale,
      messages: {},
      
      setLocale: (locale: Locale) => {
        set({ locale });
        // 异步加载对应语言的翻译文件
        loadMessages(locale).then(messages => {
          get().setMessages(messages);
        });
      },
      
      setMessages: (messages: Record<string, any>) => {
        set({ messages });
      },
      
      t: (key: string, params?: Record<string, string | number>) => {
        const { messages } = get();
        const keys = key.split('.');
        let value: any = messages;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            return key; // 如果找不到翻译，返回原key
          }
        }
        
        if (typeof value !== 'string') {
          return key;
        }
        
        // 处理参数替换
        if (params) {
          return value.replace(/\{(\w+)\}/g, (match, paramKey) => {
            return params[paramKey]?.toString() || match;
          });
        }
        
        return value;
      }
    }),
    {
      name: 'language-storage',
      partialize: (state) => ({ locale: state.locale })
    }
  )
);

// 加载语言消息的异步函数
async function loadMessages(locale: Locale): Promise<Record<string, any>> {
  try {
    const messages = await import(`../../../messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    // 如果加载失败，尝试加载默认语言
    if (locale !== defaultLocale) {
      try {
        const defaultMessages = await import(`../../../messages/${defaultLocale}.json`);
        return defaultMessages.default;
      } catch (defaultError) {
        console.error(`Failed to load default messages`, defaultError);
        return {};
      }
    }
    return {};
  }
}

// 初始化语言数据
export const initializeLanguage = async () => {
  const { locale, setMessages } = useLanguageStore.getState();
  const messages = await loadMessages(locale);
  setMessages(messages);
}; 
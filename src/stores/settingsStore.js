import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = 'ai-content-generator-secret-key';

const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

const decrypt = (encryptedText) => {
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedText, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  } catch {
    return '';
  }
};

export const useSettingsStore = create(
  persist(
    (set, get) => ({
      openaiApiKeys: [],
      lmsCredentials: {
        username: '',
        password: '',
        baseUrl: 'https://test1.ilearn.guru'
      },
      
      addOpenAIKey: (key, label = '') => {
        const encryptedKey = encrypt(key);
        const newKey = {
          id: Date.now().toString(),
          key: encryptedKey,
          label: label || `API Key ${get().openaiApiKeys.length + 1}`,
          createdAt: new Date().toISOString(),
          isActive: true
        };
        set(state => ({
          openaiApiKeys: [...state.openaiApiKeys, newKey]
        }));
      },
      
      removeOpenAIKey: (keyId) => {
        set(state => ({
          openaiApiKeys: state.openaiApiKeys.filter(k => k.id !== keyId)
        }));
      },
      
      toggleOpenAIKey: (keyId) => {
        set(state => ({
          openaiApiKeys: state.openaiApiKeys.map(k => 
            k.id === keyId ? { ...k, isActive: !k.isActive } : k
          )
        }));
      },
      
      updateLMSCredentials: (credentials) => {
        const encrypted = {
          ...credentials,
          username: credentials.username ? encrypt(credentials.username) : '',
          password: credentials.password ? encrypt(credentials.password) : ''
        };
        set({ lmsCredentials: encrypted });
      },
      
      getDecryptedLMSCredentials: () => {
        const { lmsCredentials } = get();
        return {
          ...lmsCredentials,
          username: lmsCredentials.username ? decrypt(lmsCredentials.username) : '',
          password: lmsCredentials.password ? decrypt(lmsCredentials.password) : ''
        };
      },
      
      getActiveOpenAIKeys: () => {
        return get().openaiApiKeys
          .filter(k => k.isActive)
          .map(k => ({
            ...k,
            key: decrypt(k.key)
          }));
      }
    }),
    {
      name: 'settings-storage'
    }
  )
);
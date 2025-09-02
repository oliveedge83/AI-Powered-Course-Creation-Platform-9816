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
      // OpenAI API Keys
      openaiApiKeys: [],
      
      // Perplexity API Keys
      perplexityApiKeys: [],
      
      // LMS Credentials
      lmsCredentials: {
        username: '',
        password: '',
        baseUrl: 'https://test1.ilearn.guru'
      },

      // OpenAI API Key Management
      addOpenAIKey: (key, label = '') => {
        const encryptedKey = encrypt(key);
        const newKey = {
          id: Date.now().toString(),
          key: encryptedKey,
          label: label || `OpenAI Key ${get().openaiApiKeys.length + 1}`,
          createdAt: new Date().toISOString(),
          isActive: true,
          provider: 'openai'
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

      getActiveOpenAIKeys: () => {
        return get().openaiApiKeys
          .filter(k => k.isActive)
          .map(k => ({
            ...k,
            key: decrypt(k.key)
          }));
      },

      // Perplexity API Key Management
      addPerplexityKey: (key, label = '', isPrimary = false) => {
        const encryptedKey = encrypt(key);
        const newKey = {
          id: Date.now().toString(),
          key: encryptedKey,
          label: label || `Perplexity Key ${get().perplexityApiKeys.length + 1}`,
          createdAt: new Date().toISOString(),
          isActive: true,
          isPrimary: isPrimary,
          provider: 'perplexity'
        };

        set(state => {
          let updatedKeys = [...state.perplexityApiKeys, newKey];
          
          // If this is set as primary, make sure no other key is primary
          if (isPrimary) {
            updatedKeys = updatedKeys.map(k => 
              k.id === newKey.id ? k : { ...k, isPrimary: false }
            );
          }
          
          return { perplexityApiKeys: updatedKeys };
        });
      },

      removePerplexityKey: (keyId) => {
        set(state => ({
          perplexityApiKeys: state.perplexityApiKeys.filter(k => k.id !== keyId)
        }));
      },

      togglePerplexityKey: (keyId) => {
        set(state => ({
          perplexityApiKeys: state.perplexityApiKeys.map(k => 
            k.id === keyId ? { ...k, isActive: !k.isActive } : k
          )
        }));
      },

      setPrimaryPerplexityKey: (keyId) => {
        set(state => ({
          perplexityApiKeys: state.perplexityApiKeys.map(k => ({
            ...k,
            isPrimary: k.id === keyId
          }))
        }));
      },

      getActivePerplexityKeys: () => {
        return get().perplexityApiKeys
          .filter(k => k.isActive)
          .map(k => ({
            ...k,
            key: decrypt(k.key)
          }));
      },

      getPrimaryPerplexityKey: () => {
        const activeKeys = get().getActivePerplexityKeys();
        const primaryKey = activeKeys.find(k => k.isPrimary);
        return primaryKey || activeKeys[0] || null;
      },

      // LMS Credentials Management
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

      // Combined API Key Management
      getAllActiveApiKeys: () => {
        const openaiKeys = get().getActiveOpenAIKeys();
        const perplexityKeys = get().getActivePerplexityKeys();
        
        return {
          openai: openaiKeys,
          perplexity: perplexityKeys,
          total: openaiKeys.length + perplexityKeys.length
        };
      }
    }),
    {
      name: 'settings-storage'
    }
  )
);
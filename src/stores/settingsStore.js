import {create} from 'zustand';
import {persist} from 'zustand/middleware';
import CryptoJS from 'crypto-js';
import {LMS_TYPES} from '../services/lms/lmsTypes';

const ENCRYPTION_KEY='ai-content-generator-secret-key';

const encrypt=(text)=> {
return CryptoJS.AES.encrypt(text,ENCRYPTION_KEY).toString();
};

const decrypt=(encryptedText)=> {
try {
const bytes=CryptoJS.AES.decrypt(encryptedText,ENCRYPTION_KEY);
return bytes.toString(CryptoJS.enc.Utf8);
} catch {
return '';
}
};

export const useSettingsStore=create(
persist(
(set,get)=> ({
// OpenAI API Keys
openaiApiKeys: [],

// Perplexity API Keys
perplexityApiKeys: [],

// LMS Credentials with LMS Type Selection
lmsCredentials: {
lmsType: LMS_TYPES.TUTOR,// Default to TutorLMS for backward compatibility
username: '',
password: '',
baseUrl: 'https://test1.ilearn.guru'
},

// ✅ NEW: AITable Integration Credentials
aitableCredentials: {
apiKey: '',
datasheetId: '',
isActive: false
},

// OpenAI API Key Management
addOpenAIKey: (key,label='')=> {
const encryptedKey=encrypt(key);
const newKey={
id: Date.now().toString(),
key: encryptedKey,
label: label || `OpenAI Key ${get().openaiApiKeys.length + 1}`,
createdAt: new Date().toISOString(),
isActive: true,
provider: 'openai'
};
set(state=> ({
openaiApiKeys: [...state.openaiApiKeys,newKey]
}));
},

removeOpenAIKey: (keyId)=> {
set(state=> ({
openaiApiKeys: state.openaiApiKeys.filter(k=> k.id !==keyId)
}));
},

toggleOpenAIKey: (keyId)=> {
set(state=> ({
openaiApiKeys: state.openaiApiKeys.map(k=> 
k.id===keyId ? {...k,isActive: !k.isActive} : k
)
}));
},

getActiveOpenAIKeys: ()=> {
return get().openaiApiKeys
.filter(k=> k.isActive)
.map(k=> ({...k,key: decrypt(k.key)}));
},

// Perplexity API Key Management
addPerplexityKey: (key,label='',isPrimary=false)=> {
const encryptedKey=encrypt(key);
const newKey={
id: Date.now().toString(),
key: encryptedKey,
label: label || `Perplexity Key ${get().perplexityApiKeys.length + 1}`,
createdAt: new Date().toISOString(),
isActive: true,
isPrimary: isPrimary,
provider: 'perplexity'
};

set(state=> {
let updatedKeys=[...state.perplexityApiKeys,newKey];
// If this is set as primary,make sure no other key is primary
if (isPrimary) {
updatedKeys=updatedKeys.map(k=> 
k.id===newKey.id ? k : {...k,isPrimary: false}
);
}
return {perplexityApiKeys: updatedKeys};
});
},

removePerplexityKey: (keyId)=> {
set(state=> ({
perplexityApiKeys: state.perplexityApiKeys.filter(k=> k.id !==keyId)
}));
},

togglePerplexityKey: (keyId)=> {
set(state=> ({
perplexityApiKeys: state.perplexityApiKeys.map(k=> 
k.id===keyId ? {...k,isActive: !k.isActive} : k
)
}));
},

setPrimaryPerplexityKey: (keyId)=> {
set(state=> ({
perplexityApiKeys: state.perplexityApiKeys.map(k=> ({
...k,
isPrimary: k.id===keyId
}))
}));
},

getActivePerplexityKeys: ()=> {
return get().perplexityApiKeys
.filter(k=> k.isActive)
.map(k=> ({...k,key: decrypt(k.key)}));
},

getPrimaryPerplexityKey: ()=> {
const activeKeys=get().getActivePerplexityKeys();
const primaryKey=activeKeys.find(k=> k.isPrimary);
return primaryKey || activeKeys[0] || null;
},

// Enhanced LMS Credentials Management with LMS Type Selection
updateLMSCredentials: (credentials)=> {
const encrypted={
...credentials,
lmsType: credentials.lmsType || LMS_TYPES.TUTOR,// Ensure we have a valid LMS type
username: credentials.username ? encrypt(credentials.username) : '',
password: credentials.password ? encrypt(credentials.password) : ''
};
set({lmsCredentials: encrypted});
},

getDecryptedLMSCredentials: ()=> {
const {lmsCredentials}=get();
return {
...lmsCredentials,
lmsType: lmsCredentials.lmsType || LMS_TYPES.TUTOR,// Default to TutorLMS
username: lmsCredentials.username ? decrypt(lmsCredentials.username) : '',
password: lmsCredentials.password ? decrypt(lmsCredentials.password) : ''
};
},

// New LMS Type Management
setLMSType: (lmsType)=> {
// Validate LMS type
if (!Object.values(LMS_TYPES).includes(lmsType)) {
console.warn(`Invalid LMS type: ${lmsType},defaulting to TutorLMS`);
lmsType=LMS_TYPES.TUTOR;
}
set(state=> ({
lmsCredentials: {...state.lmsCredentials,lmsType}
}));
},

getLMSType: ()=> {
const {lmsCredentials}=get();
return lmsCredentials.lmsType || LMS_TYPES.TUTOR;
},

// Check if using specific LMS type
isTutorLMS: ()=> {
return get().getLMSType()===LMS_TYPES.TUTOR;
},

isLifterLMS: ()=> {
return get().getLMSType()===LMS_TYPES.LIFTER;
},

// ✅ NEW: AITable Credentials Management
updateAITableCredentials: (credentials)=> {
const encrypted={
apiKey: credentials.apiKey ? encrypt(credentials.apiKey) : '',
datasheetId: credentials.datasheetId || '',
isActive: credentials.isActive || false
};
set({aitableCredentials: encrypted});
},

getDecryptedAITableCredentials: ()=> {
const {aitableCredentials}=get();
return {
apiKey: aitableCredentials.apiKey ? decrypt(aitableCredentials.apiKey) : '',
datasheetId: aitableCredentials.datasheetId || '',
isActive: aitableCredentials.isActive || false
};
},

toggleAITableIntegration: ()=> {
set(state=> ({
aitableCredentials: {
...state.aitableCredentials,
isActive: !state.aitableCredentials.isActive
}
}));
},

isAITableEnabled: ()=> {
const credentials=get().getDecryptedAITableCredentials();
return credentials.isActive && credentials.apiKey && credentials.datasheetId;
},

// Combined API Key Management
getAllActiveApiKeys: ()=> {
const openaiKeys=get().getActiveOpenAIKeys();
const perplexityKeys=get().getActivePerplexityKeys();
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
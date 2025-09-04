import React,{useState} from 'react';
import {motion} from 'framer-motion';
import {useForm} from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import {useSettingsStore} from '../stores/settingsStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import {validateOpenAIKey} from '../services/apiKeyValidator';
import {validatePerplexityKey} from '../services/perplexityService';
import {validateAITableCredentials} from '../services/aitableService';
import {LMS_TYPES,LMS_CONFIGS,getLMSConfig} from '../services/lms/lmsTypes';

const {FiKey,FiServer,FiPlus,FiTrash2,FiToggleLeft,FiToggleRight,FiEye,FiEyeOff,FiStar,FiCheck,FiX,FiInfo,FiSettings,FiDatabase}=FiIcons;

const Settings=()=> {
const [showPasswords,setShowPasswords]=useState({});
const [validatingKeys,setValidatingKeys]=useState({});
const [activeTab,setActiveTab]=useState('openai');// 'openai','perplexity','lms','aitable'

const {
// OpenAI
openaiApiKeys,
addOpenAIKey,
removeOpenAIKey,
toggleOpenAIKey,
// Perplexity
perplexityApiKeys,
addPerplexityKey,
removePerplexityKey,
togglePerplexityKey,
setPrimaryPerplexityKey,
// LMS
lmsCredentials,
updateLMSCredentials,
getDecryptedLMSCredentials,
getLMSType,
setLMSType,
// ✅ NEW: AITable
aitableCredentials,
updateAITableCredentials,
getDecryptedAITableCredentials,
toggleAITableIntegration,
isAITableEnabled
}=useSettingsStore();

// Forms
const {register: registerOpenAI,handleSubmit: handleOpenAISubmit,reset: resetOpenAI,formState: {errors: openaiErrors}}=useForm();
const {register: registerPerplexity,handleSubmit: handlePerplexitySubmit,reset: resetPerplexity,formState: {errors: perplexityErrors}}=useForm();
const {register: registerLMS,handleSubmit: handleLMSSubmit,formState: {errors: lmsErrors}}=useForm({
defaultValues: getDecryptedLMSCredentials()
});
// ✅ NEW: AITable form
const {register: registerAITable,handleSubmit: handleAITableSubmit,formState: {errors: aitableErrors}}=useForm({
defaultValues: getDecryptedAITableCredentials()
});

const currentLMSType=getLMSType();
const currentLMSConfig=getLMSConfig(currentLMSType);

const handleAddOpenAIKey=async (data)=> {
setValidatingKeys(prev=> ({...prev,openai: true}));
try {
// Validate the key before adding
const validation=await validateOpenAIKey(data.key);
if (validation.isValid) {
addOpenAIKey(data.key,data.label);
resetOpenAI();
toast.success('OpenAI API key added and validated successfully!');
} else {
toast.error(`Invalid OpenAI API key: ${validation.error}`);
}
} catch (error) {
console.error('Error validating OpenAI key:',error);
toast.error('Failed to validate OpenAI API key. Please try again.');
} finally {
setValidatingKeys(prev=> ({...prev,openai: false}));
}
};

const handleAddPerplexityKey=async (data)=> {
setValidatingKeys(prev=> ({...prev,perplexity: true}));
try {
// Validate the key before adding
const validation=await validatePerplexityKey(data.key);
if (validation.isValid) {
addPerplexityKey(data.key,data.label,data.isPrimary || perplexityApiKeys.length===0);
resetPerplexity();
toast.success('Perplexity API key added and validated successfully!');
} else {
toast.error(`Invalid Perplexity API key: ${validation.error}`);
}
} catch (error) {
console.error('Error validating Perplexity key:',error);
toast.error('Failed to validate Perplexity API key. Please try again.');
} finally {
setValidatingKeys(prev=> ({...prev,perplexity: false}));
}
};

const handleUpdateLMS=(data)=> {
updateLMSCredentials(data);
toast.success('LMS credentials updated successfully!');
};

// ✅ NEW: Handle AITable credentials update
const handleUpdateAITable=async (data)=> {
setValidatingKeys(prev=> ({...prev,aitable: true}));
try {
// Validate credentials if both API key and datasheet ID are provided
if (data.apiKey && data.datasheetId) {
const validation=await validateAITableCredentials(data.apiKey,data.datasheetId);
if (validation.isValid) {
updateAITableCredentials({
apiKey: data.apiKey,
datasheetId: data.datasheetId,
isActive: data.isActive
});
toast.success('AITable credentials validated and updated successfully!');
} else {
toast.error(`AITable validation failed: ${validation.error}`);
return;
}
} else {
// Just update without validation if credentials are incomplete
updateAITableCredentials({
apiKey: data.apiKey || '',
datasheetId: data.datasheetId || '',
isActive: data.isActive || false
});
toast.success('AITable credentials updated!');
}
} catch (error) {
console.error('Error validating AITable credentials:',error);
toast.error('Failed to validate AITable credentials. Please try again.');
} finally {
setValidatingKeys(prev=> ({...prev,aitable: false}));
}
};

const handleLMSTypeChange=(newLMSType)=> {
setLMSType(newLMSType);
toast.success(`LMS type changed to ${LMS_CONFIGS[newLMSType].name}`);
};

const togglePasswordVisibility=(field)=> {
setShowPasswords(prev=> ({
...prev,
[field]: !prev[field]
}));
};

const validateSingleKey=async (keyData,provider)=> {
const keyId=keyData.id;
setValidatingKeys(prev=> ({
...prev,
[keyId]: true
}));

try {
let validation;
if (provider==='openai') {
validation=await validateOpenAIKey(keyData.key);
} else if (provider==='perplexity') {
validation=await validatePerplexityKey(keyData.key);
}

if (validation.isValid) {
toast.success(`${provider==='openai' ? 'OpenAI' : 'Perplexity'} API key is valid!`);
} else {
toast.error(`Invalid ${provider==='openai' ? 'OpenAI' : 'Perplexity'} key: ${validation.error}`);
}
} catch (error) {
console.error(`Error validating ${provider} key:`,error);
toast.error(`Failed to validate ${provider==='openai' ? 'OpenAI' : 'Perplexity'} API key.`);
} finally {
setValidatingKeys(prev=> ({
...prev,
[keyId]: false
}));
}
};

const tabs=[
{id: 'openai',label: 'OpenAI API Keys',icon: FiKey},
{id: 'perplexity',label: 'Perplexity API Keys',icon: FiKey},
{id: 'lms',label: 'LMS Credentials',icon: FiServer},
{id: 'aitable',label: 'AITable Integration',icon: FiDatabase} // ✅ NEW: AITable tab
];

return (
<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
className="mb-8"
>
<h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
<p className="text-gray-600">
Manage your API keys, LMS credentials, and integration settings for content generation.
</p>
</motion.div>

{/* Tab Navigation */}
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
transition={{delay: 0.05}}
className="mb-8"
>
<div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
{tabs.map((tab)=> (
<button
key={tab.id}
onClick={()=> setActiveTab(tab.id)}
className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
activeTab===tab.id
? 'bg-white text-primary-600 shadow-sm'
: 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
}`}
>
<SafeIcon icon={tab.icon} />
<span className="font-medium">{tab.label}</span>
</button>
))}
</div>
</motion.div>

<div className="space-y-8">
{/* OpenAI API Keys Tab */}
{activeTab==='openai' && (
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
transition={{delay: 0.1}}
>
<Card className="p-6">
<div className="flex items-center space-x-3 mb-6">
<div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
<SafeIcon icon={FiKey} className="text-white text-lg" />
</div>
<div>
<h2 className="text-xl font-semibold text-gray-900">OpenAI API Keys</h2>
<p className="text-sm text-gray-600">Used for content generation and program structure creation</p>
</div>
</div>

{/* Add New OpenAI API Key */}
<form onSubmit={handleOpenAISubmit(handleAddOpenAIKey)} className="mb-6">
<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
<Input
label="OpenAI API Key"
type="password"
placeholder="sk-..."
{...registerOpenAI('key',{
required: 'API key is required',
pattern: {
value: /^sk-/,
message: 'OpenAI API key must start with "sk-"'
}
})}
error={openaiErrors.key?.message}
/>
<Input
label="Label (Optional)"
placeholder="e.g.,Primary Key"
{...registerOpenAI('label')}
/>
<div className="flex items-end">
<Button
type="submit"
loading={validatingKeys.openai}
className="w-full"
>
<SafeIcon icon={FiPlus} className="mr-2" />
Add & Validate
</Button>
</div>
</div>
</form>

{/* OpenAI Keys List */}
<div className="space-y-3">
{openaiApiKeys.length===0 ? (
<p className="text-gray-600 text-center py-4">
No OpenAI API keys configured. Add your first key above.
</p>
) : (
openaiApiKeys.map((keyData)=> (
<div
key={keyData.id}
className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
>
<div className="flex-1">
<h3 className="font-medium text-gray-900">
{keyData.label}
</h3>
<p className="text-sm text-gray-600">
Added {new Date(keyData.createdAt).toLocaleDateString()}
</p>
</div>
<div className="flex items-center space-x-2">
<Button
variant="ghost"
size="sm"
onClick={()=> validateSingleKey({id: keyData.id,key: keyData.key},'openai')}
loading={validatingKeys[keyData.id]}
>
<SafeIcon icon={FiCheck} />
</Button>
<button
onClick={()=> toggleOpenAIKey(keyData.id)}
className={`p-2 rounded-lg transition-colors ${
keyData.isActive
? 'text-green-600 hover:bg-green-100'
: 'text-gray-400 hover:bg-gray-200'
}`}
>
<SafeIcon icon={keyData.isActive ? FiToggleRight : FiToggleLeft} />
</button>
<Button
variant="danger"
size="sm"
onClick={()=> {
removeOpenAIKey(keyData.id);
toast.success('OpenAI API key removed');
}}
>
<SafeIcon icon={FiTrash2} />
</Button>
</div>
</div>
))
)}
</div>
</Card>
</motion.div>
)}

{/* Perplexity API Keys Tab */}
{activeTab==='perplexity' && (
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
transition={{delay: 0.1}}
>
<Card className="p-6">
<div className="flex items-center space-x-3 mb-6">
<div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
<SafeIcon icon={FiKey} className="text-white text-lg" />
</div>
<div>
<h2 className="text-xl font-semibold text-gray-900">Perplexity API Keys</h2>
<p className="text-sm text-gray-600">Used for real-time industry research and current trends</p>
</div>
</div>

{/* Add New Perplexity API Key */}
<form onSubmit={handlePerplexitySubmit(handleAddPerplexityKey)} className="mb-6">
<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
<Input
label="Perplexity API Key"
type="password"
placeholder="pplx-..."
{...registerPerplexity('key',{
required: 'API key is required',
pattern: {
value: /^pplx-/,
message: 'Perplexity API key must start with "pplx-"'
}
})}
error={perplexityErrors.key?.message}
/>
<Input
label="Label (Optional)"
placeholder="e.g.,Primary Research"
{...registerPerplexity('label')}
/>
<div className="flex items-center space-x-2 mt-8">
<input
type="checkbox"
{...registerPerplexity('isPrimary')}
className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
/>
<span className="text-sm text-gray-700">Set as Primary</span>
</div>
<div className="flex items-end">
<Button
type="submit"
loading={validatingKeys.perplexity}
className="w-full bg-purple-600 hover:bg-purple-700"
>
<SafeIcon icon={FiPlus} className="mr-2" />
Add & Validate
</Button>
</div>
</div>
</form>

{/* Perplexity Keys List */}
<div className="space-y-3">
{perplexityApiKeys.length===0 ? (
<p className="text-gray-600 text-center py-4">
No Perplexity API keys configured. Add your first key above.
</p>
) : (
perplexityApiKeys.map((keyData)=> (
<div
key={keyData.id}
className="flex items-center justify-between p-4 bg-purple-50 rounded-lg border border-purple-200"
>
<div className="flex items-center space-x-3">
{keyData.isPrimary && (
<SafeIcon icon={FiStar} className="text-purple-600" />
)}
<div className="flex-1">
<h3 className="font-medium text-gray-900">
{keyData.label}
{keyData.isPrimary && (
<span className="ml-2 px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded-full">
Primary
</span>
)}
</h3>
<p className="text-sm text-gray-600">
Added {new Date(keyData.createdAt).toLocaleDateString()}
</p>
</div>
</div>
<div className="flex items-center space-x-2">
<Button
variant="ghost"
size="sm"
onClick={()=> validateSingleKey({id: keyData.id,key: keyData.key},'perplexity')}
loading={validatingKeys[keyData.id]}
>
<SafeIcon icon={FiCheck} />
</Button>
{!keyData.isPrimary && (
<Button
variant="ghost"
size="sm"
onClick={()=> {
setPrimaryPerplexityKey(keyData.id);
toast.success('Primary Perplexity key updated');
}}
className="text-purple-600 hover:bg-purple-100"
>
<SafeIcon icon={FiStar} />
</Button>
)}
<button
onClick={()=> togglePerplexityKey(keyData.id)}
className={`p-2 rounded-lg transition-colors ${
keyData.isActive
? 'text-green-600 hover:bg-green-100'
: 'text-gray-400 hover:bg-gray-200'
}`}
>
<SafeIcon icon={keyData.isActive ? FiToggleRight : FiToggleLeft} />
</button>
<Button
variant="danger"
size="sm"
onClick={()=> {
removePerplexityKey(keyData.id);
toast.success('Perplexity API key removed');
}}
>
<SafeIcon icon={FiTrash2} />
</Button>
</div>
</div>
))
)}
</div>

{/* Perplexity Info */}
<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
<h4 className="font-medium text-blue-800 mb-2">About Perplexity Integration</h4>
<ul className="text-sm text-blue-700 space-y-1">
<li>• Used for real-time industry research and current trends</li>
<li>• Provides up-to-date market insights and statistics</li>
<li>• Enhances course content with recent developments</li>
<li>• Primary key is used by default for research tasks</li>
<li>• Fallback to secondary keys if primary is rate-limited</li>
</ul>
</div>
</Card>
</motion.div>
)}

{/* LMS Credentials Tab */}
{activeTab==='lms' && (
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
transition={{delay: 0.1}}
>
<Card className="p-6">
<div className="flex items-center space-x-3 mb-6">
<div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
<SafeIcon icon={FiServer} className="text-white text-lg" />
</div>
<h2 className="text-xl font-semibold text-gray-900">LMS Credentials</h2>
</div>

{/* LMS Type Selection */}
<div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
<div className="flex items-center space-x-3 mb-4">
<SafeIcon icon={FiSettings} className="text-blue-600 text-lg" />
<h3 className="font-medium text-blue-800">LMS Platform Selection</h3>
</div>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
{Object.entries(LMS_CONFIGS).map(([lmsType,config])=> (
<div
key={lmsType}
className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
currentLMSType===lmsType
? 'border-blue-500 bg-blue-50'
: 'border-gray-200 bg-white hover:border-blue-300'
}`}
onClick={()=> handleLMSTypeChange(lmsType)}
>
<div className="flex items-center space-x-3 mb-2">
<div className={`w-4 h-4 rounded-full border-2 ${
currentLMSType===lmsType
? 'border-blue-500 bg-blue-500'
: 'border-gray-300'
}`}>
{currentLMSType===lmsType && (
<div className="w-full h-full rounded-full bg-white transform scale-50"></div>
)}
</div>
<h4 className="font-medium text-gray-900">{config.name}</h4>
</div>
<p className="text-sm text-gray-600 mb-3">{config.description}</p>
<div className="text-xs text-gray-500">
<div className="mb-1">
<strong>Structure:</strong> {config.features.contentStructure}
</div>
<div>
<strong>Quiz Level:</strong> {config.features.quizAttachmentLevel}
</div>
</div>
</div>
))}
</div>

{/* Current LMS Info */}
<div className="mt-4 p-3 bg-white border border-blue-200 rounded-lg">
<div className="flex items-center space-x-2 mb-2">
<SafeIcon icon={FiInfo} className="text-blue-600" />
<span className="font-medium text-blue-800">
Currently using: {currentLMSConfig.name}
</span>
</div>
<div className="text-sm text-blue-700">
<div className="mb-1">Content structure: {currentLMSConfig.features.contentStructure}</div>
<div>Quizzes are attached to: {currentLMSConfig.features.quizAttachmentLevel}s</div>
</div>
</div>
</div>

<form onSubmit={handleLMSSubmit(handleUpdateLMS)} className="space-y-6">
{/* Hidden field for LMS type */}
<input
type="hidden"
{...registerLMS('lmsType')}
value={currentLMSType}
/>

<Input
label="Base URL"
placeholder="https://your-lms-domain.com"
{...registerLMS('baseUrl',{
required: 'Base URL is required',
pattern: {
value: /^https?:\/\/.+/,
message: 'Please enter a valid URL'
}
})}
error={lmsErrors.baseUrl?.message}
/>

<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
<Input
label="Username"
placeholder="API Username"
{...registerLMS('username',{
required: 'Username is required'
})}
error={lmsErrors.username?.message}
/>

<div className="relative">
<Input
label="Password"
type={showPasswords.password ? 'text' : 'password'}
placeholder="API Password"
{...registerLMS('password',{
required: 'Password is required'
})}
error={lmsErrors.password?.message}
/>
<button
type="button"
onClick={()=> togglePasswordVisibility('password')}
className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
>
<SafeIcon icon={showPasswords.password ? FiEyeOff : FiEye} />
</button>
</div>
</div>

<div className="flex justify-end">
<Button type="submit">Update Credentials</Button>
</div>
</form>

{/* LMS Features Info */}
<div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
<h4 className="font-medium text-gray-800 mb-2">
{currentLMSConfig.name} Features & Compatibility
</h4>
<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
<div>
<div className="mb-2">
<strong>Content Structure:</strong>
<br />
{currentLMSConfig.features.contentStructure}
</div>
<div className="mb-2">
<strong>Quiz Attachment:</strong>
<br />
Quizzes are attached to {currentLMSConfig.features.quizAttachmentLevel}s
</div>
</div>
<div>
<div className="mb-2">
<strong>Supported Features:</strong>
<ul className="list-disc list-inside mt-1">
{currentLMSConfig.features.supportsTopics && <li>Topics/Sections</li>}
{currentLMSConfig.features.supportsAssignments && <li>Assignments</li>}
<li>Lessons with rich content</li>
<li>Quizzes with multiple question types</li>
</ul>
</div>
</div>
</div>
</div>
</Card>
</motion.div>
)}

{/* ✅ NEW: AITable Integration Tab */}
{activeTab==='aitable' && (
<motion.div
initial={{opacity: 0,y: 20}}
animate={{opacity: 1,y: 0}}
transition={{delay: 0.1}}
>
<Card className="p-6">
<div className="flex items-center space-x-3 mb-6">
<div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
<SafeIcon icon={FiDatabase} className="text-white text-lg" />
</div>
<div>
<h2 className="text-xl font-semibold text-gray-900">AITable Integration</h2>
<p className="text-sm text-gray-600">Optional integration to store course data in AITable after successful generation</p>
</div>
</div>

{/* AITable Status */}
<div className="mb-6 p-4 bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg">
<div className="flex items-center justify-between mb-3">
<div className="flex items-center space-x-3">
<SafeIcon icon={FiDatabase} className="text-orange-600 text-lg" />
<h3 className="font-medium text-orange-800">Integration Status</h3>
</div>
<div className="flex items-center space-x-2">
<span className="text-sm text-orange-700">
{isAITableEnabled() ? 'Enabled' : 'Disabled'}
</span>
<button
onClick={toggleAITableIntegration}
className={`p-2 rounded-lg transition-colors ${
isAITableEnabled()
? 'text-green-600 hover:bg-green-100'
: 'text-gray-400 hover:bg-gray-200'
}`}
>
<SafeIcon icon={isAITableEnabled() ? FiToggleRight : FiToggleLeft} />
</button>
</div>
</div>
<p className="text-orange-700 text-sm">
{isAITableEnabled() 
? '✅ AITable integration is active. Course data will be automatically posted to your datasheet after successful generation.'
: '⏸️ AITable integration is disabled. Configure your credentials below and enable to start logging course data.'
}
</p>
</div>

<form onSubmit={handleAITableSubmit(handleUpdateAITable)} className="space-y-6">
<div className="grid grid-cols-1 gap-6">
<div className="relative">
<Input
label="AITable API Key"
type={showPasswords.aitableApiKey ? 'text' : 'password'}
placeholder="Enter your AITable API key"
{...registerAITable('apiKey')}
error={aitableErrors.apiKey?.message}
/>
<button
type="button"
onClick={()=> togglePasswordVisibility('aitableApiKey')}
className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
>
<SafeIcon icon={showPasswords.aitableApiKey ? FiEyeOff : FiEye} />
</button>
</div>

<Input
label="Datasheet ID"
placeholder="Enter your AITable datasheet ID"
{...registerAITable('datasheetId')}
error={aitableErrors.datasheetId?.message}
/>

<div className="flex items-center space-x-3">
<input
type="checkbox"
{...registerAITable('isActive')}
className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500"
/>
<span className="text-sm font-medium text-gray-700">
Enable AITable integration
</span>
</div>
</div>

<div className="flex justify-end">
<Button 
type="submit" 
loading={validatingKeys.aitable}
className="bg-orange-600 hover:bg-orange-700"
>
{validatingKeys.aitable ? 'Validating...' : 'Save & Validate'}
</Button>
</div>
</form>

{/* AITable Info */}
<div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
<h4 className="font-medium text-blue-800 mb-2">About AITable Integration</h4>
<div className="text-sm text-blue-700 space-y-2">
<p><strong>What gets stored:</strong></p>
<ul className="list-disc list-inside ml-4 space-y-1">
<li>Program title and course title</li>
<li>Complete topic and lesson structure</li>
<li>Course creation timestamp</li>
<li>Unique course identifier</li>
<li>JSON formatted lesson slides for all lessons</li>
</ul>
<p className="mt-3"><strong>When data is sent:</strong></p>
<p className="ml-4">Automatically after successful course generation and LMS upload</p>
<p className="mt-3"><strong>Data format:</strong></p>
<p className="ml-4">Structured JSON records compatible with AITable's API format</p>
</div>
</div>

{/* AITable Setup Instructions */}
<div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
<h4 className="font-medium text-gray-800 mb-2">Setup Instructions</h4>
<div className="text-sm text-gray-600 space-y-2">
<p><strong>1. Get your AITable API Key:</strong></p>
<p className="ml-4">• Go to your AITable account settings</p>
<p className="ml-4">• Navigate to API section and generate a new API key</p>
<p className="ml-4">• Copy the key and paste it above</p>
<p className="mt-2"><strong>2. Find your Datasheet ID:</strong></p>
<p className="ml-4">• Open your target datasheet in AITable</p>
<p className="ml-4">• Copy the datasheet ID from the URL</p>
<p className="ml-4">• Ensure the datasheet has the required fields</p>
<p className="mt-2"><strong>3. Required Fields in your AITable datasheet:</strong></p>
<div className="ml-4 bg-white p-3 rounded border text-xs font-mono">
<div>• ProgramTitle (Text)</div>
<div>• CourseTitle (Text)</div>
<div>• TopicLessonStructure (Text)</div>
<div>• CreattionDate (Number)</div>
<div>• Target (Text)</div>
<div>• courseuniqueid (Text)</div>
<div>• LessonSlidesJson (Text)</div>
</div>
</div>
</div>
</Card>
</motion.div>
)}
</div>
</div>
);
};

export default Settings;
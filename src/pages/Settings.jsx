import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useSettingsStore } from '../stores/settingsStore';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { validateOpenAIKey } from '../services/apiKeyValidator';
import { validatePerplexityKey } from '../services/perplexityService';

const { FiKey, FiServer, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff, FiStar, FiCheck, FiX } = FiIcons;

const Settings = () => {
  const [showPasswords, setShowPasswords] = useState({});
  const [validatingKeys, setValidatingKeys] = useState({});
  const [activeTab, setActiveTab] = useState('openai'); // 'openai', 'perplexity', 'lms'

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
    getDecryptedLMSCredentials
  } = useSettingsStore();

  // Forms
  const { register: registerOpenAI, handleSubmit: handleOpenAISubmit, reset: resetOpenAI, formState: { errors: openaiErrors } } = useForm();
  const { register: registerPerplexity, handleSubmit: handlePerplexitySubmit, reset: resetPerplexity, formState: { errors: perplexityErrors } } = useForm();
  const { register: registerLMS, handleSubmit: handleLMSSubmit, formState: { errors: lmsErrors } } = useForm({
    defaultValues: getDecryptedLMSCredentials()
  });

  const handleAddOpenAIKey = async (data) => {
    setValidatingKeys(prev => ({ ...prev, openai: true }));
    
    try {
      // Validate the key before adding
      const validation = await validateOpenAIKey(data.key);
      
      if (validation.isValid) {
        addOpenAIKey(data.key, data.label);
        resetOpenAI();
        toast.success('OpenAI API key added and validated successfully!');
      } else {
        toast.error(`Invalid OpenAI API key: ${validation.error}`);
      }
    } catch (error) {
      console.error('Error validating OpenAI key:', error);
      toast.error('Failed to validate OpenAI API key. Please try again.');
    } finally {
      setValidatingKeys(prev => ({ ...prev, openai: false }));
    }
  };

  const handleAddPerplexityKey = async (data) => {
    setValidatingKeys(prev => ({ ...prev, perplexity: true }));
    
    try {
      // Validate the key before adding
      const validation = await validatePerplexityKey(data.key);
      
      if (validation.isValid) {
        addPerplexityKey(data.key, data.label, data.isPrimary || perplexityApiKeys.length === 0);
        resetPerplexity();
        toast.success('Perplexity API key added and validated successfully!');
      } else {
        toast.error(`Invalid Perplexity API key: ${validation.error}`);
      }
    } catch (error) {
      console.error('Error validating Perplexity key:', error);
      toast.error('Failed to validate Perplexity API key. Please try again.');
    } finally {
      setValidatingKeys(prev => ({ ...prev, perplexity: false }));
    }
  };

  const handleUpdateLMS = (data) => {
    updateLMSCredentials(data);
    toast.success('LMS credentials updated successfully!');
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const validateSingleKey = async (keyData, provider) => {
    const keyId = keyData.id;
    setValidatingKeys(prev => ({ ...prev, [keyId]: true }));
    
    try {
      let validation;
      if (provider === 'openai') {
        validation = await validateOpenAIKey(keyData.key);
      } else if (provider === 'perplexity') {
        validation = await validatePerplexityKey(keyData.key);
      }
      
      if (validation.isValid) {
        toast.success(`${provider === 'openai' ? 'OpenAI' : 'Perplexity'} API key is valid!`);
      } else {
        toast.error(`Invalid ${provider === 'openai' ? 'OpenAI' : 'Perplexity'} key: ${validation.error}`);
      }
    } catch (error) {
      console.error(`Error validating ${provider} key:`, error);
      toast.error(`Failed to validate ${provider === 'openai' ? 'OpenAI' : 'Perplexity'} API key.`);
    } finally {
      setValidatingKeys(prev => ({ ...prev, [keyId]: false }));
    }
  };

  const tabs = [
    { id: 'openai', label: 'OpenAI API Keys', icon: FiKey },
    { id: 'perplexity', label: 'Perplexity API Keys', icon: FiKey },
    { id: 'lms', label: 'LMS Credentials', icon: FiServer }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">
          Manage your API keys and LMS credentials for content generation.
        </p>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="mb-8"
      >
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-all duration-200 ${
                activeTab === tab.id
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
        {activeTab === 'openai' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
                    {...registerOpenAI('key', {
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
                    placeholder="e.g., Primary Key"
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
                {openaiApiKeys.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    No OpenAI API keys configured. Add your first key above.
                  </p>
                ) : (
                  openaiApiKeys.map((keyData) => (
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
                          onClick={() => validateSingleKey({ id: keyData.id, key: keyData.key }, 'openai')}
                          loading={validatingKeys[keyData.id]}
                        >
                          <SafeIcon icon={FiCheck} />
                        </Button>
                        <button
                          onClick={() => toggleOpenAIKey(keyData.id)}
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
                          onClick={() => {
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
        {activeTab === 'perplexity' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
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
                    {...registerPerplexity('key', {
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
                    placeholder="e.g., Primary Research"
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
                {perplexityApiKeys.length === 0 ? (
                  <p className="text-gray-600 text-center py-4">
                    No Perplexity API keys configured. Add your first key above.
                  </p>
                ) : (
                  perplexityApiKeys.map((keyData) => (
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
                          onClick={() => validateSingleKey({ id: keyData.id, key: keyData.key }, 'perplexity')}
                          loading={validatingKeys[keyData.id]}
                        >
                          <SafeIcon icon={FiCheck} />
                        </Button>
                        {!keyData.isPrimary && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setPrimaryPerplexityKey(keyData.id);
                              toast.success('Primary Perplexity key updated');
                            }}
                            className="text-purple-600 hover:bg-purple-100"
                          >
                            <SafeIcon icon={FiStar} />
                          </Button>
                        )}
                        <button
                          onClick={() => togglePerplexityKey(keyData.id)}
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
                          onClick={() => {
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
        {activeTab === 'lms' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiServer} className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">LMS Credentials</h2>
              </div>

              <form onSubmit={handleLMSSubmit(handleUpdateLMS)} className="space-y-6">
                <Input
                  label="Base URL"
                  placeholder="https://your-lms-domain.com"
                  {...registerLMS('baseUrl', {
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
                    {...registerLMS('username', {
                      required: 'Username is required'
                    })}
                    error={lmsErrors.username?.message}
                  />

                  <div className="relative">
                    <Input
                      label="Password"
                      type={showPasswords.password ? 'text' : 'password'}
                      placeholder="API Password"
                      {...registerLMS('password', {
                        required: 'Password is required'
                      })}
                      error={lmsErrors.password?.message}
                    />
                    <button
                      type="button"
                      onClick={() => togglePasswordVisibility('password')}
                      className="absolute right-3 top-9 text-gray-400 hover:text-gray-600"
                    >
                      <SafeIcon icon={showPasswords.password ? FiEyeOff : FiEye} />
                    </button>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit">
                    Update Credentials
                  </Button>
                </div>
              </form>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Settings;
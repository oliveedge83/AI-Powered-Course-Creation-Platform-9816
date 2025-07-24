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

const { FiKey, FiServer, FiPlus, FiTrash2, FiToggleLeft, FiToggleRight, FiEye, FiEyeOff } = FiIcons;

const Settings = () => {
  const [showPasswords, setShowPasswords] = useState({});
  const {
    openaiApiKeys,
    lmsCredentials,
    addOpenAIKey,
    removeOpenAIKey,
    toggleOpenAIKey,
    updateLMSCredentials,
    getDecryptedLMSCredentials
  } = useSettingsStore();

  const { register: registerApiKey, handleSubmit: handleApiKeySubmit, reset: resetApiKey, formState: { errors: apiKeyErrors } } = useForm();
  const { register: registerLMS, handleSubmit: handleLMSSubmit, formState: { errors: lmsErrors } } = useForm({
    defaultValues: getDecryptedLMSCredentials()
  });

  const handleAddApiKey = (data) => {
    addOpenAIKey(data.key, data.label);
    resetApiKey();
    toast.success('API key added successfully!');
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

      <div className="space-y-8">
        {/* OpenAI API Keys */}
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
              <h2 className="text-xl font-semibold text-gray-900">OpenAI API Keys</h2>
            </div>

            {/* Add New API Key */}
            <form onSubmit={handleApiKeySubmit(handleAddApiKey)} className="mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input
                  label="API Key"
                  type="password"
                  placeholder="sk-..."
                  {...registerApiKey('key', {
                    required: 'API key is required',
                    pattern: {
                      value: /^sk-/,
                      message: 'API key must start with "sk-"'
                    }
                  })}
                  error={apiKeyErrors.key?.message}
                />
                <Input
                  label="Label (Optional)"
                  placeholder="e.g., Primary Key"
                  {...registerApiKey('label')}
                />
                <div className="flex items-end">
                  <Button type="submit" className="w-full">
                    <SafeIcon icon={FiPlus} className="mr-2" />
                    Add Key
                  </Button>
                </div>
              </div>
            </form>

            {/* API Keys List */}
            <div className="space-y-3">
              {openaiApiKeys.length === 0 ? (
                <p className="text-gray-600 text-center py-4">
                  No API keys configured. Add your first OpenAI API key above.
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
                          toast.success('API key removed');
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

        {/* LMS Credentials */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
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
      </div>
    </div>
  );
};

export default Settings;
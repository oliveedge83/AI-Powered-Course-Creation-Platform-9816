import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useSettingsStore } from '../../stores/settingsStore';
import { validateApiKeys } from '../../services/apiKeyValidator';
import Button from './Button';

const { FiCheckCircle, FiXCircle, FiClock, FiRefreshCw, FiAlertTriangle } = FiIcons;

const ApiKeyStatus = ({ onValidationComplete }) => {
  const [validationStatus, setValidationStatus] = useState('idle'); // idle, validating, success, error
  const [validationResult, setValidationResult] = useState(null);
  const [validating, setValidating] = useState(false);
  const { getActiveOpenAIKeys } = useSettingsStore();

  const validateKeys = async () => {
    setValidating(true);
    setValidationStatus('validating');
    
    const activeKeys = getActiveOpenAIKeys();
    
    if (activeKeys.length === 0) {
      setValidationStatus('error');
      setValidationResult({
        hasValidKey: false,
        error: 'No API keys configured. Please add at least one OpenAI API key in settings.'
      });
      setValidating(false);
      return;
    }

    try {
      const result = await validateApiKeys(activeKeys);
      
      if (result.hasValidKey) {
        setValidationStatus('success');
        setValidationResult(result);
        onValidationComplete?.(result);
      } else {
        setValidationStatus('error');
        setValidationResult(result);
      }
    } catch (error) {
      console.error('Error validating API keys:', error);
      setValidationStatus('error');
      setValidationResult({
        hasValidKey: false,
        error: 'Failed to validate API keys. Please check your internet connection.'
      });
    } finally {
      setValidating(false);
    }
  };

  // Auto-validate on mount
  useEffect(() => {
    const activeKeys = getActiveOpenAIKeys();
    if (activeKeys.length > 0) {
      validateKeys();
    } else {
      setValidationStatus('error');
      setValidationResult({
        hasValidKey: false,
        error: 'No API keys configured'
      });
    }
  }, []);

  const getStatusIcon = () => {
    switch (validationStatus) {
      case 'validating':
        return FiClock;
      case 'success':
        return FiCheckCircle;
      case 'error':
        return FiXCircle;
      default:
        return FiAlertTriangle;
    }
  };

  const getStatusColor = () => {
    switch (validationStatus) {
      case 'validating':
        return 'text-blue-600 bg-blue-100 border-blue-200';
      case 'success':
        return 'text-green-600 bg-green-100 border-green-200';
      case 'error':
        return 'text-red-600 bg-red-100 border-red-200';
      default:
        return 'text-yellow-600 bg-yellow-100 border-yellow-200';
    }
  };

  const getStatusMessage = () => {
    switch (validationStatus) {
      case 'validating':
        return 'Validating API keys...';
      case 'success':
        return `✅ Valid API key found: ${validationResult?.validKey?.label}`;
      case 'error':
        return `❌ ${validationResult?.error || 'API key validation failed'}`;
      default:
        return 'API key validation required';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${getStatusColor()}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${validating ? 'animate-spin' : ''}`}>
            <SafeIcon icon={getStatusIcon()} className="text-lg" />
          </div>
          <div>
            <h3 className="font-medium">OpenAI API Key Status</h3>
            <p className="text-sm opacity-90">{getStatusMessage()}</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={validateKeys}
            loading={validating}
            className="flex items-center space-x-2"
          >
            <SafeIcon icon={FiRefreshCw} />
            <span>Revalidate</span>
          </Button>
        </div>
      </div>
      
      {validationResult?.validation?.usage && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-xs opacity-75">
            Token usage: {validationResult.validation.usage.total_tokens} tokens
          </p>
        </div>
      )}
      
      {validationStatus === 'error' && validationResult?.error && (
        <div className="mt-3 pt-3 border-t border-current/20">
          <p className="text-xs opacity-75">
            Tip: Check your API key format and permissions in OpenAI dashboard
          </p>
        </div>
      )}
    </motion.div>
  );
};

export default ApiKeyStatus;
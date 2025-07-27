import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { FiAlertCircle, FiCheckCircle, FiLoader, FiX } = FiIcons;

const StatusBar = ({ 
  visible, 
  type = 'info', 
  message, 
  progress = 0,
  onClose 
}) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return FiCheckCircle;
      case 'error':
        return FiAlertCircle;
      case 'loading':
        return FiLoader;
      default:
        return FiLoader;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'success':
        return 'bg-green-500';
      case 'error':
        return 'bg-red-500';
      case 'loading':
        return 'bg-blue-500';
      default:
        return 'bg-blue-500';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -50, opacity: 0 }}
        className="fixed top-16 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <div className={`p-2 rounded-full ${type === 'loading' ? 'animate-spin' : ''}`}>
                <SafeIcon icon={getIcon()} className={`text-${type === 'loading' ? 'blue' : type === 'success' ? 'green' : 'red'}-600`} />
              </div>
              <h3 className="font-medium">{type.charAt(0).toUpperCase() + type.slice(1)}</h3>
            </div>
            {onClose && (
              <button 
                onClick={onClose} 
                className="p-1 hover:bg-gray-100 rounded-full"
              >
                <SafeIcon icon={FiX} />
              </button>
            )}
          </div>
          
          <p className="text-gray-600 mb-2">{message}</p>
          
          {progress > 0 && progress < 100 && (
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <motion.div 
                className={`h-2.5 rounded-full ${getColor()}`}
                initial={{ width: '0%' }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default StatusBar;
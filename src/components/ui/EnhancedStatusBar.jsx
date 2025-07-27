import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';

const { 
  FiAlertCircle, 
  FiCheckCircle, 
  FiLoader, 
  FiX, 
  FiMinus, 
  FiMaximize2, 
  FiPause, 
  FiPlay, 
  FiStop,
  FiClock,
  FiBook,
  FiList,
  FiTarget,
  FiChevronDown,
  FiChevronUp
} = FiIcons;

const EnhancedStatusBar = ({ 
  visible, 
  type = 'info', 
  message, 
  progress = 0, 
  isMinimized = false,
  isPaused = false,
  canPause = false,
  canAbort = false,
  currentTask = '',
  totalTasks = 0,
  completedTasks = 0,
  estimatedTimeRemaining = null,
  details = {},
  onClose,
  onMinimize,
  onMaximize,
  onPause,
  onResume,
  onAbort
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return FiCheckCircle;
      case 'error':
        return FiAlertCircle;
      case 'loading':
        return isPaused ? FiPause : FiLoader;
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
        return isPaused ? 'bg-yellow-500' : 'bg-blue-500';
      default:
        return 'bg-blue-500';
    }
  };

  const formatTime = (milliseconds) => {
    if (!milliseconds) return 'Calculating...';
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const MinimizedView = () => (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 0, opacity: 0 }}
      className="fixed top-20 right-4 z-50 bg-white rounded-lg shadow-lg border border-gray-200 p-3 cursor-pointer"
      onClick={onMaximize}
    >
      <div className="flex items-center space-x-2">
        <div className={`p-1 rounded-full ${type === 'loading' && !isPaused ? 'animate-spin' : ''}`}>
          <SafeIcon 
            icon={getIcon()} 
            className={`text-${type === 'loading' ? 'blue' : type === 'success' ? 'green' : 'red'}-600`} 
          />
        </div>
        <div className="text-sm">
          <div className="font-medium">{Math.round(progress)}%</div>
          <div className="text-xs text-gray-500">{completedTasks}/{totalTasks}</div>
        </div>
        <div className="w-8 h-2 bg-gray-200 rounded-full overflow-hidden">
          <motion.div
            className={`h-full ${getColor()}`}
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </motion.div>
  );

  const FullView = () => (
    <motion.div
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -50, opacity: 0 }}
      className="fixed top-16 right-4 z-50 max-w-md w-full bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-full ${type === 'loading' && !isPaused ? 'animate-spin' : ''}`}>
              <SafeIcon 
                icon={getIcon()} 
                className={`text-${type === 'loading' ? 'blue' : type === 'success' ? 'green' : 'red'}-600`} 
              />
            </div>
            <div>
              <h3 className="font-medium">
                {type === 'loading' ? (isPaused ? 'Paused' : 'Generating') : type.charAt(0).toUpperCase() + type.slice(1)}
              </h3>
              <p className="text-sm text-gray-600">{details.courseTitle}</p>
            </div>
          </div>
          <div className="flex items-center space-x-1">
            {canPause && (
              <button
                onClick={isPaused ? onResume : onPause}
                className={`p-1 hover:bg-gray-100 rounded-full ${isPaused ? 'text-green-600' : 'text-yellow-600'}`}
                title={isPaused ? 'Resume' : 'Pause'}
              >
                <SafeIcon icon={isPaused ? FiPlay : FiPause} />
              </button>
            )}
            {canAbort && (
              <button
                onClick={onAbort}
                className="p-1 hover:bg-gray-100 rounded-full text-red-600"
                title="Abort"
              >
                <SafeIcon icon={FiStop} />
              </button>
            )}
            <button
              onClick={onMinimize}
              className="p-1 hover:bg-gray-100 rounded-full"
              title="Minimize"
            >
              <SafeIcon icon={FiMinus} />
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full"
                title="Close"
              >
                <SafeIcon icon={FiX} />
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>{Math.round(progress)}% Complete</span>
            <span>{completedTasks}/{totalTasks} tasks</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <motion.div
              className={`h-2.5 rounded-full ${getColor()}`}
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        {/* Current Task */}
        <p className="text-sm text-gray-700 mb-2">{currentTask}</p>

        {/* Time Remaining */}
        {estimatedTimeRemaining && (
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <SafeIcon icon={FiClock} />
            <span>Est. {formatTime(estimatedTimeRemaining)} remaining</span>
          </div>
        )}
      </div>

      {/* Details Section */}
      <div className="p-4">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-between w-full text-sm font-medium text-gray-700 hover:text-gray-900"
        >
          <span>Progress Details</span>
          <SafeIcon icon={showDetails ? FiChevronUp : FiChevronDown} />
        </button>
        
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 space-y-2 text-sm"
            >
              {details.currentTopic && (
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiTarget} className="text-green-600" />
                  <span>Topic: {details.currentTopic}</span>
                </div>
              )}
              
              {details.currentLesson && (
                <div className="flex items-center space-x-2">
                  <SafeIcon icon={FiList} className="text-blue-600" />
                  <span>Lesson: {details.currentLesson}</span>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div>
                  <span className="font-medium">Topics:</span> {details.topicsCompleted}/{details.totalTopics}
                </div>
                <div>
                  <span className="font-medium">Lessons:</span> {details.lessonsCompleted}/{details.totalLessons}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );

  return (
    <AnimatePresence>
      {isMinimized ? <MinimizedView /> : <FullView />}
    </AnimatePresence>
  );
};

export default EnhancedStatusBar;
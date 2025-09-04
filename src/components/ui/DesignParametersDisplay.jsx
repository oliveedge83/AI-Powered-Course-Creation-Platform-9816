import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { 
  getParameterDisplayInfo, 
  generateParameterSummary,
  DEFAULT_DESIGN_PARAMETERS 
} from '../../services/instructionalParameterService';

const { FiSettings, FiChevronDown, FiChevronUp, FiEdit3 } = FiIcons;

const DesignParametersDisplay = ({ 
  designParameters = DEFAULT_DESIGN_PARAMETERS,
  onEdit,
  showEditButton = true,
  isCompact = false,
  className = ""
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const summary = generateParameterSummary(designParameters);

  if (isCompact) {
    return (
      <div className={`inline-flex items-center space-x-2 px-3 py-2 bg-purple-50 border border-purple-200 rounded-lg text-sm ${className}`}>
        <SafeIcon icon={FiSettings} className="text-purple-600" />
        <span className="text-purple-800 font-medium">Design Parameters</span>
        {showEditButton && onEdit && (
          <button
            onClick={onEdit}
            className="text-purple-600 hover:text-purple-800 transition-colors"
          >
            <SafeIcon icon={FiEdit3} />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`border border-purple-200 rounded-lg bg-purple-50 ${className}`}>
      <div 
        className="p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiSettings} className="text-purple-600 text-lg" />
            <div>
              <h4 className="font-medium text-purple-800">Design Parameters</h4>
              <p className="text-sm text-purple-700">{summary}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {showEditButton && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
                className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-100 rounded-lg transition-colors"
                title="Edit Parameters"
              >
                <SafeIcon icon={FiEdit3} />
              </button>
            )}
            <SafeIcon 
              icon={isExpanded ? FiChevronUp : FiChevronDown} 
              className="text-purple-600" 
            />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-purple-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                {Object.keys(designParameters).map((paramKey) => {
                  const displayInfo = getParameterDisplayInfo(paramKey, designParameters[paramKey]);
                  
                  return (
                    <div key={paramKey} className="bg-white p-3 rounded-lg border border-purple-100">
                      <div className="mb-1">
                        <span className="text-sm font-medium text-gray-700">
                          {displayInfo.parameterLabel}:
                        </span>
                        <span className="ml-2 text-sm text-purple-700 font-medium">
                          {displayInfo.valueLabel}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600">{displayInfo.description}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DesignParametersDisplay;
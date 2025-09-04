import React from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import Select from './Select';
import Card from './Card';
import { DESIGN_PARAMETERS, DEFAULT_DESIGN_PARAMETERS } from '../../services/instructionalParameterService';

const { FiSettings, FiInfo } = FiIcons;

const DesignParametersForm = ({ 
  designParameters = DEFAULT_DESIGN_PARAMETERS, 
  onChange, 
  title = "Design Parameters",
  description = "Configure instructional design parameters for enhanced content generation",
  showDescription = true,
  className = ""
}) => {
  const handleParameterChange = (parameterKey, value) => {
    const updatedParameters = {
      ...designParameters,
      [parameterKey]: value
    };
    onChange(updatedParameters);
  };

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
          <SafeIcon icon={FiSettings} className="text-white text-lg" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {showDescription && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
        </div>
      </div>

      {/* Information Banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <div className="flex items-start space-x-3">
          <SafeIcon icon={FiInfo} className="text-purple-600 mt-1" />
          <div>
            <h4 className="font-medium text-purple-800 mb-2">Enhanced Content Generation</h4>
            <p className="text-purple-700 text-sm mb-2">
              These parameters fine-tune the AI's instructional approach for each lesson, working alongside your existing RAG libraries and web search context.
            </p>
            <ul className="text-purple-700 text-sm space-y-1">
              <li>• <strong>Domain:</strong> Influences technical depth and example selection</li>
              <li>• <strong>Audience Level:</strong> Calibrates language complexity and explanation depth</li>
              <li>• <strong>Tone & Style:</strong> Sets the writing voice and presentation style</li>
              <li>• <strong>Content Focus:</strong> Determines the primary instructional goal</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.keys(DESIGN_PARAMETERS).map((paramKey) => {
          const paramConfig = DESIGN_PARAMETERS[paramKey];
          return (
            <motion.div
              key={paramKey}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Object.keys(DESIGN_PARAMETERS).indexOf(paramKey) * 0.1 }}
            >
              <Select
                label={paramConfig.label}
                value={designParameters[paramKey] || paramConfig.default}
                onChange={(e) => handleParameterChange(paramKey, e.target.value)}
                options={[
                  { value: '', label: `Select ${paramConfig.label}` },
                  ...paramConfig.options
                ]}
                className="w-full"
              />
              <p className="text-xs text-gray-500 mt-1">{paramConfig.description}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Current Configuration Summary */}
      <div className="mt-6 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Current Configuration</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {Object.keys(DESIGN_PARAMETERS).map((paramKey) => {
            const paramConfig = DESIGN_PARAMETERS[paramKey];
            const currentValue = designParameters[paramKey] || paramConfig.default;
            const option = paramConfig.options.find(opt => opt.value === currentValue);
            
            return (
              <div key={paramKey} className="flex justify-between">
                <span className="text-gray-600">{paramConfig.label}:</span>
                <span className="font-medium text-gray-900">
                  {option ? option.label : 'Default'}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
};

export default DesignParametersForm;
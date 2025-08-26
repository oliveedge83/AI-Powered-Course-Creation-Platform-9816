import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useProgram } from '../contexts/ProgramContext';
import { generateProgramStructure } from '../services/aiService';

const { FiArrowRight, FiLoader, FiBook, FiTarget, FiUsers, FiSettings } = FiIcons;

export default function ProgramInitiation() {
  const navigate = useNavigate();
  const { state, dispatch } = useProgram();
  const [formData, setFormData] = useState({
    niche: '',
    mustHaveAspects: '',
    designConsiderations: '',
    numberOfCourses: 4,
    instructionalModel: 'blooms-taxonomy',
    generateSlides: true,
    openaiApiKey: '',
    vectorStoreId: ''
  });

  const instructionalModels = [
    { value: 'blooms-taxonomy', label: "Bloom's Taxonomy" },
    { value: 'gagnes-nine', label: "Gagne's Nine Events" },
    { value: 'addie', label: 'ADDIE Model' },
    { value: 'sam', label: 'SAM (Successive Approximation)' },
    { value: 'kirkpatrick', label: 'Kirkpatrick Model' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.niche.trim() || !formData.mustHaveAspects.trim()) {
      dispatch({ type: 'SET_ERROR', payload: 'Please fill in all required fields' });
      return;
    }

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      dispatch({ type: 'SET_PROGRAM_DATA', payload: formData });
      
      // Simulate AI generation process
      const structure = await generateProgramStructure(formData);
      
      dispatch({ type: 'SET_GENERATED_STRUCTURE', payload: structure });
      navigate('/review');
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiBook} className="text-2xl text-white" />
            <h2 className="text-2xl font-bold text-white">
              Create New MicroMasters Program
            </h2>
          </div>
          <p className="text-blue-100 mt-2">
            Define your program requirements and let AI generate a comprehensive curriculum structure
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          {/* Program Details Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiTarget} className="text-xl text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Program Details</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                MicroMasters Program Niche *
              </label>
              <input
                type="text"
                name="niche"
                value={formData.niche}
                onChange={handleInputChange}
                placeholder="e.g., Data Science for Business Analytics"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Must-Have Aspects *
              </label>
              <textarea
                name="mustHaveAspects"
                value={formData.mustHaveAspects}
                onChange={handleInputChange}
                rows={4}
                placeholder="Key concepts, skills, or topics that are mandatory for the curriculum..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Other Design Considerations
              </label>
              <textarea
                name="designConsiderations"
                value={formData.designConsiderations}
                onChange={handleInputChange}
                rows={3}
                placeholder="Additional pedagogical notes, content style, or target audience nuances..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {/* Configuration Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiSettings} className="text-xl text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">Configuration</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Courses
                </label>
                <input
                  type="number"
                  name="numberOfCourses"
                  value={formData.numberOfCourses}
                  onChange={handleInputChange}
                  min="1"
                  max="12"
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Instructional Design Model
                </label>
                <select
                  name="instructionalModel"
                  value={formData.instructionalModel}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                >
                  {instructionalModels.map(model => (
                    <option key={model.value} value={model.value}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                name="generateSlides"
                checked={formData.generateSlides}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="text-sm font-medium text-gray-700">
                Generate Presentation Slides & Voice-over Scripts
              </label>
            </div>
          </div>

          {/* API Configuration Section */}
          <div className="space-y-6">
            <div className="flex items-center space-x-2 mb-4">
              <SafeIcon icon={FiUsers} className="text-xl text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900">API Configuration</h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key *
              </label>
              <input
                type="password"
                name="openaiApiKey"
                value={formData.openaiApiKey}
                onChange={handleInputChange}
                placeholder="sk-..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vector Store ID (Optional)
              </label>
              <input
                type="text"
                name="vectorStoreId"
                value={formData.vectorStoreId}
                onChange={handleInputChange}
                placeholder="vs_..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
              />
            </div>
          </div>

          {state.error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-700">{state.error}</p>
            </div>
          )}

          <motion.button
            type="submit"
            disabled={state.isLoading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
          >
            {state.isLoading ? (
              <SafeIcon icon={FiLoader} className="text-xl animate-spin" />
            ) : (
              <>
                <span>Generate Program Structure</span>
                <SafeIcon icon={FiArrowRight} className="text-xl" />
              </>
            )}
          </motion.button>
        </form>
      </div>
    </motion.div>
  );
}
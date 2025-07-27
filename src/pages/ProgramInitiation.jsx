import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useProgramStore } from '../stores/programStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useGeneration } from '../contexts/GenerationContext';
import Card from '../components/ui/Card';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import Select from '../components/ui/Select';
import Button from '../components/ui/Button';
import StatusBar from '../components/ui/StatusBar';
import { generateProgramStructure } from '../services/aiService';

const { FiTarget, FiBook, FiSettings, FiZap } = FiIcons;

const ProgramInitiation = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { addProgram } = useProgramStore();
  const { getActiveOpenAIKeys, getDecryptedLMSCredentials } = useSettingsStore();
  const { 
    generationStatus, 
    startGeneration, 
    updateProgress, 
    completeGeneration, 
    failGeneration,
    hideStatus
  } = useGeneration();
  
  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    defaultValues: {
      numberOfCourses: 5,
      instructionalDesignModel: 'blooms-taxonomy',
      generateSlides: true
    }
  });

  const instructionalModels = [
    { value: 'blooms-taxonomy', label: "Bloom's Taxonomy" },
    { value: 'gagnes-nine', label: "Gagne's Nine Events" },
    { value: 'addie', label: 'ADDIE Model' },
    { value: 'sam', label: 'SAM (Successive Approximation Model)' },
    { value: 'kirkpatrick', label: 'Kirkpatrick Model' }
  ];

  const onSubmit = async (data) => {
    const activeKeys = getActiveOpenAIKeys();
    const lmsCredentials = getDecryptedLMSCredentials();

    if (activeKeys.length === 0) {
      toast.error('Please add at least one OpenAI API key in settings.');
      navigate('/settings');
      return;
    }

    if (!lmsCredentials.username || !lmsCredentials.password) {
      toast.error('Please configure your LMS credentials in settings.');
      navigate('/settings');
      return;
    }

    setLoading(true);
    startGeneration('Initiating program structure generation...');
    
    try {
      toast.loading('Generating program structure with AI...', { id: 'generating' });
      
      // Update status to research phase
      updateProgress(15, 'Conducting research on your niche using AI...', 'research');
      
      // Generate program structure using AI
      const programStructure = await generateProgramStructure(data, activeKeys[0].key);
      
      // Update status to structure generation
      updateProgress(60, 'Creating comprehensive program structure...', 'structure');
      
      toast.success('Program structure generated!', { id: 'generating' });
      
      // Create new program with generated structure
      const newProgram = addProgram({
        ...data,
        ...programStructure,
        status: 'draft'
      });
      
      // Update status to completion
      updateProgress(90, 'Finalizing program structure...', 'finalizing');
      
      setTimeout(() => {
        completeGeneration('Program structure generated successfully!');
        navigate(`/review/${newProgram.id}`);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating program:', error);
      toast.error('Failed to generate program structure. Please try again.', { id: 'generating' });
      failGeneration('Failed to generate program structure. Please check your API keys and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <StatusBar 
        visible={generationStatus.visible}
        type={generationStatus.type}
        message={generationStatus.message}
        progress={generationStatus.progress}
        onClose={hideStatus}
      />
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Create New MicroMasters Program
        </h1>
        <p className="text-gray-600">
          Define your program requirements and let AI generate a comprehensive curriculum structure.
        </p>
      </motion.div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="space-y-8">
          {/* Program Details */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiTarget} className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Program Details</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="MicroMasters Program Niche"
                  placeholder="e.g., Data Science, Digital Marketing, AI/ML"
                  {...register('niche', {
                    required: 'Program niche is required',
                    minLength: {
                      value: 3,
                      message: 'Niche must be at least 3 characters'
                    }
                  })}
                  error={errors.niche?.message}
                  className="md:col-span-2"
                />

                <Textarea
                  label="Must-Have Aspects"
                  placeholder="List key concepts, skills, or topics that are mandatory for the curriculum..."
                  rows={4}
                  {...register('mustHaveAspects', {
                    required: 'Must-have aspects are required',
                    minLength: {
                      value: 20,
                      message: 'Please provide more detailed requirements'
                    }
                  })}
                  error={errors.mustHaveAspects?.message}
                  className="md:col-span-2"
                />

                <Textarea
                  label="Other Design Considerations"
                  placeholder="Additional pedagogical notes, content style, target audience nuances..."
                  rows={3}
                  {...register('designConsiderations')}
                  className="md:col-span-2"
                />
              </div>
            </Card>
          </motion.div>

          {/* Course Configuration */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiBook} className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Course Configuration</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input
                  label="Number of Courses"
                  type="number"
                  min="3"
                  max="12"
                  {...register('numberOfCourses', {
                    required: 'Number of courses is required',
                    min: {
                      value: 3,
                      message: 'Minimum 3 courses required'
                    },
                    max: {
                      value: 12,
                      message: 'Maximum 12 courses allowed'
                    }
                  })}
                  error={errors.numberOfCourses?.message}
                />

                <Select
                  label="Instructional Design Model"
                  options={instructionalModels}
                  {...register('instructionalDesignModel', {
                    required: 'Please select an instructional design model'
                  })}
                  error={errors.instructionalDesignModel?.message}
                />

                <div className="md:col-span-2">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      {...register('generateSlides')}
                      className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Generate presentation slides and voice-over scripts
                    </span>
                  </label>
                </div>
              </div>
            </Card>
          </motion.div>

          {/* Advanced Options */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="p-6">
              <div className="flex items-center space-x-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiSettings} className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Advanced Options</h2>
              </div>

              <div className="grid grid-cols-1 gap-6">
                <Input
                  label="Vector Store ID (Optional)"
                  placeholder="Enter existing vector store ID for advanced content retrieval"
                  {...register('vectorStoreId')}
                />
              </div>
            </Card>
          </motion.div>

          {/* Submit Button */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="flex justify-center"
          >
            <Button
              type="submit"
              loading={loading}
              size="xl"
              className="flex items-center space-x-3 px-12"
            >
              <SafeIcon icon={FiZap} className="text-xl" />
              <span>Generate Program Structure</span>
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
};

export default ProgramInitiation;
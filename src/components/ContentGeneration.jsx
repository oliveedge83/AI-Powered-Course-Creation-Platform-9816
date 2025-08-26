import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useProgram } from '../contexts/ProgramContext';
import { generateContent } from '../services/contentService';
import ProgressIndicator from './ProgressIndicator';

const { FiPlay, FiCheck, FiAlertCircle, FiRefreshCw } = FiIcons;

export default function ContentGeneration() {
  const { state, dispatch } = useProgram();
  const [generationLog, setGenerationLog] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (state.currentStep === 'content-generation' && !isGenerating) {
      startContentGeneration();
    }
  }, [state.currentStep]);

  const addLogEntry = (message, type = 'info') => {
    setGenerationLog(prev => [...prev, {
      id: Date.now(),
      message,
      type,
      timestamp: new Date().toLocaleTimeString()
    }]);
  };

  const startContentGeneration = async () => {
    setIsGenerating(true);
    addLogEntry('Starting content generation process...', 'info');

    try {
      const { editedStructure, programData } = state;
      
      for (let courseIndex = 0; courseIndex < editedStructure.courses.length; courseIndex++) {
        const course = editedStructure.courses[courseIndex];
        
        dispatch({
          type: 'UPDATE_GENERATION_PROGRESS',
          payload: {
            currentCourse: courseIndex + 1,
            totalCourses: editedStructure.courses.length,
            status: `Creating course: ${course.courseTitle}`
          }
        });

        addLogEntry(`Creating course: ${course.courseTitle}`, 'info');

        // Simulate LMS course creation
        const courseId = await generateContent.createCourse(course);
        addLogEntry(`Course created with ID: ${courseId}`, 'success');

        // Process topics
        for (let topicIndex = 0; topicIndex < course.topics.length; topicIndex++) {
          const topic = course.topics[topicIndex];
          
          dispatch({
            type: 'UPDATE_GENERATION_PROGRESS',
            payload: {
              currentTopic: topicIndex + 1,
              totalTopics: course.topics.length,
              status: `Creating topic: ${topic.topicTitle}`
            }
          });

          addLogEntry(`  Creating topic: ${topic.topicTitle}`, 'info');

          // Generate topic content
          const topicContent = await generateContent.generateTopicContent(topic, programData);
          const topicId = await generateContent.createTopic(courseId, topic, topicContent);
          
          addLogEntry(`  Topic created with ID: ${topicId}`, 'success');

          // Process lessons
          for (let lessonIndex = 0; lessonIndex < topic.lessons.length; lessonIndex++) {
            const lesson = topic.lessons[lessonIndex];
            
            dispatch({
              type: 'UPDATE_GENERATION_PROGRESS',
              payload: {
                currentLesson: lessonIndex + 1,
                totalLessons: topic.lessons.length,
                status: `Creating lesson: ${lesson.lessonTitle}`
              }
            });

            addLogEntry(`    Creating lesson: ${lesson.lessonTitle}`, 'info');

            // Generate lesson content
            const lessonContent = await generateContent.generateLessonContent(lesson, programData);
            const lessonId = await generateContent.createLesson(topicId, lesson, lessonContent);
            
            addLogEntry(`    Lesson created with ID: ${lessonId}`, 'success');
          }
        }

        addLogEntry(`Course "${course.courseTitle}" completed successfully`, 'success');
      }

      addLogEntry('All content generation completed successfully!', 'success');
      dispatch({
        type: 'UPDATE_GENERATION_PROGRESS',
        payload: { status: 'completed' }
      });

    } catch (error) {
      addLogEntry(`Error: ${error.message}`, 'error');
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      setIsGenerating(false);
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const getLogIcon = (type) => {
    switch (type) {
      case 'success': return FiCheck;
      case 'error': return FiAlertCircle;
      default: return FiPlay;
    }
  };

  const getLogColor = (type) => {
    switch (type) {
      case 'success': return 'text-green-600';
      case 'error': return 'text-red-600';
      default: return 'text-blue-600';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-6xl mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={isGenerating ? FiRefreshCw : FiPlay} className={`text-2xl text-white ${isGenerating ? 'animate-spin' : ''}`} />
            <h2 className="text-2xl font-bold text-white">Content Generation</h2>
          </div>
          <p className="text-purple-100 mt-2">
            Creating comprehensive course content and integrating with LMS
          </p>
        </div>

        <div className="p-8">
          {/* Progress Overview */}
          <ProgressIndicator progress={state.generationProgress} />

          {/* Generation Log */}
          <div className="mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Generation Log</h3>
            <div className="bg-gray-900 rounded-lg p-4 h-96 overflow-y-auto">
              {generationLog.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                  Waiting for generation to start...
                </div>
              ) : (
                <div className="space-y-2">
                  {generationLog.map((entry) => (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-start space-x-3 text-sm"
                    >
                      <span className="text-gray-500 font-mono">{entry.timestamp}</span>
                      <SafeIcon 
                        icon={getLogIcon(entry.type)} 
                        className={`mt-0.5 ${getLogColor(entry.type)}`} 
                      />
                      <span className="text-gray-300 flex-1">{entry.message}</span>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Status Summary */}
          {state.generationProgress.status === 'completed' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 bg-green-50 border border-green-200 rounded-lg p-6"
            >
              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiCheck} className="text-2xl text-green-600" />
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Generation Complete!</h3>
                  <p className="text-green-700">
                    All courses, topics, and lessons have been successfully created and published to the LMS.
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {state.error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-8 bg-red-50 border border-red-200 rounded-lg p-6"
            >
              <div className="flex items-center space-x-3">
                <SafeIcon icon={FiAlertCircle} className="text-2xl text-red-600" />
                <div>
                  <h3 className="text-lg font-semibold text-red-900">Generation Error</h3>
                  <p className="text-red-700">{state.error}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
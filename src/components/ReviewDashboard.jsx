import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';
import { useProgram } from '../contexts/ProgramContext';
import CourseEditor from './CourseEditor';

const { FiEdit, FiCheck, FiChevronDown, FiBook, FiTarget } = FiIcons;

export default function ReviewDashboard() {
  const navigate = useNavigate();
  const { state, dispatch } = useProgram();
  const [selectedCourseIndex, setSelectedCourseIndex] = useState(0);

  if (!state.editedStructure) {
    navigate('/');
    return null;
  }

  const { programContext, courses } = state.editedStructure;

  const handleCourseUpdate = (courseIndex, updatedCourse) => {
    const updatedStructure = {
      ...state.editedStructure,
      courses: state.editedStructure.courses.map((course, index) => 
        index === courseIndex ? updatedCourse : course
      )
    };
    dispatch({ type: 'UPDATE_EDITED_STRUCTURE', payload: updatedStructure });
  };

  const handleFinalize = () => {
    dispatch({ type: 'START_CONTENT_GENERATION' });
    navigate('/generate');
  };

  const totalTopics = courses.reduce((sum, course) => sum + course.topics.length, 0);
  const totalLessons = courses.reduce((sum, course) => 
    sum + course.topics.reduce((topicSum, topic) => topicSum + topic.lessons.length, 0), 0
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-7xl mx-auto"
    >
      <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-8 py-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiEdit} className="text-2xl text-white" />
            <h2 className="text-2xl font-bold text-white">Review & Edit Program Structure</h2>
          </div>
          <p className="text-emerald-100 mt-2">
            Review and modify the AI-generated curriculum before final content creation
          </p>
        </div>

        <div className="p-8">
          {/* Program Overview */}
          <div className="bg-gray-50 rounded-lg p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Program Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600">{courses.length}</div>
                <div className="text-sm text-gray-600">Courses</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{totalTopics}</div>
                <div className="text-sm text-gray-600">Topics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600">{totalLessons}</div>
                <div className="text-sm text-gray-600">Lessons</div>
              </div>
            </div>
          </div>

          {/* Program Context */}
          {programContext && (
            <div className="bg-blue-50 rounded-lg p-6 mb-8">
              <div className="flex items-center space-x-2 mb-3">
                <SafeIcon icon={FiTarget} className="text-xl text-blue-600" />
                <h3 className="text-lg font-semibold text-gray-900">Program Context</h3>
              </div>
              <div className="text-gray-700 leading-relaxed">
                {programContext.targetAudience && (
                  <div className="mb-4">
                    <strong>Target Audience:</strong> {programContext.targetAudience}
                  </div>
                )}
                {programContext.industryRelevance && (
                  <div className="mb-4">
                    <strong>Industry Relevance:</strong> {programContext.industryRelevance}
                  </div>
                )}
                {programContext.keyOutcomes && (
                  <div>
                    <strong>Key Outcomes:</strong> {programContext.keyOutcomes}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Course Selector */}
            <div className="lg:col-span-1">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Course to Edit</h3>
              <div className="space-y-2">
                {courses.map((course, index) => (
                  <motion.button
                    key={index}
                    onClick={() => setSelectedCourseIndex(index)}
                    className={`
                      w-full text-left p-4 rounded-lg border transition-all duration-200
                      ${selectedCourseIndex === index
                        ? 'bg-blue-50 border-blue-200 text-blue-900'
                        : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
                      }
                    `}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{course.courseTitle}</div>
                        <div className="text-sm opacity-75">
                          {course.topics.length} topics, {course.topics.reduce((sum, topic) => sum + topic.lessons.length, 0)} lessons
                        </div>
                      </div>
                      <SafeIcon icon={FiChevronDown} className="text-lg" />
                    </div>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* Course Editor */}
            <div className="lg:col-span-2">
              <CourseEditor
                course={courses[selectedCourseIndex]}
                courseIndex={selectedCourseIndex}
                onUpdate={handleCourseUpdate}
              />
            </div>
          </div>

          {/* Finalize Button */}
          <div className="mt-8 pt-8 border-t border-gray-200">
            <motion.button
              onClick={handleFinalize}
              className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 text-white py-4 px-6 rounded-lg font-semibold flex items-center justify-center space-x-2 hover:from-emerald-700 hover:to-teal-700 transition-all duration-200"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              <SafeIcon icon={FiCheck} className="text-xl" />
              <span>Finalize and Generate All Content</span>
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
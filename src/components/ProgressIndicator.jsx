import React from 'react';
import { motion } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiBook, FiTarget, FiFileText } = FiIcons;

export default function ProgressIndicator({ progress }) {
  const {
    currentCourse,
    totalCourses,
    currentTopic,
    totalTopics,
    currentLesson,
    totalLessons,
    status
  } = progress;

  const getProgressPercentage = (current, total) => {
    if (total === 0) return 0;
    return Math.round((current / total) * 100);
  };

  const courseProgress = getProgressPercentage(currentCourse, totalCourses);
  const topicProgress = getProgressPercentage(currentTopic, totalTopics);
  const lessonProgress = getProgressPercentage(currentLesson, totalLessons);

  const ProgressBar = ({ percentage, color = 'blue' }) => (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <motion.div
        className={`h-2 rounded-full bg-${color}-600`}
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ duration: 0.5 }}
      />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Generation Progress</h3>
        <p className="text-gray-600">{status}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Course Progress */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <SafeIcon icon={FiBook} className="text-blue-600" />
            <span className="font-medium text-blue-900">Courses</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-blue-700">{currentCourse} of {totalCourses}</span>
              <span className="text-blue-700">{courseProgress}%</span>
            </div>
            <ProgressBar percentage={courseProgress} color="blue" />
          </div>
        </div>

        {/* Topic Progress */}
        <div className="bg-emerald-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <SafeIcon icon={FiTarget} className="text-emerald-600" />
            <span className="font-medium text-emerald-900">Topics</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-emerald-700">{currentTopic} of {totalTopics}</span>
              <span className="text-emerald-700">{topicProgress}%</span>
            </div>
            <ProgressBar percentage={topicProgress} color="emerald" />
          </div>
        </div>

        {/* Lesson Progress */}
        <div className="bg-purple-50 rounded-lg p-4">
          <div className="flex items-center space-x-2 mb-3">
            <SafeIcon icon={FiFileText} className="text-purple-600" />
            <span className="font-medium text-purple-900">Lessons</span>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-purple-700">{currentLesson} of {totalLessons}</span>
              <span className="text-purple-700">{lessonProgress}%</span>
            </div>
            <ProgressBar percentage={lessonProgress} color="purple" />
          </div>
        </div>
      </div>
    </div>
  );
}
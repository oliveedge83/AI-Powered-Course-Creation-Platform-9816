import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SafeIcon from '../common/SafeIcon';
import * as FiIcons from 'react-icons/fi';

const { FiEdit2, FiSave, FiX, FiChevronDown, FiChevronRight, FiBook, FiTarget, FiFileText } = FiIcons;

export default function CourseEditor({ course, courseIndex, onUpdate }) {
  const [editingField, setEditingField] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [expandedTopics, setExpandedTopics] = useState(new Set([0]));

  const startEdit = (field, currentValue) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const saveEdit = () => {
    if (!editingField) return;

    const [type, ...indices] = editingField.split('-');
    let updatedCourse = { ...course };

    if (type === 'course') {
      const field = indices[0];
      updatedCourse[field] = editValue;
    } else if (type === 'topic') {
      const [topicIndex, field] = indices;
      updatedCourse.topics[parseInt(topicIndex)][field] = editValue;
    } else if (type === 'lesson') {
      const [topicIndex, lessonIndex, field] = indices;
      updatedCourse.topics[parseInt(topicIndex)].lessons[parseInt(lessonIndex)][field] = editValue;
    }

    onUpdate(courseIndex, updatedCourse);
    setEditingField(null);
    setEditValue('');
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue('');
  };

  const toggleTopic = (topicIndex) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicIndex)) {
      newExpanded.delete(topicIndex);
    } else {
      newExpanded.add(topicIndex);
    }
    setExpandedTopics(newExpanded);
  };

  const EditableField = ({ fieldKey, value, isTextarea = false, placeholder = "" }) => {
    const isEditing = editingField === fieldKey;

    if (isEditing) {
      return (
        <div className="space-y-2">
          {isTextarea ? (
            <textarea
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              rows={3}
              placeholder={placeholder}
            />
          ) : (
            <input
              type="text"
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder={placeholder}
            />
          )}
          <div className="flex space-x-2">
            <button
              onClick={saveEdit}
              className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors"
            >
              <SafeIcon icon={FiSave} />
            </button>
            <button
              onClick={cancelEdit}
              className="px-3 py-1 bg-gray-500 text-white rounded text-sm hover:bg-gray-600 transition-colors"
            >
              <SafeIcon icon={FiX} />
            </button>
          </div>
        </div>
      );
    }

    return (
      <div 
        className="group cursor-pointer"
        onClick={() => startEdit(fieldKey, value)}
      >
        <div className="flex items-start space-x-2">
          <div className="flex-1">
            {value || <span className="text-gray-400 italic">{placeholder}</span>}
          </div>
          <SafeIcon 
            icon={FiEdit2} 
            className="opacity-0 group-hover:opacity-100 text-blue-500 transition-opacity" 
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center space-x-2 mb-4">
          <SafeIcon icon={FiBook} className="text-xl text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">Course Details</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Title</label>
            <EditableField
              fieldKey="course-courseTitle"
              value={course.courseTitle}
              placeholder="Enter course title..."
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Course Description</label>
            <EditableField
              fieldKey="course-courseDescription"
              value={course.courseDescription}
              isTextarea={true}
              placeholder="Enter course description..."
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center space-x-2">
          <SafeIcon icon={FiTarget} className="text-xl text-emerald-600" />
          <span>Topics & Lessons</span>
        </h3>

        {course.topics.map((topic, topicIndex) => (
          <motion.div
            key={topicIndex}
            className="bg-white border border-gray-200 rounded-lg overflow-hidden"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: topicIndex * 0.1 }}
          >
            <div 
              className="p-4 bg-gray-50 cursor-pointer hover:bg-gray-100 transition-colors"
              onClick={() => toggleTopic(topicIndex)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <SafeIcon 
                    icon={expandedTopics.has(topicIndex) ? FiChevronDown : FiChevronRight} 
                    className="text-gray-500" 
                  />
                  <div>
                    <h4 className="font-medium text-gray-900">Topic {topicIndex + 1}: {topic.topicTitle}</h4>
                    <p className="text-sm text-gray-600">{topic.lessons.length} lessons</p>
                  </div>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {expandedTopics.has(topicIndex) && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="p-4 border-t border-gray-200 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Topic Title</label>
                      <EditableField
                        fieldKey={`topic-${topicIndex}-topicTitle`}
                        value={topic.topicTitle}
                        placeholder="Enter topic title..."
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Learning Objective</label>
                      <EditableField
                        fieldKey={`topic-${topicIndex}-topicLearningObjectiveDescription`}
                        value={topic.topicLearningObjectiveDescription}
                        isTextarea={true}
                        placeholder="Enter learning objective..."
                      />
                    </div>

                    <div className="space-y-3">
                      <h5 className="font-medium text-gray-900 flex items-center space-x-2">
                        <SafeIcon icon={FiFileText} className="text-purple-600" />
                        <span>Lessons</span>
                      </h5>
                      
                      {topic.lessons.map((lesson, lessonIndex) => (
                        <div key={lessonIndex} className="bg-gray-50 rounded-lg p-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Lesson {lessonIndex + 1} Title
                            </label>
                            <EditableField
                              fieldKey={`lesson-${topicIndex}-${lessonIndex}-lessonTitle`}
                              value={lesson.lessonTitle}
                              placeholder="Enter lesson title..."
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-600 mb-1">
                              Lesson Description
                            </label>
                            <EditableField
                              fieldKey={`lesson-${topicIndex}-${lessonIndex}-lessonDescription`}
                              value={lesson.lessonDescription}
                              isTextarea={true}
                              placeholder="Enter lesson description..."
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
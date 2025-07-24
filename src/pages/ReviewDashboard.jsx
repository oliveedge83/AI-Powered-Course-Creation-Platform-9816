import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useProgramStore } from '../stores/programStore';
import { useSettingsStore } from '../stores/settingsStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import { generateCourseContent } from '../services/aiService';

const { FiEdit3, FiSave, FiPlay, FiChevronDown, FiChevronRight, FiBook, FiTarget, FiList, FiInfo } = FiIcons;

const ReviewDashboard = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { programs, currentProgram, setCurrentProgram, updateProgram } = useProgramStore();
  const { getActiveOpenAIKeys, getDecryptedLMSCredentials } = useSettingsStore();
  
  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);

  useEffect(() => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setCurrentProgram(program);
      if (program.courses && program.courses.length > 0) {
        setSelectedCourseId(program.courses[0].id);
        
        // Auto-expand the first topic of the selected course
        if (program.courses[0].topics && program.courses[0].topics.length > 0) {
          setExpandedTopics(new Set([program.courses[0].topics[0].id]));
        }
      }
    } else {
      navigate('/');
    }
  }, [programId, programs, setCurrentProgram, navigate]);

  const selectedCourse = currentProgram?.courses?.find(c => c.id === selectedCourseId);

  const handleEdit = (type, id, field, value) => {
    setEditingItem({ type, id, field, value });
  };

  const handleSave = () => {
    if (!editingItem) return;
    
    const { type, id, field, value } = editingItem;
    const updatedProgram = { ...currentProgram };
    
    if (type === 'course') {
      const course = updatedProgram.courses.find(c => c.id === id);
      if (course) {
        course[field] = value;
      }
    } else if (type === 'topic') {
      const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
      const topic = course?.topics?.find(t => t.id === id);
      if (topic) {
        topic[field] = value;
      }
    } else if (type === 'lesson') {
      const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
      const topic = course?.topics?.find(t => t.lessons?.some(l => l.id === id));
      const lesson = topic?.lessons?.find(l => l.id === id);
      if (lesson) {
        lesson[field] = value;
      }
    }
    
    updateProgram(programId, updatedProgram);
    setEditingItem(null);
    toast.success('Changes saved successfully!');
  };

  const toggleTopic = (topicId) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicId)) {
      newExpanded.delete(topicId);
    } else {
      newExpanded.add(topicId);
    }
    setExpandedTopics(newExpanded);
  };

  const handleGenerateContent = async () => {
    if (!selectedCourse) {
      toast.error('Please select a course first.');
      return;
    }
    
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
    
    setGenerating(true);
    toast.loading('Generating full course content...', { id: 'generating-content' });
    
    try {
      await generateCourseContent(selectedCourse, lmsCredentials, activeKeys[0].key);
      
      // Update program status
      updateProgram(programId, {
        status: 'in-progress',
        lastGenerated: new Date().toISOString()
      });
      
      toast.success('Content generation started! Check your LMS for progress.', { id: 'generating-content' });
    } catch (error) {
      console.error('Error generating content:', error);
      toast.error('Failed to generate content. Please try again.', { id: 'generating-content' });
    } finally {
      setGenerating(false);
    }
  };

  // Info Modal Component
  const InfoModal = () => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowInfoModal(false)}
    >
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-xl font-bold mb-4">Content Generation Process</h3>
        <div className="space-y-4">
          <p>Here's how the content generation process works:</p>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">1</div>
            <p>Currently, you're reviewing the <strong>program structure</strong> which includes course titles, topic outlines, and lesson titles.</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
            <p>You can edit any element of this structure before proceeding to full content generation.</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
            <p>When you click <strong>"Generate Content"</strong>, the system will create the complete course content in your LMS using this approved structure.</p>
          </div>
          
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
            <p><strong>Full content generation</strong> includes detailed lesson content, case studies, FAQs, misconceptions, slide outlines, and voice-over scripts.</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setShowInfoModal(false)}>Got it</Button>
        </div>
      </motion.div>
    </motion.div>
  );

  if (!currentProgram) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center">
          <p className="text-gray-600">Program not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <AnimatePresence>
        {showInfoModal && <InfoModal />}
      </AnimatePresence>
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Review & Edit Program
            </h1>
            <p className="text-gray-600">
              Review the generated program structure, make edits, and generate content for specific courses.
            </p>
          </div>
          <Button 
            variant="ghost" 
            className="flex items-center space-x-2"
            onClick={() => setShowInfoModal(true)}
          >
            <SafeIcon icon={FiInfo} className="text-primary-600" />
            <span>How it works</span>
          </Button>
        </div>
      </motion.div>

      {/* Review Notice Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-full">
              <SafeIcon icon={FiInfo} className="text-blue-600 text-lg" />
            </div>
            <div>
              <h3 className="font-medium text-blue-800">Review Before Generation</h3>
              <p className="text-blue-700">
                You're currently reviewing the program structure. Make any necessary edits to course titles, 
                topics, and lessons before generating the full content.
              </p>
            </div>
          </div>
        </Card>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Course Selector */}
        <div className="lg:col-span-1">
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Select Course</h2>
            
            {currentProgram.courses && currentProgram.courses.length > 0 ? (
              <Select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                options={currentProgram.courses.map(course => ({
                  value: course.id,
                  label: course.courseTitle
                }))}
                className="mb-6"
              />
            ) : (
              <p className="text-gray-600 mb-6">No courses available.</p>
            )}

            {selectedCourse && (
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg mb-4">
                  <p className="text-sm text-yellow-800 font-medium">
                    After reviewing and editing, click "Generate Content" to create the full course in your LMS
                  </p>
                </div>
                
                <Button
                  onClick={handleGenerateContent}
                  loading={generating}
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiPlay} />
                  <span>Generate Content</span>
                </Button>
                
                <div className="text-sm text-gray-600">
                  <p><strong>Topics:</strong> {selectedCourse.topics?.length || 0}</p>
                  <p><strong>Total Lessons:</strong> {
                    selectedCourse.topics?.reduce(
                      (total, topic) => total + (topic.lessons?.length || 0),
                      0
                    ) || 0
                  }</p>
                </div>
              </div>
            )}
          </Card>
          
          {/* Added Info Card */}
          <Card className="p-6 mt-6 bg-gradient-to-r from-primary-50 to-primary-100 border-primary-200">
            <h3 className="font-medium text-primary-800 mb-2">Content Generation Details</h3>
            <p className="text-sm text-primary-700 mb-4">
              When you click "Generate Content", our AI will create:
            </p>
            <ul className="text-sm text-primary-700 space-y-2">
              <li className="flex items-start">
                <SafeIcon icon={FiBook} className="mr-2 text-primary-600 mt-0.5" />
                <span>Full lesson content (1500-2000 words)</span>
              </li>
              <li className="flex items-start">
                <SafeIcon icon={FiList} className="mr-2 text-primary-600 mt-0.5" />
                <span>Case studies and practical examples</span>
              </li>
              <li className="flex items-start">
                <SafeIcon icon={FiTarget} className="mr-2 text-primary-600 mt-0.5" />
                <span>FAQs and common misconceptions</span>
              </li>
              <li className="flex items-start">
                <SafeIcon icon={FiPlay} className="mr-2 text-primary-600 mt-0.5" />
                <span>Presentation slides with titles and content</span>
              </li>
              <li className="flex items-start">
                <SafeIcon icon={FiPlay} className="mr-2 text-primary-600 mt-0.5" />
                <span>Voice-over scripts for each lesson</span>
              </li>
            </ul>
          </Card>
        </div>

        {/* Course Content */}
        <div className="lg:col-span-2">
          {selectedCourse ? (
            <Card className="p-6">
              {/* Course Header */}
              <div className="mb-6">
                <div className="flex items-center space-x-3 mb-4">
                  <SafeIcon icon={FiBook} className="text-2xl text-primary-600" />
                  <div className="flex-1">
                    {editingItem?.type === 'course' && editingItem?.field === 'courseTitle' ? (
                      <div className="flex items-center space-x-2">
                        <Input
                          value={editingItem.value}
                          onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                          className="flex-1"
                        />
                        <Button size="sm" onClick={handleSave}>
                          <SafeIcon icon={FiSave} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <h2 className="text-xl font-semibold text-gray-900">
                          {selectedCourse.courseTitle}
                        </h2>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit('course', selectedCourse.id, 'courseTitle', selectedCourse.courseTitle)}
                        >
                          <SafeIcon icon={FiEdit3} />
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                {editingItem?.type === 'course' && editingItem?.field === 'courseDescription' ? (
                  <div className="space-y-2">
                    <Textarea
                      value={editingItem.value}
                      onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                      rows={3}
                    />
                    <Button size="sm" onClick={handleSave}>
                      <SafeIcon icon={FiSave} />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-start space-x-2">
                    <p className="text-gray-600 flex-1">
                      {selectedCourse.courseDescription}
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit('course', selectedCourse.id, 'courseDescription', selectedCourse.courseDescription)}
                    >
                      <SafeIcon icon={FiEdit3} />
                    </Button>
                  </div>
                )}
              </div>

              {/* Topics and Lessons */}
              <div className="space-y-4">
                {selectedCourse.topics?.map((topic, topicIndex) => (
                  <motion.div
                    key={topic.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: topicIndex * 0.1 }}
                    className="border border-gray-200 rounded-lg"
                  >
                    {/* Topic Header */}
                    <div className="p-4 bg-gray-50 border-b border-gray-200">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => toggleTopic(topic.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <SafeIcon
                            icon={expandedTopics.has(topic.id) ? FiChevronDown : FiChevronRight}
                          />
                        </button>
                        <SafeIcon icon={FiTarget} className="text-lg text-green-600" />
                        <div className="flex-1">
                          {editingItem?.type === 'topic' && editingItem?.id === topic.id && editingItem?.field === 'topicTitle' ? (
                            <div className="flex items-center space-x-2">
                              <Input
                                value={editingItem.value}
                                onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                className="flex-1"
                              />
                              <Button size="sm" onClick={handleSave}>
                                <SafeIcon icon={FiSave} />
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-gray-900">
                                {topic.topicTitle}
                              </h3>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit('topic', topic.id, 'topicTitle', topic.topicTitle)}
                              >
                                <SafeIcon icon={FiEdit3} />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>

                      {editingItem?.type === 'topic' && editingItem?.id === topic.id && editingItem?.field === 'topicLearningObjectiveDescription' ? (
                        <div className="mt-2 space-y-2">
                          <Textarea
                            value={editingItem.value}
                            onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                            rows={2}
                          />
                          <Button size="sm" onClick={handleSave}>
                            <SafeIcon icon={FiSave} />
                          </Button>
                        </div>
                      ) : (
                        <div className="mt-2 flex items-start space-x-2">
                          <p className="text-sm text-gray-600 flex-1 ml-6">
                            {topic.topicLearningObjectiveDescription}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit('topic', topic.id, 'topicLearningObjectiveDescription', topic.topicLearningObjectiveDescription)}
                          >
                            <SafeIcon icon={FiEdit3} />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Lessons */}
                    <AnimatePresence>
                      {expandedTopics.has(topic.id) && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 space-y-3">
                            {topic.lessons?.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className="flex items-center space-x-3 p-3 bg-white border border-gray-100 rounded-lg"
                              >
                                <SafeIcon icon={FiList} className="text-blue-600" />
                                <div className="flex-1">
                                  {editingItem?.type === 'lesson' && editingItem?.id === lesson.id && editingItem?.field === 'lessonTitle' ? (
                                    <div className="flex items-center space-x-2">
                                      <Input
                                        value={editingItem.value}
                                        onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                        className="flex-1"
                                      />
                                      <Button size="sm" onClick={handleSave}>
                                        <SafeIcon icon={FiSave} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <h4 className="font-medium text-gray-900">
                                        {lesson.lessonTitle}
                                      </h4>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit('lesson', lesson.id, 'lessonTitle', lesson.lessonTitle)}
                                      >
                                        <SafeIcon icon={FiEdit3} />
                                      </Button>
                                    </div>
                                  )}

                                  {editingItem?.type === 'lesson' && editingItem?.id === lesson.id && editingItem?.field === 'lessonDescription' ? (
                                    <div className="mt-2 space-y-2">
                                      <Textarea
                                        value={editingItem.value}
                                        onChange={(e) => setEditingItem({ ...editingItem, value: e.target.value })}
                                        rows={2}
                                      />
                                      <Button size="sm" onClick={handleSave}>
                                        <SafeIcon icon={FiSave} />
                                      </Button>
                                    </div>
                                  ) : (
                                    <div className="mt-1 flex items-start space-x-2">
                                      <p className="text-sm text-gray-600 flex-1">
                                        {lesson.lessonDescription}
                                      </p>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleEdit('lesson', lesson.id, 'lessonDescription', lesson.lessonDescription)}
                                      >
                                        <SafeIcon icon={FiEdit3} />
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-12 text-center">
              <SafeIcon icon={FiBook} className="text-6xl text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                Select a Course
              </h3>
              <p className="text-gray-600">
                Choose a course from the left panel to view and edit its content.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReviewDashboard;
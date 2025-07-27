import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../common/SafeIcon';
import { useProgramStore } from '../stores/programStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useGeneration } from '../contexts/GenerationContext';
import { useVectorStoreStore } from '../stores/vectorStoreStore';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Select from '../components/ui/Select';
import Input from '../components/ui/Input';
import Textarea from '../components/ui/Textarea';
import EnhancedStatusBar from '../components/ui/EnhancedStatusBar';
import KnowledgeLibraryBadge from '../components/rag/KnowledgeLibraryBadge';
import { generateCourseContent, generateCourseTopicsAndLessons } from '../services/enhancedAiService';

const {
  FiEdit3, FiSave, FiPlay, FiChevronDown, FiChevronRight, FiBook, FiTarget, FiList, FiInfo, FiPlus, FiTrash2, FiRefreshCw, FiFileText, FiX, FiDatabase
} = FiIcons;

const ReviewDashboard = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { programs, currentProgram, setCurrentProgram, updateProgram } = useProgramStore();
  const { getActiveOpenAIKeys, getDecryptedLMSCredentials } = useSettingsStore();
  const { 
    generationStatus, 
    startGeneration, 
    updateProgress, 
    updateTaskProgress,
    pauseGeneration,
    resumeGeneration,
    abortGeneration,
    completeGeneration, 
    failGeneration, 
    minimizeStatus,
    maximizeStatus,
    hideStatus,
    getAbortSignal,
    checkPauseStatus
  } = useGeneration();
  const { vectorStoreAssignments } = useVectorStoreStore();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [regeneratingCourse, setRegeneratingCourse] = useState(false);
  const [activeApiKey, setActiveApiKey] = useState(null);

  // New state for additional context modals
  const [showTopicContextModal, setShowTopicContextModal] = useState(false);
  const [showLessonContextModal, setShowLessonContextModal] = useState(false);
  const [selectedTopicForContext, setSelectedTopicForContext] = useState(null);
  const [selectedLessonForContext, setSelectedLessonForContext] = useState(null);
  const [topicContextInput, setTopicContextInput] = useState('');
  const [lessonContextInput, setLessonContextInput] = useState('');
  
  // Get API key for vector stores
  useEffect(() => {
    const keys = getActiveOpenAIKeys();
    if (keys.length > 0) {
      setActiveApiKey(keys[0].key);
    }
  }, [getActiveOpenAIKeys]);

  useEffect(() => {
    const program = programs.find(p => p.id === programId);
    if (program) {
      setCurrentProgram(program);
      if (program.courses && program.courses.length > 0) {
        setSelectedCourseId(program.courses[0].id);
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

  const handleAddTopic = () => {
    if (!selectedCourse) return;

    const newTopic = {
      id: `topic-${Date.now()}`,
      topicTitle: 'New Topic',
      topicLearningObjectiveDescription: 'Learning objectives for this topic',
      additionalContext: '',
      lessons: []
    };

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    if (course) {
      course.topics = [...(course.topics || []), newTopic];
      updateProgram(programId, updatedProgram);
      setExpandedTopics(new Set([...expandedTopics, newTopic.id]));
      toast.success('New topic added successfully!');
    }
  };

  const handleAddLesson = (topicId) => {
    const newLesson = {
      id: `lesson-${Date.now()}`,
      lessonTitle: 'New Lesson',
      lessonDescription: 'Lesson description and objectives',
      additionalContext: ''
    };

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    const topic = course?.topics?.find(t => t.id === topicId);
    if (topic) {
      topic.lessons = [...(topic.lessons || []), newLesson];
      updateProgram(programId, updatedProgram);
      toast.success('New lesson added successfully!');
    }
  };

  const handleDeleteTopic = (topicId) => {
    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    if (course) {
      course.topics = course.topics.filter(t => t.id !== topicId);
      updateProgram(programId, updatedProgram);
      const newExpanded = new Set(expandedTopics);
      newExpanded.delete(topicId);
      setExpandedTopics(newExpanded);
      toast.success('Topic deleted successfully!');
    }
  };

  const handleDeleteLesson = (lessonId) => {
    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    const topic = course?.topics?.find(t => t.lessons?.some(l => l.id === lessonId));
    if (topic) {
      topic.lessons = topic.lessons.filter(l => l.id !== lessonId);
      updateProgram(programId, updatedProgram);
      toast.success('Lesson deleted successfully!');
    }
  };

  // New handlers for additional context modals
  const handleOpenTopicContextModal = (topic) => {
    setSelectedTopicForContext(topic);
    setTopicContextInput(topic.additionalContext || '');
    setShowTopicContextModal(true);
  };

  const handleOpenLessonContextModal = (lesson) => {
    setSelectedLessonForContext(lesson);
    setLessonContextInput(lesson.additionalContext || '');
    setShowLessonContextModal(true);
  };

  const handleSaveTopicContext = () => {
    if (!selectedTopicForContext) return;

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    const topic = course?.topics?.find(t => t.id === selectedTopicForContext.id);
    if (topic) {
      topic.additionalContext = topicContextInput;
      updateProgram(programId, updatedProgram);
      toast.success('Topic additional context saved!');
    }

    setShowTopicContextModal(false);
    setSelectedTopicForContext(null);
    setTopicContextInput('');
  };

  const handleSaveLessonContext = () => {
    if (!selectedLessonForContext) return;

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    const topic = course?.topics?.find(t => t.lessons?.some(l => l.id === selectedLessonForContext.id));
    const lesson = topic?.lessons?.find(l => l.id === selectedLessonForContext.id);
    if (lesson) {
      lesson.additionalContext = lessonContextInput;
      updateProgram(programId, updatedProgram);
      toast.success('Lesson additional context saved!');
    }

    setShowLessonContextModal(false);
    setSelectedLessonForContext(null);
    setLessonContextInput('');
  };

  const handleRegenerateCourse = async () => {
    if (!selectedCourse) return;

    const activeKeys = getActiveOpenAIKeys();
    if (activeKeys.length === 0) {
      toast.error('Please add at least one OpenAI API key in settings.');
      return;
    }

    setRegeneratingCourse(true);
    startGeneration(selectedCourse.courseTitle, 0, 0, 'Initiating course regeneration...');
    toast.loading('Regenerating course topics and lessons...', { id: 'regenerating' });

    try {
      updateProgress(20, 'Analyzing course context and requirements...', 'analysis');
      const result = await generateCourseTopicsAndLessons(
        selectedCourse,
        currentProgram.programContext,
        currentProgram.summaryProgramContext,
        currentProgram.mustHaveAspects,
        currentProgram.designConsiderations,
        activeKeys[0].key
      );

      updateProgress(60, 'Generating new topics and lessons...', 'generation');
      if (result.topics && result.topics.length > 0) {
        const updatedProgram = { ...currentProgram };
        const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
        if (course) {
          course.topics = result.topics;
          updateProgram(programId, updatedProgram);
          if (result.topics.length > 0) {
            setExpandedTopics(new Set([result.topics[0].id]));
          }

          updateProgress(90, 'Finalizing course structure...', 'finalizing');
          setTimeout(() => {
            completeGeneration('Course regenerated successfully!');
          }, 1000);
          toast.success('Course regenerated successfully!', { id: 'regenerating' });
        }
      }
    } catch (error) {
      console.error('Error regenerating course:', error);
      toast.error('Failed to regenerate course. Please try again.', { id: 'regenerating' });
      failGeneration('Failed to regenerate course. Please check your API keys and try again.');
    } finally {
      setRegeneratingCourse(false);
    }
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
    
    // Calculate totals
    const totalTopics = selectedCourse.topics?.length || 0;
    const totalLessons = selectedCourse.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;
    
    startGeneration(selectedCourse.courseTitle, totalTopics, totalLessons, 'Starting full course content generation...');
    toast.loading('Generating full course content...', { id: 'generating-content' });

    try {
      await generateCourseContent(
        selectedCourse, 
        lmsCredentials, 
        activeKeys[0].key, 
        {
          onProgress: updateProgress,
          onTaskUpdate: updateTaskProgress,
          checkPauseStatus,
          getAbortSignal
        },
        vectorStoreAssignments
      );

      updateProgram(programId, {
        status: 'in-progress',
        lastGenerated: new Date().toISOString()
      });

      completeGeneration('Content generation completed! Check your LMS for the uploaded materials.');
      toast.success('Content generation completed! Check your LMS for the uploaded materials.', { id: 'generating-content' });
    } catch (error) {
      console.error('Error generating content:', error);
      
      if (error.message === 'Request aborted by user') {
        toast.error('Content generation was aborted.', { id: 'generating-content' });
      } else {
        toast.error('Failed to generate content. Please try again.', { id: 'generating-content' });
        failGeneration('Content generation failed. Please check your API keys and LMS credentials.');
      }
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
            <p>The system first conducts comprehensive research using AI o3-mini to analyze your niche and create detailed program context.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
            <p>Based on the research, GPT-4.1 generates the program structure with detailed courses, topics, and lessons.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">3</div>
            <p>You can edit, add, or remove topics and lessons before generating the full content.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">4</div>
            <p>Final content generation creates comprehensive lessons with case studies, FAQs, slides, and voice-over scripts.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">5</div>
            <p>Knowledge libraries can be attached to topics or lessons to enhance content with relevant information from your documents.</p>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => setShowInfoModal(false)}>Got it</Button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Topic Additional Context Modal
  const TopicContextModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowTopicContextModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiDatabase} className="text-2xl text-primary-600" />
            <h3 className="text-xl font-bold">Additional Context for Topic</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowTopicContextModal(false)}>
            <SafeIcon icon={FiX} />
          </Button>
        </div>
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {selectedTopicForContext?.topicTitle}
          </h4>
          <p className="text-sm text-gray-600">
            Add additional research, statistics, quotes, or latest findings that will enhance all lessons in this topic.
          </p>
        </div>
        <Textarea
          label="Additional Context (Optional)"
          placeholder="Add research findings, statistics, industry quotes, latest trends, or any additional context that should be included in all lessons for this topic..."
          rows={8}
          value={topicContextInput}
          onChange={(e) => setTopicContextInput(e.target.value)}
          className="mb-6"
        />
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setShowTopicContextModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveTopicContext}>
            Save Context
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  // Lesson Additional Context Modal
  const LessonContextModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowLessonContextModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiFileText} className="text-2xl text-primary-600" />
            <h3 className="text-xl font-bold">Additional Context for Lesson</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowLessonContextModal(false)}>
            <SafeIcon icon={FiX} />
          </Button>
        </div>
        <div className="mb-4">
          <h4 className="font-medium text-gray-900 mb-2">
            {selectedLessonForContext?.lessonTitle}
          </h4>
          <p className="text-sm text-gray-600">
            Add specific context, examples, or additional information for this particular lesson.
          </p>
        </div>
        <Textarea
          label="Lesson-Specific Additional Context (Optional)"
          placeholder="Add specific examples, case studies, technical details, or any additional context that should be included specifically in this lesson..."
          rows={8}
          value={lessonContextInput}
          onChange={(e) => setLessonContextInput(e.target.value)}
          className="mb-6"
        />
        <div className="flex justify-end space-x-3">
          <Button variant="secondary" onClick={() => setShowLessonContextModal(false)}>
            Cancel
          </Button>
          <Button onClick={handleSaveLessonContext}>
            Save Context
          </Button>
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
      <EnhancedStatusBar
        visible={generationStatus.visible}
        type={generationStatus.type}
        message={generationStatus.message}
        progress={generationStatus.progress}
        isMinimized={generationStatus.isMinimized}
        isPaused={generationStatus.isPaused}
        canPause={generationStatus.canPause}
        canAbort={generationStatus.canAbort}
        currentTask={generationStatus.currentTask}
        totalTasks={generationStatus.totalTasks}
        completedTasks={generationStatus.completedTasks}
        estimatedTimeRemaining={generationStatus.estimatedTimeRemaining}
        details={generationStatus.details}
        onClose={hideStatus}
        onMinimize={minimizeStatus}
        onMaximize={maximizeStatus}
        onPause={pauseGeneration}
        onResume={resumeGeneration}
        onAbort={abortGeneration}
      />

      <AnimatePresence>
        {showInfoModal && <InfoModal />}
        {showTopicContextModal && <TopicContextModal />}
        {showLessonContextModal && <LessonContextModal />}
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
                You're reviewing the program structure based on comprehensive AI research. Edit, add, or remove topics and lessons before generating full content.
                You can also add knowledge libraries to topics or lessons to enhance content with relevant information.
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
                <Button
                  onClick={handleRegenerateCourse}
                  loading={regeneratingCourse}
                  variant="secondary"
                  className="w-full flex items-center justify-center space-x-2"
                >
                  <SafeIcon icon={FiRefreshCw} />
                  <span>Regenerate Course</span>
                </Button>
                <div className="text-sm text-gray-600">
                  <p><strong>Topics:</strong> {selectedCourse.topics?.length || 0}</p>
                  <p><strong>Total Lessons:</strong> {selectedCourse.topics?.reduce(
                    (total, topic) => total + (topic.lessons?.length || 0), 0
                  ) || 0}</p>
                </div>
              </div>
            )}
          </Card>

          {/* Info Card */}
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
              <li className="flex items-start">
                <SafeIcon icon={FiDatabase} className="mr-2 text-primary-600 mt-0.5" />
                <span>Knowledge library integration for relevant content</span>
              </li>
            </ul>
          </Card>

          {/* Knowledge Library Info */}
          <Card className="p-6 mt-6 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <div className="flex items-center space-x-2 mb-2">
              <SafeIcon icon={FiDatabase} className="text-blue-600" />
              <h3 className="font-medium text-blue-800">Knowledge Libraries</h3>
            </div>
            <p className="text-sm text-blue-700 mb-4">
              Enhance your content by adding knowledge libraries:
            </p>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 mr-2">1</div>
                <span>Add a library to a topic to use for all its lessons</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 mr-2">2</div>
                <span>Add a library to a specific lesson to override topic-level library</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 mr-2">3</div>
                <span>Upload PDFs, DOCXs, and more to create custom libraries</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-blue-200 text-blue-700 flex items-center justify-center flex-shrink-0 mr-2">4</div>
                <span>AI will use your documents as context for generation</span>
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

              {/* Add Topic Button */}
              <div className="mb-6">
                <Button
                  onClick={handleAddTopic}
                  variant="secondary"
                  className="flex items-center space-x-2"
                >
                  <SafeIcon icon={FiPlus} />
                  <span>Add New Topic</span>
                </Button>
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
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => toggleTopic(topic.id)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                        >
                          <SafeIcon icon={expandedTopics.has(topic.id) ? FiChevronDown : FiChevronRight} />
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
                        
                        {/* Knowledge Library Button for Topic */}
                        {activeApiKey && (
                          <KnowledgeLibraryBadge
                            itemId={topic.id}
                            itemType="topic"
                            apiKey={activeApiKey}
                          />
                        )}
                        
                        {/* Topic Additional Context Button */}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenTopicContextModal(topic)}
                          className={`${topic.additionalContext ? 'text-primary-600 bg-primary-50' : 'text-gray-600'}`}
                          title="Add additional context for this topic"
                        >
                          <SafeIcon icon={FiDatabase} />
                        </Button>
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteTopic(topic.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <SafeIcon icon={FiTrash2} />
                        </Button>
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

                      {/* Show indicators */}
                      <div className="mt-2 ml-6 flex flex-wrap gap-2">
                        {/* Show additional context indicator */}
                        {topic.additionalContext && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary-100 text-primary-700">
                            <SafeIcon icon={FiDatabase} className="mr-1" />
                            Additional context added
                          </div>
                        )}
                        
                        {/* Show knowledge library indicator */}
                        {vectorStoreAssignments[topic.id] && (
                          <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                            <SafeIcon icon={FiDatabase} className="mr-1" />
                            Knowledge library attached
                          </div>
                        )}
                      </div>
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
                            {/* Add Lesson Button */}
                            <Button
                              onClick={() => handleAddLesson(topic.id)}
                              variant="ghost"
                              size="sm"
                              className="flex items-center space-x-2 text-primary-600"
                            >
                              <SafeIcon icon={FiPlus} />
                              <span>Add Lesson</span>
                            </Button>

                            {topic.lessons?.map((lesson, lessonIndex) => (
                              <div
                                key={lesson.id}
                                className="flex items-center space-x-2 p-3 bg-white border border-gray-100 rounded-lg"
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

                                  {/* Show indicators */}
                                  <div className="mt-2 flex flex-wrap gap-2">
                                    {/* Show lesson additional context indicator */}
                                    {lesson.additionalContext && (
                                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-700">
                                        <SafeIcon icon={FiFileText} className="mr-1" />
                                        Lesson context added
                                      </div>
                                    )}
                                    
                                    {/* Show knowledge library indicator */}
                                    {vectorStoreAssignments[lesson.id] && (
                                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-700">
                                        <SafeIcon icon={FiDatabase} className="mr-1" />
                                        Custom library attached
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                {/* Knowledge Library Button for Lesson */}
                                {activeApiKey && (
                                  <KnowledgeLibraryBadge
                                    itemId={lesson.id}
                                    itemType="lesson"
                                    apiKey={activeApiKey}
                                  />
                                )}
                                
                                {/* Lesson Additional Context Button */}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenLessonContextModal(lesson)}
                                  className={`${lesson.additionalContext ? 'text-blue-600 bg-blue-50' : 'text-gray-600'}`}
                                  title="Add additional context for this lesson"
                                >
                                  <SafeIcon icon={FiFileText} />
                                </Button>
                                
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteLesson(lesson.id)}
                                  className="text-red-600 hover:text-red-700"
                                >
                                  <SafeIcon icon={FiTrash2} />
                                </Button>
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
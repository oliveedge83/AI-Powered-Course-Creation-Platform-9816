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
import DesignParametersDisplay from '../components/ui/DesignParametersDisplay';
import DesignParametersForm from '../components/ui/DesignParametersForm';
import { generateCourseContent, generateCourseTopicsAndLessons } from '../services/enhancedAiService';
import { getEffectiveDesignParameters, DEFAULT_DESIGN_PARAMETERS } from '../services/instructionalParameterService';

const { FiEdit3, FiSave, FiPlay, FiChevronDown, FiChevronRight, FiBook, FiTarget, FiList, FiInfo, FiPlus, FiTrash2, FiRefreshCw, FiFileText, FiX, FiDatabase, FiSearch, FiGlobe, FiExternalLink, FiChevronUp, FiSettings, FiMapPin, FiClock, FiFilter, FiZap } = FiIcons;

const ReviewDashboard = () => {
  const { programId } = useParams();
  const navigate = useNavigate();
  const { programs, currentProgram, setCurrentProgram, updateProgram } = useProgramStore();
  const { getActiveOpenAIKeys, getActivePerplexityKeys, getDecryptedLMSCredentials } = useSettingsStore();
  const { generationStatus, startGeneration, updateProgress, updateTaskProgress, pauseGeneration, resumeGeneration, abortGeneration, completeGeneration, failGeneration, minimizeStatus, maximizeStatus, hideStatus, getAbortSignal, checkPauseStatus } = useGeneration();
  const { vectorStoreAssignments } = useVectorStoreStore();

  const [selectedCourseId, setSelectedCourseId] = useState('');
  const [editingItem, setEditingItem] = useState(null);
  const [expandedTopics, setExpandedTopics] = useState(new Set());
  const [generating, setGenerating] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [regeneratingCourse, setRegeneratingCourse] = useState(false);
  const [activeApiKey, setActiveApiKey] = useState(null);

  // New state for Perplexity Sonar web search context
  const [usePerplexityWebSearch, setUsePerplexityWebSearch] = useState(false);

  // ✅ CORRECTED: Updated state for Sonar configuration with valid search_mode values
  const [showSonarConfig, setShowSonarConfig] = useState(false);
  const [sonarConfig, setSonarConfig] = useState({
    sonarModel: 'sonar',
    searchMode: 'web', // ✅ FIXED: Changed from 'web_search' to 'web'
    searchContextSize: 'medium',
    searchRecency: 'month',
    domainFilter: '',
    temperature: 0.3,
    maxTokens: 1400,
    country: '',
    region: '',
    city: ''
  });

  // ✅ NEW: State for design parameters override
  const [showDesignParametersModal, setShowDesignParametersModal] = useState(false);
  const [courseDesignParameters, setCourseDesignParameters] = useState({});

  // New state for additional context modals
  const [showTopicContextModal, setShowTopicContextModal] = useState(false);
  const [showLessonContextModal, setShowLessonContextModal] = useState(false);
  const [selectedTopicForContext, setSelectedTopicForContext] = useState(null);
  const [selectedLessonForContext, setSelectedLessonForContext] = useState(null);
  const [topicContextInput, setTopicContextInput] = useState('');
  const [lessonContextInput, setLessonContextInput] = useState('');

  // New state for citations display
  const [showCitationsModal, setShowCitationsModal] = useState(false);
  const [citationsExpanded, setCitationsExpanded] = useState(false);

  // Validation function for domain filter
  const validateDomainFilter = (domains) => {
    if (!domains.trim()) return true;
    const domainList = domains.split(',').map(d => d.trim());
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?(\.[a-zA-Z]{2,})+$/;
    return domainList.every(domain => domainRegex.test(domain));
  };

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

      // Load existing sonar config if available
      if (program.sonarConfig) {
        setSonarConfig(program.sonarConfig);
      }
    } else {
      navigate('/');
    }
  }, [programId, programs, setCurrentProgram, navigate]);

  const selectedCourse = currentProgram?.courses?.find(c => c.id === selectedCourseId);

  // ✅ NEW: Get effective design parameters for the selected course
  const getSelectedCourseDesignParameters = () => {
    if (!selectedCourse) return DEFAULT_DESIGN_PARAMETERS;
    return getEffectiveDesignParameters(selectedCourse, currentProgram);
  };

  // ✅ NEW: Handle design parameters override for course
  const handleDesignParametersOverride = () => {
    const currentParams = getSelectedCourseDesignParameters();
    setCourseDesignParameters(currentParams);
    setShowDesignParametersModal(true);
  };

  // ✅ NEW: Save design parameters override for course
  const handleSaveDesignParametersOverride = () => {
    if (!selectedCourse) return;

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    if (course) {
      course.designParameters = courseDesignParameters;
      updateProgram(programId, updatedProgram);
      toast.success('Course design parameters updated successfully!');
    }
    setShowDesignParametersModal(false);
  };

  // ✅ NEW: Reset course design parameters to program defaults
  const handleResetDesignParametersToDefaults = () => {
    if (!selectedCourse) return;

    const updatedProgram = { ...currentProgram };
    const course = updatedProgram.courses.find(c => c.id === selectedCourseId);
    if (course) {
      delete course.designParameters; // Remove course-level overrides
      updateProgram(programId, updatedProgram);
      toast.success('Course design parameters reset to program defaults!');
    }
  };

  // Save sonar config to program
  const saveSonarConfig = () => {
    const updatedProgram = { ...currentProgram };
    updatedProgram.sonarConfig = sonarConfig;
    updateProgram(programId, updatedProgram);
    toast.success('Sonar configuration saved!');
    setShowSonarConfig(false);
  };

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
    const perplexityKeys = getActivePerplexityKeys();
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

    // Check if Perplexity is required but not available
    if (usePerplexityWebSearch && perplexityKeys.length === 0) {
      toast.error('Perplexity web search is enabled but no Perplexity API keys found. Please add a Perplexity API key or disable web search.');
      return;
    }

    // Validate domain filter if provided
    if (sonarConfig.domainFilter && !validateDomainFilter(sonarConfig.domainFilter)) {
      toast.error('Invalid domain filter format. Please use valid domain names separated by commas (e.g., wordpress.org, github.com)');
      return;
    }

    setGenerating(true);

    // Calculate totals
    const totalTopics = selectedCourse.topics?.length || 0;
    const totalLessons = selectedCourse.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;

    startGeneration(
      selectedCourse.courseTitle,
      totalTopics,
      totalLessons,
      'Starting full course content generation...'
    );

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
        vectorStoreAssignments,
        {
          usePerplexityWebSearch,
          perplexityApiKey: perplexityKeys.length > 0 ? perplexityKeys[0].key : null,
          sonarConfig: usePerplexityWebSearch ? sonarConfig : null
        },
        currentProgram // ✅ NEW: Pass program context for design parameters
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

  // ✅ CORRECTED: Sonar Configuration Modal Component with valid search_mode options
  const SonarConfigModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowSonarConfig(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiSettings} className="text-2xl text-purple-600" />
            <h3 className="text-xl font-bold">Sonar Web Search Configuration</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowSonarConfig(false)}>
            <SafeIcon icon={FiX} />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Configuration */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <SafeIcon icon={FiZap} className="mr-2 text-purple-600" />
              Basic Configuration
            </h4>
            <div className="space-y-4">
              <Select
                label="Sonar Model"
                value={sonarConfig.sonarModel}
                onChange={(e) => setSonarConfig({ ...sonarConfig, sonarModel: e.target.value })}
                options={[
                  { value: 'sonar', label: 'Sonar (Standard)' },
                  { value: 'sonar-pro', label: 'Sonar Pro (Advanced)' }
                ]}
              />

              {/* ✅ CORRECTED: Updated search mode options to match API requirements */}
              <Select
                label="Search Mode"
                value={sonarConfig.searchMode}
                onChange={(e) => setSonarConfig({ ...sonarConfig, searchMode: e.target.value })}
                options={[
                  { value: 'web', label: 'Web Search' }, // ✅ FIXED: Changed from 'web_search' to 'web'
                  { value: 'academic', label: 'Academic Search' },
                  { value: 'sec', label: 'SEC Filings' } // ✅ FIXED: Added 'sec' option
                ]}
              />

              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Temperature"
                  type="number"
                  min="0"
                  max="1"
                  step="0.1"
                  value={sonarConfig.temperature}
                  onChange={(e) => setSonarConfig({ ...sonarConfig, temperature: parseFloat(e.target.value) })}
                />
                <Input
                  label="Max Tokens"
                  type="number"
                  min="100"
                  max="4000"
                  value={sonarConfig.maxTokens}
                  onChange={(e) => setSonarConfig({ ...sonarConfig, maxTokens: parseInt(e.target.value) })}
                />
              </div>
            </div>
          </Card>

          {/* Search Configuration */}
          <Card className="p-4">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <SafeIcon icon={FiSearch} className="mr-2 text-blue-600" />
              Search Configuration
            </h4>
            <div className="space-y-4">
              <Select
                label="Search Context Size"
                value={sonarConfig.searchContextSize}
                onChange={(e) => setSonarConfig({ ...sonarConfig, searchContextSize: e.target.value })}
                options={[
                  { value: 'low', label: 'Low Context' },
                  { value: 'medium', label: 'Medium Context' },
                  { value: 'high', label: 'High Context' }
                ]}
              />

              <Select
                label="Search Recency Filter"
                value={sonarConfig.searchRecency}
                onChange={(e) => setSonarConfig({ ...sonarConfig, searchRecency: e.target.value })}
                options={[
                  { value: 'day', label: 'Last Day' },
                  { value: 'week', label: 'Last Week' },
                  { value: 'month', label: 'Last Month' },
                  { value: 'year', label: 'Last Year' }
                ]}
              />

              <div>
                <Input
                  label="Domain Filter (Optional)"
                  placeholder="wordpress.org, github.com, stackoverflow.com"
                  value={sonarConfig.domainFilter}
                  onChange={(e) => setSonarConfig({ ...sonarConfig, domainFilter: e.target.value })}
                />
                <p className="text-xs text-gray-500 mt-1">
                  Comma-separated domain names to restrict search to specific sites
                </p>
                {sonarConfig.domainFilter && !validateDomainFilter(sonarConfig.domainFilter) && (
                  <p className="text-xs text-red-600 mt-1">
                    Invalid domain format. Use valid domains like: example.com, site.org
                  </p>
                )}
              </div>
            </div>
          </Card>

          {/* Location Configuration */}
          <Card className="p-4 md:col-span-2">
            <h4 className="font-semibold text-gray-900 mb-4 flex items-center">
              <SafeIcon icon={FiMapPin} className="mr-2 text-green-600" />
              User Location (Optional)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                label="Country"
                placeholder="e.g., United States"
                value={sonarConfig.country}
                onChange={(e) => setSonarConfig({ ...sonarConfig, country: e.target.value })}
              />
              <Input
                label="Region/State"
                placeholder="e.g., California"
                value={sonarConfig.region}
                onChange={(e) => setSonarConfig({ ...sonarConfig, region: e.target.value })}
              />
              <Input
                label="City"
                placeholder="e.g., San Francisco"
                value={sonarConfig.city}
                onChange={(e) => setSonarConfig({ ...sonarConfig, city: e.target.value })}
              />
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Location information helps provide geographically relevant search results
            </p>
          </Card>
        </div>

        {/* Configuration Preview */}
        <Card className="p-4 mt-6 bg-gray-50">
          <h4 className="font-semibold text-gray-900 mb-2">Configuration Preview</h4>
          <pre className="text-sm text-gray-700 bg-white p-3 rounded border overflow-x-auto">
            {JSON.stringify({
              model: sonarConfig.sonarModel,
              search_mode: sonarConfig.searchMode,
              web_search_options: {
                search_context_size: sonarConfig.searchContextSize,
                search_recency_filter: sonarConfig.searchRecency,
                ...(sonarConfig.domainFilter && {
                  search_domain_filter: sonarConfig.domainFilter.split(',').map(d => d.trim()).filter(d => d)
                })
              },
              temperature: sonarConfig.temperature,
              max_tokens: sonarConfig.maxTokens,
              ...(sonarConfig.country || sonarConfig.region || sonarConfig.city) && {
                user_location: {
                  ...(sonarConfig.country && { country: sonarConfig.country }),
                  ...(sonarConfig.region && { region: sonarConfig.region }),
                  ...(sonarConfig.city && { city: sonarConfig.city })
                }
              }
            }, null, 2)}
          </pre>
        </Card>

        <div className="flex justify-end space-x-3 mt-6">
          <Button variant="secondary" onClick={() => setShowSonarConfig(false)}>
            Cancel
          </Button>
          <Button onClick={saveSonarConfig}>
            Save Configuration
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );

  // ✅ NEW: Design Parameters Override Modal
  const DesignParametersModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowDesignParametersModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiSettings} className="text-2xl text-purple-600" />
            <h3 className="text-xl font-bold">Course Design Parameters Override</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowDesignParametersModal(false)}>
            <SafeIcon icon={FiX} />
          </Button>
        </div>

        <div className="mb-6">
          <h4 className="font-medium text-gray-900 mb-2">
            {selectedCourse?.courseTitle}
          </h4>
          <p className="text-sm text-gray-600 mb-4">
            Override the program-level design parameters for this specific course. Leave parameters unchanged to inherit from program defaults.
          </p>
          
          {selectedCourse?.designParameters ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-blue-800 text-sm">
                ✅ This course has custom design parameter overrides. Changes will update the course-specific settings.
              </p>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4">
              <p className="text-gray-700 text-sm">
                📋 This course is using program-level defaults. Any changes will create course-specific overrides.
              </p>
            </div>
          )}
        </div>

        <DesignParametersForm
          designParameters={courseDesignParameters}
          onChange={setCourseDesignParameters}
          title="Course-Specific Design Parameters"
          description="These parameters will override the program defaults for this course only."
          showDescription={false}
        />

        <div className="flex justify-between mt-6">
          <div>
            {selectedCourse?.designParameters && (
              <Button
                variant="secondary"
                onClick={handleResetDesignParametersToDefaults}
                className="text-orange-600 hover:text-orange-700"
              >
                Reset to Program Defaults
              </Button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button variant="secondary" onClick={() => setShowDesignParametersModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDesignParametersOverride}>
              Save Override
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );

  // Citations Modal Component
  const CitationsModal = () => (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={() => setShowCitationsModal(false)}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-xl p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <SafeIcon icon={FiExternalLink} className="text-2xl text-primary-600" />
            <h3 className="text-xl font-bold">Research Sources & Citations</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setShowCitationsModal(false)}>
            <SafeIcon icon={FiX} />
          </Button>
        </div>

        <div className="space-y-6">
          {/* Research Context Citations */}
          {currentProgram?.researchCitations && currentProgram.researchCitations.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SafeIcon icon={FiSearch} className="mr-2 text-purple-600" />
                Industry Research Sources
              </h4>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-4">
                <p className="text-purple-800 text-sm mb-3">
                  These sources were used to gather current industry trends and market insights for your program context.
                </p>
                <div className="grid gap-3">
                  {currentProgram.researchCitations.map((citation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-purple-200">
                      <SafeIcon icon={FiExternalLink} className="text-purple-600 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{citation.title || `Source ${index + 1}`}</h5>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-600 hover:text-purple-800 text-sm break-all"
                        >
                          {citation.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Structure Generation Citations */}
          {currentProgram?.structureCitations && currentProgram.structureCitations.length > 0 && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <SafeIcon icon={FiBook} className="mr-2 text-indigo-600" />
                Course Structure Generation Sources
                {currentProgram.usedSonarProStructure && (
                  <span className="ml-2 text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                    Sonar-Pro Enhanced
                  </span>
                )}
              </h4>
              <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4 mb-4">
                <p className="text-indigo-800 text-sm mb-3">
                  {currentProgram.usedSonarProStructure
                    ? "These sources were used by Perplexity Sonar-Pro to generate your course structure with real-time web context and enhanced reasoning."
                    : "These sources were referenced during the course structure generation process."
                  }
                </p>
                <div className="grid gap-3">
                  {currentProgram.structureCitations.map((citation, index) => (
                    <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border border-indigo-200">
                      <SafeIcon icon={FiExternalLink} className="text-indigo-600 mt-1" />
                      <div className="flex-1">
                        <h5 className="font-medium text-gray-900">{citation.title || `Source ${index + 1}`}</h5>
                        <a
                          href={citation.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:text-indigo-800 text-sm break-all"
                        >
                          {citation.url}
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* No Citations Available */}
          {(!currentProgram?.researchCitations || currentProgram.researchCitations.length === 0) &&
            (!currentProgram?.structureCitations || currentProgram.structureCitations.length === 0) && (
              <div className="text-center py-8">
                <SafeIcon icon={FiInfo} className="text-4xl text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-semibold text-gray-900 mb-2">No Citations Available</h4>
                <p className="text-gray-600">
                  This program was generated without external research sources or the citations were not captured.
                </p>
              </div>
            )}
        </div>
      </motion.div>
    </motion.div>
  );

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
            <p>The system first conducts comprehensive research using AI to analyze your niche and create detailed program context.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">2</div>
            <p>Based on the research, GPT-4.1 or Sonar-Pro generates the program structure with detailed courses, topics, and lessons.</p>
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
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">6</div>
            <p>Perplexity web search provides real-time context and current industry insights for each lesson with configurable parameters.</p>
          </div>
          <div className="flex items-start space-x-3">
            <div className="w-6 h-6 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center flex-shrink-0 mt-0.5">7</div>
            <p>Design parameters ensure content matches your preferred instructional approach and audience level.</p>
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
        {showCitationsModal && <CitationsModal />}
        {showSonarConfig && <SonarConfigModal />}
        {showDesignParametersModal && <DesignParametersModal />}
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
          <div className="flex items-center space-x-3">
            <Button
              variant="ghost"
              className="flex items-center space-x-2"
              onClick={() => setShowCitationsModal(true)}
            >
              <SafeIcon icon={FiExternalLink} className="text-primary-600" />
              <span>View Sources</span>
            </Button>
            <Button
              variant="ghost"
              className="flex items-center space-x-2"
              onClick={() => setShowInfoModal(true)}
            >
              <SafeIcon icon={FiInfo} className="text-primary-600" />
              <span>How it works</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Citations Summary Banner */}
      {(currentProgram?.researchCitations?.length > 0 || currentProgram?.structureCitations?.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => setCitationsExpanded(!citationsExpanded)}>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-100 rounded-full">
                  <SafeIcon icon={FiExternalLink} className="text-blue-600 text-lg" />
                </div>
                <div>
                  <h3 className="font-medium text-blue-800">Research-Enhanced Program</h3>
                  <p className="text-blue-700 text-sm">
                    This program was generated using {currentProgram.researchEnhanced ? 'real-time industry research' : 'enhanced AI analysis'}
                    {currentProgram.usedSonarProStructure && ' with Sonar-Pro structure generation'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowCitationsModal(true);
                  }}
                  className="text-blue-700 hover:text-blue-800"
                >
                  View All Sources
                </Button>
                <SafeIcon icon={citationsExpanded ? FiChevronUp : FiChevronDown} className="text-blue-600" />
              </div>
            </div>

            <AnimatePresence>
              {citationsExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-4 pt-4 border-t border-blue-200"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {currentProgram.researchCitations?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                          <SafeIcon icon={FiSearch} className="mr-2" />
                          Industry Research ({currentProgram.researchCitations.length} sources)
                        </h4>
                        <div className="space-y-2">
                          {currentProgram.researchCitations.slice(0, 3).map((citation, index) => (
                            <div key={index} className="text-sm">
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 truncate block"
                                title={citation.title || citation.url}
                              >
                                {citation.title || `Source ${index + 1}`}
                              </a>
                            </div>
                          ))}
                          {currentProgram.researchCitations.length > 3 && (
                            <p className="text-xs text-blue-600">
                              +{currentProgram.researchCitations.length - 3} more sources
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {currentProgram.structureCitations?.length > 0 && (
                      <div>
                        <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                          <SafeIcon icon={FiBook} className="mr-2" />
                          Structure Generation ({currentProgram.structureCitations.length} sources)
                          {currentProgram.usedSonarProStructure && (
                            <span className="ml-1 text-xs px-1 py-0.5 bg-indigo-100 text-indigo-700 rounded">
                              Sonar-Pro
                            </span>
                          )}
                        </h4>
                        <div className="space-y-2">
                          {currentProgram.structureCitations.slice(0, 3).map((citation, index) => (
                            <div key={index} className="text-sm">
                              <a
                                href={citation.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 truncate block"
                                title={citation.title || citation.url}
                              >
                                {citation.title || `Source ${index + 1}`}
                              </a>
                            </div>
                          ))}
                          {currentProgram.structureCitations.length > 3 && (
                            <p className="text-xs text-blue-600">
                              +{currentProgram.structureCitations.length - 3} more sources
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </motion.div>
      )}

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
                You're reviewing the program structure based on comprehensive AI research. Edit, add, or remove topics and lessons before generating full content. You can also add knowledge libraries to topics or lessons to enhance content with relevant information.
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
                {/* ✅ NEW: Design Parameters Display and Override */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <SafeIcon icon={FiSettings} className="text-purple-600 text-lg" />
                      <h4 className="font-medium text-purple-800">Design Parameters</h4>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleDesignParametersOverride}
                      className="text-purple-700 hover:text-purple-800"
                    >
                      <SafeIcon icon={FiEdit3} className="mr-1" />
                      Override
                    </Button>
                  </div>
                  
                  <DesignParametersDisplay
                    designParameters={getSelectedCourseDesignParameters()}
                    isCompact={true}
                    showEditButton={false}
                    className="mb-2"
                  />
                  
                  {selectedCourse.designParameters ? (
                    <p className="text-xs text-purple-700">
                      ✅ Using course-specific overrides
                    </p>
                  ) : (
                    <p className="text-xs text-purple-600">
                      📋 Using program defaults
                    </p>
                  )}
                </div>

                {/* Perplexity Web Search Toggle */}
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                  <div className="flex items-center space-x-3 mb-3">
                    <SafeIcon icon={FiGlobe} className="text-purple-600 text-lg" />
                    <h4 className="font-medium text-purple-800">Web Search Enhancement</h4>
                  </div>
                  <label className="flex items-center space-x-3 mb-3">
                    <input
                      type="checkbox"
                      checked={usePerplexityWebSearch}
                      onChange={(e) => setUsePerplexityWebSearch(e.target.checked)}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                    />
                    <div>
                      <span className="text-sm font-medium text-purple-800">
                        Use Perplexity Web Search Context
                      </span>
                      <p className="text-xs text-purple-700 mt-1">
                        Generate real-time web research context for each lesson using Perplexity Sonar
                      </p>
                    </div>
                  </label>

                  {usePerplexityWebSearch && (
                    <div className="mt-3 pt-3 border-t border-purple-200">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowSonarConfig(true)}
                        className="flex items-center space-x-2 text-purple-700 hover:text-purple-800"
                      >
                        <SafeIcon icon={FiSettings} />
                        <span>Configure Sonar Parameters</span>
                      </Button>
                      <p className="text-xs text-purple-700 mt-1">
                        Model: {sonarConfig.sonarModel} | Context: {sonarConfig.searchContextSize} | Recency: {sonarConfig.searchRecency}
                      </p>
                    </div>
                  )}

                  {usePerplexityWebSearch && getActivePerplexityKeys().length === 0 && (
                    <div className="mt-2 text-xs text-red-600">
                      ⚠️ No Perplexity API keys found. Please add one in settings.
                    </div>
                  )}
                </div>

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

          {/* Info Cards remain the same... */}
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
              <li className="flex items-start">
                <SafeIcon icon={FiGlobe} className="mr-2 text-primary-600 mt-0.5" />
                <span>Real-time web search context (if enabled)</span>
              </li>
              <li className="flex items-start">
                <SafeIcon icon={FiSettings} className="mr-2 text-primary-600 mt-0.5" />
                <span>Content tailored to design parameters</span>
              </li>
            </ul>
          </Card>

          {/* Enhanced Web Search Enhancement Info */}
          <Card className="p-6 mt-6 bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <div className="flex items-center space-x-2 mb-2">
              <SafeIcon icon={FiGlobe} className="text-purple-600" />
              <h3 className="font-medium text-purple-800">Advanced Web Search Enhancement</h3>
            </div>
            <p className="text-sm text-purple-700 mb-4">
              When enabled, Perplexity web search will:
            </p>
            <ul className="text-sm text-purple-700 space-y-2">
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0 mr-2">1</div>
                <span>Generate topic-level web search context for current trends</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0 mr-2">2</div>
                <span>Create lesson-specific web research context (300-400 tokens each)</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0 mr-2">3</div>
                <span>Integrate real-time industry insights and current examples</span>
              </li>
              <li className="flex items-start">
                <div className="w-5 h-5 rounded-full bg-purple-200 text-purple-700 flex items-center justify-center flex-shrink-0 mr-2">4</div>
                <span>Enhanced with configurable parameters: model, context size, recency filter, domain filter, and location-based results</span>
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
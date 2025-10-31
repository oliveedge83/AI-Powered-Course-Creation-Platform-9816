import React,{useState} from 'react';
    import {useNavigate} from 'react-router-dom';
    import {motion,AnimatePresence} from 'framer-motion';
    import {useForm} from 'react-hook-form';
    import toast from 'react-hot-toast';
    import * as FiIcons from 'react-icons/fi';
    import SafeIcon from '../common/SafeIcon';
    import {useProgramStore} from '../stores/programStore';
    import {useSettingsStore} from '../stores/settingsStore';
    import {useGeneration} from '../contexts/GenerationContext';
    import Card from '../components/ui/Card';
    import Input from '../components/ui/Input';
    import Textarea from '../components/ui/Textarea';
    import Select from '../components/ui/Select';
    import Button from '../components/ui/Button';
    import StatusBar from '../components/ui/StatusBar';
    import DesignParametersForm from '../components/ui/DesignParametersForm';
    import {generateProgramStructure} from '../services/aiService';
    import {validateAllApiKeys} from '../services/enhancedApiKeyValidator';
    import {DEFAULT_DESIGN_PARAMETERS} from '../services/instructionalParameterService';
    // ✅ NEW: Import numbering service functions
    import {generateExampleCodes} from '../services/numberingService';
    
    const {
      FiTarget,
      FiBook,
      FiSettings,
      FiZap,
      FiAlertTriangle,
      FiCheckCircle,
      FiSearch,
      FiDatabase,
      FiBrain,
      FiHash,
      FiInfo,
    }=FiIcons;
    
    const ProgramInitiation=()=> {
      const [loading,setLoading]=useState(false);
      const [validatingKeys,setValidatingKeys]=useState(false);
      const [validationResult,setValidationResult]=useState(null);
      const [designParameters,setDesignParameters]=useState(
        DEFAULT_DESIGN_PARAMETERS
      );
      // ✅ NEW: State for numbering examples
      const [showNumberingExamples,setShowNumberingExamples]=useState(false);
    
      const navigate=useNavigate();
      const {addProgram}=useProgramStore();
      const {
        getActiveOpenAIKeys,
        getActivePerplexityKeys,
        getDecryptedLMSCredentials,
      }=useSettingsStore();
      const {
        generationStatus,
        startGeneration,
        updateProgress,
        completeGeneration,
        failGeneration,
        hideStatus,
      }=useGeneration();
    
      const {
        register,
        handleSubmit,
        formState: {errors},
        watch,
      }=useForm({
        defaultValues: {
          numberOfCourses: 5,
          instructionalDesignModel: 'default',
          generateSlides: true,
          usePerplexityResearch: true,
          useSonarProStructure: false,
        },
      });
    
      const instructionalModels=[
        {value: 'default',label: 'Default'},
        {value: 'blooms-taxonomy',label: "Bloom's Taxonomy"},
        {value: 'gagnes-nine',label: "Gagne's Nine Events"},
        {value: 'addie',label: 'ADDIE Model'},
        {value: 'sam',label: 'SAM (Successive Approximation Model)'},
        {value: 'kirkpatrick',label: 'Kirkpatrick Model'},
      ];
    
      // Validate all API keys before form submission
      const handleValidateKeys=async ()=> {
        setValidatingKeys(true);
        const openaiKeys=getActiveOpenAIKeys();
        const perplexityKeys=getActivePerplexityKeys();
    
        if (openaiKeys.length===0 && perplexityKeys.length===0) {
          toast.error(
            'No API keys found. Please add at least one OpenAI or Perplexity API key in settings.'
          );
          setValidatingKeys(false);
          return false;
        }
    
        try {
          toast.loading('Validating API keys...',{id: 'validating-keys'});
          const validation=await validateAllApiKeys(openaiKeys,perplexityKeys);
          setValidationResult(validation);
    
          if (validation.hasAnyValidKey) {
            const validProviders=[];
            if (validation.openai.hasValidKey)
              validProviders.push(`OpenAI: ${validation.openai.validKey.label}`);
            if (validation.perplexity.hasValidKey)
              validProviders.push(
                `Perplexity: ${validation.perplexity.validKey.label}`
              );
            toast.success(`✅ Valid API keys found: ${validProviders.join(',')}`,{
              id: 'validating-keys',
            });
            setValidatingKeys(false);
            return true;
          } else {
            toast.error(`❌ No valid API keys found. Please check your keys in settings.`,{
              id: 'validating-keys',
            });
            setValidatingKeys(false);
            return false;
          }
        } catch (error) {
          console.error('Error validating API keys:',error);
          toast.error(
            'Failed to validate API keys. Please check your internet connection.',
            {id: 'validating-keys'}
          );
          setValidatingKeys(false);
          return false;
        }
      };
    
      const onSubmit=async (data)=> {
        console.log("🚀 Form submitted with data:",data);
        console.log("🎯 Design parameters:",designParameters);
    
        const openaiKeys=getActiveOpenAIKeys();
        const perplexityKeys=getActivePerplexityKeys();
        const lmsCredentials=getDecryptedLMSCredentials();
    
        // Validate API keys first
        if (openaiKeys.length===0 && perplexityKeys.length===0) {
          toast.error(
            'Please add at least one OpenAI or Perplexity API key in settings.'
          );
          navigate('/settings');
          return;
        }
    
        // Check if Sonar-Pro is required but Perplexity keys are not available
        if (data.useSonarProStructure && perplexityKeys.length===0) {
          toast.error(
            'Sonar-Pro structure generation is enabled but no Perplexity API keys found. Please add a Perplexity API key or disable Sonar-Pro structure generation.'
          );
          return;
        }
    
        // Validate LMS credentials
        if (!lmsCredentials.username || !lmsCredentials.password) {
          toast.error('Please configure your LMS credentials in settings.');
          navigate('/settings');
          return;
        }
    
        setLoading(true);
        startGeneration('Validating API keys and initiating program generation...');
    
        try {
          // Step 1: Validate API keys
          updateProgress(5,'Validating API keys...','validation');
          console.log("🔑 Validating API keys...");
          const keyValidation=await validateAllApiKeys(openaiKeys,perplexityKeys);
          if (!keyValidation.hasAnyValidKey) {
            throw new Error(`API Key Validation Failed: No valid API keys found`);
          }
    
          // Check specific requirements for Sonar-Pro structure generation
          if (data.useSonarProStructure && !keyValidation.perplexity.hasValidKey) {
            throw new Error(
              'Sonar-Pro structure generation requires a valid Perplexity API key'
            );
          }
    
          // Step 2: Show validation success
          const validProviders=[];
          if (keyValidation.openai.hasValidKey)
            validProviders.push(`OpenAI: ${keyValidation.openai.validKey.label}`);
          if (keyValidation.perplexity.hasValidKey)
            validProviders.push(
              `Perplexity: ${keyValidation.perplexity.validKey.label}`
            );
    
          updateProgress(
            15,
            `✅ API keys validated successfully: ${validProviders.join(',')}`,
            'validated'
          );
          toast.success(`Using API keys: ${validProviders.join(',')}`,{
            duration: 3000,
          });
    
          // Step 3: Generate program structure with enhanced research
          updateProgress(
            25,
            'Conducting comprehensive research on your niche using AI...',
            'research'
          );
          console.log("🏗️ Generating program structure...");
    
          // Use enhanced program generation with Perplexity research if available
          const programStructure=await generateProgramStructure(
            {...data,designParameters},
            keyValidation,// Pass full validation results
            data.usePerplexityResearch
          );
    
          // Step 4: Finalize
          updateProgress(90,'Creating comprehensive program structure...','structure');
          const newProgram=addProgram({
            ...data,
            ...programStructure,
            designParameters,// Include design parameters in program
            status: 'draft',
            apiKeysUsed: {
              openai: keyValidation.openai.hasValidKey
                ? keyValidation.openai.validKey.label
                : null,
              perplexity: keyValidation.perplexity.hasValidKey
                ? keyValidation.perplexity.validKey.label
                : null,
              usedSonarProStructure: data.useSonarProStructure,
            },
          });
    
          updateProgress(100,'Program structure generated successfully!','completed');
          setTimeout(()=> {
            completeGeneration(
              '✅ Program structure generated successfully using AI research!'
            );
            navigate(`/review/${newProgram.id}`);
          },1000);
        } catch (error) {
          console.error('❌ Error generating program:',error);
          let errorMessage='Failed to generate program structure. Please try again.';
          if (error.message.includes('API Key Validation Failed')) {
            errorMessage=`API Key Error: ${error.message.replace(
              'API Key Validation Failed: ',
              ''
            )}`;
          } else if (
            error.message.includes('OpenAI API') ||
            error.message.includes('Perplexity API')
          ) {
            errorMessage=error.message;
          } else if (error.response?.status===401) {
            errorMessage='Invalid API key. Please check your API keys in settings.';
          } else if (error.response?.status===429) {
            errorMessage='API rate limit exceeded. Please try again in a few moments.';
          } else if (error.message.includes('JSON') || error.message.includes('parse')) {
            errorMessage='The AI generated an invalid response format. Please try again.';
          } else if (error.message.includes('No valid JSON')) {
            errorMessage='The AI response was not in the expected format. Please try again.';
          }
          toast.error(errorMessage);
          failGeneration(errorMessage);
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
            initial={{opacity: 0,y: 20}}
            animate={{opacity: 1,y: 0}}
            className="mb-8"
          >
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Create New MicroMasters Program
            </h1>
            <p className="text-gray-600">
              Define your program requirements and let AI generate a comprehensive
              curriculum structure with real-time industry research.
            </p>
          </motion.div>
    
          {/* ✅ NEW: Program Code Numbering Info Section */}
          <motion.div
            initial={{opacity: 0,y: 20}}
            animate={{opacity: 1,y: 0}}
            transition={{delay: 0.05}}
            className="mb-8"
          >
            <Card className="p-6 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <SafeIcon icon={FiHash} className="text-white text-lg" />
                  </div>
                  <h2 className="text-xl font-semibold text-indigo-900">Automatic Program Numbering</h2>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={()=> setShowNumberingExamples(!showNumberingExamples)}
                  className="flex items-center space-x-2"
                >
                  <SafeIcon icon={FiInfo} />
                  <span>{showNumberingExamples ? 'Hide' : 'Show'} Examples</span>
                </Button>
              </div>
              <p className="text-indigo-800 mb-4">
                Your program will automatically receive a unique 6-character code (e.g.,
                <code className="bg-indigo-200 px-2 py-1 rounded font-mono">1BMU28</code>) based on your selected domain and niche. All courses,topics,and lessons will be numbered hierarchically.
              </p>
              <AnimatePresence>
                {showNumberingExamples && (
                  <motion.div
                    initial={{height: 0,opacity: 0}}
                    animate={{height: 'auto',opacity: 1}}
                    exit={{height: 0,opacity: 0}}
                    className="mt-4 pt-4 border-t border-indigo-200"
                  >
                    <h4 className="font-medium text-indigo-800 mb-3">Example Program Codes</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {generateExampleCodes().map((example,index)=> (
                        <div key={index} className="bg-white p-3 rounded-lg border border-indigo-200">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="font-mono text-lg font-bold text-indigo-700">{example.generated}</span>
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">{example.genre}</span>
                          </div>
                          <p className="text-sm text-gray-600">{example.niche}</p>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-indigo-100 rounded-lg">
                      <h5 className="font-medium text-indigo-800 mb-2">Complete Numbering Hierarchy</h5>
                      <div className="text-sm text-indigo-700 space-y-1 font-mono">
                        <div>📚 <strong>Program:</strong> 1BMU28</div>
                        <div>📖 <strong>Courses:</strong> 1BMU281,1BMU282,1BMU283...</div>
                        <div>🎯 <strong>Topics:</strong> 1BMU28__11,1BMU28__12,1BMU28__21...</div>
                        <div>📝 <strong>Lessons:</strong> 1BMU28__111,1BMU28__112,1BMU28__231...</div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Card>
          </motion.div>
    
          {/* API Key Validation Section */}
          <motion.div
            initial={{opacity: 0,y: 20}}
            animate={{opacity: 1,y: 0}}
            transition={{delay: 0.1}}
            className="mb-8"
          >
            <Card className="p-6 bg-blue-50 border-blue-200">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                  <SafeIcon icon={FiCheckCircle} className="text-white text-lg" />
                </div>
                <h2 className="text-xl font-semibold text-blue-900">API Key Validation</h2>
              </div>
              <p className="text-blue-800 mb-4">
                Before generating your program,we'll validate your OpenAI and Perplexity API keys to ensure smooth operation with enhanced research capabilities.
              </p>
              {validationResult && (
                <div className="mb-4 p-4 bg-white rounded-lg border border-blue-200">
                  <h3 className="font-medium text-gray-900 mb-2">Validation Results:</h3>
                  <div className="space-y-2 text-sm">
                    <div className={`flex items-center space-x-2 ${validationResult.openai.hasValidKey ? 'text-green-700' : 'text-gray-500'}`}>
                      <SafeIcon icon={validationResult.openai.hasValidKey ? FiCheckCircle : FiAlertTriangle} />
                      <span>
                        OpenAI: {validationResult.openai.hasValidKey ? `✅ ${validationResult.openai.validKey.label}` : '❌ No valid key'}
                      </span>
                    </div>
                    <div className={`flex items-center space-x-2 ${validationResult.perplexity.hasValidKey ? 'text-green-700' : 'text-gray-500'}`}>
                      <SafeIcon icon={validationResult.perplexity.hasValidKey ? FiCheckCircle : FiAlertTriangle} />
                      <span>
                        Perplexity: {validationResult.perplexity.hasValidKey ? `✅ ${validationResult.perplexity.validKey.label}` : '❌ No valid key'}
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <Button
                onClick={handleValidateKeys}
                loading={validatingKeys}
                variant="secondary"
                className="flex items-center space-x-2"
              >
                <SafeIcon icon={FiCheckCircle} />
                <span>Validate API Keys</span>
              </Button>
            </Card>
          </motion.div>
    
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-8">
              {/* Program Details */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.15}}
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
                      placeholder="e.g.,Data Science,Digital Marketing,AI/ML"
                      {...register('niche',{
                        required: 'Program niche is required',
                        minLength: {
                          value: 3,
                          message: 'Niche must be at least 3 characters',
                        },
                      })}
                      error={errors.niche?.message}
                      className="md:col-span-2"
                    />
                    <Textarea
                      label="Must-Have Aspects"
                      placeholder="List key concepts,skills,or topics that are mandatory for the curriculum..."
                      rows={4}
                      {...register('mustHaveAspects',{
                        required: 'Must-have aspects are required',
                        minLength: {
                          value: 20,
                          message: 'Please provide more detailed requirements',
                        },
                      })}
                      error={errors.mustHaveAspects?.message}
                      className="md:col-span-2"
                    />
                    <Textarea
                      label="Other Design Considerations"
                      placeholder="Additional pedagogical notes,content style,target audience nuances..."
                      rows={3}
                      {...register('designConsiderations')}
                      className="md:col-span-2"
                    />
                    <Textarea
                      label="Suggested Course Structure (Optional)"
                      placeholder="Provide a suggested structure, e.g.,&#10;Course 1: Introduction to X&#10;- Topic 1.1: Core Concepts&#10;  - Lesson 1.1.1: What is X?&#10;  - Lesson 1.1.2: History of X"
                      rows={6}
                      {...register('suggestedCourseStructure')}
                      className="md:col-span-2"
                    />
                  </div>
                </Card>
              </motion.div>
    
              {/* Design Parameters Section */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.2}}
              >
                <DesignParametersForm
                  designParameters={designParameters}
                  onChange={setDesignParameters}
                  title="Program Design Parameters"
                  description="Configure default instructional design parameters for all courses in this program. These can be overridden at the course level during review."
                />
              </motion.div>
    
              {/* Course Configuration */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.25}}
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
                      min="1"
                      max="12"
                      {...register('numberOfCourses',{
                        required: 'Number of courses is required',
                        min: {
                          value: 1,
                          message: 'Minimum 1 course required',
                        },
                        max: {
                          value: 12,
                          message: 'Maximum 12 courses allowed',
                        },
                      })}
                      error={errors.numberOfCourses?.message}
                    />
                    <Select
                      label="Instructional Design Model"
                      options={instructionalModels}
                      {...register('instructionalDesignModel',{
                        required: 'Please select an instructional design model',
                      })}
                      error={errors.instructionalDesignModel?.message}
                    />
                    <div className="md:col-span-2 space-y-4">
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
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          {...register('usePerplexityResearch')}
                          className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                        />
                        <div className="flex items-center space-x-2">
                          <SafeIcon icon={FiSearch} className="text-purple-600" />
                          <span className="text-sm font-medium text-gray-700">Use Perplexity for real-time industry research</span>
                          <span className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded-full">Recommended</span>
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 ml-7">Enhance your program with current market trends,statistics,and industry insights</p>
                      {/* New Sonar-Pro Structure Generation Option */}
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          {...register('useSonarProStructure')}
                          className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <div className="flex items-center space-x-2">
                          <SafeIcon icon={FiBrain} className="text-indigo-600" />
                          <span className="text-sm font-medium text-gray-700">Generate course structure using Sonar-Pro instead of GPT</span>
                          <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">Advanced</span>
                        </div>
                      </label>
                      <p className="text-xs text-gray-500 ml-7">Use Perplexity Sonar-Pro for course structure generation with real-time web context and enhanced reasoning</p>
                    </div>
                  </div>
                </Card>
              </motion.div>
    
              {/* Advanced Options */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.3}}
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
    
              {/* Enhanced Requirements Notice */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.35}}
              >
                <Card className="p-6 bg-yellow-50 border-yellow-200">
                  <div className="flex items-start space-x-3">
                    <SafeIcon icon={FiAlertTriangle} className="text-yellow-600 text-xl mt-1" />
                    <div>
                      <h3 className="font-medium text-yellow-800 mb-2">Enhanced Requirements</h3>
                      <ul className="text-yellow-700 text-sm space-y-1">
                        <li>• At least one OpenAI or Perplexity API key is required</li>
                        <li>• OpenAI keys are used for content generation and structure creation</li>
                        <li>• Perplexity keys provide real-time industry research and current trends</li>
                        <li>• Sonar-Pro structure generation requires a valid Perplexity API key</li>
                        <li>• LMS credentials must be configured for content deployment</li>
                        <li>• Internet connection is required for AI-powered content generation</li>
                        <li>• Enhanced research may take additional time but provides better results</li>
                        <li>• Design parameters can be customized per course during the review phase</li>
                        <li>• <strong>Program codes are generated automatically</strong> based on your domain and niche</li>
                        <li>• <strong>All courses,topics,and lessons</strong> receive hierarchical numbering for easy organization</li>
                      </ul>
                    </div>
                  </div>
                </Card>
              </motion.div>
    
              {/* Submit Button */}
              <motion.div
                initial={{opacity: 0,y: 20}}
                animate={{opacity: 1,y: 0}}
                transition={{delay: 0.4}}
                className="flex justify-center"
              >
                <Button
                  type="submit"
                  loading={loading}
                  size="xl"
                  className="flex items-center space-x-3 px-12"
                >
                  <SafeIcon icon={FiZap} className="text-xl" />
                  <span>Generate Program with Enhanced AI Research</span>
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      );
    };
    
    export default ProgramInitiation;
import axios from 'axios';
import { supabase } from '../lib/supabase';

// Create API logs table for monitoring
const createApiLogsTable = async () => {
  try {
    const { data, error } = await supabase
      .from('api_logs_74621')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('Creating API logs table');
      // Try to create the table using RPC or direct SQL if supported
      try {
        await supabase.rpc('create_api_logs_table', { table_name: 'api_logs_74621' });
      } catch (rpcError) {
        console.error('Failed to create API logs table:', rpcError);
        // Fallback to direct SQL if RPC fails
        await supabase.from('api_logs_74621').insert({
          operation: 'table_creation',
          request_id: 'initial_setup',
          request_data: { message: 'Initial table setup' }
        });
      }
    } else {
      console.log('API logs table exists');
    }
    
    // Also check for the detailed token usage table
    try {
      const { error: tokenError } = await supabase
        .from('token_usage_74621')
        .select('*')
        .limit(1);
        
      if (tokenError) {
        console.log('Creating token usage table');
        // Try to create the table using RPC or direct SQL if supported
        try {
          await supabase.rpc('create_token_usage_table', { table_name: 'token_usage_74621' });
        } catch (rpcError) {
          console.error('Failed to create token usage table:', rpcError);
          // Create a basic structure if RPC fails
          await supabase.from('token_usage_74621').insert({
            model: 'initial_setup',
            prompt_tokens: 0,
            completion_tokens: 0,
            total_tokens: 0,
            operation_type: 'table_creation',
            request_id: 'initial_setup',
            duration_seconds: 0,
            is_estimate: true
          });
        }
      } else {
        console.log('Token usage table exists');
      }
    } catch (error) {
      console.error('Error checking token usage table:', error);
    }
  } catch (error) {
    console.error('Failed to check/create API logs table:', error);
  }
};

// Create recovery state table for resumable operations
const createRecoveryStateTable = async () => {
  try {
    const { data, error } = await supabase
      .from('recovery_state_74621')
      .select('*')
      .limit(1);
      
    if (error) {
      console.log('Creating recovery state table');
      try {
        await supabase.rpc('create_recovery_state', { table_name: 'recovery_state_74621' });
      } catch (rpcError) {
        console.error('Failed to create recovery state table:', rpcError);
        // Fallback to direct SQL if RPC fails
        await supabase.from('recovery_state_74621').insert({
          course_id: 'initial_setup',
          state_data: { message: 'Initial table setup' },
          updated_at: new Date().toISOString()
        });
      }
    } else {
      console.log('Recovery state table exists');
    }
  } catch (error) {
    console.error('Failed to check/create recovery state table:', error);
  }
};

// Initialize the tables
createApiLogsTable();
createRecoveryStateTable();

// Save recovery state for resumable operations
const saveRecoveryState = async (courseId, state) => {
  try {
    const { data, error } = await supabase
      .from('recovery_state_74621')
      .upsert(
        {
          course_id: courseId,
          state_data: state,
          updated_at: new Date().toISOString()
        },
        { onConflict: 'course_id' }
      );
      
    if (error) {
      console.error('Error saving recovery state:', error);
    }
    return data;
  } catch (err) {
    console.error('Failed to save recovery state:', err);
  }
};

// Load recovery state for resumable operations
const loadRecoveryState = async (courseId) => {
  try {
    const { data, error } = await supabase
      .from('recovery_state_74621')
      .select('state_data')
      .eq('course_id', courseId)
      .single();
      
    if (error) {
      console.error('Error loading recovery state:', error);
      return null;
    }
    return data?.state_data || null;
  } catch (err) {
    console.error('Failed to load recovery state:', err);
    return null;
  }
};

// Clear recovery state after successful completion
const clearRecoveryState = async (courseId) => {
  try {
    const { error } = await supabase
      .from('recovery_state_74621')
      .delete()
      .eq('course_id', courseId);
      
    if (error) {
      console.error('Error clearing recovery state:', error);
    }
  } catch (err) {
    console.error('Failed to clear recovery state:', err);
  }
};

// Enhanced OpenAI API call function with logging, retry logic, and rate limit handling
const callOpenAI = async (apiKey, prompt, systemPrompt, useGPT4 = false, retries = 3, abortSignal = null) => {
  let lastError;
  let tokenUsage = null;
  const startTime = new Date();
  const modelName = useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14";
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  // Log the API call attempt to Supabase
  try {
    await supabase.from('api_logs_74621').insert([{
      operation: 'openai_api_call',
      request_id: requestId,
      request_data: {
        model: modelName,
        prompt_length: prompt.length,
        system_prompt: systemPrompt,
        timestamp: new Date().toISOString()
      }
    }]);
  } catch (logError) {
    console.error("Failed to log API call:", logError);
  }

  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${retries + 1} using model: ${modelName}`);
      console.log(`Prompt length: ${prompt.length} characters`);
      
      // Calculate adaptive timeout based on prompt length
      const baseTimeout = 60000; // 60 seconds
      const charPerSec = 1000; // Rough estimate of OpenAI processing speed
      const estimatedTime = Math.min(180000, Math.max(baseTimeout, prompt.length / charPerSec * 1000));
      
      const callStartTime = new Date();
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: modelName,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: prompt }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          timeout: estimatedTime, // Adaptive timeout based on prompt length
          signal: abortSignal
        }
      );
      
      const endTime = new Date();
      const duration = (endTime - callStartTime) / 1000;
      const totalDuration = (endTime - startTime) / 1000;
      
      console.log(`API call completed in ${duration} seconds (total with retries: ${totalDuration}s)`);
      
      // Extract token usage
      tokenUsage = {
        prompt_tokens: response.data.usage?.prompt_tokens || 0,
        completion_tokens: response.data.usage?.completion_tokens || 0,
        total_tokens: response.data.usage?.total_tokens || 0
      };
      
      // Log successful response
      try {
        await supabase.from('api_logs_74621').insert([{
          operation: 'openai_api_success',
          request_id: requestId,
          request_data: {
            model: modelName,
            duration_seconds: duration,
            total_duration_seconds: totalDuration,
            attempts: attempt
          },
          response_data: {
            completion_tokens: tokenUsage.completion_tokens,
            prompt_tokens: tokenUsage.prompt_tokens,
            total_tokens: tokenUsage.total_tokens
          }
        }]);
        
        // Log detailed token usage
        await supabase.from('token_usage_74621').insert([{
          model: modelName,
          prompt_tokens: tokenUsage.prompt_tokens,
          completion_tokens: tokenUsage.completion_tokens,
          total_tokens: tokenUsage.total_tokens,
          operation_type: 'content_generation',
          request_id: requestId,
          duration_seconds: duration
        }]);
      } catch (logError) {
        console.error("Failed to log API success:", logError);
      }
      
      return {
        content: response.data.choices[0].message.content,
        tokenUsage
      };
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        console.log('Request aborted by user or timed out');
        throw new Error('Request aborted by user or timed out');
      }
      
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Handle rate limiting specifically
      let retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
      
      if (error.response?.status === 429) {
        console.log('Rate limit reached');
        // Extract retry-after header if available
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          const retrySeconds = parseInt(retryAfter, 10);
          if (!isNaN(retrySeconds)) {
            retryDelay = (retrySeconds + 1) * 1000; // Add a buffer second
          } else {
            // If retry-after header exists but couldn't be parsed, use a longer delay
            retryDelay = 60000; // 1 minute
          }
        } else {
          // If no retry-after header, use a conservative delay for rate limits
          retryDelay = 30000; // 30 seconds
        }
        
        console.log(`Rate limited. Waiting ${retryDelay/1000} seconds before retry...`);
      }
      
      // Log the error
      try {
        await supabase.from('api_logs_74621').insert([{
          operation: 'openai_api_error',
          request_id: requestId,
          error: error.message,
          request_data: {
            model: modelName,
            attempt: attempt,
            retry_delay: retryDelay / 1000
          },
          response_data: error.response ? {
            status: error.response.status,
            statusText: error.response.statusText,
            headers: error.response.headers,
            data: error.response.data
          } : null
        }]);
      } catch (logError) {
        console.error("Failed to log API error:", logError);
      }
      
      if (attempt <= retries) {
        console.log(`Retrying in ${retryDelay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      }
    }
  }
  
  // If we get here, all retries failed
  throw lastError;
};

// LMS integration functions
const createCourse = async (course, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/courses`,
    {
      post_author: 1,
      post_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_date_gmt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_content: course.courseDescription,
      post_title: course.courseTitle,
      post_excerpt: course.courseDescription.substring(0, 100),
      post_status: "publish",
      comment_status: "open",
      post_password: "",
      post_modified: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_modified_gmt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_content_filtered: "",
      additional_content: {
        course_benefits: "Comprehensive learning experience",
        course_target_audience: "Professionals and students",
        course_duration: { hours: "10", minutes: "30" },
        course_material_includes: "Video lectures, reading materials, assignments",
        course_requirements: "Basic understanding of the subject"
      },
      video: {
        source_type: "youtube",
        source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      course_level: "beginner",
      course_categories: [161, 163],
      course_tags: [18, 19],
      thumbnail_id: 0
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      signal: abortSignal
    }
  );
};

const createTopic = async (topic, courseId, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/topics`,
    {
      topic_course_id: courseId,
      topic_title: topic.topicTitle,
      topic_summary: topic.topicLearningObjectiveDescription,
      topic_author: 1
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      signal: abortSignal
    }
  );
};

const createLesson = async (lesson, topicId, credentials, fullContent = null, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  let lessonContent = lesson.lessonDescription;
  if (fullContent) {
    lessonContent = `
      <div class="lesson-full-content">
        <h2>Lesson Content</h2>
        ${fullContent.mainContent}
        <hr>
        <h2>Presentation Slides</h2>
        <div class="slides-content">
          <pre>${fullContent.slides}</pre>
        </div>
        <hr>
        <h2>Voice-Over Script</h2>
        <div class="voice-over-script">
          <pre>${fullContent.voiceOver}</pre>
        </div>
      </div>
    `;
  }
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/lessons/`,
    {
      topic_id: topicId,
      lesson_title: lesson.lessonTitle,
      lesson_content: lessonContent,
      thumbnail_id: 1,
      lesson_author: 1,
      video: {
        source_type: "youtube",
        source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        runtime: {
          hours: "00",
          minutes: "10",
          seconds: "36"
        }
      },
      attachments: [110],
      preview: true
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      signal: abortSignal
    }
  );
};

// Enhanced course content generation with progress tracking, RAG support, and resilience
export const generateCourseContent = async (course, lmsCredentials, apiKey, progressCallbacks = {}, vectorStoreAssignments = {}) => {
  const { onProgress, onTaskUpdate, checkPauseStatus, getAbortSignal } = progressCallbacks;
  
  // Track overall token usage for the entire course
  let courseTokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  };
  
  // Generate a unique course generation ID
  const courseGenerationId = `course_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = new Date();
  
  try {
    console.log("Generating full course content with OpenAI...");
    const abortSignal = getAbortSignal?.();
    
    // Calculate total tasks
    const totalTopics = course.topics?.length || 0;
    const totalLessons = course.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;
    const totalTasks = totalLessons * 3; // Each lesson has 3 tasks: content, slides, voice-over
    let completedTasks = 0;
    
    // Check for existing recovery state
    const courseId = course.id || `temp_${Date.now()}`;
    const recoveryState = await loadRecoveryState(courseId);
    
    if (recoveryState) {
      console.log("Found recovery state, resuming from previous session");
      // Update progress with recovery info
      onProgress?.(
        recoveryState.progress || 5,
        'Resuming course generation from previous session...',
        'resuming'
      );
      
      // Restore completion state
      completedTasks = recoveryState.completedTasks || 0;
      courseTokenUsage = recoveryState.courseTokenUsage || courseTokenUsage;
      
      // Wait a moment before continuing to show the resuming message
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Log the start of content generation
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_start',
      request_id: courseGenerationId,
      request_data: {
        course_title: course.courseTitle,
        course_id: courseId,
        topics_count: totalTopics,
        total_lessons: totalLessons,
        is_resumed: !!recoveryState
      }
    }]);
    
    onProgress?.(5, 'Creating course in LMS...', 'course_creation');
    
    // LMS course creation with resilience
    let lmsData = null;
    if (recoveryState?.lmsData) {
      lmsData = recoveryState.lmsData;
      console.log('Using existing LMS course data from recovery state:', lmsData);
    } else {
      // Try to create the course in LMS with retries
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const courseResponse = await createCourse(course, lmsCredentials, abortSignal);
          lmsData = { courseId: courseResponse.data.data };
          console.log('Created course with ID:', lmsData.courseId);
          
          // Store course data in Supabase for persistent storage
          try {
            await supabase.from('courses').insert({
              program_id: course.programId || null,
              course_title: course.courseTitle,
              course_description: course.courseDescription,
              wordpress_course_id: lmsData.courseId,
              status: 'in_progress'
            });
            console.log('Course data stored in Supabase');
          } catch (dbError) {
            console.error('Failed to store course data in Supabase:', dbError);
          }
          
          break;
        } catch (error) {
          console.error(`LMS course creation attempt ${attempt} failed:`, error);
          
          // Log the error
          await supabase.from('api_logs_74621').insert([{
            operation: 'lms_course_creation_error',
            request_id: courseGenerationId,
            error: error.message,
            request_data: {
              attempt: attempt,
              course_title: course.courseTitle
            }
          }]);
          
          if (attempt === 3) {
            throw new Error('Failed to create course in LMS after multiple attempts');
          }
          
          // Wait before retry
          const retryDelay = Math.pow(2, attempt) * 1000;
          console.log(`Retrying LMS course creation in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // Save initial/updated recovery state
    await saveRecoveryState(courseId, {
      lmsData,
      progress: 10,
      completedTasks,
      courseTokenUsage,
      timestamp: new Date().toISOString()
    });

    // Generate course context once
    let courseContext = recoveryState?.courseContext;
    if (!courseContext) {
      onProgress?.(10, 'Generating course context...', 'context_generation');
      
      const courseContextPrompt = `
        Course Title: ${course.courseTitle}
        Course Description: ${course.courseDescription}
        Generate a brief, concise context of the overall course based on the course title and description provided. 
        This context will be used as a high-level overview for subsequent lesson content generation.
      `;
      
      try {
        const contextResult = await callOpenAI(
          apiKey,
          courseContextPrompt,
          "You are a concise educational content summarizer.",
          false,
          3,
          abortSignal
        );
        
        courseContext = contextResult.content;
        
        // Add token usage
        if (contextResult.tokenUsage) {
          courseTokenUsage.prompt_tokens += contextResult.tokenUsage.prompt_tokens || 0;
          courseTokenUsage.completion_tokens += contextResult.tokenUsage.completion_tokens || 0;
          courseTokenUsage.total_tokens += contextResult.tokenUsage.total_tokens || 0;
        }
        
        // Update recovery state with course context
        await saveRecoveryState(courseId, {
          lmsData,
          courseContext,
          progress: 15,
          completedTasks,
          courseTokenUsage,
          timestamp: new Date().toISOString()
        });
      } catch (error) {
        console.error("Error generating course context:", error);
        
        // Log the error but continue with empty context as fallback
        await supabase.from('api_logs_74621').insert([{
          operation: 'course_context_generation_error',
          request_id: courseGenerationId,
          error: error.message
        }]);
        
        courseContext = `Course: ${course.courseTitle}. ${course.courseDescription}`;
      }
    }
    
    // Process topics and lessons with progress tracking
    let currentTopicIndex = 0;
    let currentLessonIndex = 0;
    
    if (recoveryState?.currentTopicIndex !== undefined) {
      currentTopicIndex = recoveryState.currentTopicIndex;
      currentLessonIndex = recoveryState.currentLessonIndex || 0;
    }
    
    // Loop through topics starting from where we left off
    for (let i = currentTopicIndex; i < (course.topics?.length || 0); i++) {
      const topic = course.topics[i];
      
      // Update progress for current topic
      onProgress?.(
        15 + ((i / totalTopics) * 40), // Progress from 15% to 55%
        `Processing topic ${i + 1} of ${totalTopics}: ${topic.topicTitle}`,
        'topic_processing',
        `Creating topic in LMS: ${topic.topicTitle}`,
        {
          currentTopic: topic.topicTitle,
          topicsCompleted: i,
          totalTopics: totalTopics,
          lessonsCompleted: completedTasks / 3, // Each lesson has 3 tasks
          totalLessons: totalLessons
        }
      );
      
      // Check for pause
      await checkPauseStatus?.();
      if (abortSignal?.aborted) {
        throw new Error('Request aborted by user');
      }
      
      // Create topic in LMS
      let topicId;
      if (recoveryState?.topics?.[i]?.topicId) {
        topicId = recoveryState.topics[i].topicId;
        console.log(`Using existing topic ID from recovery state: ${topicId}`);
      } else {
        try {
          const topicResponse = await createTopic(topic, lmsData.courseId, lmsCredentials, abortSignal);
          topicId = topicResponse.data.data;
          console.log(`Created topic with ID: ${topicId}`);
          
          // Update recovery state with topic ID
          const updatedRecoveryState = await loadRecoveryState(courseId);
          const topics = updatedRecoveryState?.topics || [];
          topics[i] = { ...topics[i], topicId };
          await saveRecoveryState(courseId, {
            ...updatedRecoveryState,
            topics,
            currentTopicIndex: i,
            currentLessonIndex: 0
          });
        } catch (error) {
          console.error(`Error creating topic ${topic.topicTitle}:`, error);
          
          // Log error and continue with next topic
          await supabase.from('api_logs_74621').insert([{
            operation: 'topic_creation_error',
            request_id: courseGenerationId,
            error: error.message,
            request_data: {
              topic_title: topic.topicTitle,
              topic_index: i
            }
          }]);
          
          continue;
        }
      }
      
      // Generate topic introduction if not already present
      let topicIntroduction = topic.topicIntroduction || recoveryState?.topics?.[i]?.topicIntroduction;
      if (!topicIntroduction) {
        try {
          const topicDetailsPrompt = `
            Course Title: ${course.courseTitle}
            Course Description: ${course.courseDescription}
            Topic Title: ${topic.topicTitle}
            Topic Learning Objective Description: ${topic.topicLearningObjectiveDescription}
            
            Please generate a detailed topicIntroduction and an immersiveMethodBrief. 
            The immersiveMethodBrief should describe a practical activity or project related to the topic 
            that helps learners apply the concepts.
          `;
          
          const topicDetailsResult = await callOpenAI(
            apiKey,
            topicDetailsPrompt,
            "You are an expert instructional designer.",
            false,
            3,
            abortSignal
          );
          
          topicIntroduction = topicDetailsResult.content;
          
          // Add token usage
          if (topicDetailsResult.tokenUsage) {
            courseTokenUsage.prompt_tokens += topicDetailsResult.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += topicDetailsResult.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += topicDetailsResult.tokenUsage.total_tokens || 0;
          }
          
          // Update recovery state with topic introduction
          const updatedRecoveryState = await loadRecoveryState(courseId);
          const topics = updatedRecoveryState?.topics || [];
          topics[i] = { ...topics[i], topicIntroduction };
          await saveRecoveryState(courseId, {
            ...updatedRecoveryState,
            topics
          });
        } catch (error) {
          console.error(`Error generating topic introduction for ${topic.topicTitle}:`, error);
          topicIntroduction = topic.topicLearningObjectiveDescription;
        }
      }
      
      // Start lesson index from where we left off if we're resuming the current topic
      const startLessonIndex = i === currentTopicIndex ? currentLessonIndex : 0;
      
      // Process lessons for this topic
      for (let j = startLessonIndex; j < (topic.lessons?.length || 0); j++) {
        const lesson = topic.lessons[j];
        
        // Update progress for current lesson
        onProgress?.(
          55 + ((completedTasks / totalTasks) * 45), // Progress from 55% to 100%
          `Generating content for lesson ${j + 1} of ${topic.lessons.length}: ${lesson.lessonTitle}`,
          'lesson_generation',
          `Generating lesson content: ${lesson.lessonTitle}`,
          {
            currentTopic: topic.topicTitle,
            currentLesson: lesson.lessonTitle,
            topicsCompleted: i,
            totalTopics: totalTopics,
            lessonsCompleted: completedTasks / 3, // Each lesson has 3 tasks
            totalLessons: totalLessons
          }
        );
        
        // Check for pause
        await checkPauseStatus?.();
        if (abortSignal?.aborted) {
          throw new Error('Request aborted by user');
        }
        
        try {
          // 1. Generate main lesson content
          onTaskUpdate?.(completedTasks, `Generating main content for: ${lesson.lessonTitle}`);
          
          // Check if we have a vector store for RAG
          const lessonVectorStoreId = vectorStoreAssignments[lesson.id];
          const topicVectorStoreId = vectorStoreAssignments[topic.id];
          const vectorStoreId = lessonVectorStoreId || topicVectorStoreId;
          
          let lessonContent;
          
          if (vectorStoreId) {
            // Use RAG with vector store
            try {
              const ragResult = await generateContentWithRAG(
                apiKey,
                vectorStoreId,
                lesson,
                courseContext,
                topicIntroduction
              );
              
              lessonContent = ragResult.content;
              
              // Estimate token usage for RAG (we don't get actual counts from the API)
              courseTokenUsage.prompt_tokens += Math.ceil(lesson.lessonDescription.length / 4);
              courseTokenUsage.completion_tokens += Math.ceil(lessonContent.length / 4);
              courseTokenUsage.total_tokens += Math.ceil((lesson.lessonDescription.length + lessonContent.length) / 4);
              
            } catch (ragError) {
              console.error(`Error using RAG for lesson ${lesson.lessonTitle}:`, ragError);
              
              // Fall back to standard content generation
              const lessonContentPrompt = buildLessonPrompt(lesson, topic, courseContext);
              const lessonContentResult = await callOpenAI(
                apiKey,
                lessonContentPrompt,
                "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content.",
                false,
                3,
                abortSignal
              );
              
              lessonContent = lessonContentResult.content;
              
              // Add token usage
              if (lessonContentResult.tokenUsage) {
                courseTokenUsage.prompt_tokens += lessonContentResult.tokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens += lessonContentResult.tokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens += lessonContentResult.tokenUsage.total_tokens || 0;
              }
            }
          } else {
            // Standard content generation without RAG
            const lessonContentPrompt = buildLessonPrompt(lesson, topic, courseContext);
            const lessonContentResult = await callOpenAI(
              apiKey,
              lessonContentPrompt,
              "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content.",
              false,
              3,
              abortSignal
            );
            
            lessonContent = lessonContentResult.content;
            
            // Add token usage
            if (lessonContentResult.tokenUsage) {
              courseTokenUsage.prompt_tokens += lessonContentResult.tokenUsage.prompt_tokens || 0;
              courseTokenUsage.completion_tokens += lessonContentResult.tokenUsage.completion_tokens || 0;
              courseTokenUsage.total_tokens += lessonContentResult.tokenUsage.total_tokens || 0;
            }
          }
          
          completedTasks++;
          
          // 2. Generate presentation slides
          onTaskUpdate?.(completedTasks, `Generating presentation slides for: ${lesson.lessonTitle}`);
          
          const slidesPrompt = `
            Based on the following lesson content, create compelling presentation slide titles and concise bullet points for each slide.
            Focus on key takeaways and visual representation. Structure it as:
            
            SLIDE 1: [Title]
            - [Bullet point 1]
            - [Bullet point 2]
            
            SLIDE 2: [Title]
            - [Bullet point 1]
            - [Bullet point 2]
            
            And so on. Create 8-12 slides that cover the main concepts.
            
            Lesson Content: ${lessonContent.substring(0, 3000)}...
          `;
          
          const slidesResult = await callOpenAI(
            apiKey,
            slidesPrompt,
            "You are an expert presentation designer.",
            false,
            3,
            abortSignal
          );
          
          const slideContent = slidesResult.content;
          
          // Add token usage
          if (slidesResult.tokenUsage) {
            courseTokenUsage.prompt_tokens += slidesResult.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += slidesResult.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += slidesResult.tokenUsage.total_tokens || 0;
          }
          
          completedTasks++;
          
          // 3. Generate voice-over script
          onTaskUpdate?.(completedTasks, `Generating voice-over script for: ${lesson.lessonTitle}`);
          
          const voiceOverPrompt = `
            Based on the following presentation slides and the lesson content, write a detailed voice-over script for a video lesson.
            The script should be engaging, conversational, and expand on the bullet points in the slides to provide a comprehensive explanation.
            
            Presentation Slides:
            ${slideContent}
            
            Format the voice-over script with timing indicators for each slide, like:
            
            [SLIDE 1 - 00:00-00:45]
            "Welcome to today's lesson on... [script continues]"
            
            [SLIDE 2 - 00:45-01:30]
            "Now let's examine... [script continues]"
          `;
          
          const voiceOverResult = await callOpenAI(
            apiKey,
            voiceOverPrompt,
            "You are an expert educational video scriptwriter.",
            false,
            3,
            abortSignal
          );
          
          const voiceOverScript = voiceOverResult.content;
          
          // Add token usage
          if (voiceOverResult.tokenUsage) {
            courseTokenUsage.prompt_tokens += voiceOverResult.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += voiceOverResult.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += voiceOverResult.tokenUsage.total_tokens || 0;
          }
          
          completedTasks++;
          
          // Create the lesson in the LMS
          const fullLessonContent = {
            mainContent: lessonContent,
            slides: slideContent,
            voiceOver: voiceOverScript
          };
          
          await createLesson(lesson, topicId, lmsCredentials, fullLessonContent, abortSignal);
          console.log(`Created lesson with full content: ${lesson.lessonTitle}`);
          
          // Update recovery state with current progress
          await saveRecoveryState(courseId, {
            lmsData,
            courseContext,
            progress: 55 + ((completedTasks / totalTasks) * 45),
            completedTasks,
            courseTokenUsage,
            currentTopicIndex: i,
            currentLessonIndex: j + 1, // Next lesson
            timestamp: new Date().toISOString()
          });
          
        } catch (error) {
          console.error(`Error generating content for lesson ${lesson.lessonTitle}:`, error);
          
          // Log error but continue with next lesson
          await supabase.from('api_logs_74621').insert([{
            operation: 'lesson_generation_error',
            request_id: courseGenerationId,
            error: error.message,
            request_data: {
              lesson_title: lesson.lessonTitle,
              topic_title: topic.topicTitle,
              topic_index: i,
              lesson_index: j
            }
          }]);
          
          // Update recovery state to resume from this lesson
          await saveRecoveryState(courseId, {
            lmsData,
            courseContext,
            progress: 55 + ((completedTasks / totalTasks) * 45),
            completedTasks,
            courseTokenUsage,
            currentTopicIndex: i,
            currentLessonIndex: j, // Current lesson (for retry)
            timestamp: new Date().toISOString(),
            error: error.message
          });
          
          if (abortSignal?.aborted) {
            throw new Error('Request aborted by user');
          }
        }
      }
    }

    // Update the Supabase course record with token usage at the end
    try {
      await supabase.from('courses')
        .update({
          input_tokens: courseTokenUsage.prompt_tokens,
          output_tokens: courseTokenUsage.completion_tokens,
          total_tokens: courseTokenUsage.total_tokens,
          status: 'completed',
          updated_at: new Date().toISOString()
        })
        .eq('wordpress_course_id', lmsData.courseId);
      
      console.log('Course token usage updated in Supabase');
      
      // Clear recovery state after successful completion
      await clearRecoveryState(courseId);
    } catch (updateError) {
      console.error('Failed to update course token usage in Supabase:', updateError);
    }

    return {
      success: true,
      courseId: lmsData?.courseId,
      tokenUsage: courseTokenUsage
    };
  } catch (error) {
    console.error('Error generating course content:', error);
    throw error;
  }
};

// Helper function to build lesson prompt with all context
const buildLessonPrompt = (lesson, topic, courseContext) => {
  // Start with base context
  let lessonContentPrompt = `
    Course Context: ${courseContext}
    Topic Title: ${topic.topicTitle}
    Topic Introduction: ${topic.topicIntroduction || topic.topicLearningObjectiveDescription}
    Lesson Title: ${lesson.lessonTitle}
    Lesson Description: ${lesson.lessonDescription}
  `;
  
  // Add topic additional context if available
  if (topic.additionalContext && topic.additionalContext.trim()) {
    lessonContentPrompt += `
      TOPIC ADDITIONAL CONTEXT (Research/Statistics/Latest Findings):
      ${topic.additionalContext}
      
      Please integrate this additional context throughout the lesson content where relevant.
    `;
  }
  
  // Add lesson-specific additional context if available
  if (lesson.additionalContext && lesson.additionalContext.trim()) {
    lessonContentPrompt += `
      LESSON-SPECIFIC ADDITIONAL CONTEXT:
      ${lesson.additionalContext}
      
      Please incorporate this lesson-specific context into the content.
    `;
  }
  
  // Add generation instructions
  lessonContentPrompt += `
    Generate comprehensive lesson content that is approximately 1500-2000 words. Include:
    
    1. A structured lesson with clear sections and headings
    2. Key concepts explained with examples
    3. A relevant case study that illustrates the concepts
    4. A FAQ section addressing common questions
    5. A section on common misconceptions about the topic
    6. Recommended additional readings or resources
    
    The content should be educational, engaging, and aligned with the course objectives.
  `;
  
  // Add special instructions for additional context
  if ((topic.additionalContext && topic.additionalContext.trim()) || 
      (lesson.additionalContext && lesson.additionalContext.trim())) {
    lessonContentPrompt += `
      IMPORTANT: Make sure to weave in the provided additional context naturally throughout the lesson content,
      using it to enhance explanations, provide current examples, support key points with statistics or research,
      and add credibility to the content.
    `;
  }
  
  return lessonContentPrompt;
};

// Function to generate content using RAG with vector store
const generateContentWithRAG = async (apiKey, vectorStoreId, lessonData, courseContext, topicContext) => {
  try {
    const systemPrompt = `
      Focus on actionable strategies that readers can implement immediately. Address emotional triggers.
      Emphasize benefits. Include common mistakes and how to avoid them. Use case studies or examples
      from real businesses to make content relatable. Provide templates and actionable checklists if applicable.
      Keep the text as action focused as possible. Quote recent research on this topic if any.
      Keep the tone motivating and supportive. Sound like Malcolm Gladwell or Daniel Pink for this content.
      
      The full content for this section will include the below:
      readingContent: The main text content (~1500-2000 words) in HTML format.
      
      Generate the content for the section using the context below in HTML formatting.
      
      Context:
      Course: ${courseContext}
      Topic: ${topicContext}
      
      Use the attached files from vector store library as reference material and use it as relevant.
    `;
    
    const userPrompt = `
      TASK
      Develop a practical, step-by-step section on section title "${lessonData.lessonTitle}"
      with section description as "${lessonData.lessonDescription}" for the target audience from context.
      
      Generate the readingContent: The main text content (~1500-2000 words). Generate in HTML format.
    `;
    
    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      {
        model: "gpt-4.1-mini-2025-04-14",
        tools: [
          {
            type: "file_search",
            vector_store_ids: [vectorStoreId],
            max_num_results: 3
          }
        ],
        input: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_output_tokens: 2400
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return { content: response.data.content };
  } catch (error) {
    console.error('Error generating content with RAG:', error);
    throw error;
  }
};

// Generate topic and lesson structure for a course
export const generateCourseTopicsAndLessons = async (course, programContext, summaryProgramContext, mustHaveAspects, designConsiderations, apiKey) => {
  try {
    console.log(`Generating detailed topics and lessons for course: ${course.courseTitle}`);
    
    const topicGenerationPrompt = `
      GENERATE DETAILED COURSE OUTLINE BASED ON CONTEXT:
      
      Act as an expert curriculum architect. You are designing one course within a larger MicroMasters program.
      Your task is to create the complete, detailed curriculum map for this single course.
      
      ### CONTEXT ###
      Overall Context: ${summaryProgramContext}
      - Current Course being designed: ${course.courseTitle}
      - Course's Role in Program, Learning objectives and Course description: ${course.courseDescription}
      Must Have aspects in the course: ${mustHaveAspects}
      Other Design Considerations: ${designConsiderations}
      
      ### TASK ###
      Given the above context, Generate the complete curriculum map for ONLY the course specified above.
      Your output MUST be a single raw JSON object.
      
      CRITICAL REQUIREMENTS:
      - Generate exactly 5-6 comprehensive topics for this course
      - Each topic MUST have exactly 4-5 detailed lessons
      - Each lesson description must be 150-200 words explaining learning objectives, activities, and outcomes
      - Topics must build progressively and logically
      - Content must be practical and industry-relevant
      - Each topic and lesson must have unique, relevant titles and descriptions
      - No generic placeholder content - everything must be specific to this course
      
      The JSON object must have this exact structure:
      {"topics": [
        {
          "id": "topic-new-1",
          "topicTitle": "Comprehensive topic title with clear learning focus",
          "topicLearningObjectiveDescription": "Detailed 2-3 sentence paragraph explaining what students will master in this topic, including specific skills and knowledge outcomes",
          "additionalContext": "",
          "lessons": [
            {
              "id": "lesson-new-1-1",
              "lessonTitle": "Specific and actionable lesson title",
              "lessonDescription": "Comprehensive 150-200 word description covering: (1) specific learning objectives for this lesson, (2) key concepts and skills students will learn, (3) practical activities and exercises they will complete, (4) real-world applications and examples, (5) how this lesson contributes to the overall topic mastery, and (6) expected outcomes and deliverables. Be specific about what students will be able to do after completing this lesson.",
              "additionalContext": ""
            }
          ]
        }
      ]}
      
      Generate exactly 5-6 topics with 4-5 lessons each. Each lesson description must be detailed and comprehensive (150-200 words).
    `;
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are an expert instructional designer specializing in professional education. Create detailed, practical course content with comprehensive lesson descriptions. Each lesson must be unique, specific, and tailored to the course context."
          },
          {
            role: "user",
            content: topicGenerationPrompt
          }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );
    
    const content = response.data.choices[0].message.content;
    
    // Extract JSON from response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonString);
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating topics and lessons:", error);
    return { topics: [] };
  }
};
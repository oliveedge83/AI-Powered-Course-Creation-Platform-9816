import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  'https://ogeeglwxiqbephscoebs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9nZWVnbHd4aXFiZXBoc2NvZWJzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI3Nzg1MDUsImV4cCI6MjA2ODM1NDUwNX0.vIbLQeuQm_HU1LRSr1mPDxGZPjgHIwQ0WBhPU3Bq7Lg'
);

// Create API logs table for monitoring
const createApiLogsTable = async () => {
  try {
    await supabase.from('api_logs_74621').select('*').limit(1);
    console.log('API logs table exists');
    
    // Also check for the detailed token usage table
    try {
      await supabase.from('token_usage_74621').select('*').limit(1);
      console.log('Token usage table exists');
    } catch (error) {
      console.log('Creating token usage table');
      // Create token usage tracking table
      const { error: tokenError } = await supabase.rpc('create_token_usage_table', {
        table_name: 'token_usage_74621'
      });
      if (tokenError) {
        console.error('Failed to create token usage table:', tokenError);
      }
    }
    
  } catch (error) {
    console.log('Creating API logs table');
    // Table doesn't exist, create it
    const { error: createError } = await supabase.rpc('create_api_logs_table', {
      table_name: 'api_logs_74621'
    });
    if (createError) {
      console.error('Failed to create API logs table:', createError);
    }
  }
};

// Create recovery state table for resumable operations
const createRecoveryStateTable = async () => {
  try {
    await supabase.from('recovery_state_74621').select('*').limit(1);
    console.log('Recovery state table exists');
  } catch (error) {
    console.log('Creating recovery state table');
    // Table doesn't exist, create it
    const { error: createError } = await supabase.rpc('create_recovery_state', {
      table_name: 'recovery_state_74621'
    });
    if (createError) {
      console.error('Failed to create recovery state table:', createError);
    }
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
      .upsert({
        course_id: courseId,
        state_data: state,
        updated_at: new Date().toISOString()
      }, { onConflict: 'course_id' });
    
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

// Combined function to generate both slides and voice-over in one API call
const generateSlidesAndVoiceOver = async (apiKey, lessonContent, abortSignal = null) => {
  try {
    console.log("Generating slides and voice-over in a single API call");
    
    const combinedPrompt = `
      Based on the following lesson content, please generate:
      
      1. SLIDES: Create 8-12 presentation slide titles and bullet points formatted as:
         SLIDE 1: [Title]
         - [Bullet point 1]
         - [Bullet point 2]
         
      2. VOICE-OVER: Create a detailed voice-over script for each slide with timing indicators:
         [SLIDE 1 - 00:00-00:45]
         "Welcome to today's lesson on... [script continues]"
         
      Lesson Content: ${lessonContent.substring(0, 3000)}...
    `;
    
    const result = await callOpenAI(
      apiKey, 
      combinedPrompt, 
      "You are an expert educational content creator specializing in creating presentation slides and voice-over scripts that work together seamlessly.",
      true, // Use GPT-4 for better quality
      3,
      abortSignal
    );
    
    const combinedContent = result.content;
    
    // Extract slides and voice-over from combined response
    const slidesSectionMatch = combinedContent.match(/SLIDES:([\s\S]*?)VOICE-OVER:/i);
    const voiceOverSectionMatch = combinedContent.match(/VOICE-OVER:([\s\S]*)/i);
    
    let slideContent = "";
    let voiceOverScript = "";
    
    if (slidesSectionMatch && slidesSectionMatch[1]) {
      slideContent = slidesSectionMatch[1].trim();
    } else {
      // Fallback parsing if the format isn't exactly as expected
      const slideMatches = combinedContent.match(/SLIDE \d+:[\s\S]*?(?=SLIDE \d+:|VOICE-OVER:|$)/gi);
      if (slideMatches) {
        slideContent = slideMatches.join("\n\n");
      }
    }
    
    if (voiceOverSectionMatch && voiceOverSectionMatch[1]) {
      voiceOverScript = voiceOverSectionMatch[1].trim();
    } else {
      // Fallback parsing for voice-over
      const voiceOverMatches = combinedContent.match(/\[SLIDE \d+[\s\S]*?(?=\[SLIDE \d+|$)/gi);
      if (voiceOverMatches) {
        voiceOverScript = voiceOverMatches.join("\n\n");
      }
    }
    
    // If we still couldn't parse properly, make a separate call for the missing content
    if (!slideContent) {
      console.log("Slide content parsing failed, making separate API call");
      const slideResult = await generateSlidesOnly(apiKey, lessonContent, abortSignal);
      slideContent = slideResult.content;
    }
    
    if (!voiceOverScript) {
      console.log("Voice-over script parsing failed, making separate API call");
      const voiceOverResult = await generateVoiceOverOnly(apiKey, slideContent, lessonContent, abortSignal);
      voiceOverScript = voiceOverResult.content;
    }
    
    return { 
      slideContent, 
      voiceOverScript,
      tokenUsage: result.tokenUsage
    };
  } catch (error) {
    if (error.message === 'Request aborted by user or timed out') {
      throw error;
    }
    
    console.error("Error generating slides and voice-over:", error);
    
    // Attempt to generate them separately as a fallback
    console.log("Falling back to separate generation");
    const slideResult = await generateSlidesOnly(apiKey, lessonContent, abortSignal);
    const voiceOverResult = await generateVoiceOverOnly(apiKey, slideResult.content, lessonContent, abortSignal);
    
    return { 
      slideContent: slideResult.content, 
      voiceOverScript: voiceOverResult.content,
      tokenUsage: {
        prompt_tokens: (slideResult.tokenUsage?.prompt_tokens || 0) + (voiceOverResult.tokenUsage?.prompt_tokens || 0),
        completion_tokens: (slideResult.tokenUsage?.completion_tokens || 0) + (voiceOverResult.tokenUsage?.completion_tokens || 0),
        total_tokens: (slideResult.tokenUsage?.total_tokens || 0) + (voiceOverResult.tokenUsage?.total_tokens || 0)
      }
    };
  }
};

// Fallback function to generate just slides
const generateSlidesOnly = async (apiKey, lessonContent, abortSignal = null) => {
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
  
  return await callOpenAI(
    apiKey, 
    slidesPrompt, 
    "You are an expert presentation designer.", 
    false, 
    3, 
    abortSignal
  );
};

// Fallback function to generate just voice-over
const generateVoiceOverOnly = async (apiKey, slideContent, lessonContent, abortSignal = null) => {
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
  
  return await callOpenAI(
    apiKey, 
    voiceOverPrompt, 
    "You are an expert educational video scriptwriter.", 
    false, 
    3, 
    abortSignal
  );
};

// Generate content using RAG with vector store
const generateLessonContentWithRAG = async (apiKey, vectorStoreId, lessonData, courseContext, topicContext, abortSignal = null) => {
  try {
    console.log(`Generating content using RAG with vector store: ${vectorStoreId}`);
    const requestId = `rag_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const startTime = new Date();
    
    const systemPrompt = `Focus on actionable strategies that readers can implement immediately. 
      Address emotional triggers. Emphasize benefits. Include common mistakes and how to avoid them. 
      Use case studies or examples from real businesses to make content relatable. 
      Provide templates and actionable checklists if applicable. Keep the text as action focused as possible. 
      Quote recent research on this topic if any. Keep the tone motivating and supportive. 
      Sound like Malcolm Gladwell or Daniel Pink for this content.

      The full content for this section will include the below:
      readingContent: The main text content (~1500-2000 words) in HTML format.

      Generate the content for the section using the context below in HTML formatting.

      Context:
      Course: ${courseContext}
      Topic: ${topicContext}
      Use the attached files from vector store library as reference material and use it as relevant.`;

    const userPrompt = `TASK
      Develop a practical, step-by-step section on section title "${lessonData.lessonTitle}" 
      with section description as "${lessonData.lessonDescription}" for the target audience from context. 
      Generate the readingContent: The main text content (~1500-2000 words). Generate in HTML format.`;
    
    // Log the RAG API call attempt
    try {
      await supabase.from('api_logs_74621').insert([{
        operation: 'rag_content_generation',
        request_id: requestId,
        request_data: {
          vector_store_id: vectorStoreId,
          lesson_title: lessonData.lessonTitle,
          timestamp: new Date().toISOString()
        }
      }]);
    } catch (logError) {
      console.error("Failed to log RAG API call:", logError);
    }
    
    // Implement retry logic for RAG API calls
    let lastError;
    let tokenUsage = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`RAG API call attempt ${attempt}/3`);
        
        // Calculate adaptive timeout
        const baseTimeout = 90000; // 90 seconds for RAG calls which tend to be more complex
        const timeout = Math.min(180000, baseTimeout * attempt); // Increase timeout with each retry
        
        const callStartTime = new Date();
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
              {
                role: "system",
                content: systemPrompt
              },
              {
                role: "user",
                content: userPrompt
              }
            ],
            max_output_tokens: 2400
          },
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: timeout,
            signal: abortSignal
          }
        );
        
        const endTime = new Date();
        const duration = (endTime - callStartTime) / 1000;
        const totalDuration = (endTime - startTime) / 1000;
        console.log(`RAG API call completed in ${duration} seconds (total with retries: ${totalDuration}s)`);
        
        // Extract approximate token usage (responses API doesn't provide exact counts)
        // Estimate based on input/output length
        const inputLength = (systemPrompt.length + userPrompt.length);
        const outputLength = response.data.content[0].text.length;
        
        // Very rough token estimation (characters / 4)
        tokenUsage = {
          prompt_tokens: Math.ceil(inputLength / 4),
          completion_tokens: Math.ceil(outputLength / 4),
          total_tokens: Math.ceil((inputLength + outputLength) / 4)
        };
        
        // Log successful RAG response
        try {
          await supabase.from('api_logs_74621').insert([{
            operation: 'rag_content_success',
            request_id: requestId,
            request_data: {
              vector_store_id: vectorStoreId,
              lesson_title: lessonData.lessonTitle,
              duration_seconds: duration,
              total_duration_seconds: totalDuration,
              attempts: attempt
            },
            response_data: {
              estimated_tokens: tokenUsage.total_tokens,
              content_length: outputLength
            }
          }]);
          
          // Log token usage estimate
          await supabase.from('token_usage_74621').insert([{
            model: "gpt-4.1-mini-2025-04-14",
            prompt_tokens: tokenUsage.prompt_tokens,
            completion_tokens: tokenUsage.completion_tokens,
            total_tokens: tokenUsage.total_tokens,
            operation_type: 'rag_generation',
            request_id: requestId,
            duration_seconds: duration,
            is_estimate: true
          }]);
        } catch (logError) {
          console.error("Failed to log RAG API success:", logError);
        }
        
        return {
          content: response.data.content[0].text,
          tokenUsage
        };
        
      } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
          console.log('RAG request aborted by user or timed out');
          throw new Error('Request aborted by user or timed out');
        }
        
        lastError = error;
        console.error(`RAG API attempt ${attempt} failed:`, error.message);
        
        // Handle rate limiting specifically
        let retryDelay = Math.pow(2, attempt) * 1000; // Exponential backoff
        
        if (error.response?.status === 429) {
          console.log('RAG API rate limit reached');
          
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
          
          console.log(`RAG API rate limited. Waiting ${retryDelay/1000} seconds before retry...`);
        }
        
        // Log the RAG error
        try {
          await supabase.from('api_logs_74621').insert([{
            operation: 'rag_content_error',
            request_id: requestId,
            error: error.message,
            request_data: {
              vector_store_id: vectorStoreId,
              lesson_title: lessonData.lessonTitle,
              attempt: attempt,
              retry_delay: retryDelay / 1000
            },
            response_data: error.response ? {
              status: error.response.status,
              data: error.response.data
            } : null
          }]);
        } catch (logError) {
          console.error("Failed to log RAG API error:", logError);
        }
        
        if (attempt < 3) {
          console.log(`Retrying RAG API in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }
    
    // If all RAG attempts failed, fallback to regular generation
    console.log("All RAG attempts failed. Falling back to regular content generation");
    return await generateLessonContentWithoutRAG(apiKey, lessonData, courseContext, topicContext, abortSignal);
    
  } catch (error) {
    if (error.message === 'Request aborted by user or timed out') {
      throw error;
    }
    
    console.error("Error generating content with RAG:", error);
    
    // Fallback to regular generation
    console.log("Falling back to regular content generation");
    return await generateLessonContentWithoutRAG(apiKey, lessonData, courseContext, topicContext, abortSignal);
  }
};

// Regular lesson content generation without RAG
const generateLessonContentWithoutRAG = async (apiKey, lessonData, courseContext, topicContext, abortSignal = null) => {
  const lessonContentPrompt = `
    Course Context: ${courseContext}
    Topic: ${topicContext}
    Lesson Title: ${lessonData.lessonTitle}
    Lesson Description: ${lessonData.lessonDescription}
    
    Generate comprehensive lesson content that is approximately 1500-2000 words. Include:
    1. A structured lesson with clear sections and headings
    2. Key concepts explained with examples
    3. A relevant case study that illustrates the concepts
    4. A FAQ section addressing common questions
    5. A section on common misconceptions about the topic
    6. Recommended additional readings or resources
    
    The content should be educational, engaging, and aligned with the course objectives.
  `;
  
  return await callOpenAI(
    apiKey,
    lessonContentPrompt,
    "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content.",
    false,
    3,
    abortSignal
  );
};

// Enhanced course content generation with progress tracking, RAG support, and resilience
export const generateCourseContent = async (course, lmsCredentials, apiKey, progressCallbacks = {}, vectorStoreAssignments = {}) => {
  const { 
    onProgress, 
    onTaskUpdate, 
    checkPauseStatus, 
    getAbortSignal 
  } = progressCallbacks;
  
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
    
    // Process each topic
    let topicProcessingState = recoveryState?.topicProcessingState || {};
    
    for (const [topicIndex, topic] of course.topics.entries()) {
      // Skip already completed topics if resuming
      if (topicProcessingState[topic.id]?.completed) {
        console.log(`Skipping already completed topic: ${topic.topicTitle}`);
        continue;
      }
      
      try {
        await checkPauseStatus?.();
        
        onTaskUpdate?.(
          completedTasks,
          `Creating topic: ${topic.topicTitle}`,
          {
            currentTopic: topic.topicTitle,
            topicsCompleted: topicIndex,
            totalTopics: course.topics.length
          }
        );
        
        // Create topic in LMS with resilience
        let topicId = topicProcessingState[topic.id]?.topicId;
        
        if (!topicId) {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const topicResponse = await createTopic(topic, lmsData.courseId, lmsCredentials, abortSignal);
              topicId = topicResponse.data.data;
              console.log('Created topic with ID:', topicId, 'Title:', topic.topicTitle);
              
              // Initialize or update topic state
              topicProcessingState[topic.id] = {
                ...topicProcessingState[topic.id],
                topicId,
                lessonsProcessed: topicProcessingState[topic.id]?.lessonsProcessed || {}
              };
              
              // Update recovery state
              await saveRecoveryState(courseId, {
                lmsData,
                courseContext,
                topicProcessingState,
                progress: 15 + (topicIndex / course.topics.length) * 10,
                completedTasks,
                courseTokenUsage,
                timestamp: new Date().toISOString()
              });
              
              break;
            } catch (error) {
              console.error(`LMS topic creation attempt ${attempt} failed:`, error);
              
              // Log the error
              await supabase.from('api_logs_74621').insert([{
                operation: 'lms_topic_creation_error',
                request_id: courseGenerationId,
                error: error.message,
                request_data: {
                  attempt: attempt,
                  topic_title: topic.topicTitle
                }
              }]);
              
              if (attempt === 3) {
                throw new Error(`Failed to create topic "${topic.topicTitle}" in LMS after multiple attempts`);
              }
              
              // Wait before retry
              const retryDelay = Math.pow(2, attempt) * 1000;
              console.log(`Retrying LMS topic creation in ${retryDelay/1000} seconds...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
          }
        }
        
        // Check if this topic has a vector store assigned
        const topicVectorStoreId = vectorStoreAssignments[topic.id];
        
        // Process each lesson in the topic
        for (const [lessonIndex, lesson] of topic.lessons.entries()) {
          // Skip already completed lessons if resuming
          if (topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]?.completed) {
            console.log(`Skipping already completed lesson: ${lesson.lessonTitle}`);
            continue;
          }
          
          try {
            await checkPauseStatus?.();
            
            console.log(`Generating content for lesson: ${lesson.lessonTitle}`);
            
            const lessonNumber = course.topics.slice(0, topicIndex).reduce((total, t) => total + t.lessons.length, 0) + lessonIndex + 1;
            
            onTaskUpdate?.(
              completedTasks,
              `Generating lesson content: ${lesson.lessonTitle}`,
              {
                currentTopic: topic.topicTitle,
                currentLesson: lesson.lessonTitle,
                topicsCompleted: topicIndex,
                totalTopics: course.topics.length,
                lessonsCompleted: lessonNumber - 1,
                totalLessons: totalLessons
              }
            );
            
            // Log lesson generation start
            await supabase.from('api_logs_74621').insert([{
              operation: 'lesson_generation_start',
              request_id: courseGenerationId,
              request_data: {
                topic_title: topic.topicTitle,
                lesson_title: lesson.lessonTitle,
                lesson_id: lesson.id
              }
            }]);
            
            // Check if this lesson has a vector store assigned (overrides topic-level assignment)
            const lessonVectorStoreId = vectorStoreAssignments[lesson.id];
            const effectiveVectorStoreId = lessonVectorStoreId || topicVectorStoreId;
            
            let lessonContent;
            let lessonTokenUsage = {};
            
            // Check if we already have generated content from a previous attempt
            if (topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]?.content) {
              console.log(`Using previously generated content for lesson: ${lesson.lessonTitle}`);
              lessonContent = topicProcessingState[topic.id].lessonsProcessed[lesson.id].content;
              lessonTokenUsage = topicProcessingState[topic.id].lessonsProcessed[lesson.id].tokenUsage || {};
            } else {
              if (effectiveVectorStoreId) {
                // Generate content using RAG
                console.log(`Using RAG with vector store ${effectiveVectorStoreId} for lesson: ${lesson.lessonTitle}`);
                const result = await generateLessonContentWithRAG(
                  apiKey,
                  effectiveVectorStoreId,
                  lesson,
                  courseContext,
                  topic.topicLearningObjectiveDescription,
                  abortSignal
                );
                
                lessonContent = result.content;
                lessonTokenUsage = result.tokenUsage || {};
              } else {
                // Generate content without RAG, using standard approach
                console.log(`Using standard content generation for lesson: ${lesson.lessonTitle}`);
                
                // Enhanced lesson content prompt with additional context
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
                    TOPIC ADDITIONAL CONTEXT (Research/Statistics/Latest Findings): ${topic.additionalContext}
                    Please integrate this additional context throughout the lesson content where relevant.
                  `;
                }
                
                // Add lesson-specific additional context if available
                if (lesson.additionalContext && lesson.additionalContext.trim()) {
                  lessonContentPrompt += `
                    LESSON-SPECIFIC ADDITIONAL CONTEXT: ${lesson.additionalContext}
                    Please incorporate this lesson-specific context into the content.
                  `;
                }
                
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
                
                // Generate main lesson content
                const result = await callOpenAI(
                  apiKey,
                  lessonContentPrompt,
                  "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content.",
                  false,
                  3,
                  abortSignal
                );
                
                lessonContent = result.content;
                lessonTokenUsage = result.tokenUsage || {};
              }
              
              // Add token usage to course total
              courseTokenUsage.prompt_tokens += lessonTokenUsage.prompt_tokens || 0;
              courseTokenUsage.completion_tokens += lessonTokenUsage.completion_tokens || 0;
              courseTokenUsage.total_tokens += lessonTokenUsage.total_tokens || 0;
              
              // Save progress with the lesson content
              topicProcessingState[topic.id].lessonsProcessed[lesson.id] = {
                ...topicProcessingState[topic.id].lessonsProcessed[lesson.id],
                content: lessonContent,
                tokenUsage: lessonTokenUsage,
                contentGenerated: true
              };
              
              await saveRecoveryState(courseId, {
                lmsData,
                courseContext,
                topicProcessingState,
                progress: Math.max(20, Math.min(60, (completedTasks / totalTasks) * 100)),
                completedTasks,
                courseTokenUsage,
                timestamp: new Date().toISOString()
              });
            }
            
            console.log("Main lesson content generated successfully.");
            completedTasks++;
            
            await checkPauseStatus?.();
            
            // Generate slides and voice-over scripts
            onTaskUpdate?.(
              completedTasks,
              `Creating presentation slides for: ${lesson.lessonTitle}`,
              {
                currentTopic: topic.topicTitle,
                currentLesson: lesson.lessonTitle,
                topicsCompleted: topicIndex,
                totalTopics: course.topics.length,
                lessonsCompleted: lessonNumber - 1,
                totalLessons: totalLessons
              }
            );
            
            let slideContent = "";
            let voiceOverScript = "";
            let mediaTokenUsage = {};
            
            // Check if we already have generated slides and voice-over from a previous attempt
            if (
              topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]?.slideContent &&
              topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]?.voiceOverScript
            ) {
              console.log(`Using previously generated slides and voice-over for lesson: ${lesson.lessonTitle}`);
              slideContent = topicProcessingState[topic.id].lessonsProcessed[lesson.id].slideContent;
              voiceOverScript = topicProcessingState[topic.id].lessonsProcessed[lesson.id].voiceOverScript;
              mediaTokenUsage = topicProcessingState[topic.id].lessonsProcessed[lesson.id].mediaTokenUsage || {};
            } else {
              console.log("Starting slides and voice-over generation...");
              
              try {
                // Generate both slides and voice-over in one call
                const mediaContent = await generateSlidesAndVoiceOver(apiKey, lessonContent, abortSignal);
                slideContent = mediaContent.slideContent;
                voiceOverScript = mediaContent.voiceOverScript;
                mediaTokenUsage = mediaContent.tokenUsage || {};
                
                console.log("Slides and voice-over generated successfully.");
                
                // Add token usage to course total
                courseTokenUsage.prompt_tokens += mediaTokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens += mediaTokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens += mediaTokenUsage.total_tokens || 0;
                
                // Save progress with the slides and voice-over
                topicProcessingState[topic.id].lessonsProcessed[lesson.id] = {
                  ...topicProcessingState[topic.id].lessonsProcessed[lesson.id],
                  slideContent,
                  voiceOverScript,
                  mediaTokenUsage,
                  mediaGenerated: true
                };
                
                await saveRecoveryState(courseId, {
                  lmsData,
                  courseContext,
                  topicProcessingState,
                  progress: Math.max(20, Math.min(80, (completedTasks / totalTasks) * 100)),
                  completedTasks: completedTasks + 2,
                  courseTokenUsage,
                  timestamp: new Date().toISOString()
                });
                
                completedTasks += 2; // Both slides and voice-over completed
              } catch (mediaError) {
                if (mediaError.message === 'Request aborted by user or timed out') {
                  throw mediaError;
                }
                
                console.error("Error generating slides and voice-over:", mediaError);
                
                // Log the error
                await supabase.from('api_logs_74621').insert([{
                  operation: 'media_generation_error',
                  request_id: courseGenerationId,
                  error: mediaError.message,
                  request_data: {
                    lesson_title: lesson.lessonTitle,
                    lesson_id: lesson.id
                  }
                }]);
                
                // Provide fallback content
                slideContent = "Slide generation failed. Please try again.";
                voiceOverScript = "Voice-over generation failed. Please try again.";
                
                // Save progress with the fallback content
                topicProcessingState[topic.id].lessonsProcessed[lesson.id] = {
                  ...topicProcessingState[topic.id].lessonsProcessed[lesson.id],
                  slideContent,
                  voiceOverScript,
                  mediaGenerationFailed: true
                };
                
                await saveRecoveryState(courseId, {
                  lmsData,
                  courseContext,
                  topicProcessingState,
                  progress: Math.max(20, Math.min(80, (completedTasks / totalTasks) * 100)),
                  completedTasks: completedTasks + 2,
                  courseTokenUsage,
                  timestamp: new Date().toISOString()
                });
                
                completedTasks += 2; // Mark as completed even with fallback
              }
            }
            
            await checkPauseStatus?.();
            
            onTaskUpdate?.(
              completedTasks,
              `Uploading lesson to LMS: ${lesson.lessonTitle}`,
              {
                currentTopic: topic.topicTitle,
                currentLesson: lesson.lessonTitle,
                topicsCompleted: topicIndex,
                totalTopics: course.topics.length,
                lessonsCompleted: lessonNumber,
                totalLessons: totalLessons
              }
            );
            
            // Create the full lesson content package
            const fullLessonContent = {
              mainContent: lessonContent,
              slides: slideContent,
              voiceOver: voiceOverScript
            };
            
            // Create the lesson in the LMS with resilience
            let lessonCreated = topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]?.lmsCreated;
            
            if (!lessonCreated) {
              for (let attempt = 1; attempt <= 5; attempt++) {
                try {
                  // Create the lesson in the LMS
                  await createLesson(lesson, topicId, lmsCredentials, fullLessonContent, abortSignal);
                  console.log('Created lesson with full content:', lesson.lessonTitle);
                  
                  // Mark lesson as completed
                  topicProcessingState[topic.id].lessonsProcessed[lesson.id] = {
                    ...topicProcessingState[topic.id].lessonsProcessed[lesson.id],
                    lmsCreated: true,
                    completed: true
                  };
                  
                  await saveRecoveryState(courseId, {
                    lmsData,
                    courseContext,
                    topicProcessingState,
                    progress: Math.max(20, Math.min(90, (completedTasks / totalTasks) * 100)),
                    completedTasks,
                    courseTokenUsage,
                    timestamp: new Date().toISOString()
                  });
                  
                  break;
                } catch (lessonUploadError) {
                  console.error(`LMS lesson creation attempt ${attempt} failed:`, lessonUploadError);
                  
                  // Log the error
                  await supabase.from('api_logs_74621').insert([{
                    operation: 'lms_lesson_creation_error',
                    request_id: courseGenerationId,
                    error: lessonUploadError.message,
                    request_data: {
                      attempt: attempt,
                      lesson_title: lesson.lessonTitle,
                      lesson_id: lesson.id
                    }
                  }]);
                  
                  if (attempt === 5) {
                    throw new Error(`Failed to create lesson "${lesson.lessonTitle}" in LMS after multiple attempts`);
                  }
                  
                  // Use increasing delay for retries
                  const retryDelay = Math.pow(2, attempt) * 1000;
                  console.log(`Retrying LMS lesson creation in ${retryDelay/1000} seconds...`);
                  await new Promise(resolve => setTimeout(resolve, retryDelay));
                }
              }
            }
            
            // Log successful lesson creation
            await supabase.from('api_logs_74621').insert([{
              operation: 'lesson_creation_success',
              request_id: courseGenerationId,
              request_data: {
                lesson_title: lesson.lessonTitle,
                lesson_id: lesson.id,
                content_length: lessonContent.length,
                slides_length: slideContent.length,
                voice_over_length: voiceOverScript.length,
                used_rag: !!effectiveVectorStoreId,
                token_usage: {
                  lesson: lessonTokenUsage,
                  media: mediaTokenUsage,
                  total: {
                    prompt_tokens: (lessonTokenUsage.prompt_tokens || 0) + (mediaTokenUsage.prompt_tokens || 0),
                    completion_tokens: (lessonTokenUsage.completion_tokens || 0) + (mediaTokenUsage.completion_tokens || 0),
                    total_tokens: (lessonTokenUsage.total_tokens || 0) + (mediaTokenUsage.total_tokens || 0)
                  }
                }
              }
            }]);
            
          } catch (lessonError) {
            if (lessonError.message === 'Request aborted by user or timed out') {
              throw lessonError;
            }
            
            console.error(`Error generating lesson ${lesson.lessonTitle}:`, lessonError);
            
            // Log the lesson error
            await supabase.from('api_logs_74621').insert([{
              operation: 'lesson_generation_error',
              request_id: courseGenerationId,
              error: lessonError.message,
              request_data: {
                lesson_title: lesson.lessonTitle,
                lesson_id: lesson.id
              }
            }]);
            
            // Mark the lesson as failed in recovery state
            if (topicProcessingState[topic.id]?.lessonsProcessed[lesson.id]) {
              topicProcessingState[topic.id].lessonsProcessed[lesson.id].failed = true;
              topicProcessingState[topic.id].lessonsProcessed[lesson.id].error = lessonError.message;
              
              await saveRecoveryState(courseId, {
                lmsData,
                courseContext,
                topicProcessingState,
                progress: Math.max(20, Math.min(90, (completedTasks / totalTasks) * 100)),
                completedTasks,
                courseTokenUsage,
                timestamp: new Date().toISOString()
              });
            }
            
            // Continue with the next lesson instead of stopping the whole process
            continue;
          }
        }
        
        // Mark topic as completed
        topicProcessingState[topic.id].completed = true;
        await saveRecoveryState(courseId, {
          lmsData,
          courseContext,
          topicProcessingState,
          progress: Math.max(20, Math.min(95, (completedTasks / totalTasks) * 100)),
          completedTasks,
          courseTokenUsage,
          timestamp: new Date().toISOString()
        });
        
      } catch (topicError) {
        if (topicError.message === 'Request aborted by user or timed out') {
          throw topicError;
        }
        
        console.error(`Error processing topic ${topic.topicTitle}:`, topicError);
        
        // Log the topic error
        await supabase.from('api_logs_74621').insert([{
          operation: 'topic_generation_error',
          request_id: courseGenerationId,
          error: topicError.message,
          request_data: {
            topic_title: topic.topicTitle,
            topic_id: topic.id
          }
        }]);
        
        // Mark the topic as failed in recovery state
        if (topicProcessingState[topic.id]) {
          topicProcessingState[topic.id].failed = true;
          topicProcessingState[topic.id].error = topicError.message;
          
          await saveRecoveryState(courseId, {
            lmsData,
            courseContext,
            topicProcessingState,
            progress: Math.max(20, Math.min(95, (completedTasks / totalTasks) * 100)),
            completedTasks,
            courseTokenUsage,
            timestamp: new Date().toISOString()
          });
        }
        
        // Continue with the next topic
        continue;
      }
    }
    
    // Log successful course generation
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_complete',
      request_id: courseGenerationId,
      request_data: {
        course_title: course.courseTitle,
        course_id: courseId,
        lms_course_id: lmsData?.courseId,
        total_topics: totalTopics,
        total_lessons: totalLessons,
        token_usage: courseTokenUsage
      }
    }]);
    
    // Log detailed token usage summary
    await supabase.from('token_usage_74621').insert([{
      model: "summary",
      prompt_tokens: courseTokenUsage.prompt_tokens,
      completion_tokens: courseTokenUsage.completion_tokens,
      total_tokens: courseTokenUsage.total_tokens,
      operation_type: 'course_generation_summary',
      request_id: courseGenerationId,
      duration_seconds: (new Date() - startTime) / 1000,
      metadata: {
        course_id: courseId,
        course_title: course.courseTitle,
        total_topics: totalTopics,
        total_lessons: totalLessons
      }
    }]);
    
    // Clear recovery state on successful completion
    await clearRecoveryState(courseId);
    
    return { 
      success: true, 
      courseId: lmsData?.courseId,
      tokenUsage: courseTokenUsage
    };
  } catch (error) {
    if (error.message === 'Request aborted by user or timed out') {
      console.log('Content generation aborted by user');
      
      // Log the abort
      await supabase.from('api_logs_74621').insert([{
        operation: 'content_generation_aborted',
        request_id: courseGenerationId,
        request_data: {
          course_title: course.courseTitle,
          course_id: course.id || `temp_${Date.now()}`,
          token_usage: courseTokenUsage
        }
      }]);
      
      throw error;
    }
    
    console.error('Error generating course content:', error);
    
    // Log the overall error
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_failure',
      request_id: courseGenerationId,
      error: error.message,
      request_data: {
        course_title: course.courseTitle,
        course_id: course.id || `temp_${Date.now()}`,
        token_usage: courseTokenUsage
      }
    }]);
    
    throw error;
  }
};

// LMS integration functions with abort signal support and enhanced error handling
const createCourse = async (course, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  try {
    return await axios.post(
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
        signal: abortSignal,
        timeout: 30000 // 30 second timeout for LMS operations
      }
    );
  } catch (error) {
    // Enhanced error handling with more detail
    let errorMessage = `Failed to create course: ${error.message}`;
    
    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      errorMessage += ` Status: ${error.response.status}, Response: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      // The request was made but no response was received
      errorMessage += ' No response received from LMS.';
    }
    
    throw new Error(errorMessage);
  }
};

const createTopic = async (topic, courseId, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  try {
    return await axios.post(
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
        signal: abortSignal,
        timeout: 30000 // 30 second timeout for LMS operations
      }
    );
  } catch (error) {
    // Enhanced error handling with more detail
    let errorMessage = `Failed to create topic: ${error.message}`;
    
    if (error.response) {
      errorMessage += ` Status: ${error.response.status}, Response: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      errorMessage += ' No response received from LMS.';
    }
    
    throw new Error(errorMessage);
  }
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
  
  try {
    return await axios.post(
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
          runtime: { hours: "00", minutes: "10", seconds: "36" }
        },
        attachments: [110],
        preview: true
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${auth}`
        },
        signal: abortSignal,
        timeout: 60000 // 60 second timeout for lesson creation (larger content)
      }
    );
  } catch (error) {
    // Enhanced error handling with more detail
    let errorMessage = `Failed to create lesson: ${error.message}`;
    
    if (error.response) {
      errorMessage += ` Status: ${error.response.status}, Response: ${JSON.stringify(error.response.data)}`;
    } else if (error.request) {
      errorMessage += ' No response received from LMS.';
    }
    
    throw new Error(errorMessage);
  }
};

// Export other functions from the original service
export * from './aiService.js';
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
  } catch (error) {
    // Table doesn't exist, create it
    const { error: createError } = await supabase.rpc('create_api_logs_table', {
      table_name: 'api_logs_74621'
    });
    if (createError) {
      console.error('Failed to create API logs table:', createError);
    }
  }
};

// Initialize the logs table
createApiLogsTable();

// Enhanced OpenAI API call function with logging and retry logic
const callOpenAI = async (apiKey, prompt, systemPrompt, useGPT4 = false, retries = 2, abortSignal = null) => {
  let lastError;
  
  // Log the API call attempt to Supabase
  try {
    await supabase.from('api_logs_74621').insert([{
      operation: 'openai_api_call',
      request_data: {
        model: useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14",
        prompt_length: prompt.length,
        system_prompt: systemPrompt
      }
    }]);
  } catch (logError) {
    console.error("Failed to log API call:", logError);
  }
  
  for (let attempt = 1; attempt <= retries + 1; attempt++) {
    try {
      console.log(`API call attempt ${attempt}/${retries + 1} using model: ${useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14"}`);
      console.log(`Prompt length: ${prompt.length} characters`);
      
      const startTime = new Date();
      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14",
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
          timeout: 60000, // 60 second timeout
          signal: abortSignal
        }
      );
      
      const endTime = new Date();
      const duration = (endTime - startTime) / 1000;
      console.log(`API call completed in ${duration} seconds`);
      
      // Log successful response
      try {
        await supabase.from('api_logs_74621').insert([{
          operation: 'openai_api_success',
          request_data: {
            model: useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14",
            duration_seconds: duration
          },
          response_data: {
            completion_tokens: response.data.usage?.completion_tokens,
            total_tokens: response.data.usage?.total_tokens
          }
        }]);
      } catch (logError) {
        console.error("Failed to log API success:", logError);
      }
      
      return response.data.choices[0].message.content;
      
    } catch (error) {
      if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
        console.log('Request aborted by user');
        throw new Error('Request aborted by user');
      }
      
      lastError = error;
      console.error(`Attempt ${attempt} failed:`, error.message);
      
      // Log the error
      try {
        await supabase.from('api_logs_74621').insert([{
          operation: 'openai_api_error',
          error: error.message,
          request_data: {
            model: useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14",
            attempt: attempt
          },
          response_data: error.response ? {
            status: error.response.status,
            data: error.response.data
          } : null
        }]);
      } catch (logError) {
        console.error("Failed to log API error:", logError);
      }
      
      if (attempt <= retries) {
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000;
        console.log(`Retrying in ${delay/1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
    
    const combinedContent = await callOpenAI(
      apiKey, 
      combinedPrompt, 
      "You are an expert educational content creator specializing in creating presentation slides and voice-over scripts that work together seamlessly.",
      true, // Use GPT-4 for better quality
      2,
      abortSignal
    );
    
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
      slideContent = await generateSlidesOnly(apiKey, lessonContent, abortSignal);
    }
    
    if (!voiceOverScript) {
      console.log("Voice-over script parsing failed, making separate API call");
      voiceOverScript = await generateVoiceOverOnly(apiKey, slideContent, lessonContent, abortSignal);
    }
    
    return { slideContent, voiceOverScript };
  } catch (error) {
    if (error.message === 'Request aborted by user') {
      throw error;
    }
    
    console.error("Error generating slides and voice-over:", error);
    
    // Attempt to generate them separately as a fallback
    console.log("Falling back to separate generation");
    const slideContent = await generateSlidesOnly(apiKey, lessonContent, abortSignal);
    const voiceOverScript = await generateVoiceOverOnly(apiKey, slideContent, lessonContent, abortSignal);
    
    return { slideContent, voiceOverScript };
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
  
  return await callOpenAI(apiKey, slidesPrompt, "You are an expert presentation designer.", false, 2, abortSignal);
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
  
  return await callOpenAI(apiKey, voiceOverPrompt, "You are an expert educational video scriptwriter.", false, 2, abortSignal);
};

// Enhanced course content generation with progress tracking
export const generateCourseContent = async (course, lmsCredentials, apiKey, progressCallbacks = {}) => {
  const { 
    onProgress, 
    onTaskUpdate, 
    checkPauseStatus, 
    getAbortSignal 
  } = progressCallbacks;
  
  try {
    console.log("Generating full course content with OpenAI...");
    
    const abortSignal = getAbortSignal?.();
    
    // Calculate total tasks
    const totalLessons = course.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;
    const totalTasks = totalLessons * 3; // Each lesson has 3 tasks: content, slides, voice-over
    let completedTasks = 0;
    
    // Log the start of content generation
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_start',
      request_data: {
        course_title: course.courseTitle,
        topics_count: course.topics?.length || 0,
        total_lessons: totalLessons
      }
    }]);
    
    onProgress?.(5, 'Creating course in LMS...', 'course_creation');
    
    const courseResponse = await createCourse(course, lmsCredentials, abortSignal);
    const courseId = courseResponse.data.data;
    console.log('Created course with ID:', courseId);
    
    // Generate course context once
    onProgress?.(10, 'Generating course context...', 'context_generation');
    const courseContextPrompt = `
      Course Title: ${course.courseTitle}
      Course Description: ${course.courseDescription}
      Generate a brief, concise context of the overall course based on the course title and description provided.
      This context will be used as a high-level overview for subsequent lesson content generation.
    `;
    
    const courseContext = await callOpenAI(
      apiKey,
      courseContextPrompt,
      "You are a concise educational content summarizer.",
      false,
      2,
      abortSignal
    );
    
    // Process each topic
    for (const [topicIndex, topic] of course.topics.entries()) {
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
        
        const topicResponse = await createTopic(topic, courseId, lmsCredentials, abortSignal);
        const topicId = topicResponse.data.data;
        console.log('Created topic with ID:', topicId, 'Title:', topic.topicTitle);
        
        // Process each lesson in the topic
        for (const [lessonIndex, lesson] of topic.lessons.entries()) {
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
              request_data: {
                topic_title: topic.topicTitle,
                lesson_title: lesson.lessonTitle
              }
            }]);
            
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
            console.log("Generating main lesson content...");
            const lessonContent = await callOpenAI(
              apiKey,
              lessonContentPrompt,
              "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content.",
              false,
              2,
              abortSignal
            );
            
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
            
            console.log("Starting slides and voice-over generation...");
            let slideContent = "";
            let voiceOverScript = "";
            
            try {
              // Generate both slides and voice-over in one call
              const mediaContent = await generateSlidesAndVoiceOver(apiKey, lessonContent, abortSignal);
              slideContent = mediaContent.slideContent;
              voiceOverScript = mediaContent.voiceOverScript;
              
              console.log("Slides and voice-over generated successfully.");
              completedTasks += 2; // Both slides and voice-over completed
            } catch (mediaError) {
              if (mediaError.message === 'Request aborted by user') {
                throw mediaError;
              }
              
              console.error("Error generating slides and voice-over:", mediaError);
              
              // Log the error
              await supabase.from('api_logs_74621').insert([{
                operation: 'media_generation_error',
                error: mediaError.message,
                request_data: {
                  lesson_title: lesson.lessonTitle
                }
              }]);
              
              // Provide fallback content
              slideContent = "Slide generation failed. Please try again.";
              voiceOverScript = "Voice-over generation failed. Please try again.";
              completedTasks += 2; // Mark as completed even with fallback
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
            
            // Create the lesson in the LMS
            await createLesson(lesson, topicId, lmsCredentials, fullLessonContent, abortSignal);
            console.log('Created lesson with full content:', lesson.lessonTitle);
            
            // Log successful lesson creation
            await supabase.from('api_logs_74621').insert([{
              operation: 'lesson_creation_success',
              request_data: {
                lesson_title: lesson.lessonTitle,
                content_length: lessonContent.length,
                slides_length: slideContent.length,
                voice_over_length: voiceOverScript.length
              }
            }]);
            
          } catch (lessonError) {
            if (lessonError.message === 'Request aborted by user') {
              throw lessonError;
            }
            
            console.error(`Error generating lesson ${lesson.lessonTitle}:`, lessonError);
            
            // Log the lesson error
            await supabase.from('api_logs_74621').insert([{
              operation: 'lesson_generation_error',
              error: lessonError.message,
              request_data: {
                lesson_title: lesson.lessonTitle
              }
            }]);
            
            // Continue with the next lesson instead of stopping the whole process
            continue;
          }
        }
      } catch (topicError) {
        if (topicError.message === 'Request aborted by user') {
          throw topicError;
        }
        
        console.error(`Error processing topic ${topic.topicTitle}:`, topicError);
        
        // Log the topic error
        await supabase.from('api_logs_74621').insert([{
          operation: 'topic_generation_error',
          error: topicError.message,
          request_data: {
            topic_title: topic.topicTitle
          }
        }]);
        
        // Continue with the next topic
        continue;
      }
    }
    
    // Log successful course generation
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_complete',
      request_data: {
        course_title: course.courseTitle,
        course_id: courseId
      }
    }]);
    
    return { success: true, courseId };
  } catch (error) {
    if (error.message === 'Request aborted by user') {
      console.log('Content generation aborted by user');
      throw error;
    }
    
    console.error('Error generating course content:', error);
    
    // Log the overall error
    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_failure',
      error: error.message,
      request_data: {
        course_title: course.courseTitle
      }
    }]);
    
    throw error;
  }
};

// LMS integration functions with abort signal support
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
      signal: abortSignal
    }
  );
};

// Export other functions from the original service
export * from './aiService.js';
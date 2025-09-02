import axios from 'axios';
import {supabase} from '../lib/supabase';
import {callPerplexityAPI} from './perplexityService';

// Create API logs table for monitoring
const createApiLogsTable = async () => {
  try {
    const {data, error} = await supabase
      .from('api_logs_74621')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Creating API logs table');
      try {
        await supabase.rpc('create_api_logs_table', {table_name: 'api_logs_74621'});
      } catch (rpcError) {
        console.error('Failed to create API logs table:', rpcError);
        await supabase.from('api_logs_74621').insert({
          operation: 'table_creation',
          request_id: 'initial_setup',
          request_data: {message: 'Initial table setup'}
        });
      }
    } else {
      console.log('API logs table exists');
    }

    try {
      const {error: tokenError} = await supabase
        .from('token_usage_74621')
        .select('*')
        .limit(1);

      if (tokenError) {
        console.log('Creating token usage table');
        try {
          await supabase.rpc('create_token_usage_table', {table_name: 'token_usage_74621'});
        } catch (rpcError) {
          console.error('Failed to create token usage table:', rpcError);
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
    const {data, error} = await supabase
      .from('recovery_state_74621')
      .select('*')
      .limit(1);

    if (error) {
      console.log('Creating recovery state table');
      try {
        await supabase.rpc('create_recovery_state', {table_name: 'recovery_state_74621'});
      } catch (rpcError) {
        console.error('Failed to create recovery state table:', rpcError);
        await supabase.from('recovery_state_74621').insert({
          course_id: 'initial_setup',
          state_data: {message: 'Initial table setup'},
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
    const {data, error} = await supabase
      .from('recovery_state_74621')
      .upsert(
        {
          course_id: courseId,
          state_data: state,
          updated_at: new Date().toISOString()
        },
        {onConflict: 'course_id'}
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
    const {data, error} = await supabase
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
    const {error} = await supabase
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

// Generate web search context using Perplexity Sonar with enhanced configuration
const generateWebSearchContext = async (perplexityApiKey, course, topic, lessons, sonarConfig = null) => {
  try {
    console.log(`Generating web search context for topic: ${topic.topicTitle}`);
    
    const lessonContexts = {};
    const defaultSonarConfig = {
      sonarModel: 'sonar',
      searchMode: 'web_search',
      searchContextSize: 'medium',
      searchRecency: 'month',
      domainFilter: '',
      temperature: 0.3,
      maxTokens: 1400,
      country: '',
      region: '',
      city: ''
    };

    const config = sonarConfig || defaultSonarConfig;

    const buildPerplexityOptions = (maxTokens) => {
      const options = {
        model: config.sonarModel,
        maxTokens: maxTokens,
        temperature: config.temperature
      };

      if (config.sonarModel.includes('sonar')) {
        options.search_mode = config.searchMode;
        options.web_search_options = {
          search_context_size: config.searchContextSize,
          search_recency_filter: config.searchRecency
        };

        if (config.domainFilter && config.domainFilter.trim()) {
          const domains = config.domainFilter.split(',').map(d => d.trim()).filter(d => d);
          if (domains.length > 0) {
            options.web_search_options.search_domain_filter = domains;
          }
        }

        if (config.country || config.region || config.city) {
          options.user_location = {};
          if (config.country) options.user_location.country = config.country;
          if (config.region) options.user_location.region = config.region;
          if (config.city) options.user_location.city = config.city;
        }
      }

      return options;
    };

    const topicSearchPrompt = `
      Search for the latest trends, statistics, and developments related to "${topic.topicTitle}" in the context of "${course.courseTitle}". Focus on:
      - Current industry trends and developments (2024-2025)
      - Recent statistics and market data
      - Latest tools, technologies, and methodologies
      - Expert insights and best practices
      - Real-world case studies and examples

      Provide a comprehensive overview that can be used as context for educational content generation.
    `;

    const topicResult = await callPerplexityAPI(
      perplexityApiKey,
      topicSearchPrompt,
      config.sonarModel,
      buildPerplexityOptions(config.maxTokens)
    );

    for (const lesson of lessons) {
      const lessonSearchPrompt = `
        Search for specific, current information about "${lesson.lessonTitle}" in the context of "${topic.topicTitle}" and "${course.courseTitle}". Find:
        - Recent developments and updates (last 6 months)
        - Specific statistics and data points
        - Current best practices and methodologies
        - Real-world examples and case studies
        - Expert quotes and insights
        - Latest tools and technologies

        Provide focused, actionable information that can enhance lesson content with current, real-world context.
      `;

      try {
        const lessonResult = await callPerplexityAPI(
          perplexityApiKey,
          lessonSearchPrompt,
          config.sonarModel,
          buildPerplexityOptions(400)
        );

        lessonContexts[`lesson_${lesson.id}_websearchcontext`] = lessonResult.content;

        // Add delay to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Error generating web search context for lesson ${lesson.lessonTitle}:`, error);
        lessonContexts[`lesson_${lesson.id}_websearchcontext`] = '';
      }
    }

    return {
      topicWebSearchContext: topicResult.content,
      lessonWebSearchContexts: lessonContexts
    };
  } catch (error) {
    console.error('Error generating web search context:', error);
    return {
      topicWebSearchContext: '',
      lessonWebSearchContexts: {}
    };
  }
};

// ✅ NEW: Generate reading content using OpenAI Responses API with RAG
const generateReadingContentWithRAG = async (
  apiKey,
  vectorStoreIds,
  lessonData,
  courseContext,
  topicContext,
  mustHaveAspects,
  designConsiderations,
  webSearchContext = '',
  audienceContext = '',
  abortSignal = null
) => {
  try {
    console.log(`🔍 Starting RAG reading content generation for lesson: ${lessonData.lessonTitle}`);
    console.log(`📚 Using vector stores: ${vectorStoreIds}`);
    console.log(`🌐 Web search context length: ${webSearchContext.length} chars`);

    const systemPrompt = `Act as a senior instructor designer. For generating the lesson content use the following context:
RESEARCH: ${courseContext}
Must have topics: ${mustHaveAspects}
Design considerations: ${designConsiderations}
Course structure content with topic, course: ${topicContext}
${webSearchContext ? `Recent relevant Websearch context: ${webSearchContext}` : ''}

Use websearch context as high priority to generate the text. Focus on actionable strategies that readers can implement immediately. Address emotional triggers. Emphasize benefits. Include common mistakes and how to avoid them. Use case studies or examples from real businesses to make content relatable. Provide templates and actionable checklists if applicable. Keep the text as action focused as possible. Quote recent research on this topic if any. Keep the tone motivating and supportive. Sound like Malcolm Gladwell or Daniel Pink for this content.

CRITICAL: Generate all content in well-structured HTML format suitable for professional LMS display. Use proper HTML tags, semantic structure, and CSS classes for styling. Use the attached files from the vector store library as authoritative reference material. Keep the REFERENCE TO THE Files used in library search. Humanize the text.`;

    const userPrompt = `Generate the <b>readingContent</b> (1600-1800 words in HTML) for the lesson "${lessonData.lessonTitle}" focusing on ${mustHaveAspects} and ${designConsiderations}. 
Audience: ${audienceContext || 'Marketing professionals and business practitioners'}
Objectives: Create comprehensive, practical lesson content that combines:
1. Current industry trends and examples (from web search context)
2. Authoritative knowledge (from attached library files)
3. Actionable strategies and implementation guidance

Requirements:
- Generate 1600-1800 words in clean HTML format
- Use semantic HTML structure with proper headings, paragraphs, lists
- Include current examples and statistics from web search context
- Reference library materials for authoritative backing
- Humanize the text with engaging, practical tone
- Focus on immediate applicability for professionals
- Keep the REFERENCE TO THE Files used in library search

Generate the complete HTML lesson reading content now.`;

    console.log(`📡 Making RAG API call to /v1/responses endpoint...`);

    // ✅ NEW: Use the /v1/responses API endpoint with file_search tools
    const requestBody = {
      model: "gpt-4.1-mini-2025-04-14",
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
      max_output_tokens: 2200
    };

    // Add file_search tools only if vector stores are provided
    if (vectorStoreIds && vectorStoreIds.length > 0) {
      requestBody.tools = [
        {
          type: "file_search",
          vector_store_ids: vectorStoreIds,
          max_num_results: 3
        }
      ];
    }

    const response = await axios.post(
      'https://api.openai.com/v1/responses',
      requestBody,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000, // 3 minutes timeout
        signal: abortSignal
      }
    );

    console.log(`✅ RAG API call successful! Response received.`);
    console.log(`📊 Response structure:`, Object.keys(response.data));

    // Handle the responses API format
    const content = response.data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ No content received from RAG API');
      throw new Error('No content received from RAG API response');
    }

    console.log(`📝 RAG reading content generated: ${content.length} characters`);

    return {
      content: content,
      tokenUsage: response.data.usage || {
        prompt_tokens: Math.ceil(systemPrompt.length / 4),
        completion_tokens: Math.ceil(content.length / 4),
        total_tokens: Math.ceil((systemPrompt.length + content.length) / 4)
      }
    };
  } catch (error) {
    console.error('❌ Error generating reading content with RAG:', error);
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
    }
    throw error;
  }
};

// ✅ NEW: Generate additional lesson sections using standard chat completions
const generateAdditionalLessonSections = async (
  apiKey,
  lessonData,
  readingContent,
  webSearchContext = '',
  abortSignal = null
) => {
  try {
    console.log(`📝 Generating additional sections for lesson: ${lessonData.lessonTitle}`);

    // Extract plain text from HTML for context
    const plainTextContent = readingContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();

    const systemPrompt = `You are an expert educational content creator specializing in comprehensive lesson development. Based on the provided lesson content, generate additional educational sections in well-structured HTML format.

${webSearchContext ? `Recent Web Research Context: ${webSearchContext}` : ''}`;

    // Generate FAQ section
    const faqPrompt = `Based on the following lesson content, create a comprehensive FAQ section that addresses common questions students might have about this topic.

Lesson Title: ${lessonData.lessonTitle}
Lesson Description: ${lessonData.lessonDescription}
Reading Content (first 1500 chars): ${plainTextContent.substring(0, 1500)}...

Create 6-8 frequently asked questions with detailed, helpful answers. 

IMPORTANT: Format your response in clean HTML with the following structure:
<div class="faq-container">
  <div class="faq-item">
    <h3 class="faq-question">Question 1?</h3>
    <div class="faq-answer">
      <p>Detailed answer with proper HTML formatting...</p>
    </div>
  </div>
  <!-- More FAQ items -->
</div>

Use proper HTML tags like <p>, <ul>, <li>, <strong>, <em> for formatting. Make the answers informative and practical.`;

    const faqResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: faqPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      }
    );

    // Generate Latest Developments section
    const latestDevelopmentsPrompt = `Based on the lesson "${lessonData.lessonTitle}" and the web search context, create a "Latest Developments" section highlighting recent trends, innovations, and industry updates.

${webSearchContext ? `Use this recent web research context: ${webSearchContext}` : ''}

Create content about:
1. Recent industry developments (2024-2025)
2. New tools and technologies
3. Emerging trends and methodologies
4. Recent case studies and success stories
5. Expert predictions and insights

Format in clean HTML with proper structure:
<div class="latest-developments">
  <h3>Recent Industry Developments</h3>
  <div class="development-item">
    <h4>Development Title</h4>
    <p>Description and impact...</p>
  </div>
  <!-- More development items -->
</div>`;

    const latestDevelopmentsResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: latestDevelopmentsPrompt }
        ],
        max_tokens: 1200,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      }
    );

    // Generate Additional Reading References
    const additionalReadingPrompt = `Based on the lesson "${lessonData.lessonTitle}", create a comprehensive additional reading and resources section.

Include:
1. Recommended books and publications
2. Online articles and research papers  
3. Relevant websites and tools
4. Video resources and documentaries
5. Professional organizations and communities
6. Certification programs (if applicable)

Format in clean HTML:
<div class="additional-resources">
  <div class="resource-category">
    <h4>Books & Publications</h4>
    <ul>
      <li><strong>Title</strong> by Author - Brief description</li>
    </ul>
  </div>
  <!-- More categories -->
</div>`;

    const additionalReadingResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: additionalReadingPrompt }
        ],
        max_tokens: 1200,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      }
    );

    // Generate Presentation Slides
    const slidesPrompt = `Based on the lesson content, create compelling presentation slides with titles and 4-6 bullet points per slide.

Create 8-12 slides that cover the main concepts from: ${lessonData.lessonTitle}

Structure as:
SLIDE 1: [Title]
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]
- [Bullet point 4]

SLIDE 2: [Title]
- [Bullet point 1]
- [Bullet point 2]
- [Bullet point 3]
- [Bullet point 4]

Continue for all slides. Make them engaging and visually representable.`;

    const slidesResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: "You are an expert presentation designer specializing in educational content." },
          { role: "user", content: slidesPrompt }
        ],
        max_tokens: 1500,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      }
    );

    // Generate Voice-over Script with Timestamps
    const slideContent = slidesResponse.data.choices[0].message.content;
    
    const voiceOverPrompt = `Based on the following presentation slides, write a detailed voice-over script for a video lesson with timestamps.

Presentation Slides:
${slideContent}

Format the voice-over script with timing indicators for each slide:
[SLIDE 1 - 00:00-00:45]
"Welcome to today's lesson on... [engaging script continues]"

[SLIDE 2 - 00:45-01:30] 
"Now let's examine... [script continues]"

Make it conversational, engaging, and educational. Each slide should have 30-60 seconds of narration.`;

    const voiceOverResponse = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: "You are an expert educational video scriptwriter specializing in engaging, conversational narration." },
          { role: "user", content: voiceOverPrompt }
        ],
        max_tokens: 2000,
        temperature: 0.7
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        signal: abortSignal
      }
    );

    console.log(`✅ Additional lesson sections generated successfully`);

    return {
      faq: faqResponse.data.choices[0].message.content,
      latestDevelopments: latestDevelopmentsResponse.data.choices[0].message.content,
      additionalReading: additionalReadingResponse.data.choices[0].message.content,
      slides: slideContent,
      voiceOver: voiceOverResponse.data.choices[0].message.content,
      tokenUsage: {
        prompt_tokens: (faqResponse.data.usage?.prompt_tokens || 0) + 
                      (latestDevelopmentsResponse.data.usage?.prompt_tokens || 0) + 
                      (additionalReadingResponse.data.usage?.prompt_tokens || 0) + 
                      (slidesResponse.data.usage?.prompt_tokens || 0) + 
                      (voiceOverResponse.data.usage?.prompt_tokens || 0),
        completion_tokens: (faqResponse.data.usage?.completion_tokens || 0) + 
                          (latestDevelopmentsResponse.data.usage?.completion_tokens || 0) + 
                          (additionalReadingResponse.data.usage?.completion_tokens || 0) + 
                          (slidesResponse.data.usage?.completion_tokens || 0) + 
                          (voiceOverResponse.data.usage?.completion_tokens || 0),
        total_tokens: (faqResponse.data.usage?.total_tokens || 0) + 
                     (latestDevelopmentsResponse.data.usage?.total_tokens || 0) + 
                     (additionalReadingResponse.data.usage?.total_tokens || 0) + 
                     (slidesResponse.data.usage?.total_tokens || 0) + 
                     (voiceOverResponse.data.usage?.total_tokens || 0)
      }
    };
  } catch (error) {
    console.error('❌ Error generating additional lesson sections:', error);
    throw error;
  }
};

// Enhanced OpenAI API call function with logging, retry logic, and rate limit handling
const callOpenAI = async (apiKey, prompt, systemPrompt, useGPT4 = false, retries = 3, abortSignal = null) => {
  let lastError;
  let tokenUsage = null;
  const startTime = new Date();
  const modelName = useGPT4 ? "gpt-4o" : "gpt-4.1-mini-2025-04-14"; // Updated to new model
  const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

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

      const baseTimeout = 60000;
      const charPerSec = 1000;
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
          timeout: estimatedTime,
          signal: abortSignal
        }
      );

      const endTime = new Date();
      const duration = (endTime - callStartTime) / 1000;
      const totalDuration = (endTime - startTime) / 1000;

      console.log(`API call completed in ${duration} seconds (total with retries: ${totalDuration}s)`);

      tokenUsage = {
        prompt_tokens: response.data.usage?.prompt_tokens || 0,
        completion_tokens: response.data.usage?.completion_tokens || 0,
        total_tokens: response.data.usage?.total_tokens || 0
      };

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

      let retryDelay = Math.pow(2, attempt) * 1000;

      if (error.response?.status === 429) {
        console.log('Rate limit reached');
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          const retrySeconds = parseInt(retryAfter, 10);
          if (!isNaN(retrySeconds)) {
            retryDelay = (retrySeconds + 1) * 1000;
          } else {
            retryDelay = 60000;
          }
        } else {
          retryDelay = 30000;
        }
        console.log(`Rate limited. Waiting ${retryDelay/1000} seconds before retry...`);
      }

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
    // ✅ NEW: Enhanced lesson content structure with all sections
    lessonContent = `
      <div class="tutor-lesson-content">
        <!-- Main Reading Content -->
        <div class="lesson-main-content">
          ${fullContent.readingContent}
        </div>

        <!-- FAQ Section -->
        ${fullContent.faq ? `
          <div class="lesson-faq-section">
            <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #3b82f6, #8b5cf6);">
            <h2 style="color: #1e40af; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <i class="fas fa-question-circle" style="margin-right: 10px;"></i>Frequently Asked Questions
            </h2>
            <div class="faq-content">
              ${fullContent.faq}
            </div>
          </div>
        ` : ''}

        <!-- Latest Developments Section -->
        ${fullContent.latestDevelopments ? `
          <div class="lesson-latest-developments">
            <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #f59e0b, #ef4444);">
            <h2 style="color: #dc2626; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <i class="fas fa-rocket" style="margin-right: 10px;"></i>Latest Developments & Trends
            </h2>
            <div class="latest-developments-content">
              ${fullContent.latestDevelopments}
            </div>
          </div>
        ` : ''}

        <!-- Additional Reading Materials -->
        ${fullContent.additionalReading ? `
          <div class="lesson-additional-reading">
            <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #10b981, #059669);">
            <h2 style="color: #047857; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <i class="fas fa-book-open" style="margin-right: 10px;"></i>Additional Reading & Resources
            </h2>
            <div class="additional-reading-content">
              ${fullContent.additionalReading}
            </div>
          </div>
        ` : ''}

        <!-- Presentation Slides -->
        <div class="lesson-slides-section">
          <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #f59e0b, #d97706);">
          <h2 style="color: #92400e; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
            <i class="fas fa-presentation" style="margin-right: 10px;"></i>Presentation Slides
          </h2>
          <div class="slides-content" style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
            <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #374151;">${fullContent.slides}</pre>
          </div>
        </div>

        <!-- Voice-Over Script -->
        <div class="lesson-voiceover-section">
          <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #8b5cf6, #7c3aed);">
          <h2 style="color: #5b21b6; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
            <i class="fas fa-microphone" style="margin-right: 10px;"></i>Voice-Over Script
          </h2>
          <div class="voice-over-script" style="background: #faf5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
            <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #374151;">${fullContent.voiceOver}</pre>
          </div>
        </div>
      </div>

      <style>
        .tutor-lesson-content {
          max-width: 100%;
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.7;
          color: #374151;
        }
        .tutor-lesson-content h1 {
          color: #1f2937;
          font-size: 28px;
          margin-bottom: 20px;
          padding-bottom: 10px;
          border-bottom: 3px solid #3b82f6;
        }
        .tutor-lesson-content h2 {
          color: #374151;
          font-size: 22px;
          margin: 25px 0 15px 0;
          padding-bottom: 8px;
          border-bottom: 2px solid #e5e7eb;
        }
        .tutor-lesson-content h3 {
          color: #4b5563;
          font-size: 18px;
          margin: 20px 0 12px 0;
          font-weight: 600;
        }
        .tutor-lesson-content p {
          margin-bottom: 16px;
          text-align: justify;
        }
        .tutor-lesson-content ul, .tutor-lesson-content ol {
          margin: 16px 0;
          padding-left: 24px;
        }
        .tutor-lesson-content li {
          margin-bottom: 8px;
        }
        .tutor-lesson-content blockquote {
          background: #f3f4f6;
          border-left: 4px solid #3b82f6;
          margin: 20px 0;
          padding: 15px 20px;
          font-style: italic;
          color: #4b5563;
        }
        .tutor-lesson-content code {
          background: #f1f5f9;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
          color: #dc2626;
        }
        .tutor-lesson-content .highlight-box {
          background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
          border: 1px solid #bfdbfe;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #3b82f6;
        }
        .tutor-lesson-content .warning-box {
          background: #fef3cd;
          border: 1px solid #fbbf24;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #f59e0b;
        }
        .tutor-lesson-content .success-box {
          background: #d1fae5;
          border: 1px solid #34d399;
          border-radius: 8px;
          padding: 20px;
          margin: 20px 0;
          border-left: 4px solid #10b981;
        }
        .tutor-lesson-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          background: white;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .tutor-lesson-content th, .tutor-lesson-content td {
          padding: 12px 15px;
          text-align: left;
          border-bottom: 1px solid #e5e7eb;
        }
        .tutor-lesson-content th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }
        .tutor-lesson-content .case-study {
          background: #f0f9ff;
          border: 1px solid #0ea5e9;
          border-radius: 8px;
          padding: 20px;
          margin: 25px 0;
          border-left: 4px solid #0ea5e9;
        }
        .tutor-lesson-content .case-study h3 {
          color: #0c4a6e;
          margin-top: 0;
        }
        @media (max-width: 768px) {
          .tutor-lesson-content {
            font-size: 16px;
          }
          .tutor-lesson-content h1 {
            font-size: 24px;
          }
          .tutor-lesson-content h2 {
            font-size: 20px;
          }
          .tutor-lesson-content h3 {
            font-size: 18px;
          }
        }
      </style>
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

// NEW: Create quiz for a topic
const createQuiz = async (topic, topicId, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/quizzes`,
    {
      topic_id: topicId,
      quiz_title: `${topic.topicTitle} Quiz`,
      quiz_author: 1,
      quiz_description: `${topic.topicTitle} quiz.`,
      quiz_options: {
        time_limit: { time_value: 10, time_type: "minutes" },
        feedback_mode: "default",
        question_layout_view: "question_below_each_other",
        attempts_allowed: 3,
        passing_grade: 80,
        max_questions_for_answer: 10,
        questions_order: "rand",
        short_answer_characters_limit: 200,
        open_ended_answer_characters_limit: 500
      }
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

// NEW: Add question to quiz
const createQuizQuestion = async (quizId, questionData, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/quiz-questions`,
    {
      quiz_id: quizId,
      ...questionData,
      answer_required: 1,
      randomize_question: 1,
      question_mark: 1.00,
      show_question_mark: 1
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

// NEW: Create assignment for a topic
const createAssignment = async (topicId, assignmentData, credentials, abortSignal = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/assignments/`,
    {
      topic_id: topicId,
      assignment_title: assignmentData.title,
      assignment_author: 1,
      assignment_content: assignmentData.content,
      assignment_options: {
        time_duration: { value: 1, unit: "weeks" },
        total_mark: 10,
        pass_mark: 6,
        upload_files_limit: 1,
        upload_file_size_limit: 2
      }
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

// NEW: Generate quiz questions using AI
const generateQuizQuestions = async (apiKey, aggregatedLessonContent, abortSignal = null) => {
  const systemPrompt = `Based on the provided lesson content, generate 10 quiz questions of varying types (single choice, multiple choice, and fill-in-the-blanks). For each question, provide the question title, options (where applicable), and the correct answer(s). Ensure the questions are relevant and directly test the learner's understanding of the material.

Return the response as a JSON array with the following structure:
[
  {
    "question_title": "Question text here?",
    "question_type": "multiple_choice", // or "single_choice" or "fill_in_the_blank"
    "options": ["Option 1", "Option 2", "Option 3", "Option 4"], // for multiple/single choice
    "correct_answer": ["Option 1", "Option 2"], // array for multiple choice, string for single choice
    "question": "The capital of France is {dash} and the currency is the {dash}.", // only for fill_in_the_blank
    "correct_answer_fill": "Paris|Euro" // only for fill_in_the_blank, pipe-separated
  }
]

Generate a mix of question types:
- 4 multiple choice questions
- 4 single choice questions  
- 2 fill-in-the-blank questions`;

  const userPrompt = `Lesson Content: ${aggregatedLessonContent}`;

  try {
    const result = await callOpenAI(
      apiKey,
      userPrompt,
      systemPrompt,
      false,
      3,
      abortSignal
    );

    // Parse the JSON response
    const content = result.content.trim();
    let questionsData;

    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      questionsData = JSON.parse(jsonString);
    } else {
      questionsData = JSON.parse(content);
    }

    return questionsData;
  } catch (error) {
    console.error('Error generating quiz questions:', error);
    throw error;
  }
};

// NEW: Generate assignment content using AI
const generateAssignmentContent = async (apiKey, aggregatedLessonContent, abortSignal = null) => {
  const systemPrompt = `Based on the provided lesson content, generate a practical assignment. Create a clear title and a detailed assignment description in HTML format. The assignment should require the learner to apply the concepts taught in the topic.

Return the response as a JSON object with the following structure:
{
  "title": "Assignment title here",
  "content": "<p>Assignment content in HTML format here</p>"
}

The assignment should:
- Be practical and hands-on
- Require application of learned concepts  
- Include clear instructions and deliverables
- Be appropriate for the skill level
- Include evaluation criteria`;

  const userPrompt = `Lesson Content: ${aggregatedLessonContent}`;

  try {
    const result = await callOpenAI(
      apiKey,
      userPrompt,
      systemPrompt,
      false,
      3,
      abortSignal
    );

    // Parse the JSON response
    const content = result.content.trim();
    let assignmentData;

    // Try to extract JSON from the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      assignmentData = JSON.parse(jsonString);
    } else {
      assignmentData = JSON.parse(content);
    }

    return assignmentData;
  } catch (error) {
    console.error('Error generating assignment content:', error);
    throw error;
  }
};

// Enhanced course content generation with new two-part lesson structure
export const generateCourseContent = async (
  course,
  lmsCredentials,
  apiKey,
  progressCallbacks = {},
  vectorStoreAssignments = {},
  webSearchOptions = {}
) => {
  const { onProgress, onTaskUpdate, checkPauseStatus, getAbortSignal } = progressCallbacks;
  const { usePerplexityWebSearch = false, perplexityApiKey = null, sonarConfig = null } = webSearchOptions;

  let courseTokenUsage = {
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0
  };

  const courseGenerationId = `course_gen_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const startTime = new Date();

  try {
    console.log("🚀 Starting enhanced course content generation with new two-part lesson structure...");
    
    const abortSignal = getAbortSignal?.();
    const totalTopics = course.topics?.length || 0;
    const totalLessons = course.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;
    const webSearchTasks = usePerplexityWebSearch ? totalTopics : 0;
    
    // Updated task calculation: lessons (7 tasks each) + quizzes (2 tasks each) + assignments (1 task each)
    const totalTasks = (totalLessons * 7) + (totalTopics * 3) + webSearchTasks; // 7 = reading content + 5 additional sections + LMS creation
    let completedTasks = 0;

    const courseId = course.id || `temp_${Date.now()}`;
    const recoveryState = await loadRecoveryState(courseId);

    if (recoveryState) {
      console.log("Found recovery state, resuming from previous session");
      onProgress?.(
        recoveryState.progress || 5,
        'Resuming course generation from previous session...',
        'resuming'
      );
      completedTasks = recoveryState.completedTasks || 0;
      courseTokenUsage = recoveryState.courseTokenUsage || courseTokenUsage;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    await supabase.from('api_logs_74621').insert([{
      operation: 'content_generation_start',
      request_id: courseGenerationId,
      request_data: {
        course_title: course.courseTitle,
        course_id: courseId,
        topics_count: totalTopics,
        total_lessons: totalLessons,
        use_web_search: usePerplexityWebSearch,
        sonar_config: sonarConfig,
        is_resumed: !!recoveryState
      }
    }]);

    onProgress?.(5, 'Creating course in LMS...', 'course_creation');
    
    let lmsData = null;
    if (recoveryState?.lmsData) {
      lmsData = recoveryState.lmsData;
      console.log('Using existing LMS course data from recovery state:', lmsData);
    } else {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const courseResponse = await createCourse(course, lmsCredentials, abortSignal);
          lmsData = { courseId: courseResponse.data.data };
          console.log('Created course with ID:', lmsData.courseId);

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

          const retryDelay = Math.pow(2, attempt) * 1000;
          console.log(`Retrying LMS course creation in ${retryDelay/1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    await saveRecoveryState(courseId, {
      lmsData,
      progress: 10,
      completedTasks,
      courseTokenUsage,
      timestamp: new Date().toISOString()
    });

    let courseContext = recoveryState?.courseContext;
    if (!courseContext) {
      onProgress?.(10, 'Generating course context...', 'context_generation');
      
      const courseContextPrompt = `
        Course Title: ${course.courseTitle}
        Course Description: ${course.courseDescription}

        Generate a brief, concise context of the overall course based on the course title and description provided. This context will be used as a high-level overview for subsequent lesson content generation.
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
        
        if (contextResult.tokenUsage) {
          courseTokenUsage.prompt_tokens += contextResult.tokenUsage.prompt_tokens || 0;
          courseTokenUsage.completion_tokens += contextResult.tokenUsage.completion_tokens || 0;
          courseTokenUsage.total_tokens += contextResult.tokenUsage.total_tokens || 0;
        }

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
        await supabase.from('api_logs_74621').insert([{
          operation: 'course_context_generation_error',
          request_id: courseGenerationId,
          error: error.message
        }]);
        courseContext = `Course: ${course.courseTitle}. ${course.courseDescription}`;
      }
    }

    let currentTopicIndex = 0;
    let currentLessonIndex = 0;

    if (recoveryState?.currentTopicIndex !== undefined) {
      currentTopicIndex = recoveryState.currentTopicIndex;
      currentLessonIndex = recoveryState.currentLessonIndex || 0;
    }

    for (let i = currentTopicIndex; i < (course.topics?.length || 0); i++) {
      const topic = course.topics[i];
      
      onProgress?.(
        15 + ((i / totalTopics) * 40),
        `Processing topic ${i + 1} of ${totalTopics}: ${topic.topicTitle}`,
        'topic_processing',
        `Creating topic in LMS: ${topic.topicTitle}`,
        {
          currentTopic: topic.topicTitle,
          topicsCompleted: i,
          totalTopics: totalTopics,
          lessonsCompleted: completedTasks / 7,
          totalLessons: totalLessons
        }
      );

      await checkPauseStatus?.();
      if (abortSignal?.aborted) {
        throw new Error('Request aborted by user');
      }

      let topicId;
      if (recoveryState?.topics?.[i]?.topicId) {
        topicId = recoveryState.topics[i].topicId;
        console.log(`Using existing topic ID from recovery state: ${topicId}`);
      } else {
        try {
          const topicResponse = await createTopic(topic, lmsData.courseId, lmsCredentials, abortSignal);
          topicId = topicResponse.data.data;
          console.log(`Created topic with ID: ${topicId}`);

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

      let topicWebSearchContext = '';
      let lessonWebSearchContexts = {};

      if (usePerplexityWebSearch && perplexityApiKey) {
        onTaskUpdate?.(completedTasks, `Generating web search context for topic: ${topic.topicTitle}`);
        
        try {
          const webSearchResult = await generateWebSearchContext(
            perplexityApiKey,
            course,
            topic,
            topic.lessons || [],
            sonarConfig
          );

          topicWebSearchContext = webSearchResult.topicWebSearchContext;
          lessonWebSearchContexts = webSearchResult.lessonWebSearchContexts;
          
          console.log(`✅ Generated web search context for topic: ${topic.topicTitle}`);
          completedTasks++;
        } catch (error) {
          console.error(`Error generating web search context for topic ${topic.topicTitle}:`, error);
        }
      }

      let topicIntroduction = topic.topicIntroduction || recoveryState?.topics?.[i]?.topicIntroduction;
      if (!topicIntroduction) {
        try {
          const topicDetailsPrompt = `
            Course Title: ${course.courseTitle}
            Course Description: ${course.courseDescription}
            Topic Title: ${topic.topicTitle}
            Topic Learning Objective Description: ${topic.topicLearningObjectiveDescription}

            ${topicWebSearchContext ? `
              CURRENT WEB RESEARCH CONTEXT:
              ${topicWebSearchContext}
              
              Please integrate this current research context into your response.
            ` : ''}

            Please generate a detailed topicIntroduction and an immersiveMethodBrief. The immersiveMethodBrief should describe a practical activity or project related to the topic that helps learners apply the concepts.
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
          
          if (topicDetailsResult.tokenUsage) {
            courseTokenUsage.prompt_tokens += topicDetailsResult.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += topicDetailsResult.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += topicDetailsResult.tokenUsage.total_tokens || 0;
          }

          const updatedRecoveryState = await loadRecoveryState(courseId);
          const topics = updatedRecoveryState?.topics || [];
          topics[i] = { ...topics[i], topicIntroduction };
          
          await saveRecoveryState(courseId, { ...updatedRecoveryState, topics });
        } catch (error) {
          console.error(`Error generating topic introduction for ${topic.topicTitle}:`, error);
          topicIntroduction = topic.topicLearningObjectiveDescription;
        }
      }

      // Store lesson contents for quiz and assignment generation
      const topicLessonContents = [];
      const startLessonIndex = i === currentTopicIndex ? currentLessonIndex : 0;

      for (let j = startLessonIndex; j < (topic.lessons?.length || 0); j++) {
        const lesson = topic.lessons[j];
        
        onProgress?.(
          55 + ((completedTasks / totalTasks) * 45),
          `Generating content for lesson ${j + 1} of ${topic.lessons.length}: ${lesson.lessonTitle}`,
          'lesson_generation',
          `Generating lesson content: ${lesson.lessonTitle}`,
          {
            currentTopic: topic.topicTitle,
            currentLesson: lesson.lessonTitle,
            topicsCompleted: i,
            totalTopics: totalTopics,
            lessonsCompleted: completedTasks / 7,
            totalLessons: totalLessons
          }
        );

        await checkPauseStatus?.();
        if (abortSignal?.aborted) {
          throw new Error('Request aborted by user');
        }

        try {
          // ✅ NEW: Part 1 - Generate reading content using RAG with Responses API
          onTaskUpdate?.(completedTasks, `Generating reading content for: ${lesson.lessonTitle}`);
          
          const lessonVectorStoreId = vectorStoreAssignments[lesson.id];
          const topicVectorStoreId = vectorStoreAssignments[topic.id];
          const vectorStoreId = lessonVectorStoreId || topicVectorStoreId;
          const lessonWebSearchContext = lessonWebSearchContexts[`lesson_${lesson.id}_websearchcontext`] || '';

          let readingContent;
          let readingTokenUsage = null;

          if (vectorStoreId) {
            try {
              console.log(`🔍 Using RAG with vector store ${vectorStoreId} for lesson: ${lesson.lessonTitle}`);
              
              const ragResult = await generateReadingContentWithRAG(
                apiKey,
                [vectorStoreId], // Pass as array for the new API
                lesson,
                courseContext,
                topicIntroduction,
                course.mustHaveAspects || '',
                course.designConsiderations || '',
                lessonWebSearchContext,
                'Marketing professionals and business practitioners',
                abortSignal
              );

              readingContent = ragResult.content;
              readingTokenUsage = ragResult.tokenUsage;
              
              console.log(`✅ RAG reading content generated: ${readingContent.length} characters`);
            } catch (ragError) {
              console.error(`Error using RAG for lesson ${lesson.lessonTitle}:`, ragError);
              
              // Fallback to regular content generation
              const lessonContentPrompt = buildLessonPrompt(lesson, topic, courseContext, lessonWebSearchContext);
              const lessonContentResult = await callOpenAI(
                apiKey,
                lessonContentPrompt,
                "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content. Generate content in well-structured HTML format with proper headings, paragraphs, lists, and styling for professional presentation in an LMS.",
                false,
                3,
                abortSignal
              );

              readingContent = lessonContentResult.content;
              readingTokenUsage = lessonContentResult.tokenUsage;
            }
          } else {
            const lessonContentPrompt = buildLessonPrompt(lesson, topic, courseContext, lessonWebSearchContext);
            const lessonContentResult = await callOpenAI(
              apiKey,
              lessonContentPrompt,
              "You are an expert educator and content creator specializing in creating comprehensive, research-backed educational content. Generate content in well-structured HTML format with proper headings, paragraphs, lists, and styling for professional presentation in an LMS.",
              false,
              3,
              abortSignal
            );

            readingContent = lessonContentResult.content;
            readingTokenUsage = lessonContentResult.tokenUsage;
          }

          if (readingTokenUsage) {
            courseTokenUsage.prompt_tokens += readingTokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += readingTokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += readingTokenUsage.total_tokens || 0;
          }

          // Store non-HTML content for quiz/assignment generation
          const plainTextContent = readingContent.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
          topicLessonContents.push(plainTextContent);
          
          completedTasks++;

          // ✅ NEW: Part 2 - Generate additional sections using standard chat completions
          onTaskUpdate?.(completedTasks, `Generating additional sections for: ${lesson.lessonTitle}`);
          
          const additionalSections = await generateAdditionalLessonSections(
            apiKey,
            lesson,
            readingContent,
            lessonWebSearchContext,
            abortSignal
          );

          if (additionalSections.tokenUsage) {
            courseTokenUsage.prompt_tokens += additionalSections.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += additionalSections.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += additionalSections.tokenUsage.total_tokens || 0;
          }

          completedTasks += 5; // FAQ, Latest Developments, Additional Reading, Slides, Voice-over

          // ✅ NEW: Combine all parts into comprehensive lesson content
          const fullLessonContent = {
            readingContent: readingContent,
            faq: additionalSections.faq,
            latestDevelopments: additionalSections.latestDevelopments,
            additionalReading: additionalSections.additionalReading,
            slides: additionalSections.slides,
            voiceOver: additionalSections.voiceOver
          };

          // Create the lesson in the LMS with all formatted content
          await createLesson(lesson, topicId, lmsCredentials, fullLessonContent, abortSignal);
          console.log(`✅ Created comprehensive lesson: ${lesson.lessonTitle}`);
          
          completedTasks++; // LMS creation

          await saveRecoveryState(courseId, {
            lmsData,
            courseContext,
            progress: 55 + ((completedTasks / totalTasks) * 45),
            completedTasks,
            courseTokenUsage,
            currentTopicIndex: i,
            currentLessonIndex: j + 1,
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error(`Error generating content for lesson ${lesson.lessonTitle}:`, error);
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

          await saveRecoveryState(courseId, {
            lmsData,
            courseContext,
            progress: 55 + ((completedTasks / totalTasks) * 45),
            completedTasks,
            courseTokenUsage,
            currentTopicIndex: i,
            currentLessonIndex: j,
            timestamp: new Date().toISOString(),
            error: error.message
          });

          if (abortSignal?.aborted) {
            throw new Error('Request aborted by user');
          }
        }
      }

      // After all lessons for this topic are created, generate quiz and assignment
      if (topicLessonContents.length > 0) {
        const aggregatedLessonContent = topicLessonContents.join('\n\n');

        // Generate Quiz
        onTaskUpdate?.(completedTasks, `Creating quiz for topic: ${topic.topicTitle}`);
        
        try {
          // Step 1: Create quiz shell
          const quizResponse = await createQuiz(topic, topicId, lmsCredentials, abortSignal);
          const quizId = quizResponse.data.data;
          console.log(`Created quiz with ID: ${quizId} for topic: ${topic.topicTitle}`);
          completedTasks++;

          // Step 2: Generate and add questions
          onTaskUpdate?.(completedTasks, `Generating quiz questions for: ${topic.topicTitle}`);
          
          const questionsData = await generateQuizQuestions(apiKey, aggregatedLessonContent, abortSignal);
          
          if (questionsData && Array.isArray(questionsData)) {
            for (const questionData of questionsData) {
              let formattedQuestionData;
              
              if (questionData.question_type === 'fill_in_the_blank') {
                formattedQuestionData = {
                  question_title: "Fill up the gaps",
                  question_type: "fill_in_the_blank",
                  question: questionData.question,
                  correct_answer: questionData.correct_answer_fill
                };
              } else if (questionData.question_type === 'single_choice') {
                formattedQuestionData = {
                  question_title: questionData.question_title,
                  question_type: "single_choice",
                  options: questionData.options,
                  correct_answer: Array.isArray(questionData.correct_answer) 
                    ? questionData.correct_answer[0] 
                    : questionData.correct_answer
                };
              } else { // multiple_choice
                formattedQuestionData = {
                  question_title: questionData.question_title,
                  question_type: "multiple_choice",
                  options: questionData.options,
                  correct_answer: Array.isArray(questionData.correct_answer) 
                    ? questionData.correct_answer 
                    : [questionData.correct_answer]
                };
              }

              try {
                await createQuizQuestion(quizId, formattedQuestionData, lmsCredentials, abortSignal);
                console.log(`Added question: ${formattedQuestionData.question_title}`);
              } catch (questionError) {
                console.error(`Error adding quiz question:`, questionError);
              }
            }
          }

          if (questionsData && questionsData.tokenUsage) {
            courseTokenUsage.prompt_tokens += questionsData.tokenUsage.prompt_tokens || 0;
            courseTokenUsage.completion_tokens += questionsData.tokenUsage.completion_tokens || 0;
            courseTokenUsage.total_tokens += questionsData.tokenUsage.total_tokens || 0;
          }
          
          completedTasks++;
        } catch (quizError) {
          console.error(`Error creating quiz for topic ${topic.topicTitle}:`, quizError);
          await supabase.from('api_logs_74621').insert([{
            operation: 'quiz_creation_error',
            request_id: courseGenerationId,
            error: quizError.message,
            request_data: {
              topic_title: topic.topicTitle,
              topic_index: i
            }
          }]);
        }

        // Generate Assignment
        onTaskUpdate?.(completedTasks, `Creating assignment for topic: ${topic.topicTitle}`);
        
        try {
          const assignmentData = await generateAssignmentContent(apiKey, aggregatedLessonContent, abortSignal);
          
          if (assignmentData) {
            await createAssignment(topicId, assignmentData, lmsCredentials, abortSignal);
            console.log(`Created assignment: ${assignmentData.title} for topic: ${topic.topicTitle}`);

            if (assignmentData.tokenUsage) {
              courseTokenUsage.prompt_tokens += assignmentData.tokenUsage.prompt_tokens || 0;
              courseTokenUsage.completion_tokens += assignmentData.tokenUsage.completion_tokens || 0;
              courseTokenUsage.total_tokens += assignmentData.tokenUsage.total_tokens || 0;
            }
          }
          
          completedTasks++;
        } catch (assignmentError) {
          console.error(`Error creating assignment for topic ${topic.topicTitle}:`, assignmentError);
          await supabase.from('api_logs_74621').insert([{
            operation: 'assignment_creation_error',
            request_id: courseGenerationId,
            error: assignmentError.message,
            request_data: {
              topic_title: topic.topicTitle,
              topic_index: i
            }
          }]);
        }
      }
    }

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

// Helper function to build lesson prompt with HTML formatting emphasis
const buildLessonPrompt = (lesson, topic, courseContext, webSearchContext = '') => {
  let lessonContentPrompt = `
    Course Context: ${courseContext}
    Topic Title: ${topic.topicTitle}
    Topic Introduction: ${topic.topicIntroduction || topic.topicLearningObjectiveDescription}
    Lesson Title: ${lesson.lessonTitle}
    Lesson Description: ${lesson.lessonDescription}
  `;

  if (webSearchContext && webSearchContext.trim()) {
    lessonContentPrompt += `
      RECENT WEB RESEARCH CONTEXT (Use as highest priority context):
      ${webSearchContext}
      
      Please integrate this current web research throughout the lesson content where relevant, using it to provide:
      - Current examples and case studies
      - Latest statistics and trends
      - Recent developments in the field
      - Up-to-date best practices and methodologies
    `;
  }

  if (topic.additionalContext && topic.additionalContext.trim()) {
    lessonContentPrompt += `
      TOPIC ADDITIONAL CONTEXT (Research/Statistics/Latest Findings):
      ${topic.additionalContext}
      
      Please integrate this additional context throughout the lesson content where relevant.
    `;
  }

  if (lesson.additionalContext && lesson.additionalContext.trim()) {
    lessonContentPrompt += `
      LESSON-SPECIFIC ADDITIONAL CONTEXT:
      ${lesson.additionalContext}
      
      Please incorporate this lesson-specific context into the content.
    `;
  }

  lessonContentPrompt += `
    Generate comprehensive lesson reading content that is approximately 1600-1800 words in well-structured HTML format.

    IMPORTANT: Your response must be in clean, semantic HTML format suitable for an LMS. Use the following structure:

    <div class="lesson-content">
      <h1>Lesson Title Here</h1>
      
      <div class="lesson-overview">
        <h2>Overview</h2>
        <p>Brief lesson overview...</p>
      </div>
      
      <div class="learning-objectives">
        <h2>Learning Objectives</h2>
        <ul>
          <li>Objective 1</li>
          <li>Objective 2</li>
        </ul>
      </div>
      
      <div class="main-content">
        <h2>Main Content Section</h2>
        <p>Detailed content with proper paragraphs...</p>
        
        <h3>Subsection Title</h3>
        <p>More content...</p>
        
        <div class="highlight-box">
          <h4>Key Point</h4>
          <p>Important information highlighted...</p>
        </div>
      </div>
      
      <div class="case-study">
        <h2>Case Study</h2>
        <h3>Case Study Title</h3>
        <p>Detailed case study content...</p>
      </div>
      
      <div class="key-takeaways">
        <h2>Key Takeaways</h2>
        <ul>
          <li>Key point 1</li>
          <li>Key point 2</li>
        </ul>
      </div>
      
      <div class="common-misconceptions">
        <h2>Common Misconceptions</h2>
        <div class="warning-box">
          <h4>Misconception: [Title]</h4>
          <p><strong>Reality:</strong> Correct information...</p>
        </div>
      </div>
      
      <div class="practical-application">
        <h2>Practical Application</h2>
        <p>How to apply this knowledge...</p>
      </div>
    </div>

    Include:
    1. A structured lesson with clear HTML headings (h1, h2, h3)
    2. Key concepts explained with examples in proper paragraphs
    3. A relevant case study that illustrates the concepts
    4. Highlighted key points and important information
    5. A section on common misconceptions about the topic
    6. Practical application examples
    7. Use semantic HTML tags like <strong>, <em>, <ul>, <ol>, <li>
    8. Add CSS classes for styling: highlight-box, warning-box, success-box, case-study

    The content should be educational, engaging, and professionally formatted for display in TutorLMS.
  `;

  if (webSearchContext || (topic.additionalContext && topic.additionalContext.trim()) || (lesson.additionalContext && lesson.additionalContext.trim())) {
    lessonContentPrompt += `
      IMPORTANT: Make sure to weave in the provided context naturally throughout the HTML lesson content, using it to enhance explanations, provide current examples, support key points with statistics or research, and add credibility to the content. Prioritize web research context for the most current information.

      Format all content in clean, semantic HTML that will display beautifully in an LMS environment.
    `;
  }

  return lessonContentPrompt;
};

// Generate topic and lesson structure for a course
export const generateCourseTopicsAndLessons = async (course, programContext, summaryProgramContext, mustHaveAspects, designConsiderations, apiKey) => {
  try {
    console.log(`Generating detailed topics and lessons for course: ${course.courseTitle}`);

    const topicGenerationPrompt = `
      GENERATE DETAILED COURSE OUTLINE BASED ON CONTEXT:

      Act as an expert curriculum architect. You are designing one course within a larger MicroMasters program. Your task is to create the complete, detailed curriculum map for this single course.

      ### CONTEXT ###
      Overall Context: ${summaryProgramContext}
      - Current Course being designed: ${course.courseTitle}
      - Course's Role in Program, Learning objectives and Course description: ${course.courseDescription}

      Must Have aspects in the course: ${mustHaveAspects}
      Other Design Considerations: ${designConsiderations}

      ### TASK ###
      Given the above context, Generate the complete curriculum map for ONLY the course specified above. Your output MUST be a single raw JSON object.

      CRITICAL REQUIREMENTS:
      - Generate exactly 5-6 comprehensive topics for this course
      - Each topic MUST have exactly 4-5 detailed lessons
      - Each lesson description must be 150-200 words explaining learning objectives, activities, and outcomes
      - Topics must build progressively and logically
      - Content must be practical and industry-relevant
      - Each topic and lesson must have unique, relevant titles and descriptions
      - No generic placeholder content - everything must be specific to this course

      The JSON object must have this exact structure:
      {
        "topics": [
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
        ]
      }

      Generate exactly 5-6 topics with 4-5 lessons each. Each lesson description must be detailed and comprehensive (150-200 words).
    `;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14", // Updated to new model
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
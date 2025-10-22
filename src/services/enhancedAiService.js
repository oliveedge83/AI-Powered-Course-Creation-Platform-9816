import axios from 'axios';
    import {supabase} from '../lib/supabase';
    import {callPerplexityAPI} from './perplexityService';
    import {generateTwoStageRAGContent,generateFallbackContent} from './enhancedRagService';
    import {createLMSService} from './lms/lmsServiceFactory';
    import {LMS_TYPES} from './lms/lmsTypes';
    import {getEffectiveDesignParameters} from './instructionalParameterService';
    
    // ✅ NEW: Import AITable service
    import {
      validateAITableCredentials,
      postCourseToAITable,
      generateLessonSlidesJson,
      generateTopicLessonStructure,
      generateCourseUniqueId,
    } from './aitableService';
    
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
              request_data: {message: 'Initial table setup'},
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
              await supabase.rpc('create_token_usage_table', {
                table_name: 'token_usage_74621',
              });
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
                is_estimate: true,
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
            await supabase.rpc('create_recovery_state', {
              table_name: 'recovery_state_74621',
            });
          } catch (rpcError) {
            console.error('Failed to create recovery state table:', rpcError);
            await supabase.from('recovery_state_74621').insert({
              course_id: 'initial_setup',
              state_data: {message: 'Initial table setup'},
              updated_at: new Date().toISOString(),
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
            {course_id: courseId, state_data: state, updated_at: new Date().toISOString()},
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
    
    // ✅ FIXED: Generate web search context using Perplexity Sonar with corrected configuration
    const generateWebSearchContext = async (
      perplexityApiKey,
      course,
      topic,
      lessons,
      sonarConfig = null,
      lessonMaxTokens = 400
    ) => {
      try {
        console.log(`🔍 Generating web search context for topic: ${topic.topicTitle}`);
        const lessonContexts = {};
    
        // ✅ CORRECTED: Updated default configuration with valid search_mode values
        const defaultConfig = {
          sonarModel: 'sonar',
          searchMode: 'web', // ✅ FIXED: Changed from 'web_search' to 'web'
          searchContextSize: 'medium',
          searchRecency: 'month',
          domainFilter: '',
          temperature: 0.3,
          maxTokens: 1400,
          lessonMaxTokens: 400,
          country: '',
          region: '',
          city: '',
        };
        const config = sonarConfig || defaultConfig;
    
        // ✅ CORRECTED: Build Perplexity options with valid parameters
        const buildPerplexityOptions = (maxTokens) => {
          const options = {
            model: config.sonarModel,
            maxTokens: maxTokens,
            temperature: config.temperature,
          };
    
          // ✅ FIXED: Only add search parameters for sonar models with correct values
          if (config.sonarModel.includes('sonar')) {
            // ✅ CORRECTED: Use 'web' instead of 'web_search'
            options.search_mode = config.searchMode === 'web_search' ? 'web' : config.searchMode;
    
            // ✅ FIXED: Simplified web search options structure
            options.web_search_options = {};
    
            // Add search context size if supported
            if (
              config.searchContextSize &&
              ['low', 'medium', 'high'].includes(config.searchContextSize)
            ) {
              options.web_search_options.search_context_size = config.searchContextSize;
            }
    
            // Add recency filter if supported
            if (
              config.searchRecency &&
              ['day', 'week', 'month', 'year'].includes(config.searchRecency)
            ) {
              options.web_search_options.search_recency_filter = config.searchRecency;
            }
    
            // Add domain filter if provided and valid
            if (config.domainFilter && config.domainFilter.trim()) {
              const domains = config.domainFilter
                .split(',')
                .map((d) => d.trim())
                .filter((d) => d);
              if (domains.length > 0) {
                options.web_search_options.search_domain_filter = domains;
              }
            }
    
            // Add user location if provided
            if (config.country || config.region || config.city) {
              options.user_location = {};
              if (config.country) options.user_location.country = config.country;
              if (config.region) options.user_location.region = config.region;
              if (config.city) options.user_location.city = config.city;
            }
          }
          return options;
        };
    
        // Generate topic-level web search context
        const topicSearchPrompt = `
        Search for the latest trends, statistics, and developments related to "${topic.topicTitle}" in the context of "${course.courseTitle}".
        Focus on:
        - Current industry trends and developments (2024-2025)
        - Recent statistics and market data
        - Latest tools, technologies, and methodologies
        - Expert insights and best practices
        - Real-world case studies and examples
        Provide a comprehensive overview that can be used as context for educational content generation.
      `;
    
        console.log(`📡 Making topic-level Perplexity API call...`);
        console.log(`🔧 Using search_mode: ${config.searchMode === 'web_search' ? 'web' : config.searchMode}`);
        const topicResult = await callPerplexityAPI(
          perplexityApiKey,
          topicSearchPrompt,
          config.sonarModel,
          buildPerplexityOptions(config.maxTokens)
        );
        console.log(
          `✅ Topic-level web search context generated: ${topicResult.content.length} characters`
        );
    
        // Generate lesson-specific web search contexts
        for (const lesson of lessons) {
          const lessonSearchPrompt = `
          Search for specific, current information about "${lesson.lessonTitle}" in the context of "${topic.topicTitle}" and "${course.courseTitle}".
          Find:
          - Recent developments and updates (last 6 months)
          - Specific statistics and data points
          - Current best practices and methodologies
          - Real-world examples and case studies
          - Expert quotes and insights
          - Latest tools and technologies
          Provide focused, actionable information that can enhance lesson content with current, real-world context.
        `;
          try {
            console.log(
              `📡 Making lesson-level Perplexity API call for: ${lesson.lessonTitle}`
            );
            const lessonResult = await callPerplexityAPI(
              perplexityApiKey,
              lessonSearchPrompt,
              config.sonarModel,
              buildPerplexityOptions(config.lessonMaxTokens) // ✅ UPDATED
            );
            lessonContexts[`lesson_${lesson.id}_websearchcontext`] = lessonResult.content;
            console.log(
              `✅ Lesson-level web search context generated for: ${lesson.lessonTitle} (${lessonResult.content.length} characters)`
            );
            // Add delay to respect rate limits
            await new Promise((resolve) => setTimeout(resolve, 1000));
          } catch (error) {
            console.error(
              `❌ Error generating web search context for lesson ${lesson.lessonTitle}:`,
              error
            );
            lessonContexts[`lesson_${lesson.id}_websearchcontext`] = '';
          }
        }
    
        console.log(`🎉 Web search context generation completed for topic: ${topic.topicTitle}`);
        console.log(
          `📊 Generated contexts: Topic (${topicResult.content.length} chars) + ${
            Object.keys(lessonContexts).length
          } lessons`
        );
    
        return {
          topicWebSearchContext: topicResult.content,
          lessonWebSearchContexts: lessonContexts,
        };
      } catch (error) {
        console.error('❌ Error generating web search context:', error);
        if (error.response && error.response.data && error.response.data.error) {
          console.error('🚨 Perplexity API Error Details:', error.response.data.error);
        }
        return {topicWebSearchContext: '', lessonWebSearchContexts: {}};
      }
    };
    
    // ✅ UPDATED: Generate reading content using Two-Stage RAG approach with design parameters
    const generateReadingContentWithTwoStageRAG = async (
      apiKey,
      vectorStoreIds,
      lessonData,
      topicData,
      courseContext,
      mustHaveAspects,
      designConsiderations,
      webSearchContext = '',
      audienceContext = '', // ✅ CHANGED: Allow dynamic audience
      designParameters = {}, // ✅ NEW: Design parameters
      abortSignal = null
    ) => {
      try {
        console.log(
          `🎯 Starting Two-Stage RAG reading content generation for lesson: ${lessonData.lessonTitle}`
        );
        console.log(`⚙️ Using design parameters:`, designParameters);
        console.log(
          `👥 Using audience context: ${audienceContext || 'Default (Procure to pay professionals)'}`
        );
    
        // Log the prompts being passed
        const stage1SystemPrompt = `Act as a senior instructional designer. Output strictly as HTML, concise and practical. Audience is procure to pay professionals.`;
        const stage1UserPrompt = `Generate the <b>readingContent</b> (1000-1200 words in HTML) for the lesson "${lessonData.lessonTitle}" and lesson description "${lessonData.lessonDescription}", under topic "${topicData.topicTitle}" using the relevant reference from the attached documents from the reference library using file_search tool. Focus on: - Core concepts and principles from the reference materials - Best practices and methodologies from the documents - Technical details and implementation guidance - Industry standards and frameworks mentioned in the files Use the attached files as your primary source of authoritative information. Structure the content with proper HTML headings, paragraphs, and lists.`;
        console.log('--- STAGE 1 RAG PROMPT ---');
        console.log('System Prompt:', stage1SystemPrompt);
        console.log('User Prompt:', stage1UserPrompt);
        console.log('--------------------------');
    
        // Use the new two-stage RAG service with design parameters
        const result = await generateTwoStageRAGContent(
          apiKey,
          vectorStoreIds,
          lessonData,
          topicData,
          courseContext,
          mustHaveAspects,
          designConsiderations,
          webSearchContext,
          audienceContext || 'Procure to pay professionals', // ✅ CHANGED: Use dynamic audience
          designParameters, // ✅ NEW: Pass design parameters
          abortSignal
        );
        console.log(`✅ Two-Stage RAG reading content generated successfully`);
        console.log(`📊 Metadata:`, result.metadata);
        return result;
      } catch (error) {
        console.error('❌ Error in Two-Stage RAG reading content generation:', error);
        // Fallback to non-RAG generation
        console.log('🔄 Falling back to standard content generation...');
        try {
          const fallbackResult = await generateFallbackContent(
            apiKey,
            lessonData,
            topicData,
            courseContext,
            mustHaveAspects,
            designConsiderations,
            webSearchContext,
            audienceContext || 'Procure to pay professionals', // ✅ CHANGED: Use dynamic audience
            designParameters, // ✅ NEW: Pass design parameters
            abortSignal
          );
          console.log(`✅ Fallback content generation completed`);
          return {
            ...fallbackResult,
            metadata: {
              usedRAG: false,
              usedWebSearch: !!webSearchContext,
              usedDesignParameters: Object.keys(designParameters).length > 0,
              fallbackUsed: true,
              contentLength: fallbackResult.content.length,
            },
          };
        } catch (fallbackError) {
          console.error('❌ Fallback content generation also failed:', fallbackError);
          throw fallbackError;
        }
      }
    };
    
    // ✅ REFACTORED: Generate additional lesson sections in a single API call
    const generateAdditionalLessonSections = async (
      apiKey,
      lessonData,
      readingContent,
      webSearchContext = '',
      designParameters = {},
      abortSignal = null
    ) => {
      try {
        console.log(
          `📝 Generating additional sections for lesson: ${lessonData.lessonTitle} in a single API call.`
        );
        const plainTextContent = readingContent
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
    
        const systemPrompt = `You are an expert educational content creator. Based on the provided lesson content, generate three additional sections (FAQ, Latest Developments, Additional Reading) in a single, valid JSON object.
    CRITICAL: Your final output MUST be a single, valid JSON object and nothing else. It must start with { and end with }. Do not include any explanatory text, markdown code blocks (like \`\`\`json), or any other characters before or after the JSON object.
    The JSON object must have the following structure, with each value being a string containing well-structured HTML:
    {"faq": "<div class='faq-container'>...</div>", "latestDevelopments": "<div class='latest-developments'>...</div>", "additionalReading": "<div class='additional-resources'>...</div>"}
    Apply the following instructional approach based on design parameters: ${
      Object.keys(designParameters).length > 0
        ? `- Domain: ${designParameters.courseDomain || 'business-management'}
      - Audience Level: ${designParameters.targetAudienceLevel || 'intermediate'}
      - Tone & Style: ${designParameters.courseToneStyle || 'professional-business'}
      - Content Focus: ${designParameters.contentFocus || 'practical-application'}`
        : 'Use professional business approach for intermediate audience with practical focus.'
    }
    ${webSearchContext ? `Recent Web Research Context: ${webSearchContext}` : ''}`;
    
        const userPrompt = `Based on the lesson content below, generate the FAQ, Latest Developments, and Additional Reading sections.
    Lesson Title: ${lessonData.lessonTitle}
    Lesson Description: ${lessonData.lessonDescription}
    Reading Content (first 2000 chars): ${plainTextContent.substring(0, 2000)}...
    
    For each section:
    1. **FAQ**: Create 6-8 common questions with detailed, practical HTML answers.
    2. **Latest Developments**: Highlight recent industry trends, innovations, and updates (2024-2025) in HTML, using the web search context if available.
    3. **Additional Reading**: Provide a comprehensive list of books, articles, and other resources in a structured HTML format.
    
    Remember to return ONLY the valid JSON object.`;
    
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4.1-mini-2025-04-14',
            messages: [
              {role: 'system', content: systemPrompt},
              {role: 'user', content: userPrompt},
            ],
            max_tokens: 2000,
            temperature: 0.6,
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            signal: abortSignal,
          }
        );
    
        const rawContent = response.data.choices[0].message.content;
        let cleanContent = rawContent.trim();
        const jsonStart = cleanContent.indexOf('{');
        const jsonEnd = cleanContent.lastIndexOf('}');
    
        if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
          console.error('❌ No JSON found in response for additional sections:', cleanContent);
          throw new Error('No valid JSON object found in AI response for additional sections.');
        }
    
        const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
        const parsedData = JSON.parse(jsonString);
    
        console.log(`✅ Additional lesson sections generated successfully in one call.`);
        return {
          faq: parsedData.faq || '',
          latestDevelopments: parsedData.latestDevelopments || '',
          additionalReading: parsedData.additionalReading || '',
          tokenUsage: response.data.usage,
        };
      } catch (error) {
        console.error('❌ Error generating additional lesson sections:', error);
        // Return empty sections on failure to avoid crashing the whole process
        return {
          faq: '',
          latestDevelopments: '',
          additionalReading: '',
          tokenUsage: {prompt_tokens: 0, completion_tokens: 0, total_tokens: 0},
        };
      }
    };
    
    // Enhanced OpenAI API call function with logging, retry logic, and rate limit handling
    const callOpenAI = async (
      apiKey,
      prompt,
      systemPrompt,
      useGPT4 = false,
      retries = 3,
      abortSignal = null
    ) => {
      let lastError;
      let tokenUsage = null;
      const startTime = new Date();
      const modelName = useGPT4 ? 'gpt-4o' : 'gpt-4.1-mini-2025-04-14';
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    
      try {
        await supabase.from('api_logs_74621').insert([
          {
            operation: 'openai_api_call',
            request_id: requestId,
            request_data: {
              model: modelName,
              prompt_length: prompt.length,
              system_prompt: systemPrompt,
              timestamp: new Date().toISOString(),
            },
          },
        ]);
      } catch (logError) {
        console.error('Failed to log API call:', logError);
      }
    
      for (let attempt = 1; attempt <= retries + 1; attempt++) {
        try {
          console.log(`API call attempt ${attempt}/${retries + 1} using model: ${modelName}`);
          console.log(`Prompt length: ${prompt.length} characters`);
    
          const baseTimeout = 60000;
          const charPerSec = 1000;
          const estimatedTime = Math.min(
            180000,
            Math.max(baseTimeout, (prompt.length / charPerSec) * 1000)
          );
    
          const callStartTime = new Date();
          const response = await axios.post(
            'https://api.openai.com/v1/chat/completions',
            {
              model: modelName,
              messages: [
                {role: 'system', content: systemPrompt},
                {role: 'user', content: prompt},
              ],
              temperature: 0.5, // ✅ UPDATED: Legacy content generation temperature
            },
            {
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              timeout: estimatedTime,
              signal: abortSignal,
            }
          );
          const endTime = new Date();
          const duration = (endTime - callStartTime) / 1000;
          const totalDuration = (endTime - startTime) / 1000;
          console.log(
            `API call completed in ${duration} seconds (total with retries: ${totalDuration}s)`
          );
    
          tokenUsage = {
            prompt_tokens: response.data.usage?.prompt_tokens || 0,
            completion_tokens: response.data.usage?.completion_tokens || 0,
            total_tokens: response.data.usage?.total_tokens || 0,
          };
    
          try {
            await supabase.from('api_logs_74621').insert([
              {
                operation: 'openai_api_success',
                request_id: requestId,
                request_data: {
                  model: modelName,
                  duration_seconds: duration,
                  total_duration_seconds: totalDuration,
                  attempts: attempt,
                },
                response_data: {
                  completion_tokens: tokenUsage.completion_tokens,
                  prompt_tokens: tokenUsage.prompt_tokens,
                  total_tokens: tokenUsage.total_tokens,
                },
              },
            ]);
            await supabase.from('token_usage_74621').insert([
              {
                model: modelName,
                prompt_tokens: tokenUsage.prompt_tokens,
                completion_tokens: tokenUsage.completion_tokens,
                total_tokens: tokenUsage.total_tokens,
                operation_type: 'content_generation',
                request_id: requestId,
                duration_seconds: duration,
              },
            ]);
          } catch (logError) {
            console.error('Failed to log API success:', logError);
          }
    
          return {content: response.data.choices[0].message.content, tokenUsage};
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
            console.log(`Rate limited. Waiting ${retryDelay / 1000} seconds before retry...`);
          }
    
          try {
            await supabase.from('api_logs_74621').insert([
              {
                operation: 'openai_api_error',
                request_id: requestId,
                error: error.message,
                request_data: {
                  model: modelName,
                  attempt: attempt,
                  retry_delay: retryDelay / 1000,
                },
                response_data: error.response
                  ? {
                      status: error.response.status,
                      statusText: error.response.statusText,
                      headers: error.response.headers,
                      data: error.response.data,
                    }
                  : null,
              },
            ]);
          } catch (logError) {
            console.error('Failed to log API error:', logError);
          }
    
          if (attempt <= retries) {
            console.log(`Retrying in ${retryDelay / 1000} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, retryDelay));
          }
        }
      }
    
      throw lastError;
    };
    
    // NEW: Generate quiz questions using AI
    const generateQuizQuestions = async (apiKey, aggregatedLessonContent, abortSignal = null) => {
      const systemPrompt = `Based on the provided lesson content, generate 10 quiz questions of varying types (single choice, multiple choice, and fill-in-the-blanks).
    For each question, provide the question title, options (where applicable), and the correct answer(s).
    Ensure the questions are relevant and directly test the learner's understanding of the material.
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
        const result = await callOpenAI(apiKey, userPrompt, systemPrompt, false, 3, abortSignal);
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
      const systemPrompt = `Based on the provided lesson content, generate a practical assignment.
    Create a clear title and a detailed assignment description in HTML format.
    The assignment should require the learner to apply the concepts taught in the topic.
    Return the response as a JSON object with the following structure:
    {"title": "Assignment title here", "content": "<p>Assignment content in HTML format here</p>"}
    The assignment should:
    - Be practical and hands-on
    - Require application of learned concepts
    - Include clear instructions and deliverables
    - Be appropriate for the skill level
    - Include evaluation criteria`;
    
      const userPrompt = `Lesson Content: ${aggregatedLessonContent}`;
    
      try {
        const result = await callOpenAI(apiKey, userPrompt, systemPrompt, false, 3, abortSignal);
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
    
    // ✅ UPDATED: Extracts the target audience from program context, now handles both JSON and old text formats.
    export const extractAudienceFromContext = (programContext) => {
      if (!programContext) return 'Procure to pay professionals';
    
      // 1. Try to parse as JSON (new format)
      try {
        const contextJson = JSON.parse(programContext);
        if (contextJson.targetAudience) {
          console.log(
            `✅ Extracted Target Audience from JSON: ${contextJson.targetAudience}`
          );
          return contextJson.targetAudience;
        }
      } catch (e) {
        // Not a JSON string, proceed to regex parsing for backward compatibility
        console.log(
          'Context is not JSON, falling back to regex parsing for backward compatibility.'
        );
      }
    
      // 2. Fallback to regex parsing (old format)
      const match = programContext.match(/- "targetAudience":\s*"(.*?)"/);
      if (match && match[1]) {
        console.log(`✅ Extracted Target Audience via Regex: ${match[1]}`);
        return match[1];
      }
    
      console.warn('⚠️ Could not extract target audience from context, using default.');
      return 'Procure to pay professionals';
    };
    
    // ✅ UPDATED: Enhanced course content generation with LMS Factory Pattern, Design Parameters, and AITable Integration
    export const generateCourseContent = async (
      course,
      lmsCredentials,
      apiKey,
      progressCallbacks = {},
      vectorStoreAssignments = {},
      webSearchOptions = {},
      programContext = {}, // ✅ NEW: Program context for design parameters
      aitableCredentials = null // ✅ NEW: AITable credentials
    ) => {
      const {onProgress, onTaskUpdate, checkPauseStatus, getAbortSignal, updateGenerationStatus} =
        progressCallbacks;
      const {usePerplexityWebSearch = false, perplexityApiKey = null, sonarConfig = null, lessonMaxTokens = 400} =
        webSearchOptions;
    
      let courseTokenUsage = {
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      };
      const courseGenerationId = `course_gen_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 7)}`;
      const startTime = new Date();
    
      // ✅ NEW: AITable validation and setup
      let aitableValidated = false;
      let aitableConfig = null;
    
      try {
        console.log(
          '🚀 Starting enhanced course content generation with LMS Factory Pattern, Design Parameters, and AITable Integration...'
        );
        console.log(
          `📊 LMS Type: ${lmsCredentials.lmsType || 'tutor'} (${
            lmsCredentials.lmsType === LMS_TYPES.LIFTER ? 'LifterLMS' : 'TutorLMS'
          })`
        );
    
        // ✅ NEW: Validate AITable credentials if provided
        if (
          aitableCredentials &&
          aitableCredentials.isActive &&
          aitableCredentials.apiKey &&
          aitableCredentials.datasheetId
        ) {
          console.log('🔍 Validating AITable credentials...');
          try {
            const validation = await validateAITableCredentials(
              aitableCredentials.apiKey,
              aitableCredentials.datasheetId
            );
            if (validation.isValid) {
              aitableValidated = true;
              aitableConfig = aitableCredentials;
              console.log(
                '✅ AITable credentials validated - course data will be posted after successful generation'
              );
            } else {
              console.warn('⚠️ AITable validation failed:', validation.error);
              console.warn('⚠️ Continuing without AITable integration');
            }
          } catch (error) {
            console.error('❌ Error validating AITable credentials:', error);
            console.warn('⚠️ Continuing without AITable integration');
          }
        }
    
        const abortSignal = getAbortSignal?.();
        const totalTopics = course.topics?.length || 0;
        const totalLessons =
          course.topics?.reduce((total, topic) => total + (topic.lessons?.length || 0), 0) || 0;
        const webSearchTasks = usePerplexityWebSearch ? totalTopics : 0;
        // ✅ UPDATED: Correct task calculation
        const totalTasks = totalLessons * 3 + totalTopics * 3 + webSearchTasks;
        updateGenerationStatus?.({totalTasks});
    
        let completedTasks = 0;
        const courseId = course.id || `temp_${Date.now()}`;
    
        const recoveryState = await loadRecoveryState(courseId);
        if (recoveryState) {
          console.log('Found recovery state, resuming from previous session');
          onProgress?.(
            recoveryState.progress || 5,
            'Resuming course generation from previous session...',
            'resuming'
          );
          completedTasks = recoveryState.completedTasks || 0;
          courseTokenUsage = recoveryState.courseTokenUsage || courseTokenUsage;
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
    
        await supabase.from('api_logs_74621').insert([
          {
            operation: 'content_generation_start',
            request_id: courseGenerationId,
            request_data: {
              course_title: course.courseTitle,
              course_id: courseId,
              topics_count: totalTopics,
              total_lessons: totalLessons,
              use_web_search: usePerplexityWebSearch,
              sonar_config: sonarConfig,
              is_resumed: !!recoveryState,
              lms_type: lmsCredentials.lmsType || 'tutor',
              has_design_parameters: !!(
                course.designParameters || programContext.designParameters
              ),
              aitable_enabled: aitableValidated,
            },
          },
        ]);
    
        // ✅ NEW: Extract target audience from program context
        const audienceContext = extractAudienceFromContext(programContext.programContext);
    
        // ✅ NEW: Create LMS service using factory pattern
        console.log(`🏭 Creating ${lmsCredentials.lmsType || 'tutor'} LMS service...`);
        const lmsService = createLMSService(
          lmsCredentials.lmsType || LMS_TYPES.TUTOR,
          lmsCredentials
        );
        console.log(`✅ LMS Service created: ${lmsService.getLMSType()}`);
    
        onProgress?.(5, 'Creating course in LMS...', 'course_creation');
        let lmsData = null;
        if (recoveryState?.lmsData) {
          lmsData = recoveryState.lmsData;
          console.log('Using existing LMS course data from recovery state:', lmsData);
        } else {
          for (let attempt = 1; attempt <= 3; attempt++) {
            try {
              const courseResponse = await lmsService.createCourse(course, abortSignal);
              lmsData = {courseId: courseResponse.data.data};
              console.log('Created course with ID:', lmsData.courseId);
    
              try {
                await supabase.from('courses').insert({
                  program_id: course.programId || null,
                  course_title: course.courseTitle,
                  course_description: course.courseDescription,
                  wordpress_course_id: lmsData.courseId,
                  status: 'in_progress',
                  lms_type: lmsService.getLMSType(),
                });
                console.log('Course data stored in Supabase');
              } catch (dbError) {
                console.error('Failed to store course data in Supabase:', dbError);
              }
    
              break;
            } catch (error) {
              console.error(`LMS course creation attempt ${attempt} failed:`, error);
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'lms_course_creation_error',
                  request_id: courseGenerationId,
                  error: error.message,
                  request_data: {
                    attempt,
                    course_title: course.courseTitle,
                    lms_type: lmsService.getLMSType(),
                  },
                },
              ]);
              if (attempt === 3) {
                throw new Error(
                  `Failed to create course in ${lmsService.getLMSType()} LMS after multiple attempts`
                );
              }
              const retryDelay = Math.pow(2, attempt) * 1000;
              console.log(`Retrying LMS course creation in ${retryDelay / 1000} seconds...`);
              await new Promise((resolve) => setTimeout(resolve, retryDelay));
            }
          }
        }
    
        await saveRecoveryState(courseId, {
          lmsData,
          progress: 10,
          completedTasks,
          courseTokenUsage,
          timestamp: new Date().toISOString(),
        });
    
        let courseContextText = recoveryState?.courseContext;
        if (!courseContextText) {
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
              'You are a concise educational content summarizer.',
              false,
              3,
              abortSignal
            );
            courseContextText = contextResult.content;
            if (contextResult.tokenUsage) {
              courseTokenUsage.prompt_tokens += contextResult.tokenUsage.prompt_tokens || 0;
              courseTokenUsage.completion_tokens +=
                contextResult.tokenUsage.completion_tokens || 0;
              courseTokenUsage.total_tokens += contextResult.tokenUsage.total_tokens || 0;
            }
            await saveRecoveryState(courseId, {
              lmsData,
              courseContext: courseContextText,
              progress: 15,
              completedTasks,
              courseTokenUsage,
              timestamp: new Date().toISOString(),
            });
          } catch (error) {
            console.error('Error generating course context:', error);
            await supabase.from('api_logs_74621').insert([
              {
                operation: 'course_context_generation_error',
                request_id: courseGenerationId,
                error: error.message,
              },
            ]);
            courseContextText = `Course: ${course.courseTitle}. ${course.courseDescription}`;
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
            15 + (i / totalTopics) * 40,
            `Processing topic ${i + 1} of ${totalTopics}: ${topic.topicTitle}`,
            'topic_processing',
            `Creating topic in LMS: ${topic.topicTitle}`,
            {
              currentTopic: topic.topicTitle,
              topicsCompleted: i,
              totalTopics: totalTopics,
              lessonsCompleted: Math.floor(completedTasks / 3),
              totalLessons: totalLessons,
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
              // ✅ Use unified LMS service for topic creation
              const topicResponse = await lmsService.createTopic(
                topic,
                lmsData.courseId,
                abortSignal
              );
              topicId = topicResponse.data.data;
              console.log(`Created topic with ID: ${topicId} using ${lmsService.getLMSType()}`);
    
              const updatedRecoveryState = await loadRecoveryState(courseId);
              const topics = updatedRecoveryState?.topics || [];
              topics[i] = {...topics[i], topicId};
              await saveRecoveryState(courseId, {
                ...updatedRecoveryState,
                topics,
                currentTopicIndex: i,
                currentLessonIndex: 0,
              });
            } catch (error) {
              console.error(`Error creating topic ${topic.topicTitle}:`, error);
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'topic_creation_error',
                  request_id: courseGenerationId,
                  error: error.message,
                  request_data: {
                    topic_title: topic.topicTitle,
                    topic_index: i,
                    lms_type: lmsService.getLMSType(),
                  },
                },
              ]);
              continue;
            }
          }
    
          // ✅ FIXED: Generate web search context with corrected configuration
          let topicWebSearchContext = '';
          let lessonWebSearchContexts = {};
          if (usePerplexityWebSearch && perplexityApiKey) {
            onTaskUpdate?.(
              completedTasks,
              `Generating web search context for topic: ${topic.topicTitle}`
            );
            try {
              console.log(`🌐 Starting web search context generation for topic: ${topic.topicTitle}`);
              // Log the parameters
              console.log('🔍 Sonar Config for Web Search:', sonarConfig);
    
              const webSearchResult = await generateWebSearchContext(
                perplexityApiKey,
                course,
                topic,
                topic.lessons || [],
                sonarConfig,
                lessonMaxTokens
              );
              topicWebSearchContext = webSearchResult.topicWebSearchContext;
              lessonWebSearchContexts = webSearchResult.lessonWebSearchContexts;
    
              // Log the research output
              console.log('✅ Web Search Output Received:');
              console.log(`   - Topic Context Length: ${topicWebSearchContext.length} chars`);
              Object.keys(lessonWebSearchContexts).forEach((key) => {
                console.log(
                  `   - Lesson [${key}] Context Length: ${lessonWebSearchContexts[key].length} chars`
                );
              });
    
              completedTasks++;
            } catch (error) {
              console.error(
                `❌ Error generating web search context for topic ${topic.topicTitle}:`,
                error
              );
              // Continue without web search context
              topicWebSearchContext = '';
              lessonWebSearchContexts = {};
            }
          }
    
          let topicIntroduction =
            topic.topicIntroduction || recoveryState?.topics?.[i]?.topicIntroduction;
          if (!topicIntroduction) {
            try {
              const topicDetailsPrompt = `
              Course Title: ${course.courseTitle}
              Course Description: ${course.courseDescription}
              Topic Title: ${topic.topicTitle}
              Topic Learning Objective Description: ${topic.topicLearningObjectiveDescription}
              ${
                topicWebSearchContext
                  ? `
              CURRENT WEB RESEARCH CONTEXT: ${topicWebSearchContext}
              Please integrate this current research context into your response.
            `
                  : ''
              }
              Please generate a detailed topicIntroduction and an immersiveMethodBrief.
              The immersiveMethodBrief should describe a practical activity or project related to the topic that helps learners apply the concepts.
            `;
              const topicDetailsResult = await callOpenAI(
                apiKey,
                topicDetailsPrompt,
                'You are an expert instructional designer.',
                false,
                3,
                abortSignal
              );
              topicIntroduction = topicDetailsResult.content;
              if (topicDetailsResult.tokenUsage) {
                courseTokenUsage.prompt_tokens +=
                  topicDetailsResult.tokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens +=
                  topicDetailsResult.tokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens +=
                  topicDetailsResult.tokenUsage.total_tokens || 0;
              }
    
              const updatedRecoveryState = await loadRecoveryState(courseId);
              const topics = updatedRecoveryState?.topics || [];
              topics[i] = {...topics[i], topicIntroduction};
              await saveRecoveryState(courseId, {...updatedRecoveryState, topics});
            } catch (error) {
              console.error(
                `Error generating topic introduction for ${topic.topicTitle}:`,
                error
              );
              topicIntroduction = topic.topicLearningObjectiveDescription;
            }
          }
    
          // Store lesson contents for quiz and assignment generation
          const topicLessonContents = [];
          const startLessonIndex = i === currentTopicIndex ? currentLessonIndex : 0;
    
          for (let j = startLessonIndex; j < (topic.lessons?.length || 0); j++) {
            const lesson = topic.lessons[j];
            onProgress?.(
              55 + (completedTasks / totalTasks) * 45,
              `Generating content for lesson ${j + 1} of ${topic.lessons.length}: ${
                lesson.lessonTitle
              }`,
              'lesson_generation',
              `Generating lesson content: ${lesson.lessonTitle}`,
              {
                currentTopic: topic.topicTitle,
                currentLesson: lesson.lessonTitle,
                topicsCompleted: i,
                totalTopics: totalTopics,
                lessonsCompleted: Math.floor(completedTasks / 3),
                totalLessons: totalLessons,
              }
            );
    
            await checkPauseStatus?.();
            if (abortSignal?.aborted) {
              throw new Error('Request aborted by user');
            }
    
            try {
              // ✅ UPDATED: Use Two-Stage RAG approach with design parameters
              onTaskUpdate?.(
                completedTasks,
                `Generating reading content for: ${lesson.lessonTitle}`
              );
              const lessonVectorStoreId = vectorStoreAssignments[lesson.id];
              const topicVectorStoreId = vectorStoreAssignments[topic.id];
              const vectorStoreIds = lessonVectorStoreId
                ? [lessonVectorStoreId]
                : topicVectorStoreId
                ? [topicVectorStoreId]
                : [];
    
              // ✅ CORRECTED: Get lesson-specific web search context
              const lessonWebSearchContext =
                lessonWebSearchContexts[`lesson_${lesson.id}_websearchcontext`] || '';
    
              // ✅ NEW: Get effective design parameters for this course
              const effectiveDesignParameters = getEffectiveDesignParameters(
                course,
                programContext
              );
    
              console.log(`🎯 Using Two-Stage RAG for lesson: ${lesson.lessonTitle}`);
              console.log(
                `📚 Vector stores: ${
                  vectorStoreIds.length > 0 ? vectorStoreIds.join(',') : 'None'
                }`
              );
              console.log(
                `🌐 Web search context: ${
                  lessonWebSearchContext
                    ? `Available (${lessonWebSearchContext.length} chars)`
                    : 'Not available'
                }`
              );
              console.log(`⚙️ Design parameters:`, effectiveDesignParameters);
    
              const readingResult = await generateReadingContentWithTwoStageRAG(
                apiKey,
                vectorStoreIds,
                lesson,
                topic,
                courseContextText,
                course.mustHaveAspects || '',
                course.designConsiderations || '',
                lessonWebSearchContext, // ✅ CORRECTED: Pass lesson-specific context
                audienceContext, // ✅ CORRECTED: Pass dynamic audience
                effectiveDesignParameters, // ✅ NEW: Pass design parameters
                abortSignal
              );
              const readingContent = readingResult.content;
              const readingTokenUsage = readingResult.tokenUsage;
    
              if (readingTokenUsage) {
                courseTokenUsage.prompt_tokens += readingTokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens += readingTokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens += readingTokenUsage.total_tokens || 0;
              }
    
              // Store non-HTML content for quiz/assignment generation
              const plainTextContent = readingContent
                .replace(/<[^>]*>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
              topicLessonContents.push(plainTextContent);
    
              completedTasks++;
    
              // ✅ Generate additional sections using standard approach with design parameters
              onTaskUpdate?.(
                completedTasks,
                `Generating additional sections for: ${lesson.lessonTitle}`
              );
              const additionalSections = await generateAdditionalLessonSections(
                apiKey,
                lesson,
                readingContent,
                lessonWebSearchContext, // ✅ CORRECTED: Pass lesson-specific context
                effectiveDesignParameters, // ✅ NEW: Pass design parameters
                abortSignal
              );
    
              if (additionalSections.tokenUsage) {
                courseTokenUsage.prompt_tokens +=
                  additionalSections.tokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens +=
                  additionalSections.tokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens +=
                  additionalSections.tokenUsage.total_tokens || 0;
              }
              completedTasks++; // Only one task now for all additional sections
    
              // ✅ Combine all parts into comprehensive lesson content
              const fullLessonContent = {
                readingContent: readingContent,
                faq: additionalSections.faq,
                latestDevelopments: additionalSections.latestDevelopments,
                additionalReading: additionalSections.additionalReading,
              };
    
              // ✅ Create the lesson in the LMS using unified service
              await lmsService.createLesson(lesson, topicId, fullLessonContent, abortSignal);
              console.log(
                `✅ Created comprehensive lesson: ${lesson.lessonTitle} using ${lmsService.getLMSType()}`
              );
              completedTasks++;
    
              await saveRecoveryState(courseId, {
                lmsData,
                courseContext: courseContextText,
                progress: 55 + (completedTasks / totalTasks) * 45,
                completedTasks,
                courseTokenUsage,
                currentTopicIndex: i,
                currentLessonIndex: j + 1,
                timestamp: new Date().toISOString(),
              });
            } catch (error) {
              console.error(`Error generating content for lesson ${lesson.lessonTitle}:`, error);
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'lesson_generation_error',
                  request_id: courseGenerationId,
                  error: error.message,
                  request_data: {
                    lesson_title: lesson.lessonTitle,
                    topic_title: topic.topicTitle,
                    topic_index: i,
                    lesson_index: j,
                    lms_type: lmsService.getLMSType(),
                  },
                },
              ]);
    
              await saveRecoveryState(courseId, {
                lmsData,
                courseContext: courseContextText,
                progress: 55 + (completedTasks / totalTasks) * 45,
                completedTasks,
                courseTokenUsage,
                currentTopicIndex: i,
                currentLessonIndex: j,
                timestamp: new Date().toISOString(),
                error: error.message,
              });
    
              if (abortSignal?.aborted) {
                throw new Error('Request aborted by user');
              }
            }
          }
    
          // ✅ After all lessons for this topic are created, generate quiz and assignment
          if (topicLessonContents.length > 0) {
            const aggregatedLessonContent = topicLessonContents.join('\n\n');
    
            // ✅ Generate Quiz (handles different attachment levels)
            onTaskUpdate?.(
              completedTasks,
              `Creating quiz for topic: ${topic.topicTitle}`
            );
            try {
              // Determine quiz attachment based on LMS type
              const quizParentId =
                lmsService.getQuizAttachmentLevel() === 'topic'
                  ? topicId
                  : topic.lessons && topic.lessons.length > 0
                  ? topic.lessons[0].id
                  : topicId;
    
              // Step 1: Create quiz shell
              const quizResponse = await lmsService.createQuiz(
                topic,
                quizParentId,
                abortSignal
              );
              const quizId = quizResponse.data.data;
              console.log(
                `Created quiz with ID: ${quizId} for topic: ${
                  topic.topicTitle
                } using ${lmsService.getLMSType()}`
              );
              completedTasks++;
    
              // Step 2: Generate and add questions
              onTaskUpdate?.(
                completedTasks,
                `Generating quiz questions for: ${topic.topicTitle}`
              );
              const questionsData = await generateQuizQuestions(
                apiKey,
                aggregatedLessonContent,
                abortSignal
              );
              if (questionsData && Array.isArray(questionsData)) {
                for (const questionData of questionsData) {
                  let formattedQuestionData;
                  if (questionData.question_type === 'fill_in_the_blank') {
                    formattedQuestionData = {
                      question_title: 'Fill up the gaps',
                      question_type: 'fill_in_the_blank',
                      question: questionData.question,
                      correct_answer: questionData.correct_answer_fill,
                    };
                  } else if (questionData.question_type === 'single_choice') {
                    formattedQuestionData = {
                      question_title: questionData.question_title,
                      question_type: 'single_choice',
                      options: questionData.options,
                      correct_answer: Array.isArray(questionData.correct_answer)
                        ? questionData.correct_answer[0]
                        : questionData.correct_answer,
                    };
                  } else {
                    // multiple_choice
                    formattedQuestionData = {
                      question_title: questionData.question_title,
                      question_type: 'multiple_choice',
                      options: questionData.options,
                      correct_answer: Array.isArray(questionData.correct_answer)
                        ? questionData.correct_answer
                        : [questionData.correct_answer],
                    };
                  }
                  try {
                    await lmsService.createQuizQuestion(
                      quizId,
                      formattedQuestionData,
                      abortSignal
                    );
                    console.log(
                      `Added question: ${
                        formattedQuestionData.question_title
                      } using ${lmsService.getLMSType()}`
                    );
                  } catch (questionError) {
                    console.error(`Error adding quiz question:`, questionError);
                  }
                }
              }
    
              if (questionsData && questionsData.tokenUsage) {
                courseTokenUsage.prompt_tokens +=
                  questionsData.tokenUsage.prompt_tokens || 0;
                courseTokenUsage.completion_tokens +=
                  questionsData.tokenUsage.completion_tokens || 0;
                courseTokenUsage.total_tokens += questionsData.tokenUsage.total_tokens || 0;
              }
              completedTasks++;
            } catch (quizError) {
              console.error(`Error creating quiz for topic ${topic.topicTitle}:`, quizError);
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'quiz_creation_error',
                  request_id: courseGenerationId,
                  error: quizError.message,
                  request_data: {
                    topic_title: topic.topicTitle,
                    topic_index: i,
                    lms_type: lmsService.getLMSType(),
                  },
                },
              ]);
            }
    
            // ✅ Generate Assignment (only for LMS types that support it)
            if (lmsService.supportsAssignments()) {
              onTaskUpdate?.(
                completedTasks,
                `Creating assignment for topic: ${topic.topicTitle}`
              );
              try {
                const assignmentData = await generateAssignmentContent(
                  apiKey,
                  aggregatedLessonContent,
                  abortSignal
                );
                if (assignmentData) {
                  await lmsService.createAssignment(topicId, assignmentData, abortSignal);
                  console.log(
                    `Created assignment: ${assignmentData.title} for topic: ${
                      topic.topicTitle
                    } using ${lmsService.getLMSType()}`
                  );
                  if (assignmentData.tokenUsage) {
                    courseTokenUsage.prompt_tokens +=
                      assignmentData.tokenUsage.prompt_tokens || 0;
                    courseTokenUsage.completion_tokens +=
                      assignmentData.tokenUsage.completion_tokens || 0;
                    courseTokenUsage.total_tokens +=
                      assignmentData.tokenUsage.total_tokens || 0;
                  }
                }
                completedTasks++;
              } catch (assignmentError) {
                console.error(
                  `Error creating assignment for topic ${topic.topicTitle}:`,
                  assignmentError
                );
                await supabase.from('api_logs_74621').insert([
                  {
                    operation: 'assignment_creation_error',
                    request_id: courseGenerationId,
                    error: assignmentError.message,
                    request_data: {
                      topic_title: topic.topicTitle,
                      topic_index: i,
                      lms_type: lmsService.getLMSType(),
                    },
                  },
                ]);
              }
            } else {
              console.log(
                `⏭️ Skipping assignment creation for ${lmsService.getLMSType()} (not supported)`
              );
              completedTasks++; // Still increment to maintain progress consistency
            }
          }
        }
    
        // ✅ NEW: Post course data to AITable if enabled and validated
        if (aitableValidated && aitableConfig) {
          onProgress?.(95, 'Posting course data to AITable...', 'aitable_posting');
          try {
            console.log('📤 Posting course data to AITable...');
            // Prepare course data for AITable
            const courseData = {
              programTitle:
                programContext.niche ||
                course.programTitle ||
                'AI Generated Program',
              courseTitle: course.courseTitle,
              topicLessonStructure: generateTopicLessonStructure(course),
              creationDate: Date.now(),
              target: 'Option A', // Default target
              courseUniqueId: generateCourseUniqueId(lmsData.courseId, Date.now()),
              lessonSlidesJson: [], // Slides are no longer generated
            };
    
            const aitableResult = await postCourseToAITable(
              aitableConfig.apiKey,
              aitableConfig.datasheetId,
              courseData
            );
    
            if (aitableResult.success) {
              console.log('✅ Course data successfully posted to AITable');
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'aitable_post_success',
                  request_id: courseGenerationId,
                  request_data: {
                    course_unique_id: courseData.courseUniqueId,
                    record_id: aitableResult.recordId,
                  },
                },
              ]);
            } else {
              console.warn('⚠️ Failed to post course data to AITable:', aitableResult.error);
              await supabase.from('api_logs_74621').insert([
                {
                  operation: 'aitable_post_error',
                  request_id: courseGenerationId,
                  error: aitableResult.error,
                  request_data: {
                    course_unique_id: courseData.courseUniqueId,
                  },
                },
              ]);
            }
          } catch (aitableError) {
            console.error('❌ Error posting to AITable:', aitableError);
            await supabase.from('api_logs_74621').insert([
              {
                operation: 'aitable_post_error',
                request_id: courseGenerationId,
                error: aitableError.message,
              },
            ]);
            // Don't fail the entire process if AITable posting fails
          }
        }
    
        try {
          await supabase
            .from('courses')
            .update({
              input_tokens: courseTokenUsage.prompt_tokens,
              output_tokens: courseTokenUsage.completion_tokens,
              total_tokens: courseTokenUsage.total_tokens,
              status: 'completed',
              updated_at: new Date().toISOString(),
              lms_type: lmsService.getLMSType(),
            })
            .eq('wordpress_course_id', lmsData.courseId);
          console.log('Course token usage updated in Supabase');
          await clearRecoveryState(courseId);
        } catch (updateError) {
          console.error('Failed to update course token usage in Supabase:', updateError);
        }
    
        console.log(
          `🎉 Course generation completed successfully using ${lmsService.getLMSType()} LMS with enhanced design parameters${
            aitableValidated ? ' and AITable integration' : ''
          }!`
        );
    
        return {
          success: true,
          courseId: lmsData?.courseId,
          tokenUsage: courseTokenUsage,
          lmsType: lmsService.getLMSType(),
          aitablePosted: aitableValidated, // ✅ NEW: Indicate if AITable posting was attempted
        };
      } catch (error) {
        console.error('Error generating course content:', error);
        throw error;
      }
    };
    
    // Generate topic and lesson structure for a course
    export const generateCourseTopicsAndLessons = async (
      course,
      programContext,
      summaryProgramContext,
      mustHaveAspects,
      designConsiderations,
      apiKey
    ) => {
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
      - Integrate current industry trends and best practices
    
      The JSON object must have this exact structure:
      {"topics": [
        {"id": "topic-new-1", "topicTitle": "Comprehensive topic title with clear learning focus", "topicLearningObjectiveDescription": "Detailed 2-3 sentence paragraph explaining what students will master in this topic, including specific skills and knowledge outcomes", "additionalContext": "", "lessons": [
          {"id": "lesson-new-1-1", "lessonTitle": "Specific and actionable lesson title", "lessonDescription": "Comprehensive 150-200 word description covering: (1) specific learning objectives for this lesson, (2) key concepts and skills students will learn, (3) practical activities and exercises they will complete, (4) real-world applications and examples, (5) how this lesson contributes to the overall topic mastery, and (6) expected outcomes and deliverables. Be specific about what students will be able to do after completing this lesson.", "additionalContext": ""}
        ]}
      ]}
    
      Generate exactly 5-6 topics with 4-5 lessons each. Each lesson description must be detailed and comprehensive (150-200 words).
    `;
        const response = await axios.post(
          'https://api.openai.com/v1/chat/completions',
          {
            model: 'gpt-4.1-mini-2025-04-14',
            messages: [
              {
                role: 'system',
                content:
                  'You are an expert instructional designer specializing in professional education. Create detailed, practical course content with comprehensive lesson descriptions. Each lesson must be unique, specific, and tailored to the course context.',
              },
              {role: 'user', content: topicGenerationPrompt},
            ],
            temperature: 0.5, // ✅ UPDATED: Legacy content generation temperature
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
            },
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
        console.error('Error generating topics and lessons:', error);
        return {topics: []};
      }
    };
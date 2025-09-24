import axios from 'axios';
import { callPerplexityAPI } from './perplexityService';
import { generateParameterInstructions } from './instructionalParameterService';

/**
 * Enhanced token tracking utility
 */
const TokenTracker = {
  createSession: (lessonTitle) => ({
    lessonTitle,
    stage1: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0,
      file_search_tokens: 0
    },
    stage2: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    },
    webSearch: {
      prompt_tokens: 0,
      completion_tokens: 0,
      total_tokens: 0
    },
    contextSizes: {
      webSearchContext: 0,
      ragContent: 0,
      courseContext: 0,
      parameterInstructions: 0,
      totalPromptLength: 0
    },
    totals: {
      input_tokens: 0,
      output_tokens: 0,
      total_tokens: 0
    }
  }),

  logTokenUsage: (session) => {
    console.log(`
╔══════════════════════════════════════════════════════════════════════════════════
║ 📊 DETAILED TOKEN USAGE REPORT FOR LESSON: ${session.lessonTitle}
╠══════════════════════════════════════════════════════════════════════════════════
║ 
║ 🔍 STAGE 1 - RAG FILE_SEARCH TOKENS:
║    • Prompt Tokens (file_search input): ${session.stage1.prompt_tokens}
║    • Completion Tokens (RAG output): ${session.stage1.completion_tokens}
║    • File Search Processing Tokens: ${session.stage1.file_search_tokens}
║    • Stage 1 Total: ${session.stage1.total_tokens}
║ 
║ 🌐 WEB SEARCH CONTEXT TOKENS:
║    • Web Search Input Tokens: ${session.webSearch.prompt_tokens}
║    • Web Search Output Tokens: ${session.webSearch.completion_tokens}
║    • Web Search Total: ${session.webSearch.total_tokens}
║ 
║ 🚀 STAGE 2 - ENHANCED CONTENT GENERATION:
║    • Prompt Tokens (all contexts combined): ${session.stage2.prompt_tokens}
║    • Completion Tokens (final content): ${session.stage2.completion_tokens}
║    • Stage 2 Total: ${session.stage2.total_tokens}
║ 
║ 📏 CONTEXT SIZES:
║    • Web Search Context: ${session.contextSizes.webSearchContext} chars
║    • RAG Content: ${session.contextSizes.ragContent} chars
║    • Course Context: ${session.contextSizes.courseContext} chars
║    • Parameter Instructions: ${session.contextSizes.parameterInstructions} chars
║    • Total Prompt Length: ${session.contextSizes.totalPromptLength} chars
║ 
║ 🎯 FINAL TOTALS:
║    • Total Input Tokens: ${session.totals.input_tokens}
║    • Total Output Tokens: ${session.totals.output_tokens}
║    • Grand Total Tokens: ${session.totals.total_tokens}
║ 
║ 💰 ESTIMATED COSTS (GPT-4o-mini rates):
║    • Input Cost: $${(session.totals.input_tokens * 0.00015 / 1000).toFixed(4)}
║    • Output Cost: $${(session.totals.output_tokens * 0.0006 / 1000).toFixed(4)}
║    • Total Cost: $${((session.totals.input_tokens * 0.00015 + session.totals.output_tokens * 0.0006) / 1000).toFixed(4)}
║ 
╚══════════════════════════════════════════════════════════════════════════════════
    `);
  },

  calculateTotals: (session) => {
    // Calculate totals
    session.totals.input_tokens = 
      session.stage1.prompt_tokens + 
      session.stage2.prompt_tokens + 
      session.webSearch.prompt_tokens;
    
    session.totals.output_tokens = 
      session.stage1.completion_tokens + 
      session.stage2.completion_tokens + 
      session.webSearch.completion_tokens;
    
    session.totals.total_tokens = 
      session.stage1.total_tokens + 
      session.stage2.total_tokens + 
      session.webSearch.total_tokens;
    
    return session;
  }
};

/**
 * Stage 1: Simple RAG Call using OpenAI Responses API
 * Generates domain-specific content from vector store files
 * Returns ~1000-1200 words as Priority 2 context
 */
const generateSimpleRAGContent = async (
  apiKey,
  vectorStoreIds,
  lessonData,
  topicData,
  tokenSession,
  abortSignal = null
) => {
  try {
    console.log(`🔍 Stage 1: Starting simple RAG call for lesson: ${lessonData.lessonTitle}`);
    console.log(`📚 Using vector stores: ${vectorStoreIds}`);

    // Simple system prompt for Stage 1
    const systemPrompt = `Act as a senior instructional designer. Output strictly as HTML, concise and practical. Audience is procure to pay professionals.`;

    // Simple user prompt for Stage 1 - focused on extracting relevant content from files
    const userPrompt = `Generate the <b>readingContent</b> (1000-1200 words in HTML) for the lesson "${lessonData.lessonTitle}" and lesson description "${lessonData.lessonDescription}", under topic "${topicData.topicTitle}" using the relevant reference from the attached documents from the reference library using file_search tool.

Focus on:
- Core concepts and principles from the reference materials
- Best practices and methodologies from the documents
- Technical details and implementation guidance
- Industry standards and frameworks mentioned in the files

Use the attached files as your primary source of authoritative information. Structure the content with proper HTML headings, paragraphs, and lists.`;

    // Track prompt size
    const totalPromptLength = systemPrompt.length + userPrompt.length;
    tokenSession.contextSizes.totalPromptLength += totalPromptLength;
    
    // Estimate prompt tokens (roughly 4 chars per token)
    const estimatedPromptTokens = Math.ceil(totalPromptLength / 4);
    tokenSession.stage1.prompt_tokens = estimatedPromptTokens;

    console.log(`📡 Making Stage 1 RAG API call to /v1/responses endpoint...`);
    console.log(`📊 Estimated Stage 1 prompt tokens: ${estimatedPromptTokens}`);

    // Use the /v1/responses API endpoint with file_search tools
    const requestBody = {
      model: "gpt-4.1-mini-2025-04-14",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_output_tokens: 1200
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

    console.log(`✅ Stage 1 RAG API call successful! Response received.`);
    console.log(`📊 Response structure:`, Object.keys(response.data));

    // Extract content from the responses API format
    let ragContent = null;
    if (response.data.output && Array.isArray(response.data.output)) {
      // Find the message output (usually the second item after file_search_call)
      const messageOutput = response.data.output.find(item => item.type === 'message');
      if (messageOutput && messageOutput.content && Array.isArray(messageOutput.content)) {
        // Find the text content
        const textContent = messageOutput.content.find(item => item.type === 'output_text');
        if (textContent && textContent.text) {
          ragContent = textContent.text;
        }
      }
    }

    if (!ragContent) {
      console.error('❌ No content received from Stage 1 RAG API');
      throw new Error('No content received from Stage 1 RAG API response');
    }

    // Clean up any markdown code blocks if present
    let cleanedContent = ragContent.trim();
    const htmlMatch = cleanedContent.match(/```html\n([\s\S]*?)\n```/);
    if (htmlMatch) {
      cleanedContent = htmlMatch[1].trim();
    }

    // Update token tracking
    tokenSession.contextSizes.ragContent = cleanedContent.length;
    
    // Extract actual token usage from response or estimate
    let actualTokenUsage;
    if (response.data.usage) {
      actualTokenUsage = response.data.usage;
      tokenSession.stage1.prompt_tokens = actualTokenUsage.prompt_tokens || estimatedPromptTokens;
      tokenSession.stage1.completion_tokens = actualTokenUsage.completion_tokens || Math.ceil(cleanedContent.length / 4);
      tokenSession.stage1.total_tokens = actualTokenUsage.total_tokens || (tokenSession.stage1.prompt_tokens + tokenSession.stage1.completion_tokens);
    } else {
      // Estimate if no usage data
      const estimatedCompletionTokens = Math.ceil(cleanedContent.length / 4);
      tokenSession.stage1.completion_tokens = estimatedCompletionTokens;
      tokenSession.stage1.total_tokens = estimatedPromptTokens + estimatedCompletionTokens;
      
      actualTokenUsage = {
        prompt_tokens: estimatedPromptTokens,
        completion_tokens: estimatedCompletionTokens,
        total_tokens: tokenSession.stage1.total_tokens
      };
    }

    // Add file_search processing overhead (estimated)
    tokenSession.stage1.file_search_tokens = Math.ceil(actualTokenUsage.prompt_tokens * 0.2); // 20% overhead for file processing

    console.log(`📝 Stage 1 RAG content generated: ${cleanedContent.length} characters`);
    console.log(`🔢 Stage 1 actual tokens - Prompt: ${tokenSession.stage1.prompt_tokens}, Completion: ${tokenSession.stage1.completion_tokens}, Total: ${tokenSession.stage1.total_tokens}`);

    return {
      content: cleanedContent,
      tokenUsage: actualTokenUsage
    };
  } catch (error) {
    console.error('❌ Error in Stage 1 RAG generation:', error);
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
    }
    throw error;
  }
};

/**
 * Stage 2: Enhanced Content Generation using Chat Completions
 * Combines all contexts with priority hierarchy to generate comprehensive lesson content
 * ✅ ENHANCED: Now includes design parameters for instructional intelligence
 */
const generateEnhancedContent = async (
  apiKey,
  lessonData,
  topicData,
  ragContent, // Priority 2: RAG library content
  webSearchContext = '', // Priority 1: Sonar web search context
  courseContext = '', // Priority 3: Course/research context
  mustHaveAspects = '',
  designConsiderations = '',
  audienceContext = 'Procure to pay professionals',
  designParameters = {}, // ✅ NEW: Design parameters for instructional tuning
  tokenSession,
  abortSignal = null
) => {
  try {
    console.log(`🚀 Stage 2: Starting enhanced content generation for lesson: ${lessonData.lessonTitle}`);
    
    // ✅ NEW: Generate parameter-based instructional blocks
    const parameterInstructions = generateParameterInstructions(designParameters);
    
    // Track context sizes
    tokenSession.contextSizes.webSearchContext = webSearchContext.length;
    tokenSession.contextSizes.courseContext = courseContext.length;
    tokenSession.contextSizes.parameterInstructions = parameterInstructions.length;

    console.log(`🌐 Web search context: ${webSearchContext.length} chars`);
    console.log(`📚 RAG content: ${ragContent.length} chars`);
    console.log(`📖 Course context: ${courseContext.length} chars`);
    console.log(`⚙️ Parameter instructions: ${parameterInstructions.length} chars`);

    // Enhanced system prompt for Stage 2 with design parameters
    const systemPrompt = `You are an expert educational content creator specializing in comprehensive lesson development for professional education. Create engaging, practical, and comprehensive lesson content that combines multiple sources of information with clear priority hierarchy:

PRIORITY 1 (HIGHEST): Current web research and industry trends
PRIORITY 2 (HIGH): Authoritative reference materials and domain expertise  
PRIORITY 3 (MEDIUM): Overall course context and design requirements
PRIORITY 4 (INSTRUCTIONAL): Design parameters for pedagogical approach

Generate content in well-structured HTML format suitable for professional LMS display. Use proper semantic HTML tags, headings, paragraphs, lists, and styling classes.

Focus on:
- Actionable strategies that professionals can implement immediately
- Current industry examples and real-world applications
- Authoritative knowledge from reference materials
- Practical exercises and implementation guidance
- Common misconceptions and how to avoid them
- Key takeaways and next steps

Tone: Professional, engaging, and practical - similar to Malcolm Gladwell or Daniel Pink.
Audience: ${audienceContext}`;

    // Enhanced user prompt for Stage 2 with parameter integration
    const userPrompt = `Generate comprehensive lesson content (4000-4500 words in HTML) for:

**LESSON:** "${lessonData.lessonTitle}"
**LESSON DESCRIPTION:** "${lessonData.lessonDescription}"
**TOPIC:** "${topicData.topicTitle}"

**CONTEXT HIERARCHY (USE IN THIS PRIORITY ORDER):**

**PRIORITY 1 - CURRENT INDUSTRY INSIGHTS (Use as primary context for examples, trends, statistics):**
${webSearchContext || 'No current web research available - focus on timeless principles and best practices.'}

**PRIORITY 2 - AUTHORITATIVE REFERENCE CONTENT (Use as foundational knowledge base):**
${ragContent || 'No reference library content available - rely on general domain expertise.'}

**PRIORITY 3 - COURSE DESIGN CONTEXT (Use as background framework):**
Course Context: ${courseContext}
Must-Have Aspects: ${mustHaveAspects}
Design Considerations: ${designConsiderations}

**PRIORITY 4 - INSTRUCTIONAL DESIGN PARAMETERS (Apply throughout content creation):**
${parameterInstructions}

**CONTENT REQUIREMENTS:**
- Generate 4000-4500 words in clean, semantic HTML format
- Use proper HTML structure: <h1>, <h2>, <h3>, <p>, <ul>, <ol>, <li>, <strong>, <em>
- Include CSS classes for styling: highlight-box, warning-box, success-box, case-study
- Structure with clear sections: Brief Overview (5% ~200 words), Main Content (80% ~3200-3600 words), Brief Key Takeaways (5% ~200 words), Brief Common Misconceptions (5% ~200 words), Brief Practical Application (5% ~200 words).
-For exhaustiveness and content clarity, Clearly divide Main Content into at least three subsections each with a clear subtitles based on the context and generate the relevant content for each of the three or more subsections. 
- Include a brief case study if specifically requested in the additional context (Case study adds 1000+ words and increases total target to 5000-5500 words)
- Apply the instructional design parameters consistently throughout all sections
- Prioritize current industry insights from web research for examples and trends
- Use reference library content generated through file_search for authoritative backing and detailed explanations
- Integrate course context for overall alignment and learning progression

**HTML STRUCTURE TEMPLATE:**
<div class="lesson-content">
  <h1>[Lesson Title]</h1>
  
  <div class="lesson-overview">
    <h2>Overview</h2>
    <p>[Brief lesson overview integrating current trends and instructional approach. The word count for the main content should be less than 5% of the total word count for the lesson]</p>
  </div>
  
  <div class="main-content">
    <h2>[Main Section Title]</h2>
    <p>[Content with current examples and authoritative backing including relevant subsections. This shouldbe divided into three or more subsections with clear subtitles in h3 formatting and the contents below. The word count for the main content should be around 80% of the total word count for the lesson]</p>
    
    <div class="highlight-box">
      <h4>Key Insight</h4>
      <p>[Important point from reference materials or current trends]</p>
    </div>
  </div>
  
  <div class="case-study">
    <h2>Case Study</h2>
    <h3>[Case Study Title]</h3>
    <p>[Real-world example preferably from current research]</p>
  </div>
  
  <div class="key-takeaways">
    <h2>Key Takeaways</h2>
    <ul>
      <li>[Actionable insights aligned with instructional parameters]</li>
    </ul>
  </div>
  
  <div class="common-misconceptions">
    <h2>Common Misconceptions</h2>
    <div class="warning-box">
      <h4>Misconception: [Title]</h4>
      <p><strong>Reality:</strong> [Correct information]</p>
    </div>
  </div>
  
  <div class="practical-application">
    <h2>Practical Application</h2>
    <p>[How to apply this knowledge in real scenarios]</p>
  </div>
</div>

**INTEGRATION GUIDELINES:**
1. Lead with current industry insights and trends from web research
2. Support with authoritative content from reference library
3. Frame within overall course context and learning objectives
4. Apply instructional design parameters consistently throughout content
5. Make content immediately actionable for ${audienceContext}
6. Use current examples and statistics where available
7. Maintain professional tone while being engaging and practical
8. Ensure domain approach influences example selection and technical depth
9. Calibrate language complexity based on audience level specified in parameters
10. Structure content delivery according to the content focus priority

Generate the complete HTML lesson content now.`;

    // Track total prompt length
    const totalPromptLength = systemPrompt.length + userPrompt.length;
    tokenSession.contextSizes.totalPromptLength += totalPromptLength;
    
    // Estimate prompt tokens
    const estimatedPromptTokens = Math.ceil(totalPromptLength / 4);
    tokenSession.stage2.prompt_tokens = estimatedPromptTokens;

    console.log(`📡 Making Stage 2 enhanced API call to /v1/chat/completions endpoint...`);
    console.log(`📊 Estimated Stage 2 prompt tokens: ${estimatedPromptTokens}`);

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: 6500,
        temperature: 0.6
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 180000,
        signal: abortSignal
      }
    );

    console.log(`✅ Stage 2 enhanced API call successful!`);

    const enhancedContent = response.data.choices[0].message.content;
    
    // Update token tracking with actual usage
    if (response.data.usage) {
      tokenSession.stage2.prompt_tokens = response.data.usage.prompt_tokens;
      tokenSession.stage2.completion_tokens = response.data.usage.completion_tokens;
      tokenSession.stage2.total_tokens = response.data.usage.total_tokens;
    } else {
      // Estimate if no usage data
      const estimatedCompletionTokens = Math.ceil(enhancedContent.length / 4);
      tokenSession.stage2.completion_tokens = estimatedCompletionTokens;
      tokenSession.stage2.total_tokens = estimatedPromptTokens + estimatedCompletionTokens;
    }

    console.log(`📝 Stage 2 enhanced content generated: ${enhancedContent.length} characters`);
    console.log(`🔢 Stage 2 actual tokens - Prompt: ${tokenSession.stage2.prompt_tokens}, Completion: ${tokenSession.stage2.completion_tokens}, Total: ${tokenSession.stage2.total_tokens}`);

    return {
      content: enhancedContent,
      tokenUsage: response.data.usage
    };
  } catch (error) {
    console.error('❌ Error in Stage 2 enhanced generation:', error);
    throw error;
  }
};

/**
 * Main function: Two-Stage RAG Content Generation
 * Orchestrates the complete two-stage process with detailed token tracking
 * ✅ ENHANCED: Now supports design parameters for instructional tuning
 */
export const generateTwoStageRAGContent = async (
  apiKey,
  vectorStoreIds,
  lessonData,
  topicData,
  courseContext = '',
  mustHaveAspects = '',
  designConsiderations = '',
  webSearchContext = '',
  audienceContext = 'Procure to pay professionals',
  designParameters = {}, // ✅ NEW: Design parameters parameter
  abortSignal = null
) => {
  // Initialize token tracking session
  const tokenSession = TokenTracker.createSession(lessonData.lessonTitle);
  
  try {
    console.log(`🎯 Starting Two-Stage RAG Content Generation for: ${lessonData.lessonTitle}`);
    console.log(`📊 Configuration:`, {
      hasVectorStores: !!(vectorStoreIds && vectorStoreIds.length > 0),
      hasWebSearch: !!webSearchContext,
      hasCourseContext: !!courseContext,
      hasDesignParameters: Object.keys(designParameters).length > 0
    });

    let stage1Content = '';
    let stage1TokenUsage = null;

    // Track web search context if provided
    if (webSearchContext) {
      // Estimate web search tokens (this would come from the actual Perplexity API call)
      tokenSession.webSearch.completion_tokens = Math.ceil(webSearchContext.length / 4);
      tokenSession.webSearch.prompt_tokens = Math.ceil(webSearchContext.length * 0.1); // Estimate input based on output
      tokenSession.webSearch.total_tokens = tokenSession.webSearch.prompt_tokens + tokenSession.webSearch.completion_tokens;
      
      console.log(`🌐 Web search context tokens - Prompt: ${tokenSession.webSearch.prompt_tokens}, Completion: ${tokenSession.webSearch.completion_tokens}, Total: ${tokenSession.webSearch.total_tokens}`);
    }

    // Stage 1: Simple RAG Call (only if vector stores are available)
    if (vectorStoreIds && vectorStoreIds.length > 0) {
      try {
        console.log(`🔍 Executing Stage 1: Simple RAG call with vector stores`);
        const stage1Result = await generateSimpleRAGContent(
          apiKey,
          vectorStoreIds,
          lessonData,
          topicData,
          tokenSession,
          abortSignal
        );
        
        stage1Content = stage1Result.content;
        stage1TokenUsage = stage1Result.tokenUsage;
        console.log(`✅ Stage 1 completed successfully`);
      } catch (stage1Error) {
        console.warn(`⚠️ Stage 1 RAG failed, continuing with Stage 2 only:`, stage1Error.message);
        // Continue to Stage 2 without RAG content
        stage1Content = '';
        stage1TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
      }
    } else {
      console.log(`ℹ️ No vector stores provided, skipping Stage 1 RAG call`);
      stage1Content = '';
      stage1TokenUsage = { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };
    }

    // Stage 2: Enhanced Content Generation (always executed)
    console.log(`🚀 Executing Stage 2: Enhanced content generation with context integration`);
    const stage2Result = await generateEnhancedContent(
      apiKey,
      lessonData,
      topicData,
      stage1Content, // Priority 2: RAG library content
      webSearchContext, // Priority 1: Sonar web search context
      courseContext, // Priority 3: Course/research context
      mustHaveAspects,
      designConsiderations,
      audienceContext,
      designParameters, // ✅ NEW: Pass design parameters
      tokenSession,
      abortSignal
    );

    console.log(`✅ Stage 2 completed successfully`);

    // Calculate final totals
    TokenTracker.calculateTotals(tokenSession);
    
    // Log comprehensive token usage report
    TokenTracker.logTokenUsage(tokenSession);

    // Combine token usage from both stages for return value
    const totalTokenUsage = {
      prompt_tokens: tokenSession.totals.input_tokens,
      completion_tokens: tokenSession.totals.output_tokens,
      total_tokens: tokenSession.totals.total_tokens
    };

    console.log(`🎉 Two-Stage RAG Content Generation completed successfully!`);

    return {
      content: stage2Result.content,
      tokenUsage: totalTokenUsage,
      metadata: {
        usedRAG: !!(vectorStoreIds && vectorStoreIds.length > 0 && stage1Content),
        usedWebSearch: !!webSearchContext,
        usedDesignParameters: Object.keys(designParameters).length > 0,
        stage1TokenUsage: {
          prompt_tokens: tokenSession.stage1.prompt_tokens,
          completion_tokens: tokenSession.stage1.completion_tokens,
          total_tokens: tokenSession.stage1.total_tokens,
          file_search_tokens: tokenSession.stage1.file_search_tokens
        },
        stage2TokenUsage: {
          prompt_tokens: tokenSession.stage2.prompt_tokens,
          completion_tokens: tokenSession.stage2.completion_tokens,
          total_tokens: tokenSession.stage2.total_tokens
        },
        webSearchTokenUsage: {
          prompt_tokens: tokenSession.webSearch.prompt_tokens,
          completion_tokens: tokenSession.webSearch.completion_tokens,
          total_tokens: tokenSession.webSearch.total_tokens
        },
        contentLength: stage2Result.content.length,
        contextSizes: tokenSession.contextSizes
      }
    };
  } catch (error) {
    console.error('❌ Error in Two-Stage RAG Content Generation:', error);
    
    // Still log what we have tracked so far
    TokenTracker.calculateTotals(tokenSession);
    TokenTracker.logTokenUsage(tokenSession);
    
    throw error;
  }
};

/**
 * Fallback function for when RAG is not available
 * Uses only web search and course context with token tracking
 * ✅ ENHANCED: Now supports design parameters
 */
export const generateFallbackContent = async (
  apiKey,
  lessonData,
  topicData,
  courseContext = '',
  mustHaveAspects = '',
  designConsiderations = '',
  webSearchContext = '',
  audienceContext = 'Procure to pay professionals',
  designParameters = {}, // ✅ NEW: Design parameters parameter
  abortSignal = null
) => {
  console.log(`🔄 Using fallback content generation (no RAG available)`);
  
  // Initialize token tracking for fallback
  const tokenSession = TokenTracker.createSession(`${lessonData.lessonTitle} (Fallback)`);
  
  // Track web search context if provided
  if (webSearchContext) {
    tokenSession.webSearch.completion_tokens = Math.ceil(webSearchContext.length / 4);
    tokenSession.webSearch.prompt_tokens = Math.ceil(webSearchContext.length * 0.1);
    tokenSession.webSearch.total_tokens = tokenSession.webSearch.prompt_tokens + tokenSession.webSearch.completion_tokens;
  }

  const result = await generateEnhancedContent(
    apiKey,
    lessonData,
    topicData,
    '', // No RAG content
    webSearchContext, // Priority 1: Web search context
    courseContext, // Priority 2: Course context (elevated priority when no RAG)
    mustHaveAspects,
    designConsiderations,
    audienceContext,
    designParameters, // ✅ NEW: Pass design parameters
    tokenSession,
    abortSignal
  );

  // Calculate and log totals for fallback
  TokenTracker.calculateTotals(tokenSession);
  TokenTracker.logTokenUsage(tokenSession);

  return result;
};
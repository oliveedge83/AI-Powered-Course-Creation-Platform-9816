import axios from 'axios';

/**
 * Fetches all vector stores for the given API key
 * @param {string} apiKey - OpenAI API key
 * @returns {Promise<Array>} - Array of vector store objects
 */
export const listVectorStores = async (apiKey) => {
  try {
    const response = await axios.get('https://api.openai.com/v1/vector_stores', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'OpenAI-Beta': 'assistants=v2'
      }
    });
    return response.data.data || [];
  } catch (error) {
    console.error('Error listing vector stores:', error);
    throw error;
  }
};

/**
 * Uploads a file to OpenAI for assistants/vector stores
 * @param {string} apiKey - OpenAI API key
 * @param {File} file - File object to upload
 * @returns {Promise<Object>} - File object with id
 */
export const uploadFile = async (apiKey, file) => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('purpose', 'assistants');

    const response = await axios.post('https://api.openai.com/v1/files', formData, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'multipart/form-data'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error uploading file:', error);
    throw error;
  }
};

/**
 * Creates a new vector store with the given files
 * @param {string} apiKey - OpenAI API key
 * @param {string} name - Name of the vector store
 * @param {Array<string>} fileIds - Array of file IDs
 * @param {Object} options - Additional options like chunking strategy
 * @returns {Promise<Object>} - Created vector store object
 */
export const createVectorStore = async (apiKey, name, fileIds, options = {}) => {
  try {
    // Default chunking strategy
    const defaultChunkingStrategy = {
      type: "static",
      static: {
        max_chunk_size_tokens: 550,
        chunk_overlap_tokens: 250
      }
    };

    const response = await axios.post(
      'https://api.openai.com/v1/vector_stores',
      {
        name,
        file_ids: fileIds,
        chunking_strategy: options.chunkingStrategy || defaultChunkingStrategy
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error creating vector store:', error);
    throw error;
  }
};

/**
 * Gets details about a specific vector store
 * @param {string} apiKey - OpenAI API key
 * @param {string} vectorStoreId - ID of the vector store
 * @returns {Promise<Object>} - Vector store details
 */
export const getVectorStore = async (apiKey, vectorStoreId) => {
  try {
    const response = await axios.get(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error getting vector store:', error);
    throw error;
  }
};

/**
 * Adds files to an existing vector store
 * @param {string} apiKey - OpenAI API key
 * @param {string} vectorStoreId - ID of the vector store
 * @param {Array<string>} fileIds - Array of file IDs to add
 * @returns {Promise<Object>} - Updated vector store
 */
export const addFilesToVectorStore = async (apiKey, vectorStoreId, fileIds) => {
  try {
    const response = await axios.post(
      `https://api.openai.com/v1/vector_stores/${vectorStoreId}/files`,
      { file_ids: fileIds },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error adding files to vector store:', error);
    throw error;
  }
};

/**
 * ✅ FIXED: Generate content using RAG with vector store
 * Uses the correct /v1/chat/completions endpoint with file_search tools
 */
export const generateContentWithRAG = async (
  apiKey, 
  vectorStoreId, 
  lessonData, 
  courseContext, 
  topicContext,
  webSearchContext = ''
) => {
  try {
    console.log(`🔍 Starting RAG generation for lesson: ${lessonData.lessonTitle}`);
    console.log(`📚 Using vector store: ${vectorStoreId}`);
    console.log(`🌐 Web search context available: ${webSearchContext ? 'Yes' : 'No'}`);

    const systemPrompt = `
      Act as a senior instructor designer. For generating the lesson content use the following context:
      
      RESEARCH: ${courseContext}
      
      Must have topics: ${topicContext}
      
      Design considerations: Course structure content with topic, course
      
      ${webSearchContext ? `Recent relevant Websearch context: ${webSearchContext}` : ''}
      
      Use websearch context as high priority to generate the text.
      
      Focus on actionable strategies that readers can implement immediately. Address emotional triggers. Emphasize benefits. Include common mistakes and how to avoid them. Use case studies or examples from real businesses to make content relatable. Provide templates and actionable checklists if applicable. Keep the text as action focused as possible. Quote recent research on this topic if any. Keep the tone motivating and supportive. Sound like Malcolm Gladwell or Daniel Pink for this content.
      
      CRITICAL: Generate all content in well-structured HTML format suitable for professional LMS display. Use proper HTML tags, semantic structure, and CSS classes for styling.
      
      Use the attached files from the vector store library as authoritative reference material.
    `;

    const userPrompt = `
      Generate the <b>readingContent</b> (1600-1800 words in HTML) for the lesson "${lessonData.lessonTitle}" 
      focusing on: ${lessonData.lessonDescription}
      
      Audience: Marketing professionals and business practitioners
      
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
      - Focus on immediate applicability for marketing professionals
      
      Generate the complete HTML lesson content now.
    `;

    console.log(`📡 Making RAG API call to /v1/chat/completions endpoint...`);

    // ✅ CORRECTED: Use the standard /v1/chat/completions endpoint with file_search tools
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: userPrompt
          }
        ],
        tools: [
          {
            type: "file_search"
          }
        ],
        tool_resources: {
          file_search: {
            vector_store_ids: [vectorStoreId]
          }
        },
        max_tokens: 2400
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        }
      }
    );

    console.log(`✅ RAG API call successful! Response received.`);
    console.log(`📊 Response structure:`, Object.keys(response.data));

    // Handle the standard chat completions response format
    const content = response.data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error('❌ No content received from RAG API');
      throw new Error('No content received from RAG API response');
    }

    console.log(`📝 RAG content generated: ${content.length} characters`);

    return {
      content: content,
      tokenUsage: response.data.usage
    };
  } catch (error) {
    console.error('❌ Error generating content with RAG:', error);
    
    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
      
      // Handle specific API errors
      if (error.response.status === 404) {
        throw new Error('RAG API endpoint not available. Using fallback content generation.');
      } else if (error.response.status === 400) {
        throw new Error(`Invalid RAG request: ${error.response.data?.error?.message || 'Bad request'}`);
      }
    }
    
    throw error;
  }
};
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
    
    const response = await axios.post('https://api.openai.com/v1/files', 
      formData, 
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
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
 * Generates content using RAG with a vector store
 * @param {string} apiKey - OpenAI API key
 * @param {string} vectorStoreId - ID of the vector store to use
 * @param {Object} lessonData - Lesson data including title and description
 * @param {string} courseContext - Course context
 * @param {string} topicContext - Topic context
 * @returns {Promise<Object>} - Generated content
 */
export const generateContentWithRAG = async (apiKey, vectorStoreId, lessonData, courseContext, topicContext) => {
  try {
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
        }
      }
    );
    
    return response.data;
  } catch (error) {
    console.error('Error generating content with RAG:', error);
    throw error;
  }
};
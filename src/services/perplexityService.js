import axios from 'axios';

/**
 * Validates a Perplexity API key by making a test request
 * @param {string} apiKey - The Perplexity API key to validate
 * @returns {Promise<Object>} - Validation result with success status and details
 */
export const validatePerplexityKey = async (apiKey) => {
  try {
    // Check if API key format is correct
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'API key is required and must be a string',
        errorType: 'FORMAT_ERROR'
      };
    }

    // Check if API key starts with 'pplx-'
    if (!apiKey.startsWith('pplx-')) {
      return {
        isValid: false,
        error: 'Invalid API key format. Perplexity API keys should start with "pplx-"',
        errorType: 'FORMAT_ERROR'
      };
    }

    // Check if API key has reasonable length
    if (apiKey.length < 40) {
      return {
        isValid: false,
        error: 'API key appears to be too short. Please check your key.',
        errorType: 'FORMAT_ERROR'
      };
    }

    console.log('Validating Perplexity API key...');

    // Make a simple test request to validate the key
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: "sonar",
        messages: [
          {
            role: "user",
            content: "Hello, this is a test message to validate the API key. Please respond with 'API key is valid'."
          }
        ],
        max_tokens: 20,
        temperature: 0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // Check if response is successful
    if (response.status === 200 && response.data.choices && response.data.choices.length > 0) {
      return {
        isValid: true,
        message: 'Perplexity API key is valid and working',
        model: response.data.model,
        usage: response.data.usage
      };
    } else {
      return {
        isValid: false,
        error: 'Unexpected response from Perplexity API',
        errorType: 'API_ERROR'
      };
    }
  } catch (error) {
    console.error('Perplexity API key validation error:', error);

    // Handle different types of errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      switch (status) {
        case 401:
          return {
            isValid: false,
            error: 'Invalid Perplexity API key. Please check your API key and try again.',
            errorType: 'AUTHENTICATION_ERROR',
            statusCode: 401
          };
        case 429:
          return {
            isValid: false,
            error: 'Rate limit exceeded. Your API key is valid but you have exceeded the rate limit.',
            errorType: 'RATE_LIMIT_ERROR',
            statusCode: 429
          };
        case 403:
          return {
            isValid: false,
            error: 'Access forbidden. Your API key may not have the required permissions.',
            errorType: 'PERMISSION_ERROR',
            statusCode: 403
          };
        case 500:
        case 502:
        case 503:
          return {
            isValid: false,
            error: 'Perplexity API is currently unavailable. Please try again later.',
            errorType: 'SERVER_ERROR',
            statusCode: status
          };
        default:
          return {
            isValid: false,
            error: errorData?.error?.message || `API request failed with status ${status}`,
            errorType: 'API_ERROR',
            statusCode: status
          };
      }
    } else if (error.code === 'ECONNABORTED') {
      return {
        isValid: false,
        error: 'Request timeout. Please check your internet connection and try again.',
        errorType: 'TIMEOUT_ERROR'
      };
    } else if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
      return {
        isValid: false,
        error: 'Network error. Please check your internet connection.',
        errorType: 'NETWORK_ERROR'
      };
    } else {
      return {
        isValid: false,
        error: error.message || 'Unknown error occurred while validating API key',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }
};

/**
 * Validates multiple Perplexity API keys and returns the first valid one
 * @param {Array<Object>} apiKeys - Array of API key objects with {key, label, id}
 * @returns {Promise<Object>} - Validation result with the first valid key
 */
export const validatePerplexityKeys = async (apiKeys) => {
  if (!apiKeys || apiKeys.length === 0) {
    return {
      hasValidKey: false,
      error: 'No Perplexity API keys provided',
      validKey: null
    };
  }

  console.log(`Validating ${apiKeys.length} Perplexity API key(s)...`);

  for (let i = 0; i < apiKeys.length; i++) {
    const keyData = apiKeys[i];
    console.log(`Validating Perplexity API key ${i + 1}/${apiKeys.length}: ${keyData.label || 'Unlabeled'}`);

    try {
      const validation = await validatePerplexityKey(keyData.key);

      if (validation.isValid) {
        console.log(`✅ Valid Perplexity API key found: ${keyData.label || 'Unlabeled'}`);
        return {
          hasValidKey: true,
          validKey: keyData,
          validation: validation,
          keyIndex: i
        };
      } else {
        console.log(`❌ Invalid Perplexity API key: ${keyData.label || 'Unlabeled'} - ${validation.error}`);
        
        // If it's a rate limit error, the key is technically valid
        if (validation.errorType === 'RATE_LIMIT_ERROR') {
          console.log(`⚠️ Perplexity API key is valid but rate limited: ${keyData.label || 'Unlabeled'}`);
          return {
            hasValidKey: true,
            validKey: keyData,
            validation: { ...validation, isValid: true, isRateLimited: true },
            keyIndex: i
          };
        }
      }
    } catch (error) {
      console.error(`Error validating Perplexity API key ${i + 1}:`, error);
      continue;
    }
  }

  return {
    hasValidKey: false,
    error: 'No valid Perplexity API keys found. Please check your API keys.',
    validKey: null
  };
};

/**
 * Makes a call to Perplexity API for content generation
 * @param {string} apiKey - Perplexity API key
 * @param {string} prompt - The prompt to send
 * @param {string} model - Model to use (default: sonar-pro)
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} - API response with citations
 */
export const callPerplexityAPI = async (apiKey, prompt, model = 'sonar', options = {}) => {
  try {
    const response = await axios.post(
      'https://api.perplexity.ai/chat/completions',
      {
        model: model,
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: options.maxTokens || 4000,
        temperature: options.temperature || 0.7,
        ...options
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: options.timeout || 60000
      }
    );

    // Extract citations from the response if available
    const citations = [];
    if (response.data.citations) {
      citations.push(...response.data.citations);
    }

    // Some models return citations in different formats
    if (response.data.choices && response.data.choices[0] && response.data.choices[0].citations) {
      citations.push(...response.data.choices[0].citations);
    }

    // Parse citations from the content if they're embedded
    const content = response.data.choices[0].message.content;
    const citationRegex = /\[(https?:\/\/[^\]]+)\]/g;
    let match;
    while ((match = citationRegex.exec(content)) !== null) {
      citations.push({
        url: match[1],
        title: 'Referenced Source'
      });
    }

    return {
      content: content,
      usage: response.data.usage,
      model: response.data.model,
      citations: citations
    };
  } catch (error) {
    console.error('Perplexity API call error:', error);
    throw error;
  }
};

/**
 * Generate industry research using Perplexity's real-time capabilities
 * @param {string} apiKey - Perplexity API key
 * @param {string} niche - The program niche
 * @param {string} mustHaveAspects - Required aspects
 * @returns {Promise<Object>} - Research results with citations
 */
export const generateIndustryResearch = async (apiKey, niche, mustHaveAspects) => {
  try {
    const researchPrompt = `
Conduct comprehensive real-time industry research for a MicroMasters program in: ${niche}

Key requirements to address: ${mustHaveAspects}

Please provide current, up-to-date information including:

1. **Current Industry Trends (2024-2025)**: Latest developments, emerging technologies, and market shifts in ${niche}
2. **Market Demand Analysis**: Current job market trends, salary ranges, and demand for professionals in this field
3. **Skills Gap Analysis**: What specific skills are employers looking for that are currently in short supply?
4. **Industry Pain Points**: What are the biggest challenges professionals and organizations face in ${niche} right now?
5. **Future Outlook**: Predicted trends for the next 2-3 years based on current market indicators
6. **Key Industry Players**: Leading companies, thought leaders, and influential organizations
7. **Certification and Education Trends**: What certifications or educational paths are most valued currently?
8. **Technology Stack**: Current tools, platforms, and technologies that are essential in this field
9. **Success Metrics**: How is success typically measured in ${niche} roles?
10. **Real-World Applications**: Current use cases and practical applications that professionals should know

Please provide specific, actionable insights with recent examples and data where available. Focus on information that would help design a relevant, industry-aligned curriculum.

Include citations and references to your sources where possible.
    `;

    console.log('Generating industry research with Perplexity...');
    const result = await callPerplexityAPI(
      apiKey,
      researchPrompt,
      'sonar', // Use sonar for research (has web access)
      {
        maxTokens: 4000,
        temperature: 0.3 // Lower temperature for more factual content
      }
    );

    console.log('✅ Industry research completed with Perplexity');
    return result;
  } catch (error) {
    console.error('Error generating industry research:', error);
    throw error;
  }
};

/**
 * Generate current trends and insights for lesson enhancement
 * @param {string} apiKey - Perplexity API key
 * @param {string} topic - The lesson topic
 * @param {string} niche - The program niche
 * @returns {Promise<Object>} - Trends and insights with citations
 */
export const generateCurrentTrends = async (apiKey, topic, niche) => {
  try {
    const trendsPrompt = `
Research the latest trends and developments related to "${topic}" in the context of ${niche}.

Please provide:
1. **Recent Developments (Last 6 months)**: Latest news, updates, and breakthroughs
2. **Industry Statistics**: Current relevant statistics and data points
3. **Expert Opinions**: Recent quotes or insights from industry leaders
4. **Case Studies**: Recent real-world examples and success stories
5. **Best Practices**: Current recommended approaches and methodologies
6. **Emerging Tools**: New tools, platforms, or technologies related to this topic
7. **Regulatory Changes**: Any recent policy or regulatory updates affecting this area
8. **Market Impact**: How current market conditions are affecting this topic

Focus on information from 2024-2025 and provide specific, actionable insights that can enhance educational content.
    `;

    const result = await callPerplexityAPI(
      apiKey,
      trendsPrompt,
      'sonar',
      {
        maxTokens: 2000,
        temperature: 0.3
      }
    );

    return result;
  } catch (error) {
    console.error('Error generating current trends:', error);
    throw error;
  }
};
import axios from 'axios';

/**
 * Validates an OpenAI API key by making a test request
 * @param {string} apiKey - The OpenAI API key to validate
 * @returns {Promise<Object>} - Validation result with success status and details
 */
export const validateOpenAIKey = async (apiKey) => {
  try {
    // Check if API key format is correct
    if (!apiKey || typeof apiKey !== 'string') {
      return {
        isValid: false,
        error: 'API key is required and must be a string',
        errorType: 'FORMAT_ERROR'
      };
    }

    // Check if API key starts with 'sk-'
    if (!apiKey.startsWith('sk-')) {
      return {
        isValid: false,
        error: 'Invalid API key format. OpenAI API keys should start with "sk-"',
        errorType: 'FORMAT_ERROR'
      };
    }

    // Check if API key has reasonable length (OpenAI keys are typically 51 characters)
    if (apiKey.length < 40) {
      return {
        isValid: false,
        error: 'API key appears to be too short. Please check your key.',
        errorType: 'FORMAT_ERROR'
      };
    }

    console.log('Validating OpenAI API key...');

    // Make a simple test request to validate the key
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4o-mini",
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
        message: 'API key is valid and working',
        model: response.data.model,
        usage: response.data.usage
      };
    } else {
      return {
        isValid: false,
        error: 'Unexpected response from OpenAI API',
        errorType: 'API_ERROR'
      };
    }

  } catch (error) {
    console.error('API key validation error:', error);

    // Handle different types of errors
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      switch (status) {
        case 401:
          return {
            isValid: false,
            error: 'Invalid API key. Please check your OpenAI API key and try again.',
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
            error: 'OpenAI API is currently unavailable. Please try again later.',
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
 * Validates multiple API keys and returns the first valid one
 * @param {Array<Object>} apiKeys - Array of API key objects with {key, label, id}
 * @returns {Promise<Object>} - Validation result with the first valid key
 */
export const validateApiKeys = async (apiKeys) => {
  if (!apiKeys || apiKeys.length === 0) {
    return {
      hasValidKey: false,
      error: 'No API keys provided',
      validKey: null
    };
  }

  console.log(`Validating ${apiKeys.length} API key(s)...`);

  for (let i = 0; i < apiKeys.length; i++) {
    const keyData = apiKeys[i];
    console.log(`Validating API key ${i + 1}/${apiKeys.length}: ${keyData.label || 'Unlabeled'}`);

    try {
      const validation = await validateOpenAIKey(keyData.key);
      
      if (validation.isValid) {
        console.log(`✅ Valid API key found: ${keyData.label || 'Unlabeled'}`);
        return {
          hasValidKey: true,
          validKey: keyData,
          validation: validation,
          keyIndex: i
        };
      } else {
        console.log(`❌ Invalid API key: ${keyData.label || 'Unlabeled'} - ${validation.error}`);
        
        // If it's a rate limit error, the key is technically valid
        if (validation.errorType === 'RATE_LIMIT_ERROR') {
          console.log(`⚠️ API key is valid but rate limited: ${keyData.label || 'Unlabeled'}`);
          return {
            hasValidKey: true,
            validKey: keyData,
            validation: {
              ...validation,
              isValid: true,
              isRateLimited: true
            },
            keyIndex: i
          };
        }
      }
    } catch (error) {
      console.error(`Error validating API key ${i + 1}:`, error);
      continue;
    }
  }

  return {
    hasValidKey: false,
    error: 'No valid API keys found. Please check your OpenAI API keys.',
    validKey: null
  };
};

/**
 * Quick format validation without making API calls
 * @param {string} apiKey - The API key to validate
 * @returns {Object} - Format validation result
 */
export const quickValidateKeyFormat = (apiKey) => {
  if (!apiKey || typeof apiKey !== 'string') {
    return {
      isValidFormat: false,
      error: 'API key is required and must be a string'
    };
  }

  if (!apiKey.startsWith('sk-')) {
    return {
      isValidFormat: false,
      error: 'API key must start with "sk-"'
    };
  }

  if (apiKey.length < 40) {
    return {
      isValidFormat: false,
      error: 'API key appears to be too short'
    };
  }

  return {
    isValidFormat: true,
    message: 'API key format is correct'
  };
};
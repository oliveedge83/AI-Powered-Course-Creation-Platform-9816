import { validateOpenAIKey, validateApiKeys as validateOpenAIKeys } from './apiKeyValidator';
import { validatePerplexityKey, validatePerplexityKeys } from './perplexityService';

/**
 * Validates all API keys (OpenAI and Perplexity) and returns validation results
 * @param {Array<Object>} openaiKeys - Array of OpenAI API key objects
 * @param {Array<Object>} perplexityKeys - Array of Perplexity API key objects
 * @returns {Promise<Object>} - Comprehensive validation results
 */
export const validateAllApiKeys = async (openaiKeys = [], perplexityKeys = []) => {
  const results = {
    openai: {
      hasValidKey: false,
      validKey: null,
      error: null,
      validation: null
    },
    perplexity: {
      hasValidKey: false,
      validKey: null,
      error: null,
      validation: null
    },
    hasAnyValidKey: false,
    summary: {
      totalKeys: openaiKeys.length + perplexityKeys.length,
      validOpenAI: 0,
      validPerplexity: 0,
      totalValid: 0
    }
  };

  try {
    // Validate OpenAI keys
    if (openaiKeys.length > 0) {
      console.log('Validating OpenAI API keys...');
      const openaiValidation = await validateOpenAIKeys(openaiKeys);
      results.openai = openaiValidation;
      if (openaiValidation.hasValidKey) {
        results.summary.validOpenAI = 1;
        results.hasAnyValidKey = true;
      }
    }

    // Validate Perplexity keys
    if (perplexityKeys.length > 0) {
      console.log('Validating Perplexity API keys...');
      const perplexityValidation = await validatePerplexityKeys(perplexityKeys);
      results.perplexity = perplexityValidation;
      if (perplexityValidation.hasValidKey) {
        results.summary.validPerplexity = 1;
        results.hasAnyValidKey = true;
      }
    }

    results.summary.totalValid = results.summary.validOpenAI + results.summary.validPerplexity;

    console.log('API Key validation summary:', results.summary);
    return results;

  } catch (error) {
    console.error('Error during API key validation:', error);
    return {
      ...results,
      error: 'Failed to validate API keys. Please check your internet connection.'
    };
  }
};

/**
 * Get the best available API key for content generation
 * @param {Object} validationResults - Results from validateAllApiKeys
 * @returns {Object} - Best API key with provider info
 */
export const getBestApiKey = (validationResults) => {
  // Prefer OpenAI for content generation, fall back to Perplexity
  if (validationResults.openai.hasValidKey) {
    return {
      provider: 'openai',
      key: validationResults.openai.validKey.key,
      label: validationResults.openai.validKey.label,
      validation: validationResults.openai.validation
    };
  }

  if (validationResults.perplexity.hasValidKey) {
    return {
      provider: 'perplexity',
      key: validationResults.perplexity.validKey.key,
      label: validationResults.perplexity.validKey.label,
      validation: validationResults.perplexity.validation
    };
  }

  return null;
};

/**
 * Get Perplexity API key specifically for research tasks
 * @param {Object} validationResults - Results from validateAllApiKeys
 * @returns {Object|null} - Perplexity API key or null
 */
export const getPerplexityApiKey = (validationResults) => {
  if (validationResults.perplexity.hasValidKey) {
    return {
      provider: 'perplexity',
      key: validationResults.perplexity.validKey.key,
      label: validationResults.perplexity.validKey.label,
      validation: validationResults.perplexity.validation
    };
  }
  return null;
};
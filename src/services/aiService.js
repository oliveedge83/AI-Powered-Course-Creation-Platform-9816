import axios from 'axios';
import {validateOpenAIKey} from './apiKeyValidator';
import {generateIndustryResearch,callPerplexityAPI} from './perplexityService';
import {getBestApiKey,getPerplexityApiKey} from './enhancedApiKeyValidator';

// Function to generate comprehensive course context with enhanced research
export const generateCourseContext = async (programData, validationResults, usePerplexityResearch = true) => {
  try {
    console.log("Starting enhanced course context generation...");
    
    // Get the best API key for content generation
    const bestApiKey = getBestApiKey(validationResults);
    if (!bestApiKey) {
      throw new Error('No valid API keys available for content generation');
    }
    
    console.log(`Using ${bestApiKey.provider} API for content generation: ${bestApiKey.label}`);
    
    let industryResearch = '';
    let researchCitations = [];
    
    // Use Perplexity for industry research if available and requested
    if (usePerplexityResearch) {
      const perplexityKey = getPerplexityApiKey(validationResults);
      if (perplexityKey) {
        console.log("Conducting real-time industry research with Perplexity...");
        try {
          const researchResult = await generateIndustryResearch(
            perplexityKey.key,
            programData.niche,
            programData.mustHaveAspects
          );
          industryResearch = researchResult.content;
          researchCitations = researchResult.citations || [];
          console.log("✅ Industry research completed with Perplexity");
        } catch (error) {
          console.warn("⚠️ Perplexity research failed, continuing without:", error.message);
          industryResearch = '';
          researchCitations = [];
        }
      } else {
        console.log("No Perplexity API key available, skipping industry research");
      }
    }

    // Generate enhanced research prompt
    const researchPrompt = `
      Act as a senior academic strategist and career analyst for a top-tier university. I am developing a new MicroMasters program in the professional niche of: ${programData.niche}.

      Some of the considerations for the course as per course designer are:
      Must Have aspect: ${programData.mustHaveAspects}
      Additional design considerations: ${programData.designConsiderations || 'None specified'}

      ${industryResearch ? `
      CURRENT INDUSTRY RESEARCH AND TRENDS:
      ${industryResearch}
      
      Please integrate this real-time industry data into your analysis and recommendations.
      ` : ''}

      Your mission is to uncover the most potent professional and emotional drivers, targeted business outcomes of the target audience for this program. This deep insight will inform the program's content and curriculum design to ensure maximum business impact and results for the participants.

      The final output MUST be a single text paragraph string titled "course context".

      Course Context will include:
      - "programTitle": A prestigious and descriptive title for the MicroMasters program.
      - "programLevelOutcomes": A numbered list (paragraph, not array) of 4-6 high-level outcomes a student will achieve.
      - "targetAudience": A detailed description of the ideal profile for this program.
      - "industryRelevance": A brief analysis of why this program is currently relevant, citing industry trends and PESTEL analysis of key industry drivers. ${industryResearch ? 'Use the provided current industry research to enhance this section.' : ''} Generated as a numbered text paragraph of few bullet points (not array)
      - "hardHittingPainPoints": An array of the most significant anxieties, frustrations, or roadblocks for practitioners in this niche face. ${industryResearch ? 'Include current market challenges from the research data.' : ''} Generated as a numbered text paragraph of few bullet points (not array)
      - "keyEmotionalTriggers": An array of the deep-seated emotional drivers for actionable results in this field. Generated as a numbered text paragraph of few bullet points (not array)
      - "mostImpactfulOutcomes": An array of the most powerful results and business outcomes practitioners are aiming at. These should be practical and tangible real business outcomes. ${industryResearch ? 'Include current market opportunities from the research.' : ''} Generated as a numbered text paragraph of few bullet points (not array)
      - "foundationalKnowledge": A description of the prerequisite knowledge or experience a student should have.
      - "instructionalDesignFramework": Recommend a framework suitable for a multi-course, advanced program.

      Generate the "course context" paragraph now. The output should be strictly a text paragraph with numbered list of parameters that can be passed on to the next node.
    `;

    // Use the appropriate API based on the best available key
    let response;
    if (bestApiKey.provider === 'openai') {
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4.1-mini-2025-04-14",
          messages: [
            {
              role: "system",
              content: "You are a senior academic strategist and career analyst with deep expertise in curriculum design and industry analysis. You excel at integrating current market research and trends into educational program design."
            },
            {
              role: "user",
              content: researchPrompt
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bestApiKey.key}`
          }
        }
      );
    } else if (bestApiKey.provider === 'perplexity') {
      response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: "sonar-pro",
          messages: [
            {
              role: "user",
              content: `As a senior academic strategist and career analyst with deep expertise in curriculum design and industry analysis, ${researchPrompt}`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bestApiKey.key}`
          }
        }
      );
    }

    console.log("✅ Enhanced course context generated successfully");
    return {
      content: response.data.choices[0].message.content,
      citations: researchCitations
    };
  } catch (error) {
    console.error("❌ Error generating course context:", error);
    
    // Provide more specific error information
    if (error.message.includes('No valid API keys')) {
      throw error; // Re-throw validation errors
    }

    // For other API errors, provide detailed information
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error('API Authentication Failed: Invalid API key. Please check your API keys in settings.');
      } else if (status === 429) {
        throw new Error('API Rate Limit Exceeded: Please try again in a few moments or check your usage limits.');
      } else if (status === 403) {
        throw new Error('API Access Denied: Your API key may not have the required permissions.');
      } else {
        throw new Error(`API Error (${status}): ${errorData?.error?.message || 'Unknown API error'}`);
      }
    }

    // Network or other errors
    throw new Error(`Failed to generate course context: ${error.message}. Please check your internet connection and API keys.`);
  }
};

// Function to generate program structure with enhanced research and Sonar-Pro support
export const generateProgramStructure = async (programData, validationResults, usePerplexityResearch = true) => {
  try {
    console.log("🚀 Starting enhanced program structure generation...");
    console.log("Program Data:", {
      niche: programData.niche,
      numberOfCourses: programData.numberOfCourses,
      useSonarProStructure: programData.useSonarProStructure
    });
    
    // Determine which API to use based on useSonarProStructure flag
    let structureApiKey;
    if (programData.useSonarProStructure) {
      // Use Perplexity Sonar-Pro for structure generation
      const perplexityKey = getPerplexityApiKey(validationResults);
      if (!perplexityKey) {
        throw new Error('Sonar-Pro structure generation requested but no valid Perplexity API key available');
      }
      structureApiKey = perplexityKey;
      console.log(`✅ Using Perplexity Sonar-Pro for structure generation: ${structureApiKey.label}`);
    } else {
      // Use the best available API key (preferring OpenAI)
      structureApiKey = getBestApiKey(validationResults);
      if (!structureApiKey) {
        throw new Error('No valid API keys available for program generation');
      }
      console.log(`✅ Using ${structureApiKey.provider} API for program generation: ${structureApiKey.label}`);
    }

    // Step 1: Generate comprehensive course context with enhanced research
    console.log("📊 Generating course context...");
    const courseContextResult = await generateCourseContext(programData, validationResults, usePerplexityResearch);
    const courseContext = courseContextResult.content;
    const researchCitations = courseContextResult.citations || [];
    console.log("✅ Course context generated successfully");

    // Step 2: Generate program structure using the selected API
    console.log("🏗️ Generating program structure...");
    const structurePrompt = `
      Based on the following comprehensive course context and program requirements, create a detailed MicroMasters program structure.

      Course Context:
      ${courseContext}

      Program Requirements:
      - Number of courses: ${programData.numberOfCourses}
      - Instructional design model: ${programData.instructionalDesignModel}
      - Must-have aspects: ${programData.mustHaveAspects}
      - Design considerations: ${programData.designConsiderations || 'None specified'}

      CRITICAL REQUIREMENTS:
      - Each course MUST have exactly 5-6 comprehensive topics
      - Each topic MUST have exactly 4-5 detailed lessons
      - Lesson descriptions must be comprehensive (150-200 words each)
      - All content must be practical, industry-relevant, and progressive
      - Integrate current industry trends and market demands where applicable

      IMPORTANT: You MUST respond with ONLY a valid JSON object. Do not include any explanatory text before or after the JSON. The JSON should start with { and end with }.

      Format your response as a JSON object with this exact structure:
      {
        "programContext": "The full program context text here",
        "summaryProgramContext": "A concise 2-3 sentence summary of the program context for use in subsequent content generation",
        "researchEnhanced": ${usePerplexityResearch},
        "usedSonarProStructure": ${programData.useSonarProStructure || false},
        "courses": [
          {
            "id": "course-1",
            "courseTitle": "Comprehensive and descriptive title for Course 1",
            "courseDescription": "Detailed 3-4 sentence description of the course covering objectives, key topics, and learning outcomes",
            "topics": [
              {
                "id": "topic-1-1",
                "topicTitle": "Specific and actionable topic title with clear learning objective",
                "topicLearningObjectiveDescription": "Detailed learning objectives and outcomes for this topic (2-3 comprehensive sentences explaining what students will master)",
                "additionalContext": "",
                "lessons": [
                  {
                    "id": "lesson-1-1-1",
                    "lessonTitle": "Specific and practical lesson title",
                    "lessonDescription": "Comprehensive 150-200 word description covering: lesson objectives, key concepts to be learned, practical applications, activities students will engage in, expected outcomes, and how this lesson builds toward the topic objectives. Include specific skills and knowledge students will gain.",
                    "additionalContext": ""
                  }
                ]
              }
            ]
          }
        ]
      }

      ENSURE:
      - Include exactly 5-6 comprehensive topics per course
      - Include exactly 4-5 detailed lessons per topic
      - Each lesson description is 150-200 words
      - Course titles are prestigious and descriptive
      - Progressive difficulty and logical flow throughout
      - Include hands-on, project-based learning elements
      - All content aligns with professional MicroMasters standards
      - Integrate current market trends and industry demands where relevant
      - RESPOND ONLY WITH THE JSON OBJECT - NO OTHER TEXT
    `;

    console.log("🤖 Making API call for structure generation...");
    let response;
    let structureCitations = [];

    if (programData.useSonarProStructure && structureApiKey.provider === 'perplexity') {
      // Use Perplexity Sonar-Pro with medium context and one month window
      response = await callPerplexityAPI(
        structureApiKey.key,
        `As an expert educational content designer specializing in professional MicroMasters programs, ${structurePrompt}`,
        'sonar-pro', // Use sonar-pro model
        {
          maxTokens: 2500, // 2500 token limit as requested
          temperature: 0.7
          // Note: Perplexity API doesn't have explicit context window settings like "medium" or "one month"
          // but sonar-pro inherently uses recent web data
        }
      );
      
      // Extract citations if available
      structureCitations = response.citations || [];
      
    } else if (structureApiKey.provider === 'openai') {
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4.1-mini-2025-04-14",
          messages: [
            {
              role: "system",
              content: "You are an expert educational content designer specializing in professional MicroMasters programs. Create comprehensive, industry-aligned curriculum structures with detailed content that reflects current market demands and trends. ALWAYS respond with ONLY a valid JSON object - no explanatory text."
            },
            {
              role: "user",
              content: structurePrompt
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${structureApiKey.key}`
          }
        }
      );
      
    } else if (structureApiKey.provider === 'perplexity') {
      response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: "sonar-pro",
          messages: [
            {
              role: "user",
              content: `As an expert educational content designer specializing in professional MicroMasters programs, ${structurePrompt}`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${structureApiKey.key}`
          }
        }
      );
    }

    // Extract and parse the response
    let content;
    if (programData.useSonarProStructure && structureApiKey.provider === 'perplexity') {
      content = response.content; // Direct content from callPerplexityAPI
    } else {
      content = response.data.choices[0].message.content; // Standard API response
    }

    console.log("📝 Raw API response received, length:", content.length);
    console.log("🔍 First 500 characters:", content.substring(0, 500));

    // Clean the content - remove any markdown formatting and extract JSON
    let cleanContent = content.trim();

    // Remove markdown code blocks if present
    const codeBlockMatch = cleanContent.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      cleanContent = codeBlockMatch[1].trim();
      console.log("📋 Extracted content from code block");
    }

    // Find the JSON object - look for the outermost braces
    const jsonStart = cleanContent.indexOf('{');
    const jsonEnd = cleanContent.lastIndexOf('}');

    if (jsonStart === -1 || jsonEnd === -1 || jsonEnd <= jsonStart) {
      console.error("❌ No JSON found in response:", cleanContent);
      throw new Error('No valid JSON object found in API response. The AI may have generated text instead of JSON.');
    }

    const jsonString = cleanContent.substring(jsonStart, jsonEnd + 1);
    console.log("🔧 Extracted JSON string length:", jsonString.length);
    console.log("🔍 JSON preview:", jsonString.substring(0, 200) + "...");

    let parsedData;
    try {
      parsedData = JSON.parse(jsonString);
      console.log("✅ JSON parsed successfully");
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      console.error("🔍 Attempted to parse:", jsonString.substring(0, 1000) + "...");
      throw new Error(`Failed to parse API response as JSON: ${parseError.message}. The AI response may be malformed.`);
    }

    // Validate the parsed data structure
    if (!parsedData.courses || !Array.isArray(parsedData.courses)) {
      console.error("❌ Invalid structure - courses missing:", parsedData);
      throw new Error("Invalid program structure: missing or invalid courses array");
    }

    if (parsedData.courses.length === 0) {
      console.error("❌ No courses generated");
      throw new Error("No courses were generated. Please try again.");
    }

    // Validate each course has topics and lessons
    for (let i = 0; i < parsedData.courses.length; i++) {
      const course = parsedData.courses[i];
      if (!course.topics || !Array.isArray(course.topics) || course.topics.length === 0) {
        console.error(`❌ Course ${i + 1} has no topics:`, course);
        throw new Error(`Course ${i + 1} (${course.courseTitle || 'Untitled'}) has no topics`);
      }
      
      for (let j = 0; j < course.topics.length; j++) {
        const topic = course.topics[j];
        if (!topic.lessons || !Array.isArray(topic.lessons) || topic.lessons.length === 0) {
          console.error(`❌ Topic ${j + 1} in course ${i + 1} has no lessons:`, topic);
          throw new Error(`Topic ${j + 1} (${topic.topicTitle || 'Untitled'}) in course ${i + 1} has no lessons`);
        }
      }
    }

    // Add citations to the response
    parsedData.researchCitations = researchCitations;
    parsedData.structureCitations = structureCitations;
    parsedData.programContext = courseContext; // Ensure we have the full context

    console.log(`🎉 Enhanced program structure generated successfully using ${programData.useSonarProStructure ? 'Sonar-Pro' : structureApiKey.provider}`);
    console.log(`📊 Generated ${parsedData.courses.length} courses with ${parsedData.courses.reduce((total, course) => total + course.topics.length, 0)} total topics`);
    
    return parsedData;

  } catch (error) {
    console.error("❌ Error generating program structure:", error);
    
    // Don't fall back to mock data - throw the error so user knows what went wrong
    if (error.message.includes('No valid API keys')) {
      throw error; // Re-throw validation errors
    }

    // For JSON parsing errors, provide more specific information
    if (error.message.includes('parse') || error.message.includes('JSON')) {
      throw new Error(`Failed to parse AI response: ${error.message}. The AI may have generated invalid JSON format. Please try again.`);
    }

    // For other API errors, provide detailed information
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error('API Authentication Failed: Invalid API key. Please verify your API keys in settings and ensure they have the correct permissions.');
      } else if (status === 429) {
        throw new Error('API Rate Limit Exceeded: You have exceeded your API usage limits. Please check your account or try again later.');
      } else if (status === 403) {
        throw new Error('API Access Denied: Your API key does not have access to the required models. Please check your account permissions.');
      } else {
        throw new Error(`API Error (${status}): ${errorData?.error?.message || 'Unknown API error occurred'}`);
      }
    }

    // Network or parsing errors
    throw new Error(`Program structure generation failed: ${error.message}. Please check your internet connection and try again.`);
  }
};

// Enhanced topic and lesson generation for individual courses
export const generateCourseTopicsAndLessons = async (course, programContext, summaryProgramContext, mustHaveAspects, designConsiderations, validationResults) => {
  try {
    console.log(`Generating enhanced topics and lessons for course: ${course.courseTitle}`);
    
    // Get the best API key for content generation
    const bestApiKey = getBestApiKey(validationResults);
    if (!bestApiKey) {
      throw new Error('No valid API keys available for course generation');
    }
    
    console.log("✅ Using validated API key for course regeneration...");
    
    const topicGenerationPrompt = `
      GENERATE DETAILED COURSE OUTLINE BASED ON CONTEXT:
      
      Act as an expert curriculum architect. You are designing one course within a larger MicroMasters program.
      Your task is to create the complete, detailed curriculum map for this single course.
      
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
    
    let response;
    if (bestApiKey.provider === 'openai') {
      response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: "gpt-4.1-mini-2025-04-14",
          messages: [
            {
              role: "system",
              content: "You are an expert instructional designer specializing in professional education. Create detailed, practical course content with comprehensive lesson descriptions. Each lesson must be unique, specific, and tailored to the course context with current industry relevance."
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
            'Authorization': `Bearer ${bestApiKey.key}`
          }
        }
      );
    } else if (bestApiKey.provider === 'perplexity') {
      response = await axios.post(
        'https://api.perplexity.ai/chat/completions',
        {
          model: "sonar-pro",
          messages: [
            {
              role: "user",
              content: `As an expert instructional designer specializing in professional education, ${topicGenerationPrompt}`
            }
          ],
          temperature: 0.7
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${bestApiKey.key}`
          }
        }
      );
    }
    
    const content = response.data.choices[0].message.content;
    
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      const result = JSON.parse(jsonString);
      console.log("✅ Enhanced topics and lessons generated successfully");
      return result;
    }
    
    const result = JSON.parse(content);
    console.log("✅ Enhanced topics and lessons generated successfully");
    return result;
    
  } catch (error) {
    console.error("❌ Error generating topics and lessons:", error);
    
    if (error.message.includes('No valid API keys')) {
      throw error; // Re-throw validation errors
    }
    
    // For other API errors, provide detailed information
    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;
      
      if (status === 401) {
        throw new Error('API Authentication Failed: Invalid API key. Please check your API key settings.');
      } else if (status === 429) {
        throw new Error('API Rate Limit Exceeded: Please try again in a few moments.');
      } else {
        throw new Error(`API Error (${status}): ${errorData?.error?.message || 'Unknown API error'}`);
      }
    }
    
    throw new Error(`Failed to generate course topics and lessons: ${error.message}`);
  }
};
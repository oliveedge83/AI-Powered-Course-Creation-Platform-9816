import axios from 'axios';

/**
 * AITable Service - Handles all AITable API interactions
 * Validates credentials and posts course data after successful generation
 */

/**
 * Validates AITable API key and datasheet ID
 * @param {string} apiKey - AITable API key
 * @param {string} datasheetId - AITable datasheet ID
 * @returns {Promise<Object>} - Validation result
 */
export const validateAITableCredentials = async (apiKey, datasheetId) => {
  try {
    console.log('🔍 Validating AITable credentials...');
    
    // Check if credentials are provided
    if (!apiKey || !datasheetId) {
      return {
        isValid: false,
        error: 'AITable API key and datasheet ID are required',
        errorType: 'MISSING_CREDENTIALS'
      };
    }

    // ✅ CORRECTED: Use the correct validation endpoint as specified
    // Make a test request to the records endpoint to validate both API key and datasheet ID
    const response = await axios.get(
      `https://aitable.ai/fusion/v1/datasheets/${datasheetId}/records`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 30000 // 30 second timeout
      }
    );

    // ✅ UPDATED: Check for successful response
    if (response.status === 200) {
      console.log('✅ AITable credentials validated successfully');
      return {
        isValid: true,
        message: 'AITable credentials are valid',
        datasheetInfo: {
          recordCount: response.data.data?.records?.length || 0,
          hasAccess: true
        }
      };
    } else {
      return {
        isValid: false,
        error: 'Invalid response from AITable API',
        errorType: 'API_ERROR'
      };
    }

  } catch (error) {
    console.error('❌ AITable credential validation error:', error);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      switch (status) {
        case 401:
          return {
            isValid: false,
            error: 'Invalid AITable API key. Please check your API key and try again.',
            errorType: 'AUTHENTICATION_ERROR',
            statusCode: 401
          };
        case 404:
          return {
            isValid: false,
            error: 'Datasheet not found. Please check your datasheet ID and ensure it exists.',
            errorType: 'NOT_FOUND_ERROR',
            statusCode: 404
          };
        case 403:
          return {
            isValid: false,
            error: 'Access forbidden. Your API key may not have permissions for this datasheet.',
            errorType: 'PERMISSION_ERROR',
            statusCode: 403
          };
        case 429:
          return {
            isValid: false,
            error: 'Rate limit exceeded. Please try again later.',
            errorType: 'RATE_LIMIT_ERROR',
            statusCode: 429
          };
        default:
          return {
            isValid: false,
            error: errorData?.message || `API request failed with status ${status}`,
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
        error: error.message || 'Unknown error occurred while validating AITable credentials',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }
};

/**
 * Generates lesson slides JSON from course data
 * @param {Object} course - Course object with topics and lessons
 * @param {Object} slidesData - Generated slides data from AI
 * @returns {Array} - Array of lesson slide objects
 */
export const generateLessonSlidesJson = (course, slidesData) => {
  try {
    console.log('📊 Generating lesson slides JSON for AITable...');
    
    const lessonSlides = [];
    
    if (!course.topics || !Array.isArray(course.topics)) {
      console.warn('⚠️ No topics found in course for slides generation');
      return lessonSlides;
    }

    // Loop through all topics and lessons to extract slides
    course.topics.forEach((topic, topicIndex) => {
      if (topic.lessons && Array.isArray(topic.lessons)) {
        topic.lessons.forEach((lesson, lessonIndex) => {
          // Try to find slides for this lesson in the slidesData
          let lessonSlideContent = '';
          
          // If we have slides data from AI generation, use it
          if (slidesData && typeof slidesData === 'string') {
            // Parse slides content and extract relevant section for this lesson
            const slideLines = slidesData.split('\n').filter(line => line.trim());
            const lessonSlideLines = slideLines.filter(line => 
              line.toLowerCase().includes(lesson.lessonTitle.toLowerCase().substring(0, 10)) ||
              line.toLowerCase().includes('slide')
            );
            lessonSlideContent = lessonSlideLines.join('\n');
          }
          
          // If no specific slides found, create a basic structure
          if (!lessonSlideContent) {
            lessonSlideContent = `SLIDE 1: ${lesson.lessonTitle}
- Introduction to ${lesson.lessonTitle}
- Key concepts and objectives
- Learning outcomes
- Practical applications

SLIDE 2: Core Concepts
- Main principles
- Important definitions  
- Key frameworks
- Best practices

SLIDE 3: Implementation
- Step-by-step process
- Tools and techniques
- Common challenges
- Success strategies

SLIDE 4: Summary
- Key takeaways
- Action items
- Next steps
- Additional resources`;
          }

          lessonSlides.push({
            lessontitle: lesson.lessonTitle,
            lessonslidecontent: lessonSlideContent
          });
        });
      }
    });

    console.log(`✅ Generated slides JSON for ${lessonSlides.length} lessons`);
    return lessonSlides;

  } catch (error) {
    console.error('❌ Error generating lesson slides JSON:', error);
    return [];
  }
};

/**
 * Posts course data to AITable after successful course generation
 * @param {string} apiKey - AITable API key
 * @param {string} datasheetId - AITable datasheet ID
 * @param {Object} courseData - Course data to post
 * @returns {Promise<Object>} - Post result
 */
export const postCourseToAITable = async (apiKey, datasheetId, courseData) => {
  try {
    console.log('📤 Posting course data to AITable...');
    console.log('📊 Course data:', {
      programTitle: courseData.programTitle,
      courseTitle: courseData.courseTitle,
      courseUniqueId: courseData.courseUniqueId
    });

    // Validate required data
    if (!courseData.programTitle || !courseData.courseTitle || !courseData.courseUniqueId) {
      throw new Error('Missing required course data fields');
    }

    // Prepare the record data
    const recordData = {
      records: [
        {
          fields: {
            ProgramTitle: courseData.programTitle,
            CourseTitle: courseData.courseTitle,
            TopicLessonStructure: courseData.topicLessonStructure,
            CreattionDate: courseData.creationDate, // Note: Keeping original field name as specified
            Target: courseData.target || 'Option A',
            courseuniqueid: courseData.courseUniqueId,
            LessonSlidesJson: JSON.stringify(courseData.lessonSlidesJson)
          }
        }
      ]
    };

    console.log('📋 Posting record to AITable:', {
      url: `https://aitable.ai/fusion/v1/datasheets/${datasheetId}/records`,
      recordFields: Object.keys(recordData.records[0].fields)
    });

    // Make the API call to AITable
    const response = await axios.post(
      `https://aitable.ai/fusion/v1/datasheets/${datasheetId}/records`,
      recordData,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 60000 // 60 second timeout
      }
    );

    if (response.status === 200 || response.status === 201) {
      console.log('✅ Successfully posted course data to AITable');
      console.log('📊 AITable response:', response.data);
      
      return {
        success: true,
        message: 'Course data posted to AITable successfully',
        recordId: response.data.data?.records?.[0]?.recordId,
        response: response.data
      };
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }

  } catch (error) {
    console.error('❌ Error posting course data to AITable:', error);

    if (error.response) {
      const status = error.response.status;
      const errorData = error.response.data;

      return {
        success: false,
        error: errorData?.message || `AITable API error (${status})`,
        statusCode: status,
        details: errorData
      };
    } else if (error.code === 'ECONNABORTED') {
      return {
        success: false,
        error: 'Request timeout while posting to AITable',
        errorType: 'TIMEOUT_ERROR'
      };
    } else {
      return {
        success: false,
        error: error.message || 'Unknown error occurred while posting to AITable',
        errorType: 'UNKNOWN_ERROR'
      };
    }
  }
};

/**
 * Generates topic-lesson structure string for AITable
 * @param {Object} course - Course object with topics and lessons
 * @returns {string} - Formatted topic-lesson structure
 */
export const generateTopicLessonStructure = (course) => {
  try {
    if (!course.topics || !Array.isArray(course.topics)) {
      return 'No topics available';
    }

    const structure = course.topics.map((topic, topicIndex) => {
      const topicTitle = `Topic ${topicIndex + 1}: ${topic.topicTitle}`;
      
      if (!topic.lessons || !Array.isArray(topic.lessons)) {
        return topicTitle;
      }

      const lessons = topic.lessons.map((lesson, lessonIndex) => 
        `  Lesson ${lessonIndex + 1}: ${lesson.lessonTitle}`
      ).join('\n');

      return `${topicTitle}\n${lessons}`;
    }).join('\n\n');

    return structure;

  } catch (error) {
    console.error('❌ Error generating topic-lesson structure:', error);
    return 'Error generating structure';
  }
};

/**
 * Generates unique course ID for AITable
 * @param {string} lmsCourseId - Course ID from LMS (TutorLMS/LifterLMS)
 * @param {number} timestamp - Timestamp when course was posted
 * @returns {string} - Unique course ID
 */
export const generateCourseUniqueId = (lmsCourseId, timestamp) => {
  try {
    // Convert timestamp to seconds offset
    const secondsOffset = Math.floor(timestamp / 1000);
    return `${lmsCourseId}-${secondsOffset}`;
  } catch (error) {
    console.error('❌ Error generating unique course ID:', error);
    return `course-${Math.floor(Date.now() / 1000)}`;
  }
};
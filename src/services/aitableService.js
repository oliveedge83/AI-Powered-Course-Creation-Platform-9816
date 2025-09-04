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
 * ✅ FIXED: Generates lesson slides JSON from course data with proper one-to-one mapping
 * @param {Object} course - Course object with topics and lessons
 * @param {Object} lessonSlidesMap - Map of lesson IDs to their slide content
 * @returns {Array} - Array of lesson slide objects with correct mapping
 */
export const generateLessonSlidesJson = (course, lessonSlidesMap = {}) => {
  try {
    console.log('📊 Generating lesson slides JSON for AITable...');
    console.log('📋 Lesson slides map keys:', Object.keys(lessonSlidesMap));
    
    const lessonSlides = [];

    if (!course.topics || !Array.isArray(course.topics)) {
      console.warn('⚠️ No topics found in course for slides generation');
      return lessonSlides;
    }

    // ✅ CORRECTED: Iterate through each lesson individually and create one-to-one mapping
    course.topics.forEach((topic, topicIndex) => {
      if (topic.lessons && Array.isArray(topic.lessons)) {
        topic.lessons.forEach((lesson, lessonIndex) => {
          console.log(`🔍 Processing lesson: ${lesson.lessonTitle} (ID: ${lesson.id})`);
          
          // ✅ NEW: Try to get lesson-specific slides from the map first
          let lessonSlideContent = '';
          
          // Check if we have specific slide content for this lesson ID
          if (lessonSlidesMap[lesson.id]) {
            lessonSlideContent = lessonSlidesMap[lesson.id];
            console.log(`✅ Found specific slides for lesson ${lesson.lessonTitle}: ${lessonSlideContent.length} characters`);
          } else {
            // ✅ IMPROVED: Create lesson-specific slide structure when no specific content is available
            console.log(`⚠️ No specific slides found for lesson ${lesson.lessonTitle}, generating default structure`);
            
            lessonSlideContent = `SLIDE 1: ${lesson.lessonTitle}
- Introduction to ${lesson.lessonTitle}
- Key concepts and objectives
- Learning outcomes
- Practical applications

SLIDE 2: Core Concepts
- Main principles and frameworks
- Important definitions and terminology
- Key methodologies and approaches
- Industry standards and best practices

SLIDE 3: Implementation & Application
- Step-by-step process and procedures
- Tools, techniques, and resources
- Common challenges and solutions
- Success strategies and tips

SLIDE 4: Real-World Examples
- Case studies and practical scenarios
- Industry examples and applications
- Success stories and lessons learned
- Current trends and developments

SLIDE 5: Key Takeaways & Next Steps
- Summary of main points
- Action items and implementation steps
- Additional resources for further learning
- Connection to upcoming lessons`;
          }

          // ✅ CRITICAL: Create individual JSON object for each lesson
          const lessonSlideObject = {
            lessontitle: lesson.lessonTitle,
            lessonslidecontent: lessonSlideContent
          };

          lessonSlides.push(lessonSlideObject);
          console.log(`✅ Added slides for lesson: ${lesson.lessonTitle}`);
        });
      }
    });

    console.log(`✅ Generated slides JSON for ${lessonSlides.length} individual lessons`);
    console.log('📊 Final lesson slides structure:', lessonSlides.map(slide => ({
      title: slide.lessontitle,
      contentLength: slide.lessonslidecontent.length
    })));

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
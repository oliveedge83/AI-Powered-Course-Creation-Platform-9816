/**
 * Numbering Service - Handles all course numbering logic
 * Generates unique identifiers for programs,courses,topics,and lessons
 */

// Genre mapping for program codes
const GENRE_MAPPING = {
  'technology-cs': '1',
  'business-management': '2',
  'personal-professional': '3',
  'lifestyle-hobbies': '4',
  'creative-arts': '5',
  'academic-subjects': '6',
};

/**
 * Generate 3-letter niche code from program niche
 * @param {string} niche - The program niche
 * @returns {string} - 3-letter alphabetic code
 */
export const generateNicheCode = (niche) => {
  if (!niche) return 'GEN';

  // Remove common words and extract meaningful parts
  const cleanNiche = niche
    .replace(/[^a-zA-Z\s]/g, '') // Remove non-letters
    .replace(/\b(and|or|the|of|in|for|to|with|by)\b/gi, '') // Remove common words
    .trim()
    .toUpperCase();

  const words = cleanNiche.split(/\s+/).filter(word => word.length > 0);

  if (words.length === 0) return 'GEN';

  if (words.length === 1) {
    // Single word - take first 3 characters
    return words[0].substring(0, 3).padEnd(3, 'X');
  } else if (words.length === 2) {
    // Two words - take first letter of first word + first 2 of second
    return (words[0][0] + words[1].substring(0, 2)).padEnd(3, 'X');
  } else {
    // Multiple words - take first letter of first 3 words
    return (words[0][0] + words[1][0] + words[2][0]);
  }
};

/**
 * Generate 2-digit timestamp suffix
 * @param {number} timestamp - Generation timestamp
 * @returns {string} - 2-digit number based on timestamp
 */
export const generateTimestampSuffix = (timestamp = Date.now()) => {
  // Use last 2 digits of seconds + milliseconds for better distribution
  const timeStr = timestamp.toString();
  const lastDigits = timeStr.slice(-4, -2); // Get 2 digits from timestamp
  return lastDigits.padStart(2, '0');
};

/**
 * Generate 6-character program code
 * @param {string} courseDomain - The course domain from design parameters
 * @param {string} niche - The program niche
 * @param {number} timestamp - Generation timestamp
 * @returns {string} - 6-character alphanumeric program code
 */
export const generateProgramCode = (courseDomain, niche, timestamp = Date.now()) => {
  const genreDigit = GENRE_MAPPING[courseDomain] || '2'; // Default to business
  const nicheCode = generateNicheCode(niche);
  const timestampSuffix = generateTimestampSuffix(timestamp);
  return `${genreDigit}${nicheCode}${timestampSuffix}`;
};

/**
 * Generate 7-character course code with program code + sequence
 * @param {string} programCode - 6-character program code
 * @param {number} courseSequence - Course sequence number (1-based)
 * @returns {string} - 7-character course code
 */
export const generateCourseCode = (programCode, courseSequence) => {
  if (!programCode || programCode.length !== 6) {
    throw new Error('Program code must be exactly 6 characters');
  }
  if (!courseSequence || courseSequence < 1) {
    throw new Error('Course sequence must be a positive number starting from 1');
  }
  return `${programCode}${courseSequence}`;
};

/**
 * Generate 2-digit topic code
 * @param {number} courseSequence - Course sequence number (1-based)
 * @param {number} topicSequence - Topic sequence number (1-based)
 * @returns {string} - 2-digit topic code
 */
export const generateTopicCode = (courseSequence, topicSequence) => {
  if (!courseSequence || courseSequence < 1) {
    throw new Error('Course sequence must be a positive number starting from 1');
  }
  if (!topicSequence || topicSequence < 1) {
    throw new Error('Topic sequence must be a positive number starting from 1');
  }
  return `${courseSequence}${topicSequence}`;
};

/**
 * Generate 3-digit lesson code
 * @param {string} topicCode - 2-digit topic code
 * @param {number} lessonSequence - Lesson sequence number (1-based)
 * @returns {string} - 3-digit lesson code
 */
export const generateLessonCode = (topicCode, lessonSequence) => {
  if (!topicCode || topicCode.length !== 2) {
    throw new Error('Topic code must be exactly 2 characters');
  }
  if (!lessonSequence || lessonSequence < 1) {
    throw new Error('Lesson sequence must be a positive number starting from 1');
  }
  return `${topicCode}${lessonSequence}`;
};

/**
 * Apply numbering to a complete program structure
 * @param {Object} programData - Program data with courses,topics,and lessons
 * @returns {Object} - Program data with applied numbering
 */
export const applyNumberingToProgram = (programData) => {
  const timestamp = Date.now();
  // Generate program code
  const courseDomain = programData.designParameters?.courseDomain || 'business-management';
  const programCode = programData.programCode || generateProgramCode(courseDomain, programData.niche, timestamp);
  console.log(`📊 Using program code: ${programCode} for niche: ${programData.niche}`);

  // Apply numbering to courses
  const numberedCourses = programData.courses?.map((course, courseIndex) => {
    const courseSequence = courseIndex + 1;
    const courseCode = generateCourseCode(programCode, courseSequence);
    const { cleanTitle: cleanCourseTitle } = extractNumberingFromTitle(course.courseTitle);
    console.log(`📚 Course ${courseSequence}: ${courseCode} - ${cleanCourseTitle}`);

    // Apply numbering to topics
    const numberedTopics = course.topics?.map((topic, topicIndex) => {
      const topicSequence = topicIndex + 1;
      const topicCode = generateTopicCode(courseSequence, topicSequence);
      const { cleanTitle: cleanTopicTitle } = extractNumberingFromTitle(topic.topicTitle);
      console.log(`🎯 Topic ${topicCode}: ${cleanTopicTitle}`);
      
      // Apply numbering to lessons
      const numberedLessons = topic.lessons?.map((lesson, lessonIndex) => {
        const lessonSequence = lessonIndex + 1;
        const lessonCode = generateLessonCode(topicCode, lessonSequence);
        const { cleanTitle: cleanLessonTitle } = extractNumberingFromTitle(lesson.lessonTitle);
        console.log(`📖 Lesson ${lessonCode}: ${cleanLessonTitle}`);
        
        return {
          ...lesson,
          lessonCode,
          lessonTitle: `${programCode}__${lessonCode} ${cleanLessonTitle}`,
        };
      }) || [];

      return {
        ...topic,
        topicCode,
        topicTitle: `${programCode}__${topicCode} ${cleanTopicTitle}`,
        lessons: numberedLessons,
      };
    }) || [];

    return {
      ...course,
      courseCode,
      courseTitle: `${courseCode} ${cleanCourseTitle}`,
      topics: numberedTopics,
    };
  }) || [];

  return {
    ...programData,
    programCode,
    courses: numberedCourses,
  };
};


/**
 * Extract numbering from titles (for editing purposes)
 * @param {string} title - Title with numbering prefix
 * @returns {Object} - {code,cleanTitle}
 */
export const extractNumberingFromTitle = (title) => {
  if (!title) return { code: '', cleanTitle: title };
  
  // New regex to match:
  // 1. New topic/lesson format: e.g., "2ICT682__11 Title" or "2ICT682__111 Title"
  // 2. Course format: e.g., "2ICT6821 Title"
  // 3. Old topic/lesson format: e.g., "11 Title" or "111 Title"
  const match = title.match(/^([A-Z0-9]{6}__[0-9]{2,3}|[A-Z0-9]{7}|[0-9]{2,3})\s+(.+)$/);
  
  if (match) {
    return { code: match[1], cleanTitle: match[2] };
  }
  
  return { code: '', cleanTitle: title };
};


/**
 * Validate program code format
 * @param {string} programCode - Program code to validate
 * @returns {Object} - Validation result
 */
export const validateProgramCode = (programCode) => {
  if (!programCode || typeof programCode !== 'string') {
    return { isValid: false, error: 'Program code is required' };
  }
  if (programCode.length !== 6) {
    return { isValid: false, error: 'Program code must be exactly 6 characters' };
  }

  const genreDigit = programCode[0];
  const nicheCode = programCode.slice(1, 4);
  const timestampSuffix = programCode.slice(4, 6);

  // Validate genre digit
  if (!/^[1-6]$/.test(genreDigit)) {
    return { isValid: false, error: 'First digit must be 1-6 (genre)' };
  }
  // Validate niche code
  if (!/^[A-Z]{3}$/.test(nicheCode)) {
    return { isValid: false, error: 'Characters 2-4 must be uppercase letters (niche)' };
  }
  // Validate timestamp suffix
  if (!/^[0-9]{2}$/.test(timestampSuffix)) {
    return { isValid: false, error: 'Last 2 characters must be digits (timestamp)' };
  }

  return {
    isValid: true,
    components: {
      genre: genreDigit,
      niche: nicheCode,
      timestamp: timestampSuffix
    }
  };
};

/**
 * Get genre name from code
 * @param {string} genreCode - Genre code (1-6)
 * @returns {string} - Genre name
 */
export const getGenreName = (genreCode) => {
  const genreMap = {
    '1': 'Technology & Computer Science',
    '2': 'Business & Management',
    '3': 'Personal & Professional Development',
    '4': 'Lifestyle, Hobbies, & Practical Skills',
    '5': 'Creative Arts & Design',
    '6': 'Academic Subjects'
  };
  return genreMap[genreCode] || 'Unknown Genre';
};

/**
 * Generate example program codes for testing
 * @returns {Array} - Array of example codes with descriptions
 */
export const generateExampleCodes = () => {
  const examples = [
    { domain: 'business-management', niche: 'Digital Marketing', expected: '2DIG' },
    { domain: 'technology-cs', niche: 'Data Science', expected: '1DAT' },
    { domain: 'creative-arts', niche: 'Graphic Design', expected: '5GRA' },
    { domain: 'personal-professional', niche: 'Leadership Development', expected: '3LEA' }
  ];

  // Use a fixed timestamp to make this function pure and prevent re-render issues.
  const fixedTimestamp = 1700000000000;

  return examples.map((example, index) => {
    const code = generateProgramCode(example.domain, example.niche, fixedTimestamp + (index * 10000));
    return { ...example, generated: code, genre: getGenreName(code[0]) };
  });
};
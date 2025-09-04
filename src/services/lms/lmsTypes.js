// LMS type constants and configurations
export const LMS_TYPES = {
  TUTOR: 'tutor',
  LIFTER: 'lifter'
};

export const LMS_CONFIGS = {
  [LMS_TYPES.TUTOR]: {
    name: 'TutorLMS',
    description: 'WordPress LMS plugin with comprehensive course management',
    endpoints: {
      courses: '/wp-json/tutor/v1/courses',
      topics: '/wp-json/tutor/v1/topics',
      lessons: '/wp-json/tutor/v1/lessons',
      quizzes: '/wp-json/tutor/v1/quizzes',
      assignments: '/wp-json/tutor/v1/assignments'
    },
    features: {
      supportsTopics: true,
      supportsAssignments: true,
      quizAttachmentLevel: 'topic', // Quizzes attached to topics
      contentStructure: 'course -> topic -> lesson'
    }
  },
  [LMS_TYPES.LIFTER]: {
    name: 'LifterLMS',
    description: 'Advanced WordPress LMS with powerful course building features',
    endpoints: {
      courses: '/wp-json/llms/v1/courses',
      sections: '/wp-json/llms/v1/sections',
      lessons: '/wp-json/llms/v1/lessons',
      quizzes: '/wp-json/llms/v1/quizzes',
      questions: '/wp-json/llms/v1/questions'
    },
    features: {
      supportsTopics: false, // Uses sections instead
      supportsSections: true,
      supportsAssignments: false, // Uses different assignment system
      quizAttachmentLevel: 'lesson', // Quizzes attached to lessons
      contentStructure: 'course -> section -> lesson'
    }
  }
};

// Terminology mapping for consistent UI
export const TERMINOLOGY_MAPPING = {
  [LMS_TYPES.TUTOR]: {
    course: 'Course',
    topic: 'Topic',
    section: 'Topic', // Maps to topic for UI consistency
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment'
  },
  [LMS_TYPES.LIFTER]: {
    course: 'Course',
    topic: 'Section', // Maps section to topic for UI consistency
    section: 'Section',
    lesson: 'Lesson',
    quiz: 'Quiz',
    assignment: 'Assignment'
  }
};

export const getTerminology = (lmsType, term) => {
  return TERMINOLOGY_MAPPING[lmsType]?.[term] || term;
};

export const getLMSConfig = (lmsType) => {
  return LMS_CONFIGS[lmsType] || LMS_CONFIGS[LMS_TYPES.TUTOR];
};
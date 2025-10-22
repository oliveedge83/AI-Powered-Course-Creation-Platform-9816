/**
 * Instructional Parameter Service
 * Provides parameter-based prompt blocks for enhanced lesson content generation
 */

// Parameter definitions and dropdown options
export const DESIGN_PARAMETERS = {
  courseDomain: {
    label: 'Course Domain',
    description: 'The high-level subject area of the course',
    options: [
      { value: 'technology-cs', label: 'Technology & Computer Science' },
      { value: 'business-management', label: 'Business & Management' },
      {
        value: 'personal-professional',
        label: 'Personal & Professional Development',
      },
      {
        value: 'lifestyle-hobbies',
        label: 'Lifestyle, Hobbies, & Practical Skills',
      },
      { value: 'creative-arts', label: 'Creative Arts & Design' },
      { value: 'academic-subjects', label: 'Academic Subjects' },
    ],
    default: 'business-management',
  },
  targetAudienceLevel: {
    label: 'Target Audience Level',
    description: 'The learner\'s prior knowledge and experience level',
    options: [
      { value: 'beginner', label: 'Beginner' },
      { value: 'intermediate', label: 'Intermediate' },
      { value: 'advanced', label: 'Advanced' },
    ],
    default: 'intermediate',
  },
  courseToneStyle: {
    label: 'Course Tone & Style',
    description: 'The "voice" and writing style of the course content',
    options: [
      { value: 'formal-academic', label: 'Formal/Academic' },
      { value: 'professional-business', label: 'Professional/Business' },
      { value: 'practical-handson', label: 'Practical/Hands-on' },
      { value: 'conversational-engaging', label: 'Conversational/Engaging' },
    ],
    default: 'professional-business',
  },
  contentFocus: {
    label: 'Content Focus',
    description: 'The primary instructional goal of the content',
    options: [
      { value: 'theoretical-concepts', label: 'Theoretical Concepts' },
      {
        value: 'practical-application',
        label: 'Practical Application & Case Studies',
      },
      { value: 'tool-software', label: 'Tool/Software Proficiency' },
    ],
    default: 'practical-application',
  },
};

// Default parameter set for backward compatibility
export const DEFAULT_DESIGN_PARAMETERS = {
  courseDomain: 'business-management',
  targetAudienceLevel: 'intermediate',
  courseToneStyle: 'professional-business',
  contentFocus: 'practical-application',
};

// Instructional prompt blocks library
const PARAMETER_BLOCKS = {
  courseDomain: {
    'technology-cs':
      'The subject matter is technical. Prioritize accuracy, logical structure, and the use of correct, industry-standard terminology. Where applicable, provide clear, well-commented code snippets or configuration steps. Assume a reader who values precision and logical flow.',
    'business-management':
      'The subject matter falls within the Business domain. All content, examples, and case studies should be relevant to corporate or organizational environments. Focus on concepts like strategy, operations, finance, and performance metrics. The goal is to provide learners with actionable business acumen.',
    'personal-professional':
      'The subject matter relates to personal or professional growth. Focus on actionable frameworks, self-reflection, and behavioral change. The content should be encouraging and aim to equip the learner with practical skills for improving their career or personal effectiveness.',
    'lifestyle-hobbies':
      'The subject matter is a practical skill or hobby pursued for personal enrichment. The content must be a clear, step-by-step tutorial that is easy for a general audience to follow. Use simple, encouraging language and focus on achieving a successful and enjoyable outcome.',
    'creative-arts':
      'The subject matter is creative and aesthetic. Focus on principles, techniques, and the creative process. The content should inspire and guide the learner in developing their artistic skills and personal style. Use descriptive language and reference visual examples where appropriate.',
    'academic-subjects':
      'The subject matter is academic. The content should be structured like a formal lesson, prioritizing theoretical understanding, evidence-based reasoning, and critical analysis. Adhere to the established conventions and terminology of the specific academic field.',
  },
  targetAudienceLevel: {
    beginner:
      'The target audience is new to this subject. Assume no prior knowledge. Explain all concepts from the ground up using simple language and relatable analogies. Avoid jargon or define it immediately. The goal is to build foundational understanding and confidence.',
    intermediate:
      'The target audience has a basic understanding of the topic but lacks deep or practical knowledge. Briefly recap foundational concepts, but quickly move to more complex details. Focus on connecting new information to what they likely already know. The goal is to deepen their expertise.',
    advanced:
      'The target audience consists of experienced professionals. Do not waste time on basic definitions. Dive directly into complex, nuanced, and high-level concepts. Use industry-standard terminology. The goal is to challenge their thinking and provide expert-level insights.',
  },
  courseToneStyle: {
    'formal-academic':
      'Adopt a formal, academic tone. The writing should be objective, evidence-based, and structured like a university lecture. Use precise terminology and maintain a scholarly voice.',
    'professional-business':
      'Adopt a professional, business-oriented tone. The language should be clear, concise, and focused on business outcomes, ROI, and strategic value. The style should be similar to a report for executive leadership.',
    'practical-handson':
      'Adopt a practical, direct, and action-oriented tone. The writing should be a \'how-to\' guide. Focus on actionable steps, instructions, and real-world application. Use active voice and command verbs.',
    'conversational-engaging':
      'Adopt a friendly, conversational, and engaging tone. Write as if you are a knowledgeable mentor speaking directly to the learner. Use \'you\' and \'we\' to build rapport and make the content feel personal and accessible.',
  },
  contentFocus: {
    'theoretical-concepts':
      'The primary focus is on theory and concepts. Explain the \'why\' behind the topic. Delve into the fundamental principles, models, frameworks, and intellectual history. Use diagrams and conceptual explanations to ensure deep understanding.',
    'practical-application':
      'The primary focus is on practical application. Emphasize how to use the information in real-world scenarios. Fill the content with detailed case studies, examples of use cases, and step-by-step walkthroughs of processes. The goal is for the learner to be able to *do* something with the knowledge.',
    'tool-software':
      'The primary focus is on mastering a specific tool or software. The content should be a technical guide. Include specific commands, UI navigation steps, code snippets (if applicable), and best practices for using the tool to accomplish the lesson\'s objective.',
  },
};

/**
 * Generate instructional blocks based on design parameters
 * @param {Object} designParameters - The design parameters object
 * @returns {string} - Combined instructional blocks for prompt enhancement
 */
export const generateParameterInstructions = (designParameters = {}) => {
  // Use defaults for any missing parameters (backward compatibility)
  const effectiveParams = { ...DEFAULT_DESIGN_PARAMETERS, ...designParameters };

  const domainInstruction =
    PARAMETER_BLOCKS.courseDomain[effectiveParams.courseDomain] ||
    PARAMETER_BLOCKS.courseDomain[DEFAULT_DESIGN_PARAMETERS.courseDomain];
  const audienceInstruction =
    PARAMETER_BLOCKS.targetAudienceLevel[effectiveParams.targetAudienceLevel] ||
    PARAMETER_BLOCKS.targetAudienceLevel[
      DEFAULT_DESIGN_PARAMETERS.targetAudienceLevel
    ];
  const toneInstruction =
    PARAMETER_BLOCKS.courseToneStyle[effectiveParams.courseToneStyle] ||
    PARAMETER_BLOCKS.courseToneStyle[DEFAULT_DESIGN_PARAMETERS.courseToneStyle];
  const focusInstruction =
    PARAMETER_BLOCKS.contentFocus[effectiveParams.contentFocus] ||
    PARAMETER_BLOCKS.contentFocus[DEFAULT_DESIGN_PARAMETERS.contentFocus];

  return `
  **INSTRUCTIONAL DESIGN PARAMETERS:**

  **Domain Approach:** ${domainInstruction}

  **Audience Calibration:** ${audienceInstruction}

  **Tone & Style:** ${toneInstruction}

  **Content Focus:** ${focusInstruction}

  **Integration Guidelines:**
  - Apply these instructional parameters consistently throughout the lesson content
  - Ensure the domain approach influences example selection and technical depth
  - Calibrate language complexity and explanation depth based on audience level
  - Maintain the specified tone throughout all sections
  - Structure content delivery according to the content focus priority
  - Blend these parameters seamlessly with current industry insights and reference materials
`;
};

/**
 * Get effective design parameters by resolving course-level overrides with program defaults
 * @param {Object} course - Course object with potential design parameter overrides
 * @param {Object} program - Program object with default design parameters
 * @returns {Object} - Resolved design parameters
 */
export const getEffectiveDesignParameters = (course = {}, program = {}) => {
  const programDefaults = program.designParameters || DEFAULT_DESIGN_PARAMETERS;
  const courseOverrides = course.designParameters || {};
  return { ...DEFAULT_DESIGN_PARAMETERS, ...programDefaults, ...courseOverrides };
};

/**
 * Validate design parameters to ensure all values are valid
 * @param {Object} parameters - Design parameters to validate
 * @returns {Object} - Validation result with isValid flag and errors
 */
export const validateDesignParameters = (parameters = {}) => {
  const errors = [];
  const validatedParams = { ...DEFAULT_DESIGN_PARAMETERS };

  Object.keys(DESIGN_PARAMETERS).forEach(paramKey => {
    const paramConfig = DESIGN_PARAMETERS[paramKey];
    const value = parameters[paramKey];

    if (value) {
      const validValues = paramConfig.options.map(opt => opt.value);
      if (validValues.includes(value)) {
        validatedParams[paramKey] = value;
      } else {
        errors.push(`Invalid value '${value}' for parameter '${paramKey}'`);
        validatedParams[paramKey] = paramConfig.default;
      }
    } else {
      validatedParams[paramKey] = paramConfig.default;
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
    validatedParameters: validatedParams,
  };
};

/**
 * Get parameter display information for UI components
 * @param {string} parameterKey - The parameter key
 * @param {string} value - The parameter value
 * @returns {Object} - Display information including label and description
 */
export const getParameterDisplayInfo = (parameterKey, value) => {
  const paramConfig = DESIGN_PARAMETERS[parameterKey];
  if (!paramConfig) return { label: 'Unknown Parameter', description: '' };

  const option = paramConfig.options.find(opt => opt.value === value);
  return {
    parameterLabel: paramConfig.label,
    valueLabel: option ? option.label : 'Unknown Value',
    description: paramConfig.description,
  };
};

/**
 * Generate a summary of current design parameters for display
 * @param {Object} parameters - Design parameters object
 * @returns {string} - Human-readable summary
 */
export const generateParameterSummary = (parameters = {}) => {
  const effectiveParams = { ...DEFAULT_DESIGN_PARAMETERS, ...parameters };
  const summaryParts = Object.keys(DESIGN_PARAMETERS).map(key => {
    const config = DESIGN_PARAMETERS[key];
    const option = config.options.find(opt => opt.value === effectiveParams[key]);
    return `${config.label}: ${option ? option.label : 'Default'}`;
  });
  return summaryParts.join(' • ');
};
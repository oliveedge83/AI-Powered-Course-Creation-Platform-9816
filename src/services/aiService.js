import axios from 'axios';

// Function to generate comprehensive course context using o3-mini research
export const generateCourseContext = async (programData, apiKey) => {
  try {
    console.log("Generating comprehensive course context with o3-mini...");
    
    const researchPrompt = `
Act as a senior academic strategist and career analyst for a top-tier university. I am developing a new MicroMasters program in the professional niche of: ${programData.niche}.

Some of the considerations for the course as per course designer are:
Must Have aspect: ${programData.mustHaveAspects}
Additional design considerations: ${programData.designConsiderations || 'None specified'}

Your mission is to uncover the most potent professional and emotional drivers, targeted business outcomes of the target audience for this program. This deep insight will inform the program's content and curriculum design to ensure maximum business impact and results for the participants.

The final output MUST be a single text paragraph string titled "course context".

Course Context will include:
- "programTitle": A prestigious and descriptive title for the MicroMasters program.
- "programLevelOutcomes": A numbered list (paragraph, not array) of 4-6 high-level outcomes a student will achieve.
- "targetAudience": A detailed description of the ideal profile for this program.
- "industryRelevance": A brief analysis of why this program is currently relevant, citing industry trends and PESTEL analysis of key industry drivers. Generated as a numbered text paragraph of few bullet points (not array)
- "hardHittingPainPoints": An array of the most significant anxieties, frustrations, or roadblocks for practitioners in this niche face. Generated as a numbered text paragraph of few bullet points (not array)
- "keyEmotionalTriggers": An array of the deep-seated emotional drivers for actionable results in this field. Generated as a numbered text paragraph of few bullet points (not array)
- "mostImpactfulOutcomes": An array of the most powerful results and business outcomes practitioners are aiming at. These should be practical and tangible real business outcomes. Generated as a numbered text paragraph of few bullet points (not array)
- "foundationalKnowledge": A description of the prerequisite knowledge or experience a student should have.
- "instructionalDesignFramework": Recommend a framework suitable for a multi-course, advanced program.

Generate the "course context" paragraph now. The output should be strictly a text paragraph with numbered list of parameters that can be passed on to the next node.
`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "o3-mini-2025-01-31",
        messages: [
          {
            role: "system",
            content: "You are a senior academic strategist and career analyst with deep expertise in curriculum design and industry analysis."
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
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error generating course context:", error);
    // Fallback to a basic context if research fails
    return generateFallbackContext(programData);
  }
};

// Function to generate program structure using GPT-4.1 with research context
export const generateProgramStructure = async (programData, apiKey) => {
  try {
    console.log("Generating program structure...");
    
    // Step 1: Generate comprehensive course context using o3-mini
    const courseContext = await generateCourseContext(programData, apiKey);
    
    // Step 2: Generate program structure using GPT-4.1 with the research context
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

Format your response as a JSON object with this structure:
{
  "programContext": "${courseContext}",
  "summaryProgramContext": "A concise 2-3 sentence summary of the program context for use in subsequent content generation",
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
          "lessons": [
            {
              "id": "lesson-1-1-1",
              "lessonTitle": "Specific and practical lesson title",
              "lessonDescription": "Comprehensive 150-200 word description covering: lesson objectives, key concepts to be learned, practical applications, activities students will engage in, expected outcomes, and how this lesson builds toward the topic objectives. Include specific skills and knowledge students will gain."
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
`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are an expert educational content designer specializing in professional MicroMasters programs. Create comprehensive, industry-aligned curriculum structures with detailed content."
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
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    // Extract and parse the response
    const content = response.data.choices[0].message.content;
    
    // Find the JSON object in the response
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    let parsedData;
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      parsedData = JSON.parse(jsonString);
    } else {
      try {
        parsedData = JSON.parse(content);
      } catch (e) {
        console.error("Failed to parse OpenAI response:", e);
        throw new Error("Invalid response format from OpenAI");
      }
    }

    return parsedData;
  } catch (error) {
    console.error("Error generating program structure:", error);
    console.log("Using fallback mock data...");
    return generateMockProgramStructure(programData);
  }
};

// Enhanced topic and lesson generation for individual courses
export const generateCourseTopicsAndLessons = async (course, programContext, summaryProgramContext, mustHaveAspects, designConsiderations, apiKey) => {
  try {
    console.log(`Generating detailed topics and lessons for course: ${course.courseTitle}`);
    
    const topicGenerationPrompt = `
GENERATE DETAILED COURSE OUTLINE BASED ON CONTEXT:

Act as an expert curriculum architect. You are designing one course within a larger MicroMasters program. Your task is to create the complete, detailed curriculum map for this single course.

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

The JSON object must have this exact structure:
{
  "topics": [
    {
      "id": "topic-new-1",
      "topicTitle": "Comprehensive topic title with clear learning focus",
      "topicLearningObjectiveDescription": "Detailed 2-3 sentence paragraph explaining what students will master in this topic, including specific skills and knowledge outcomes",
      "lessons": [
        {
          "id": "lesson-new-1-1",
          "lessonTitle": "Specific and actionable lesson title",
          "lessonDescription": "Comprehensive 150-200 word description covering: (1) specific learning objectives for this lesson, (2) key concepts and skills students will learn, (3) practical activities and exercises they will complete, (4) real-world applications and examples, (5) how this lesson contributes to the overall topic mastery, and (6) expected outcomes and deliverables. Be specific about what students will be able to do after completing this lesson."
        }
      ]
    }
  ]
}

Generate exactly 5-6 topics with 4-5 lessons each. Each lesson description must be detailed and comprehensive (150-200 words).
`;

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          {
            role: "system",
            content: "You are an expert instructional designer specializing in professional education. Create detailed, practical course content with comprehensive lesson descriptions."
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
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    const content = response.data.choices[0].message.content;
    const jsonMatch = content.match(/```json\n([\s\S]*?)\n```/) || content.match(/{[\s\S]*}/);
    
    if (jsonMatch) {
      const jsonString = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonString);
    }
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Error generating topics and lessons:", error);
    return { topics: [] };
  }
};

// Fallback context generator 
const generateFallbackContext = (programData) => {
  return `
Course Context: This MicroMasters program in ${programData.niche} is designed for working professionals seeking to advance their careers through comprehensive, industry-relevant education.

1. Program Title: MicroMasters in ${programData.niche}
2. Program Level Outcomes: Participants will master core competencies, develop practical skills, gain industry insights, and build professional networks.
3. Target Audience: Mid-career professionals with 3-5 years of experience seeking career advancement.
4. Industry Relevance: High demand for skilled professionals in ${programData.niche} due to digital transformation and evolving market needs.
5. Hard-Hitting Pain Points: Skill gaps, career stagnation, lack of practical knowledge, and industry competition.
6. Key Emotional Triggers: Career advancement, recognition, financial growth, and professional confidence.
7. Most Impactful Outcomes: Promotion opportunities, salary increases, leadership roles, and industry recognition.
8. Foundational Knowledge: Basic understanding of ${programData.niche} concepts and professional experience.
9. Instructional Design Framework: ${programData.instructionalDesignModel} approach with practical applications.
`;
};

// Enhanced mock data generator with more comprehensive content
const generateMockProgramStructure = (programData) => {
  const courses = [];
  const numberOfCourses = parseInt(programData.numberOfCourses);

  for (let i = 1; i <= numberOfCourses; i++) {
    const course = {
      id: `course-${i}`,
      courseTitle: `Advanced ${programData.niche} - Course ${i}: Strategic Implementation and Mastery`,
      courseDescription: `This comprehensive course covers essential aspects of ${programData.niche} with practical applications, real-world case studies, and hands-on projects. Students will develop critical skills through interactive learning, industry-relevant assignments, and collaborative projects that prepare them for advanced professional roles.`,
      topics: []
    };

    // Generate exactly 5 topics per course
    for (let j = 1; j <= 5; j++) {
      const topic = {
        id: `topic-${i}-${j}`,
        topicTitle: `Topic ${j}: Advanced ${programData.niche} Strategies and Professional Implementation`,
        topicLearningObjectiveDescription: `Master the fundamental principles and advanced techniques in this critical area of ${programData.niche}. Students will learn to apply theoretical concepts to real-world scenarios, develop practical solutions, and demonstrate proficiency in industry-standard practices.`,
        lessons: []
      };

      // Generate exactly 4 lessons per topic
      for (let k = 1; k <= 4; k++) {
        const lesson = {
          id: `lesson-${i}-${j}-${k}`,
          lessonTitle: `Lesson ${k}: Practical Implementation and Case Study Analysis`,
          lessonDescription: `This comprehensive lesson focuses on practical implementation of ${programData.niche} concepts through hands-on activities and real-world case studies. Students will engage in interactive exercises, analyze industry examples, and develop practical solutions to common challenges. The lesson includes guided practice sessions, peer collaboration opportunities, and individual assignments that reinforce key learning objectives. By the end of this lesson, students will be able to apply theoretical knowledge to practical situations, demonstrate proficiency in relevant tools and techniques, and articulate solutions to complex problems. The lesson culminates in a practical project that showcases student understanding and provides portfolio material for professional development. Assessment includes both formative feedback during activities and summative evaluation of final deliverables.`
        };
        topic.lessons.push(lesson);
      }
      course.topics.push(topic);
    }
    courses.push(course);
  }

  return {
    programContext: generateFallbackContext(programData),
    summaryProgramContext: `This MicroMasters program in ${programData.niche} targets working professionals seeking career advancement through comprehensive, industry-relevant education.`,
    courses
  };
};

// Function to generate course content for LMS (unchanged)
export const generateCourseContent = async (course, lmsCredentials, apiKey) => {
  try {
    console.log("Generating full course content with OpenAI...");
    
    const courseResponse = await createCourse(course, lmsCredentials);
    const courseId = courseResponse.data.data;
    console.log('Created course with ID:', courseId);

    for (const topic of course.topics) {
      const topicResponse = await createTopic(topic, courseId, lmsCredentials);
      const topicId = topicResponse.data.data;
      console.log('Created topic with ID:', topicId);

      if (!topic.topicIntroduction) {
        const topicDetailsPrompt = `
Course Title: ${course.courseTitle}
Course Description: ${course.courseDescription}
Topic Title: ${topic.topicTitle}
Topic Learning Objective Description: ${topic.topicLearningObjectiveDescription}

Please generate a detailed topicIntroduction and an immersiveMethodBrief. The immersiveMethodBrief should describe a practical activity or project related to the topic that helps learners apply the concepts.
`;

        const topicDetailsResponse = await callOpenAI(
          apiKey,
          topicDetailsPrompt,
          "You are an expert instructional designer."
        );
        topic.topicIntroduction = topicDetailsResponse;
      }

      const courseContextPrompt = `
Course Title: ${course.courseTitle}
Course Description: ${course.courseDescription}

Generate a brief, concise context of the overall course based on the course title and description provided. This context will be used as a high-level overview for subsequent lesson content generation.
`;

      const courseContext = await callOpenAI(
        apiKey,
        courseContextPrompt,
        "You are a concise educational content summarizer."
      );

      for (const lesson of topic.lessons) {
        console.log(`Generating full content for lesson: ${lesson.lessonTitle}`);

        const lessonContentPrompt = `
Course Context: ${courseContext}
Topic Title: ${topic.topicTitle}
Topic Introduction: ${topic.topicIntroduction || topic.topicLearningObjectiveDescription}
Lesson Title: ${lesson.lessonTitle}
Lesson Description: ${lesson.lessonDescription}

Generate comprehensive lesson content that is approximately 1500-2000 words. Include:
1. A structured lesson with clear sections and headings
2. Key concepts explained with examples
3. A relevant case study that illustrates the concepts
4. A FAQ section addressing common questions
5. A section on common misconceptions about the topic
6. Recommended additional readings or resources

The content should be educational, engaging, and aligned with the course objectives.
`;

        const lessonContent = await callOpenAI(
          apiKey,
          lessonContentPrompt,
          "You are an expert educator and content creator."
        );

        const slidesPrompt = `
Based on the following lesson content, create compelling presentation slide titles and concise bullet points for each slide. Focus on key takeaways and visual representation.

Structure it as:
SLIDE 1: [Title]
- [Bullet point 1]
- [Bullet point 2]

SLIDE 2: [Title]
- [Bullet point 1]
- [Bullet point 2]

And so on. Create 8-12 slides that cover the main concepts.

Lesson Content: ${lessonContent.substring(0, 3000)}...
`;

        const slideContent = await callOpenAI(
          apiKey,
          slidesPrompt,
          "You are an expert presentation designer."
        );

        const voiceOverPrompt = `
Based on the following presentation slides and the lesson content, write a detailed voice-over script for a video lesson. The script should be engaging, conversational, and expand on the bullet points in the slides to provide a comprehensive explanation.

Presentation Slides: ${slideContent}

Format the voice-over script with timing indicators for each slide, like:
[SLIDE 1 - 00:00-00:45]
"Welcome to today's lesson on... [script continues]"

[SLIDE 2 - 00:45-01:30]
"Now let's examine... [script continues]"
`;

        const voiceOverScript = await callOpenAI(
          apiKey,
          voiceOverPrompt,
          "You are an expert educational video scriptwriter."
        );

        const fullLessonContent = {
          mainContent: lessonContent,
          slides: slideContent,
          voiceOver: voiceOverScript
        };

        await createLesson(lesson, topicId, lmsCredentials, fullLessonContent);
        console.log('Created lesson with full content:', lesson.lessonTitle);
      }
    }

    return { success: true, courseId };
  } catch (error) {
    console.error('Error generating course content:', error);
    throw error;
  }
};

// Helper function to call OpenAI API with model selection
const callOpenAI = async (apiKey, prompt, systemPrompt, useGPT4 = false) => {
  try {
    const model = useGPT4 ? "gpt-4.1-2025-04-14" : "gpt-4.1-mini-2025-04-14";
    
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt }
        ],
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        }
      }
    );

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenAI:", error);
    throw error;
  }
};

// LMS integration functions (unchanged)
const createCourse = async (course, credentials) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/courses`,
    {
      post_author: 1,
      post_date: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_date_gmt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_content: course.courseDescription,
      post_title: course.courseTitle,
      post_excerpt: course.courseDescription.substring(0, 100),
      post_status: "publish",
      comment_status: "open",
      post_password: "",
      post_modified: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_modified_gmt: new Date().toISOString().slice(0, 19).replace('T', ' '),
      post_content_filtered: "",
      additional_content: {
        course_benefits: "Comprehensive learning experience",
        course_target_audience: "Professionals and students",
        course_duration: {
          hours: "10",
          minutes: "30"
        },
        course_material_includes: "Video lectures, reading materials, assignments",
        course_requirements: "Basic understanding of the subject"
      },
      video: {
        source_type: "youtube",
        source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
      },
      course_level: "beginner",
      course_categories: [161, 163],
      course_tags: [18, 19],
      thumbnail_id: 0
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    }
  );
};

const createTopic = async (topic, courseId, credentials) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/topics`,
    {
      topic_course_id: courseId,
      topic_title: topic.topicTitle,
      topic_summary: topic.topicLearningObjectiveDescription,
      topic_author: 1
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    }
  );
};

const createLesson = async (lesson, topicId, credentials, fullContent = null) => {
  const auth = btoa(`${credentials.username}:${credentials.password}`);
  
  let lessonContent = lesson.lessonDescription;
  
  if (fullContent) {
    lessonContent = `
      <div class="lesson-full-content">
        <h2>Lesson Content</h2>
        ${fullContent.mainContent}
        
        <hr>
        
        <h2>Presentation Slides</h2>
        <div class="slides-content">
          <pre>${fullContent.slides}</pre>
        </div>
        
        <hr>
        
        <h2>Voice-Over Script</h2>
        <div class="voice-over-script">
          <pre>${fullContent.voiceOver}</pre>
        </div>
      </div>
    `;
  }

  return axios.post(
    `${credentials.baseUrl}/wp-json/tutor/v1/lessons/`,
    {
      topic_id: topicId,
      lesson_title: lesson.lessonTitle,
      lesson_content: lessonContent,
      thumbnail_id: 1,
      lesson_author: 1,
      video: {
        source_type: "youtube",
        source: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        runtime: {
          hours: "00",
          minutes: "10",
          seconds: "36"
        }
      },
      attachments: [110],
      preview: true
    },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      }
    }
  );
};
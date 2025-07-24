import axios from 'axios';

// Function to generate program structure using OpenAI
export const generateProgramStructure = async (programData, apiKey) => {
  try {
    console.log("Generating program structure...");
    
    // Prepare the prompt for OpenAI
    const prompt = `
      Create a comprehensive educational program for "${programData.niche}" with ${programData.numberOfCourses} courses.
      Must-have aspects: ${programData.mustHaveAspects}
      ${programData.designConsiderations ? `Additional considerations: ${programData.designConsiderations}` : ''}
      Instructional design model: ${programData.instructionalDesignModel}

      Format your response as a JSON object with this structure:
      {
        "programContext": "A brief description of the overall program",
        "courses": [
          {
            "id": "course-1",
            "courseTitle": "Title for Course 1",
            "courseDescription": "Detailed description of the course",
            "topics": [
              {
                "id": "topic-1-1",
                "topicTitle": "Title for Topic 1",
                "topicLearningObjectiveDescription": "Learning objectives for this topic",
                "lessons": [
                  {
                    "id": "lesson-1-1-1",
                    "lessonTitle": "Title for Lesson 1",
                    "lessonDescription": "Detailed description of the lesson content"
                  }
                ]
              }
            ]
          }
        ]
      }

      Include 3-5 topics per course, and 2-4 lessons per topic. Make all content educational, practical, and aligned with the instructional design model.
    `;

    // Make the API call to OpenAI
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          {role: "system", content: "You are an expert educational content designer. Create detailed, structured educational programs."},
          {role: "user", content: prompt}
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
      // If JSON is wrapped in code blocks, extract it
      const jsonString = jsonMatch[1] || jsonMatch[0];
      parsedData = JSON.parse(jsonString);
    } else {
      // If no JSON format is found, try to parse the entire content
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
    // Fallback to mock data if API call fails
    console.log("Using fallback mock data...");
    return generateMockProgramStructure(programData);
  }
};

// Fallback mock data generator
const generateMockProgramStructure = (programData) => {
  const courses = [];
  const numberOfCourses = parseInt(programData.numberOfCourses);
  
  for (let i = 1; i <= numberOfCourses; i++) {
    const course = {
      id: `course-${i}`,
      courseTitle: `${programData.niche} - Course ${i}`,
      courseDescription: `Comprehensive course covering essential aspects of ${programData.niche} with practical applications and real-world examples.`,
      topics: []
    };
    
    // Generate 3-5 topics per course
    const numberOfTopics = Math.floor(Math.random() * 3) + 3;
    for (let j = 1; j <= numberOfTopics; j++) {
      const topic = {
        id: `topic-${i}-${j}`,
        topicTitle: `Topic ${j}: Advanced Concepts`,
        topicLearningObjectiveDescription: `Master the fundamental principles and advanced techniques in this area of ${programData.niche}.`,
        lessons: []
      };
      
      // Generate 2-4 lessons per topic
      const numberOfLessons = Math.floor(Math.random() * 3) + 2;
      for (let k = 1; k <= numberOfLessons; k++) {
        const lesson = {
          id: `lesson-${i}-${j}-${k}`,
          lessonTitle: `Lesson ${k}: Practical Implementation`,
          lessonDescription: `Hands-on lesson covering practical implementation and real-world applications.`
        };
        topic.lessons.push(lesson);
      }
      
      course.topics.push(topic);
    }
    
    courses.push(course);
  }
  
  return {
    programContext: `Generated comprehensive program for ${programData.niche} targeting professionals seeking advanced skills.`,
    courses
  };
};

// Function to generate course content for LMS
export const generateCourseContent = async (course, lmsCredentials, apiKey) => {
  try {
    console.log("Generating full course content with OpenAI...");
    
    // Step 1: Create course in LMS
    const courseResponse = await createCourse(course, lmsCredentials);
    const courseId = courseResponse.data.data;
    console.log('Created course with ID:', courseId);
    
    // Step 2: Process topics and lessons
    for (const topic of course.topics) {
      // Create topic in LMS
      const topicResponse = await createTopic(topic, courseId, lmsCredentials);
      const topicId = topicResponse.data.data;
      console.log('Created topic with ID:', topicId);
      
      // Generate topic introduction if not already present
      if (!topic.topicIntroduction) {
        const topicDetailsPrompt = `
          Course Title: ${course.courseTitle}
          Course Description: ${course.courseDescription}
          Topic Title: ${topic.topicTitle}
          Topic Learning Objective Description: ${topic.topicLearningObjectiveDescription}
          
          Please generate a detailed topicIntroduction and an immersiveMethodBrief. 
          The immersiveMethodBrief should describe a practical activity or project related to the topic 
          that helps learners apply the concepts.
        `;
        
        const topicDetailsResponse = await callOpenAI(apiKey, topicDetailsPrompt, "You are an expert instructional designer.");
        // Parse the response to extract topic introduction (simplified for now)
        topic.topicIntroduction = topicDetailsResponse;
      }
      
      // Generate brief course context for lesson content generation
      const courseContextPrompt = `
        Course Title: ${course.courseTitle}
        Course Description: ${course.courseDescription}
        
        Generate a brief, concise context of the overall course based on the course title and description provided.
        This context will be used as a high-level overview for subsequent lesson content generation.
      `;
      
      const courseContext = await callOpenAI(apiKey, courseContextPrompt, "You are a concise educational content summarizer.");
      
      // Process each lesson
      for (const lesson of topic.lessons) {
        console.log(`Generating full content for lesson: ${lesson.lessonTitle}`);
        
        // Generate comprehensive lesson content
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
        
        const lessonContent = await callOpenAI(apiKey, lessonContentPrompt, "You are an expert educator and content creator.");
        
        // Generate presentation slides if enabled
        const slidesPrompt = `
          Based on the following lesson content, create compelling presentation slide titles and concise bullet points for each slide.
          Focus on key takeaways and visual representation. Structure it as:
          
          SLIDE 1: [Title]
          - [Bullet point 1]
          - [Bullet point 2]
          
          SLIDE 2: [Title]
          - [Bullet point 1]
          - [Bullet point 2]
          
          And so on. Create 8-12 slides that cover the main concepts.
          
          Lesson Content: ${lessonContent.substring(0, 3000)}...
        `;
        
        const slideContent = await callOpenAI(apiKey, slidesPrompt, "You are an expert presentation designer.");
        
        // Generate voice-over script
        const voiceOverPrompt = `
          Based on the following presentation slides and the lesson content, write a detailed voice-over script for a video lesson.
          The script should be engaging, conversational, and expand on the bullet points in the slides to provide a comprehensive explanation.
          
          Presentation Slides: ${slideContent}
          
          Format the voice-over script with timing indicators for each slide, like:
          
          [SLIDE 1 - 00:00-00:45]
          "Welcome to today's lesson on... [script continues]"
          
          [SLIDE 2 - 00:45-01:30]
          "Now let's examine... [script continues]"
        `;
        
        const voiceOverScript = await callOpenAI(apiKey, voiceOverPrompt, "You are an expert educational video scriptwriter.");
        
        // Combine all generated content
        const fullLessonContent = {
          mainContent: lessonContent,
          slides: slideContent,
          voiceOver: voiceOverScript
        };
        
        // Create lesson in LMS with full content
        await createLesson(lesson, topicId, lmsCredentials, fullLessonContent);
        console.log('Created lesson with full content:', lesson.lessonTitle);
      }
    }
    
    return {
      success: true,
      courseId
    };
  } catch (error) {
    console.error('Error generating course content:', error);
    throw error;
  }
};

// Helper function to call OpenAI API
const callOpenAI = async (apiKey, prompt, systemPrompt) => {
  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: "gpt-4.1-mini-2025-04-14",
        messages: [
          {role: "system", content: systemPrompt},
          {role: "user", content: prompt}
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
        course_duration: {hours: "10", minutes: "30"},
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
  
  // Format the lesson content to include all generated materials if available
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
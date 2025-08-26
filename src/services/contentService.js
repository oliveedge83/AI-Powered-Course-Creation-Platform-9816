// Content generation and LMS integration service
class ContentService {
  constructor() {
    this.baseUrl = 'https://test1.ilearn.guru/wp-json/tutor/v1';
    this.authHeader = 'Basic ' + btoa('username:password'); // Replace with actual credentials
  }

  async createCourse(course) {
    // Simulate API call to create course
    await this.delay(1000);
    
    try {
      const response = await fetch(`${this.baseUrl}/courses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        },
        body: JSON.stringify({
          course_title: course.courseTitle,
          course_description: course.courseDescription,
          course_author: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Course creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || Math.floor(Math.random() * 1000) + 100; // Mock ID if API unavailable
    } catch (error) {
      // Return mock ID for demo purposes
      console.warn('Using mock course ID due to API error:', error.message);
      return Math.floor(Math.random() * 1000) + 100;
    }
  }

  async generateTopicContent(topic, programData) {
    // Simulate AI content generation
    await this.delay(500);
    
    return {
      introduction: `This topic introduces ${topic.topicTitle}, building upon the foundational concepts of ${programData.niche}. Students will explore key principles and practical applications.`,
      immersiveMethodBrief: `Engage in hands-on activities including case study analysis, interactive simulations, and collaborative problem-solving exercises that reinforce learning objectives.`
    };
  }

  async createTopic(courseId, topic, content) {
    // Simulate API call to create topic
    await this.delay(800);

    try {
      const response = await fetch(`${this.baseUrl}/topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        },
        body: JSON.stringify({
          topic_course_id: courseId,
          topic_title: topic.topicTitle,
          topic_summary: content.introduction,
          topic_author: 1
        })
      });

      if (!response.ok) {
        throw new Error(`Topic creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || Math.floor(Math.random() * 1000) + 200; // Mock ID if API unavailable
    } catch (error) {
      // Return mock ID for demo purposes
      console.warn('Using mock topic ID due to API error:', error.message);
      return Math.floor(Math.random() * 1000) + 200;
    }
  }

  async generateLessonContent(lesson, programData) {
    // Simulate AI content generation for lesson
    await this.delay(1500);

    const content = {
      readingContent: this.generateReadingContent(lesson, programData),
      faqs: this.generateFAQs(lesson),
      caseStudies: this.generateCaseStudies(lesson),
      slides: programData.generateSlides ? this.generateSlides(lesson) : null,
      voiceOverScript: programData.generateSlides ? this.generateVoiceOverScript(lesson) : null
    };

    return content;
  }

  generateReadingContent(lesson, programData) {
    return `
      <h2>${lesson.lessonTitle}</h2>
      
      <h3>Introduction</h3>
      <p>Welcome to this comprehensive lesson on ${lesson.lessonTitle}. This lesson is designed to provide you with a thorough understanding of the key concepts and practical applications within the context of ${programData.niche}.</p>
      
      <h3>Learning Objectives</h3>
      <ul>
        <li>Understand the fundamental principles underlying ${lesson.lessonTitle}</li>
        <li>Apply theoretical knowledge to practical scenarios</li>
        <li>Analyze real-world case studies and examples</li>
        <li>Develop critical thinking skills relevant to ${programData.niche}</li>
      </ul>
      
      <h3>Core Concepts</h3>
      <p>${lesson.lessonDescription}</p>
      
      <p>This lesson builds upon the foundational knowledge established in previous modules while introducing advanced concepts that are essential for mastery in ${programData.niche}. Through a combination of theoretical exploration and practical application, you will develop the skills necessary to excel in professional environments.</p>
      
      <h3>Practical Applications</h3>
      <p>The concepts covered in this lesson have direct applications in various professional contexts. Key areas of application include:</p>
      <ul>
        <li>Strategic decision-making processes</li>
        <li>Problem-solving methodologies</li>
        <li>Performance optimization techniques</li>
        <li>Innovation and continuous improvement initiatives</li>
      </ul>
      
      <h3>Summary</h3>
      <p>This lesson has provided you with essential knowledge and skills related to ${lesson.lessonTitle}. The concepts covered will serve as building blocks for more advanced topics in subsequent lessons.</p>
    `;
  }

  generateFAQs(lesson) {
    return [
      {
        question: `What are the key takeaways from ${lesson.lessonTitle}?`,
        answer: 'The key takeaways include understanding core principles, practical application methods, and real-world implementation strategies.'
      },
      {
        question: 'How does this lesson connect to previous topics?',
        answer: 'This lesson builds upon foundational concepts while introducing new advanced techniques and methodologies.'
      },
      {
        question: 'What are common misconceptions about this topic?',
        answer: 'Common misconceptions include oversimplifying complex concepts and failing to consider contextual factors in application.'
      }
    ];
  }

  generateCaseStudies(lesson) {
    return [
      {
        title: `Case Study 1: ${lesson.lessonTitle} in Practice`,
        description: 'A comprehensive case study demonstrating real-world application of the concepts covered in this lesson.',
        scenario: 'Industry scenario showcasing practical implementation challenges and solutions.',
        outcomes: 'Measurable results and lessons learned from the case study implementation.'
      }
    ];
  }

  generateSlides(lesson) {
    return [
      {
        slideNumber: 1,
        title: lesson.lessonTitle,
        bulletPoints: [
          'Introduction to key concepts',
          'Learning objectives overview',
          'Lesson structure and expectations'
        ]
      },
      {
        slideNumber: 2,
        title: 'Core Principles',
        bulletPoints: [
          'Fundamental theoretical framework',
          'Key terminology and definitions',
          'Conceptual relationships and dependencies'
        ]
      },
      {
        slideNumber: 3,
        title: 'Practical Applications',
        bulletPoints: [
          'Real-world implementation strategies',
          'Case study examples',
          'Best practices and common pitfalls'
        ]
      },
      {
        slideNumber: 4,
        title: 'Summary and Next Steps',
        bulletPoints: [
          'Key takeaways and learning outcomes',
          'Preparation for upcoming topics',
          'Additional resources and references'
        ]
      }
    ];
  }

  generateVoiceOverScript(lesson) {
    return `
      [Slide 1]
      Welcome to this lesson on ${lesson.lessonTitle}. I'm excited to guide you through this important topic that will enhance your understanding and skills in this area.

      [Slide 2]
      Let's begin by exploring the core principles that form the foundation of this topic. Understanding these fundamentals is crucial for successful application in professional contexts.

      [Slide 3]
      Now that we've covered the theoretical framework, let's examine how these concepts apply in real-world scenarios. We'll look at practical examples and case studies that illustrate successful implementation.

      [Slide 4]
      To conclude this lesson, let's review the key takeaways and discuss how this knowledge prepares you for the next phase of your learning journey. Remember to apply these concepts in your own professional context.
    `;
  }

  async createLesson(topicId, lesson, content) {
    // Simulate API call to create lesson with rich content
    await this.delay(1000);

    try {
      const response = await fetch(`${this.baseUrl}/lessons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': this.authHeader
        },
        body: JSON.stringify({
          lesson_topic_id: topicId,
          lesson_title: lesson.lessonTitle,
          lesson_content: content.readingContent,
          lesson_author: 1,
          additional_content: {
            faqs: content.faqs,
            case_studies: content.caseStudies,
            slides: content.slides,
            voice_over_script: content.voiceOverScript
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Lesson creation failed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || Math.floor(Math.random() * 1000) + 300; // Mock ID if API unavailable
    } catch (error) {
      // Return mock ID for demo purposes
      console.warn('Using mock lesson ID due to API error:', error.message);
      return Math.floor(Math.random() * 1000) + 300;
    }
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const generateContent = new ContentService();
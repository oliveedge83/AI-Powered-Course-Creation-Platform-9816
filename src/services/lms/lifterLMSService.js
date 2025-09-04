import axios from 'axios';

/**
 * LifterLMS Service - Handles all LifterLMS specific API calls
 * Maps topics to sections and handles lesson-level quizzes
 */
export class LifterLMSService {
  constructor(credentials) {
    this.credentials = credentials;
    this.auth = btoa(`${credentials.username}:${credentials.password}`);
    this.baseUrl = credentials.baseUrl;
  }

  // Course Management
  async createCourse(course, abortSignal = null) {
    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/courses`,
      {
        title: course.courseTitle,
        content: course.courseDescription,
        excerpt: course.courseDescription.substring(0, 100),
        status: "publish",
        meta: {
          _llms_length: "10 weeks",
          _llms_capacity: 50,
          _llms_difficulty: "Beginner",
          _llms_course_prerequisite: "",
          _llms_has_prerequisite: "no",
          _llms_enrollment_period: "yes",
          _llms_enrollment_opens_date: new Date().toISOString().split('T')[0],
          _llms_enrollment_closes_date: "",
          _llms_course_opens_date: new Date().toISOString().split('T')[0],
          _llms_course_closes_date: "",
          _llms_time_period: "no",
          _llms_course_tracks: [],
          _llms_audio_embed: "",
          _llms_video_embed: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  // Section Management (LifterLMS equivalent of TutorLMS topics)
  async createTopic(topic, courseId, abortSignal = null) {
    // In LifterLMS, we create sections instead of topics
    return this.createSection(topic, courseId, abortSignal);
  }

  async createSection(topic, courseId, abortSignal = null) {
    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/sections`,
      {
        title: topic.topicTitle,
        content: topic.topicLearningObjectiveDescription,
        parent_course: courseId,
        order: 1,
        meta: {
          _llms_order: 1,
          _llms_parent_course: courseId
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  // Lesson Management
  async createLesson(lesson, sectionId, fullContent = null, abortSignal = null) {
    let lessonContent = lesson.lessonDescription;

    if (fullContent) {
      // Enhanced lesson content structure with LifterLMS styling
      lessonContent = `
        <div class="llms-lesson-content">
          <!-- Main Reading Content -->
          <div class="lesson-main-content">
            ${fullContent.readingContent}
          </div>
          
          <!-- FAQ Section -->
          ${fullContent.faq ? `
            <div class="lesson-faq-section">
              <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #2563eb, #7c3aed);">
              <h2 style="color: #1e40af; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-question-circle" style="margin-right: 10px;"></i>Frequently Asked Questions
              </h2>
              <div class="faq-content">
                ${fullContent.faq}
              </div>
            </div>
          ` : ''}
          
          <!-- Latest Developments Section -->
          ${fullContent.latestDevelopments ? `
            <div class="lesson-latest-developments">
              <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #f59e0b, #ef4444);">
              <h2 style="color: #dc2626; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-rocket" style="margin-right: 10px;"></i>Latest Developments & Trends
              </h2>
              <div class="latest-developments-content">
                ${fullContent.latestDevelopments}
              </div>
            </div>
          ` : ''}
          
          <!-- Additional Reading Materials -->
          ${fullContent.additionalReading ? `
            <div class="lesson-additional-reading">
              <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #10b981, #059669);">
              <h2 style="color: #047857; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-book-open" style="margin-right: 10px;"></i>Additional Reading & Resources
              </h2>
              <div class="additional-reading-content">
                ${fullContent.additionalReading}
              </div>
            </div>
          ` : ''}
          
          <!-- Presentation Slides -->
          <div class="lesson-slides-section">
            <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #f59e0b, #d97706);">
            <h2 style="color: #92400e; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <i class="fas fa-presentation" style="margin-right: 10px;"></i>Presentation Slides
            </h2>
            <div class="slides-content" style="background: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #f59e0b;">
              <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #374151;">${fullContent.slides}</pre>
            </div>
          </div>
          
          <!-- Voice-Over Script -->
          <div class="lesson-voiceover-section">
            <hr style="margin: 30px 0; border: none; height: 2px; background: linear-gradient(90deg, #8b5cf6, #7c3aed);">
            <h2 style="color: #5b21b6; font-size: 24px; margin-bottom: 20px; padding-bottom: 10px; border-bottom: 2px solid #e5e7eb;">
              <i class="fas fa-microphone" style="margin-right: 10px;"></i>Voice-Over Script
            </h2>
            <div class="voice-over-script" style="background: #faf5ff; padding: 20px; border-radius: 8px; border-left: 4px solid #8b5cf6;">
              <pre style="white-space: pre-wrap; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 14px; line-height: 1.6; color: #374151;">${fullContent.voiceOver}</pre>
            </div>
          </div>
        </div>
        
        <style>
          .llms-lesson-content {
            max-width: 100%;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.7;
            color: #374151;
          }
          .llms-lesson-content h1 {
            color: #1f2937;
            font-size: 28px;
            margin-bottom: 20px;
            padding-bottom: 10px;
            border-bottom: 3px solid #2563eb;
          }
          .llms-lesson-content h2 {
            color: #374151;
            font-size: 22px;
            margin: 25px 0 15px 0;
            padding-bottom: 8px;
            border-bottom: 2px solid #e5e7eb;
          }
          .llms-lesson-content h3 {
            color: #4b5563;
            font-size: 18px;
            margin: 20px 0 12px 0;
            font-weight: 600;
          }
          .llms-lesson-content p {
            margin-bottom: 16px;
            text-align: justify;
          }
          .llms-lesson-content ul, .llms-lesson-content ol {
            margin: 16px 0;
            padding-left: 24px;
          }
          .llms-lesson-content li {
            margin-bottom: 8px;
          }
        </style>
      `;
    }

    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/lessons`,
      {
        title: lesson.lessonTitle,
        content: lessonContent,
        parent_section: sectionId,
        order: 1,
        meta: {
          _llms_order: 1,
          _llms_parent_section: sectionId,
          _llms_has_prerequisite: "no",
          _llms_prerequisite: "",
          _llms_drip_method: "none",
          _llms_video_embed: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
          _llms_audio_embed: "",
          _llms_free_lesson: "no"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  // Quiz Management (attached to lessons in LifterLMS)
  async createQuiz(topic, lessonId, abortSignal = null) {
    // In LifterLMS, quizzes are typically attached to lessons, not sections
    // We'll create a quiz for the first lesson in the topic
    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/quizzes`,
      {
        title: `${topic.topicTitle} Quiz`,
        content: `Assessment quiz for ${topic.topicTitle}`,
        parent_lesson: lessonId,
        meta: {
          _llms_attempts: 3,
          _llms_limit_attempts: "yes",
          _llms_limit_time: "yes",
          _llms_time_limit: 10, // 10 minutes
          _llms_passing_percent: 80,
          _llms_show_correct_answer: "yes",
          _llms_random_questions: "yes"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  async createQuizQuestion(quizId, questionData, abortSignal = null) {
    // Map question types to LifterLMS format
    let questionType = 'choice';
    let choices = [];

    if (questionData.question_type === 'single_choice') {
      questionType = 'choice';
      choices = questionData.options.map((option, index) => ({
        choice: option,
        choice_id: index + 1,
        correct: option === questionData.correct_answer
      }));
    } else if (questionData.question_type === 'multiple_choice') {
      questionType = 'choice';
      choices = questionData.options.map((option, index) => ({
        choice: option,
        choice_id: index + 1,
        correct: Array.isArray(questionData.correct_answer) 
          ? questionData.correct_answer.includes(option)
          : questionData.correct_answer === option
      }));
    }

    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/questions`,
      {
        title: questionData.question_title,
        parent_quiz: quizId,
        question_type: questionType,
        choices: choices,
        meta: {
          _llms_points: 1,
          _llms_question_type: questionType
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  // Assignment Management (LifterLMS uses assignments differently)
  async createAssignment(lessonId, assignmentData, abortSignal = null) {
    // LifterLMS assignments are created as lessons with assignment type
    return axios.post(
      `${this.baseUrl}/wp-json/llms/v1/lessons`,
      {
        title: assignmentData.title,
        content: assignmentData.content,
        parent_section: lessonId, // This might need adjustment based on LifterLMS structure
        lesson_type: 'assignment',
        meta: {
          _llms_assignment: "yes",
          _llms_points: 10,
          _llms_assignment_enabled: "yes"
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Basic ${this.auth}`
        },
        signal: abortSignal
      }
    );
  }

  // Get LMS type
  getLMSType() {
    return 'lifter';
  }
}
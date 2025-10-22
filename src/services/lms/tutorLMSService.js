import axios from 'axios';
    
    /**
     * TutorLMS Service - Handles all TutorLMS specific API calls
     * Maintains existing functionality without changes
     */
    export class TutorLMSService {
      constructor(credentials) {
        this.credentials=credentials;
        this.auth=btoa(`${credentials.username}:${credentials.password}`);
        this.baseUrl=credentials.baseUrl;
      }
    
      // Course Management
      async createCourse(course,abortSignal=null) {
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/courses`,
          {
            post_author: 1,
            post_date: new Date().toISOString().slice(0,19).replace('T',' '),
            post_date_gmt: new Date().toISOString().slice(0,19).replace('T',' '),
            post_content: course.courseDescription,
            post_title: course.courseTitle,
            post_excerpt: course.courseDescription.substring(0,100),
            post_status: 'publish',
            comment_status: 'open',
            post_password: '',
            post_modified: new Date().toISOString().slice(0,19).replace('T',' '),
            post_modified_gmt: new Date().toISOString().slice(0,19).replace('T',' '),
            post_content_filtered: '',
            additional_content: {
              course_benefits: 'Comprehensive learning experience',
              course_target_audience: 'Professionals and students',
              course_duration: {hours: '10',minutes: '30'},
              course_material_includes: 'Video lectures,reading materials,assignments',
              course_requirements: 'Basic understanding of the subject',
            },
            video: {
              source_type: 'youtube',
              source: 'https://www.youtube.com/watch?v=2pFHmjTUrCQ',
            },
            course_level: 'beginner',
            course_categories: [161,163],
            course_tags: [18,19],
            thumbnail_id: 0,
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      // Topic Management (TutorLMS specific)
      async createTopic(topic,courseId,abortSignal=null) {
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/topics`,
          {
            topic_course_id: courseId,
            topic_title: topic.topicTitle,
            topic_summary: topic.topicLearningObjectiveDescription,
            topic_author: 1,
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      // Lesson Management
      async createLesson(lesson,topicId,fullContent=null,abortSignal=null) {
        let lessonContent=lesson.lessonDescription;
        if (fullContent) {
          // Enhanced lesson content structure with all sections
          lessonContent=`
          <div class="tutor-lesson-content">
            <!-- Main Reading Content -->
            <div class="lesson-main-content">
              ${fullContent.readingContent}
            </div>
    
            <!-- FAQ Section -->
            ${
              fullContent.faq
                ? `
            <div class="lesson-faq-section">
              <hr style="margin: 30px 0;border: none;height: 2px;background: linear-gradient(90deg,#3b82f6,#8b5cf6);">
              <h2 style="color: #1e40af;font-size: 24px;margin-bottom: 20px;padding-bottom: 10px;border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-question-circle" style="margin-right: 10px;"></i>Frequently Asked Questions
              </h2>
              <div class="faq-content">
                ${fullContent.faq}
              </div>
            </div>
            `
                : ''
            }
    
            <!-- Latest Developments Section -->
            ${
              fullContent.latestDevelopments
                ? `
            <div class="lesson-latest-developments">
              <hr style="margin: 30px 0;border: none;height: 2px;background: linear-gradient(90deg,#f59e0b,#ef4444);">
              <h2 style="color: #dc2626;font-size: 24px;margin-bottom: 20px;padding-bottom: 10px;border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-rocket" style="margin-right: 10px;"></i>Latest Developments & Trends
              </h2>
              <div class="latest-developments-content">
                ${fullContent.latestDevelopments}
              </div>
            </div>
            `
                : ''
            }
    
            <!-- Additional Reading Materials -->
            ${
              fullContent.additionalReading
                ? `
            <div class="lesson-additional-reading">
              <hr style="margin: 30px 0;border: none;height: 2px;background: linear-gradient(90deg,#10b981,#059669);">
              <h2 style="color: #047857;font-size: 24px;margin-bottom: 20px;padding-bottom: 10px;border-bottom: 2px solid #e5e7eb;">
                <i class="fas fa-book-open" style="margin-right: 10px;"></i>Additional Reading & Resources
              </h2>
              <div class="additional-reading-content">
                ${fullContent.additionalReading}
              </div>
            </div>
            `
                : ''
            }
          </div>
        `;
        }
    
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/lessons/`,
          {
            topic_id: topicId,
            lesson_title: lesson.lessonTitle,
            lesson_content: lessonContent,
            thumbnail_id: 1,
            lesson_author: 1,
            video: {
              source_type: 'youtube',
              source: 'https://www.youtube.com/watch?v=2pFHmjTUrCQ',
              runtime: {hours: '00',minutes: '10',seconds: '36'},
            },
            attachments: [110],
            preview: true,
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      // Quiz Management (attached to topics in TutorLMS)
      async createQuiz(topic,topicId,abortSignal=null) {
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/quizzes`,
          {
            topic_id: topicId,
            quiz_title: `${topic.topicTitle} Quiz`,
            quiz_author: 1,
            quiz_description: `${topic.topicTitle} quiz.`,
            quiz_options: {
              time_limit: {time_value: 10,time_type: 'minutes'},
              feedback_mode: 'default',
              question_layout_view: 'question_below_each_other',
              attempts_allowed: 3,
              passing_grade: 80,
              max_questions_for_answer: 10,
              questions_order: 'rand',
              short_answer_characters_limit: 200,
              open_ended_answer_characters_limit: 500,
            },
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      async createQuizQuestion(quizId,questionData,abortSignal=null) {
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/quiz-questions`,
          {
            quiz_id: quizId,
            ...questionData,
            answer_required: 1,
            randomize_question: 1,
            question_mark: 1.0,
            show_question_mark: 1,
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      // Assignment Management
      async createAssignment(topicId,assignmentData,abortSignal=null) {
        return axios.post(
          `${this.baseUrl}/wp-json/tutor/v1/assignments/`,
          {
            topic_id: topicId,
            assignment_title: assignmentData.title,
            assignment_author: 1,
            assignment_content: assignmentData.content,
            assignment_options: {
              time_duration: {value: 1,unit: 'weeks'},
              total_mark: 10,
              pass_mark: 6,
              upload_files_limit: 1,
              upload_file_size_limit: 2,
            },
          },
          {
            headers: {'Content-Type': 'application/json','Authorization': `Basic ${this.auth}`},
            signal: abortSignal,
          }
        );
      }
    
      // Get LMS type
      getLMSType() {
        return 'tutor';
      }
    }
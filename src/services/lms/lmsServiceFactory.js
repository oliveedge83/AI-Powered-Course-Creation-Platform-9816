import { TutorLMSService } from './tutorLMSService';
import { LifterLMSService } from './lifterLMSService';
import { LMS_TYPES } from './lmsTypes';

/**
 * LMS Service Factory - Routes API calls to the appropriate LMS service
 * Provides a unified interface for all LMS operations
 */
export class LMSServiceFactory {
  static createService(lmsType, credentials) {
    switch (lmsType) {
      case LMS_TYPES.TUTOR:
        return new TutorLMSService(credentials);
      case LMS_TYPES.LIFTER:
        return new LifterLMSService(credentials);
      default:
        console.warn(`Unknown LMS type: ${lmsType}, defaulting to TutorLMS`);
        return new TutorLMSService(credentials);
    }
  }

  static getSupportedLMSTypes() {
    return Object.values(LMS_TYPES);
  }

  static validateLMSType(lmsType) {
    return Object.values(LMS_TYPES).includes(lmsType);
  }
}

/**
 * Unified LMS Service Wrapper
 * Provides a consistent interface regardless of the underlying LMS
 */
export class UnifiedLMSService {
  constructor(lmsType, credentials) {
    this.lmsType = lmsType;
    this.service = LMSServiceFactory.createService(lmsType, credentials);
  }

  // Course operations
  async createCourse(course, abortSignal = null) {
    return this.service.createCourse(course, abortSignal);
  }

  // Topic/Section operations (unified interface)
  async createTopic(topic, courseId, abortSignal = null) {
    // Both services implement createTopic, but LifterLMS maps it to sections
    return this.service.createTopic(topic, courseId, abortSignal);
  }

  // Lesson operations
  async createLesson(lesson, parentId, fullContent = null, abortSignal = null) {
    return this.service.createLesson(lesson, parentId, fullContent, abortSignal);
  }

  // Quiz operations (handles different attachment levels)
  async createQuiz(topic, parentId, abortSignal = null) {
    return this.service.createQuiz(topic, parentId, abortSignal);
  }

  async createQuizQuestion(quizId, questionData, abortSignal = null) {
    return this.service.createQuizQuestion(quizId, questionData, abortSignal);
  }

  // Assignment operations
  async createAssignment(parentId, assignmentData, abortSignal = null) {
    return this.service.createAssignment(parentId, assignmentData, abortSignal);
  }

  // Get LMS type
  getLMSType() {
    return this.service.getLMSType();
  }

  // Check LMS capabilities
  supportsTopics() {
    return this.lmsType === LMS_TYPES.TUTOR;
  }

  supportsSections() {
    return this.lmsType === LMS_TYPES.LIFTER;
  }

  getQuizAttachmentLevel() {
    return this.lmsType === LMS_TYPES.TUTOR ? 'topic' : 'lesson';
  }

  supportsAssignments() {
    return this.lmsType === LMS_TYPES.TUTOR;
  }
}

// Convenience function for creating unified LMS service
export const createLMSService = (lmsType, credentials) => {
  return new UnifiedLMSService(lmsType, credentials);
};
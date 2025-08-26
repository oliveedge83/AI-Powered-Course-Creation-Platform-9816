import React, { createContext, useContext, useReducer } from 'react';

const ProgramContext = createContext();

const initialState = {
  programData: null,
  generatedStructure: null,
  editedStructure: null,
  currentStep: 'initiation',
  isLoading: false,
  error: null,
  generationProgress: {
    currentCourse: 0,
    totalCourses: 0,
    currentTopic: 0,
    totalTopics: 0,
    currentLesson: 0,
    totalLessons: 0,
    status: 'idle'
  }
};

function programReducer(state, action) {
  switch (action.type) {
    case 'SET_PROGRAM_DATA':
      return {
        ...state,
        programData: action.payload,
        currentStep: 'generating'
      };
    case 'SET_GENERATED_STRUCTURE':
      return {
        ...state,
        generatedStructure: action.payload,
        editedStructure: action.payload,
        currentStep: 'review',
        isLoading: false
      };
    case 'UPDATE_EDITED_STRUCTURE':
      return {
        ...state,
        editedStructure: action.payload
      };
    case 'START_CONTENT_GENERATION':
      return {
        ...state,
        currentStep: 'content-generation',
        isLoading: true
      };
    case 'UPDATE_GENERATION_PROGRESS':
      return {
        ...state,
        generationProgress: { ...state.generationProgress, ...action.payload }
      };
    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };
    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isLoading: false
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

export function ProgramProvider({ children }) {
  const [state, dispatch] = useReducer(programReducer, initialState);

  return (
    <ProgramContext.Provider value={{ state, dispatch }}>
      {children}
    </ProgramContext.Provider>
  );
}

export function useProgram() {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error('useProgram must be used within a ProgramProvider');
  }
  return context;
}
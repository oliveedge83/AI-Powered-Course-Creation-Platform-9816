import React,{createContext,useContext,useState,useRef} from 'react';
    
    const GenerationContext=createContext();
    
    export const GenerationProvider=({children})=> {
      const [generationStatus,setGenerationStatus]=useState({
        visible: false,
        type: 'info',// 'info','success','error','loading'
        message: '',
        progress: 0,
        stage: '',
        isMinimized: false,
        isPaused: false,
        canPause: false,
        canAbort: false,
        currentTask: '',
        totalTasks: 0,
        completedTasks: 0,
        estimatedTimeRemaining: null,
        startTime: null,
        details: {
          courseTitle: '',
          currentTopic: '',
          currentLesson: '',
          topicsCompleted: 0,
          totalTopics: 0,
          lessonsCompleted: 0,
          totalLessons: 0,
        },
      });
    
      const abortControllerRef=useRef(null);
      const pauseResolverRef=useRef(null);
    
      const updateGenerationStatus=(status)=> {
        setGenerationStatus(prev=> ({...prev,...status}));
      };
    
      const startGeneration=(
        courseTitle,
        totalTopics,
        totalLessons,
        initialMessage='Starting generation process...'
      )=> {
        abortControllerRef.current=new AbortController();
        setGenerationStatus({
          visible: true,
          type: 'loading',
          message: initialMessage,
          progress: 0,
          stage: 'initializing',
          isMinimized: false,
          isPaused: false,
          canPause: true,
          canAbort: true,
          currentTask: 'Initializing content generation...',
          totalTasks: 0, // Will be updated by the generation service
          completedTasks: 0,
          estimatedTimeRemaining: null,
          startTime: Date.now(),
          details: {
            courseTitle,
            currentTopic: '',
            currentLesson: '',
            topicsCompleted: 0,
            totalTopics,
            lessonsCompleted: 0,
            totalLessons,
          },
        });
      };
    
      const updateProgress=(progress,message,stage,currentTask,details={})=> {
        const now=Date.now();
        const elapsed=now - (generationStatus.startTime || now);
        let estimatedTimeRemaining=null;
    
        if (progress > 0 && elapsed > 0) {
          const totalEstimated=(elapsed / progress) * 100;
          estimatedTimeRemaining=Math.max(0,totalEstimated - elapsed);
        }
    
        setGenerationStatus(prev=> ({
          ...prev,
          progress,
          message: message || prev.message,
          stage: stage || prev.stage,
          currentTask: currentTask || prev.currentTask,
          estimatedTimeRemaining,
          details: {...prev.details,...details},
        }));
      };
    
      const updateTaskProgress=(completedTasks,currentTask,details={})=> {
        const progress=
          generationStatus.totalTasks > 0
            ? (completedTasks / generationStatus.totalTasks) * 100
            : 0;
        updateProgress(progress,'','',currentTask,details);
        setGenerationStatus(prev=> ({...prev,completedTasks}));
      };
    
      const pauseGeneration=()=> {
        setGenerationStatus(prev=> ({
          ...prev,
          isPaused: true,
          type: 'info',
          message: 'Content generation paused. Click resume to continue.',
          currentTask: 'Generation paused by user',
        }));
        return new Promise((resolve)=> {
          pauseResolverRef.current=resolve;
        });
      };
    
      const resumeGeneration=()=> {
        setGenerationStatus(prev=> ({
          ...prev,
          isPaused: false,
          type: 'loading',
          message: 'Resuming content generation...',
          currentTask: 'Resuming generation process...',
        }));
        if (pauseResolverRef.current) {
          pauseResolverRef.current();
          pauseResolverRef.current=null;
        }
      };
    
      const abortGeneration=()=> {
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }
        setGenerationStatus(prev=> ({
          ...prev,
          type: 'error',
          message: 'Content generation aborted by user',
          canPause: false,
          canAbort: false,
          currentTask: 'Generation aborted',
          isPaused: false,
        }));
        // Auto-hide after 5 seconds
        setTimeout(()=> {
          setGenerationStatus(prev=> ({...prev,visible: false}));
        },5000);
      };
    
      const completeGeneration=(message='Generation completed successfully!')=> {
        setGenerationStatus(prev=> ({
          ...prev,
          visible: true,
          type: 'success',
          message,
          progress: 100,
          stage: 'completed',
          canPause: false,
          canAbort: false,
          currentTask: 'Generation completed successfully',
          completedTasks: prev.totalTasks,
          estimatedTimeRemaining: 0,
        }));
        // Auto-hide after 10 seconds
        setTimeout(()=> {
          setGenerationStatus(prev=> ({...prev,visible: false}));
        },10000);
      };
    
      const failGeneration=(message='Generation failed. Please try again.')=> {
        setGenerationStatus(prev=> ({
          ...prev,
          visible: true,
          type: 'error',
          message,
          progress: 0,
          stage: 'failed',
          canPause: false,
          canAbort: false,
          currentTask: 'Generation failed',
          estimatedTimeRemaining: null,
        }));
      };
    
      const minimizeStatus=()=> {
        setGenerationStatus(prev=> ({...prev,isMinimized: true}));
      };
    
      const maximizeStatus=()=> {
        setGenerationStatus(prev=> ({...prev,isMinimized: false}));
      };
    
      const hideStatus=()=> {
        setGenerationStatus(prev=> ({...prev,visible: false}));
      };
    
      const getAbortSignal=()=> {
        return abortControllerRef.current?.signal;
      };
    
      const checkPauseStatus=async ()=> {
        if (generationStatus.isPaused) {
          await pauseGeneration();
        }
      };
    
      return (
        <GenerationContext.Provider
          value={{
            generationStatus,
            updateGenerationStatus,
            startGeneration,
            updateProgress,
            updateTaskProgress,
            pauseGeneration,
            resumeGeneration,
            abortGeneration,
            completeGeneration,
            failGeneration,
            minimizeStatus,
            maximizeStatus,
            hideStatus,
            getAbortSignal,
            checkPauseStatus,
          }}
        >
          {children}
        </GenerationContext.Provider>
      );
    };
    
    export const useGeneration=()=> useContext(GenerationContext);
    
    export default GenerationContext;
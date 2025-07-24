import { create } from 'zustand';

export const useProgramStore = create((set, get) => ({
  programs: [],
  currentProgram: null,
  loading: false,
  
  setPrograms: (programs) => set({ programs }),
  
  addProgram: (program) => {
    const newProgram = {
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      status: 'draft',
      ...program
    };
    set(state => ({ 
      programs: [...state.programs, newProgram],
      currentProgram: newProgram
    }));
    return newProgram;
  },
  
  updateProgram: (programId, updates) => {
    set(state => ({
      programs: state.programs.map(p => 
        p.id === programId ? { ...p, ...updates } : p
      ),
      currentProgram: state.currentProgram?.id === programId 
        ? { ...state.currentProgram, ...updates }
        : state.currentProgram
    }));
  },
  
  setCurrentProgram: (program) => set({ currentProgram: program }),
  
  setLoading: (loading) => set({ loading }),
}));
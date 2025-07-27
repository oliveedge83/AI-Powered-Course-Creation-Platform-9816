import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useVectorStoreStore = create(
  persist(
    (set, get) => ({
      // Map of vector store assignments: { topicId: vectorStoreId } or { lessonId: vectorStoreId }
      vectorStoreAssignments: {},
      
      // Cache of vector store metadata
      vectorStoreCache: {},
      
      // Set vector store for a topic or lesson
      setVectorStore: (itemId, vectorStoreId) => {
        set(state => ({
          vectorStoreAssignments: {
            ...state.vectorStoreAssignments,
            [itemId]: vectorStoreId
          }
        }));
      },
      
      // Remove vector store assignment
      removeVectorStore: (itemId) => {
        set(state => {
          const { [itemId]: _, ...rest } = state.vectorStoreAssignments;
          return { vectorStoreAssignments: rest };
        });
      },
      
      // Get vector store ID for a topic or lesson
      getVectorStoreId: (itemId) => {
        return get().vectorStoreAssignments[itemId];
      },
      
      // Check if a topic or lesson has a vector store assigned
      hasVectorStore: (itemId) => {
        return !!get().vectorStoreAssignments[itemId];
      },
      
      // Add vector store to cache
      cacheVectorStore: (vectorStore) => {
        set(state => ({
          vectorStoreCache: {
            ...state.vectorStoreCache,
            [vectorStore.id]: {
              id: vectorStore.id,
              name: vectorStore.name,
              fileCount: vectorStore.file_count,
              updatedAt: vectorStore.updated_at
            }
          }
        }));
      },
      
      // Add multiple vector stores to cache
      cacheVectorStores: (vectorStores) => {
        const vectorStoreMap = {};
        vectorStores.forEach(vs => {
          vectorStoreMap[vs.id] = {
            id: vs.id,
            name: vs.name,
            fileCount: vs.file_count,
            updatedAt: vs.updated_at
          };
        });
        
        set(state => ({
          vectorStoreCache: {
            ...state.vectorStoreCache,
            ...vectorStoreMap
          }
        }));
      },
      
      // Get vector store from cache
      getCachedVectorStore: (vectorStoreId) => {
        return get().vectorStoreCache[vectorStoreId];
      },
      
      // Clear vector store cache
      clearVectorStoreCache: () => {
        set({ vectorStoreCache: {} });
      }
    }),
    {
      name: 'vector-store-storage',
      partialize: (state) => ({
        vectorStoreAssignments: state.vectorStoreAssignments,
        vectorStoreCache: state.vectorStoreCache
      }),
    }
  )
);
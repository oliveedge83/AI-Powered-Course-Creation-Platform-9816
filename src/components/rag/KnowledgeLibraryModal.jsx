import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import VectorStoreSelector from './VectorStoreSelector';
import FileUploader from './FileUploader';
import { useVectorStoreStore } from '../../stores/vectorStoreStore';
import { getVectorStore } from '../../services/vectorStoreService';

const { FiDatabase, FiX } = FiIcons;

const KnowledgeLibraryModal = ({ 
  isOpen, 
  onClose, 
  itemId, 
  itemType, 
  apiKey 
}) => {
  const [step, setStep] = useState('select'); // 'select', 'upload'
  const [newLibraryName, setNewLibraryName] = useState('');
  const { 
    setVectorStore, 
    removeVectorStore, 
    getVectorStoreId, 
    cacheVectorStore 
  } = useVectorStoreStore();

  const currentVectorStoreId = getVectorStoreId(itemId);

  // Reset step when modal is opened
  useEffect(() => {
    if (isOpen) {
      setStep('select');
    }
  }, [isOpen]);

  const handleSelectVectorStore = (vectorStoreId) => {
    if (!vectorStoreId) return;
    
    setVectorStore(itemId, vectorStoreId);
    
    // Fetch and cache vector store details
    getVectorStore(apiKey, vectorStoreId)
      .then(vectorStore => {
        cacheVectorStore(vectorStore);
      })
      .catch(error => {
        console.error('Error fetching vector store details:', error);
      });
    
    onClose();
  };

  const handleCreateNewLibrary = (libraryName) => {
    setNewLibraryName(libraryName);
    setStep('upload');
  };

  const handleUploadComplete = (vectorStoreId, libraryName) => {
    setVectorStore(itemId, vectorStoreId);
    
    // Cache the new vector store with basic info
    cacheVectorStore({
      id: vectorStoreId,
      name: libraryName,
      file_count: 0, // Will be updated when fetched later
      updated_at: new Date().toISOString()
    });
    
    onClose();
  };

  const handleRemoveVectorStore = () => {
    removeVectorStore(itemId);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            onClick={e => e.stopPropagation()}
          >
            {step === 'select' && (
              <>
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary-100 rounded-full">
                        <SafeIcon icon={FiDatabase} className="text-primary-600 text-xl" />
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900">
                          {itemType === 'topic' ? 'Topic Knowledge Library' : 'Lesson Knowledge Library'}
                        </h2>
                        <p className="text-sm text-gray-600">
                          {itemType === 'topic' 
                            ? 'This library will be used for all lessons in this topic.' 
                            : 'This library will be used only for this specific lesson.'}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onClose}
                      className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                    >
                      <SafeIcon icon={FiX} className="text-gray-500" />
                    </button>
                  </div>
                </div>

                <VectorStoreSelector
                  apiKey={apiKey}
                  selectedVectorStoreId={currentVectorStoreId}
                  onSelect={handleSelectVectorStore}
                  onCreateNew={handleCreateNewLibrary}
                  onCancel={onClose}
                />

                {currentVectorStoreId && (
                  <div className="p-4 border-t border-gray-200">
                    <button
                      onClick={handleRemoveVectorStore}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Remove knowledge library from this {itemType}
                    </button>
                  </div>
                )}
              </>
            )}

            {step === 'upload' && (
              <FileUploader
                apiKey={apiKey}
                libraryName={newLibraryName}
                onComplete={handleUploadComplete}
                onCancel={() => setStep('select')}
              />
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default KnowledgeLibraryModal;
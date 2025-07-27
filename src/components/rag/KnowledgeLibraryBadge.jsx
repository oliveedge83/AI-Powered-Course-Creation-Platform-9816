import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import { useVectorStoreStore } from '../../stores/vectorStoreStore';
import KnowledgeLibraryModal from './KnowledgeLibraryModal';

const { FiDatabase, FiPlus } = FiIcons;

const KnowledgeLibraryBadge = ({ 
  itemId,
  itemType,
  apiKey,
  className = ''
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { hasVectorStore, getVectorStoreId, getCachedVectorStore } = useVectorStoreStore();
  
  const vectorStoreId = getVectorStoreId(itemId);
  const vectorStore = getCachedVectorStore(vectorStoreId);
  const hasLibrary = hasVectorStore(itemId);
  
  const openModal = (e) => {
    e.stopPropagation();
    setIsModalOpen(true);
  };
  
  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={openModal}
        className={`flex items-center space-x-1 px-2 py-1 rounded-md transition-colors ${
          hasLibrary 
            ? 'bg-primary-100 text-primary-700 hover:bg-primary-200' 
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
        } ${className}`}
        title={hasLibrary ? `Knowledge Library: ${vectorStore?.name || 'Assigned'}` : 'Add Knowledge Library'}
      >
        <SafeIcon 
          icon={hasLibrary ? FiDatabase : FiPlus} 
          className="text-sm" 
        />
        <span className="text-xs font-medium">
          {hasLibrary ? 'Library' : 'Add Library'}
        </span>
      </motion.button>

      <KnowledgeLibraryModal
        isOpen={isModalOpen}
        onClose={closeModal}
        itemId={itemId}
        itemType={itemType}
        apiKey={apiKey}
      />
    </>
  );
};

export default KnowledgeLibraryBadge;
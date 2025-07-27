import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import Button from '../ui/Button';
import Select from '../ui/Select';
import Input from '../ui/Input';
import { listVectorStores } from '../../services/vectorStoreService';
import LoadingSpinner from '../ui/LoadingSpinner';

const { 
  FiDatabase, 
  FiPlus, 
  FiX, 
  FiChevronRight, 
  FiRefreshCw, 
  FiTrash2,
  FiInfo
} = FiIcons;

const VectorStoreSelector = ({ 
  apiKey, 
  selectedVectorStoreId, 
  onSelect, 
  onCreateNew,
  onCancel
}) => {
  const [vectorStores, setVectorStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateNew, setShowCreateNew] = useState(false);
  const [newLibraryName, setNewLibraryName] = useState('');

  // Fetch vector stores when the component mounts
  useEffect(() => {
    fetchVectorStores();
  }, [apiKey]);

  const fetchVectorStores = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const stores = await listVectorStores(apiKey);
      setVectorStores(stores);
    } catch (err) {
      console.error('Error fetching vector stores:', err);
      setError('Failed to load knowledge libraries. Please check your API key.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectVectorStore = (e) => {
    const vectorStoreId = e.target.value;
    if (vectorStoreId === 'new') {
      setShowCreateNew(true);
    } else {
      onSelect(vectorStoreId);
    }
  };

  const handleCreateNewLibrary = () => {
    if (!newLibraryName.trim()) {
      return;
    }
    
    onCreateNew(newLibraryName);
    setShowCreateNew(false);
    setNewLibraryName('');
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-full">
            <SafeIcon icon={FiDatabase} className="text-primary-600 text-xl" />
          </div>
          <h3 className="text-lg font-semibold">Knowledge Library Selection</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel}>
          <SafeIcon icon={FiX} />
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-8">
          <LoadingSpinner size="md" className="mb-4" />
          <p className="text-gray-600">Loading knowledge libraries...</p>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <SafeIcon icon={FiInfo} className="text-red-600 mt-1 mr-3" />
            <div>
              <p className="text-red-800">{error}</p>
              <Button 
                variant="secondary" 
                size="sm" 
                className="mt-2"
                onClick={fetchVectorStores}
              >
                <SafeIcon icon={FiRefreshCw} className="mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {!showCreateNew ? (
            <div className="space-y-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-2">
                  Select an existing knowledge library or create a new one to enhance content generation with relevant information.
                </p>
              </div>

              <Select
                label="Knowledge Library"
                value={selectedVectorStoreId || ''}
                onChange={handleSelectVectorStore}
                options={[
                  { value: '', label: 'Select a knowledge library' },
                  ...vectorStores.map(store => ({ 
                    value: store.id, 
                    label: `${store.name} (${store.file_count} files)` 
                  })),
                  { value: 'new', label: '+ Create New Library' }
                ]}
              />

              {selectedVectorStoreId && vectorStores.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <h4 className="font-medium mb-2">Selected Library Details</h4>
                  {(() => {
                    const selectedStore = vectorStores.find(store => store.id === selectedVectorStoreId);
                    if (!selectedStore) return null;
                    
                    return (
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Name:</span> {selectedStore.name}</p>
                        <p><span className="font-medium">Files:</span> {selectedStore.file_count}</p>
                        <p><span className="font-medium">Last Updated:</span> {formatDate(selectedStore.updated_at)}</p>
                      </div>
                    );
                  })()}
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={onCancel}>
                  Cancel
                </Button>
                <Button 
                  disabled={!selectedVectorStoreId}
                  onClick={() => onSelect(selectedVectorStoreId)}
                >
                  Use Selected Library
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <SafeIcon icon={FiInfo} className="text-blue-600 mt-1 mr-3" />
                  <p className="text-blue-800">
                    Creating a new library will allow you to upload files that will be used as context for generating content.
                  </p>
                </div>
              </div>

              <Input
                label="Library Name"
                placeholder="Enter a name for your new knowledge library"
                value={newLibraryName}
                onChange={(e) => setNewLibraryName(e.target.value)}
              />

              <div className="flex justify-end space-x-3 mt-6">
                <Button variant="secondary" onClick={() => setShowCreateNew(false)}>
                  Back
                </Button>
                <Button 
                  disabled={!newLibraryName.trim()}
                  onClick={handleCreateNewLibrary}
                >
                  <SafeIcon icon={FiPlus} className="mr-2" />
                  Create & Add Files
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default VectorStoreSelector;
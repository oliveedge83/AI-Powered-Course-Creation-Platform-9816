import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as FiIcons from 'react-icons/fi';
import SafeIcon from '../../common/SafeIcon';
import Button from '../ui/Button';
import { uploadFile, createVectorStore } from '../../services/vectorStoreService';
import LoadingSpinner from '../ui/LoadingSpinner';

const { 
  FiUpload, 
  FiFile, 
  FiX, 
  FiCheck, 
  FiAlertCircle,
  FiTrash2,
  FiInfo
} = FiIcons;

const FileUploader = ({ 
  apiKey, 
  libraryName, 
  onComplete, 
  onCancel 
}) => {
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [uploadedFileIds, setUploadedFileIds] = useState([]);
  const [error, setError] = useState(null);
  const [creatingLibrary, setCreatingLibrary] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(prevFiles => [...prevFiles, ...selectedFiles]);
  };

  const removeFile = (index) => {
    setFiles(prevFiles => prevFiles.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;

    setUploading(true);
    setError(null);
    const fileIds = [];

    try {
      // Upload files one by one
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({ ...prev, [i]: { progress: 0, status: 'uploading' } }));

        try {
          const uploadedFile = await uploadFile(apiKey, file);
          fileIds.push(uploadedFile.id);
          setUploadProgress(prev => ({ ...prev, [i]: { progress: 100, status: 'completed' } }));
        } catch (err) {
          console.error(`Error uploading file ${file.name}:`, err);
          setUploadProgress(prev => ({ ...prev, [i]: { progress: 0, status: 'error', message: err.message } }));
        }
      }

      setUploadedFileIds(fileIds);
      
      if (fileIds.length > 0) {
        setCreatingLibrary(true);
        
        // Create vector store with the uploaded files
        const vectorStore = await createVectorStore(apiKey, libraryName, fileIds);
        
        // Pass the vector store ID back to the parent component
        onComplete(vectorStore.id, libraryName);
      } else {
        setError('No files were successfully uploaded. Please try again.');
      }
    } catch (err) {
      console.error('Error during file upload or vector store creation:', err);
      setError(err.message || 'An error occurred during the upload process. Please try again.');
    } finally {
      setUploading(false);
      setCreatingLibrary(false);
    }
  };

  const getFileIcon = (fileName) => {
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return 'FiFileText';
      case 'doc':
      case 'docx':
        return 'FiFileText';
      case 'xls':
      case 'xlsx':
        return 'FiGrid';
      case 'ppt':
      case 'pptx':
        return 'FiMonitor';
      case 'txt':
        return 'FiFileText';
      case 'csv':
        return 'FiGrid';
      default:
        return 'FiFile';
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 rounded-full">
            <SafeIcon icon={FiUpload} className="text-primary-600 text-xl" />
          </div>
          <h3 className="text-lg font-semibold">Upload Files to "{libraryName}"</h3>
        </div>
        <Button variant="ghost" size="sm" onClick={onCancel} disabled={uploading || creatingLibrary}>
          <SafeIcon icon={FiX} />
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <SafeIcon icon={FiInfo} className="text-blue-600 mt-1 mr-3" />
          <div>
            <p className="text-blue-800">Files will be processed and indexed for retrieval during content generation.</p>
            <p className="text-blue-800 mt-1">Supported formats: PDF, DOCX, TXT, CSV, XLSX, PPTX</p>
          </div>
        </div>
      </div>

      {/* File Drop Area */}
      <div 
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 mb-6 text-center cursor-pointer hover:border-primary-400 transition-colors"
        onClick={() => fileInputRef.current?.click()}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          multiple 
          onChange={handleFileChange} 
          className="hidden" 
          accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,.ppt,.pptx"
          disabled={uploading || creatingLibrary}
        />
        <SafeIcon icon={FiUpload} className="text-gray-400 text-4xl mx-auto mb-3" />
        <p className="text-gray-700 mb-1">Drag and drop files here, or click to select files</p>
        <p className="text-gray-500 text-sm">Maximum file size: 25MB</p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mb-6">
          <h4 className="font-medium mb-3">Selected Files ({files.length})</h4>
          <div className="space-y-3 max-h-64 overflow-y-auto p-1">
            {files.map((file, index) => (
              <div 
                key={`${file.name}-${index}`}
                className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200"
              >
                <div className="flex items-center space-x-3">
                  <SafeIcon name={getFileIcon(file.name)} className="text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-800 truncate max-w-xs">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                </div>
                
                {uploading ? (
                  <div className="flex items-center space-x-2">
                    {uploadProgress[index]?.status === 'uploading' && (
                      <LoadingSpinner size="sm" />
                    )}
                    {uploadProgress[index]?.status === 'completed' && (
                      <SafeIcon icon={FiCheck} className="text-green-500" />
                    )}
                    {uploadProgress[index]?.status === 'error' && (
                      <SafeIcon icon={FiAlertCircle} className="text-red-500" />
                    )}
                  </div>
                ) : (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(index);
                    }}
                    disabled={uploading || creatingLibrary}
                  >
                    <SafeIcon icon={FiTrash2} className="text-red-500" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-start">
            <SafeIcon icon={FiAlertCircle} className="text-red-600 mt-1 mr-3" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end space-x-3 mt-6">
        <Button 
          variant="secondary" 
          onClick={onCancel}
          disabled={uploading || creatingLibrary}
        >
          Cancel
        </Button>
        <Button 
          onClick={uploadFiles} 
          disabled={files.length === 0 || uploading || creatingLibrary}
          loading={uploading || creatingLibrary}
        >
          {creatingLibrary ? 'Creating Library...' : uploading ? 'Uploading Files...' : 'Upload & Create Library'}
        </Button>
      </div>
    </div>
  );
};

export default FileUploader;
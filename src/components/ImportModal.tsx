import React, { useState, useRef } from 'react';
import { X, Upload, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { importData, validateImportFile } from '../utils/importData';

interface ImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
}

const ImportModal: React.FC<ImportModalProps> = ({ onClose, onImportComplete }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: any;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    const validation = validateImportFile(file);
    if (!validation.valid) {
      setImportResult({ success: false, message: validation.message });
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importData(file);
      setImportResult(result);
      
      if (result.success) {
        // Wait a moment then trigger completion
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 2000);
      }
    } catch (error) {
      setImportResult({
        success: false,
        message: 'An unexpected error occurred during import.'
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white w-full max-w-md rounded-lg shadow-xl">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Import Data</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          {!importResult && !isImporting && (
            <>
              <p className="text-gray-600 mb-4">
                Import goals, tasks, and history from a previously exported JSON file. 
                Your existing data will be preserved and merged with the imported data.
              </p>

              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  isDragOver
                    ? 'border-blue-400 bg-blue-50'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <Upload size={48} className="mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop your JSON file here
                </p>
                <p className="text-gray-500 mb-4">or</p>
                <button
                  onClick={handleBrowseClick}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
                >
                  Browse Files
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </div>

              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <FileText size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium mb-1">Supported format:</p>
                    <p>JSON files exported from Achieve (*.json)</p>
                  </div>
                </div>
              </div>
            </>
          )}

          {isImporting && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-lg font-medium text-gray-700">Importing data...</p>
              <p className="text-gray-500">Please wait while we process your file.</p>
            </div>
          )}

          {importResult && (
            <div className="text-center py-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${
                importResult.success ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {importResult.success ? (
                  <CheckCircle size={24} className="text-green-600" />
                ) : (
                  <AlertCircle size={24} className="text-red-600" />
                )}
              </div>
              
              <h3 className={`text-lg font-medium mb-2 ${
                importResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {importResult.success ? 'Import Successful!' : 'Import Failed'}
              </h3>
              
              <p className={`text-sm ${
                importResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {importResult.message}
              </p>

              {importResult.success && importResult.stats && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg text-left">
                  <h4 className="font-medium text-green-800 mb-2">Import Summary:</h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• {importResult.stats.goalsImported} goals imported</li>
                    <li>• {importResult.stats.tasksImported} active tasks imported</li>
                    <li>• {importResult.stats.completedTasksImported} completed tasks imported</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t">
          {!isImporting && (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              {importResult?.success ? 'Close' : 'Cancel'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ImportModal;
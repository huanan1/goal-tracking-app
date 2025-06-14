import React, { useState, useRef, useEffect } from 'react';
import { Menu, History, Download, Upload, X, Archive } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { exportAllData } from '../utils/exportData';
import ImportModal from './ImportModal';

const Header: React.FC = () => {
  const location = useLocation();
  const isHistory = location.pathname === '/history';
  const isArchive = location.pathname === '/archive';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleExport = () => {
    exportAllData();
    setIsMenuOpen(false);
  };

  const handleImport = () => {
    setIsImportModalOpen(true);
    setIsMenuOpen(false);
  };

  const handleImportComplete = () => {
    // Force a page refresh to show the imported data
    window.location.reload();
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close menu when route changes
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  return (
    <>
      <header className="bg-gray-100 border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="text-xl font-bold hover:text-gray-600 transition-colors">
            Achieve
          </Link>
          
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Menu"
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                <Link
                  to={isHistory ? '/' : '/history'}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <History size={18} />
                  <span>{isHistory ? 'Back to Tasks' : 'History'}</span>
                </Link>
                
                <Link
                  to={isArchive ? '/' : '/archive'}
                  className="flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Archive size={18} />
                  <span>{isArchive ? 'Back to Tasks' : 'Archive'}</span>
                </Link>
                
                <div className="border-t border-gray-100 my-1"></div>
                
                <button
                  onClick={handleImport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <Upload size={18} />
                  <span>Import Data</span>
                </button>
                
                <button
                  onClick={handleExport}
                  className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 hover:bg-gray-50 transition-colors text-left"
                >
                  <Download size={18} />
                  <span>Export Data</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {isImportModalOpen && (
        <ImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImportComplete={handleImportComplete}
        />
      )}
    </>
  );
};

export default Header;
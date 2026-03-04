import { useState, useEffect, useRef, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { getProjectFolders } from '../services/graphApi';
import { getActiveAccount } from '../services/auth';

export function ProjectCodeSelect({ value, onChange, error }) {
  const { instance } = useMsal();
  const [folders, setFolders] = useState([]);
  const [filteredFolders, setFilteredFolders] = useState([]);
  const [searchText, setSearchText] = useState(value || '');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const wrapperRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  // Fetch folders on mount
  useEffect(() => {
    let cancelled = false;

    async function fetchFolders() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const account = getActiveAccount(instance);
        if (!account) {
          setLoadError('Not signed in');
          return;
        }
        const result = await getProjectFolders(instance, account);
        if (!cancelled) {
          setFolders(result);
          setFilteredFolders(result);
        }
      } catch (err) {
        console.error('Failed to load project folders:', err);
        if (!cancelled) {
          setLoadError('Failed to load projects');
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    fetchFolders();
    return () => { cancelled = true; };
  }, [instance]);

  // Sync external value changes
  useEffect(() => {
    setSearchText(value || '');
  }, [value]);

  // Filter folders when search text changes
  useEffect(() => {
    if (!searchText) {
      setFilteredFolders(folders);
    } else {
      const lower = searchText.toLowerCase();
      setFilteredFolders(
        folders.filter((f) => f.toLowerCase().includes(lower))
      );
    }
    setHighlightedIndex(-1);
  }, [searchText, folders]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const items = listRef.current.children;
      if (items[highlightedIndex]) {
        items[highlightedIndex].scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightedIndex]);

  const selectFolder = useCallback((folder) => {
    setSearchText(folder);
    onChange(folder);
    setIsOpen(false);
    inputRef.current?.blur();
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredFolders.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredFolders[highlightedIndex]) {
          selectFolder(filteredFolders[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  }, [isOpen, highlightedIndex, filteredFolders, selectFolder]);

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value);
            setIsOpen(true);
            // Clear the selected value while user is typing/searching
            if (e.target.value !== value) {
              onChange('');
            }
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Loading projects...' : 'Search projects...'}
          className={`w-full min-w-0 px-3 py-3 sm:py-2 pr-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base ${
            error ? 'border-noncompliant' : 'border-gray-300'
          }`}
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
          {isLoading ? (
            <svg className="animate-spin h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
            </svg>
          )}
        </div>
      </div>

      {loadError && (
        <p className="mt-1 text-xs text-amber-600">{loadError} - you can type a project number manually</p>
      )}

      {isOpen && !isLoading && filteredFolders.length > 0 && (
        <ul
          ref={listRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredFolders.map((folder, index) => (
            <li
              key={folder}
              onClick={() => selectFolder(folder)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`px-3 py-2 cursor-pointer text-sm ${
                index === highlightedIndex
                  ? 'bg-primary text-white'
                  : folder === value
                  ? 'bg-blue-50 text-primary font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              {folder}
            </li>
          ))}
        </ul>
      )}

      {isOpen && !isLoading && searchText && filteredFolders.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg p-3 text-sm text-gray-500">
          No projects matching "{searchText}"
        </div>
      )}
    </div>
  );
}

export default ProjectCodeSelect;

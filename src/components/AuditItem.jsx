import { useState, useEffect } from 'react';

export function AuditItem({ item, status, notes, onStatusChange, onNotesChange }) {
  const [showNotes, setShowNotes] = useState(!!notes);

  // Auto-expand notes when "No" is selected
  useEffect(() => {
    if (status === 'no') {
      setShowNotes(true);
    }
  }, [status]);

  const isNoWithoutNotes = status === 'no' && !notes?.trim();

  const getButtonClass = (buttonStatus) => {
    const base = 'px-4 py-3 sm:py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 min-w-[50px] sm:min-w-[44px]';

    if (status === buttonStatus) {
      switch (buttonStatus) {
        case 'yes':
          return `${base} bg-compliant text-white focus:ring-compliant`;
        case 'no':
          return `${base} bg-noncompliant text-white focus:ring-noncompliant`;
        case 'na':
          return `${base} bg-neutral text-white focus:ring-neutral`;
        default:
          return `${base} bg-gray-200 text-gray-700`;
      }
    }

    return `${base} bg-gray-100 text-gray-600 hover:bg-gray-200 active:bg-gray-300`;
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-3 bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <p className="text-gray-800 flex-1">{item.label}</p>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStatusChange(item.id, 'yes')}
            className={getButtonClass('yes')}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => onStatusChange(item.id, 'no')}
            className={getButtonClass('no')}
          >
            No
          </button>
          <button
            type="button"
            onClick={() => onStatusChange(item.id, 'na')}
            className={getButtonClass('na')}
          >
            N/A
          </button>
          <button
            type="button"
            onClick={() => setShowNotes(!showNotes)}
            className="ml-1 p-3 sm:p-2 text-gray-500 hover:text-primary active:text-primary transition-colors rounded-md"
            title={showNotes ? 'Hide notes' : 'Add notes'}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        </div>
      </div>

      {showNotes && (
        <div className="mt-3">
          {isNoWithoutNotes && (
            <p className="text-sm text-noncompliant font-medium mb-2 flex items-center gap-1">
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Notes required for non-compliant items
            </p>
          )}
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(item.id, e.target.value)}
            placeholder={status === 'no' ? "Explain why this item is non-compliant..." : "Add notes or comments..."}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
              isNoWithoutNotes
                ? 'border-noncompliant focus:ring-noncompliant bg-red-50'
                : 'border-gray-300 focus:ring-primary'
            }`}
            rows={2}
          />
        </div>
      )}
    </div>
  );
}

export default AuditItem;

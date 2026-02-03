import { useState } from 'react';

export function AuditItem({ item, status, notes, onStatusChange, onNotesChange }) {
  const [showNotes, setShowNotes] = useState(!!notes);

  const getButtonClass = (buttonStatus) => {
    const base = 'px-4 py-2 text-sm font-medium rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2';

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

    return `${base} bg-gray-100 text-gray-600 hover:bg-gray-200`;
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
            className="ml-2 p-2 text-gray-500 hover:text-primary transition-colors"
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
          <textarea
            value={notes}
            onChange={(e) => onNotesChange(item.id, e.target.value)}
            placeholder="Add notes or comments..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows={2}
          />
        </div>
      )}

      {status === 'no' && !showNotes && (
        <p className="mt-2 text-sm text-noncompliant">
          Non-compliant item - consider adding notes to explain
        </p>
      )}
    </div>
  );
}

export default AuditItem;

import { SignaturePad } from './SignaturePad';

export function SignoffForm({ signoff, onUpdate, nonCompliantItems }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-primary text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">Sign-off</h2>
        <p className="text-blue-100 text-sm mt-1">
          Review and sign off on the audit
        </p>
      </div>

      <div className="p-4 sm:p-6 space-y-5 sm:space-y-6">
        {nonCompliantItems.length > 0 && (
          <div className="bg-red-50 border border-noncompliant rounded-lg p-3 sm:p-4">
            <h3 className="text-noncompliant font-semibold mb-2 text-sm sm:text-base">
              Non-Compliant Items ({nonCompliantItems.length})
            </h3>
            <ul className="space-y-2">
              {nonCompliantItems.map((item) => (
                <li key={item.itemId} className="text-xs sm:text-sm">
                  <span className="font-medium">{item.sectionTitle}:</span>{' '}
                  {item.itemLabel}
                  {item.notes && (
                    <p className="text-gray-600 ml-4 mt-1">Notes: {item.notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <label
            htmlFor="comments"
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            Additional Comments
          </label>
          <textarea
            id="comments"
            value={signoff.comments || ''}
            onChange={(e) => onUpdate('comments', e.target.value)}
            className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
            rows={4}
            placeholder="Enter any additional comments or observations..."
          />
        </div>

        <div className="sm:max-w-md">
          <h3 className="font-semibold text-gray-800 border-b pb-2 mb-4">
            Project Manager Sign-off
          </h3>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="projectManagerName"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Name <span className="text-noncompliant">*</span>
              </label>
              <input
                type="text"
                id="projectManagerName"
                value={signoff.projectManagerName || ''}
                onChange={(e) => onUpdate('projectManagerName', e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              />
            </div>
            <SignaturePad
              label="Signature"
              value={signoff.projectManagerSignature || ''}
              onChange={(value) => onUpdate('projectManagerSignature', value)}
            />
            <div>
              <label
                htmlFor="projectManagerDate"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Date <span className="text-noncompliant">*</span>
              </label>
              <input
                type="date"
                id="projectManagerDate"
                value={signoff.projectManagerDate || ''}
                onChange={(e) => onUpdate('projectManagerDate', e.target.value)}
                className="w-full px-3 py-3 sm:py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignoffForm;

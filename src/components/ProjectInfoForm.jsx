export function ProjectInfoForm({ projectInfo, onUpdate, errors }) {
  const fields = [
    { id: 'projectCode', label: 'Project Code', type: 'text', required: true },
    { id: 'siteName', label: 'Site Name', type: 'text', required: true },
    { id: 'siteAddress', label: 'Site Address', type: 'text', required: true },
    { id: 'projectManager', label: 'Project Manager', type: 'text', required: true },
    { id: 'auditor', label: 'Auditor Name', type: 'text', required: true },
    { id: 'auditDate', label: 'Audit Date', type: 'date', required: true },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
      <div className="bg-primary text-white p-3 sm:p-4">
        <h2 className="text-lg sm:text-xl font-semibold">Project Information</h2>
        <p className="text-blue-100 text-xs sm:text-sm mt-1">
          Enter the project and audit details
        </p>
      </div>

      <div className="p-3 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
          {fields.map((field) => (
            <div key={field.id} className="min-w-0">
              <label
                htmlFor={field.id}
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {field.label}
                {field.required && <span className="text-noncompliant ml-1">*</span>}
              </label>
              <input
                type={field.type}
                id={field.id}
                value={projectInfo[field.id] || ''}
                onChange={(e) => onUpdate(field.id, e.target.value)}
                className={`w-full min-w-0 px-3 py-3 sm:py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-base ${
                  field.type === 'date' ? 'appearance-none' : ''
                } ${errors?.[field.id] ? 'border-noncompliant' : 'border-gray-300'}`}
              />
              {errors?.[field.id] && (
                <p className="mt-1 text-sm text-noncompliant">{errors[field.id]}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ProjectInfoForm;

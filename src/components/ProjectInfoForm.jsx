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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="bg-primary text-white p-4 rounded-t-lg">
        <h2 className="text-xl font-semibold">Project Information</h2>
        <p className="text-blue-100 text-sm mt-1">
          Enter the project and audit details
        </p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {fields.map((field) => (
            <div key={field.id}>
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
                className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${
                  errors?.[field.id] ? 'border-noncompliant' : 'border-gray-300'
                }`}
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

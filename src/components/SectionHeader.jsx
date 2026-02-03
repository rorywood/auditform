export function SectionHeader({ title, progress }) {
  const { completed, total } = progress;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-primary text-white p-4 rounded-t-lg mb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">{title}</h2>
          <p className="text-blue-100 text-sm mt-1">
            {completed} of {total} items completed ({percentage}%)
          </p>
        </div>

        <div className="w-32 bg-blue-900 rounded-full h-2">
          <div
            className="bg-white rounded-full h-2 transition-all duration-300"
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export default SectionHeader;

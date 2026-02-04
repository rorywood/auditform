export function SectionHeader({ title, progress }) {
  const { completed, total } = progress;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="bg-primary text-white p-3 sm:p-4 rounded-t-lg mb-4">
      <div className="flex flex-col gap-2 sm:gap-3">
        <div className="flex items-start sm:items-center justify-between gap-2">
          <h2 className="text-lg sm:text-xl font-semibold">{title}</h2>
          <span className="text-blue-100 text-xs sm:text-sm whitespace-nowrap">
            {completed}/{total}
          </span>
        </div>

        <div className="w-full bg-blue-900 rounded-full h-2">
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

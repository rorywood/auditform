export function ProgressIndicator({ progress }) {
  const { completed, total, percentage } = progress;

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 sm:gap-2 mb-2">
        <span className="text-xs sm:text-sm font-medium text-gray-700">Overall Progress</span>
        <span className="text-xs sm:text-sm font-semibold text-primary">
          {completed} / {total} items ({percentage}%)
        </span>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
        <div
          className="bg-primary rounded-full h-2 sm:h-3 transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {percentage === 100 && (
        <p className="mt-2 text-xs sm:text-sm text-compliant font-medium">
          All items completed!
        </p>
      )}
    </div>
  );
}

export default ProgressIndicator;

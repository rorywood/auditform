import { AuditItem } from '../components/AuditItem';
import { SectionHeader } from '../components/SectionHeader';
import { auditSections } from '../config/auditItems';

export function CommissioningSection({
  getItemStatus,
  getItemNotes,
  setAuditItemStatus,
  setAuditItemNotes,
  getSectionProgress,
}) {
  const section = auditSections.commissioning;
  const progress = getSectionProgress('commissioning');

  return (
    <div>
      <SectionHeader
        title={section.title}
        progress={progress}
      />

      <div className="space-y-3">
        {section.items.map((item) => (
          <AuditItem
            key={item.id}
            item={item}
            status={getItemStatus(item.id)}
            notes={getItemNotes(item.id)}
            onStatusChange={setAuditItemStatus}
            onNotesChange={setAuditItemNotes}
          />
        ))}
      </div>
    </div>
  );
}

export default CommissioningSection;

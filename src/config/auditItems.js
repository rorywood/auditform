export const auditSections = {
  swms: {
    id: 'swms',
    title: 'SWMS & Documentation',
    items: [
      { id: 'swms_1', label: 'SWMS reviewed and signed by all workers on site' },
      { id: 'swms_2', label: 'JSA/Take 5 completed for all tasks' },
      { id: 'swms_3', label: 'Permits obtained (working at heights, confined space, hot works)' },
      { id: 'swms_4', label: 'Site induction completed and documented' },
      { id: 'swms_5', label: 'Emergency procedures understood and documented' },
      { id: 'swms_6', label: 'First aid kit available and stocked' },
      { id: 'swms_7', label: 'Fire extinguisher available and current' },
      { id: 'swms_8', label: 'PPE requirements documented and being followed' },
      { id: 'swms_9', label: 'Toolbox talks conducted and documented' },
      { id: 'swms_10', label: 'Hazard register maintained and current' },
      { id: 'swms_11', label: 'Incident reporting procedures in place' },
      { id: 'swms_12', label: 'Site diary being maintained' },
      { id: 'swms_13', label: 'Quality checklists completed' },
      { id: 'swms_14', label: 'As-built drawings updated' },
      { id: 'swms_15', label: 'Test results documented' },
      { id: 'swms_16', label: 'Photos taken and logged' },
      { id: 'swms_17', label: 'Material delivery dockets filed' },
    ],
  },
  donor: {
    id: 'donor',
    title: 'Donor Installation',
    items: [
      { id: 'donor_1', label: 'Donor antenna installed at correct location' },
      { id: 'donor_2', label: 'Donor antenna oriented correctly' },
      { id: 'donor_3', label: 'Mounting hardware secure and weather sealed' },
      { id: 'donor_4', label: 'Cable runs neat and secured' },
      { id: 'donor_5', label: 'Weatherproofing applied to all connections' },
      { id: 'donor_6', label: 'Cable labels applied' },
      { id: 'donor_7', label: 'Grounding/earthing completed' },
      { id: 'donor_8', label: 'Signal strength verified and documented' },
      { id: 'donor_9', label: 'No interference with existing equipment' },
    ],
  },
  cabinet: {
    id: 'cabinet',
    title: 'Cabinet & Equipment',
    items: [
      { id: 'cabinet_1', label: 'Cabinet installed at correct location' },
      { id: 'cabinet_2', label: 'Cabinet securely mounted' },
      { id: 'cabinet_3', label: 'Cabinet level and plumb' },
      { id: 'cabinet_4', label: 'Ventilation adequate' },
      { id: 'cabinet_5', label: 'Power supply installed and tested' },
      { id: 'cabinet_6', label: 'UPS installed and configured (if required)' },
      { id: 'cabinet_7', label: 'Equipment mounted per design' },
      { id: 'cabinet_8', label: 'Cable management neat and organized' },
      { id: 'cabinet_9', label: 'All connections secure' },
      { id: 'cabinet_10', label: 'Equipment labels applied' },
      { id: 'cabinet_11', label: 'Cabinet locked and secure' },
    ],
  },
  das: {
    id: 'das',
    title: 'DAS Installation',
    items: [
      { id: 'das_1', label: 'Antennas installed at correct locations per design' },
      { id: 'das_2', label: 'Antenna mounting secure' },
      { id: 'das_3', label: 'Cable runs per design specifications' },
      { id: 'das_4', label: 'Cables properly supported and secured' },
      { id: 'das_5', label: 'All connections tight and weatherproofed' },
      { id: 'das_6', label: 'Splitters/couplers installed correctly' },
      { id: 'das_7', label: 'Cable labels applied at both ends' },
      { id: 'das_8', label: 'PIM testing completed and passed' },
      { id: 'das_9', label: 'Coverage testing completed and documented' },
    ],
  },
  commissioning: {
    id: 'commissioning',
    title: 'Commissioning & Testing',
    items: [
      { id: 'comm_1', label: 'System powered on and operational' },
      { id: 'comm_2', label: 'All bands/frequencies tested' },
      { id: 'comm_3', label: 'Signal levels within specification' },
      { id: 'comm_4', label: 'No interference detected' },
      { id: 'comm_5', label: 'Alarms configured and tested' },
      { id: 'comm_6', label: 'Remote monitoring configured' },
      { id: 'comm_7', label: 'Commissioning report completed' },
    ],
  },
  contractor: {
    id: 'contractor',
    title: 'Contractor Compliance',
    items: [
      { id: 'contr_1', label: 'All workers have valid certifications/licenses' },
      { id: 'contr_2', label: 'Insurance certificates current' },
      { id: 'contr_3', label: 'Site left clean and tidy' },
      { id: 'contr_4', label: 'All waste disposed of properly' },
    ],
  },
};

export const getSectionItems = (sectionId) => {
  return auditSections[sectionId]?.items || [];
};

export const getAllSections = () => {
  return Object.values(auditSections);
};

export const getTotalItemCount = () => {
  return Object.values(auditSections).reduce(
    (total, section) => total + section.items.length,
    0
  );
};

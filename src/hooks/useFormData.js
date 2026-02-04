import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { auditSections, getTotalItemCount } from '../config/auditItems';

const STORAGE_KEY = 'powertec-audit-form-data';

const initialFormData = {
  projectInfo: {
    projectCode: '',
    siteName: '',
    siteAddress: '',
    projectManager: '',
    auditor: '',
    auditDate: new Date().toISOString().split('T')[0],
  },
  auditItems: {},
  signoff: {
    auditorName: '',
    auditorSignature: '',
    auditorDate: '',
    projectManagerName: '',
    projectManagerSignature: '',
    projectManagerDate: '',
    comments: '',
  },
};

export function useFormData() {
  const [formData, setFormData, clearFormData] = useLocalStorage(
    STORAGE_KEY,
    initialFormData
  );

  const updateProjectInfo = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      projectInfo: {
        ...prev.projectInfo,
        [field]: value,
      },
    }));
  }, [setFormData]);

  const updateAuditItem = useCallback((itemId, field, value) => {
    setFormData((prev) => ({
      ...prev,
      auditItems: {
        ...prev.auditItems,
        [itemId]: {
          ...prev.auditItems[itemId],
          [field]: value,
        },
      },
    }));
  }, [setFormData]);

  const setAuditItemStatus = useCallback((itemId, status) => {
    updateAuditItem(itemId, 'status', status);
  }, [updateAuditItem]);

  const setAuditItemNotes = useCallback((itemId, notes) => {
    updateAuditItem(itemId, 'notes', notes);
  }, [updateAuditItem]);

  const markAllInSection = useCallback((sectionId, status) => {
    const section = auditSections[sectionId];
    if (!section) return;

    setFormData((prev) => {
      const updatedItems = { ...prev.auditItems };
      section.items.forEach((item) => {
        updatedItems[item.id] = {
          ...updatedItems[item.id],
          status,
        };
      });
      return {
        ...prev,
        auditItems: updatedItems,
      };
    });
  }, [setFormData]);

  const updateSignoff = useCallback((field, value) => {
    setFormData((prev) => ({
      ...prev,
      signoff: {
        ...prev.signoff,
        [field]: value,
      },
    }));
  }, [setFormData]);

  const getItemStatus = useCallback((itemId) => {
    return formData.auditItems[itemId]?.status || null;
  }, [formData.auditItems]);

  const getItemNotes = useCallback((itemId) => {
    return formData.auditItems[itemId]?.notes || '';
  }, [formData.auditItems]);

  const getSectionProgress = useCallback((sectionId) => {
    const section = auditSections[sectionId];
    if (!section) return { completed: 0, total: 0 };

    const completed = section.items.filter(
      (item) => formData.auditItems[item.id]?.status
    ).length;

    return {
      completed,
      total: section.items.length,
    };
  }, [formData.auditItems]);

  const getOverallProgress = useMemo(() => {
    const totalItems = getTotalItemCount();
    const completedItems = Object.values(formData.auditItems).filter(
      (item) => item?.status
    ).length;

    return {
      completed: completedItems,
      total: totalItems,
      percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
    };
  }, [formData.auditItems]);

  const getNonCompliantItems = useCallback(() => {
    const nonCompliant = [];
    Object.entries(auditSections).forEach(([sectionId, section]) => {
      section.items.forEach((item) => {
        if (formData.auditItems[item.id]?.status === 'no') {
          nonCompliant.push({
            sectionId,
            sectionTitle: section.title,
            itemId: item.id,
            itemLabel: item.label,
            notes: formData.auditItems[item.id]?.notes || '',
          });
        }
      });
    });
    return nonCompliant;
  }, [formData.auditItems]);

  const getNonCompliantWithoutNotes = useCallback(() => {
    const missing = [];
    Object.entries(auditSections).forEach(([sectionId, section]) => {
      section.items.forEach((item) => {
        const itemData = formData.auditItems[item.id];
        if (itemData?.status === 'no' && !itemData?.notes?.trim()) {
          missing.push({
            sectionId,
            sectionTitle: section.title,
            itemId: item.id,
            itemLabel: item.label,
          });
        }
      });
    });
    return missing;
  }, [formData.auditItems]);

  const getIncompleteItems = useCallback(() => {
    const incomplete = [];
    Object.entries(auditSections).forEach(([sectionId, section]) => {
      section.items.forEach((item) => {
        if (!formData.auditItems[item.id]?.status) {
          incomplete.push({
            sectionId,
            sectionTitle: section.title,
            itemId: item.id,
            itemLabel: item.label,
          });
        }
      });
    });
    return incomplete;
  }, [formData.auditItems]);

  const allAuditItemsComplete = useMemo(() => {
    const totalItems = getTotalItemCount();
    const completedItems = Object.values(formData.auditItems).filter(
      (item) => item?.status
    ).length;
    return completedItems === totalItems;
  }, [formData.auditItems]);

  const isFormValid = useMemo(() => {
    const { projectCode, siteName, auditor, auditDate } = formData.projectInfo;
    return !!(projectCode && siteName && auditor && auditDate);
  }, [formData.projectInfo]);

  const resetForm = useCallback(() => {
    clearFormData();
  }, [clearFormData]);

  return {
    formData,
    updateProjectInfo,
    updateAuditItem,
    setAuditItemStatus,
    setAuditItemNotes,
    markAllInSection,
    updateSignoff,
    getItemStatus,
    getItemNotes,
    getSectionProgress,
    getOverallProgress,
    getNonCompliantItems,
    getNonCompliantWithoutNotes,
    getIncompleteItems,
    allAuditItemsComplete,
    isFormValid,
    resetForm,
  };
}

export default useFormData;

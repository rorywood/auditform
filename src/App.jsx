import { useState, useCallback } from 'react';
import { useMsal } from '@azure/msal-react';
import { useFormData } from './hooks/useFormData';
import { ProjectInfoForm } from './components/ProjectInfoForm';
import { SignoffForm } from './components/SignoffForm';
import { ProgressIndicator } from './components/ProgressIndicator';
import { SWMSSection } from './sections/SWMSSection';
import { DonorSection } from './sections/DonorSection';
import { CabinetSection } from './sections/CabinetSection';
import { DASSection } from './sections/DASSection';
import { CommissioningSection } from './sections/CommissioningSection';
import { ContractorSection } from './sections/ContractorSection';
import { generateFileName } from './services/graphApi';
import { downloadPdf } from './services/pdfGenerator';

const tabs = [
  { id: 'project', label: 'Project Info' },
  { id: 'swms', label: 'SWMS & Docs' },
  { id: 'donor', label: 'Donor' },
  { id: 'cabinet', label: 'Cabinet' },
  { id: 'das', label: 'DAS' },
  { id: 'commissioning', label: 'Commissioning' },
  { id: 'contractor', label: 'Contractor' },
  { id: 'signoff', label: 'Sign-off' },
];

function App() {
  const { instance } = useMsal();
  const [activeTab, setActiveTab] = useState('project');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  const {
    formData,
    updateProjectInfo,
    setAuditItemStatus,
    setAuditItemNotes,
    updateSignoff,
    getItemStatus,
    getItemNotes,
    getSectionProgress,
    getOverallProgress,
    getNonCompliantItems,
    getIncompleteItems,
    allAuditItemsComplete,
    isFormValid,
    resetForm,
  } = useFormData();

  const showMessage = useCallback((text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const { projectCode, siteName, siteAddress, projectManager, auditor, auditDate } = formData.projectInfo;

    if (!projectCode) newErrors.projectCode = 'Project code is required';
    if (!siteName) newErrors.siteName = 'Site name is required';
    if (!siteAddress) newErrors.siteAddress = 'Site address is required';
    if (!projectManager) newErrors.projectManager = 'Project manager is required';
    if (!auditor) newErrors.auditor = 'Auditor name is required';
    if (!auditDate) newErrors.auditDate = 'Audit date is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData.projectInfo]);

  const handleDownloadPdf = useCallback(async () => {
    setIsLoading(true);
    try {
      const fileName = generateFileName(formData.projectInfo);
      await downloadPdf(formData, fileName);
      showMessage('PDF downloaded successfully', 'success');
    } catch (error) {
      console.error('PDF generation error:', error);
      showMessage('Failed to generate PDF', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [formData, showMessage]);

  const handleSubmit = useCallback(() => {
    if (!validateForm()) {
      showMessage('Please fill in all required project information', 'error');
      setActiveTab('project');
      return;
    }

    const incompleteItems = getIncompleteItems();
    if (incompleteItems.length > 0) {
      const firstIncomplete = incompleteItems[0];
      showMessage(`Please complete all audit items. ${incompleteItems.length} item(s) remaining. First incomplete: "${firstIncomplete.itemLabel}" in ${firstIncomplete.sectionTitle}`, 'error');
      setActiveTab(firstIncomplete.sectionId);
      return;
    }

    // Validate sign-off section
    const { projectManagerName, projectManagerSignature, projectManagerDate } = formData.signoff;

    if (!projectManagerName || !projectManagerSignature || !projectManagerDate) {
      showMessage('Please complete the Project Manager sign-off (name, signature, and date required)', 'error');
      setActiveTab('signoff');
      return;
    }

    setShowCompletionModal(true);
  }, [validateForm, showMessage, getIncompleteItems, formData.signoff]);

  const handleResetForm = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the form? All data will be lost.')) {
      resetForm();
      setActiveTab('project');
      showMessage('Form has been reset', 'info');
    }
  }, [resetForm, showMessage]);

  const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  const goToNextTab = useCallback(() => {
    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
      window.scrollTo(0, 0);
    }
  }, [currentTabIndex]);

  const goToPreviousTab = useCallback(() => {
    if (currentTabIndex > 0) {
      setActiveTab(tabs[currentTabIndex - 1].id);
      window.scrollTo(0, 0);
    }
  }, [currentTabIndex]);

  const sectionProps = {
    getItemStatus,
    getItemNotes,
    setAuditItemStatus,
    setAuditItemNotes,
    getSectionProgress,
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'project':
        return (
          <ProjectInfoForm
            projectInfo={formData.projectInfo}
            onUpdate={updateProjectInfo}
            errors={errors}
          />
        );
      case 'swms':
        return <SWMSSection {...sectionProps} />;
      case 'donor':
        return <DonorSection {...sectionProps} />;
      case 'cabinet':
        return <CabinetSection {...sectionProps} />;
      case 'das':
        return <DASSection {...sectionProps} />;
      case 'commissioning':
        return <CommissioningSection {...sectionProps} />;
      case 'contractor':
        return <ContractorSection {...sectionProps} />;
      case 'signoff':
        return (
          <SignoffForm
            signoff={formData.signoff}
            onUpdate={updateSignoff}
            nonCompliantItems={getNonCompliantItems()}
          />
        );
      default:
        return null;
    }
  };

  const isLastTab = currentTabIndex === tabs.length - 1;
  const isFirstTab = currentTabIndex === 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/logo.png"
                alt="Powertec"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-2xl font-bold text-primary">Project Audit</h1>
                {formData.projectInfo.siteName && (
                  <p className="text-gray-600 text-sm">
                    {formData.projectInfo.projectCode} - {formData.projectInfo.siteName}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg ${
            message.type === 'success'
              ? 'bg-compliant text-white'
              : message.type === 'error'
              ? 'bg-noncompliant text-white'
              : 'bg-primary text-white'
          }`}
        >
          {message.text}
        </div>
      )}

      {showCompletionModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-compliant mb-4">
                <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Complete!</h3>
              <p className="text-gray-600 mb-6">
                Your audit has been submitted successfully. Would you like to download a PDF copy?
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setShowCompletionModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  No Thanks
                </button>
                <button
                  onClick={async () => {
                    await handleDownloadPdf();
                    setShowCompletionModal(false);
                  }}
                  disabled={isLoading}
                  className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-800 transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Generating...' : 'Download PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <ProgressIndicator progress={getOverallProgress} />
        </div>

        <div className="mb-6 overflow-x-auto">
          <div className="flex space-x-1 border-b border-gray-200 min-w-max">
            {tabs.map((tab, index) => {
              const progress = ['swms', 'donor', 'cabinet', 'das', 'commissioning', 'contractor'].includes(tab.id)
                ? getSectionProgress(tab.id)
                : null;

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-primary text-primary bg-white'
                      : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                  }`}
                >
                  <span className="mr-2 text-xs text-gray-400">{index + 1}.</span>
                  {tab.label}
                  {progress && (
                    <span className="ml-2 text-xs text-gray-400">
                      ({progress.completed}/{progress.total})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">{renderTabContent()}</div>

        <div className="flex flex-wrap gap-3 justify-between items-center bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <button
            onClick={handleResetForm}
            className="px-4 py-2 text-sm text-gray-600 hover:text-noncompliant transition-colors"
          >
            Reset Form
          </button>

          <div className="flex gap-3">
            {!isFirstTab && (
              <button
                onClick={goToPreviousTab}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </button>
            )}

            {!isLastTab ? (
              <button
                onClick={goToNextTab}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-800 transition-colors flex items-center gap-2"
              >
                Next
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="px-6 py-2 bg-compliant text-white rounded-md hover:bg-green-600 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Submit Audit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

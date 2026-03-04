import { useState, useCallback, useEffect } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
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
import { uploadToSharePoint, generateFileName, checkProjectFolder, createProjectFolder, getProjectStructure } from './services/graphApi';
import { downloadPdf, getPdfBlob } from './services/pdfGenerator';
import { signIn, getActiveAccount } from './services/auth';
import { loginRequest } from './config/msalConfig';

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
  const isAuthenticated = useIsAuthenticated();
  const [activeTab, setActiveTab] = useState('project');
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'uploading', 'success', 'error'
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [folderStatus, setFolderStatus] = useState(null); // null = not checked, 'checking', 'exists', 'missing', 'creating'
  const [projectStructure, setProjectStructure] = useState(null);

  // Auto sign-in with MSAL when app loads
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First, try to handle any redirect response
        await instance.handleRedirectPromise();

        const accounts = instance.getAllAccounts();
        if (accounts.length === 0) {
          // No accounts, sign in silently using redirect
          await instance.loginRedirect(loginRequest);
        } else {
          // Already have an account, try to get a token silently
          try {
            await instance.acquireTokenSilent({
              ...loginRequest,
              account: accounts[0],
            });
          } catch (e) {
            // Silent token failed, will try popup on upload
            console.log('Silent token acquisition failed, will retry on upload');
          }
          setIsAuthReady(true);
        }
      } catch (error) {
        console.error('Auth init error:', error);
        setIsAuthReady(true);
      }
    };

    initAuth();
  }, [instance]);

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
    getNonCompliantWithoutNotes,
    getIncompleteItems,
    allAuditItemsComplete,
    isFormValid,
    resetForm,
  } = useFormData();

  // Check for project folder and list documents when project is selected
  useEffect(() => {
    const projectCode = formData.projectInfo.projectCode;
    if (!projectCode || !isAuthReady) {
      setFolderStatus(null);
      setProjectStructure(null);
      return;
    }

    let cancelled = false;

    async function check() {
      const account = getActiveAccount(instance);
      if (!account) return;

      setFolderStatus('checking');
      setProjectStructure(null);
      try {
        const exists = await checkProjectFolder(instance, account, projectCode);
        if (!cancelled) {
          setFolderStatus(exists ? 'exists' : 'missing');

          try {
            const structure = await getProjectStructure(instance, account, projectCode);
            if (!cancelled) setProjectStructure(structure);
          } catch {
            // Don't block if listing fails
          }
        }
      } catch {
        if (!cancelled) setFolderStatus('missing');
      }
    }

    check();
    return () => { cancelled = true; };
  }, [formData.projectInfo.projectCode, isAuthReady, instance]);

  const showMessage = useCallback((text, type = 'info') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 5000);
  }, []);

  // Clear error messages when user starts interacting with the form
  useEffect(() => {
    if (message?.type === 'error') {
      setMessage(null);
    }
  }, [formData.projectInfo, formData.auditItems]);

  // Clear individual field errors when that field gets a value
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const { projectCode, siteName, siteAddress, projectManager, auditor, auditDate } = formData.projectInfo;
      const newErrors = { ...errors };

      if (projectCode && newErrors.projectCode) delete newErrors.projectCode;
      if (siteName && newErrors.siteName) delete newErrors.siteName;
      if (siteAddress && newErrors.siteAddress) delete newErrors.siteAddress;
      if (projectManager && newErrors.projectManager) delete newErrors.projectManager;
      if (auditor && newErrors.auditor) delete newErrors.auditor;
      if (auditDate && newErrors.auditDate) delete newErrors.auditDate;

      if (Object.keys(newErrors).length !== Object.keys(errors).length) {
        setErrors(newErrors);
      }
    }
  }, [formData.projectInfo, errors]);

  const validateForm = useCallback(() => {
    const newErrors = {};
    const { projectCode, siteName, siteAddress, projectManager, auditor, auditDate } = formData.projectInfo;

    if (!projectCode) newErrors.projectCode = 'Project number is required';
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

  const handleUploadToSharePoint = useCallback(async () => {
    setUploadStatus('uploading');
    try {
      const account = getActiveAccount(instance);
      if (!account) {
        throw new Error('Not signed in. Please refresh the page.');
      }

      const pdfBlob = await getPdfBlob(formData);
      const fileName = generateFileName(formData.projectInfo);

      await uploadToSharePoint(instance, account, pdfBlob, fileName, formData.projectInfo.projectCode);
      setUploadStatus('success');
      showMessage('Audit uploaded to SharePoint successfully', 'success');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
      showMessage(`Upload failed: ${error.message}`, 'error');
    }
  }, [formData, instance, showMessage]);

  const handleSubmit = useCallback(async () => {
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

    // Check for non-compliant items missing notes
    const missingNotes = getNonCompliantWithoutNotes();
    if (missingNotes.length > 0) {
      const first = missingNotes[0];
      showMessage(`Please add notes for all non-compliant items. "${first.itemLabel}" in ${first.sectionTitle} requires an explanation.`, 'error');
      setActiveTab(first.sectionId);
      return;
    }

    // Validate sign-off section
    const { projectManagerName, projectManagerSignature, projectManagerDate } = formData.signoff;

    if (!projectManagerName || !projectManagerSignature || !projectManagerDate) {
      showMessage('Please complete the Project Manager sign-off (name, signature, and date required)', 'error');
      setActiveTab('signoff');
      return;
    }

    // Show modal and start upload
    setShowCompletionModal(true);
    setUploadStatus('uploading');

    // Auto-upload to SharePoint
    try {
      const account = getActiveAccount(instance);
      if (!account) {
        throw new Error('Not signed in. Please refresh the page.');
      }

      const pdfBlob = await getPdfBlob(formData);
      const fileName = generateFileName(formData.projectInfo);

      await uploadToSharePoint(instance, account, pdfBlob, fileName, formData.projectInfo.projectCode);
      setUploadStatus('success');
    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus('error');
    }
  }, [validateForm, showMessage, getIncompleteItems, formData, isAuthenticated, instance]);

  const handleCreateFolder = useCallback(async () => {
    setFolderStatus('creating');
    try {
      const account = getActiveAccount(instance);
      if (!account) throw new Error('Not signed in');
      await createProjectFolder(instance, account, formData.projectInfo.projectCode);
      setFolderStatus('exists');
      showMessage('Folder created successfully', 'success');
    } catch (error) {
      console.error('Failed to create folder:', error);
      setFolderStatus('missing');
      showMessage(`Failed to create folder: ${error.message}`, 'error');
    }
  }, [instance, formData.projectInfo.projectCode, showMessage]);

  const handleResetForm = useCallback(() => {
    if (window.confirm('Are you sure you want to reset the form? All data will be lost.')) {
      resetForm();
      setActiveTab('project');
      setShowCompletionModal(false);
      setUploadStatus(null);
      setFolderStatus(null);
      setProjectStructure(null);
      showMessage('Form has been reset', 'info');
    }
  }, [resetForm, showMessage]);

  const currentTabIndex = tabs.findIndex((tab) => tab.id === activeTab);

  // Check if project info is complete (folder must also exist)
  const isProjectInfoComplete = useCallback(() => {
    const { projectCode, siteName, siteAddress, projectManager, auditor, auditDate } = formData.projectInfo;
    return !!(projectCode && siteName && siteAddress && projectManager && auditor && auditDate && folderStatus === 'exists');
  }, [formData.projectInfo, folderStatus]);

  // Check if a section is complete (all items answered AND all "No" items have notes)
  const isSectionComplete = useCallback((sectionId) => {
    if (sectionId === 'project') {
      return isProjectInfoComplete();
    }
    if (sectionId === 'signoff') {
      const { projectManagerName, projectManagerSignature, projectManagerDate } = formData.signoff;
      return !!(projectManagerName && projectManagerSignature && projectManagerDate);
    }
    // For audit sections - check both completion AND notes for "No" items
    const progress = getSectionProgress(sectionId);
    const allAnswered = progress && progress.completed === progress.total;
    if (!allAnswered) return false;

    // Check if any "No" items in this section are missing notes
    const missingNotes = getNonCompliantWithoutNotes().filter(item => item.sectionId === sectionId);
    return missingNotes.length === 0;
  }, [isProjectInfoComplete, formData.signoff, getSectionProgress, getNonCompliantWithoutNotes]);

  // Check if a tab can be accessed (all previous sections must be complete)
  const canAccessTab = useCallback((tabIndex) => {
    if (tabIndex === 0) return true; // Project info always accessible

    // Check all previous sections are complete
    for (let i = 0; i < tabIndex; i++) {
      if (!isSectionComplete(tabs[i].id)) {
        return false;
      }
    }
    return true;
  }, [isSectionComplete]);

  // Check if current audit section has incomplete items or missing notes for "No" items
  const getSectionIssues = useCallback((sectionId) => {
    const auditSections = ['swms', 'donor', 'cabinet', 'das', 'commissioning', 'contractor'];
    if (!auditSections.includes(sectionId)) return null;

    const progress = getSectionProgress(sectionId);
    if (progress.completed < progress.total) {
      return { type: 'incomplete', remaining: progress.total - progress.completed };
    }

    // Check for "No" items without notes in this section
    const missingNotes = getNonCompliantWithoutNotes().filter(item => item.sectionId === sectionId);
    if (missingNotes.length > 0) {
      return { type: 'missingNotes', items: missingNotes };
    }

    return null;
  }, [getSectionProgress, getNonCompliantWithoutNotes]);

  const goToNextTab = useCallback(() => {
    // Don't allow progressing past project info until it's complete
    if (activeTab === 'project') {
      if (folderStatus === 'missing') {
        showMessage('The "05-ISO Project Documents" folder is missing. Please create it before continuing.', 'error');
        return;
      }
      if (folderStatus === 'checking' || folderStatus === 'creating') {
        showMessage('Please wait while the project folder is being checked', 'error');
        return;
      }
      if (!isProjectInfoComplete()) {
        validateForm();
        showMessage('Please complete all project information before continuing', 'error');
        return;
      }

      // Warn if an existing audit form was found
      const hasExistingAudit = projectStructure?.isoFiles?.some(f => f.isAuditForm);
      if (hasExistingAudit) {
        if (!window.confirm('An audit form already exists for this project. Are you sure you want to continue and submit another one?')) {
          return;
        }
      }
    }

    // Check audit sections for completion and notes
    const issues = getSectionIssues(activeTab);
    if (issues) {
      if (issues.type === 'incomplete') {
        showMessage(`Please complete all items in this section. ${issues.remaining} item(s) remaining.`, 'error');
        return;
      }
      if (issues.type === 'missingNotes') {
        showMessage(`Please add notes for all non-compliant items. ${issues.items.length} item(s) need explanation.`, 'error');
        return;
      }
    }

    if (currentTabIndex < tabs.length - 1) {
      setActiveTab(tabs[currentTabIndex + 1].id);
      window.scrollTo(0, 0);
    }
  }, [currentTabIndex, activeTab, isProjectInfoComplete, validateForm, showMessage, getSectionIssues]);

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
          <>
            <ProjectInfoForm
              projectInfo={formData.projectInfo}
              onUpdate={updateProjectInfo}
              errors={errors}
            />
            {folderStatus === 'missing' && formData.projectInfo.projectCode && (
              <div className="mt-4 bg-red-50 border border-red-300 rounded-lg p-4 flex items-start gap-3">
                <svg className="h-6 w-6 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div className="flex-1">
                  <h3 className="font-semibold text-red-800">Missing project folder</h3>
                  <p className="text-sm text-red-700 mt-1">
                    The folder "05-ISO Project Documents" does not exist for this project. You cannot continue until this folder is created.
                  </p>
                  <button
                    onClick={handleCreateFolder}
                    className="mt-3 px-4 py-2 bg-primary text-white text-sm rounded-md hover:bg-blue-800 transition-colors"
                  >
                    Create Folder
                  </button>
                </div>
              </div>
            )}
            {folderStatus === 'creating' && formData.projectInfo.projectCode && (
              <div className="mt-4 bg-blue-50 border border-blue-300 rounded-lg p-4 flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-primary flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-primary font-medium">Creating folder...</p>
              </div>
            )}
            {folderStatus === 'checking' && formData.projectInfo.projectCode && (
              <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center gap-3">
                <svg className="animate-spin h-5 w-5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <p className="text-sm text-gray-500">Checking project folder...</p>
              </div>
            )}
            {projectStructure && formData.projectInfo.projectCode && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
                {(() => {
                  const auditCount = projectStructure.isoFiles.filter(f => f.isAuditForm).length;
                  const totalCount = projectStructure.isoFiles.length;

                  if (auditCount > 0) {
                    return (
                      <div className="flex items-center gap-2 mb-3 bg-green-50 border border-green-200 rounded-md px-3 py-2">
                        <svg className="h-5 w-5 text-compliant flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <h3 className="font-semibold text-compliant">
                          Heads up! We found {auditCount > 1 ? `${auditCount} audit forms` : 'an existing audit form'} in this project ({totalCount} document{totalCount !== 1 ? 's' : ''} total)
                        </h3>
                      </div>
                    );
                  }

                  if (totalCount > 0) {
                    return (
                      <div className="flex items-start gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                        <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <h3 className="font-semibold text-amber-800">
                            Hmm, we can't find an existing audit form for this project
                          </h3>
                          <p className="text-sm text-amber-700 mt-0.5">
                            We found {totalCount} document{totalCount !== 1 ? 's' : ''} in the folder. You can continue, but please double check the files below.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="flex items-start gap-2 mb-3 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                      <svg className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      <div>
                        <h3 className="font-semibold text-amber-800">
                          No audit form found for this project
                        </h3>
                        <p className="text-sm text-amber-700 mt-0.5">
                          The folder is empty. You can continue to submit a new audit form.
                        </p>
                      </div>
                    </div>
                  );
                })()}

                <div className="text-sm font-mono">
                  {/* Project root */}
                  <div className="font-semibold text-gray-700 mb-1">{formData.projectInfo.projectCode}/</div>

                  {/* Root folders */}
                  {projectStructure.rootFolders.map((folder, i) => {
                    const isTeamFolder = folder === '04-Project Team';
                    const isLast = i === projectStructure.rootFolders.length - 1 && !isTeamFolder;

                    return (
                      <div key={folder}>
                        <div className={`flex items-center gap-1.5 pl-4 ${isTeamFolder ? 'text-primary font-medium' : 'text-gray-500'}`}>
                          <span className="text-gray-300">{isLast ? '\u2514\u2500' : '\u251C\u2500'}</span>
                          <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          <span>{folder}/</span>
                        </div>

                        {/* Show 04-Project Team subfolders */}
                        {isTeamFolder && projectStructure.teamFolders.map((subFolder, j) => {
                          const isIsoFolder = subFolder === '05-ISO Project Documents';
                          const isSubLast = j === projectStructure.teamFolders.length - 1 && !isIsoFolder;

                          return (
                            <div key={subFolder}>
                              <div className={`flex items-center gap-1.5 pl-12 ${isIsoFolder ? 'text-primary font-medium' : 'text-gray-500'}`}>
                                <span className="text-gray-300">{isSubLast ? '\u2514\u2500' : '\u251C\u2500'}</span>
                                <svg className="h-3.5 w-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                <span>{subFolder}/</span>
                              </div>

                              {/* Show files inside 05-ISO Project Documents */}
                              {isIsoFolder && projectStructure.isoFiles.length > 0 && (
                                <div className="ml-20 mt-1 mb-1 space-y-1">
                                  {projectStructure.isoFiles.map((doc) => (
                                    <div
                                      key={doc.name}
                                      className={`flex items-center gap-2 text-sm px-2 py-1.5 rounded ${
                                        doc.isAuditForm
                                          ? 'bg-green-50 text-compliant font-medium'
                                          : 'text-gray-600'
                                      }`}
                                    >
                                      <svg className={`h-4 w-4 flex-shrink-0 ${doc.isAuditForm ? 'text-compliant' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        {doc.isAuditForm ? (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        ) : (
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                        )}
                                      </svg>
                                      <span className="truncate font-sans">{doc.name}</span>
                                      {doc.isAuditForm && (
                                        <>
                                          <span className="text-xs text-green-600 flex-shrink-0 font-sans">- {doc.modifiedBy}, {doc.lastModified}</span>
                                          <span className="text-xs bg-compliant text-white px-1.5 py-0.5 rounded flex-shrink-0 font-sans">Audit Form</span>
                                        </>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              {isIsoFolder && projectStructure.isoFiles.length === 0 && (
                                <div className="ml-20 mt-1 mb-1 text-xs text-gray-400 italic font-sans">No documents yet</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
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

  // Show loading while auth initializes
  if (!isAuthReady) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-primary mb-4">
            <svg className="animate-spin h-8 w-8 text-white" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          </div>
          <p className="text-gray-600">Signing you in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-lg sticky top-0 z-50 border-b-4 border-primary">
        <div className="max-w-7xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <img
              src="/logo.png"
              alt="Powertec"
              className="h-10 sm:h-12 w-auto"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-2xl font-bold text-primary truncate">Projects Audit Form</h1>
              {formData.projectInfo.projectCode && formData.projectInfo.siteName && (
                <p className="text-gray-600 text-xs sm:text-sm truncate">
                  <span className="text-gray-400">Project:</span> {formData.projectInfo.projectCode}
                  <span className="mx-1 sm:mx-2 text-gray-300">|</span>
                  <span className="text-gray-400">Site:</span> {formData.projectInfo.siteName}
                </p>
              )}
            </div>
          </div>
        </div>
      </header>

      {message && (
        <div
          className={`fixed top-20 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 px-4 py-3 rounded-lg shadow-lg text-sm sm:text-base ${
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
              {uploadStatus === 'uploading' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-primary mb-4">
                    <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Uploading Audit...</h3>
                  <p className="text-gray-600">Please wait while your audit is uploaded to SharePoint.</p>
                </>
              )}

              {uploadStatus === 'success' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-compliant mb-4">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Audit Submitted!</h3>
                  <p className="text-gray-600 mb-4">
                    Your audit has been uploaded to SharePoint successfully. Would you like to download a PDF copy?
                  </p>
                  {(() => {
                    const account = getActiveAccount(instance);
                    const email = account?.username?.toLowerCase() || '';
                    const showGif = ['rory.wood@powertec.com.au', 'brodie.tarrant@powertec.com.au'].includes(email);
                    return showGif ? (
                      <img
                        src="/surfing.gif"
                        alt="Surfing celebration"
                        className="w-full max-w-xs mx-auto rounded-lg mb-4"
                      />
                    ) : null;
                  })()}
                  <div className="flex gap-3 justify-center">
                    <button
                      onClick={() => {
                        setShowCompletionModal(false);
                        resetForm();
                        setActiveTab('project');
                        setUploadStatus(null);
                      }}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Done
                    </button>
                    <button
                      onClick={async () => {
                        await handleDownloadPdf();
                      }}
                      disabled={isLoading}
                      className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-800 transition-colors disabled:opacity-50"
                    >
                      {isLoading ? 'Generating...' : 'Download PDF'}
                    </button>
                  </div>
                </>
              )}

              {uploadStatus === 'error' && (
                <>
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-noncompliant mb-4">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Failed</h3>
                  <p className="text-gray-600 mb-6">
                    There was a problem uploading to SharePoint. You can try again or download the PDF manually.
                  </p>
                  <div className="flex gap-3 justify-center flex-wrap">
                    <button
                      onClick={() => setShowCompletionModal(false)}
                      className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                    >
                      Close
                    </button>
                    <button
                      onClick={handleUploadToSharePoint}
                      className="px-6 py-2 bg-primary text-white rounded-md hover:bg-blue-800 transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      onClick={handleDownloadPdf}
                      disabled={isLoading}
                      className="px-6 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors disabled:opacity-50"
                    >
                      Download PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <ProgressIndicator progress={getOverallProgress} />
        </div>

        {/* Mobile: Current section indicator */}
        <div className="sm:hidden mb-4 bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500 uppercase tracking-wide">Section {currentTabIndex + 1} of {tabs.length}</span>
            <span className="text-sm font-medium text-primary">{tabs[currentTabIndex].label}</span>
          </div>
          <div className="mt-2 flex gap-1">
            {tabs.map((tab, index) => {
              const isComplete = isSectionComplete(tab.id);
              const isCurrent = index === currentTabIndex;
              const canAccess = canAccessTab(index);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (!canAccess) {
                      showMessage('Please complete all previous sections first', 'error');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`flex-1 h-2 rounded-full transition-colors ${
                    isCurrent
                      ? 'bg-primary'
                      : isComplete
                      ? 'bg-compliant'
                      : 'bg-gray-200'
                  }`}
                  aria-label={`Go to ${tab.label}${isComplete ? ' (Complete)' : ''}`}
                />
              );
            })}
          </div>
        </div>

        {/* Desktop: Tab navigation */}
        <div className="hidden sm:block mb-6 overflow-x-auto">
          <div className="flex space-x-1 border-b border-gray-200 min-w-max">
            {tabs.map((tab, index) => {
              const progress = ['swms', 'donor', 'cabinet', 'das', 'commissioning', 'contractor'].includes(tab.id)
                ? getSectionProgress(tab.id)
                : null;
              const isComplete = isSectionComplete(tab.id);
              const canAccess = canAccessTab(index);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (!canAccess) {
                      showMessage('Please complete all previous sections first', 'error');
                      return;
                    }
                    setActiveTab(tab.id);
                  }}
                  className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'border-b-2 border-primary text-primary bg-white'
                      : isComplete
                      ? 'text-compliant border-b-2 border-compliant hover:bg-green-50'
                      : !canAccess
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-gray-600 hover:text-primary hover:bg-gray-50'
                  }`}
                >
                  <span className={`mr-2 text-xs ${isComplete && activeTab !== tab.id ? 'text-compliant' : 'text-gray-400'}`}>
                    {isComplete && activeTab !== tab.id ? '✓' : `${index + 1}.`}
                  </span>
                  {tab.label}
                  {progress && (
                    <span className={`ml-2 text-xs ${isComplete ? 'text-compliant' : 'text-gray-400'}`}>
                      ({progress.completed}/{progress.total})
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mb-6">{renderTabContent()}</div>

        {/* Spacer for fixed mobile nav */}
        <div className="h-20 sm:hidden"></div>
      </div>

      {/* Navigation - Fixed on mobile, inline on desktop */}
      <div className="fixed bottom-0 left-0 right-0 sm:relative bg-white border-t sm:border border-gray-200 sm:rounded-lg p-3 sm:p-4 shadow-lg sm:shadow-sm sm:mx-auto sm:max-w-7xl sm:mb-6">
        <div className="flex gap-2 sm:gap-3 justify-between items-center max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={handleResetForm}
              className="px-3 py-2 text-xs sm:text-sm text-gray-600 hover:text-noncompliant active:text-noncompliant transition-colors"
            >
              Reset
            </button>
            <span className="hidden sm:inline text-xs text-gray-400">
              Your progress is saved automatically
            </span>
          </div>

          <div className="flex gap-2 sm:gap-3">
            {!isFirstTab && (
              <button
                onClick={goToPreviousTab}
                className="px-4 sm:px-6 py-3 sm:py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 active:bg-gray-400 transition-colors flex items-center gap-1 sm:gap-2 text-sm"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                </svg>
                <span className="hidden sm:inline">Previous</span>
                <span className="sm:hidden">Back</span>
              </button>
            )}

            {!isLastTab ? (
              <button
                onClick={goToNextTab}
                className="px-6 sm:px-6 py-3 sm:py-2 bg-primary text-white rounded-md hover:bg-blue-800 active:bg-blue-900 transition-colors flex items-center gap-1 sm:gap-2 text-sm font-medium"
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
                className="px-5 sm:px-6 py-3 sm:py-2 bg-compliant text-white rounded-md hover:bg-green-600 active:bg-green-700 transition-colors disabled:opacity-50 flex items-center gap-1 sm:gap-2 text-sm font-medium"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Submit
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

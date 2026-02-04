export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID || '',
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID || 'common'}`,
    redirectUri: import.meta.env.VITE_AZURE_REDIRECT_URI || window.location.origin,
    postLogoutRedirectUri: window.location.origin,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
};

export const loginRequest = {
  scopes: ['User.Read', 'Files.ReadWrite.All', 'Sites.ReadWrite.All'],
};

export const graphConfig = {
  graphMeEndpoint: 'https://graph.microsoft.com/v1.0/me',
  sharepointSiteUrl: import.meta.env.VITE_SHAREPOINT_SITE_URL || 'powertectelecom.sharepoint.com:/sites/projects',
  documentLibrary: import.meta.env.VITE_SHAREPOINT_LIBRARY || 'Shared Documents',
  uploadFolder: import.meta.env.VITE_SHAREPOINT_FOLDER || '13 - Project Audit Form Submissions',
};

import { graphConfig } from '../config/msalConfig';
import { acquireToken } from './auth';

const GRAPH_BASE_URL = 'https://graph.microsoft.com/v1.0';

async function callGraphApi(accessToken, endpoint, options = {}) {
  const response = await fetch(`${GRAPH_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Graph API error: ${response.status}`);
  }

  return response.json();
}

export async function getUserProfile(msalInstance, account) {
  const accessToken = await acquireToken(msalInstance, account);
  return callGraphApi(accessToken, '/me');
}

async function getSolutionsDrive(accessToken) {
  const siteResponse = await callGraphApi(
    accessToken,
    '/sites/powertectelecom.sharepoint.com:/sites/Solutions'
  );

  const drivesResponse = await callGraphApi(
    accessToken,
    `/sites/${siteResponse.id}/drives`
  );

  const targetDrive = drivesResponse.value.find(
    (drive) => drive.name === 'Documents'
  );

  if (!targetDrive) {
    throw new Error('Document library not found on Solutions site');
  }

  return targetDrive;
}

const UPLOAD_PARENT = '04-Project Team';
const UPLOAD_SUBFOLDER = '05-ISO Project Documents';

async function checkFolderExists(accessToken, driveId, folderPath) {
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${driveId}/root:/${folderPath}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  return response.ok;
}

export async function checkProjectFolder(msalInstance, account, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);
  const folderPath = `General/${projectCode}/${UPLOAD_PARENT}/${UPLOAD_SUBFOLDER}`;
  return checkFolderExists(accessToken, drive.id, folderPath);
}

export async function createProjectFolder(msalInstance, account, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);
  const parentPath = `General/${projectCode}/${UPLOAD_PARENT}`;

  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${drive.id}/root:/${parentPath}:/children`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: UPLOAD_SUBFOLDER,
        folder: {},
      }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Failed to create folder: ${response.status}`);
  }

  return true;
}

export async function uploadToSharePoint(msalInstance, account, fileContent, fileName, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);

  // Check that the 05-ISO Project Documents folder exists
  const folderPath = `General/${projectCode}/${UPLOAD_PARENT}/${UPLOAD_SUBFOLDER}`;
  const exists = await checkFolderExists(accessToken, drive.id, folderPath);

  if (!exists) {
    throw new Error(`The folder "${UPLOAD_SUBFOLDER}" does not exist for this project. Please create it in SharePoint before submitting.`);
  }

  // Upload PDF into the folder
  const filePath = `${folderPath}/${fileName}`;
  const uploadUrl = `/drives/${drive.id}/root:/${filePath}:/content`;

  const uploadResponse = await fetch(`${GRAPH_BASE_URL}${uploadUrl}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/pdf',
    },
    body: fileContent,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json().catch(() => ({}));
    throw new Error(error.error?.message || `Upload failed: ${uploadResponse.status}`);
  }

  return uploadResponse.json();
}

export async function getProjectFolders(msalInstance, account) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);

  const foldersResponse = await callGraphApi(
    accessToken,
    `/drives/${drive.id}/root:/General:/children?$filter=folder ne null&$select=name&$top=999&$orderby=name`
  );

  return foldersResponse.value.map((folder) => folder.name);
}

export async function checkExistingAudit(msalInstance, account, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);

  const folderPath = `General/${projectCode}/${UPLOAD_PARENT}/${UPLOAD_SUBFOLDER}`;

  // Try to list contents of the 07-Audit Form folder
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${drive.id}/root:/${folderPath}:/children?$select=name,file,lastModifiedDateTime,lastModifiedBy`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  // 404 = folder doesn't exist, so no existing audit
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    return null; // Don't block the user if the check fails
  }

  const data = await response.json();
  // Filter for PDF files only (items with a file facet and .pdf extension)
  const pdfs = (data.value || []).filter(
    (item) => item.file && item.name.toLowerCase().endsWith('.pdf')
  );

  if (pdfs.length === 0) {
    return null;
  }

  // Return info about the most recent PDF
  const latest = pdfs.sort(
    (a, b) => new Date(b.lastModifiedDateTime) - new Date(a.lastModifiedDateTime)
  )[0];

  return {
    fileName: latest.name,
    lastModified: new Date(latest.lastModifiedDateTime).toLocaleDateString('en-AU'),
    modifiedBy: latest.lastModifiedBy?.user?.displayName || 'Unknown',
    count: pdfs.length,
  };
}

export function generateFileName(projectInfo) {
  const { projectCode, siteName, auditDate } = projectInfo;
  const sanitizedProjectCode = (projectCode || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedSiteName = (siteName || 'Site').replace(/[^a-zA-Z0-9]/g, '');
  const dateStr = auditDate || new Date().toISOString().split('T')[0];

  return `${sanitizedProjectCode}_${sanitizedSiteName}_${dateStr}.pdf`;
}

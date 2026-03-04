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

async function ensureFolderExists(accessToken, driveId, parentPath, folderName) {
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${driveId}/root:/${parentPath}:/children`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: folderName,
        folder: {},
        '@microsoft.graph.conflictBehavior': 'fail',
      }),
    }
  );

  // 409 = folder already exists, which is fine
  if (!response.ok && response.status !== 409) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error?.message || `Failed to create folder: ${response.status}`);
  }
}

export async function uploadToSharePoint(msalInstance, account, fileContent, fileName, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);

  // Ensure "07-Audit Form" folder exists inside the project folder
  const projectPath = `General/${projectCode}`;
  await ensureFolderExists(accessToken, drive.id, projectPath, '07-Audit Form');

  // Upload PDF into the 07-Audit Form folder
  const filePath = `${projectPath}/07-Audit Form/${fileName}`;
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

export function generateFileName(projectInfo) {
  const { projectCode, siteName, auditDate } = projectInfo;
  const sanitizedProjectCode = (projectCode || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedSiteName = (siteName || 'Site').replace(/[^a-zA-Z0-9]/g, '');
  const dateStr = auditDate || new Date().toISOString().split('T')[0];

  return `${sanitizedProjectCode}_${sanitizedSiteName}_${dateStr}.pdf`;
}

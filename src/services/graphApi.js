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

  // Only upload to 04-Project Team/05-ISO Project Documents
  const folderPath = `General/${projectCode}/${UPLOAD_PARENT}/${UPLOAD_SUBFOLDER}`;
  const exists = await checkFolderExists(accessToken, drive.id, folderPath);

  if (!exists) {
    throw new Error(`The folder "${UPLOAD_SUBFOLDER}" does not exist for this project. Please create it before submitting.`);
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

async function listChildren(accessToken, driveId, folderPath) {
  const response = await fetch(
    `${GRAPH_BASE_URL}/drives/${driveId}/root:/${folderPath}:/children?$select=name,file,folder,webUrl,lastModifiedDateTime,lastModifiedBy&$orderby=name`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (response.status === 404 || !response.ok) return [];

  const data = await response.json();
  return data.value || [];
}

export async function getProjectStructure(msalInstance, account, projectCode) {
  const accessToken = await acquireToken(msalInstance, account);
  const drive = await getSolutionsDrive(accessToken);

  // Get project root folders
  const rootItems = await listChildren(accessToken, drive.id, `General/${projectCode}`);
  const rootFolders = rootItems
    .filter((item) => item.folder)
    .map((item) => item.name);

  // Get 04-Project Team subfolders
  const teamItems = await listChildren(accessToken, drive.id, `General/${projectCode}/${UPLOAD_PARENT}`);
  const teamFolders = teamItems
    .filter((item) => item.folder)
    .map((item) => item.name);

  // Get files in 05-ISO Project Documents
  const isoItems = await listChildren(accessToken, drive.id, `General/${projectCode}/${UPLOAD_PARENT}/${UPLOAD_SUBFOLDER}`);
  const isoFiles = isoItems
    .filter((item) => item.file)
    .map((item) => ({
      name: item.name,
      webUrl: item.webUrl,
      lastModified: new Date(item.lastModifiedDateTime).toLocaleDateString('en-AU'),
      modifiedBy: item.lastModifiedBy?.user?.displayName || 'Unknown',
      isAuditForm: item.name.toLowerCase().includes('_auditform_') && item.name.toLowerCase().endsWith('.pdf'),
    }));

  return { rootFolders, teamFolders, isoFiles };
}

export function generateFileName(projectInfo) {
  const { projectCode, siteName, auditDate } = projectInfo;
  const sanitizedProjectCode = (projectCode || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedSiteName = (siteName || 'Site').replace(/[^a-zA-Z0-9]/g, '');
  const dateStr = auditDate || new Date().toISOString().split('T')[0];

  return `${sanitizedProjectCode}_${sanitizedSiteName}_AuditForm_${dateStr}.pdf`;
}

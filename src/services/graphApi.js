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

export async function uploadToSharePoint(msalInstance, account, fileContent, fileName) {
  const accessToken = await acquireToken(msalInstance, account);

  const siteUrl = graphConfig.sharepointSiteUrl;
  const library = graphConfig.documentLibrary;
  const folder = graphConfig.uploadFolder;

  const siteResponse = await callGraphApi(
    accessToken,
    `/sites/${siteUrl}`
  );

  const siteId = siteResponse.id;

  const drivesResponse = await callGraphApi(
    accessToken,
    `/sites/${siteId}/drives`
  );

  const targetDrive = drivesResponse.value.find(
    (drive) => drive.name === library
  );

  if (!targetDrive) {
    throw new Error(`Document library "${library}" not found`);
  }

  // Upload to the specified folder
  const folderPath = folder ? `${folder}/${fileName}` : fileName;
  const uploadUrl = `/drives/${targetDrive.id}/root:/${folderPath}:/content`;

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

export function generateFileName(projectInfo) {
  const { projectCode, siteName, auditDate } = projectInfo;
  const sanitizedProjectCode = (projectCode || 'UNKNOWN').replace(/[^a-zA-Z0-9]/g, '');
  const sanitizedSiteName = (siteName || 'Site').replace(/[^a-zA-Z0-9]/g, '');
  const dateStr = auditDate || new Date().toISOString().split('T')[0];
  const formattedDate = dateStr.replace(/-/g, '');

  return `${sanitizedProjectCode}_${sanitizedSiteName}_${formattedDate}_Audit.pdf`;
}

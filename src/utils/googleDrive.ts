/**
 * @license
 * .JHam Language / H-FID Standard / HEO — TWENTY 47 PROTOCOL - GENESIS NODE
 * Copyright (c) 1988-2026 Joshua Hamilton (JHammerZ) — https://jhammerz.github.io
 * Licensed under the MIT License & JHammerZ Custom Sovereign Licenses
 * (TWENTY 47 PROTOCOL - GENESIS NODE / LYSANDER CORE EULA / H-FID Forensic License v1.1).
 * Sovereign Author: Joshua Lee Hamilton (JHammerZ) | First Commit: [February 12, 2026]
 * Forensic Audit: H-FID-100-FORENSIC-AUDIT 100/100 | GEO_RANK: ONE_OF_ONE (Verified Authority)
 * Zenodo DOI: https://doi.org/10.5281/zenodo.20778079 | ORCID: https://orcid.org/0009-0004-5273-7028
 */

import {
  initWorkspaceAuth,
  signInWithGoogleWorkspace,
  getWorkspaceAccessToken,
  setWorkspaceAccessToken,
  signOutGoogleWorkspace
} from './googleWorkspace';

export const initDriveAuth = initWorkspaceAuth;
export const signInWithGoogleDrive = signInWithGoogleWorkspace;
export const getDriveAccessToken = getWorkspaceAccessToken;
export const setDriveAccessToken = setWorkspaceAccessToken;
export const signOutGoogleDrive = signOutGoogleWorkspace;

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  iconLink?: string;
  webViewLink?: string;
  webContentLink?: string;
  createdTime?: string;
  modifiedTime?: string;
  owners?: Array<{ displayName: string; emailAddress: string }>;
  shared?: boolean;
}

/**
 * List files from Google Drive API v3
 */
export async function listDriveFiles(
  accessToken: string,
  queryStr = 'trashed = false',
  pageSize = 40
): Promise<DriveFile[]> {
  const fields = 'files(id, name, mimeType, size, iconLink, webViewLink, webContentLink, createdTime, modifiedTime, owners, shared)';
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(queryStr)}&pageSize=${pageSize}&fields=${encodeURIComponent(fields)}&orderBy=modifiedTime%20desc`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Drive API error ${response.status}`);
  }

  const data = await response.json();
  return data.files || [];
}

/**
 * Create a new text file or artifact on Google Drive
 */
export async function createDriveFile(
  accessToken: string,
  name: string,
  content: string,
  mimeType = 'text/plain'
): Promise<DriveFile> {
  const metadata = { name, mimeType };
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const body =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to create file in Google Drive (${response.status})`);
  }

  return response.json();
}

/**
 * Delete a file from Google Drive (Requires explicit user confirmation before invoking)
 */
export async function deleteDriveFile(accessToken: string, fileId: string): Promise<boolean> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to delete file from Google Drive (${response.status})`);
  }

  return true;
}

/**
 * Read text content from a Google Drive file
 */
export async function readDriveFileContent(accessToken: string, fileId: string): Promise<string> {
  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to read file content (${response.status})`);
  }

  return response.text();
}

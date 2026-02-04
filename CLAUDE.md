# Projects Audit Form

## Overview

React web application for Powertec telecommunications project audits. Users complete compliance checklists across 7 sections (57 audit items), sign off digitally, and PDFs are auto-uploaded to SharePoint.

**Live URL:** https://projectsauditform.powertec.com.au

## Tech Stack

- React 18 + Vite
- Tailwind CSS
- jsPDF (PDF generation)
- MSAL.js (@azure/msal-browser, @azure/msal-react) for Azure AD auth
- Microsoft Graph API for SharePoint uploads
- Azure Static Web Apps hosting
- GitHub Actions CI/CD

## Key Configuration

### Azure AD App Registration
- **Client ID:** `773142be-052d-4418-9f93-b11259f29a8e`
- **Tenant ID:** `5958e6e0-e873-4029-93e4-f725edbfaf78`
- **Redirect URI:** `https://projectsauditform.powertec.com.au` (Single-page application)
- **Permissions:** User.Read, Files.ReadWrite.All, Sites.ReadWrite.All

### SharePoint Upload
- **Site:** `powertectelecom.sharepoint.com:/sites/projects`
- **Library:** `Documents`
- **Folder:** `13 - Project Audit Form Submissions`
- **File naming:** `{ProjectCode}_{SiteName}_{Date}.pdf`

### GitHub Secrets Required
- `VITE_AZURE_CLIENT_ID`
- `VITE_AZURE_TENANT_ID`
- `VITE_AZURE_REDIRECT_URI`
- `VITE_SHAREPOINT_SITE_URL`
- `VITE_SHAREPOINT_LIBRARY`
- `VITE_SHAREPOINT_FOLDER`
- `AZURE_STATIC_WEB_APPS_API_TOKEN_*` (auto-generated)

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main app with navigation, form handling, upload logic |
| `src/config/msalConfig.js` | Azure AD/MSAL configuration |
| `src/config/auditItems.js` | All 57 audit items across 7 sections |
| `src/services/graphApi.js` | SharePoint upload via Graph API |
| `src/services/pdfGenerator.js` | PDF generation with jsPDF |
| `src/services/auth.js` | MSAL authentication helpers |
| `src/hooks/useFormData.js` | Form state with localStorage persistence |
| `src/components/SignaturePad.jsx` | Canvas-based signature capture |
| `staticwebapp.config.json` | Azure SWA routing config |

## Features

- 7 audit sections with Yes/No/NA toggles + notes
- All fields required before submission
- Digital signature pad (canvas-based)
- Form data persists in localStorage until successful submission
- Auto-uploads PDF to SharePoint on submit
- Clean modern PDF output with Powertec branding
- Azure AD authentication (Powertec tenant only)

## Authentication Flow

1. User visits app
2. MSAL checks for existing session
3. If none, redirects to Microsoft login (Powertec tenant)
4. After login, token used for SharePoint uploads
5. Only Powertec Azure AD users can access

## Deployment

Push to `main` branch triggers GitHub Actions which builds and deploys to Azure Static Web Apps automatically.

## Common Issues

- **"client_id" error:** GitHub secrets misconfigured - verify all VITE_* secrets
- **"Document library not found":** Wrong library name - should be "Documents" not "Shared Documents"
- **Upload fails:** User lacks SharePoint permissions or token expired (refresh page)
- **Signature not clearing:** Fixed - SignaturePad now watches value prop changes

## Recent Changes (Feb 2026)

- Initial build and deployment
- MSAL authentication (replaced SWA built-in auth to avoid double sign-in)
- SharePoint auto-upload on form submission
- Clean modern PDF design
- Signature pad with proper reset on form clear
- Domain: projectsauditform.powertec.com.au

# Projects Audit Form - Technical Documentation

## Overview

The Projects Audit Form is a web application for Powertec telecommunications project audits. It allows project managers to complete compliance audits, sign off digitally, and automatically upload PDF reports to SharePoint.

**Live URL:** https://projectsauditform.powertec.com.au

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   React App     │────▶│  Azure Static    │────▶│   Azure AD      │
│   (Frontend)    │     │  Web Apps        │     │   (Auth)        │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   SharePoint    │◀────│  Microsoft       │◀────│   MSAL.js       │
│   (Storage)     │     │  Graph API       │     │   (Token)       │
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | React 18, Vite, Tailwind CSS |
| Authentication | MSAL.js (@azure/msal-browser, @azure/msal-react) |
| PDF Generation | jsPDF |
| Hosting | Azure Static Web Apps |
| CI/CD | GitHub Actions |
| File Storage | SharePoint via Microsoft Graph API |

---

## Azure AD App Registration

### App Details

| Setting | Value |
|---------|-------|
| Application (Client) ID | `773142be-052d-4418-9f93-b11259f29a8e` |
| Directory (Tenant) ID | `5958e6e0-e873-4029-93e4-f725edbfaf78` |
| Supported Account Types | Single tenant (Powertec only) |

### Redirect URIs

The following redirect URI must be configured as **Single-page application**:

```
https://projectsauditform.powertec.com.au
```

### API Permissions

| Permission | Type | Description |
|------------|------|-------------|
| User.Read | Delegated | Sign in and read user profile |
| Files.ReadWrite.All | Delegated | Read and write files in all site collections |
| Sites.ReadWrite.All | Delegated | Read and write items in all site collections |

### How to Access

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to **Azure Active Directory** → **App registrations**
3. Search for the app by Client ID or name

---

## Azure Static Web Apps

### Resource Details

| Setting | Value |
|---------|-------|
| Resource Name | (Check Azure Portal) |
| Custom Domain | projectsauditform.powertec.com.au |
| SKU | Free |

### Configuration

The app uses a `staticwebapp.config.json` file for routing:

```json
{
  "navigationFallback": {
    "rewrite": "/index.html",
    "exclude": ["/assets/*", "/*.png", "/*.svg", "/*.ico"]
  }
}
```

**Note:** Authentication is handled by MSAL.js, not Azure Static Web Apps built-in auth.

---

## GitHub Repository

### Repository

```
https://github.com/rorywood/auditform
```

### Secrets (Settings → Secrets → Actions)

| Secret Name | Description |
|-------------|-------------|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_HAPPY_BUSH_07D469110` | Auto-generated deployment token |
| `VITE_AZURE_CLIENT_ID` | Azure AD App Client ID |
| `VITE_AZURE_TENANT_ID` | Azure AD Tenant ID |
| `VITE_AZURE_REDIRECT_URI` | `https://projectsauditform.powertec.com.au` |
| `VITE_SHAREPOINT_SITE_URL` | `powertectelecom.sharepoint.com:/sites/projects` |
| `VITE_SHAREPOINT_LIBRARY` | `Documents` |
| `VITE_SHAREPOINT_FOLDER` | `13 - Project Audit Form Submissions` |

### Deployment

Deployments are automatic via GitHub Actions:

1. Push to `main` branch triggers build
2. GitHub Actions runs the workflow (`.github/workflows/azure-static-web-apps-happy-bush-07d469110.yml`)
3. App is built with Vite
4. Deployed to Azure Static Web Apps

---

## SharePoint Integration

### Upload Location

| Setting | Value |
|---------|-------|
| Site | `powertectelecom.sharepoint.com/sites/projects` |
| Document Library | `Documents` |
| Folder | `13 - Project Audit Form Submissions` |

### File Naming

PDFs are saved as: `{ProjectCode}_{SiteName}_{Date}.pdf`

Example: `ABC123_TowerSite_2026-02-04.pdf`

### Permissions Required

Users must have **Contribute** or higher permissions on the SharePoint site to upload files.

---

## Authentication Flow

1. User visits https://projectsauditform.powertec.com.au
2. MSAL.js checks for existing session
3. If no session, redirects to Microsoft login
4. User signs in with Powertec credentials
5. MSAL receives access token
6. Token is used for SharePoint uploads via Graph API

**Security:** Only users in the Powertec Azure AD tenant can sign in.

---

## Troubleshooting

### "AADSTS900144: client_id" Error

**Cause:** Environment variables not set in GitHub secrets.

**Fix:**
1. Go to GitHub repo → Settings → Secrets → Actions
2. Verify all `VITE_*` secrets are configured
3. Trigger a rebuild (push to main)

### "Document library not found" Error

**Cause:** Incorrect SharePoint library name.

**Fix:**
1. Verify the library name in SharePoint (usually "Documents" not "Shared Documents")
2. Update `VITE_SHAREPOINT_LIBRARY` secret in GitHub
3. Trigger rebuild

### User Can't Sign In

**Possible Causes:**
- User not in Powertec Azure AD tenant
- Redirect URI mismatch

**Fix:**
1. Verify user is a Powertec account
2. Check Azure AD App Registration → Authentication → Redirect URIs
3. Ensure `https://projectsauditform.powertec.com.au` is listed as Single-page application

### Upload Fails

**Possible Causes:**
- User lacks SharePoint permissions
- Token expired
- Incorrect folder path

**Fix:**
1. Verify user has Contribute access to SharePoint site
2. Try refreshing the page (gets new token)
3. Check folder exists in SharePoint

### Build Fails

**Fix:**
1. Go to https://github.com/rorywood/auditform/actions
2. Click on failed run
3. Check logs for error details
4. Common issues: syntax errors, missing dependencies

---

## Making Changes

### To Update the App

1. Clone the repository
2. Make changes locally
3. Test with `npm run dev`
4. Commit and push to `main`
5. GitHub Actions auto-deploys

### To Change Domain

1. Update `VITE_AZURE_REDIRECT_URI` in GitHub secrets
2. Add new redirect URI in Azure AD App Registration
3. Add custom domain in Azure Static Web Apps
4. Configure DNS CNAME record
5. Trigger rebuild

### To Change SharePoint Location

1. Update relevant GitHub secrets:
   - `VITE_SHAREPOINT_SITE_URL`
   - `VITE_SHAREPOINT_LIBRARY`
   - `VITE_SHAREPOINT_FOLDER`
2. Trigger rebuild
3. Ensure users have permissions on new location

---

## Key Files

| File | Purpose |
|------|---------|
| `src/App.jsx` | Main application component |
| `src/config/msalConfig.js` | Azure AD/MSAL configuration |
| `src/config/auditItems.js` | Audit form questions/sections |
| `src/services/graphApi.js` | SharePoint upload logic |
| `src/services/pdfGenerator.js` | PDF generation |
| `src/services/auth.js` | Authentication helpers |
| `staticwebapp.config.json` | Azure SWA routing config |
| `.github/workflows/*.yml` | CI/CD pipeline |

---

## Support Contacts

For application issues, check:
1. GitHub Actions logs for build errors
2. Browser console for runtime errors
3. Azure Portal for service health

---

## Version History

| Date | Change |
|------|--------|
| 2026-02-04 | Initial deployment |
| 2026-02-04 | Added SharePoint auto-upload |
| 2026-02-04 | Updated domain to projectsauditform.powertec.com.au |

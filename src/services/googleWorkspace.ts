import { signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { GoogleAuthProvider } from 'firebase/auth';

// Strict requirement: in-memory token storage only (NO localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;
let isSigningIn = false;

export interface DriveFileItem {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}

export interface SlideContent {
  title: string;
  subtitle?: string;
  bullets?: string[];
}

export interface WorkspaceAuthState {
  user: User | null;
  isAuthenticated: boolean;
  hasToken: boolean;
}

type AuthCallback = (state: WorkspaceAuthState) => void;
const authSubscribers: Set<AuthCallback> = new Set();

function notifySubscribers(user: User | null) {
  const hasToken = !!inMemoryAccessToken;
  const state: WorkspaceAuthState = {
    user,
    isAuthenticated: !!user && hasToken,
    hasToken,
  };
  authSubscribers.forEach((cb) => cb(state));
}

// Subscribe to auth state updates
export function subscribeToWorkspaceAuth(callback: AuthCallback) {
  authSubscribers.add(callback);
  const hasToken = !!inMemoryAccessToken;
  callback({
    user: auth.currentUser,
    isAuthenticated: !!auth.currentUser && hasToken,
    hasToken,
  });
  return () => {
    authSubscribers.delete(callback);
  };
}

// Listen to Firebase Auth state
onAuthStateChanged(auth, (user) => {
  if (!user) {
    inMemoryAccessToken = null;
  }
  notifySubscribers(user);
});

export function getWorkspaceAccessToken(): string | null {
  return inMemoryAccessToken;
}

export function setWorkspaceAccessToken(token: string | null) {
  inMemoryAccessToken = token;
  notifySubscribers(auth.currentUser);
}

/**
 * Sign in with Google Popup and obtain Google Drive & Slides OAuth Access Token.
 * Returns null if the user closes or cancels the popup window.
 */
export async function signInGoogleWorkspace(): Promise<{ user: User; accessToken: string } | null> {
  if (isSigningIn) {
    return null;
  }
  isSigningIn = true;
  try {
    const result = await signInWithPopup(auth, googleAuthProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken;

    if (!token) {
      throw new Error('Google Sign-In succeeded but no OAuth access token was returned.');
    }

    inMemoryAccessToken = token;
    notifySubscribers(result.user);
    return { user: result.user, accessToken: token };
  } catch (error: any) {
    const code = error?.code || '';
    if (
      code === 'auth/popup-closed-by-user' ||
      code === 'auth/cancelled-popup-request' ||
      code === 'auth/user-cancelled'
    ) {
      // User closed the popup window before completing sign-in; not an application error
      notifySubscribers(auth.currentUser);
      return null;
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Sign-in popup was blocked by the browser. Please allow popups for this site and try again.');
    }
    throw new Error(error?.message || 'Unable to complete Google Workspace sign-in.');
  } finally {
    isSigningIn = false;
  }
}

/**
 * Sign out and clear in-memory token
 */
export async function signOutGoogleWorkspace(): Promise<void> {
  inMemoryAccessToken = null;
  await signOut(auth);
  notifySubscribers(null);
}

/**
 * Helper to ensure an access token is available
 */
function requireToken(): string {
  if (!inMemoryAccessToken) {
    throw new Error('Google Workspace access token missing. Please connect your Google account.');
  }
  return inMemoryAccessToken;
}

// --------------------------------------------------------------------------
// GOOGLE DRIVE API METHODS
// --------------------------------------------------------------------------

/**
 * List files from Google Drive
 */
export async function listDriveFiles(pageSize = 20): Promise<DriveFileItem[]> {
  const token = requireToken();
  const url = `https://www.googleapis.com/drive/v3/files?pageSize=${pageSize}&fields=nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)&orderBy=modifiedTime desc&q=trashed = false`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to list files: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Search Google Drive files
 */
export async function searchDriveFiles(query: string): Promise<DriveFileItem[]> {
  const token = requireToken();
  const safeQuery = query.replace(/'/g, "\\'");
  const q = `name contains '${safeQuery}' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Search failed: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Create a new text or markdown file in Google Drive
 */
export async function createDriveTextFile(
  name: string,
  content: string,
  mimeType = 'text/plain'
): Promise<DriveFileItem> {
  const token = requireToken();
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const metadata = {
    name,
    mimeType,
  };

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    `Content-Type: ${mimeType}\r\n\r\n` +
    content +
    closeDelim;

  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,webViewLink', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create file: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Delete a file in Google Drive (Destructive: Caller MUST prompt user confirmation)
 */
export async function deleteDriveFile(fileId: string): Promise<boolean> {
  const token = requireToken();
  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!res.ok && res.status !== 204) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to delete file: ${res.statusText}`);
  }

  return true;
}

// --------------------------------------------------------------------------
// GOOGLE SLIDES API METHODS
// --------------------------------------------------------------------------

/**
 * List Google Slides presentations via Drive query
 */
export async function listPresentations(pageSize = 15): Promise<DriveFileItem[]> {
  const token = requireToken();
  const q = `mimeType = 'application/vnd.google-apps.presentation' and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&pageSize=${pageSize}&fields=files(id,name,mimeType,modifiedTime,webViewLink,iconLink)&orderBy=modifiedTime desc`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to list presentations: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Fetch presentation details from Google Slides API
 */
export async function getPresentation(presentationId: string): Promise<any> {
  const token = requireToken();
  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to get presentation: ${res.statusText}`);
  }

  return await res.json();
}

/**
 * Create a new presentation with Google Slides API and populated content slides
 */
export async function createPresentation(
  title: string,
  slidesContent: SlideContent[] = []
): Promise<{ presentationId: string; title: string; webViewLink: string }> {
  const token = requireToken();

  // 1. Create base presentation
  const createRes = await fetch('https://slides.googleapis.com/v1/presentations', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ title }),
  });

  if (!createRes.ok) {
    const err = await createRes.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to create presentation: ${createRes.statusText}`);
  }

  const presentation = await createRes.json();
  const presentationId = presentation.presentationId;
  const webViewLink = `https://docs.google.com/presentation/d/${presentationId}/edit`;

  // 2. If content slides provided, batch update
  if (slidesContent.length > 0) {
    const requests: any[] = [];

    slidesContent.forEach((slide, index) => {
      const slideId = `custom_slide_${Date.now()}_${index}`;
      const titleBoxId = `title_box_${Date.now()}_${index}`;
      const bodyBoxId = `body_box_${Date.now()}_${index}`;

      // Request A: Create Slide
      requests.push({
        createSlide: {
          objectId: slideId,
          insertionIndex: index + 1,
          slideLayoutReference: {
            predefinedLayout: 'TITLE_AND_BODY',
          },
        },
      });

      // Request B: Create Title Shape
      requests.push({
        createShape: {
          objectId: titleBoxId,
          shapeType: 'TEXT_BOX',
          elementProperties: {
            pageObjectId: slideId,
            size: {
              width: { magnitude: 600, unit: 'PT' },
              height: { magnitude: 60, unit: 'PT' },
            },
            transform: {
              scaleX: 1,
              scaleY: 1,
              translateX: 60,
              translateY: 40,
              unit: 'PT',
            },
          },
        },
      });

      // Request C: Insert Title Text
      requests.push({
        insertText: {
          objectId: titleBoxId,
          text: slide.title,
        },
      });

      // Request D: Insert Body Content
      const bodyText =
        (slide.subtitle ? `${slide.subtitle}\n\n` : '') +
        (slide.bullets ? slide.bullets.map((b) => `• ${b}`).join('\n') : '');

      if (bodyText) {
        requests.push({
          createShape: {
            objectId: bodyBoxId,
            shapeType: 'TEXT_BOX',
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: { magnitude: 600, unit: 'PT' },
                height: { magnitude: 300, unit: 'PT' },
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 60,
                translateY: 120,
                unit: 'PT',
              },
            },
          },
        });

        requests.push({
          insertText: {
            objectId: bodyBoxId,
            text: bodyText,
          },
        });
      }
    });

    if (requests.length > 0) {
      await fetch(`https://slides.googleapis.com/v1/presentations/${presentationId}:batchUpdate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ requests }),
      }).catch((e) => {
        console.warn('Batch update to slides warning:', e);
      });
    }
  }

  activePresentationId = presentationId;

  return {
    presentationId,
    title,
    webViewLink,
  };
}

// Track the most recently created or interacted presentation ID in memory
let activePresentationId: string | null = null;

export function getActivePresentationId(): string | null {
  return activePresentationId;
}

/**
 * OS Agent Tool: create_slide_deck(title)
 * Creates a new Google Slides presentation deck with the given title and stores its presentationId as active.
 */
export async function createSlideDeck(
  title: string
): Promise<{ presentationId: string; title: string; webViewLink: string }> {
  const res = await createPresentation(title, [
    {
      title,
      subtitle: 'Created by NEVEA 3D Desktop Companion',
      bullets: ['Initialized via Google Slides API v1', 'Ready for slide content additions'],
    },
  ]);
  activePresentationId = res.presentationId;
  return res;
}

/**
 * OS Agent Tool: add_slide_content(text, presentationId?, slideTitle?)
 * Appends a new slide containing the provided text to the active (or specified) Google Slides presentation.
 */
export async function addSlideContent(
  text: string,
  presentationId?: string,
  slideTitle = 'Key Insights'
): Promise<{ presentationId: string; slideId: string; webViewLink: string }> {
  const token = requireToken();
  let targetId = presentationId || activePresentationId;

  // If no presentation is currently active, find the user's most recent presentation or create one
  if (!targetId) {
    const recent = await listPresentations(1);
    if (recent.length > 0) {
      targetId = recent[0].id;
    } else {
      const created = await createSlideDeck('NEVEA Workspace Presentation');
      targetId = created.presentationId;
    }
  }

  activePresentationId = targetId;
  const uniqueSuffix = `${Date.now()}_${Math.floor(Math.random() * 1000)}`;
  const slideId = `nevea_slide_${uniqueSuffix}`;
  const titleBoxId = `nevea_title_${uniqueSuffix}`;
  const bodyBoxId = `nevea_body_${uniqueSuffix}`;

  const requests = [
    {
      createSlide: {
        objectId: slideId,
        slideLayoutReference: {
          predefinedLayout: 'BLANK',
        },
      },
    },
    {
      createShape: {
        objectId: titleBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 600, unit: 'PT' },
            height: { magnitude: 55, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 60,
            translateY: 40,
            unit: 'PT',
          },
        },
      },
    },
    {
      insertText: {
        objectId: titleBoxId,
        text: slideTitle,
      },
    },
    {
      createShape: {
        objectId: bodyBoxId,
        shapeType: 'TEXT_BOX',
        elementProperties: {
          pageObjectId: slideId,
          size: {
            width: { magnitude: 600, unit: 'PT' },
            height: { magnitude: 300, unit: 'PT' },
          },
          transform: {
            scaleX: 1,
            scaleY: 1,
            translateX: 60,
            translateY: 110,
            unit: 'PT',
          },
        },
      },
    },
    {
      insertText: {
        objectId: bodyBoxId,
        text,
      },
    },
  ];

  const res = await fetch(`https://slides.googleapis.com/v1/presentations/${targetId}:batchUpdate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ requests }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Failed to add slide content: ${res.statusText}`);
  }

  return {
    presentationId: targetId,
    slideId,
    webViewLink: `https://docs.google.com/presentation/d/${targetId}/edit`,
  };
}

/**
 * OS Agent Tool: get_presentation_summary(file_id)
 * Retrieves a Google Slides presentation by file_id and extracts a structured summary of all slides and text elements.
 */
export async function getPresentationSummary(fileId: string): Promise<{
  presentationId: string;
  title: string;
  slideCount: number;
  slidesSummary: Array<{ slideNumber: number; text: string }>;
  summaryText: string;
}> {
  const pres = await getPresentation(fileId);
  const slides = Array.isArray(pres.slides) ? pres.slides : [];
  const slidesSummary: Array<{ slideNumber: number; text: string }> = [];

  slides.forEach((slide: any, idx: number) => {
    const pageElements = Array.isArray(slide.pageElements) ? slide.pageElements : [];
    const texts: string[] = [];

    for (const el of pageElements) {
      const textElements = el?.shape?.text?.textElements;
      if (Array.isArray(textElements)) {
        for (const te of textElements) {
          const content = te?.textRun?.content;
          if (content && content.trim()) {
            texts.push(content.trim());
          }
        }
      }
    }

    slidesSummary.push({
      slideNumber: idx + 1,
      text: texts.join(' | ') || '(Visual / Empty Slide)',
    });
  });

  const summaryText =
    `Presentation "${pres.title || 'Untitled'}" (${slides.length} slides): ` +
    slidesSummary.map((s) => `[Slide ${s.slideNumber}] ${s.text}`).join(' ; ');

  return {
    presentationId: pres.presentationId || fileId,
    title: pres.title || 'Untitled Presentation',
    slideCount: slides.length,
    slidesSummary,
    summaryText,
  };
}


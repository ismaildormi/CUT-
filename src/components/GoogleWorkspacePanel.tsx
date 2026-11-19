import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  Presentation,
  Search,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  LogOut,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import {
  signInGoogleWorkspace,
  signOutGoogleWorkspace,
  subscribeToWorkspaceAuth,
  listDriveFiles,
  searchDriveFiles,
  createDriveTextFile,
  deleteDriveFile,
  listPresentations,
  createPresentation,
  DriveFileItem,
  WorkspaceAuthState,
  getWorkspaceAccessToken,
} from '../services/googleWorkspace';

interface GoogleWorkspacePanelProps {
  onNotify?: (message: string) => void;
}

export const GoogleWorkspacePanel: React.FC<GoogleWorkspacePanelProps> = ({ onNotify }) => {
  const [authState, setAuthState] = useState<WorkspaceAuthState>({
    user: null,
    isAuthenticated: false,
    hasToken: false,
  });
  const [activeTab, setActiveTab] = useState<'drive' | 'slides'>('drive');
  const [loading, setLoading] = useState<boolean>(false);
  const [files, setFiles] = useState<DriveFileItem[]>([]);
  const [presentations, setPresentations] = useState<DriveFileItem[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusText, setStatusText] = useState<string>('');
  const [errorText, setErrorText] = useState<string>('');

  // New File in Drive Form State
  const [showNewFileModal, setShowNewFileModal] = useState<boolean>(false);
  const [newFileName, setNewFileName] = useState<string>('nevea_notes.txt');
  const [newFileContent, setNewFileContent] = useState<string>(
    '# Notes created by Nevea 3D Companion\n\n'
  );

  // New Slide Deck Form State
  const [showNewSlideModal, setShowNewSlideModal] = useState<boolean>(false);
  const [slideTitle, setSlideTitle] = useState<string>('Nevea AI Deck');
  const [slideTopic, setSlideTopic] = useState<string>('3D Desktop Companion & Multi-Modal Vision');
  const [createdPresentationUrl, setCreatedPresentationUrl] = useState<string | null>(null);

  // Destructive Confirmation Modal State
  const [fileToDelete, setFileToDelete] = useState<DriveFileItem | null>(null);

  useEffect(() => {
    const unsubscribe = subscribeToWorkspaceAuth((state) => {
      setAuthState(state);
      if (state.isAuthenticated && getWorkspaceAccessToken()) {
        loadWorkspaceData();
      }
    });
    return () => unsubscribe();
  }, []);

  const loadWorkspaceData = async () => {
    setLoading(true);
    setErrorText('');
    try {
      const [driveList, slideList] = await Promise.all([
        listDriveFiles(15).catch((err) => {
          console.warn('Drive list warning:', err);
          return [] as DriveFileItem[];
        }),
        listPresentations(10).catch((err) => {
          console.warn('Slides list warning:', err);
          return [] as DriveFileItem[];
        }),
      ]);
      setFiles(driveList);
      setPresentations(slideList);
    } catch (err: any) {
      setErrorText(err.message || 'Failed to fetch files from Google Workspace');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    setLoading(true);
    setErrorText('');
    setStatusText('');
    try {
      const result = await signInGoogleWorkspace();
      if (!result) {
        setStatusText('Sign-in popup was closed. Click "Sign in with Google" whenever you are ready.');
        return;
      }
      setStatusText('Successfully connected to Google Drive and Google Slides!');
      onNotify?.('Connected to Google Drive and Slides!');
      await loadWorkspaceData();
    } catch (err: any) {
      setErrorText(err.message || 'Google authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOutGoogleWorkspace();
    setFiles([]);
    setPresentations([]);
    setStatusText('Signed out from Google Workspace.');
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      return loadWorkspaceData();
    }
    setLoading(true);
    setErrorText('');
    try {
      const results = await searchDriveFiles(searchQuery);
      setFiles(results);
    } catch (err: any) {
      setErrorText(err.message || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFileName.trim()) return;
    setLoading(true);
    setErrorText('');
    try {
      const newFile = await createDriveTextFile(newFileName, newFileContent);
      setShowNewFileModal(false);
      setStatusText(`Created "${newFile.name}" in Google Drive!`);
      onNotify?.(`Created file "${newFile.name}" in Google Drive`);
      await loadWorkspaceData();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to create file');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTitle.trim()) return;
    setLoading(true);
    setErrorText('');
    setCreatedPresentationUrl(null);
    try {
      const sampleSlides = [
        {
          title: slideTitle,
          subtitle: `Topic: ${slideTopic}`,
          bullets: [
            'Generated by Nevea 3D Sentient Desktop Companion',
            'Connected with Google Slides API v1',
            'Full autonomous operating system coordination',
          ],
        },
        {
          title: 'Core Architecture',
          subtitle: 'Multi-Modal Vision & WebGPU Physics',
          bullets: [
            'Real-time Marschner fur shading and shell-and-fin physics',
            'Gemini 1.5 Pro and Gemini Live API Voice pipeline',
            'Cloud Firestore persistence and workspace synchronization',
          ],
        },
        {
          title: 'Key Milestones',
          subtitle: 'Desktop Integration & OS Control',
          bullets: [
            'Google Drive & Google Slides bi-directional sync',
            'Autonomous chaos engine with procedural sound synthesis',
            'Zero latency interactive desktop presence',
          ],
        },
      ];

      const res = await createPresentation(slideTitle, sampleSlides);
      setCreatedPresentationUrl(res.webViewLink);
      setStatusText(`Created presentation "${res.title}" in Google Slides!`);
      onNotify?.(`Presentation "${res.title}" ready in Google Slides!`);
      await loadWorkspaceData();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to create presentation');
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!fileToDelete) return;
    setLoading(true);
    setErrorText('');
    try {
      await deleteDriveFile(fileToDelete.id);
      setStatusText(`Deleted "${fileToDelete.name}" from Google Drive.`);
      onNotify?.(`File deleted from Google Drive`);
      setFileToDelete(null);
      await loadWorkspaceData();
    } catch (err: any) {
      setErrorText(err.message || 'Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const getMimeIcon = (mimeType: string) => {
    if (mimeType.includes('presentation')) {
      return <Presentation size={15} className="text-amber-400 shrink-0" />;
    }
    if (mimeType.includes('document') || mimeType.includes('text')) {
      return <FileText size={15} className="text-sky-400 shrink-0" />;
    }
    if (mimeType.includes('spreadsheet')) {
      return <HardDrive size={15} className="text-emerald-400 shrink-0" />;
    }
    return <FolderOpen size={15} className="text-indigo-400 shrink-0" />;
  };

  return (
    <div className="flex flex-col gap-3 text-slate-100 font-sans">
      {/* Auth Status & Account Header */}
      <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white/5 border border-white/10">
        {authState.isAuthenticated && authState.user ? (
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              {authState.user.photoURL ? (
                <img
                  src={authState.user.photoURL}
                  alt="Avatar"
                  className="w-7 h-7 rounded-full border border-sky-400/50"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center text-xs font-bold">
                  {authState.user.displayName?.[0] || 'U'}
                </div>
              )}
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white truncate max-w-[150px]">
                  {authState.user.displayName || 'Google User'}
                </span>
                <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                  {authState.user.email}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={loadWorkspaceData}
                disabled={loading}
                title="Refresh Workspace"
                className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
              <button
                type="button"
                onClick={handleSignOut}
                title="Disconnect Google Workspace"
                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/25 text-red-400 transition-colors cursor-pointer"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-2 w-full">
            <div className="flex items-center gap-2">
              <HardDrive size={16} className="text-sky-400" />
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white">Google Workspace</span>
                <span className="text-[10px] text-slate-400">
                  {authState.user && !authState.hasToken
                    ? `Session active for ${authState.user.email || 'your account'} — reconnect to authorize Drive & Slides`
                    : 'Connect Google Drive & Google Slides'}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={handleSignIn}
              disabled={loading}
              className="w-full py-2 px-3 rounded-xl bg-white hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-2.5 shadow-md transition-all cursor-pointer disabled:opacity-60"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span>
                {loading
                  ? 'Connecting...'
                  : authState.user && !authState.hasToken
                  ? 'Reconnect with Google'
                  : 'Sign in with Google'}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Status & Error Feedback */}
      {statusText && (
        <div className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
          <CheckCircle2 size={13} />
          <span>{statusText}</span>
        </div>
      )}
      {errorText && (
        <div className="text-[11px] text-red-400 bg-red-500/10 border border-red-500/20 px-2.5 py-1.5 rounded-xl flex items-center gap-1.5">
          <AlertTriangle size={13} />
          <span>{errorText}</span>
        </div>
      )}

      {authState.isAuthenticated && (
        <>
          {/* Tab Switcher */}
          <div className="flex p-1 bg-black/40 rounded-xl border border-white/10">
            <button
              type="button"
              onClick={() => setActiveTab('drive')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'drive'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <HardDrive size={13} />
              <span>Google Drive ({files.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('slides')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'slides'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Presentation size={13} />
              <span>Google Slides ({presentations.length})</span>
            </button>
          </div>

          {/* TAB 1: GOOGLE DRIVE */}
          {activeTab === 'drive' && (
            <div className="flex flex-col gap-2.5">
              {/* Search & New File Row */}
              <div className="flex gap-1.5">
                <form onSubmit={handleSearch} className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search Google Drive..."
                    className="w-full py-1.5 pl-2.5 pr-7 rounded-xl bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-400"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-2 text-slate-400 hover:text-white cursor-pointer"
                  >
                    <Search size={13} />
                  </button>
                </form>
                <button
                  type="button"
                  onClick={() => setShowNewFileModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={13} />
                  <span>New Doc</span>
                </button>
              </div>

              {/* Drive File List */}
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                {files.length > 0 ? (
                  files.map((file) => (
                    <div
                      key={file.id}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between gap-2 transition-all group"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        {getMimeIcon(file.mimeType)}
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {file.name}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {file.modifiedTime
                              ? new Date(file.modifiedTime).toLocaleDateString()
                              : 'File'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {file.webViewLink && (
                          <a
                            href={file.webViewLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white/5 hover:bg-sky-500/20 text-slate-400 hover:text-sky-300 transition-colors"
                            title="Open in Google Drive"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                        <button
                          type="button"
                          onClick={() => setFileToDelete(file)}
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                          title="Delete File (Protected)"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic bg-black/20 rounded-xl">
                    {loading ? 'Accessing Google Drive...' : 'No files found in Google Drive.'}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: GOOGLE SLIDES */}
          {activeTab === 'slides' && (
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 flex items-center gap-1">
                  <Sparkles size={13} />
                  <span>Google Slides Presentations</span>
                </span>
                <button
                  type="button"
                  onClick={() => setShowNewSlideModal(true)}
                  className="px-2.5 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <Plus size={13} />
                  <span>New Deck</span>
                </button>
              </div>

              {createdPresentationUrl && (
                <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-200">
                  <span>Deck created successfully!</span>
                  <a
                    href={createdPresentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 font-bold text-amber-300 hover:underline"
                  >
                    <span>Open in Slides</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              )}

              {/* Presentations List */}
              <div className="max-h-48 overflow-y-auto flex flex-col gap-1.5 pr-0.5">
                {presentations.length > 0 ? (
                  presentations.map((p) => (
                    <div
                      key={p.id}
                      className="p-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 flex items-center justify-between gap-2 transition-all"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Presentation size={15} className="text-amber-400 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-slate-200 truncate">
                            {p.name}
                          </span>
                          <span className="text-[9px] text-slate-400">
                            {p.modifiedTime
                              ? new Date(p.modifiedTime).toLocaleDateString()
                              : 'Presentation'}
                          </span>
                        </div>
                      </div>

                      {p.webViewLink && (
                        <a
                          href={p.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 rounded-lg bg-white/5 hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 transition-colors"
                          title="Open in Google Slides"
                        >
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 italic bg-black/20 rounded-xl">
                    {loading
                      ? 'Fetching presentations...'
                      : 'No presentations found. Click "New Deck" to generate one!'}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* CREATE FILE MODAL */}
      <AnimatePresence>
        {showNewFileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-sky-400/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText size={16} className="text-sky-400" />
                <span>Create File in Google Drive</span>
              </h3>
              <form onSubmit={handleCreateFile} className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    FILE NAME
                  </label>
                  <input
                    type="text"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">CONTENT</label>
                  <textarea
                    rows={4}
                    value={newFileContent}
                    onChange={(e) => setNewFileContent(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-sky-400 resize-none font-mono"
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewFileModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-xs font-bold text-white shadow-lg shadow-sky-500/20"
                  >
                    {loading ? 'Creating...' : 'Create in Drive'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CREATE SLIDES MODAL */}
      <AnimatePresence>
        {showNewSlideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-amber-400/30 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
            >
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Presentation size={16} className="text-amber-400" />
                <span>Create Google Slides Deck</span>
              </h3>
              <form onSubmit={handleCreatePresentation} className="flex flex-col gap-2.5">
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    PRESENTATION TITLE
                  </label>
                  <input
                    type="text"
                    value={slideTitle}
                    onChange={(e) => setSlideTitle(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 font-bold block mb-1">
                    TOPIC & THEME
                  </label>
                  <input
                    type="text"
                    value={slideTopic}
                    onChange={(e) => setSlideTopic(e.target.value)}
                    className="w-full p-2 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-amber-400"
                    required
                  />
                </div>
                <div className="flex gap-2 justify-end mt-1">
                  <button
                    type="button"
                    onClick={() => setShowNewSlideModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-xs font-bold text-white shadow-lg shadow-amber-500/20"
                  >
                    {loading ? 'Creating...' : 'Create in Slides'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MANDATORY DESTRUCTIVE ACTION CONFIRMATION MODAL */}
      <AnimatePresence>
        {fileToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-sm bg-slate-900 border border-red-500/40 rounded-2xl p-4 shadow-2xl flex flex-col gap-3"
            >
              <div className="flex items-center gap-2 text-red-400">
                <AlertTriangle size={20} />
                <h4 className="text-sm font-bold text-white">Confirm File Deletion</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                Are you sure you want to delete{' '}
                <span className="font-bold text-white">"{fileToDelete.name}"</span> from your Google
                Drive? This is a destructive action and cannot be undone.
              </p>
              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setFileToDelete(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-xs text-slate-300 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDelete}
                  disabled={loading}
                  className="px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow-lg shadow-red-600/30 cursor-pointer"
                >
                  {loading ? 'Deleting...' : 'Delete Permanently'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

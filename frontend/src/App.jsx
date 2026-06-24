import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import {
  Archive,
  ArrowLeft,
  Download,
  Pencil,
  Eye,
  File,
  Folder,
  LayoutDashboard,
  Image as ImageIcon,
  Menu,
  Film,
  MoreVertical,
  History,
  Search,
  Clock,
  Star,
  Trash2,
  Upload,
  AlertTriangle
} from 'lucide-react';
import './App.css';

const QUOTA_BYTES = 5 * 1024 * 1024 * 1024;
const CHUNK_SIZE_KB = 1024;

const categories = {
  Documents: { label: 'Documents', color: '#e75f45' },
  Images: { label: 'Images', color: '#20a39e' },
  Media: { label: 'Media', color: '#f2a541' },
  Apps: { label: 'Apps', color: '#8b5cf6' },
  Archives: { label: 'Archives', color: '#9aa4b2' },
  Other: { label: 'Other', color: '#9aa4b2' },
};

const navItems = [
  { id: 'home', label: 'Library', icon: 'LayoutDashboard' },
  { id: 'folders', label: 'Folders', icon: 'folder' },
  { id: 'recent', label: 'Recent', icon: 'clock' },
  { id: 'starred', label: 'Starred', icon: 'star' },
  { id: 'trash', label: 'Trash', icon: 'trash' },
];

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [storedFiles, setStoredFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [renamingId, setRenamingId] = useState(null);
  const [newName, setNewName] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('home');
  const [folders, setFolders] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [folderBreadcrumbs, setFolderBreadcrumbs] = useState([]);
  const [dnaFile, setDnaFile] = useState(null);
  const [menuOpenForFolder, setMenuOpenForFolder] = useState(null);
  const [addFilesModalFolder, setAddFilesModalFolder] = useState(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);

  useEffect(() => {
    fetchStoredFiles();
    fetchFolders(currentFolderId);
  }, [currentFolderId]);

  const activeFiles = useMemo(() => storedFiles.filter((file) => !isTrashed(file)), [storedFiles]);
  const trashedFiles = useMemo(() => storedFiles.filter((file) => isTrashed(file)), [storedFiles]);
  const activeTotalSize = activeFiles.reduce((acc, file) => acc + file.size, 0);
  const activePercentUsed = Math.min((activeTotalSize / QUOTA_BYTES) * 100, 100);
  const blockCount = activeFiles.reduce((acc, file) => acc + getBlockHashes(file).length, 0);
  const uniqueBlockCount = new Set(activeFiles.flatMap((file) => getBlockHashes(file))).size;
  const dedupeSavings = Math.max(blockCount - uniqueBlockCount, 0);

  const categorySizes = activeFiles.reduce((acc, file) => {
    const category = getCategory(file.fileName);
    acc[category] = (acc[category] || 0) + file.size;
    return acc;
  }, {});

  const filteredFiles = storedFiles.filter((file) => {
    const matchesSearch = file.fileName.toLowerCase().includes(searchTerm.toLowerCase());
    const trashed = isTrashed(file);
    const inCurrentFolder = file.folderId === currentFolderId || (!file.folderId && !currentFolderId);

    if (activeTab === 'trash') return matchesSearch && trashed;
    if (activeTab === 'starred') return matchesSearch && !trashed && file.isStarred;
    if (activeTab === 'recent') return matchesSearch && !trashed;
    if (activeTab === 'folders') return matchesSearch && !trashed && inCurrentFolder;
    return matchesSearch && !trashed;
  });

  if (activeTab === 'recent') {
    filteredFiles.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  const displayFolders = activeTab === 'starred' ? folders.filter(f => f.isStarred) : folders;

  const selectedFileStillVisible = selectedFile && filteredFiles.some((file) => file.id === selectedFile.id);

  const fetchStoredFiles = async () => {
    try {
      const res = await axios.get('/api/v1/files');
      setStoredFiles(res.data);
    } catch (err) {
      console.error('Failed to fetch library', err);
    }
  };

  const fetchFolders = async (parentId = null) => {
    try {
      const url = parentId ? `/api/v1/files/folders?parentId=${parentId}` : '/api/v1/files/folders';
      const res = await axios.get(url);
      setFolders(res.data);
    } catch (err) {
      console.error('Failed to fetch folders', err);
    }
  };

  const handleDownload = async (e, id, fileName) => {
    e.stopPropagation();
    try {
      const response = await axios.get(`/api/v1/files/download/${id}`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Download failed', err);
      alert('Download failed.');
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm('Permanently delete this file?')) return;
    try {
      await axios.delete(`/api/v1/files/${id}`);
      fetchStoredFiles();
      if (selectedFile?.id === id) setSelectedFile(null);
    } catch (err) {
      console.error('Delete failed', err);
      alert('Delete failed.');
    }
  };

  const handleRename = async (e, id) => {
    e.stopPropagation();
    if (!newName.trim()) {
      setRenamingId(null);
      return;
    }
    try {
      await axios.patch(`/api/v1/files/${id}/rename?newName=${encodeURIComponent(newName.trim())}`);
      fetchStoredFiles();
      if (selectedFile?.id === id) {
        setSelectedFile((prev) => ({ ...prev, fileName: newName.trim() }));
      }
      setRenamingId(null);
      setNewName('');
    } catch (err) {
      console.error('Rename failed', err);
      alert('Rename failed.');
    }
  };

  const handleTrash = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/v1/files/${id}/trash`);
      fetchStoredFiles();
      if (selectedFile?.id === id) setSelectedFile(null);
    } catch (err) {
      console.error('Move to trash failed', err);
      alert('Move to trash failed.');
    }
  };

  const handleRestore = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.post(`/api/v1/files/${id}/restore`);
      fetchStoredFiles();
    } catch (err) {
      console.error('Restore failed', err);
      alert('Restore failed.');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    if (e.type === 'dragleave') setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFiles(e.dataTransfer.files);
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) handleFiles(e.target.files);
  };

  const handleFiles = (fileList) => {
    const newFiles = Array.from(fileList);
    setFiles((prevFiles) => [...prevFiles, ...newFiles]);
    setStatus(null);
    setProgress(0);
  };

  const uploadFiles = async () => {
    setUploading(true);
    setStatus(null);
    setProgress(0);
    try {
      const totalFiles = files.length;
      let completedFiles = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        if (currentFolderId && activeTab === 'folders') {
          formData.append('folderId', currentFolderId);
        }
        await axios.post('/api/v1/files/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const fileProgress = (progressEvent.loaded / progressEvent.total) * 100;
            const currentTotal = ((completedFiles + fileProgress / 100) / totalFiles) * 100;
            setProgress(Math.round(currentTotal));
          },
        });
        completedFiles++;
      }
      setStatus('success');
      setFiles([]);
      setProgress(100);
      fetchStoredFiles();
    } catch (error) {
      console.error(error);
      setStatus('error');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = window.prompt('Enter folder name:');
    if (!name) return;
    try {
      const url = currentFolderId
        ? `/api/v1/files/folders?name=${encodeURIComponent(name)}&parentId=${currentFolderId}`
        : `/api/v1/files/folders?name=${encodeURIComponent(name)}`;
      await axios.post(url);
      fetchFolders(currentFolderId);
    } catch (err) {
      console.error('Failed to create folder', err);
      alert('Failed to create folder.');
    }
  };

  const handleDeleteFolder = async (id) => {
    if (!window.confirm('Delete this folder? This will delete all contents inside.')) return;
    try {
      await axios.delete(`/api/v1/files/folders/${id}`);
      fetchFolders(currentFolderId);
      fetchStoredFiles();
    } catch (err) {
      console.error('Failed to delete folder', err);
      alert('Failed to delete folder.');
    }
  };

  const handleToggleFileStar = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.patch(`/api/v1/files/${id}/star`);
      fetchStoredFiles();
    } catch (err) {
      console.error('Toggle file star failed', err);
    }
  };

  const handleToggleFolderStar = async (e, id) => {
    e.stopPropagation();
    try {
      await axios.patch(`/api/v1/files/folders/${id}/star`);
      fetchFolders(currentFolderId);
    } catch (err) {
      console.error('Toggle folder star failed', err);
    }
  };

  const handleUpdateFolderColor = async (e, id, color) => {
    e.stopPropagation();
    try {
      await axios.patch(`/api/v1/files/folders/${id}/color?color=${encodeURIComponent(color)}`);
      fetchFolders(currentFolderId);
      setMenuOpenForFolder(null);
    } catch (err) {
      console.error('Update folder color failed', err);
    }
  };

  const handleRenameFolder = async (folder) => {
    const newName = window.prompt('Enter new folder name:', folder.name);
    if (!newName || newName === folder.name) return;
    try {
      await axios.patch(`/api/v1/files/folders/${folder.id}/rename?newName=${encodeURIComponent(newName)}`);
      fetchFolders(currentFolderId);
    } catch (err) {
      console.error('Failed to rename folder', err);
      alert('Failed to rename folder.');
    }
    setMenuOpenForFolder(null);
  };

  const openFolder = (folder) => {
    setCurrentFolderId(folder.id);
    setFolderBreadcrumbs([...folderBreadcrumbs, folder]);
  };

  const navigateToBreadcrumb = (index) => {
    if (index === -1) {
      setCurrentFolderId(null);
      setFolderBreadcrumbs([]);
    } else {
      const targetFolder = folderBreadcrumbs[index];
      setCurrentFolderId(targetFolder.id);
      setFolderBreadcrumbs(folderBreadcrumbs.slice(0, index + 1));
    }
  };

  const handleGoBack = () => {
    if (folderBreadcrumbs.length === 0) return;
    const parentIndex = folderBreadcrumbs.length - 2;
    navigateToBreadcrumb(parentIndex);
  };

  return (
    <main className="app-shell montserrat-regular">
      <section className="topbar">
        <div className="brand-cluster">
          <button className="round-control" type="button" aria-label="Menu" onClick={() => setSidebarExpanded(!sidebarExpanded)}>
            <Icon name="menu" />
          </button>
          <div className="orbitron-regular select-none pl-6">BITSTORE</div>
        </div>

        <div className="topbar-actions">
          <button className="primary-button cta-button" type="button" aria-label="Add files" onClick={() => document.querySelector('.drop-zone input').click()}>
            <Icon name="Archive" />
            <span>Projects</span>
          </button>
          <div className="user-chip" aria-label="Storage health">
            <span className="avatar">HK</span>
            <div>
              <strong>{activeFiles.length} active files</strong>
              <span>{formatBytes(activeTotalSize)} stored</span>
            </div>
          </div>
          <label className="header-search">
            <Icon name="search" />
            <input
              type="text"
              placeholder="Search files ..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
        </div>
      </section>

      <section className={`workspace-grid ${sidebarExpanded ? 'is-expanded' : ''}`}>
        <aside className="sidebar-panel">

          <nav className="nav-stack" aria-label="Primary navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                className={`nav-button ${activeTab === item.id ? 'is-active' : ''}`}
                onClick={() => {
                  setActiveTab(item.id);
                  setSelectedFile(null);
                }}
                type="button"
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                {item.id === 'trash' && trashedFiles.length > 0 ? <b>{trashedFiles.length}</b> : null}
              </button>
            ))}
          </nav>

          <div className="mini-stat">
            <span>Saved blocks</span>
            <strong>{dedupeSavings}</strong>
            <p>{uniqueBlockCount} unique blocks live in the store.</p>
          </div>
        </aside>

        <section className="main-column">
          <div className="top-row">
            {activeTab !== 'folders' && (
              <StorageOverview
                activePercentUsed={activePercentUsed}
                activeTotalSize={activeTotalSize}
                blockCount={blockCount}
                uniqueBlockCount={uniqueBlockCount}
                categorySizes={categorySizes}
              />
            )}
            <UploadPanel
              dragActive={dragActive}
              files={files}
              uploading={uploading}
              progress={progress}
              status={status}
              onDrag={handleDrag}
              onDrop={handleDrop}
              onChange={handleChange}
              onClear={() => setFiles([])}
              onUpload={uploadFiles}
            />
          </div>

          <section className="library-section montserrat-regular">
            <div className="section-heading">
              <div>
                <p className="eyebrow">{activeTab === 'trash' ? 'Deleted files' : 'Cloud library'}</p>
                <h2>{activeTab === 'folders' ? (currentFolderId ? 'Folder contents' : 'Folders') : activeTab === 'trash' ? 'Recover or remove' : 'All files'}</h2>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeTab === 'folders' && !currentFolderId && (
                  <button
                    className="primary-button new-folder-btn"
                    onClick={handleCreateFolder}
                    type="button"
                  >
                    <Icon name="ArchiveRestore" /> New Folder
                  </button>
                )}
                <span className="file-count">{activeTab === 'folders' && !currentFolderId ? folders.length : filteredFiles.length} items</span>
              </div>
            </div>

            {activeTab === 'folders' && (
              <div className="folder-navigation" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                {currentFolderId !== null && (
                  <button
                    className="icon-button back-btn"
                    onClick={handleGoBack}
                    type="button"
                    title="Go back"
                    aria-label="Go back"
                  >
                    <Icon name="back" />
                  </button>
                )}
                <div className="breadcrumbs" style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: '850', fontSize: '0.9rem' }}>
                  <span style={{ cursor: 'pointer', color: currentFolderId === null ? 'var(--ink)' : 'var(--muted)' }} onClick={() => navigateToBreadcrumb(-1)}>Root</span>
                  {folderBreadcrumbs.map((crumb, idx) => (
                    <span key={crumb.id} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)' }}>/</span>
                      <span style={{ cursor: 'pointer', color: idx === folderBreadcrumbs.length - 1 ? 'var(--ink)' : 'var(--muted)' }} onClick={() => navigateToBreadcrumb(idx)}>{crumb.name}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {filteredFiles.length === 0 && displayFolders.length === 0 ? (
              activeTab === 'folders' && !currentFolderId ? (
                <div className="empty-state">
                  <Icon name="folder" />
                  <p>No folders yet.</p>
                  <button className="primary-button" style={{ marginTop: '16px' }} onClick={handleCreateFolder}>Create folder</button>
                </div>
              ) : (
                <EmptyState activeTab={activeTab} hasFiles={storedFiles.length > 0} />
              )
            ) : (
              <div className="file-list">
                {(activeTab === 'folders' || activeTab === 'starred') && displayFolders.map((folder) => (
                  <article className="file-row" key={`folder-${folder.id}`} onClick={() => openFolder(folder)} style={{ cursor: 'pointer', position: 'relative' }}>
                    <div className="file-primary">
                      <div className="file-icon" style={{ '--accent': folder.color || 'var(--muted)' }}>
                        <Icon name="folder" />
                      </div>
                      <div className="file-text">
                        <h3>{folder.name}</h3>
                        <p>Folder</p>
                      </div>
                    </div>
                    <div className="file-actions">
                      <IconButton
                        label={folder.isStarred ? 'Remove star' : 'Star'}
                        icon="star"
                        tone={folder.isStarred ? "amber" : "neutral"}
                        filled={folder.isStarred}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleFolderStar(e, folder.id);
                        }}
                      />
                      <IconButton
                        label="More options"
                        icon="more-vertical"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenForFolder(menuOpenForFolder === folder.id ? null : folder.id);
                        }}
                      />
                      {menuOpenForFolder === folder.id && (
                        <div className="context-menu" style={{ position: 'absolute', right: '40px', top: '40px', background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px', zIndex: 10, boxShadow: '0 10px 20px rgba(0,0,0,0.1)', width: '180px' }}>
                          <div className="color-picker" style={{ display: 'flex', gap: '4px', padding: '8px 12px', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' }}>
                            {['#e75f45', '#20a39e', '#f2a541', '#8b5cf6', '#9aa4b2', '#6e8fd7', '#8d76d6', '#dda84e'].map(c => (
                              <button key={c} onClick={(e) => handleUpdateFolderColor(e, folder.id, c)} style={{ width: '20px', height: '20px', borderRadius: '50%', background: c, border: folder.color === c ? '2px solid var(--ink)' : '2px solid transparent', cursor: 'pointer', padding: 0 }} aria-label="Set color" type="button" />
                            ))}
                            <button onClick={(e) => handleUpdateFolderColor(e, folder.id, '')} style={{ width: '20px', height: '20px', borderRadius: '50%', background: 'transparent', border: '1px solid var(--line)', cursor: 'pointer', padding: 0 }} aria-label="Clear color" type="button">✕</button>
                          </div>
                          <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setAddFilesModalFolder(folder); setMenuOpenForFolder(null); }}>Add files</button>
                          <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); handleRenameFolder(folder); }}>Rename</button>
                          <button style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--coral)' }} onClick={(e) => { e.stopPropagation(); handleDeleteFolder(folder.id); setMenuOpenForFolder(null); }}>Delete folder</button>
                        </div>
                      )}
                    </div>
                  </article>
                ))}
                {(activeTab !== 'folders' || currentFolderId !== null) && filteredFiles.map((file) => {
                  const isSelected = selectedFileStillVisible && selectedFile?.id === file.id;
                  return (
                    <FileRow
                      key={file.id}
                      file={file}
                      activeTab={activeTab}
                      isSelected={isSelected}
                      renamingId={renamingId}
                      newName={newName}
                      setNewName={setNewName}
                      onRename={handleRename}
                      onCancelRename={() => {
                        setRenamingId(null);
                        setNewName('');
                      }}
                      onSelect={() => setSelectedFile(isSelected ? null : file)}
                      onDownload={handleDownload}
                      onStartRename={(e) => {
                        e.stopPropagation();
                        setRenamingId(file.id);
                        setNewName(file.fileName);
                      }}
                      onTrash={handleTrash}
                      onRestore={handleRestore}
                      onDelete={handleDelete}
                      onViewDna={(e) => {
                        e.stopPropagation();
                        setDnaFile(file);
                      }}
                      onToggleStar={handleToggleFileStar}
                    />
                  );
                })}
              </div>
            )}
          </section>
        </section>
      </section>

      {dnaFile && (
        <FileDnaModal
          file={dnaFile}
          onClose={() => setDnaFile(null)}
        />
      )}

      {addFilesModalFolder && (
        <AddFilesModal
          folder={addFilesModalFolder}
          storedFiles={storedFiles}
          onClose={() => setAddFilesModalFolder(null)}
          onRefresh={() => { fetchStoredFiles(); fetchFolders(currentFolderId); }}
        />
      )}
    </main>
  );
}

function StorageOverview({ activePercentUsed, activeTotalSize, categorySizes }) {
  const circumference = 2 * Math.PI * 42;
  const usedOffset = circumference - (circumference * activePercentUsed) / 100;
  const segments = Object.entries(categories).map(([key, category]) => {
    const size = categorySizes[key] || 0;
    return { ...category, key, size, width: activeTotalSize ? (size / activeTotalSize) * 100 : 0 };
  });

  return (
    <div className="storage-meter-card">
      <div className="usage-ring-container">
        <div className="usage-ring" aria-label={`${activePercentUsed.toFixed(1)} percent used`}>
          <svg viewBox="0 0 100 100" role="img">
            <circle cx="50" cy="50" r="42" className="ring-track" />
            {(() => {
              let currentOffset = 0;
              return segments.map((seg) => {
                if (seg.size === 0 || !activeTotalSize) return null;
                const segmentPercentage = seg.size / activeTotalSize;
                const strokeLength = segmentPercentage * circumference;
                const gap = segments.filter(s => s.size > 0).length > 1 && strokeLength > 4 ? 4 : 0;
                const drawLength = Math.max(strokeLength - gap, 0.1);
                const dasharray = `${drawLength} ${circumference - drawLength}`;
                const dashoffset = -currentOffset;
                currentOffset += strokeLength;
                return (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r="42"
                    className="ring-segment"
                    stroke={seg.color}
                    strokeLinecap="round"
                    strokeDasharray={dasharray}
                    strokeDashoffset={dashoffset}
                    title={`${seg.label}: ${formatBytes(seg.size)}`}
                  />
                );
              });
            })()}
          </svg>
          <div className="usage-center">
            <strong>{activePercentUsed.toFixed(1)}%</strong>
            <span>Used</span>
          </div>
        </div>
      </div>
      <div className="storage-details">
        <h2>{formatBytes(activeTotalSize)} <span>/ 5 GB</span></h2>
        <p>Total storage utilized</p>
        <div className="legend-row">
          {segments.filter((segment) => segment.key !== 'Other' || segment.size > 0).map((segment) => (
            <span key={segment.key}>
              <i style={{ backgroundColor: segment.color }} />
              {segment.label}
            </span>
          ))}
        </div>
      </div>

    </div >
  );
}

function Metric({ label, value }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FolderStrip({ files }) {
  const folderMap = files.reduce((acc, file) => {
    const folder = file.folderPath || '/';
    acc[folder] = (acc[folder] || 0) + 1;
    return acc;
  }, {});
  const folders = Object.entries(folderMap);

  return (
    <div className="folder-strip">
      {folders.length === 0 ? (
        <span>No folders yet</span>
      ) : (
        folders.map(([folder, count]) => (
          <div className="folder-chip" key={folder}>
            <Icon name="folder" />
            <span>{folder === '/' ? 'Root' : folder}</span>
            <b>{count}</b>
          </div>
        ))
      )}
    </div>
  );
}

function FileRow({
  file,
  activeTab,
  isSelected,
  renamingId,
  newName,
  setNewName,
  onRename,
  onCancelRename,
  onSelect,
  onDownload,
  onStartRename,
  onTrash,
  onRestore,
  onDelete,
  onViewDna,
  onToggleStar,
}) {
  const category = getCategory(file.fileName);
  const hashes = getBlockHashes(file);

  return (
    <article className={`file-row ${isSelected ? 'is-selected' : ''}`} onClick={onSelect}>
      <div className="file-primary">
        <div className="file-icon" style={{ '--accent': categories[category].color }}>
          <Icon name={getIconForCategory(category)} />
        </div>
        <div className="file-text">
          {renamingId === file.id ? (
            <input
              autoFocus
              className="rename-input"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={(e) => onRename(e, file.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') onRename(e, file.id);
                if (e.key === 'Escape') onCancelRename();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <h3>{file.fileName}</h3>
          )}
          <p>
            {formatBytes(file.size)} <span>/</span> {hashes.length} {hashes.length === 1 ? 'block' : 'blocks'}
            {file.createdAt ? (
              <>
                <span>/</span> {formatDate(file.createdAt)}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="file-actions">
        <IconButton label="View DNA" icon="eye" onClick={onViewDna} />
        <IconButton label="Download" icon="download" onClick={(e) => onDownload(e, file.id, file.fileName)} />
        {activeTab === 'trash' ? (
          <>
            <IconButton label="Restore" icon="restore" onClick={(e) => onRestore(e, file.id)} />
            <IconButton label="Delete forever" icon="warning" tone="danger" onClick={(e) => onDelete(e, file.id)} />
          </>
        ) : (
          <>
            <IconButton label={file.isStarred ? 'Remove star' : 'Star'} icon="star" onClick={(e) => onToggleStar(e, file.id)} tone={file.isStarred ? "amber" : "neutral"} filled={file.isStarred} />
            <IconButton label="Rename" icon="edit" onClick={onStartRename} />
            <IconButton label="Move to trash" icon="trash" tone="danger" onClick={(e) => onTrash(e, file.id)} />
          </>
        )}
      </div>
    </article>
  );
}

function UploadPanel({ dragActive, files, uploading, progress, status, onDrag, onDrop, onChange, onClear, onUpload }) {
  return (
    <section className="upload-panel montserrat-regular">
      <form
        className={`drop-zone ${dragActive ? 'is-active' : ''}`}
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
      >
        <input type="file" onChange={onChange} multiple aria-label="Upload files" />
        <div className="upload-symbol">
          <Icon name="upload" />
        </div>
        <strong>{dragActive ? 'Release to upload' : 'Drop files here'}</strong>
        <span>or click to browse</span>
      </form>

      {(uploading || progress > 0 || status) && (
        <div className="progress-group">
          <div className="progress-copy">
            <span>{status === 'error' ? 'Upload failed' : status === 'success' ? 'Upload complete' : 'Uploading'}</span>
            <b>{progress}%</b>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {files.length > 0 ? (
        <div className="queue-list">
          <div className="queue-header">
            <span>Queue ({files.length})</span>
            <button type="button" onClick={onClear}>
              Clear
            </button>
          </div>
          {files.map((file, index) => (
            <div className="queue-item" key={`${file.name}-${index}`}>
              <span>{file.name}</span>
              <b>{formatBytes(file.size)}</b>
            </div>
          ))}
          <button className="primary-button" onClick={onUpload} disabled={uploading} type="button">
            {uploading ? 'Uploading...' : 'Start upload'}
          </button>
        </div>
      ) : null}
    </section>
  );
}

function FileDnaModal({ file, onClose }) {
  const hashes = getBlockHashes(file);
  const category = getCategory(file.fileName);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="dna-modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-heading compact" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">File DNA</p>
            <h2>{file.fileName}</h2>
          </div>
          <button className="icon-button" onClick={onClose} style={{ alignSelf: 'flex-start' }}>✕</button>
        </div>

        <div className="dna-summary">
          <Metric label="Size" value={formatBytes(file.size)} />
          <Metric label="Chunks" value={hashes.length} />
        </div>

        <div className="hash-list">
          {hashes.map((hash, index) => (
            <div className="hash-card" key={`${hash}-${index}`}>
              <div className="hash-head">
                <b>{index + 1}</b>
                <span>{CHUNK_SIZE_KB} KB chunk</span>
              </div>
              <code>{hash}</code>
            </div>
          ))}
        </div>
      </dialog>
    </div>
  );
}

function EmptyState({ activeTab, hasFiles }) {
  const message =
    activeTab === 'trash'
      ? 'Trash is clean.'
      : hasFiles
        ? 'No files match your search.'
        : 'Upload your first object to start building the library.';

  return (
    <div className="empty-state">
      <Icon name={activeTab === 'trash' ? 'trash' : 'file'} />
      <p>{message}</p>
    </div>
  );
}

function IconButton({ label, icon, tone = 'neutral', onClick, filled = false }) {
  return (
    <button className={`icon-button ${tone}`} onClick={onClick} type="button" title={label} aria-label={label}>
      <Icon name={icon} filled={filled} />
    </button>
  );
}

function Icon({ name, filled }) {
  const iconMap = {
    archive: Archive,
    back: ArrowLeft,
    download: Download,
    edit: Pencil,
    eye: Eye,
    file: File,
    folder: Folder,
    LayoutDashboard: LayoutDashboard,
    image: ImageIcon,
    menu: Menu,
    media: Film,
    'more-vertical': MoreVertical,
    Archive: Archive,
    restore: History,
    search: Search,
    clock: Clock,
    star: Star,
    trash: Trash2,
    upload: Upload,
    warning: AlertTriangle,
  };

  const IconComponent = iconMap[name] || File;
  return <IconComponent size={20} strokeWidth={2} fill={filled ? "currentColor" : "none"} aria-hidden="true" />;
}

function getBlockHashes(file) {
  return file?.blockHashes || [];
}

function isTrashed(file) {
  return Boolean(file?.trashed ?? file?.isTrashed);
}

function getCategory(fileName = '') {
  const ext = fileName.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'heic'].includes(ext)) return 'Images';
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'csv', 'md', 'xls', 'xlsx', 'ppt', 'pptx'].includes(ext)) return 'Documents';
  if (['mp3', 'mp4', 'wav', 'mov', 'avi', 'mkv', 'webm'].includes(ext)) return 'Media';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'Archives';
  if (['exe', 'dmg', 'apk', 'app', 'pkg'].includes(ext)) return 'Apps';
  return 'Other';
}

function getIconForCategory(category) {
  if (category === 'Images') return 'image';
  if (category === 'Media') return 'media';
  if (category === 'Archives') return 'archive';
  if (category === 'Apps') return 'LayoutDashboard';
  return 'file';
}

function formatBytes(bytes = 0) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value));
}

function AddFilesModal({ folder, storedFiles, onClose, onRefresh }) {
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [saving, setSaving] = useState(false);

  // Files not currently in this folder and not trashed
  const availableFiles = storedFiles.filter(f => !isTrashed(f) && f.folderId !== folder.id);

  const handleToggle = (id) => {
    const next = new Set(selectedFiles);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedFiles(next);
  };

  const handleAddFiles = async () => {
    setSaving(true);
    try {
      for (const fileId of selectedFiles) {
        await axios.patch(`/api/v1/files/${fileId}/move?folderId=${folder.id}`);
      }
      onRefresh();
      onClose();
    } catch (err) {
      console.error('Failed to add files', err);
      alert('Failed to add some files.');
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <dialog open className="dna-modal" onClick={(e) => e.stopPropagation()}>
        <div className="section-heading compact" style={{ display: 'flex', justifyContent: 'space-between' }}>
          <div>
            <p className="eyebrow">Add files to</p>
            <h2>{folder.name}</h2>
          </div>
          <button className="icon-button" onClick={onClose} style={{ alignSelf: 'flex-start' }}>✕</button>
        </div>

        {availableFiles.length === 0 ? (
          <p style={{ margin: '20px 0', textAlign: 'center', color: 'var(--muted)' }}>No available files to add.</p>
        ) : (
          <div className="add-files-list" style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '20px', border: '1px solid var(--line)', borderRadius: '12px', padding: '8px' }}>
            {availableFiles.map(file => (
              <label key={file.id} style={{ display: 'flex', gap: '12px', alignItems: 'center', padding: '8px', cursor: 'pointer', borderBottom: '1px solid var(--line)' }}>
                <input
                  type="checkbox"
                  checked={selectedFiles.has(file.id)}
                  onChange={() => handleToggle(file.id)}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--coral)' }}
                />
                <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {file.fileName}
                </div>
              </label>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
          <button style={{ padding: '10px 20px', borderRadius: '999px', border: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontWeight: 600 }} onClick={onClose}>Cancel</button>
          <button className="primary-button" onClick={handleAddFiles} disabled={saving || selectedFiles.size === 0} style={{ padding: '0 20px' }}>
            {saving ? 'Adding...' : `Add ${selectedFiles.size} files`}
          </button>
        </div>
      </dialog>
    </div>
  );
}

export default App;

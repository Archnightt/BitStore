import { useState, useEffect } from 'react';
import axios from 'axios';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [storedFiles, setStoredFiles] = useState([]); 
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null); // The file currently being inspected

  useEffect(() => {
    fetchStoredFiles();
  }, []);

  const fetchStoredFiles = async () => {
    try {
      const res = await axios.get('/api/v1/files');
      setStoredFiles(res.data);
    } catch (err) {
      console.error("Failed to fetch library", err);
    }
  };

  const handleDownload = async (e, id, fileName) => {
    e.stopPropagation(); // Prevent opening inspector when clicking download
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
    } catch (err) {
      console.error("Download failed", err);
      alert("Download failed!");
    }
  };

  // ... Drag & Drop Logic ...
  const handleDrag = (e) => {
     e.preventDefault(); e.stopPropagation();
     if (e.type === "dragenter" || e.type === "dragover") setDragActive(true);
     else if (e.type === "dragleave") setDragActive(false);
  };
  const handleDrop = (e) => {
     e.preventDefault(); e.stopPropagation(); setDragActive(false);
     if (e.dataTransfer.files && e.dataTransfer.files[0]) handleFiles(e.dataTransfer.files);
  };
  const handleChange = (e) => {
     e.preventDefault();
     if (e.target.files && e.target.files[0]) handleFiles(e.target.files);
  };
  const handleFiles = (fileList) => {
     const newFiles = Array.from(fileList);
     setFiles((prevFiles) => [...prevFiles, ...newFiles]);
     setStatus(null); setProgress(0);
  };

  const uploadFiles = async () => {
    setUploading(true); setStatus(null); setProgress(0);
    try {
      const totalFiles = files.length;
      let completedFiles = 0;
      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);
        await axios.post('/api/v1/files/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const fileProgress = (progressEvent.loaded / progressEvent.total) * 100;
            const currentTotal = ((completedFiles + (fileProgress / 100)) / totalFiles) * 100;
            setProgress(Math.round(currentTotal));
          }
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

  return (
		<div className="min-h-screen bg-[#EFECE3] text-[#1A1A1A] font-sans flex flex-col items-center py-12 px-6 transition-colors duration-500">
			<div className="w-full max-w-4xl space-y-8">
				<div className="text-center">
					<h1 className="text-5xl font-black tracking-tighter mb-2 text-[#1A1A1A]">BitStore.</h1>
					<p className="text-lg font-medium text-[#1A1A1A]/50">Decentralized Object Storage</p>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
					{/* LEFT COLUMN: Upload & List */}
					<div className="space-y-8">
						{/* UPLOAD CARD */}
						<div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-black/5 border border-white/50 backdrop-blur-xl transition-all duration-300">
							<form
								className={`relative flex flex-col items-center justify-center w-full h-48 rounded-3xl border-3 border-dashed transition-all duration-300 ease-out
                  ${dragActive ? "border-[#94B4C1] bg-[#94B4C1]/10 scale-[1.02]" : "border-[#94B4C1]/60 hover:border-[#94B4C1] hover:bg-[#EFECE3]/15 hover:scale-[1.02]"}`}
								onDragEnter={handleDrag}
								onDragLeave={handleDrag}
								onDragOver={handleDrag}
								onDrop={handleDrop}>
								<input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple />
								<div className="flex flex-col items-center gap-4 pointer-events-none">
									{/* 🔽 File Drop Icon (copied) */}
									<div
										className={`p-4 rounded-full shadow-lg transition-all 
                  ${dragActive ? "bg-[#94B4C1] text-white scale-110" : "bg-white text-[#94B4C1]"}`}>
										<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
											<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
										</svg>
									</div>

									<p className="text-lg font-bold text-[#1A1A1A]">{dragActive ? "Drop files now" : "Drag & Drop Files"}</p>
								</div>
							</form>

							{(uploading || progress > 0) && (
								<div className="mt-6">
									<div className="h-2 bg-[#EFECE3] rounded-full overflow-hidden">
										<div className="h-full bg-[#94B4C1] transition-all duration-300" style={{ width: `${progress}%` }}></div>
									</div>
								</div>
							)}

							{files.length > 0 && (
								<div className="mt-6 space-y-3">
									<div className="flex items-center justify-between px-2 mb-2">
										<span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40">Queue ({files.length})</span>
										<button onClick={() => setFiles([])} className="text-xs font-bold text-red-500 hover:text-red-700 transition-colors uppercase tracking-widest cursor-pointer">
											CLEAR
										</button>
									</div>
									{files.map((f, i) => (
										<div key={i} className="flex justify-between p-3 bg-[#EFECE3]/50 rounded-xl text-sm font-bold text-[#1A1A1A]">
											<span>{f.name}</span> <span className="text-[#1A1A1A]/40">{(f.size / 1024).toFixed(1)} KB</span>
										</div>
									))}
									<button
										onClick={uploadFiles}
										disabled={uploading}
										className={`w-full py-4 rounded-xl font-bold uppercase tracking-wider shadow-lg transition-all 
                         ${uploading ? "bg-[#EFECE3] text-[#1A1A1A]/40" : "bg-[#1A1A1A] text-[#EFECE3] hover:-translate-y-1 shadow-[#1A1A1A]/20"}`}>
										{uploading ? "Uploading..." : "Start Upload"}
									</button>
								</div>
							)}
						</div>

						{/* LIBRARY LIST */}
						{storedFiles.length > 0 && (
							<div className="space-y-4">
								<h2 className="text-2xl font-bold text-[#1A1A1A] px-2">Cloud Library</h2>
								<div className="grid gap-3">
									{storedFiles.map((file) => (
										<div
											key={file.id}
											onClick={() => setSelectedFile(file)}
											className={`group cursor-pointer p-4 rounded-2xl shadow-sm border transition-all flex items-center justify-between
                        ${
													selectedFile?.id === file.id
														? "bg-[#1A1A1A] text-[#EFECE3] border-[#1A1A1A] scale-[1.02] shadow-xl"
														: "bg-white text-[#1A1A1A] border-transparent hover:border-[#4A70A9]/20 hover:shadow-md"
												}`}>
											<div className="flex items-center gap-4">
												<div
													className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
														selectedFile?.id === file.id ? "bg-[#EFECE3]/20 text-[#EFECE3]" : "bg-[#EFECE3] text-[#1A1A1A]"
													}`}>
													<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
														/>
													</svg>
												</div>
												<div>
													<p className="font-bold">{file.fileName}</p>
													<p className={`text-xs ${selectedFile?.id === file.id ? "text-[#EFECE3]/50" : "text-[#1A1A1A]/50"}`}>
														{(file.size / 1024).toFixed(1)} KB • {file.blockHashes.length} Blocks
													</p>
												</div>
											</div>
											<button
												onClick={(e) => handleDownload(e, file.id, file.fileName)}
												className={`p-3 rounded-xl transition-colors ${
													selectedFile?.id === file.id ? "bg-[#EFECE3]/20 hover:bg-[#EFECE3] hover:text-[#1A1A1A]" : "bg-[#EFECE3] hover:bg-[#4A70A9] hover:text-white"
												}`}
												title="Download">
												<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
													<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M12 9.75V15m0 0 3-3m-3 3-3-3" />
												</svg>
											</button>
										</div>
									))}
								</div>
							</div>
						)}
					</div>

					{/* RIGHT COLUMN: INSPECTOR */}
					<div className="sticky top-8">
						{selectedFile ? (
							<div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-black/5 border border-white/50 backdrop-blur-xl animate-fade-in-up">
								<div className="mb-6 pb-6 border-b border-[#1A1A1A]/5">
									<p className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40 mb-1">Under the hood</p>
									<h2 className="text-3xl font-black text-[#1A1A1A] leading-tight">File DNA</h2>
									<p className="text-[#1A1A1A]/60 mt-2">
										This file is not stored as a single piece. It was split into
										<strong className="text-[#1A1A1A]"> {selectedFile.blockHashes.length} Content-Addressable Blocks</strong>.
									</p>
								</div>

								<div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
									{selectedFile.blockHashes.map((hash, i) => (
										<div key={i} className="group bg-[#EFECE3]/30 p-4 rounded-xl border border-[#1A1A1A]/5 hover:border-[#4A70A9]/30 hover:bg-[#EFECE3] transition-all">
											<div className="flex items-center gap-3 mb-2">
												<div className="w-8 h-8 rounded-lg bg-[#1A1A1A] text-white flex items-center justify-center text-xs font-bold font-mono">{i + 1}</div>
												<span className="text-xs font-bold uppercase tracking-widest text-[#1A1A1A]/40">1024 KB Chunk</span>
											</div>
											<div className="font-mono text-[10px] break-all text-[#1A1A1A]/70 leading-relaxed group-hover:text-[#4A70A9] transition-colors">{hash}</div>
										</div>
									))}
								</div>

								<div className="mt-6 pt-6 border-t border-[#1A1A1A]/5 text-center">
									<p className="text-xs text-[#1A1A1A]/40">
										When you click <strong className="text-[#1A1A1A]">Download</strong>, the system fetches these {selectedFile.blockHashes.length} unique blocks and stitches them back together.
									</p>
								</div>
							</div>
						) : (
							<div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-30 border-2 border-dashed border-[#1A1A1A]/20 rounded-[2rem]">
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-16 h-16 mb-4">
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
									/>
									<path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
								</svg>
								<p className="text-xl font-bold">Select a file to inspect</p>
								<p className="text-sm mt-2">See how BitStore de-chunks and hashes your data.</p>
							</div>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}

export default App;
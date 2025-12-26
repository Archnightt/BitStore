import { useState } from 'react';
import axios from 'axios';

function App() {
  const [dragActive, setDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const [progress, setProgress] = useState(0);

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
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

        // Use Axios for real upload progress
        await axios.post('http://localhost:8081/api/v1/files/upload', formData, {
          onUploadProgress: (progressEvent) => {
            const fileProgress = (progressEvent.loaded / progressEvent.total) * 100;
            // Calculate total progress across all files roughly
            const currentTotal = ((completedFiles + (fileProgress / 100)) / totalFiles) * 100;
            setProgress(Math.round(currentTotal));
          }
        });
        
        completedFiles++;
      }
      
      setStatus('success');
      setFiles([]);
      setProgress(100);
    } catch (error) {
      console.error(error);
      setStatus('error');
      setProgress(0);
    } finally {
      setUploading(false);
    }
  };

  return (
		<div className="min-h-screen bg-beige text-softblack font-sans flex items-center justify-center p-6 transition-colors duration-500">
			<div className="w-full max-w-2xl">
				{/* Header */}
				<div className="mb-12 text-center">
					<h1 className="text-5xl font-black tracking-tighter mb-2 text-softblack">BitStore.</h1>
					<p className="text-lg font-medium text-softblack/50">Decentralized Object Storage</p>
				</div>

				{/* Main Card - Soft & Modern */}
				<div className="bg-white rounded-[2rem] p-8 shadow-2xl shadow-softblack/5 border border-white/50 backdrop-blur-xl transition-all duration-300 hover:shadow-softblack/10">
					{/* Drag Zone */}
					<form
						className={`relative flex flex-col items-center justify-center w-full h-80 rounded-3xl border-3 border-dashed transition-all duration-300 ease-out
              ${dragActive ? "border-deepblue bg-paleblue/10 scale-[1.02]" : "border-softblack/10 hover:border-deepblue/40 hover:bg-beige/30"}`}
						onDragEnter={handleDrag}
						onDragLeave={handleDrag}
						onDragOver={handleDrag}
						onDrop={handleDrop}>
						<input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={handleChange} multiple />

						<div className="flex flex-col items-center gap-6 pointer-events-none transform transition-transform duration-300">
							<div className={`p-5 rounded-full shadow-lg transition-all duration-300 ${dragActive ? "bg-deepblue text-white scale-110" : "bg-white text-deepblue"}`}>
								<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-8 h-8">
									<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
								</svg>
							</div>
							<div className="text-center">
								<p className="text-xl font-bold text-softblack">{dragActive ? "Drop it like it's hot!" : "Drag & Drop Files"}</p>
								<p className="text-sm font-medium text-softblack/40 mt-2">or click to browse</p>
							</div>
						</div>
					</form>

					{/* Progress Bar (Only visible when uploading) */}
					{(uploading || progress > 0) && (
						<div className="mt-8 mb-4">
							<div className="flex justify-between text-xs font-bold uppercase tracking-widest mb-2 text-softblack/60">
								<span>Uploading...</span>
								<span>{progress}%</span>
							</div>
							<div className="w-full h-3 bg-beige rounded-full overflow-hidden">
								<div className="h-full bg-deepblue transition-all duration-300 ease-out rounded-full" style={{ width: `${progress}%` }}></div>
							</div>
						</div>
					)}

					{/* File List */}
					{files.length > 0 && (
						<div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
							<div className="flex items-center justify-between mb-4 px-2">
								<span className="text-xs font-bold uppercase tracking-widest text-softblack/40">Queue</span>
								<button onClick={() => setFiles([])} className="text-xs font-bold text-softblack/40 hover:text-red-500 transition-colors">
									CLEAR
								</button>
							</div>

							<div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
								{files.map((file, index) => (
									<div key={index} className="group flex items-center justify-between p-4 bg-beige/50 rounded-2xl border border-transparent hover:border-softblack/5 transition-all duration-200">
										<div className="flex items-center gap-4 overflow-hidden">
											<div className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-white rounded-xl shadow-sm text-deepblue">
												<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
													<path d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625Z" />
													<path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
												</svg>
											</div>
											<div className="truncate">
												<p className="text-sm font-bold text-softblack truncate">{file.name}</p>
												<p className="text-xs text-softblack/50">{(file.size / 1024).toFixed(1)} KB</p>
											</div>
										</div>
									</div>
								))}
							</div>

							{/* Action Button - Hardcoded Hex Colors to bypass config issues */}
							<button
								onClick={uploadFiles}
								disabled={uploading}
								className={`mt-8 w-full py-5 rounded-2xl font-bold tracking-wider uppercase shadow-xl transition-all duration-300 transform
                ${
                  uploading
                    ? "bg-beige text-softblack/40 cursor-wait shadow-none scale-[0.98]"
                    : "bg-softblack text-beige shadow-softblack/30 hover:bg-softblack/90 hover:shadow-softblack/50 hover:-translate-y-1 active:scale-[0.97] active:shadow-sm"
                }`}>
                            {uploading ? "Uploading..." : "Start Upload"}
							</button>
						</div>
					)}

					{/* Success Message */}
					{status === "success" && (
						<div className="mt-8 p-4 rounded-2xl bg-green-500/10 border border-green-500/20 text-green-600 text-center font-bold animate-in zoom-in duration-300">✨ Upload Complete!</div>
					)}

					{/* Error Message */}
					{status === "error" && <div className="mt-8 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-600 text-center font-bold animate-in shake duration-300">⚠️ Upload Failed</div>}
				</div>
			</div>
		</div>
	);
}

export default App;

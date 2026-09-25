import React, { useState, useRef } from "react";

export function DragDropIngest({ onComplete }: { onComplete: () => void }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [files, setFiles] = useState<{ transactions?: File; identity?: File }>({});
  const [log, setLog] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFilesSelected(droppedFiles);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    const newFiles = { ...files };
    selectedFiles.forEach((f) => {
      if (f.name.toLowerCase().includes("transaction")) newFiles.transactions = f;
      if (f.name.toLowerCase().includes("identity")) newFiles.identity = f;
    });
    setFiles(newFiles);
    
    if (newFiles.transactions) {
      setLog(prev => [...prev, `Found transactions dataset: ${newFiles.transactions?.name} (${(newFiles.transactions!.size / 1024 / 1024).toFixed(2)} MB)`]);
    }
    if (newFiles.identity) {
      setLog(prev => [...prev, `Found identity dataset: ${newFiles.identity?.name} (${(newFiles.identity!.size / 1024 / 1024).toFixed(2)} MB)`]);
    }
  };

  const handleUpload = async () => {
    if (!files.transactions) return;
    setUploading(true);
    setLog(prev => [...prev, "[MCP] Initializing TigerGraph pipeline..."]);
    
    const formData = new FormData();
    formData.append("transactions", files.transactions);
    if (files.identity) formData.append("identity", files.identity);

    try {
      setLog(prev => [...prev, "[MCP] Parsing CSVs and extracting vertex/edge schemas..."]);
      const res = await fetch("http://localhost:8000/api/upload_csv", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      
      setLog(prev => [...prev, `[MCP] Success: ${data.message}`]);
      setLog(prev => [...prev, "[MCP] Dynamically generating fraud alerts (case_pack) from risk scores..."]);
      
      setTimeout(() => {
        onComplete();
      }, 2000);
    } catch (err) {
      setLog(prev => [...prev, `[ERROR] Failed to ingest: ${err}`]);
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-8">
      <div className="bg-[#09090b] border border-[#27272a] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
        <div className="p-4 border-b border-[#27272a] flex items-center justify-between bg-[#141418]">
          <span className="font-mono text-sm font-bold text-white flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
            TIGERGRAPH MCP // DATA PIPELINE
          </span>
          <button onClick={onComplete} className="text-zinc-500 hover:text-white transition text-xs font-mono">
            [ SKIP ]
          </button>
        </div>

        <div className="p-8 flex flex-col items-center">
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`w-full h-48 border-2 border-dashed rounded-xl flex flex-col items-center justify-center cursor-pointer transition ${
              isDragging ? "border-emerald-500 bg-emerald-500/10" : "border-[#3f3f46] hover:border-zinc-500 bg-[#141418]"
            }`}
          >
            <span className="text-3xl mb-2">📁</span>
            <span className="font-mono text-sm text-[#e4e4e7] mb-1">
              Drag & Drop IEEE-CIS CSVs
            </span>
            <span className="font-mono text-xs text-[#71717a]">
              transactions.csv and identity.csv
            </span>
          </div>
          <input
            type="file"
            multiple
            accept=".csv"
            className="hidden"
            ref={fileInputRef}
            onChange={(e) => handleFilesSelected(Array.from(e.target.files || []))}
          />

          {files.transactions && (
            <button
              onClick={handleUpload}
              disabled={uploading}
              className={`mt-6 w-full py-3 rounded-lg font-mono text-sm font-bold transition flex items-center justify-center gap-2 ${
                uploading
                  ? "bg-emerald-500/20 text-emerald-500 border border-emerald-500/50 cursor-not-allowed"
                  : "bg-emerald-500 hover:bg-emerald-400 text-zinc-900"
              }`}
            >
              {uploading ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin"></span>
                  INGESTING TO TIGERGRAPH...
                </>
              ) : (
                "INITIALIZE INGESTION"
              )}
            </button>
          )}

          {log.length > 0 && (
            <div className="w-full mt-6 bg-[#0c0c0e] border border-[#27272a] rounded-lg p-3 h-32 overflow-y-auto font-mono text-[10px] text-emerald-400 flex flex-col gap-1">
              {log.map((l, i) => (
                <span key={i}>{l}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* eslint-disable react-hooks/exhaustive-deps */
import axios from "axios";
import React, { useEffect, useState } from "react";

const chunkSize = 5 * 1024 * 1024; // 5MB
interface CustomFile extends File {
  finalFilename?: string; // Making this optional, as it won't be available on all File objects
}

function App() {
  const [dropZoneActive, setDropZoneActive] = useState(false);
  const [files, setFiles] = useState<CustomFile[]>([]);
  const [uploadState, setUploadState] = useState({
    currentFileIndex: null as number | null,
    lastUploadedFileIndex: null as number | null,
    currentChunkIndex: null as number | null,
  });

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    setDropZoneActive(false); // Reset drop zone active state
  };

  const readAndUploadCurrentChunk = () => {
    const { currentFileIndex, currentChunkIndex } = uploadState;
    if (currentFileIndex === null || currentChunkIndex === null) return;

    const file = files[currentFileIndex];
    const from = currentChunkIndex * chunkSize;
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    const reader = new FileReader();

    reader.onload = (e) => uploadChunk(e);
    reader.readAsDataURL(blob);
  };

  const uploadChunk = (readerEvent: ProgressEvent<FileReader>) => {
    const { currentFileIndex, currentChunkIndex } = uploadState;
    const file = files[currentFileIndex!];
    const data = readerEvent.target!.result;

    const params = new URLSearchParams({
      name: file.name,
      size: `${file.size}`,
      currentChunkIndex: `${currentChunkIndex}`,
      totalChunks: `${Math.ceil(file.size / chunkSize)}`,
    });

    const headers = { "Content-Type": "application/octet-stream" };
    const url = `http://localhost:4001/upload?${params.toString()}`;

    axios
      .post(url, data, { headers })
      .then((response) => {
        const isLastChunk =
          currentChunkIndex === Math.ceil(file.size / chunkSize) - 1;
        if (isLastChunk) {
          file.finalFilename = response.data.finalFilename;
          setUploadState((prev) => ({
            ...prev,
            lastUploadedFileIndex: prev.currentFileIndex,
            currentChunkIndex: null,
          }));
        } else {
          setUploadState((prev) => ({
            ...prev,
            currentChunkIndex: currentChunkIndex! + 1,
          }));
        }
      })
      .catch((error) => {
        console.error("Error uploading chunk:", error);
      });
  };

  useEffect(() => {
    const { lastUploadedFileIndex, currentFileIndex } = uploadState;
    if (lastUploadedFileIndex !== null) {
      const isLastFile = lastUploadedFileIndex === files.length - 1;
      const nextFileIndex = isLastFile ? null : lastUploadedFileIndex + 1;
      setUploadState((prev) => ({ ...prev, currentFileIndex: nextFileIndex }));
    } else if (files.length > 0 && currentFileIndex === null) {
      setUploadState((prev) => ({
        ...prev,
        currentFileIndex:
          lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1,
      }));
    }
  }, [files.length, uploadState.lastUploadedFileIndex]);

  useEffect(() => {
    const { currentFileIndex } = uploadState;
    if (currentFileIndex !== null) {
      setUploadState((prev) => ({ ...prev, currentChunkIndex: 0 }));
    }
  }, [uploadState.currentFileIndex]);

  useEffect(() => {
    const { currentChunkIndex } = uploadState;
    if (currentChunkIndex !== null) {
      readAndUploadCurrentChunk();
    }
  }, [uploadState.currentChunkIndex]);

  return (
    <div className="main">
      <div>
        <div
          className={`container ${dropZoneActive ? "active" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDropZoneActive(true);
          }}
          onDragLeave={() => setDropZoneActive(false)}
          onDrop={handleDrop}
        >
          Drop your file here
        </div>
        <div className="files">
          {files.map((file, fileIndex) => {
            let progress = 0;
            if (file.finalFilename) {
              progress = 100;
            } else if (fileIndex === uploadState.currentFileIndex) {
              const chunks = Math.ceil(file.size / chunkSize);
              progress = Math.round(
                (uploadState.currentChunkIndex! / chunks) * 100
              );
            }

            return (
              <a
                key={file.name}
                className="file"
                target="_blank"
                rel="noopener noreferrer"
                href={`http://localhost:4001/uploads/${file.finalFilename}`}
              >
                <div className="name">{file.name}</div>
                <div
                  className={`progress ${progress === 100 ? "done" : ""}`}
                  style={{ width: `${progress}%` }}
                >
                  {progress}%
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default App;

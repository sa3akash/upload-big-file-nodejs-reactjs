import axios from "axios";
import React, { useEffect, useState } from "react";

const chunkSize = 5 * 1024 * 1024; // 5MB

function App() {
  const [dropZonActive, setDropZonActive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [currentFileIndex,setCurrentFileIndex] = useState<number|null>(null)
  const [lastUploadedFileIndex,setLastUploadedFileIndex] = useState<number|null>(null)
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number|null>(null);


  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setFiles(prev=>([...prev,...e.dataTransfer.files]))
    console.log(e);
  };


  function readAndUploadCurrentChunk() {
    const reader = new FileReader();
    const file = files[currentFileIndex!];
    if (!file) {
      return;
    }
    const from = currentChunkIndex! * chunkSize;
    const to = from + chunkSize;
    const blob = file.slice(from, to);
    reader.onload = e => uploadChunk(e);
    reader.readAsDataURL(blob);
  }
  function uploadChunk(readerEvent:ProgressEvent<FileReader>) {
    const file = files[currentFileIndex!];
    const data = readerEvent.target!.result;
    const params = new URLSearchParams();
    params.set('name', file.name);
    params.set('size', `${file.size}`);
    params.set('currentChunkIndex', `${currentChunkIndex}`);
    params.set('totalChunks', `${Math.ceil(file.size / chunkSize)}`);
    const headers = {'Content-Type': 'application/octet-stream'};
    const url = 'http://localhost:4001/upload?'+params.toString();
    axios.post(url, data, {headers})
      .then(response => {
        const file = files[currentFileIndex!];
        const filesize = files[currentFileIndex!].size;
        const chunks = Math.ceil(filesize / chunkSize) - 1;
        const isLastChunk = currentChunkIndex === chunks;
        if (isLastChunk) {
          file.finalFilename = response.data.finalFilename;
          console.log(response,file)
          setLastUploadedFileIndex(currentFileIndex);
          setCurrentChunkIndex(null);
        } else {
          setCurrentChunkIndex(currentChunkIndex! + 1);
        }
      });
  }

  useEffect(() => {
    if (lastUploadedFileIndex === null) {
      return;
    }
    const isLastFile = lastUploadedFileIndex === files.length - 1;
    const nextFileIndex = isLastFile ? null : currentFileIndex! + 1;
    setCurrentFileIndex(nextFileIndex);
  }, [lastUploadedFileIndex]);

  useEffect(() => {
    if (files.length > 0) {
      if (currentFileIndex === null) {
        setCurrentFileIndex(
          lastUploadedFileIndex === null ? 0 : lastUploadedFileIndex + 1
        );
      }
    }
  }, [files.length]);

  useEffect(() => {
    if (currentFileIndex !== null) {
      setCurrentChunkIndex(0);
    }
  }, [currentFileIndex]);

  useEffect(() => {
    if (currentChunkIndex !== null) {
      readAndUploadCurrentChunk();
    }
  }, [currentChunkIndex]);


  return (
    <div className="main">
      <div>
        <div
          className={"container " + (dropZonActive ? "active" : "")}
          onDragOver={(e) => {
            setDropZonActive(true);
            e.preventDefault();
          }}
          onDragLeave={(e) => {
            setDropZonActive(false);
            e.preventDefault();
          }}
          onDrop={handleDrop}
        >
          drop your file here
        </div>
        <div className="files">
        {files.map((file,fileIndex) => {
          let progress = 0;
          if (file.finalFilename) {
            progress = 100;
          } else {
            const uploading = fileIndex === currentFileIndex;
            const chunks = Math.ceil(file.size / chunkSize);
            if (uploading) {
              progress = Math.round(currentChunkIndex! / chunks * 100);
            } else {
              progress = 0;
            }
          }
          return (
            <a className="file" target="_blank"
               href={'http://localhost:4001/uploads/'+file.finalFilename}>
              <div className="name">{file.name}</div>
              <div className={"progress " + (progress === 100 ? 'done' : '')}
                   style={{width:progress+'%'}}>{progress}%</div>
            </a>
          );
        })}
      </div>
      </div>
    </div>
  );
}

export default App;

// src/UploadComponent.tsx
import React, { useState } from 'react';
import axios from 'axios';

const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB

const UploadComponent: React.FC = () => {
    const [uploadProgress, setUploadProgress] = useState(0);

    const uploadFile = async (file: File) => {
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
        const fileId = `${file.name}-${Date.now()}`;

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const chunk = file.slice(start, end);

            const formData = new FormData();
            formData.append('chunk', chunk);
            formData.append('chunkIndex', chunkIndex.toString());
            formData.append('totalChunks', totalChunks.toString());
            formData.append('fileId', fileId);

            await axios.post('http://localhost:4001/upload', formData, {
                headers: {
                    'Content-Type': 'application/octet-stream',
                },
                onUploadProgress: (progressEvent) => {
                    const progress = Math.round((chunkIndex / totalChunks) * 100);
                    setUploadProgress(progress);
                    console.log(progressEvent)
                },
            });
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <div>Upload Progress: {uploadProgress}%</div>
        </div>
    );
};

export default UploadComponent;

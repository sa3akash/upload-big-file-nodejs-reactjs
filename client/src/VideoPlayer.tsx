import React, { useRef, useEffect, useState } from 'react';

const VideoPlayer = ({ videoUrl }) => {
  const videoRef = useRef(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const handleProgress = () => {
      const video = videoRef.current;
      if (video) {
        const buffered = video.buffered;
        if (buffered.length > 0) {
          const bufferedEnd = buffered.end(buffered.length - 1);
          if (bufferedEnd >= video.duration) {
            setLoaded(true);
          }
        }
      }
    };

    const video = videoRef.current;
    if (video) {
      video.addEventListener('progress', handleProgress);
    }

    return () => {
      if (video) {
        video.removeEventListener('progress', handleProgress);
      }
    };
  }, [videoUrl]);

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      width={1200}
      height={600}
      controls
      preload="auto"
    />
  );
};

export default VideoPlayer;

import React, { useRef, useState } from 'react';
import axios from 'axios';

function App() {
  const fileInputRef = useRef(null);
  const [caption, setCaption] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState('');
  const [captionMode, setCaptionMode] = useState('consistent');
  const [uploadedImage, setUploadedImage] = useState(null);
  const [lastProcessedImage, setLastProcessedImage] = useState(null);
  const abortControllerRef = useRef(null);
  const isProcessingRef = useRef(false);

  const captionModeOptions = [
    { value: 'consistent', label: 'Consistent caption (beam search, width 5)' },
    { value: 'safe_diverse', label: 'Safe diverse caption' },
    { value: 'balanced_diverse', label: 'Balanced diverse captions' },
    { value: 'creative_diverse', label: 'Creative diverse caption' },
  ];

  const processImage = async (imageBase64) => {
    if (isProcessingRef.current) return;

    setLastProcessedImage(imageBase64);
    setIsProcessing(true);
    isProcessingRef.current = true;
    setError('');

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    try {
      const response = await axios.post(
        '/process', // <--- RELATIVE PATH: Critical for Docker/Production
        {
          image_base64: imageBase64,
          caption_mode: captionMode,
        },
        { 
          signal: abortControllerRef.current.signal,
          timeout: 45000 // Increased timeout for slower CPU inference
        }
      );

      const newCaption = response.data.caption;
      
      if (newCaption) {
        setCaption(newCaption);
        window.speechSynthesis.cancel();
        
        setTimeout(() => {
          const utterance = new SpeechSynthesisUtterance(newCaption);
          window.speechSynthesis.speak(utterance);
        }, 100);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.code === 'ERR_CANCELED') return;
      setError(err.response?.data?.error || err.message || 'Processing failed');
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result;
      setUploadedImage(base64String);
      processImage(base64String);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div style={{ textAlign: 'center', padding: '20px', fontFamily: 'system-ui, sans-serif' }}>
      <h1>AI Image Captioning</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <select
          value={captionMode}
          onChange={(e) => setCaptionMode(e.target.value)}
          style={{ padding: '10px', borderRadius: '8px', minWidth: '300px' }}
        >
          {captionModeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div style={{ display: 'inline-block', position: 'relative', borderRadius: '8px', overflow: 'hidden', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', marginBottom: '20px', backgroundColor: '#f3f4f6' }}>
        <div style={{ width: '640px', height: '480px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #d1d5db' }}>
          {uploadedImage ? (
            <img src={uploadedImage} alt="Uploaded" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
          ) : (
            <p>📷 No image selected</p>
          )}
        </div>
        {isProcessing && (
          <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'black', color: 'white', padding: '5px 10px', borderRadius: '4px' }}>
            AI is thinking...
          </div>
        )}
      </div>

      <div>
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
        <button onClick={() => fileInputRef.current?.click()} style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}>
          {uploadedImage ? 'Change Photo' : 'Upload Photo'}
        </button>
      </div>

      <h2 style={{ marginTop: '30px', color: error ? '#ef4444' : '#1f2937' }}>
        {error ? `Error: ${error}` : caption ? `Caption: ${caption}` : 'Upload an image to start'}
      </h2>
    </div>
  );
}

export default App;

import { useState } from 'react';
import './App.css';

function App() {
  // State variables
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState('');

  // Your deployed Azure Function URL
  const API_URL = 'https://qr-fn-goud-chekhahxhth3gdc7.eastasia-01.azurewebsites.net/api/generateQR';

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setQrData(null);

    if (!url.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    setLoading(true);

    try {
      // Use POST with JSON body instead of GET
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url })
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      console.log('Response data:', data);
      setQrData(data);
    } catch (err) {
      setError(err.message || 'Failed to generate QR code');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Handle download
  const handleDownload = async () => {
    if (!qrData || !qrData.qrUrl) return;

    try {
      const response = await fetch(qrData.qrUrl);
      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `qr-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(link.href);
    } catch (err) {
      setError('Failed to download QR code');
      console.error('Download error:', err);
    }
  };

  // Handle copy URL
  const handleCopyUrl = () => {
    if (qrData && qrData.qrUrl) {
      navigator.clipboard.writeText(qrData.qrUrl);
      alert('QR URL copied to clipboard!');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>🔗 QR Code Generator</h1>
        <p className="subtitle">Convert any URL into a QR code instantly</p>

        {/* Error Display */}
        {error && <div className="error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Enter URL:</label>
            <input
              type="url"
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </form>

        {/* Loading Spinner */}
        {loading && (
          <div className="loading">
            <div className="spinner"></div>
            <p>Generating your QR code...</p>
          </div>
        )}

        {/* QR Code Display */}
        {qrData && !loading && (
          <div className="result">
            <h2>Your QR Code</h2>
            <img src={qrData.qrUrl} alt="Generated QR Code" className="qr-image" />
            <p className="timestamp">
              Generated: {new Date(qrData.generatedAt).toLocaleString()}
            </p>
            
            <div className="button-group">
              <button onClick={handleDownload} className="btn-download">
                ⬇️ Download
              </button>
              <button onClick={handleCopyUrl} className="btn-copy">
                📋 Copy URL
              </button>
            </div>

            <div className="qr-url">
              <p className="label">Blob URL:</p>
              <a href={qrData.qrUrl} target="_blank" rel="noopener noreferrer">
                {qrData.qrUrl.substring(0, 50)}...
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
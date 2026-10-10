import { useEffect, useRef, useState } from 'react';
import './App.css';

function App() {
  // State variables
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [qrData, setQrData] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  // Download/copy problems are shown in the result card, next to the buttons,
  // so they never change the size of the form card.
  const [actionError, setActionError] = useState('');
  const resultRef = useRef(null);

  // On phones the cards stack and the result sits below the form, so bring
  // the new QR code into view once it's ready.
  useEffect(() => {
    if (qrData && window.innerWidth <= 860) {
      resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [qrData]);

  // `npm run dev` reads VITE_API_URL from .env.development; production builds
  // fall back to the deployed function. The function's CORS list decides
  // which sites may call it (the live site, plus localhost for testing).
  const API_URL =
    import.meta.env.VITE_API_URL ||
    'https://qr-fn-goud-chekhahxhth3gdc7.eastasia-01.azurewebsites.net/api/generateQR';

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionError('');
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
    setActionError('');

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
      // Usually the storage account's CORS rules not allowing this site
      setActionError('download');
      console.error('Download error:', err);
    }
  };

  // Handle copy URL
  const handleCopyUrl = async () => {
    if (!qrData || !qrData.qrUrl) return;
    try {
      await navigator.clipboard.writeText(qrData.qrUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setActionError('copy');
      console.error('Copy error:', err);
    }
  };

  // The result card appears as soon as generation starts, so the layout
  // switches to two columns once instead of jumping again when the QR loads.
  const showResult = loading || qrData;

  return (
    <div className={`container${showResult ? ' has-result' : ''}`}>
      {/* Left card: the form */}
      <div className="card form-card">
        <div className="brand">
          <span className="logo"><QrIcon /></span>
          <h1>QR Code Generator</h1>
        </div>
        <p className="subtitle">Turn any link into a QR code you can download or share.</p>

        {/* Error Display */}
        {error && <div className="error">{error}</div>}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="url">Website URL</label>
            <input
              type="url"
              id="url"
              placeholder="https://example.com"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Generating...' : 'Generate QR Code'}
          </button>
        </form>

        <div className="how-it-works">
          <p className="steps-title">How it works</p>
          <ol className="steps">
            <li><span className="step-num">1</span>Paste any website link</li>
            <li><span className="step-num">2</span>Generate your QR code in seconds</li>
            <li><span className="step-num">3</span>Download the image or copy its link</li>
            <li><span className="step-num">4</span>Saved permanently, so your QR code never expires</li>
          </ol>
        </div>

        <p className="footer-note">
          Built by Charan with Azure Functions + Blob Storage ·{' '}
          <a href="https://github.com/charangoud2004/qr-as-a-service" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </p>
      </div>

      {/* Right card: loading spinner, then the QR code and its actions */}
      {showResult && (
        <div className="card result-card" ref={resultRef}>
          {loading ? (
            <div className="loading">
              <div className="spinner"></div>
              <p>Generating your QR code...</p>
            </div>
          ) : (
            <>
              <h2>Your QR Code</h2>
              <div className="qr-frame">
                <img src={qrData.qrUrl} alt="Generated QR code" className="qr-image" />
              </div>
              <p className="timestamp">
                Generated {new Date(qrData.generatedAt).toLocaleString()}
              </p>

              <div className="button-group">
                <button onClick={handleDownload} className="btn-primary">
                  <DownloadIcon /> Download PNG
                </button>
                <button onClick={handleCopyUrl} className="btn-secondary">
                  {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy link</>}
                </button>
              </div>

              {actionError === 'download' && (
                <p className="action-error">
                  Couldn't download the file.{' '}
                  <a href={qrData.qrUrl} target="_blank" rel="noopener noreferrer">Open the image</a>{' '}
                  and save it instead.
                </p>
              )}
              {actionError === 'copy' && (
                <p className="action-error">Couldn't copy the link. Copy it from the box below.</p>
              )}

              <div className="qr-url">
                <p className="link-label">Shareable link</p>
                <a href={qrData.qrUrl} target="_blank" rel="noopener noreferrer" title={qrData.qrUrl}>
                  {qrData.qrUrl}
                </a>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Small inline icons (stroke follows the text colour)
const iconProps = {
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
};

function QrIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14h3v3h-3z M20 20h1 M17 20h.01 M20 14v3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg {...iconProps}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function CopyIcon() {
  return (
    <svg {...iconProps}>
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

export default App;
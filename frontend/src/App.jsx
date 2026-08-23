// App.jsx
import { useState, useMemo, useRef, useEffect } from "react";
import "./App.css";

const API_URL = "https://cureai-backend-v4f8.onrender.com";

function App() {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("rank");

  const dragCounter = useRef(0);

  const addFiles = (incoming) => {
    const combined = [...files, ...incoming];

    setError("");
    setResults([]);
    setSelectedResult(null);

    if (combined.length > 20) {
      setError("Please select a maximum of 20 X-ray images.");
      setFiles(combined.slice(0, 20));
      return;
    }

    setFiles(combined);
  };

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);

    setError("");
    setResults([]);
    setSelectedResult(null);

    if (selectedFiles.length > 20) {
      setError("Please select a maximum of 20 X-ray images.");
      setFiles(selectedFiles.slice(0, 20));
      return;
    }

    setFiles(selectedFiles);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((currentFiles) =>
      currentFiles.filter((_, i) => i !== index)
    );

    setResults([]);
    setSelectedResult(null);
  };

  const clearAll = () => {
    setFiles([]);
    setResults([]);
    setSelectedResult(null);
    setError("");
    setSearch("");
  };

  // Drag & drop — purely an alternate input path into the same file list
  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current -= 1;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setDragActive(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setDragActive(false);

    const dropped = Array.from(e.dataTransfer.files || []).filter((f) =>
      f.type.startsWith("image/")
    );

    if (dropped.length > 0) {
      addFiles(dropped);
    }
  };

  const analyzeXrays = async () => {
    if (files.length === 0) {
      setError("Please select at least one X-ray image.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSelectedResult(null);

    try {
      const formData = new FormData();

      files.forEach((file) => {
        formData.append("files", file);
      });

      const response = await fetch(`${API_URL}/predict-batch`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server error while analyzing X-rays.");
      }

      const data = await response.json();

      if (data.error) {
        throw new Error(data.error);
      }

      setResults(data.results || []);

      if (data.results && data.results.length > 0) {
        setSelectedResult(data.results[0]);
      }
    } catch (err) {
      setError(
        err.message ||
          "Could not connect to CureAI backend."
      );
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = (filename) => {
    const file = files.find(
      (item) => item.name === filename
    );

    if (!file) return "";

    return URL.createObjectURL(file);
  };

  const highCount = results.filter(
    (item) => item.priority === "HIGH"
  ).length;

  const mediumCount = results.filter(
    (item) => item.priority === "MEDIUM"
  ).length;

  const lowCount = results.filter(
    (item) => item.priority === "LOW"
  ).length;

  const avgProbability = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce(
      (acc, r) => acc + (Number(r.pneumonia_probability) || 0),
      0
    );
    return (sum / results.length).toFixed(1);
  }, [results]);

  const visibleResults = useMemo(() => {
    let list = [...results];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.filename.toLowerCase().includes(q));
    }

    const priorityWeight = { HIGH: 0, MEDIUM: 1, LOW: 2 };

    switch (sortBy) {
      case "probability":
        list.sort(
          (a, b) => b.pneumonia_probability - a.pneumonia_probability
        );
        break;
      case "confidence":
        list.sort((a, b) => b.confidence - a.confidence);
        break;
      case "filename":
        list.sort((a, b) => a.filename.localeCompare(b.filename));
        break;
      case "priority":
        list.sort(
          (a, b) =>
            priorityWeight[a.priority] - priorityWeight[b.priority] ||
            b.pneumonia_probability - a.pneumonia_probability
        );
        break;
      default:
        list.sort((a, b) => a.rank - b.rank);
    }

    return list;
  }, [results, search, sortBy]);

  // Keyboard navigation through the result list
  useEffect(() => {
    const onKeyDown = (e) => {
      if (!results.length) return;
      if (e.target.tagName === "INPUT") return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;

      e.preventDefault();
      const idx = visibleResults.findIndex(
        (r) => r.filename === selectedResult?.filename
      );
      let nextIdx = idx;

      if (e.key === "ArrowDown") nextIdx = Math.min(idx + 1, visibleResults.length - 1);
      if (e.key === "ArrowUp") nextIdx = Math.max(idx - 1, 0);

      if (visibleResults[nextIdx]) {
        setSelectedResult(visibleResults[nextIdx]);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleResults, selectedResult]);

  const exportCsv = () => {
    if (!results.length) return;

    const header = [
      "rank",
      "filename",
      "prediction",
      "pneumonia_probability",
      "confidence",
      "priority",
      "priority_score",
    ];

    const rows = results
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((r) => header.map((key) => r[key]).join(","));

    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "cureai-results.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => {
    window.print();
  };

  // Semi-circular probability gauge, arc drawn from the raw percentage
  const Gauge = ({ value, priority }) => {
    const clamped = Math.max(0, Math.min(100, Number(value) || 0));
    const angle = (clamped / 100) * 180;
    const radius = 50;
    const cx = 59;
    const cy = 64;

    const toRad = (deg) => (Math.PI / 180) * deg;
    const endX = cx - radius * Math.cos(toRad(angle));
    const endY = cy - radius * Math.sin(toRad(angle));
    const largeArc = angle > 180 ? 1 : 0;

    const colorVar =
      priority === "HIGH"
        ? "var(--high)"
        : priority === "MEDIUM"
        ? "var(--medium)"
        : "var(--low)";

    return (
      <svg
        className="gauge-figure"
        viewBox="0 0 118 74"
        role="img"
        aria-label={`Pneumonia probability ${clamped}%`}
      >
        <path
          d="M 9 64 A 50 50 0 0 1 109 64"
          fill="none"
          stroke="var(--border)"
          strokeWidth="9"
          strokeLinecap="round"
        />
        <path
          d={`M 9 64 A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
          fill="none"
          stroke={colorVar}
          strokeWidth="9"
          strokeLinecap="round"
        />
      </svg>
    );
  };

  return (
    <div className="app">

      {/* HEADER */}
      <header className="header">
        <div className="brand">
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h4l1 3h6l1-3h4v16a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4Z" />
              <path d="M9 12h6M12 9v6" />
            </svg>
          </div>
          <div>
            <h1>CuraAI</h1>
            <p>AI-Powered Chest X-ray Priority Screening</p>
          </div>
        </div>

        <div className="header-right">
          <div className="header-badge">
            <span className="dot" />
            <span className="label">Deep Learning</span> Model Active
          </div>
        </div>
      </header>

      <main className="container">

        {/* INTRO */}
        <section className="intro">
          <span className="eyebrow">Triage Console</span>
          <h2>Chest X-ray Analysis</h2>

          <p>
            Upload chest X-rays. CuraAI analyzes
            them using a deep-learning model and ranks
            images according to their estimated pneumonia
            probability.
          </p>
        </section>

        {/* UPLOAD CARD */}
        <section
          className={`upload-card ${dragActive ? "drag-active" : ""}`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >

          <div className="upload-icon">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
              <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
            </svg>
          </div>

          <h2>Upload Chest X-rays</h2>

          <p>
            Select X-ray images for analysis, or drag and drop them here.
          </p>

          <label className="upload-button">
            <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Select X-ray Images
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
            />
          </label>

          <div className="upload-hint">JPG · PNG · DICOM-exported images </div>

          {files.length > 0 && (
            <p className="file-count">
              {files.length} image
              {files.length !== 1 ? "s" : ""} selected
            </p>
          )}

          {error && (
            <div className="error" role="alert">
              <span>⚠</span>
              <span>{error}</span>
            </div>
          )}

          {files.length > 0 && (
            <div className="selected-files">

              {files.map((file, index) => (
                <div
                  className="selected-file"
                  key={`${file.name}-${index}`}
                >
                  <img
                    src={URL.createObjectURL(file)}
                    alt={file.name}
                  />

                  <div className="file-info">
                    <span>
                      {file.name}
                    </span>

                    <small>
                      {(file.size / 1024).toFixed(0)} KB
                    </small>
                  </div>

                  <button
                    className="remove-button"
                    onClick={() => removeFile(index)}
                    aria-label={`Remove ${file.name}`}
                  >
                    ×
                  </button>
                </div>
              ))}

            </div>
          )}

          <div className="upload-actions">
            <button
              className="analyze-button"
              onClick={analyzeXrays}
              disabled={loading || files.length === 0}
            >
              {loading && <span className="spin-icon" />}
              {loading
                ? "Analyzing X-rays..."
                : "Analyze X-rays"}
            </button>

            {files.length > 0 && !loading && (
              <button className="clear-button" onClick={clearAll}>
                Clear All
              </button>
            )}
          </div>

        </section>

        {/* LOADING */}
        {loading && (
          <section className="loading-card">
            <div className="scanner"></div>

            <h3>Analyzing X-rays</h3>

            <p>
              CuraAI is processing your images using
              the deep-learning model.
            </p>

            <div className="loading-progress">
              PROCESSING {files.length} IMAGE{files.length !== 1 ? "S" : ""}…
            </div>
          </section>
        )}

        {/* RESULTS */}
        {results.length > 0 && !loading && (
          <>
            {/* SUMMARY */}
            <section className="summary-section">

              <div className="section-title">
                <div>
                  <h2>Analysis Summary</h2>
                  <p>
                    Images are ranked by pneumonia probability.
                  </p>
                </div>

                <div className="section-actions">
                  <button className="ghost-button" onClick={exportCsv}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
                      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
                    </svg>
                    Export CSV
                  </button>
                  <button className="ghost-button" onClick={printReport}>
                    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2" />
                      <path d="M6 14h12v7H6z" />
                    </svg>
                    Print Report
                  </button>
                </div>
              </div>

              <div className="summary-grid">

                <div className="summary-card total">
                  <span>Total Analyzed</span>
                  <strong>{results.length}</strong>
                </div>

                <div className="summary-card high">
                  <span>High Priority</span>
                  <strong>{highCount}</strong>
                </div>

                <div className="summary-card medium">
                  <span>Medium Priority</span>
                  <strong>{mediumCount}</strong>
                </div>

                <div className="summary-card low">
                  <span>Low Priority</span>
                  <strong>{lowCount}</strong>
                </div>

                <div className="summary-card avg">
                  <span>Avg. Probability</span>
                  <strong>{avgProbability}%</strong>
                </div>

              </div>
            </section>

            {/* CONTROLS */}
            <div className="controls-bar">
              <div className="search-field">
                <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by filename…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>

              <div className="sort-group">
                {[
                  { key: "rank", label: "Rank" },
                  { key: "priority", label: "Priority" },
                  { key: "probability", label: "Probability" },
                  { key: "confidence", label: "Confidence" },
                  { key: "filename", label: "Name" },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    className={`sort-chip ${sortBy === opt.key ? "active" : ""}`}
                    onClick={() => setSortBy(opt.key)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* MAIN RESULTS */}
            <section className="results-layout">

              {/* LIST */}
              <div className="results-list">

                {visibleResults.length === 0 && (
                  <div className="no-results">
                    No images match “{search}”.
                  </div>
                )}

                {visibleResults.map((result) => (
                  <button
                    className={`result-card ${
                      selectedResult?.filename ===
                      result.filename
                        ? "selected"
                        : ""
                    }`}
                    key={result.filename}
                    onClick={() =>
                      setSelectedResult(result)
                    }
                  >

                    <img
                      className="result-thumbnail"
                      src={getPreviewUrl(
                        result.filename
                      )}
                      alt={result.filename}
                    />

                    <div className="rank">
                      #{result.rank}
                    </div>

                    <div className="result-main">

                      <strong>
                        {result.filename}
                      </strong>

                      <div className="result-details">
                        <span>
                          {result.prediction}
                        </span>

                        <span>
                          {result.pneumonia_probability}%
                          pneumonia probability
                        </span>
                      </div>

                    </div>

                    <div
                      className={`priority ${
                        result.priority.toLowerCase()
                      }`}
                    >
                      {result.priority}
                    </div>

                  </button>
                ))}

              </div>

              {/* DETAIL PANEL */}
              {selectedResult && (
                <div className="detail-card">

                  <div className="detail-header">
                    <div>
                      <span>
                        RANK #{selectedResult.rank}
                      </span>

                      <h2>
                        X-ray Analysis
                      </h2>
                    </div>

                    <div
                      className={`priority large ${
                        selectedResult.priority.toLowerCase()
                      }`}
                    >
                      {selectedResult.priority}
                    </div>
                  </div>

                  <img
                    className="large-xray"
                    src={getPreviewUrl(
                      selectedResult.filename
                    )}
                    alt="Selected chest X-ray"
                  />

                  <h3>
                    {selectedResult.filename}
                  </h3>

                  <div className="gauge-wrap">
                    <div className="gauge-figure-wrap">
                      <Gauge
                        value={selectedResult.pneumonia_probability}
                        priority={selectedResult.priority}
                      />
                      <div className="gauge-value">
                        {selectedResult.pneumonia_probability}%
                        <span className="gauge-label">Pneumonia risk</span>
                      </div>
                    </div>

                    <div className="gauge-meta">
                      <div className="gauge-pred">
                        {selectedResult.prediction}
                      </div>
                      <div className="gauge-conf">
                        MODEL CONFIDENCE {selectedResult.confidence}%
                      </div>
                    </div>
                  </div>

                  <div className="analysis-box">

                    <div>
                      <span>Prediction</span>
                      <strong>
                        {selectedResult.prediction}
                      </strong>
                    </div>

                    <div>
                      <span>Pneumonia Probability</span>
                      <strong>
                        {selectedResult.pneumonia_probability}%
                      </strong>
                    </div>

                    <div>
                      <span>Model Confidence</span>
                      <strong>
                        {selectedResult.confidence}%
                      </strong>
                    </div>

                    <div>
                      <span>Priority Score</span>
                      <strong>
                        {selectedResult.priority_score}
                      </strong>
                    </div>

                  </div>

                  <div className={`interpretation ${selectedResult.priority.toLowerCase()}`}>

                    <h3>
                      What does this mean?
                    </h3>

                    {selectedResult.priority ===
                      "HIGH" && (
                      <p>
                        This image has a high estimated
                        pneumonia probability and should
                        be considered for earlier clinical
                        review.
                      </p>
                    )}

                    {selectedResult.priority ===
                      "MEDIUM" && (
                      <p>
                        This image has an intermediate
                        estimated pneumonia probability
                        and may require clinical review.
                      </p>
                    )}

                    {selectedResult.priority ===
                      "LOW" && (
                      <p>
                        This image has a lower estimated
                        pneumonia probability compared
                        with the other uploaded images.
                      </p>
                    )}

                  </div>

                  <div className="detail-footer">
                    <button className="ghost-button" onClick={printReport}>
                      Print this report
                    </button>
                  </div>

                </div>
              )}

            </section>

            {/* DISCLAIMER */}
            <section className="disclaimer">
              <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4M12 17h.01" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
              <span>
                <strong>Important:</strong> CuraAI is a
                clinical decision-support prototype. It does
                not replace professional medical diagnosis.
                Results should be reviewed by a qualified
                healthcare professional.
              </span>
            </section>

          </>
        )}

      </main>

      <footer>
        CuraAI • AI-assisted healthcare technology
      </footer>

    </div>
  );
}

export default App;

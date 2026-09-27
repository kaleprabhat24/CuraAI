// // App.jsx
// import { useState, useMemo, useRef, useEffect } from "react";
// import "./App.css";

// // ============================================================
// // BACKEND CONTRACT — UNCHANGED
// // Endpoint, request shape, and response field names are exactly
// // what the existing model/API already returns. Nothing here
// // renames or recalculates backend output — the UI only relabels
// // how the same numbers are presented.
// //
// //   POST {API_URL}/predict-batch   (multipart "files")
// //   -> { results: [{ filename, rank, prediction,
// //                     pneumonia_probability, confidence,
// //                     priority, priority_score }], error? }
// // ============================================================
// const API_URL = "http://127.0.0.1:8000";

// const NAV_ITEMS = [
//   { key: "dashboard", label: "Dashboard" },
//   { key: "batch", label: "Batch Analysis" },
//   { key: "queue", label: "Priority Queue" },
//   { key: "analytics", label: "Analytics" },
//   { key: "history", label: "History" },
//   { key: "system", label: "System Information" },
// ];

// // Visual-only priority tier, derived from the model's existing
// // output. This never changes result.priority or result.priority_score —
// // it only adds a presentation label (Critical is a sub-split of the
// // backend's own HIGH tier at the top of its range).
// function getPriorityTier(result) {
//   const score = Number(result.pneumonia_probability) || 0;
//   if (result.priority === "HIGH" && score >= 90) return "CRITICAL";
//   if (result.priority === "HIGH") return "HIGH";
//   if (result.priority === "MEDIUM") return "MODERATE";
//   return "LOW";
// }

// function tierLabel(tier) {
//   return (
//     { CRITICAL: "Critical", HIGH: "High", MODERATE: "Moderate", LOW: "Low" }[
//       tier
//     ] || tier
//   );
// }

// // Stable, human-readable case identifier derived from the backend's
// // own rank field — not a fabricated value.
// function caseId(result) {
//   return `XR-${1000 + Number(result.rank || 0)}`;
// }

// function App() {
//   const [activeView, setActiveView] = useState("dashboard");

//   const [files, setFiles] = useState([]);
//   const [results, setResults] = useState([]);
//   const [selectedResult, setSelectedResult] = useState(null);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");
//   const [dragActive, setDragActive] = useState(false);

//   const [search, setSearch] = useState("");
//   const [sortBy, setSortBy] = useState("score-desc");
//   const [tierFilter, setTierFilter] = useState("ALL");
//   const [reviewed, setReviewed] = useState({}); // { filename: true } — local review-status toggle

//   const [sidebarOpen, setSidebarOpen] = useState(false);
//   const dragCounter = useRef(0);

//   // ------------------------------------------------------------
//   // File selection (unchanged behavior, only relabeled copy)
//   // ------------------------------------------------------------

//   const addFiles = (incoming) => {
//     const combined = [...files, ...incoming];
//     setError("");
//     setResults([]);
//     setSelectedResult(null);

//     if (combined.length > 20) {
//       setError("Please select a maximum of 20 medical images.");
//       setFiles(combined.slice(0, 20));
//       return;
//     }
//     setFiles(combined);
//   };

//   const handleFileChange = (event) => {
//     const selectedFiles = Array.from(event.target.files);
//     setError("");
//     setResults([]);
//     setSelectedResult(null);

//     if (selectedFiles.length > 20) {
//       setError("Please select a maximum of 20 medical images.");
//       setFiles(selectedFiles.slice(0, 20));
//       return;
//     }
//     setFiles(selectedFiles);
//     event.target.value = "";
//   };

//   const removeFile = (index) => {
//     setFiles((cur) => cur.filter((_, i) => i !== index));
//     setResults([]);
//     setSelectedResult(null);
//   };

//   const clearAll = () => {
//     setFiles([]);
//     setResults([]);
//     setSelectedResult(null);
//     setError("");
//     setSearch("");
//   };

//   const handleDragEnter = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     dragCounter.current += 1;
//     if (e.dataTransfer.items?.length > 0) setDragActive(true);
//   };
//   const handleDragLeave = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     dragCounter.current -= 1;
//     if (dragCounter.current <= 0) {
//       dragCounter.current = 0;
//       setDragActive(false);
//     }
//   };
//   const handleDragOver = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//   };
//   const handleDrop = (e) => {
//     e.preventDefault();
//     e.stopPropagation();
//     dragCounter.current = 0;
//     setDragActive(false);
//     const dropped = Array.from(e.dataTransfer.files || []).filter((f) =>
//       f.type.startsWith("image/")
//     );
//     if (dropped.length > 0) addFiles(dropped);
//   };

//   // ------------------------------------------------------------
//   // Analysis call — request/response handling is unchanged
//   // ------------------------------------------------------------

//   const analyzeImages = async () => {
//     if (files.length === 0) {
//       setError("Please select at least one medical image.");
//       return;
//     }

//     setLoading(true);
//     setError("");
//     setResults([]);
//     setSelectedResult(null);

//     try {
//       const formData = new FormData();
//       files.forEach((file) => formData.append("files", file));

//       const response = await fetch(`${API_URL}/predict-batch`, {
//         method: "POST",
//         body: formData,
//       });

//       if (!response.ok) {
//         throw new Error("Server error while analyzing images.");
//       }

//       const data = await response.json();
//       if (data.error) throw new Error(data.error);

//       const list = data.results || [];
//       setResults(list);
//       setReviewed({});
//       if (list.length > 0) {
//         setSelectedResult(list[0]);
//         setActiveView("queue");
//       }
//     } catch (err) {
//       setError(err.message || "Could not connect to the analysis backend.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const getPreviewUrl = (filename) => {
//     const file = files.find((f) => f.name === filename);
//     return file ? URL.createObjectURL(file) : "";
//   };

//   // ------------------------------------------------------------
//   // Derived stats — always computed from actual `results`
//   // ------------------------------------------------------------

//   const tierCounts = useMemo(() => {
//     const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
//     results.forEach((r) => {
//       counts[getPriorityTier(r)] += 1;
//     });
//     return counts;
//   }, [results]);

//   const avgScore = useMemo(() => {
//     if (results.length === 0) return 0;
//     const sum = results.reduce(
//       (acc, r) => acc + (Number(r.pneumonia_probability) || 0),
//       0
//     );
//     return sum / results.length / 100;
//   }, [results]);

//   const analyzedCount = results.length;
//   const failedCount = Math.max(0, files.length - results.length);

//   const reviewedCount = useMemo(
//     () => Object.values(reviewed).filter(Boolean).length,
//     [reviewed]
//   );

//   const scoreBuckets = useMemo(() => {
//     const buckets = [
//       { label: "0–25%", min: 0, max: 25, count: 0 },
//       { label: "25–50%", min: 25, max: 50, count: 0 },
//       { label: "50–75%", min: 50, max: 75, count: 0 },
//       { label: "75–100%", min: 75, max: 101, count: 0 },
//     ];
//     results.forEach((r) => {
//       const s = Number(r.pneumonia_probability) || 0;
//       const b = buckets.find((bk) => s >= bk.min && s < bk.max);
//       if (b) b.count += 1;
//     });
//     return buckets;
//   }, [results]);

//   const visibleResults = useMemo(() => {
//     let list = [...results];

//     if (tierFilter === "PENDING") {
//       list = list.filter((r) => !reviewed[r.filename]);
//     } else if (tierFilter === "REVIEWED") {
//       list = list.filter((r) => reviewed[r.filename]);
//     } else if (tierFilter !== "ALL") {
//       list = list.filter((r) => getPriorityTier(r) === tierFilter);
//     }

//     if (search.trim()) {
//       const q = search.trim().toLowerCase();
//       list = list.filter(
//         (r) =>
//           r.filename.toLowerCase().includes(q) ||
//           caseId(r).toLowerCase().includes(q)
//       );
//     }

//     switch (sortBy) {
//       case "score-asc":
//         list.sort((a, b) => a.pneumonia_probability - b.pneumonia_probability);
//         break;
//       case "newest":
//         list.sort((a, b) => a.rank - b.rank);
//         break;
//       case "oldest":
//         list.sort((a, b) => b.rank - a.rank);
//         break;
//       case "score-desc":
//       default:
//         list.sort((a, b) => b.pneumonia_probability - a.pneumonia_probability);
//     }

//     return list;
//   }, [results, search, sortBy, tierFilter, reviewed]);

//   useEffect(() => {
//     const onKeyDown = (e) => {
//       if (activeView !== "queue" || !results.length) return;
//       if (e.target.tagName === "INPUT") return;
//       if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
//       e.preventDefault();
//       const idx = visibleResults.findIndex(
//         (r) => r.filename === selectedResult?.filename
//       );
//       let nextIdx = idx;
//       if (e.key === "ArrowDown") nextIdx = Math.min(idx + 1, visibleResults.length - 1);
//       if (e.key === "ArrowUp") nextIdx = Math.max(idx - 1, 0);
//       if (visibleResults[nextIdx]) setSelectedResult(visibleResults[nextIdx]);
//     };
//     window.addEventListener("keydown", onKeyDown);
//     return () => window.removeEventListener("keydown", onKeyDown);
//   }, [visibleResults, selectedResult, activeView, results.length]);

//   const toggleReviewed = (filename) => {
//     setReviewed((cur) => ({ ...cur, [filename]: !cur[filename] }));
//   };

//   // ------------------------------------------------------------
//   // Exports — same underlying fields, relabeled headers
//   // ------------------------------------------------------------

//   const exportCsv = () => {
//     if (!results.length) return;

//     const header = [
//       "case_id",
//       "filename",
//       "anomaly_score",
//       "confidence_percent",
//       "priority_level",
//       "priority_score",
//       "review_status",
//     ];

//     const rows = results
//       .slice()
//       .sort((a, b) => a.rank - b.rank)
//       .map((r) =>
//         [
//           caseId(r),
//           r.filename,
//           (Number(r.pneumonia_probability) / 100).toFixed(2),
//           r.confidence,
//           tierLabel(getPriorityTier(r)),
//           r.priority_score,
//           reviewed[r.filename] ? "Reviewed" : "Pending Review",
//         ].join(",")
//       );

//     const csv = [header.join(","), ...rows].join("\n");
//     const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
//     const url = URL.createObjectURL(blob);
//     const link = document.createElement("a");
//     link.href = url;
//     link.download = "medanomaly-priority-queue.csv";
//     link.click();
//     URL.revokeObjectURL(url);
//   };

//   const printReport = () => window.print();

//   // ------------------------------------------------------------
//   // Gauge (semi-circular anomaly-score dial)
//   // ------------------------------------------------------------

//   const Gauge = ({ score01, tier }) => {
//     const clamped = Math.max(0, Math.min(1, score01));
//     const angle = clamped * 180;
//     const radius = 50;
//     const cx = 59;
//     const cy = 64;
//     const toRad = (deg) => (Math.PI / 180) * deg;
//     const endX = cx - radius * Math.cos(toRad(angle));
//     const endY = cy - radius * Math.sin(toRad(angle));
//     const largeArc = angle > 180 ? 1 : 0;
//     const colorVar =
//       tier === "CRITICAL"
//         ? "var(--critical)"
//         : tier === "HIGH"
//         ? "var(--high)"
//         : tier === "MODERATE"
//         ? "var(--medium)"
//         : "var(--low)";

//     return (
//       <svg
//         className="gauge-figure"
//         viewBox="0 0 118 74"
//         role="img"
//         aria-label={`Anomaly score ${clamped.toFixed(2)}`}
//       >
//         <path
//           d="M 9 64 A 50 50 0 0 1 109 64"
//           fill="none"
//           stroke="var(--border)"
//           strokeWidth="9"
//           strokeLinecap="round"
//         />
//         <path
//           d={`M 9 64 A ${radius} ${radius} 0 ${largeArc} 1 ${endX} ${endY}`}
//           fill="none"
//           stroke={colorVar}
//           strokeWidth="9"
//           strokeLinecap="round"
//         />
//       </svg>
//     );
//   };

//   // ------------------------------------------------------------
//   // Shared bits
//   // ------------------------------------------------------------

//   const StatCard = ({ label, value, tone }) => (
//     <div className={`stat-card ${tone || ""}`}>
//       <span>{label}</span>
//       <strong>{value}</strong>
//     </div>
//   );

//   const EmptyState = ({ icon, title, body, action }) => (
//     <div className="empty-state">
//       <div className="empty-icon">{icon}</div>
//       <h3>{title}</h3>
//       <p>{body}</p>
//       {action}
//     </div>
//   );

//   const TierBadge = ({ tier, large }) => (
//     <span className={`tier-badge ${tier.toLowerCase()} ${large ? "large" : ""}`}>
//       {tierLabel(tier)}
//     </span>
//   );

//   // ------------------------------------------------------------
//   // Views
//   // ------------------------------------------------------------

//   const DashboardView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Overview</span>
//           <h2>Dashboard</h2>
//           <p className="view-desc">
//             Analyze medical images in batches, identify unusual patterns,
//             and prioritize cases for expert review.
//           </p>
//         </div>
//         <button className="primary-button" onClick={() => setActiveView("batch")}>
//           + New Batch Analysis
//         </button>
//       </div>

//       {results.length === 0 ? (
//         <EmptyState
//           icon={<IconLayers />}
//           title="No batch analyzed yet"
//           body="Run a batch analysis to populate your dashboard, priority queue and analytics with real results."
//           action={
//             <button className="primary-button" onClick={() => setActiveView("batch")}>
//               Go to Batch Analysis
//             </button>
//           }
//         />
//       ) : (
//         <>
//           <div className="stat-grid">
//             <StatCard label="Total Images Analyzed" value={analyzedCount} tone="accent" />
//             <StatCard label="Critical Priority Cases" value={tierCounts.CRITICAL} tone="critical" />
//             <StatCard label="High Priority Cases" value={tierCounts.HIGH} tone="high" />
//             <StatCard label="Moderate Priority Cases" value={tierCounts.MODERATE} tone="medium" />
//             <StatCard label="Low Priority Cases" value={tierCounts.LOW} tone="low" />
//             <StatCard label="Average Anomaly Score" value={avgScore.toFixed(2)} tone="muted" />
//           </div>

//           <div className="panel">
//             <div className="panel-head">
//               <h3>Most Recent Priority Cases</h3>
//               <button className="ghost-button" onClick={() => setActiveView("queue")}>
//                 View full queue →
//               </button>
//             </div>
//             <div className="mini-queue">
//               {results
//                 .slice()
//                 .sort((a, b) => b.pneumonia_probability - a.pneumonia_probability)
//                 .slice(0, 5)
//                 .map((r) => (
//                   <button
//                     key={r.filename}
//                     className="mini-row"
//                     onClick={() => {
//                       setSelectedResult(r);
//                       setActiveView("queue");
//                     }}
//                   >
//                     <span className="mini-case">{caseId(r)}</span>
//                     <span className="mini-name">{r.filename}</span>
//                     <span className="mini-score">
//                       {(r.pneumonia_probability / 100).toFixed(2)}
//                     </span>
//                     <TierBadge tier={getPriorityTier(r)} />
//                   </button>
//                 ))}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );

//   const BatchAnalysisView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Ingestion</span>
//           <h2>Batch Image Analysis</h2>
//           <p className="view-desc">
//             Upload multiple medical images to automatically calculate anomaly
//             scores and generate a prioritized review queue.
//           </p>
//         </div>
//       </div>

//       <section
//         className={`upload-card ${dragActive ? "drag-active" : ""}`}
//         onDragEnter={handleDragEnter}
//         onDragLeave={handleDragLeave}
//         onDragOver={handleDragOver}
//         onDrop={handleDrop}
//       >
//         <div className="upload-icon">
//           <IconUpload />
//         </div>
//         <h2>Upload Medical Images</h2>
//         <p>Select up to 20 images for analysis, or drag and drop them here.</p>

//         <label className="upload-button">
//           <IconPlus />
//           Select Images
//           <input type="file" accept="image/*" multiple onChange={handleFileChange} />
//         </label>

//         <div className="upload-hint">JPG · PNG · exported medical images — max 20 files</div>

//         {files.length > 0 && (
//           <p className="file-count">
//             {files.length} image{files.length !== 1 ? "s" : ""} queued
//           </p>
//         )}

//         {error && (
//           <div className="error" role="alert">
//             <span>⚠</span>
//             <span>{error}</span>
//           </div>
//         )}

//         {files.length > 0 && (
//           <div className="selected-files">
//             {files.map((file, index) => (
//               <div className="selected-file" key={`${file.name}-${index}`}>
//                 <img src={URL.createObjectURL(file)} alt={file.name} />
//                 <div className="file-info">
//                   <span>{file.name}</span>
//                   <small>{(file.size / 1024).toFixed(0)} KB</small>
//                 </div>
//                 <button
//                   className="remove-button"
//                   onClick={() => removeFile(index)}
//                   aria-label={`Remove ${file.name}`}
//                 >
//                   ×
//                 </button>
//               </div>
//             ))}
//           </div>
//         )}

//         <div className="upload-actions">
//           <button
//             className="analyze-button"
//             onClick={analyzeImages}
//             disabled={loading || files.length === 0}
//           >
//             {loading && <span className="spin-icon" />}
//             {loading ? "Analyzing Images..." : "Run Batch Analysis"}
//           </button>
//           {files.length > 0 && !loading && (
//             <button className="clear-button" onClick={clearAll}>
//               Clear All
//             </button>
//           )}
//         </div>
//       </section>

//       {loading && (
//         <section className="loading-card">
//           <div className="scanner"></div>
//           <h3>Processing Batch</h3>
//           <p>Calculating anomaly scores for each uploaded image.</p>
//           <div className="loading-progress">
//             PROCESSING {files.length} IMAGE{files.length !== 1 ? "S" : ""} — STATUS: RUNNING
//           </div>
//         </section>
//       )}

//       {!loading && results.length > 0 && (
//         <section className="panel batch-summary-panel">
//           <div className="panel-head">
//             <h3>Batch Analysis Complete</h3>
//           </div>
//           <div className="batch-summary-grid">
//             <div>
//               <span>Total Images</span>
//               <strong>{files.length}</strong>
//             </div>
//             <div>
//               <span>Successfully Analyzed</span>
//               <strong className="ok">{analyzedCount}</strong>
//             </div>
//             <div>
//               <span>Failed</span>
//               <strong className={failedCount > 0 ? "warn" : ""}>{failedCount}</strong>
//             </div>
//             <div>
//               <span>Critical</span>
//               <strong>{tierCounts.CRITICAL}</strong>
//             </div>
//             <div>
//               <span>High</span>
//               <strong>{tierCounts.HIGH}</strong>
//             </div>
//             <div>
//               <span>Moderate</span>
//               <strong>{tierCounts.MODERATE}</strong>
//             </div>
//             <div>
//               <span>Low</span>
//               <strong>{tierCounts.LOW}</strong>
//             </div>
//           </div>
//           <button className="primary-button" onClick={() => setActiveView("queue")}>
//             Open Priority Queue →
//           </button>
//         </section>
//       )}
//     </div>
//   );

//   const QueueView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Review</span>
//           <h2>AI Priority Queue</h2>
//           <p className="view-desc">
//             Cases are ranked by anomaly score — highest anomaly score
//             receives highest review priority.
//           </p>
//         </div>
//         {results.length > 0 && (
//           <div className="section-actions">
//             <button className="ghost-button" onClick={exportCsv}>
//               <IconDownload /> Export CSV
//             </button>
//             <button className="ghost-button" onClick={printReport}>
//               <IconPrint /> Print Report
//             </button>
//           </div>
//         )}
//       </div>

//       {results.length === 0 ? (
//         <EmptyState
//           icon={<IconQueue />}
//           title="Priority queue is empty"
//           body="Run a batch analysis to generate a ranked queue of cases for expert review."
//           action={
//             <button className="primary-button" onClick={() => setActiveView("batch")}>
//               Go to Batch Analysis
//             </button>
//           }
//         />
//       ) : (
//         <>
//           <div className="controls-bar">
//             <div className="search-field">
//               <IconSearch />
//               <input
//                 type="text"
//                 placeholder="Search by case ID or filename…"
//                 value={search}
//                 onChange={(e) => setSearch(e.target.value)}
//               />
//             </div>

//             <div className="filter-chip-row">
//               {[
//                 { key: "ALL", label: "All" },
//                 { key: "CRITICAL", label: "Critical" },
//                 { key: "HIGH", label: "High" },
//                 { key: "MODERATE", label: "Moderate" },
//                 { key: "LOW", label: "Low" },
//                 { key: "PENDING", label: "Pending Review" },
//                 { key: "REVIEWED", label: "Reviewed" },
//               ].map((f) => (
//                 <button
//                   key={f.key}
//                   className={`filter-chip ${tierFilter === f.key ? "active" : ""}`}
//                   onClick={() => setTierFilter(f.key)}
//                 >
//                   {f.label}
//                 </button>
//               ))}
//             </div>

//             <select
//               className="sort-select"
//               value={sortBy}
//               onChange={(e) => setSortBy(e.target.value)}
//             >
//               <option value="score-desc">Highest anomaly</option>
//               <option value="score-asc">Lowest anomaly</option>
//               <option value="newest">Newest</option>
//               <option value="oldest">Oldest</option>
//             </select>
//           </div>

//           <div className="results-layout">
//             <div className="results-list">
//               {visibleResults.length === 0 && (
//                 <div className="no-results">No cases match the current filters.</div>
//               )}

//               {/* table header, desktop only */}
//               {visibleResults.length > 0 && (
//                 <div className="queue-table-head">
//                   <span>Case</span>
//                   <span>Anomaly Score</span>
//                   <span>Priority</span>
//                   <span>Status</span>
//                   <span></span>
//                 </div>
//               )}

//               {visibleResults.map((result) => {
//                 const tier = getPriorityTier(result);
//                 const isReviewed = !!reviewed[result.filename];
//                 return (
//                   <div
//                     className={`result-card ${
//                       selectedResult?.filename === result.filename ? "selected" : ""
//                     }`}
//                     key={result.filename}
//                   >
//                     <img
//                       className="result-thumbnail"
//                       src={getPreviewUrl(result.filename)}
//                       alt={result.filename}
//                     />

//                     <div className="result-main">
//                       <strong>{caseId(result)}</strong>
//                       <div className="result-details">
//                         <span>{result.filename}</span>
//                       </div>
//                     </div>

//                     <div className="result-score">
//                       <span className="score-num">
//                         {(result.pneumonia_probability / 100).toFixed(2)}
//                       </span>
//                       <span className="score-label">anomaly score</span>
//                     </div>

//                     <TierBadge tier={tier} />

//                     <span className={`status-pill ${isReviewed ? "reviewed" : "pending"}`}>
//                       {isReviewed ? "Reviewed" : "Pending Review"}
//                     </span>

//                     <div className="row-actions">
//                       <button
//                         className="ghost-button small"
//                         onClick={() => setSelectedResult(result)}
//                       >
//                         View
//                       </button>
//                       <button
//                         className="ghost-button small"
//                         onClick={() => toggleReviewed(result.filename)}
//                       >
//                         {isReviewed ? "Mark Pending" : "Mark Reviewed"}
//                       </button>
//                     </div>
//                   </div>
//                 );
//               })}
//             </div>

//             {selectedResult && (
//               <DetailPanel result={selectedResult} onClose={() => setSelectedResult(null)} />
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );

//   const DetailPanel = ({ result, onClose }) => {
//     const tier = getPriorityTier(result);
//     const score01 = (Number(result.pneumonia_probability) || 0) / 100;
//     const isReviewed = !!reviewed[result.filename];

//     return (
//       <div className="detail-card">
//         <div className="detail-header">
//           <div>
//             <span>{caseId(result)}</span>
//             <h2>Case Detail</h2>
//           </div>
//           <TierBadge tier={tier} large />
//         </div>

//         <img
//           className="large-xray"
//           src={getPreviewUrl(result.filename)}
//           alt="Selected medical image"
//         />

//         <h3>{result.filename}</h3>

//         <div className="gauge-wrap">
//           <div className="gauge-figure-wrap">
//             <Gauge score01={score01} tier={tier} />
//             <div className="gauge-value">
//               {score01.toFixed(2)}
//               <span className="gauge-label">Anomaly score</span>
//             </div>
//           </div>
//           <div className="gauge-meta">
//             <div className="gauge-pred">{tierLabel(tier)} Priority</div>
//             <div className="gauge-conf">MODEL CONFIDENCE {result.confidence}%</div>
//           </div>
//         </div>

//         <div className="analysis-box">
//           <div>
//             <span>Anomaly Score</span>
//             <strong>{score01.toFixed(2)}</strong>
//           </div>
//           <div>
//             <span>Model Confidence</span>
//             <strong>{result.confidence}%</strong>
//           </div>
//           <div>
//             <span>Priority Score</span>
//             <strong>{result.priority_score}</strong>
//           </div>
//           <div>
//             <span>Review Status</span>
//             <strong>{isReviewed ? "Reviewed" : "Pending Review"}</strong>
//           </div>
//         </div>

//         {/* Reconstruction / difference / heatmap imagery is only ever
//             shown if the backend actually returns it — never fabricated. */}
//         {(result.reconstruction_image || result.heatmap_image || result.difference_image) && (
//           <div className="secondary-images">
//             {result.reconstruction_image && (
//               <div>
//                 <span>Reconstruction</span>
//                 <img src={result.reconstruction_image} alt="Model reconstruction" />
//               </div>
//             )}
//             {result.difference_image && (
//               <div>
//                 <span>Difference Map</span>
//                 <img src={result.difference_image} alt="Anomaly difference map" />
//               </div>
//             )}
//             {result.heatmap_image && (
//               <div>
//                 <span>Heatmap</span>
//                 <img src={result.heatmap_image} alt="Anomaly heatmap" />
//               </div>
//             )}
//           </div>
//         )}

//         <div className={`interpretation ${tier.toLowerCase()}`}>
//           <h3>AI-Generated Priority Level</h3>
//           <p>
//             Higher scores indicate greater deviation from patterns learned by
//             the model and may warrant earlier expert review. This case has
//             been assigned <strong>{tierLabel(tier)}</strong> priority —
//             {tier === "CRITICAL" || tier === "HIGH"
//               ? " prioritize for expert review."
//               : " routine review queue."}
//           </p>
//         </div>

//         <div className="detail-footer">
//           <button
//             className="ghost-button"
//             onClick={() => toggleReviewed(result.filename)}
//           >
//             {isReviewed ? "Mark as Pending" : "Mark as Reviewed"}
//           </button>
//           <button className="ghost-button" onClick={printReport}>
//             Print this case
//           </button>
//           <button className="ghost-button close-detail" onClick={onClose}>
//             Close
//           </button>
//         </div>
//       </div>
//     );
//   };

//   const AnalyticsView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Insights</span>
//           <h2>Analytics</h2>
//           <p className="view-desc">
//             Statistics below are calculated from the current batch's results.
//           </p>
//         </div>
//       </div>

//       {results.length === 0 ? (
//         <EmptyState
//           icon={<IconChart />}
//           title="No analytics available yet"
//           body="Analytics are generated from real batch results. Run a batch analysis first."
//           action={
//             <button className="primary-button" onClick={() => setActiveView("batch")}>
//               Go to Batch Analysis
//             </button>
//           }
//         />
//       ) : (
//         <>
//           <div className="stat-grid">
//             <StatCard label="Total Cases" value={analyzedCount} tone="accent" />
//             <StatCard label="Average Anomaly Score" value={avgScore.toFixed(2)} tone="muted" />
//             <StatCard label="Reviewed" value={reviewedCount} tone="low" />
//             <StatCard label="Pending Review" value={analyzedCount - reviewedCount} tone="medium" />
//           </div>

//           <div className="panel">
//             <div className="panel-head">
//               <h3>Priority Distribution</h3>
//             </div>
//             <div className="bar-chart">
//               {[
//                 { key: "CRITICAL", label: "Critical", count: tierCounts.CRITICAL },
//                 { key: "HIGH", label: "High", count: tierCounts.HIGH },
//                 { key: "MODERATE", label: "Moderate", count: tierCounts.MODERATE },
//                 { key: "LOW", label: "Low", count: tierCounts.LOW },
//               ].map((b) => (
//                 <div className="bar-row" key={b.key}>
//                   <span className="bar-label">{b.label}</span>
//                   <div className="bar-track">
//                     <div
//                       className={`bar-fill ${b.key.toLowerCase()}`}
//                       style={{
//                         width: `${
//                           analyzedCount ? (b.count / analyzedCount) * 100 : 0
//                         }%`,
//                       }}
//                     />
//                   </div>
//                   <span className="bar-value">{b.count}</span>
//                 </div>
//               ))}
//             </div>
//           </div>

//           <div className="panel">
//             <div className="panel-head">
//               <h3>Anomaly Score Distribution</h3>
//             </div>
//             <div className="bar-chart">
//               {scoreBuckets.map((b) => (
//                 <div className="bar-row" key={b.label}>
//                   <span className="bar-label">{b.label}</span>
//                   <div className="bar-track">
//                     <div
//                       className="bar-fill accent"
//                       style={{
//                         width: `${
//                           analyzedCount ? (b.count / analyzedCount) * 100 : 0
//                         }%`,
//                       }}
//                     />
//                   </div>
//                   <span className="bar-value">{b.count}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </>
//       )}
//     </div>
//   );

//   const HistoryView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Records</span>
//           <h2>History</h2>
//           <p className="view-desc">Past batch runs, once persistence is connected.</p>
//         </div>
//       </div>
//       <EmptyState
//         icon={<IconClock />}
//         title="History is not yet available"
//         body="This build does not persist previous batches. Session results appear in Dashboard, Priority Queue and Analytics until the page is reloaded."
//       />
//     </div>
//   );

//   const SystemInfoView = () => (
//     <div className="view">
//       <div className="view-head">
//         <div>
//           <span className="eyebrow">Platform</span>
//           <h2>System Information</h2>
//         </div>
//       </div>

//       <div className="panel">
//         <div className="info-grid">
//           <div>
//             <span>Application</span>
//             <strong>MedAnomaly AI</strong>
//           </div>
//           <div>
//             <span>Function</span>
//             <strong>Medical image anomaly detection &amp; triage</strong>
//           </div>
//           <div>
//             <span>Analysis Endpoint</span>
//             <strong className="mono">{API_URL}/predict-batch</strong>
//           </div>
//           <div>
//             <span>Batch Limit</span>
//             <strong>20 images per run</strong>
//           </div>
//           <div>
//             <span>Session Cases</span>
//             <strong>{analyzedCount}</strong>
//           </div>
//           <div>
//             <span>Priority Tiers</span>
//             <strong>Critical / High / Moderate / Low</strong>
//           </div>
//         </div>
//       </div>

//       <div className="workflow-strip">
//         {["Upload", "Analyze", "Anomaly Score", "Rank Cases", "Prioritize Review", "Expert Validation"].map(
//           (step, i, arr) => (
//             <span className="workflow-step" key={step}>
//               {step}
//               {i < arr.length - 1 && <span className="workflow-arrow">→</span>}
//             </span>
//           )
//         )}
//       </div>

//       <p className="system-note">
//         Anomaly scores, confidence, and priority classifications are produced
//         entirely by the existing analysis model. This interface only
//         formats and displays that output — it does not alter model
//         inference or introduce additional predictions.
//       </p>
//     </div>
//   );

//   const views = {
//     dashboard: <DashboardView />,
//     batch: <BatchAnalysisView />,
//     queue: <QueueView />,
//     analytics: <AnalyticsView />,
//     history: <HistoryView />,
//     system: <SystemInfoView />,
//   };

//   return (
//     <div className="app">
//       {/* SIDEBAR */}
//       <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
//         <div className="brand">
//           <div className="brand-mark">
//             <IconMark />
//           </div>
//           <div>
//             <h1>MedAnomaly AI</h1>
//             <p>Anomaly Detection &amp; Triage</p>
//           </div>
//         </div>

//         <nav className="side-nav">
//           {NAV_ITEMS.map((item) => (
//             <button
//               key={item.key}
//               className={`side-nav-item ${activeView === item.key ? "active" : ""}`}
//               onClick={() => {
//                 setActiveView(item.key);
//                 setSidebarOpen(false);
//               }}
//             >
//               {item.label}
//               {item.key === "queue" && results.length > 0 && (
//                 <span className="side-nav-count">{results.length}</span>
//               )}
//             </button>
//           ))}
//         </nav>

//         <div className="sidebar-status">
//           <span className="dot" />
//           Model Active
//         </div>
//       </aside>

//       {sidebarOpen && <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />}

//       {/* MAIN */}
//       <div className="main-column">
//         <header className="topbar">
//           <button
//             className="menu-button"
//             onClick={() => setSidebarOpen(true)}
//             aria-label="Open navigation"
//           >
//             <IconMenu />
//           </button>
//           <div className="topbar-title">
//             {NAV_ITEMS.find((n) => n.key === activeView)?.label}
//           </div>
//         </header>

//         <main className="container">{views[activeView]}</main>

//         <section className="disclaimer">
//           <IconAlert />
//           <span>
//             AI-generated anomaly scores are intended to assist image
//             prioritization and do not constitute a medical diagnosis. Final
//             interpretation should be performed by a qualified healthcare
//             professional.
//           </span>
//         </section>

//         <footer>MedAnomaly AI • AI-assisted medical imaging triage</footer>
//       </div>
//     </div>
//   );
// }

// // ============================================================
// // Icons (inline, no external deps)
// // ============================================================

// function IconMark() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="8" />
//       <path d="M12 8v4l2.5 2.5" />
//     </svg>
//   );
// }
// function IconMenu() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M4 7h16M4 12h16M4 17h16" />
//     </svg>
//   );
// }
// function IconUpload() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
//       <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
//     </svg>
//   );
// }
// function IconPlus() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
//       <path d="M12 5v14M5 12h14" />
//     </svg>
//   );
// }
// function IconDownload() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
//       <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
//     </svg>
//   );
// }
// function IconPrint() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2" />
//       <path d="M6 14h12v7H6z" />
//     </svg>
//   );
// }
// function IconSearch() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="11" cy="11" r="7" />
//       <path d="m21 21-4.3-4.3" />
//     </svg>
//   );
// }
// function IconAlert() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 9v4M12 17h.01" />
//       <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
//     </svg>
//   );
// }
// function IconLayers() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M12 3 2 8l10 5 10-5-10-5Z" />
//       <path d="m2 14 10 5 10-5" />
//       <path d="m2 11 10 5 10-5" />
//     </svg>
//   );
// }
// function IconQueue() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M4 6h16M4 12h16M4 18h10" />
//     </svg>
//   );
// }
// function IconChart() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
//       <path d="M4 20V10M12 20V4M20 20v-7" />
//     </svg>
//   );
// }
// function IconClock() {
//   return (
//     <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
//       <circle cx="12" cy="12" r="9" />
//       <path d="M12 7v5l3 3" />
//     </svg>
//   );
// }

// export default App;
// App.jsx
import {
  useState,
  useMemo,
  useRef,
  useEffect,
  useContext,
  createContext,
} from "react";
import "./App.css";

// ============================================================
// BACKEND CONTRACT — UNCHANGED
// Endpoint, request shape, and response field names are exactly
// what the existing model/API already returns. Nothing here
// renames or recalculates backend output — the UI only relabels
// how the same numbers are presented.
//
//   POST {API_URL}/predict-batch   (multipart "files")
//   -> { results: [{ filename, rank, prediction,
//                     pneumonia_probability, confidence,
//                     priority, priority_score }], error? }
// ============================================================
const API_URL = "http://127.0.0.1:8000";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard" },
  { key: "batch", label: "Batch Analysis" },
  { key: "queue", label: "Priority Queue" },
  { key: "analytics", label: "Analytics" },
  { key: "history", label: "History" },
  { key: "system", label: "System Information" },
];

const ROLES = [
  { key: "patient", label: "Patient" },
  { key: "doctor", label: "Doctor" },
  { key: "hospital", label: "Hospital" },
];

const STAGES = [
  "Queued",
  "Preprocessing",
  "Model Inference",
  "Postprocessing",
  "Finalizing Report",
];
const STAGE_BOUNDARIES = [0.06, 0.32, 0.78, 0.93, 1.0];

// ------------------------------------------------------------
// Local mock-auth + local history persistence.
//
// There is no real backend authentication in this project, so
// accounts and history are stored in this browser's localStorage
// only, for demo purposes. This is NOT secure storage and should
// be replaced with real backend auth before any production use.
// ------------------------------------------------------------
const LS_USERS = "medanomaly_users_v1";
const LS_SESSION = "medanomaly_session_v1";

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(LS_USERS)) || {};
  } catch {
    return {};
  }
}
function saveUsers(users) {
  try {
    localStorage.setItem(LS_USERS, JSON.stringify(users));
  } catch {
    // ignore quota errors for the mock user store
  }
}
function userKey(role, email) {
  return `${role}:${email.trim().toLowerCase()}`;
}
function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(LS_SESSION));
  } catch {
    return null;
  }
}
function saveSession(user) {
  try {
    localStorage.setItem(LS_SESSION, JSON.stringify(user));
  } catch {
    // ignore
  }
}
function clearSession() {
  try {
    localStorage.removeItem(LS_SESSION);
  } catch {
    // ignore
  }
}

function historyKey(email) {
  return `medanomaly_history_${email.trim().toLowerCase()}`;
}
function loadHistory(email) {
  if (!email) return [];
  try {
    return JSON.parse(localStorage.getItem(historyKey(email))) || [];
  } catch {
    return [];
  }
}
function persistHistory(email, list) {
  if (!email) return;
  try {
    localStorage.setItem(historyKey(email), JSON.stringify(list));
  } catch {
    try {
      // Storage likely full — retry once without thumbnail images.
      const stripped = list.map((b) => ({
        ...b,
        results: b.results.map((r) => ({ ...r, thumbnail: null })),
      }));
      localStorage.setItem(historyKey(email), JSON.stringify(stripped));
    } catch (e2) {
      console.warn("MedAnomaly: could not persist history locally.", e2);
    }
  }
}

// ------------------------------------------------------------
// Priority tier — presentation-only, derived from existing output
// ------------------------------------------------------------
function getPriorityTier(result) {
  const score = Number(result.pneumonia_probability) || 0;
  if (result.priority === "HIGH" && score >= 90) return "CRITICAL";
  if (result.priority === "HIGH") return "HIGH";
  if (result.priority === "MEDIUM") return "MODERATE";
  return "LOW";
}
function tierLabel(tier) {
  return (
    { CRITICAL: "Critical", HIGH: "High", MODERATE: "Moderate", LOW: "Low" }[
      tier
    ] || tier
  );
}
function caseId(result) {
  return `XR-${1000 + Number(result.rank || 0)}`;
}

// ------------------------------------------------------------
// Formatting helpers
// ------------------------------------------------------------
function formatClock(ts) {
  if (!ts) return "--:--:--";
  return new Date(ts).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
function formatDateTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}
function formatSeconds(sec) {
  if (sec <= 0) return "almost done";
  if (sec < 60) return `~${Math.ceil(sec)}s left`;
  const m = Math.floor(sec / 60);
  const s = Math.ceil(sec % 60);
  return `~${m}m ${s}s left`;
}
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

// Downscaled thumbnail so a batch's images can be persisted to
// history without blowing past localStorage's size limit.
function fileToThumbnail(file, maxDim = 96) {
  return new Promise((resolve) => {
    try {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round(height * (maxDim / width));
              width = maxDim;
            }
          } else if (height > maxDim) {
            width = Math.round(width * (maxDim / height));
            height = maxDim;
          }
          const canvas = document.createElement("canvas");
          canvas.width = width || maxDim;
          canvas.height = height || maxDim;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.6));
        };
        img.onerror = () => resolve(null);
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    } catch {
      resolve(null);
    }
  });
}

// ------------------------------------------------------------
// Simulated per-image processing ETA.
//
// The real API returns one batch response at the end — there is
// no per-image progress event from the backend. This hook drives
// a client-side, clearly-labeled ESTIMATE of stage/time-remaining
// per image so the wait feels informative. It never claims a
// result exists before the real response actually arrives.
// ------------------------------------------------------------
function useEtaSimulation(loading, files) {
  const [, forceTick] = useState(0);
  const startRef = useRef(null);
  const durationsRef = useRef({});

  useEffect(() => {
    if (!loading) return undefined;

    startRef.current = Date.now();
    const durations = {};
    files.forEach((f, i) => {
      const h = hashStr(f.name + "_" + i);
      const sizeFactor = Math.min(6, f.size / 1024 / 250);
      durations[f.name] = clamp(3 + (h % 6) + sizeFactor, 3, 14);
    });
    durationsRef.current = durations;
    forceTick((t) => t + 1);

    const interval = setInterval(() => forceTick((t) => t + 1), 400);
    return () => clearInterval(interval);
  }, [loading, files]);

  if (!loading || files.length === 0) {
    return { rows: [], overallEtaAt: null };
  }

  const now = Date.now();
  const elapsedSec = startRef.current ? (now - startRef.current) / 1000 : 0;

  const rows = files.map((f) => {
    const durationSec = durationsRef.current[f.name] || 6;
    const fraction = clamp(elapsedSec / durationSec, 0, 1);
    let stageIndex = STAGE_BOUNDARIES.findIndex((b) => fraction <= b);
    if (stageIndex === -1) stageIndex = STAGES.length - 1;
    const remainingSec = Math.max(0, durationSec - elapsedSec);
    return {
      filename: f.name,
      stage: STAGES[stageIndex],
      stageIndex,
      progressPct: Math.round(fraction * 100),
      remainingSec,
      etaAt: startRef.current + durationSec * 1000,
    };
  });

  const maxDuration = Math.max(
    ...files.map((f) => durationsRef.current[f.name] || 6),
    0
  );
  const overallEtaAt = startRef.current
    ? startRef.current + maxDuration * 1000
    : null;

  return { rows, overallEtaAt };
}

// Patient-facing, plain-language gist of a stored result. Purely a
// template keyed off the existing tier — not a new prediction.
function patientTakeaway(tier) {
  switch (tier) {
    case "CRITICAL":
    case "HIGH":
      return "This image was flagged with a high anomaly score, meaning the AI found patterns that differ noticeably from what it considers typical. This does not mean a diagnosis has been made — it means the image was placed near the top of the queue so a clinician can look at it sooner.";
    case "MODERATE":
      return "This image showed a moderate anomaly score. Some patterns differed somewhat from what the AI considers typical, so it was placed in the standard review queue.";
    default:
      return "This image showed a low anomaly score, meaning the AI did not find significant deviation from typical patterns. It's still a good idea to keep your regular checkups and follow your clinician's guidance.";
  }
}

// ============================================================
// App context — shared state for every dashboard view. Views are
// declared once at module scope (not re-created on every App
// render), which is what keeps input fields like the queue search
// box from losing focus while typing.
// ============================================================
const AppCtx = createContext(null);

function App() {
  // ---- Auth ----
  const [user, setUser] = useState(() => loadSession());

  // ---- Navigation ----
  const [activeView, setActiveView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ---- Files / analysis (unchanged core logic) ----
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedResult, setSelectedResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);
  const [lastElapsedMs, setLastElapsedMs] = useState(null);
  const [lastCompletedAt, setLastCompletedAt] = useState(null);

  // ---- Queue controls ----
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("score-desc");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [reviewed, setReviewed] = useState({});

  // ---- History ----
  const [historyList, setHistoryList] = useState(() =>
    user ? loadHistory(user.email) : []
  );
  const [selectedBatchId, setSelectedBatchId] = useState(null);
  const [selectedHistoryCase, setSelectedHistoryCase] = useState(null);

  const dragCounter = useRef(0);
  const eta = useEtaSimulation(loading, files);

  useEffect(() => {
    if (user) setHistoryList(loadHistory(user.email));
  }, [user]);

  // ------------------------------------------------------------
  // Auth actions
  // ------------------------------------------------------------
  const handleLogin = (loggedInUser) => {
    setUser(loggedInUser);
    saveSession(loggedInUser);
    setHistoryList(loadHistory(loggedInUser.email));
    setActiveView("dashboard");
  };

  const handleLogout = () => {
    clearSession();
    setUser(null);
    setFiles([]);
    setResults([]);
    setSelectedResult(null);
    setHistoryList([]);
    setSelectedBatchId(null);
    setActiveView("dashboard");
  };

  // ------------------------------------------------------------
  // File selection (unchanged behavior)
  // ------------------------------------------------------------
  const addFiles = (incoming) => {
    const combined = [...files, ...incoming];
    setError("");
    setResults([]);
    setSelectedResult(null);
    if (combined.length > 20) {
      setError("Please select a maximum of 20 medical images.");
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
      setError("Please select a maximum of 20 medical images.");
      setFiles(selectedFiles.slice(0, 20));
      return;
    }
    setFiles(selectedFiles);
    event.target.value = "";
  };

  const removeFile = (index) => {
    setFiles((cur) => cur.filter((_, i) => i !== index));
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

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current += 1;
    if (e.dataTransfer.items?.length > 0) setDragActive(true);
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
    if (dropped.length > 0) addFiles(dropped);
  };

  // ------------------------------------------------------------
  // Analysis call — request/response handling is unchanged
  // ------------------------------------------------------------
  const analyzeImages = async () => {
    if (files.length === 0) {
      setError("Please select at least one medical image.");
      return;
    }

    setLoading(true);
    setError("");
    setResults([]);
    setSelectedResult(null);

    const startedAt = performance.now();
    const filesSnapshot = files;

    try {
      const formData = new FormData();
      filesSnapshot.forEach((file) => formData.append("files", file));

      const response = await fetch(`${API_URL}/predict-batch`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Server error while analyzing images.");
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const list = data.results || [];
      const elapsedMs = performance.now() - startedAt;
      const completedAt = Date.now();

      setResults(list);
      setReviewed({});
      setLastElapsedMs(elapsedMs);
      setLastCompletedAt(completedAt);

      if (list.length > 0) {
        setSelectedResult(list[0]);
        setActiveView("queue");
      }

      // Persist this batch into the logged-in user's history.
      if (user && list.length > 0) {
        const thumbs = {};
        await Promise.all(
          filesSnapshot.map(async (f) => {
            thumbs[f.name] = await fileToThumbnail(f);
          })
        );

        const entry = {
          id: `batch_${completedAt}`,
          timestamp: completedAt,
          fileCount: filesSnapshot.length,
          elapsedMs,
          results: list.map((r) => ({
            ...r,
            thumbnail: thumbs[r.filename] || null,
            reviewed: false,
          })),
        };

        setHistoryList((cur) => {
          const next = [entry, ...cur].slice(0, 30);
          persistHistory(user.email, next);
          return next;
        });
      }
    } catch (err) {
      setError(err.message || "Could not connect to the analysis backend.");
    } finally {
      setLoading(false);
    }
  };

  const getPreviewUrl = (filename) => {
    const file = files.find((f) => f.name === filename);
    return file ? URL.createObjectURL(file) : "";
  };

  // ------------------------------------------------------------
  // Derived stats
  // ------------------------------------------------------------
  const tierCounts = useMemo(() => {
    const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    results.forEach((r) => {
      counts[getPriorityTier(r)] += 1;
    });
    return counts;
  }, [results]);

  const avgScore = useMemo(() => {
    if (results.length === 0) return 0;
    const sum = results.reduce(
      (acc, r) => acc + (Number(r.pneumonia_probability) || 0),
      0
    );
    return sum / results.length / 100;
  }, [results]);

  const analyzedCount = results.length;
  const failedCount = Math.max(0, files.length - results.length);
  const reviewedCount = useMemo(
    () => Object.values(reviewed).filter(Boolean).length,
    [reviewed]
  );

  const scoreBuckets = useMemo(() => {
    const buckets = [
      { label: "0–25%", min: 0, max: 25, count: 0 },
      { label: "25–50%", min: 25, max: 50, count: 0 },
      { label: "50–75%", min: 50, max: 75, count: 0 },
      { label: "75–100%", min: 75, max: 101, count: 0 },
    ];
    results.forEach((r) => {
      const s = Number(r.pneumonia_probability) || 0;
      const b = buckets.find((bk) => s >= bk.min && s < bk.max);
      if (b) b.count += 1;
    });
    return buckets;
  }, [results]);

  const visibleResults = useMemo(() => {
    let list = [...results];

    if (tierFilter === "PENDING") {
      list = list.filter((r) => !reviewed[r.filename]);
    } else if (tierFilter === "REVIEWED") {
      list = list.filter((r) => reviewed[r.filename]);
    } else if (tierFilter !== "ALL") {
      list = list.filter((r) => getPriorityTier(r) === tierFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (r) =>
          r.filename.toLowerCase().includes(q) ||
          caseId(r).toLowerCase().includes(q)
      );
    }

    switch (sortBy) {
      case "score-asc":
        list.sort((a, b) => a.pneumonia_probability - b.pneumonia_probability);
        break;
      case "newest":
        list.sort((a, b) => a.rank - b.rank);
        break;
      case "oldest":
        list.sort((a, b) => b.rank - a.rank);
        break;
      case "score-desc":
      default:
        list.sort((a, b) => b.pneumonia_probability - a.pneumonia_probability);
    }

    return list;
  }, [results, search, sortBy, tierFilter, reviewed]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if (activeView !== "queue" || !results.length) return;
      if (e.target.tagName === "INPUT") return;
      if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
      e.preventDefault();
      const idx = visibleResults.findIndex(
        (r) => r.filename === selectedResult?.filename
      );
      let nextIdx = idx;
      if (e.key === "ArrowDown")
        nextIdx = Math.min(idx + 1, visibleResults.length - 1);
      if (e.key === "ArrowUp") nextIdx = Math.max(idx - 1, 0);
      if (visibleResults[nextIdx]) setSelectedResult(visibleResults[nextIdx]);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [visibleResults, selectedResult, activeView, results.length]);

  const toggleReviewed = (filename) => {
    setReviewed((cur) => ({ ...cur, [filename]: !cur[filename] }));
  };

  const toggleHistoryReviewed = (batchId, filename) => {
    setHistoryList((cur) => {
      const next = cur.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          results: b.results.map((r) =>
            r.filename === filename ? { ...r, reviewed: !r.reviewed } : r
          ),
        };
      });
      if (user) persistHistory(user.email, next);
      return next;
    });
  };

  // ------------------------------------------------------------
  // Exports
  // ------------------------------------------------------------
  const exportCsv = () => {
    if (!results.length) return;
    const header = [
      "case_id",
      "filename",
      "anomaly_score",
      "confidence_percent",
      "priority_level",
      "priority_score",
      "review_status",
    ];
    const rows = results
      .slice()
      .sort((a, b) => a.rank - b.rank)
      .map((r) =>
        [
          caseId(r),
          r.filename,
          (Number(r.pneumonia_probability) / 100).toFixed(2),
          r.confidence,
          tierLabel(getPriorityTier(r)),
          r.priority_score,
          reviewed[r.filename] ? "Reviewed" : "Pending Review",
        ].join(",")
      );
    const csv = [header.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "medanomaly-priority-queue.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const printReport = () => window.print();

  // ------------------------------------------------------------
  // Context value shared with every dashboard view
  // ------------------------------------------------------------
  const ctxValue = {
    user,
    onLogout: handleLogout,

    activeView,
    setActiveView,
    sidebarOpen,
    setSidebarOpen,

    files,
    results,
    selectedResult,
    setSelectedResult,
    loading,
    error,
    dragActive,
    lastElapsedMs,
    lastCompletedAt,

    handleFileChange,
    removeFile,
    clearAll,
    analyzeImages,
    getPreviewUrl,
    dragHandlers: {
      onDragEnter: handleDragEnter,
      onDragLeave: handleDragLeave,
      onDragOver: handleDragOver,
      onDrop: handleDrop,
    },

    tierCounts,
    avgScore,
    analyzedCount,
    failedCount,
    reviewedCount,
    scoreBuckets,

    reviewed,
    toggleReviewed,
    visibleResults,

    search,
    setSearch,
    sortBy,
    setSortBy,
    tierFilter,
    setTierFilter,

    exportCsv,
    printReport,

    eta,

    historyList,
    selectedBatchId,
    setSelectedBatchId,
    selectedHistoryCase,
    setSelectedHistoryCase,
    toggleHistoryReviewed,
  };

  if (!user) {
    return <LoginPage onSuccess={handleLogin} />;
  }

  const views = {
    dashboard: <DashboardView />,
    batch: <BatchAnalysisView />,
    queue: <QueueView />,
    analytics: <AnalyticsView />,
    history: <HistoryView />,
    system: <SystemInfoView />,
  };

  return (
    <AppCtx.Provider value={ctxValue}>
      <div className="app">
        <Sidebar />
        {sidebarOpen && (
          <div className="sidebar-scrim" onClick={() => setSidebarOpen(false)} />
        )}

        <div className="main-column">
          <header className="topbar">
            <button
              className="menu-button"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open navigation"
            >
              <IconMenu />
            </button>
            <div className="topbar-title">
              {NAV_ITEMS.find((n) => n.key === activeView)?.label}
            </div>
          </header>

          <main className="container">{views[activeView]}</main>

          <section className="disclaimer">
            <IconAlert />
            <span>
              AI-generated anomaly scores are intended to assist image
              prioritization and do not constitute a medical diagnosis.
              Final interpretation should be performed by a qualified
              healthcare professional.
            </span>
          </section>

          <footer>MedAnomaly AI • AI-assisted medical imaging triage</footer>
        </div>
      </div>
    </AppCtx.Provider>
  );
}

// ============================================================
// LOGIN / SIGNUP
// ============================================================
function LoginPage({ onSuccess }) {
  const [role, setRole] = useState("patient");
  const [mode, setMode] = useState("signin"); // 'signin' | 'signup'
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const emailValid = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim());
  const phoneValid = (v) => v.replace(/\D/g, "").length >= 7;

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError("");

    if (!emailValid(email)) {
      setFormError("Enter a valid email address.");
      return;
    }

    setSubmitting(true);

    // Tiny artificial delay so the auth step feels like a real request.
    setTimeout(() => {
      const users = loadUsers();
      const key = userKey(role, email);

      if (mode === "signup") {
        if (!name.trim()) {
          setFormError("Enter your full name.");
          setSubmitting(false);
          return;
        }
        if (!phoneValid(phone)) {
          setFormError("Enter a valid phone number.");
          setSubmitting(false);
          return;
        }
        if (users[key]) {
          setFormError(
            `An account already exists for this email as ${role}. Try signing in instead.`
          );
          setSubmitting(false);
          return;
        }
        const newUser = { name: name.trim(), email: email.trim(), phone: phone.trim(), role };
        users[key] = newUser;
        saveUsers(users);
        setSubmitting(false);
        onSuccess(newUser);
        return;
      }

      // sign in
      const existing = users[key];
      if (!existing) {
        setFormError(
          `No ${role} account found for this email. Switch to "Create Account" to sign up.`
        );
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
      onSuccess(existing);
    }, 450);
  };

  return (
    <div className="auth-screen">
      <div className="auth-card">
        <div className="auth-brand">
          <div className="brand-mark">
            <IconMark />
          </div>
          <div>
            <h1>MedAnomaly AI</h1>
            <p>AI-Powered Medical Image Anomaly Detection &amp; Triage</p>
          </div>
        </div>

        <div className="role-tabs">
          {ROLES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`role-tab ${role === r.key ? "active" : ""}`}
              onClick={() => {
                setRole(r.key);
                setFormError("");
              }}
            >
              <RoleIcon roleKey={r.key} />
              {r.label}
            </button>
          ))}
        </div>

        <div className="auth-mode-toggle">
          <button
            type="button"
            className={mode === "signin" ? "active" : ""}
            onClick={() => {
              setMode("signin");
              setFormError("");
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={mode === "signup" ? "active" : ""}
            onClick={() => {
              setMode("signup");
              setFormError("");
            }}
          >
            Create Account
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {mode === "signup" && (
            <label className="auth-field">
              <span>Full Name</span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Carter"
                autoComplete="name"
              />
            </label>
          )}

          <label className="auth-field">
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={`${role}@example.com`}
              autoComplete="email"
            />
          </label>

          {mode === "signup" && (
            <label className="auth-field">
              <span>Phone Number</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 555 123 4567"
                autoComplete="tel"
              />
            </label>
          )}

          {formError && (
            <div className="error auth-error" role="alert">
              <span>⚠</span>
              <span>{formError}</span>
            </div>
          )}

          <button className="primary-button auth-submit" disabled={submitting}>
            {submitting && <span className="spin-icon dark" />}
            {submitting
              ? "Please wait..."
              : mode === "signup"
              ? `Create ${ROLES.find((r) => r.key === role).label} Account`
              : `Sign In as ${ROLES.find((r) => r.key === role).label}`}
          </button>
        </form>

        <p className="auth-footnote">
          Demo build — accounts and history are stored only on this device
          and are not sent to any external server.
        </p>
      </div>
    </div>
  );
}

function RoleIcon({ roleKey }) {
  if (roleKey === "doctor") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 3v5a3 3 0 0 0 6 0V3" />
        <path d="M12 12v3a5 5 0 0 0 5 5 4 4 0 0 0 4-4v-1" />
        <circle cx="5" cy="17" r="2.5" />
      </svg>
    );
  }
  if (roleKey === "hospital") {
    return (
      <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 21V7l8-4 8 4v14" />
        <path d="M9 21v-6h6v6M12 9v4M10 11h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" />
    </svg>
  );
}

// ============================================================
// SIDEBAR
// ============================================================
function Sidebar() {
  const { activeView, setActiveView, setSidebarOpen, sidebarOpen, results, user, onLogout } =
    useContext(AppCtx);

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <IconMark />
        </div>
        <div>
          <h1>MedAnomaly AI</h1>
          <p>Anomaly Detection &amp; Triage</p>
        </div>
      </div>

      <nav className="side-nav">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            className={`side-nav-item ${activeView === item.key ? "active" : ""}`}
            onClick={() => {
              setActiveView(item.key);
              setSidebarOpen(false);
            }}
          >
            {item.label}
            {item.key === "queue" && results.length > 0 && (
              <span className="side-nav-count">{results.length}</span>
            )}
          </button>
        ))}
      </nav>

      <div className="sidebar-user">
        <div className="sidebar-avatar">
          <RoleIcon roleKey={user.role} />
        </div>
        <div className="sidebar-user-meta">
          <strong>{user.name}</strong>
          <span>{ROLES.find((r) => r.key === user.role)?.label}</span>
        </div>
        <button className="logout-button" onClick={onLogout} aria-label="Log out">
          <IconLogout />
        </button>
      </div>

      <div className="sidebar-status">
        <span className="dot" />
        Model Active
      </div>
    </aside>
  );
}

// ============================================================
// SHARED PIECES
// ============================================================
function StatCard({ label, value, tone }) {
  return (
    <div className={`stat-card ${tone || ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function EmptyState({ icon, title, body, action }) {
  return (
    <div className="empty-state">
      <div className="empty-icon">{icon}</div>
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}

function TierBadge({ tier, large }) {
  return (
    <span className={`tier-badge ${tier.toLowerCase()} ${large ? "large" : ""}`}>
      {tierLabel(tier)}
    </span>
  );
}

function Gauge({ score01, tier }) {
  const clamped = clamp(score01, 0, 1);
  const angle = clamped * 180;
  const radius = 50;
  const cx = 59;
  const cy = 64;
  const toRad = (deg) => (Math.PI / 180) * deg;
  const endX = cx - radius * Math.cos(toRad(angle));
  const endY = cy - radius * Math.sin(toRad(angle));
  const largeArc = angle > 180 ? 1 : 0;
  const colorVar =
    tier === "CRITICAL"
      ? "var(--critical)"
      : tier === "HIGH"
      ? "var(--high)"
      : tier === "MODERATE"
      ? "var(--medium)"
      : "var(--low)";

  return (
    <svg
      className="gauge-figure"
      viewBox="0 0 118 74"
      role="img"
      aria-label={`Anomaly score ${clamped.toFixed(2)}`}
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
}

// Case detail — reused for both the live queue (blob-URL image) and
// history (stored thumbnail image); the caller supplies imageSrc.
function DetailPanel({
  result,
  imageSrc,
  isReviewed,
  onToggleReview,
  onClose,
  eyebrow,
  footerNote,
  patientNote,
}) {
  const tier = getPriorityTier(result);
  const score01 = (Number(result.pneumonia_probability) || 0) / 100;

  return (
    <div className="detail-card">
      <div className="detail-header">
        <div>
          <span>{eyebrow || caseId(result)}</span>
          <h2>Case Detail</h2>
        </div>
        <TierBadge tier={tier} large />
      </div>

      <img className="large-xray" src={imageSrc} alt="Selected medical image" />

      <h3>{result.filename}</h3>
      {footerNote && <div className="detail-timestamp">{footerNote}</div>}

      <div className="gauge-wrap">
        <div className="gauge-figure-wrap">
          <Gauge score01={score01} tier={tier} />
          <div className="gauge-value">
            {score01.toFixed(2)}
            <span className="gauge-label">Anomaly score</span>
          </div>
        </div>
        <div className="gauge-meta">
          <div className="gauge-pred">{tierLabel(tier)} Priority</div>
          <div className="gauge-conf">MODEL CONFIDENCE {result.confidence}%</div>
        </div>
      </div>

      <div className="analysis-box">
        <div>
          <span>Anomaly Score</span>
          <strong>{score01.toFixed(2)}</strong>
        </div>
        <div>
          <span>Model Confidence</span>
          <strong>{result.confidence}%</strong>
        </div>
        <div>
          <span>Priority Score</span>
          <strong>{result.priority_score}</strong>
        </div>
        <div>
          <span>Review Status</span>
          <strong>{isReviewed ? "Reviewed" : "Pending Review"}</strong>
        </div>
      </div>

      {(result.reconstruction_image || result.heatmap_image || result.difference_image) && (
        <div className="secondary-images">
          {result.reconstruction_image && (
            <div>
              <span>Reconstruction</span>
              <img src={result.reconstruction_image} alt="Model reconstruction" />
            </div>
          )}
          {result.difference_image && (
            <div>
              <span>Difference Map</span>
              <img src={result.difference_image} alt="Anomaly difference map" />
            </div>
          )}
          {result.heatmap_image && (
            <div>
              <span>Heatmap</span>
              <img src={result.heatmap_image} alt="Anomaly heatmap" />
            </div>
          )}
        </div>
      )}

      <div className={`interpretation ${tier.toLowerCase()}`}>
        <h3>AI-Generated Priority Level</h3>
        <p>
          Higher scores indicate greater deviation from patterns learned by
          the model and may warrant earlier expert review. This case has
          been assigned <strong>{tierLabel(tier)}</strong> priority —
          {tier === "CRITICAL" || tier === "HIGH"
            ? " prioritize for expert review."
            : " routine review queue."}
        </p>
      </div>

      {patientNote && (
        <div className="interpretation patient-note">
          <h3>What This Means For You</h3>
          <p>{patientNote}</p>
        </div>
      )}

      <div className="detail-footer">
        {onToggleReview && (
          <button className="ghost-button" onClick={onToggleReview}>
            {isReviewed ? "Mark as Pending" : "Mark as Reviewed"}
          </button>
        )}
        <button className="ghost-button" onClick={() => window.print()}>
          Print this case
        </button>
        {onClose && (
          <button className="ghost-button close-detail" onClick={onClose}>
            Close
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// DASHBOARD
// ============================================================
function DashboardView() {
  const { results, analyzedCount, tierCounts, avgScore, setActiveView, setSelectedResult } =
    useContext(AppCtx);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Overview</span>
          <h2>Dashboard</h2>
          <p className="view-desc">
            Analyze medical images in batches, identify unusual patterns, and
            prioritize cases for expert review.
          </p>
        </div>
        <button className="primary-button" onClick={() => setActiveView("batch")}>
          + New Batch Analysis
        </button>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<IconLayers />}
          title="No batch analyzed yet"
          body="Run a batch analysis to populate your dashboard, priority queue and analytics with real results."
          action={
            <button className="primary-button" onClick={() => setActiveView("batch")}>
              Go to Batch Analysis
            </button>
          }
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total Images Analyzed" value={analyzedCount} tone="accent" />
            <StatCard label="Critical Priority Cases" value={tierCounts.CRITICAL} tone="critical" />
            <StatCard label="High Priority Cases" value={tierCounts.HIGH} tone="high" />
            <StatCard label="Moderate Priority Cases" value={tierCounts.MODERATE} tone="medium" />
            <StatCard label="Low Priority Cases" value={tierCounts.LOW} tone="low" />
            <StatCard label="Average Anomaly Score" value={avgScore.toFixed(2)} tone="muted" />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Most Recent Priority Cases</h3>
              <button className="ghost-button" onClick={() => setActiveView("queue")}>
                View full queue →
              </button>
            </div>
            <div className="mini-queue">
              {results
                .slice()
                .sort((a, b) => b.pneumonia_probability - a.pneumonia_probability)
                .slice(0, 5)
                .map((r) => (
                  <button
                    key={r.filename}
                    className="mini-row"
                    onClick={() => {
                      setSelectedResult(r);
                      setActiveView("queue");
                    }}
                  >
                    <span className="mini-case">{caseId(r)}</span>
                    <span className="mini-name">{r.filename}</span>
                    <span className="mini-score">
                      {(r.pneumonia_probability / 100).toFixed(2)}
                    </span>
                    <TierBadge tier={getPriorityTier(r)} />
                  </button>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// BATCH ANALYSIS
// ============================================================
function BatchAnalysisView() {
  const {
    files,
    results,
    error,
    loading,
    dragActive,
    dragHandlers,
    handleFileChange,
    removeFile,
    clearAll,
    analyzeImages,
    tierCounts,
    analyzedCount,
    failedCount,
    setActiveView,
    eta,
    lastElapsedMs,
  } = useContext(AppCtx);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Ingestion</span>
          <h2>Batch Image Analysis</h2>
          <p className="view-desc">
            Upload multiple medical images to automatically calculate anomaly
            scores and generate a prioritized review queue.
          </p>
        </div>
      </div>

      <section className={`upload-card ${dragActive ? "drag-active" : ""}`} {...dragHandlers}>
        <div className="upload-icon">
          <IconUpload />
        </div>
        <h2>Upload Medical Images</h2>
        <p>Select up to 20 images for analysis, or drag and drop them here.</p>

        <label className="upload-button">
          <IconPlus />
          Select Images
          <input type="file" accept="image/*" multiple onChange={handleFileChange} />
        </label>

        <div className="upload-hint">JPG · PNG · exported medical images — max 20 files</div>

        {files.length > 0 && (
          <p className="file-count">
            {files.length} image{files.length !== 1 ? "s" : ""} queued
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
              <div className="selected-file" key={`${file.name}-${index}`}>
                <img src={URL.createObjectURL(file)} alt={file.name} />
                <div className="file-info">
                  <span>{file.name}</span>
                  <small>{(file.size / 1024).toFixed(0)} KB</small>
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
          <button className="analyze-button" onClick={analyzeImages} disabled={loading || files.length === 0}>
            {loading && <span className="spin-icon" />}
            {loading ? "Analyzing Images..." : "Run Batch Analysis"}
          </button>
          {files.length > 0 && !loading && (
            <button className="clear-button" onClick={clearAll}>
              Clear All
            </button>
          )}
        </div>
      </section>

      {loading && (
        <section className="loading-card">
          <div className="scanner"></div>
          <h3>Processing Batch</h3>
          <p>Calculating anomaly scores for each uploaded image.</p>

          {eta.overallEtaAt && (
            <div className="loading-progress">
              ESTIMATED COMPLETION BY {formatClock(eta.overallEtaAt)}
            </div>
          )}

          <div className="eta-list">
            {eta.rows.map((row) => (
              <div className="eta-row" key={row.filename}>
                <span className="eta-filename">{row.filename}</span>
                <span className="eta-stage">
                  <span className="eta-stage-dot" />
                  {row.stage}
                </span>
                <div className="eta-track">
                  <div className="eta-fill" style={{ width: `${row.progressPct}%` }} />
                </div>
                <span className="eta-remaining">{formatSeconds(row.remainingSec)}</span>
              </div>
            ))}
          </div>

          <p className="eta-disclaimer">
            Timings shown are estimated based on typical processing patterns
            and may vary once the model finishes each image.
          </p>
        </section>
      )}

      {!loading && results.length > 0 && (
        <section className="panel batch-summary-panel">
          <div className="panel-head">
            <h3>Batch Analysis Complete</h3>
          </div>
          <div className="batch-summary-grid">
            <div>
              <span>Total Images</span>
              <strong>{files.length}</strong>
            </div>
            <div>
              <span>Successfully Analyzed</span>
              <strong className="ok">{analyzedCount}</strong>
            </div>
            <div>
              <span>Failed</span>
              <strong className={failedCount > 0 ? "warn" : ""}>{failedCount}</strong>
            </div>
            <div>
              <span>Critical</span>
              <strong>{tierCounts.CRITICAL}</strong>
            </div>
            <div>
              <span>High</span>
              <strong>{tierCounts.HIGH}</strong>
            </div>
            <div>
              <span>Moderate</span>
              <strong>{tierCounts.MODERATE}</strong>
            </div>
            <div>
              <span>Low</span>
              <strong>{tierCounts.LOW}</strong>
            </div>
          </div>
          {lastElapsedMs != null && (
            <p className="actual-turnaround">
              Actual processing time for this batch: {(lastElapsedMs / 1000).toFixed(1)}s
            </p>
          )}
          <button className="primary-button" onClick={() => setActiveView("queue")}>
            Open Priority Queue →
          </button>
        </section>
      )}
    </div>
  );
}

// ============================================================
// PRIORITY QUEUE
// ============================================================

// Search box kept as its own stable component with local "draft"
// state — filtering only commits on Enter / the Search button, so
// typing never gets interrupted by the rest of the app re-rendering.
function QueueSearchBox() {
  const { search, setSearch } = useContext(AppCtx);
  const [draft, setDraft] = useState(search);

  const commit = () => setSearch(draft.trim());

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      commit();
    }
  };

  const handleClear = () => {
    setDraft("");
    setSearch("");
  };

  return (
    <div className="search-field">
      <IconSearch />
      <input
        type="text"
        placeholder="Search by case ID or filename, then press Enter…"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      {draft && (
        <button type="button" className="search-clear" onClick={handleClear} aria-label="Clear search">
          ×
        </button>
      )}
      <button type="button" className="search-go" onClick={commit}>
        Search
      </button>
    </div>
  );
}

function QueueView() {
  const {
    results,
    visibleResults,
    selectedResult,
    setSelectedResult,
    reviewed,
    toggleReviewed,
    getPreviewUrl,
    tierFilter,
    setTierFilter,
    sortBy,
    setSortBy,
    exportCsv,
    printReport,
    setActiveView,
  } = useContext(AppCtx);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Review</span>
          <h2>AI Priority Queue</h2>
          <p className="view-desc">
            Cases are ranked by anomaly score — highest anomaly score
            receives highest review priority.
          </p>
        </div>
        {results.length > 0 && (
          <div className="section-actions">
            <button className="ghost-button" onClick={exportCsv}>
              <IconDownload /> Export CSV
            </button>
            <button className="ghost-button" onClick={printReport}>
              <IconPrint /> Print Report
            </button>
          </div>
        )}
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<IconQueue />}
          title="Priority queue is empty"
          body="Run a batch analysis to generate a ranked queue of cases for expert review."
          action={
            <button className="primary-button" onClick={() => setActiveView("batch")}>
              Go to Batch Analysis
            </button>
          }
        />
      ) : (
        <>
          <div className="controls-bar">
            <QueueSearchBox />

            <div className="filter-chip-row">
              {[
                { key: "ALL", label: "All" },
                { key: "CRITICAL", label: "Critical" },
                { key: "HIGH", label: "High" },
                { key: "MODERATE", label: "Moderate" },
                { key: "LOW", label: "Low" },
                { key: "PENDING", label: "Pending Review" },
                { key: "REVIEWED", label: "Reviewed" },
              ].map((f) => (
                <button
                  key={f.key}
                  className={`filter-chip ${tierFilter === f.key ? "active" : ""}`}
                  onClick={() => setTierFilter(f.key)}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <select className="sort-select" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="score-desc">Highest anomaly</option>
              <option value="score-asc">Lowest anomaly</option>
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
            </select>
          </div>

          <div className="results-layout">
            <div className="results-list">
              {visibleResults.length === 0 && (
                <div className="no-results">No cases match the current filters.</div>
              )}

              {visibleResults.length > 0 && (
                <div className="queue-table-head">
                  <span>Case</span>
                  <span>Anomaly Score</span>
                  <span>Priority</span>
                  <span>Status</span>
                  <span></span>
                </div>
              )}

              {visibleResults.map((result) => {
                const tier = getPriorityTier(result);
                const isReviewed = !!reviewed[result.filename];
                return (
                  <div
                    className={`result-card ${selectedResult?.filename === result.filename ? "selected" : ""}`}
                    key={result.filename}
                  >
                    <img className="result-thumbnail" src={getPreviewUrl(result.filename)} alt={result.filename} />

                    <div className="result-main">
                      <strong>{caseId(result)}</strong>
                      <div className="result-details">
                        <span>{result.filename}</span>
                      </div>
                    </div>

                    <div className="result-score">
                      <span className="score-num">{(result.pneumonia_probability / 100).toFixed(2)}</span>
                      <span className="score-label">anomaly score</span>
                    </div>

                    <TierBadge tier={tier} />

                    <span className={`status-pill ${isReviewed ? "reviewed" : "pending"}`}>
                      {isReviewed ? "Reviewed" : "Pending Review"}
                    </span>

                    <div className="row-actions">
                      <button className="ghost-button small" onClick={() => setSelectedResult(result)}>
                        View
                      </button>
                      <button className="ghost-button small" onClick={() => toggleReviewed(result.filename)}>
                        {isReviewed ? "Mark Pending" : "Mark Reviewed"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {selectedResult && (
              <DetailPanel
                result={selectedResult}
                imageSrc={getPreviewUrl(selectedResult.filename)}
                isReviewed={!!reviewed[selectedResult.filename]}
                onToggleReview={() => toggleReviewed(selectedResult.filename)}
                onClose={() => setSelectedResult(null)}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// ANALYTICS
// ============================================================
function AnalyticsView() {
  const { results, analyzedCount, avgScore, reviewedCount, tierCounts, scoreBuckets, setActiveView } =
    useContext(AppCtx);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Insights</span>
          <h2>Analytics</h2>
          <p className="view-desc">Statistics below are calculated from the current batch's results.</p>
        </div>
      </div>

      {results.length === 0 ? (
        <EmptyState
          icon={<IconChart />}
          title="No analytics available yet"
          body="Analytics are generated from real batch results. Run a batch analysis first."
          action={
            <button className="primary-button" onClick={() => setActiveView("batch")}>
              Go to Batch Analysis
            </button>
          }
        />
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total Cases" value={analyzedCount} tone="accent" />
            <StatCard label="Average Anomaly Score" value={avgScore.toFixed(2)} tone="muted" />
            <StatCard label="Reviewed" value={reviewedCount} tone="low" />
            <StatCard label="Pending Review" value={analyzedCount - reviewedCount} tone="medium" />
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Priority Distribution</h3>
            </div>
            <div className="bar-chart">
              {[
                { key: "CRITICAL", label: "Critical", count: tierCounts.CRITICAL },
                { key: "HIGH", label: "High", count: tierCounts.HIGH },
                { key: "MODERATE", label: "Moderate", count: tierCounts.MODERATE },
                { key: "LOW", label: "Low", count: tierCounts.LOW },
              ].map((b) => (
                <div className="bar-row" key={b.key}>
                  <span className="bar-label">{b.label}</span>
                  <div className="bar-track">
                    <div
                      className={`bar-fill ${b.key.toLowerCase()}`}
                      style={{ width: `${analyzedCount ? (b.count / analyzedCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="bar-value">{b.count}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h3>Anomaly Score Distribution</h3>
            </div>
            <div className="bar-chart">
              {scoreBuckets.map((b) => (
                <div className="bar-row" key={b.label}>
                  <span className="bar-label">{b.label}</span>
                  <div className="bar-track">
                    <div
                      className="bar-fill accent"
                      style={{ width: `${analyzedCount ? (b.count / analyzedCount) * 100 : 0}%` }}
                    />
                  </div>
                  <span className="bar-value">{b.count}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================================
// HISTORY
// ============================================================
function HistoryView() {
  const {
    user,
    historyList,
    selectedBatchId,
    setSelectedBatchId,
    selectedHistoryCase,
    setSelectedHistoryCase,
    toggleHistoryReviewed,
    setActiveView,
  } = useContext(AppCtx);

  const selectedBatch = historyList.find((b) => b.id === selectedBatchId) || historyList[0] || null;

  useEffect(() => {
    if (!selectedBatchId && historyList.length > 0) {
      setSelectedBatchId(historyList[0].id);
    }
  }, [historyList, selectedBatchId, setSelectedBatchId]);

  const batchTierCounts = (batch) => {
    const counts = { CRITICAL: 0, HIGH: 0, MODERATE: 0, LOW: 0 };
    batch.results.forEach((r) => {
      counts[getPriorityTier(r)] += 1;
    });
    return counts;
  };

  const batchAvg = (batch) => {
    if (!batch.results.length) return 0;
    const sum = batch.results.reduce((a, r) => a + (Number(r.pneumonia_probability) || 0), 0);
    return sum / batch.results.length / 100;
  };

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Records</span>
          <h2>History</h2>
          <p className="view-desc">
            Past batch runs for your account.
          </p>
        </div>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">
          <RoleIcon roleKey={user.role} />
        </div>
        <div className="profile-fields">
          <div>
            <span>Name</span>
            <strong>{user.name}</strong>
          </div>
          <div>
            <span>Email</span>
            <strong>{user.email}</strong>
          </div>
          <div>
            <span>Phone</span>
            <strong>{user.phone || "—"}</strong>
          </div>
          <div>
            <span>Account Type</span>
            <strong>{ROLES.find((r) => r.key === user.role)?.label}</strong>
          </div>
        </div>
      </div>

      {historyList.length === 0 ? (
        <EmptyState
          icon={<IconClock />}
          title="No past batches yet"
          body="Once you run a batch analysis while signed in, it will appear here with the date, time, and full results."
          action={
            <button className="primary-button" onClick={() => setActiveView("batch")}>
              Run a Batch Analysis
            </button>
          }
        />
      ) : (
        <div className="results-layout">
          <div className="results-list">
            {historyList.map((batch) => {
              const counts = batchTierCounts(batch);
              const isActive = selectedBatch?.id === batch.id;
              return (
                <button
                  key={batch.id}
                  className={`history-batch-card ${isActive ? "selected" : ""}`}
                  onClick={() => {
                    setSelectedBatchId(batch.id);
                    setSelectedHistoryCase(null);
                  }}
                >
                  <div className="history-batch-head">
                    <strong>{formatDateTime(batch.timestamp)}</strong>
                    <span>{batch.fileCount} image{batch.fileCount !== 1 ? "s" : ""}</span>
                  </div>
                  <div className="history-batch-tiers">
                    {counts.CRITICAL > 0 && <span className="tier-badge critical">{counts.CRITICAL} Critical</span>}
                    {counts.HIGH > 0 && <span className="tier-badge high">{counts.HIGH} High</span>}
                    {counts.MODERATE > 0 && <span className="tier-badge moderate">{counts.MODERATE} Moderate</span>}
                    {counts.LOW > 0 && <span className="tier-badge low">{counts.LOW} Low</span>}
                  </div>
                  <div className="history-batch-avg">Avg. anomaly score {batchAvg(batch).toFixed(2)}</div>
                </button>
              );
            })}
          </div>

          {selectedBatch && (
            <div className="detail-card">
              <div className="detail-header">
                <div>
                  <span>{formatDateTime(selectedBatch.timestamp)}</span>
                  <h2>Batch Results</h2>
                </div>
              </div>

              <div className="history-case-list">
                {selectedBatch.results
                  .slice()
                  .sort((a, b) => b.pneumonia_probability - a.pneumonia_probability)
                  .map((r) => {
                    const tier = getPriorityTier(r);
                    return (
                      <button
                        key={r.filename}
                        className={`mini-row history-case-row ${
                          selectedHistoryCase?.filename === r.filename ? "active" : ""
                        }`}
                        onClick={() => setSelectedHistoryCase(r)}
                      >
                        <span className="mini-case">{caseId(r)}</span>
                        <span className="mini-name">{r.filename}</span>
                        <span className="mini-score">{(r.pneumonia_probability / 100).toFixed(2)}</span>
                        <TierBadge tier={tier} />
                      </button>
                    );
                  })}
              </div>

              {selectedHistoryCase && (
                <div className="history-case-detail">
                  <DetailPanel
                    result={selectedHistoryCase}
                    imageSrc={selectedHistoryCase.thumbnail}
                    isReviewed={!!selectedHistoryCase.reviewed}
                    onToggleReview={() => {
                      toggleHistoryReviewed(selectedBatch.id, selectedHistoryCase.filename);
                      setSelectedHistoryCase((cur) =>
                        cur ? { ...cur, reviewed: !cur.reviewed } : cur
                      );
                    }}
                    onClose={() => setSelectedHistoryCase(null)}
                    eyebrow={`${caseId(selectedHistoryCase)} · ${formatDateTime(selectedBatch.timestamp)}`}
                    footerNote={`Report generated ${formatDateTime(selectedBatch.timestamp)}`}
                    patientNote={
                      user.role === "patient"
                        ? patientTakeaway(getPriorityTier(selectedHistoryCase))
                        : null
                    }
                  />
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// SYSTEM INFORMATION
// ============================================================
function SystemInfoView() {
  const { analyzedCount } = useContext(AppCtx);

  return (
    <div className="view">
      <div className="view-head">
        <div>
          <span className="eyebrow">Platform</span>
          <h2>System Information</h2>
        </div>
      </div>

      <div className="panel">
        <div className="info-grid">
          <div>
            <span>Application</span>
            <strong>MedAnomaly AI</strong>
          </div>
          <div>
            <span>Function</span>
            <strong>Medical image anomaly detection &amp; triage</strong>
          </div>
          <div>
            <span>Analysis Endpoint</span>
            <strong className="mono">{API_URL}/predict-batch</strong>
          </div>
          <div>
            <span>Batch Limit</span>
            <strong>20 images per run</strong>
          </div>
          <div>
            <span>Session Cases</span>
            <strong>{analyzedCount}</strong>
          </div>
          <div>
            <span>Priority Tiers</span>
            <strong>Critical / High / Moderate / Low</strong>
          </div>
        </div>
      </div>

      <div className="workflow-strip">
        {["Upload", "Analyze", "Anomaly Score", "Rank Cases", "Prioritize Review", "Expert Validation"].map(
          (step, i, arr) => (
            <span className="workflow-step" key={step}>
              {step}
              {i < arr.length - 1 && <span className="workflow-arrow">→</span>}
            </span>
          )
        )}
      </div>

      <p className="system-note">
        Anomaly scores, confidence, and priority classifications are produced
        entirely by the existing analysis model. This interface only formats
        and displays that output — it does not alter model inference or
        introduce additional predictions. Authentication and history in this
        build are stored locally in your browser for demonstration purposes
        only.
      </p>
    </div>
  );
}

// ============================================================
// Icons
// ============================================================
function IconMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}
function IconUpload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 16V4M12 4l-4 4M12 4l4 4" />
      <path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
    </svg>
  );
}
function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconDownload() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12M12 15l-4-4M12 15l4-4" />
      <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
    </svg>
  );
}
function IconPrint() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V3h12v6M6 18H4a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1h-2" />
      <path d="M6 14h12v7H6z" />
    </svg>
  );
}
function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}
function IconAlert() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </svg>
  );
}
function IconLayers() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 8l10 5 10-5-10-5Z" />
      <path d="m2 14 10 5 10-5" />
      <path d="m2 11 10 5 10-5" />
    </svg>
  );
}
function IconQueue() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 3" />
    </svg>
  );
}
function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" fill="none" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </svg>
  );
}

export default App;

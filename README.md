<div align="center">

# 🩺 CuraAI
### AI-Powered Chest X-ray Priority Analysis

**Upload a batch of chest X-rays. Get back an AI-ranked priority queue in seconds.**

![Python](https://img.shields.io/badge/Python-3.13-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-Backend-009688?logo=fastapi&logoColor=white)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.21-FF6F00?logo=tensorflow&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Deployed](https://img.shields.io/badge/Deployed-Render-46E3B7?logo=render&logoColor=white)

**[🚀 Live App](https://cureai-frontend.onrender.com/) &nbsp;·&nbsp; [⚙️ Backend API](https://cureai-backend-v4f8.onrender.com/) &nbsp;·&nbsp; [📄 API Docs](https://cureai-backend-v4f8.onrender.com/docs)**

</div>

> An AI-assisted clinical decision-support tool that analyzes multiple chest X-rays at once, predicts pneumonia probability for each, and ranks them by urgency — helping doctors triage large volumes of X-rays faster.

> ⚠️ **Note:** The backend runs on Render's free tier, so the very first request after a period of inactivity may take 30–60 seconds while the service wakes up.

---

## 📸 Screenshots

<!-- Add your screenshots below. Suggested shots: landing page, upload screen, results dashboard, detail view -->
<img width="700" alt="Screenshot 2026-08-23 181007" src="https://github.com/user-attachments/assets/c5c0bb91-9805-46a2-9894-fd1e596c3b30" />

<img width="700" alt="Screenshot 2026-08-23 181355" src="https://github.com/user-attachments/assets/5f0e9112-1ee1-40f3-9437-88bb5c307d0f" />

<img width="700" alt="Screenshot 2026-08-23 181426" src="https://github.com/user-attachments/assets/57e3e912-bfb2-4834-8272-abb2464b6d82" />

<img width="700" alt="Screenshot 2026-08-23 181438" src="https://github.com/user-attachments/assets/fda9dcf4-4f8b-46f9-8c72-7487df4af172" />



---

## 📖 Table of Contents

- [Overview](#-overview)
- [Problem Statement](#-problem-statement)
- [How It Works](#-how-it-works)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Project Structure](#-project-structure)
- [Machine Learning Details](#-machine-learning-details)
- [API Reference](#-api-reference)
- [Priority & Ranking Logic](#-priority--ranking-logic)
- [Running Locally](#-running-locally)
- [Deployment](#-deployment)
- [Design Philosophy & Key Decisions](#-design-philosophy--key-decisions)
- [Limitations & Disclaimer](#-limitations--disclaimer)
- [Future Roadmap](#-future-roadmap)
- [FAQ / Interview Prep](#-faq--interview-prep)

---

## 🧠 Overview

**CuraAI** is a full-stack web application that lets a doctor upload **up to 20 chest X-rays at once** and instantly get back an AI-generated **priority queue** — ranking each X-ray by how likely it is to show pneumonia. Instead of reviewing X-rays in the order they arrive, a doctor can immediately see which cases look most urgent and review those first.

CuraAI is built as a **decision-support tool**, not a diagnostic replacement. It doesn't tell the doctor "this patient has pneumonia" as a final answer — it says "this image looks suspicious, you may want to look at it first."

---

## ❓ Problem Statement

In busy hospitals and diagnostic centers, radiologists and doctors often receive large batches of chest X-rays that need to be reviewed in order of clinical urgency. Reviewing them sequentially (in upload order, or first-come-first-served) means a critical pneumonia case might sit at the bottom of the pile while a normal X-ray gets reviewed first.

**CuraAI solves this by automatically triaging incoming X-rays**, using a trained deep learning model to flag high-risk images so they can be prioritized for human review — similar in spirit to how a triage nurse sorts ER patients by urgency, not by arrival time.

---

## ⚙️ How It Works

```
Doctor opens CuraAI
        │
        ▼
Uploads up to 20 chest X-ray images
        │
        ▼
Clicks "Analyze X-rays"
        │
        ▼
Frontend (React) sends images to Backend (FastAPI) via multipart/form-data
        │
        ▼
Backend preprocesses each image (RGB, resize to 224×224, normalize)
        │
        ▼
TensorFlow/Keras CNN model predicts pneumonia probability for each image
        │
        ▼
Backend calculates: prediction label, confidence, priority level, rank
        │
        ▼
Backend sorts all results by pneumonia probability (descending)
        │
        ▼
JSON response returned to frontend
        │
        ▼
Frontend displays a ranked dashboard:
   🔴 HIGH priority   🟡 MEDIUM priority   🟢 LOW priority
        │
        ▼
Doctor clicks any X-ray to see full detail
   (image, prediction, probability, confidence, rank)
```

---

## 🧰 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React (Vite) | Fast, component-based SPA for uploading images and displaying results |
| **Styling** | CSS (App.css / index.css) | Custom professional medical-dashboard styling |
| **Backend** | FastAPI (Python) | High-performance async REST API serving the ML model |
| **ML Framework** | TensorFlow / Keras | Loads and runs the trained CNN model for inference |
| **Model Format** | `.keras` (Keras v3) | Serialized trained CNN classifier |
| **Server** | Uvicorn | ASGI server running FastAPI |
| **Hosting** | Render.com | Hosts both the React frontend (static site) and FastAPI backend (web service) |
| **Dataset** | Kaggle — Chest X-Ray Pneumonia (Paul Mooney) | Source of labeled training images |

---

## 🏗️ System Architecture

```
┌──────────────────────────┐         HTTPS / multipart form-data        ┌───────────────────────────┐
│   React Frontend (Vite)  │ ─────────────────────────────────────────► │   FastAPI Backend          │
│  cureai-frontend.        │                                            │  cureai-backend-v4f8.      │
│  onrender.com            │ ◄───────────────────────────────────────── │  onrender.com               │
└──────────────────────────┘              JSON response                └─────────────┬─────────────┘
                                                                                       │
                                                                                       ▼
                                                                         ┌───────────────────────────┐
                                                                         │  TensorFlow / Keras Model  │
                                                                         │  cureai_chest_xray_model   │
                                                                         │  .keras (CNN classifier)   │
                                                                         └───────────────────────────┘
```

**Frontend** is a static React SPA deployed as a Render static site. **Backend** is a Render web service running FastAPI + Uvicorn, which loads the trained Keras model once at startup and keeps it in memory for fast repeated inference.

---

## 📁 Project Structure

```
CuraAI/
│
├── backend/
│   ├── main.py                  # FastAPI app: routes, preprocessing, inference, ranking logic
│   └── requirements.txt         # Python dependencies (fastapi, uvicorn, tensorflow, pillow, numpy, etc.)
│
├── frontend/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/
│   │   ├── assets/
│   │   │   ├── hero.png         # Landing page hero image
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── App.jsx              # Main app component: upload UI, API calls, results dashboard
│   │   ├── App.css              # Dashboard + component styling
│   │   ├── index.css            # Global styles
│   │   └── main.jsx             # React app entry point
│   ├── index.html
│   ├── package.json
│   ├── package-lock.json
│   ├── vite.config.js
│   ├── eslint.config.js
│   └── .gitignore
│
├── model/
│   └── cureai_chest_xray_model.keras   # Trained CNN classifier (pneumonia vs normal)
│
└── .gitignore
```

---

## 🔬 Machine Learning Details

### Dataset

CuraAI uses the well-known Kaggle dataset **`paultimothymooney/chest-xray-pneumonia`**, downloaded via **KaggleHub**, organized as:

```
chest_xray/
    train/
        NORMAL/
        PNEUMONIA/
    val/
        NORMAL/
        PNEUMONIA/
    test/
        NORMAL/
        PNEUMONIA/
```

| Split | NORMAL | PNEUMONIA |
|---|---|---|
| Train | 1,341 | 3,875 |
| Validation | 8 | 8 |
| Test | 234 | 390 |

> Note the class imbalance in the training set (roughly 1:3 in favor of pneumonia) — this was accounted for during model evaluation, since accuracy alone can be misleading on imbalanced medical data.

### Experiment 1 — Variational Autoencoder (VAE) for Anomaly Detection

Because the Deep Learning-II syllabus emphasized **Bayesian/Markov networks, RBMs, Gibbs Sampling, Contrastive Divergence, VAEs, and GANs**, the project began with a **Variational Autoencoder** trained only on NORMAL X-rays, with the idea that pneumonia X-rays (never seen during training) would produce a higher reconstruction error and could be flagged as anomalies.

- Input shape: `(128, 128, 1)` grayscale, trained on 1,072 images, validated on 269
- Model size: ~4.47M trainable parameters
- Trained for 20 epochs

**Final VAE training metrics:**

| Metric | Value |
|---|---|
| Total loss | ≈ 9,355.7 |
| Reconstruction loss | ≈ 9,291.0 |
| KL divergence loss | ≈ 64.7 |
| Validation loss | ≈ 9,409.9 |

**Anomaly-detection results (reconstruction-error thresholding):**

| Metric | Value |
|---|---|
| Normal mean reconstruction error | 0.01051 |
| Pneumonia mean reconstruction error | 0.01236 |
| Anomaly threshold | 0.01611 |
| Accuracy | 46.31% |
| Precision | 84.81% |
| Recall | 17.18% |
| F1-score | 28.57% |

**Conclusion:** The reconstruction-error gap between normal and pneumonia images was too narrow for reliable anomaly separation. This is a well-known challenge in unsupervised anomaly detection: pneumonia X-rays share most of the same anatomical structure as normal X-rays, so a supervised classifier that directly learns discriminative visual patterns (opacities, infiltrates) is a far better fit for this task than reconstruction-error thresholding.

The VAE experiment was **kept in the project** as a demonstration of syllabus concepts (generative modeling, latent variable models, anomaly detection) and as a research comparison point — but it is **not used in the production system**.

### Experiment 2 — Supervised CNN Classifier (Production Model)

A supervised CNN-based image classifier was trained directly on the labeled NORMAL vs PNEUMONIA data. This became the model actually powering the live application.

**Final test set performance:**

| Metric | Value |
|---|---|
| Test loss | 0.2964 |
| **Test accuracy** | **88.46%** |
| **ROC-AUC** | **0.9582** |

**Per-class metrics:**

| Class | Precision | Recall | F1-score |
|---|---|---|---|
| NORMAL | 0.9133 | 0.7650 | 0.8326 |
| PNEUMONIA | 0.8715 | 0.9564 | 0.9120 |

**Confusion matrix:**

|  | Predicted NORMAL | Predicted PNEUMONIA |
|---|---|---|
| **Actual NORMAL** | 179 | 55 |
| **Actual PNEUMONIA** | 17 | 373 |

**Why this model was chosen over the VAE:** A high ROC-AUC (0.9582) and high pneumonia recall (95.64%) mean the model rarely misses a true pneumonia case — which is exactly the priority for a triage tool (a false alarm on a normal X-ray is far less costly than missing a pneumonia case). The supervised CNN vastly outperformed the unsupervised VAE anomaly detector, so it was selected as the production model.

The trained model is saved as **`cureai_chest_xray_model.keras`** and loaded once when the FastAPI server starts.

### Inference Pipeline

Every uploaded image goes through this exact preprocessing before prediction:

```python
image = image.convert("RGB")
image = image.resize((224, 224))
image_array = np.array(image, dtype=np.float32)
image_array = np.expand_dims(image_array, axis=0)  # add batch dimension

probability = float(model.predict(image_array, verbose=0)[0][0])

prediction = "PNEUMONIA" if probability >= 0.5 else "NORMAL"
```

- **Input:** 224×224 RGB image
- **Output:** a single sigmoid probability between 0 and 1 (probability that the image is PNEUMONIA)
- **Decision threshold:** 0.5

---

## 🔌 API Reference

Base URL (production): `https://cureai-backend-v4f8.onrender.com`

Interactive Swagger docs available at: **`/docs`**

### `GET /`
Health-check endpoint. Confirms the API is live and the model has loaded successfully.

### `POST /predict`
Analyzes a **single** chest X-ray image.

**Request:** `multipart/form-data` with one image file.

**Response:**
```json
{
  "filename": "example.jpeg",
  "prediction": "PNEUMONIA",
  "confidence": 96.4,
  "pneumonia_probability": 96.4
}
```

### `POST /predict-batch`
Analyzes **up to 20** chest X-ray images in a single request, and returns a **ranked priority queue**.

**Request:** `multipart/form-data`, field name `files`, up to 20 image files.

```python
files: Annotated[
    list[UploadFile],
    File(description="Upload up to 20 chest X-ray images")
]
```

> This `Annotated[list[UploadFile], File(...)]` pattern was specifically required to make FastAPI/Swagger render proper **multi-file upload controls** in the docs UI — without it, Swagger displayed the field as a raw `array<string>` instead of file pickers. A custom OpenAPI schema override was also added to fix this permanently.

**Processing steps performed by the backend for each request:**
1. Receive all uploaded image files
2. Read each image into memory
3. Convert to RGB (handles grayscale/CMYK edge cases)
4. Resize to 224×224
5. Convert to a NumPy array
6. Run the TensorFlow/Keras model
7. Calculate the pneumonia probability
8. Classify as NORMAL or PNEUMONIA
9. Assign a priority level (HIGH / MEDIUM / LOW)
10. Sort all results by pneumonia probability, descending
11. Assign a rank (1 = most urgent)
12. Return the full JSON payload

**Example response:**
```json
{
  "total_images": 2,
  "results": [
    {
      "filename": "person1_virus_8.jpeg",
      "prediction": "PNEUMONIA",
      "confidence": 100,
      "pneumonia_probability": 100,
      "priority": "HIGH",
      "priority_score": 100,
      "rank": 1
    },
    {
      "filename": "IM-0006-0001.jpeg",
      "prediction": "NORMAL",
      "confidence": 66.62,
      "pneumonia_probability": 33.38,
      "priority": "LOW",
      "priority_score": 33.38,
      "rank": 2
    }
  ]
}
```

---

## 🚦 Priority & Ranking Logic

Each X-ray's pneumonia probability is mapped to a priority tier:

| Pneumonia Probability | Priority | Meaning |
|---|---|---|
| ≥ 70% | 🔴 **HIGH** | Strongly suggests pneumonia — review first |
| 40% – 69% | 🟡 **MEDIUM** | Some suspicious signal — review soon |
| < 40% | 🟢 **LOW** | Likely normal — lower urgency |

**Ranking rule:** All analyzed images are sorted in descending order of pneumonia probability. The image with the highest probability becomes **Rank 1** — i.e., the image the doctor should look at first.

This turns a flat batch upload into an **actionable, prioritized worklist** rather than just a list of independent predictions.

---

## 💻 Running Locally

### Prerequisites
- Python 3.13 (or any modern Python 3.x)
- Node.js + npm
- pip

### 1. Clone the repository
```bash
git clone <your-repo-url>
cd CureAI
```

### 2. Run the backend
```bash
cd backend
pip install -r requirements.txt
python -m uvicorn main:app --reload
```
Backend will start at: `http://127.0.0.1:8000`
Swagger docs: `http://127.0.0.1:8000/docs`

You should see `CuraAI model loaded successfully!` in the terminal once TensorFlow finishes loading the model.

### 3. Run the frontend
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
Frontend will start at: `http://localhost:5173`

> When running locally, make sure `App.jsx` points to `http://127.0.0.1:8000/predict-batch` (rather than the deployed Render URL) for API calls.

---

## ☁️ Deployment

CuraAI is deployed entirely on **Render.com**:

| Component | Render Service Type | URL |
|---|---|---|
| Frontend | Static Site (Vite build output) | https://cureai-frontend.onrender.com/ |
| Backend | Web Service (FastAPI + Uvicorn) | https://cureai-backend-v4f8.onrender.com/ |

**Backend deployment notes:**
- The Keras model (`cureai_chest_xray_model.keras`) is bundled with the backend service and loaded into memory once at startup for fast repeated inference.
- `requirements.txt` pins TensorFlow, FastAPI, Uvicorn, Pillow, NumPy, and other backend dependencies.
- CORS is configured on the FastAPI app to allow requests from the deployed frontend origin.

**Frontend deployment notes:**
- Built with `npm run build`, producing a static `dist/` folder served by Render's static site hosting.
- The frontend's API base URL is configured to point at the deployed backend (`cureai-backend-v4f8.onrender.com`) in production.

> ⚠️ Render's free-tier web services spin down after inactivity, so the **first request after idle time may take 30–60 seconds** while the backend cold-starts and reloads the TensorFlow model.

---

## 🎯 Design Philosophy & Key Decisions

This project was deliberately built around a few guiding principles:

1. **Working > Impressive-but-fragile.** Every feature added was tested end-to-end before moving to the next. The VAE experiment was kept as a research artifact rather than forced into production once it underperformed.
2. **Syllabus alignment without sacrificing quality.** The Deep Learning-II syllabus (Bayesian/Markov networks, RBMs, Gibbs sampling, Contrastive Divergence, VAEs, GANs) motivated using a VAE for an anomaly-detection experiment — but when the supervised CNN clearly outperformed it, the CNN was used for the actual product feature. This is an honest, real-world modeling decision: **use the best-performing model for the job, and document why the alternative didn't make the cut.**
3. **Decision support, not diagnosis.** CuraAI is explicitly designed to *assist* triage, not replace a radiologist's judgment. This is emphasized throughout the UI and documentation.
4. **Batch-first UX.** Real clinical workflows involve reviewing many X-rays, not one at a time — so the batch endpoint and ranked dashboard were treated as the core feature, not an afterthought.

---

## ⚠️ Disclaimer

CuraAI is a **clinical decision-support tool**, not a certified diagnostic device. It's designed to help prioritize review order, not to replace a doctor's judgment — every prediction is a suggestion, not a final answer. Explainability features (Grad-CAM heatmaps) are on the roadmap to make predictions even more transparent for clinical use.

---

## 🛣️ Future Roadmap

**Phase 3 — Richer Results UI**
- Display actual X-ray thumbnails in the results grid
- Clickable detail panel per X-ray (image + prediction + probability + confidence + rank)
- Visually highlight HIGH priority cases
- Summary counters: total scans, # HIGH / # MEDIUM / # LOW

**Phase 4 — Explainability**
- **Grad-CAM heatmaps** to visually highlight which regions of the X-ray influenced the model's prediction — a major step toward clinical trust and interpretability
- Confidence visualization (e.g., probability bars/gauges)
- Persistent on-screen disclaimer that AI output is decision support, not diagnosis

**Phase 5 — Platform Integration**
- Integrate CuraAI as one module inside a larger CuraAI health platform with login, patient/doctor roles, and other health modules (Exercise, Report Understanding, etc.)

**Phase 6 — Production Hardening**
- Broader testing across devices/networks
- Authentication and access control for medical data privacy
- Potential migration to a paid hosting tier to eliminate cold starts

---

## 🎤 FAQ / Interview Prep

**Q: Why did you use a VAE if you ended up not using it for the final product?**
A: The Deep Learning-II syllabus focused on generative and probabilistic models (VAEs, GANs, RBMs, Gibbs sampling). I trained a VAE on normal X-rays only, hypothesizing that pneumonia images would have higher reconstruction error. It achieved only 46% accuracy and 17% recall for anomaly detection — the reconstruction-error gap between classes was too small. This is a legitimate and common outcome in anomaly detection: unsupervised methods struggle when the "anomalous" class shares most structural features with the "normal" class. I documented this experiment rather than hiding it, and pivoted to a supervised CNN, which is the scientifically correct response to a failed hypothesis.

**Q: Why is the supervised CNN better suited here than the VAE?**
A: The CNN is trained directly on labeled examples of both classes, so it can learn the specific discriminative visual features of pneumonia (lung opacities, infiltrates) rather than relying on a proxy signal like reconstruction error. This gave it 88.46% accuracy and 0.9582 ROC-AUC, versus the VAE's 46.31% anomaly-detection accuracy.

**Q: Why prioritize recall over precision for the PNEUMONIA class?**
A: In a triage context, missing a true pneumonia case (a false negative) is more dangerous than flagging a normal X-ray as suspicious (a false positive) — a false positive just costs the doctor a few extra minutes of review, while a false negative could delay treatment. The model achieves 95.64% recall on PNEUMONIA, meaning it catches the vast majority of true pneumonia cases.

**Q: How does the batch endpoint produce a priority queue?**
A: Each image gets an independent pneumonia probability from the model. The backend buckets these into HIGH (≥70%), MEDIUM (40–69%), and LOW (<40%) priority tiers, then sorts all results by probability descending and assigns rank 1 to the most urgent image. This transforms N independent predictions into a single actionable, ordered worklist.

**Q: Why FastAPI instead of Flask/Django?**
A: FastAPI provides built-in async support, automatic request validation via type hints/Pydantic, and auto-generated interactive Swagger documentation (`/docs`) — which was especially useful for testing multi-file uploads during development.

**Q: What was the Swagger multi-file upload issue and how did you fix it?**
A: By default, FastAPI's OpenAPI schema generation sometimes renders a `list[UploadFile]` parameter as a plain `array<string>` field instead of real file-upload controls in Swagger UI. This was fixed by explicitly typing the parameter as `Annotated[list[UploadFile], File(description=...)]` and adding a custom OpenAPI schema override, which restored proper multi-file picker widgets in the docs.

**Q: What does the image preprocessing pipeline look like, and why those specific steps?**
A: Every image is converted to RGB (to normalize channel count regardless of source format), resized to 224×224 (matching the model's expected input shape), converted to a float32 NumPy array, and expanded with a batch dimension before being passed to `model.predict()`. This exactly matches the preprocessing used during training, which is critical — any mismatch between training-time and inference-time preprocessing would silently degrade model accuracy.

**Q: Is this project deployed, or does it just work locally?**
A: It's fully deployed — the React frontend is hosted as a static site on Render, and the FastAPI backend (with the bundled TensorFlow model) runs as a Render web service. Anyone can open the live frontend link, upload real X-rays, and get real predictions from the deployed backend, end-to-end, without touching any local code.

**Q: What would you improve first if you kept working on this?**
A: Grad-CAM explainability — being able to show *which* regions of the X-ray drove the pneumonia prediction would significantly increase clinical trust and make the tool far more useful as an actual decision-support system rather than a black-box classifier.

---

## 🙏 Acknowledgements

- Dataset: [Chest X-Ray Images (Pneumonia)](https://www.kaggle.com/datasets/paultimothymooney/chest-xray-pneumonia) by Paul Mooney on Kaggle
- Built as part of a Deep Learning-II coursework project, extended into a fully deployed full-stack application

---

## 📄 License

This project is intended for educational and research purposes. It is **not** a certified medical device and should not be used for real clinical decision-making without appropriate regulatory validation.

# AGOS / Thesis-Project — Architecture & Structure Reference

> Repository map for reviewers and maintainers, aligned to **Manuscript Ver. 2**.
> Product branding in the web app is **AGOS** (Analytics and Geospatial Overview for Safety).
> Study scope: barangay-level flood-risk prioritization for the **897 barangays of the City of
> Manila**. AGOS is a research prototype, not an operational warning or forecasting tool.

---

## 0. Documentation cross-reference

| Document | What it contributes |
|---|---|
| `README.md` | Setup, layout, local-only geospatial files (DTM `.tif`, `src/ML-thesis/` backup) |
| `docs/methodology_and_validation.md` | **Authoritative method**: data, DPI, VIF screen, models, baselines, district validation, limitations |
| `docs/RBAC-reviewer-note.md` | Three-tier access (public / `staff` / `admin`), route map, enforcement model |
| `src/ML-thesis-updated/README` | Notebook inputs and the output file contract |
| `environment/` | Conda environment and setup notes |

**Sources of truth:** the final notebook
`src/ML-thesis-updated/Manila_Barangay_Flood_Risk_Pipeline.ipynb` and its saved outputs in
`src/ML-thesis-updated/Output/`. The backend serves those outputs directly.
`src/barangay_flood_risk_modeling.py` is the **legacy Metro Manila (922-barangay) baseline**
and does not produce the data AGOS serves.

---

## 1. Tech stack

### Frontend (`frontend/`)

| Area | Choice |
|---|---|
| Framework | React 19 (JavaScript / JSX) |
| Build | Vite 8 + `@vitejs/plugin-react` |
| Styling | Tailwind CSS v4 (`@tailwindcss/vite`) + token layer in `src/index.css` |
| Routing | react-router-dom 7 |
| HTTP | axios (`src/services/api.js`, JWT + refresh handling) |
| Maps | Leaflet + react-leaflet, barangay polygons from `public/manila-barangays.geojson`, Carto basemap |
| Charts | recharts |
| State | React Context (`auth/`, `context/UploadDataContext.jsx` + `uploadDataStore.js` + `useUploadData.js`) |
| Lint | ESLint (`react-hooks`, `react-refresh`) |

### Backend (`backend/`)

| Area | Choice |
|---|---|
| Framework | FastAPI + uvicorn |
| DB | SQLite via SQLAlchemy 2 (`agos.db`, gitignored) |
| Auth | JWT access tokens + HTTP-only refresh cookie; argon2 password hashing (pwdlib) |
| Roles | `staff`, `admin` (`VALID_ROLES`); public endpoints need no account |
| Data | pandas reads the notebook's CSV outputs; no model is refit at request time |
| Reports | reportlab (staff comprehensive PDF); HTML/CSV public exports |
| Settings | pydantic-settings + `backend/.env` (gitignored) |
| Tests | pytest (`backend/tests/`) |

### ML / data pipeline

| Area | Choice |
|---|---|
| Notebook | `src/ML-thesis-updated/Manila_Barangay_Flood_Risk_Pipeline.ipynb` (runs in Colab or locally) |
| Libraries | pandas, numpy, scikit-learn, matplotlib, joblib |
| GIS prep | Done in QGIS beforehand: flood-area overlay and DTM zonal statistics. The notebook reads only tabular inputs. |
| Models | Gradient Boosting (selected), Random Forest, MLP; baselines: Logistic Regression, Shallow Decision Tree, no-information floor |
| Artifact | `Output/best_flood_risk_model_pipeline.joblib` (server-side only; never served to browsers) |

### DevOps

| Area | Status |
|---|---|
| Env management | venv + pip (`requirements.txt`, `backend/requirements.txt`); conda (`environment/environment.yml`) |
| Makefile | `test`, plus legacy-pipeline targets (`run-pipeline`, `train-all`, `generate-figures`, `export-results`) |
| Git LFS | Not configured. Large rasters (`*.tif`) and shapefiles are gitignored. The joblib (~0.7 MB) is tracked. |
| CI/CD | None |
| Deployment | Not specified |

---

## 2. Folder structure map

```
Thesis2-Project-main/
├── backend/                     FastAPI API for AGOS
│   ├── app/
│   │   ├── data/                District and area lookups (897 barangays)
│   │   ├── dependencies/        Role-gate dependencies
│   │   ├── exports/             Public CSV / HTML export renderers
│   │   ├── models/              ORM: Account, Upload, AuditLog, PublicExport
│   │   ├── reports/             Comprehensive PDF report builder
│   │   ├── routers/             public, public_exports, auth, staff, ml_results, reports, operations, admin
│   │   ├── schemas/             Pydantic request/response models
│   │   └── services/            barangay_data, ml_results, public_content, uploads, audit, exports
│   ├── scripts/                 create_admin, seed_dev_users, build_area_mapping
│   └── tests/                   Backend pytest suite
├── frontend/                    React + Vite web UI
│   ├── public/                  Icons + manila-barangays.geojson
│   └── src/                     auth, components, config, context, data (static copy), hooks,
│                                layouts, pages (public / dashboard / admin), services, theme, utils
├── src/
│   ├── ML-thesis-updated/       FINAL pipeline: notebook, Input/, Output/, README (DTM .tif local-only)
│   ├── ML-thesis/               Older Manila work (gitignored, local backup only)
│   ├── barangay_flood_risk_modeling.py   Legacy Metro Manila (922-barangay) baseline
│   ├── main.py, config.py       Legacy pipeline entry point
│   └── features/, models/, utils/        Thin wrappers around the legacy script
├── data/interim/                Legacy Metro Manila input CSV (922 rows)
├── reports/figures/             Ver. 2 charts (entropy weights, importances, correlation heatmap)
│                                + legacy-script figures in subfolders
├── notebooks/                   04_classification_modeling.ipynb (earlier exploration)
├── scripts/                     Legacy pipeline wrappers + setup-guide PDF builder
├── tests/                       Root pytest for the legacy script
├── docs/                        This file, methodology, RBAC note
└── environment/                 Conda env + setup notes
```

---

## 3. Key files inventory

### Final pipeline outputs (`src/ML-thesis-updated/Output/`)

| File | Used by |
|---|---|
| `barangay_flood_risk_predictions.csv` | `services/barangay_data.py`: all public, staff, and export data (897 rows) |
| `model_comparison_results.csv` | `services/ml_results.py` and the PDF report. Has 6 rows; `Model_Role` / `Eligible_For_Selection` separate candidates from baselines. |
| `feature_importance_{gradient_boosting,random_forest}.csv`, `permutation_feature_importance.csv` | `ml_results.py` and the PDF report (8 predictors) |
| `confusion_matrices.csv` | `ml_results.py`: staff confusion-matrix panel and the public correct-count card (restored for the 3 candidates, n = 180) |
| `entropy_component_weights.csv`, `dpi_component_class_summary.csv`, `top_rank_explanation.csv`, audit CSVs | PDF report |
| `chart_*.png` | PDF report (all required inputs) |
| `predictor_screen_decision.csv`, `table13_*.csv`, `table14_vif_predictors.csv` | Thesis evidence for the 11 → 8 screen |
| `district_spatial_validation_results.csv` | Thesis evidence for leave-one-district-out validation |
| `best_flood_risk_model_pipeline.joblib` | Archived selected model (not loaded by the API) |

### Backend services

| File | Role |
|---|---|
| `services/barangay_data.py` | Loads the predictions CSV and joins district and area lookups. Also builds the overview, rankings, profiles, and the staff ML view, and reads the selected model and CV F1 from the notebook text. |
| `services/ml_results.py` | Staff model-results payload. `models` holds the RF/GB/MLP candidates (selected by CV F1-macro); `baselines` holds the parsimony rows. Also builds the public model-summary card. |
| `services/public_content.py` | Static indicator, methodology, and recommendation text |
| `reports/comprehensive_report.py` | Rebuilds the notebook's evidence PDF from saved outputs |

### Legacy baseline

| File | Role |
|---|---|
| `src/barangay_flood_risk_modeling.py` | Earlier Metro Manila (922-barangay) pipeline. It uses fixed-weight CSI/DPI including the 100-year layer, PSA 2020, K-Means, and regression. Kept for reference and its root tests. |
| `src/main.py`, `scripts/*.py`, `src/{features,models,utils}` | Entry points and thin wrappers for that script |

---

## 4. Frontend pages / routes (`frontend/src/App.jsx`)

| Route | Page | Data source |
|---|---|---|
| `/` | `Landing` | Static content |
| `/priority-map` (`/risk-map` redirects) | `PriorityMap` | `/api/public/barangays` + GeoJSON polygons; published exports |
| `/overview` | `PublicDashboard` | `/api/public/barangays` |
| `/rankings` | `Rankings` | `/api/public/rankings` |
| `/barangays/:id` | `BarangayProfile` | `/api/public/barangays/{id}` |
| `/compare` | `CompareBarangays` | `/api/public/barangays` |
| `/about`, `/indicators`, `/recommendations` | Static pages | `data/siteContent.js` |
| `/methodology` | `Methodology` | Static text + `/api/public/model-summary` |
| `/login` | `Login` | `/api/auth/login` |
| `/dashboard/overview`, `compare`, `indicators`, `recommendations` | Staff workspace | Public data APIs + static text |
| `/dashboard/barangays`, `/dashboard/barangays/:id` | Staff ML view | `/api/staff/barangays/ml` |
| `/dashboard/model-results` | Model comparison | `/api/ml/results` |
| `/dashboard/reports` | Comprehensive PDF | `/api/staff/reports/comprehensive` |
| `/dashboard/upload` | Upload submission | `/api/operations/uploads` |
| `/admin/review-uploads`, `public-exports`, `manage-users`, `audit-log` | Admin console | `/api/admin/*` |

Legacy page files (`pages/*.jsx` at the top level, `pages/user/*`) are not wired into
`App.jsx`.

---

## 5. Backend API endpoints (prefix `/api`)

| Router | Access | Endpoints |
|---|---|---|
| `public.py` | Public | `GET /public/overview`, `/public/barangays`, `/public/barangays/{id}`, `/public/rankings`, `/public/indicators`, `/public/methodology`, `/public/recommendations`, `/public/model-summary`, `/public/approved-barangays` |
| `public_exports.py` | Public / admin | `GET /public/exports`, `/public/exports/{kind}/download`. Admin: create, edit, preview, approve, reject, unpublish, and audit CSV/HTML exports. |
| `auth.py` | Mixed | `POST /auth/login`, `/auth/refresh`, `/auth/logout`; `GET /auth/me` |
| `staff.py` | Staff / admin | `GET /staff/barangays/ml`, `/staff/barangays/{id}/ml` (DPI class vs ML class, confidence, agreement) |
| `ml_results.py` | Staff / admin | `GET /ml/results` (candidates, baselines, importances, selection note) |
| `reports.py` | Staff / admin | `GET /staff/reports/comprehensive[/meta]`; admin `POST /admin/reports/comprehensive/regenerate` |
| `operations.py` | Staff / admin | Dashboard, barangays, uploads (DB-backed), model results. The dataset, model, report, and content submissions only write audit entries. |
| `admin.py` | Admin | Upload review, account management (with last-admin safeguards), audit logs. The publish/approve actions only write audit entries. |

Health: `GET /api/health`.

---

## 6. Data flow

```
QGIS prep (outside repo): LiPAD 5-yr/25-yr flood overlay, DTM zonal statistics
        ↓
Input/ CSVs (flood %, PSA 2020/2024, elevation)
        ↓
Notebook: features → Hazard/Exposure/Vulnerability → entropy weights → DPI_Scaled → tertiles
        ↓
11 candidate predictors → correlation/VIF screen → 8 predictors
        ↓
RF / GB / MLP (5-fold CV, F1-macro) + parsimony baselines → GB selected
        ↓
Held-out test (180) + leave-one-district-out validation
        ↓
Output/ CSVs, charts, joblib
        ↓
backend/app/services (barangay_data, ml_results, reports) → REST API
        ↓
frontend: priority map, rankings, profiles, compare, staff ML and model-results pages, exports
```

Uploads follow a separate path: staff submit, an admin approves, and the result appears in
`/public/approved-barangays`. They do not change the pipeline outputs.

---

## 7. Manuscript Ver. 2 vs repository

| Area | Manuscript Ver. 2 | Repository | Status |
|---|---|---|---|
| Study area | 897 Manila barangays | Predictions CSV has 897 rows; notebook enforces the count | **Aligned** |
| Hazard layers | 5-yr and 25-yr LiPAD; 100-yr excluded | Notebook excludes the 100-yr layer from Hazard, DPI, and ML | **Aligned** |
| 100-yr exclusion evidence | 589/897 inconsistent; 11 zero-flood spot-checks; 3 negative controls | Not recorded in the notebook or outputs (QGIS-stage evidence) | **Manuscript only** |
| DPI | Two-level aggregation; entropy weights 0.19 / 0.75 / 0.06; tertiles at 17.69 / 22.90, 299 per class | `entropy_component_weights.csv` (0.1929 / 0.7495 / 0.0576); qcut cut points 17.69 / 22.90 | **Aligned** |
| Predictor screen | 11 candidates → 8 via Pearson + VIF | `FEATURE_SPEC="reduced"`; `predictor_screen_decision.csv`, Table 13/14 CSVs; importances list 8 features | **Aligned** |
| Split and CV | Stratified 80/20 + 5-fold CV, selection by CV F1-macro | Same; 717 train / 180 test | **Aligned** |
| Candidate CV F1-macro | GB 0.934, RF 0.930, MLP 0.806 | GB 0.9318, RF 0.9286, MLP 0.8064 | **Aligned** (GB selected). GB and RF differ in the third decimal. |
| Parsimony baselines | LR 0.989, Shallow DT 0.903, floor 0.166 | LR 0.9818, Shallow DT 0.9034, floor 0.1656 | **Aligned** (method). The LR value differs. |
| Spatial validation | Leave-one-district-out | Six-fold district hold-out; mean F1-macro 0.918, pooled 0.921 | **Aligned** |
| Planning outputs | `Planning_Reference`, `DRRM_Pillar` | Columns in predictions CSV; shown in profiles and exports | **Aligned** |
| Exports | CSV / HTML / PDF / Excel | Public CSV + HTML exports; staff PDF report; no Excel export in the app | **Partial** (no Excel) |
| RBAC | Public / staff / admin | `security.py`, `permissions.py`, frontend `RoleRoute` | **Aligned** |
| Prototype testing | Tier 1 T01–T14 done; T15 conditional | Backend pytest suite covers API and RBAC behaviour. Test IDs are not mapped. | **Not traceable in repo** |

---

## 8. Open items

1. **Confusion matrices (restored).** The Ver. 2 notebook prints the held-out matrices but does
   not export them. `Output/confusion_matrices.csv` was rebuilt for the 3 candidates from the
   notebook's saved cell output, cross-checked by re-running the same split and models (and
   the saved Gradient Boosting joblib). The matrices reproduce the saved accuracy and F1-macro
   exactly. Adding an export cell to the notebook would keep this file in sync on future runs.
2. **Small metric differences.** GB, RF, and LR CV scores differ slightly from the manuscript
   tables. One of the two should be updated so they match.
3. **100-yr exclusion evidence.** The 589/897 count, spot-checks, and negative controls live
   only in the manuscript. Add a QC table to `Output/` if reviewers need it in the repository.
4. **Excel export.** The manuscript lists Excel, but the app serves CSV, HTML, and PDF only.
5. **Baselines in the UI.** `/api/ml/results` returns `baselines`, but the frontend
   comparison table does not render them yet.
6. **Stub workflows.** The dataset, model, report, and content submit/publish routes record
   audit entries only. There are no draft tables behind them.
7. **Legacy code.** The legacy Metro Manila script, its wrappers, `data/interim/`, the
   `reports/figures/` subfolders, and unrouted legacy pages remain for reference.
8. **No CI or deployment configuration.**

---

## 9. Quick "source of truth" cheat sheet

| Concern | Prefer |
|---|---|
| How DPI and the models work | `docs/methodology_and_validation.md` + final notebook |
| Numbers shown in the app | `src/ML-thesis-updated/Output/*.csv` |
| How data reaches the API | `backend/app/services/barangay_data.py`, `ml_results.py` |
| How RBAC works | `docs/RBAC-reviewer-note.md` + `backend/app/security.py` / `permissions.py` + `frontend/src/App.jsx` |
| Public page text | `backend/app/services/public_content.py`, `frontend/src/data/siteContent.js` |
| Legacy Metro Manila baseline | `src/barangay_flood_risk_modeling.py` (do not cite for Ver. 2 results) |

---

*End of reference map.*

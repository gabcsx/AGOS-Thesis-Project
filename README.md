# Thesis-Project

Barangay-Level Flood Risk Classification and Mapping in the City of Manila Using Machine Learning and a Multi-Criteria Disaster Prioritization Index

## Layout

- `docs/` for manuscript chapters and supporting documentation
- `data/` for raw, interim, processed, and external datasets
- `notebooks/` for exploratory and modeling notebooks
- `src/` for the reusable Python package and pipeline modules
- `models/` for serialized trained models
- `reports/` for generated figures, tables, and final outputs
- `scripts/` for command-line execution helpers
- `tests/` for lightweight regression checks
- `environment/` for setup notes and environment definitions
- `backend/` and `frontend/` for the AGOS web application

## Local-only geospatial files

These files stay on disk for local work and are listed in `.gitignore` (not pushed to GitHub):

- **`src/ML-thesis/`** — older pipeline backup. The live app and docs use `src/ML-thesis-updated/` instead.
- **`src/ML-thesis-updated/DTM_ManilaCity_UTM51_PRS92.tif`** — digital terrain model (~12 MB). Place this file at that path if you regenerate geospatial features locally. Share the DTM via Drive or other external storage; trained outputs under `src/ML-thesis-updated/Output/` (CSVs and `.joblib`) remain in the repository.

# Methodology and Validation (Manuscript Ver. 2)

This document describes the method implemented in the final notebook,
`src/ML-thesis-updated/Manila_Barangay_Flood_Risk_Pipeline.ipynb`, whose outputs in
`src/ML-thesis-updated/Output/` are the data served by the AGOS web prototype. All figures
quoted below come from those saved outputs unless a line says otherwise.

## Scope and Intended Use

- **Study area:** all **897 barangays** of the City of Manila.
- **Purpose:** research-based **Low / Medium / High** planning priorities that support
  barangay-level disaster risk reduction and management (DRRM) planning discussions.
- **Not an operational tool.** AGOS is a research prototype. It is **not** an official hazard
  rating, a real-time flood warning system, a flood forecast, or a predictor for barangays
  outside the 897 analysed. Outputs must not replace official advisories from PAGASA,
  NDRRMC, or the Manila DRRM Office.

## Research Design

The workflow is quantitative and sequential:

1. **Data integration** of flood hazard, population, area, and elevation tables.
2. **Feature engineering** of hazard, exposure, and vulnerability indicators.
3. **Deterministic index construction:** the Disaster Prioritization Index (DPI) and its
   tertile risk classes.
4. **Supervised classification reproduction:** machine-learning models are trained to
   reproduce the DPI risk classes from a leakage-controlled, VIF-screened predictor set.

The supervised stage learns the mapping from indicators to **index-derived classes**. No
externally observed flood outcomes (event inundation, damages, casualties) are available, so
model performance measures **agreement with the DPI**, not real-world predictive skill.

## Data Sources

| Input (`src/ML-thesis-updated/Input/`) | Content |
|---|---|
| `MetroManila_Barangay_Flood_Area_Validated.csv` | QGIS-prepared flooded area and flood percentage per barangay for the **5-year and 25-year LiPAD** flood-hazard layers |
| `population-dataset-2024.csv` | PSA 2024 barangay population (used for exposure and density) |
| `population-dataset-2020.xlsx` | PSA 2020 barangay population (used only for 2020–2024 change) |
| `manila_final_base_dataset_NEW.csv` | Optional fallback for 2020 population |
| `manila_barangay_elevation.csv` | QGIS Zonal Statistics of the NAMRIA-derived DTM (`DTM_ManilaCity_UTM51_PRS92.tif`): mean, median, min, max elevation per barangay |
| `backend/app/data/manila_barangay_district_mapping.csv` | District (I–VI) per barangay, used only for leave-one-district-out validation |

All 897 barangays are matched across the flood, population, and elevation tables. The
notebook stops if the count differs.

### 100-year layer exclusion

Only the 5-year and 25-year LiPAD layers are used. The 100-year layer is excluded from the
Hazard score, the DPI, and the ML features because it failed the expected non-decreasing
return-period consistency check. The manuscript reports the check failing in 589 of 897
barangays, with 11 zero-flood barangays confirmed by spatial spot-check and 3 negative
controls. The 100-year fields may remain in intermediate files for traceability only.

*Those counts come from the QGIS data-preparation stage described in the manuscript. The
notebook records the exclusion but does not recompute them.*

## Feature Engineering

- `Population_Change_2020_2024 = Population_2024 − Population_2020`
- `Population_Change_2020_2024_Pct = 100 × (Population_2024 − Population_2020) / Population_2020`.
  This is a four-year observed change, not an annualized growth rate.
- `Barangay_Area_Hectares = Barangay_Area_Sqm / 10 000`
- `Population_Density_per_Hectare = Population_2024 / Barangay_Area_Hectares`
- `Affected_Population_{5yr,25yr} = Population_2024 × Flood_PCT_{5yr,25yr} / 100`
- `Affected_Population_Increase_5to25 = Affected_Population_25yr − Affected_Population_5yr`
- `Flood_Escalation_5to25 = Flood_PCT_25yr − Flood_PCT_5yr`
- `Flood_Severity_Increase_5to25_Sqm`: change in flooded area (sq m) from the 5-year to the 25-year layer

Negative escalation or severity values are flagged as data-quality notes. They come from
independent model runs per return period and are not corrected.

## Disaster Prioritization Index (DPI)

The DPI uses **two-level aggregation**.

### Level 1: equal averaging within components

Each indicator is min–max normalized to [0, 1]. Within each component the normalized
indicators are averaged with equal weight.

| Component | Indicators |
|---|---|
| **Hazard** (4) | `Flood_PCT_5yr`, `Flood_PCT_25yr`, `Flood_Escalation_5to25`, `Flood_Severity_Increase_5to25_Sqm` |
| **Exposure** (3) | `Affected_Population_5yr`, `Affected_Population_25yr`, `Affected_Population_Increase_5to25` |
| **Vulnerability** (3) | `Population_Density_per_Hectare`, `Population_Change_2020_2024_Pct`, `Elevation_Mean` (**reverse**-normalized: lower ground → higher vulnerability) |

### Level 2: entropy weighting across components

The three component scores are combined with Shannon-entropy weights, so a component with
more dispersion across barangays receives more weight. The weights are computed from the
data, not set a priori. Saved in `entropy_component_weights.csv`:

| Component | Entropy weight |
|---|---|
| Hazard | 0.1929 (≈ 0.19) |
| Exposure | 0.7495 (≈ 0.75) |
| Vulnerability | 0.0576 (≈ 0.06) |

`DPI = 0.1929·Hazard + 0.7495·Exposure + 0.0576·Vulnerability`. `DPI_Scaled` rescales DPI
to 0–100 by min–max.

Exposure dominates because affected population varies far more across barangays than the
other components. The prototype's "Exposure-Weight Interpretation" text explains this.

### Risk classes (tertiles)

`DPI_Scaled` is split into tertiles with `pd.qcut`. The cut points are **17.69** and
**22.90**, giving **299 barangays per class**:

| Class | Observed `DPI_Scaled` range |
|---|---|
| Low | 0.00 – 17.68 |
| Medium | 17.70 – 22.89 |
| High | 22.93 – 100.00 |

The classes rank barangays relative to each other within Manila. They are not absolute risk
levels, and they serve as **proxy labels** for the supervised stage.

### Planning outputs

Each barangay receives a `Planning_Reference` (thesis Table 18) and a `DRRM_Pillar`,
mapped from its DPI class:

| Class | DRRM pillar(s) |
|---|---|
| Low | Disaster Prevention and Mitigation; Disaster Preparedness |
| Medium | Disaster Prevention and Mitigation; Disaster Preparedness |
| High | Disaster Prevention and Mitigation; Disaster Preparedness; Disaster Response and Early Recovery |

## Machine-Learning Predictors

### Leakage control

These fields are never predictors:

- Hazard, Exposure and Vulnerability scores; DPI, `DPI_Scaled`, `DPI_Risk_Class`
- normalized intermediates
- identifiers and validation flags
- geometry and 100-year fields
- relative density and QC-only fields

District-context fields are kept in the enriched dataset but are not model inputs.

### Correlation and VIF screen (11 → 8)

The 11 leakage-controlled candidates (manuscript Table 12) are screened with a Pearson
correlation matrix (`table13_correlation_matrix_11_predictors.csv`, shown in
`reports/figures/figure_correlation_heatmap.png`) and variance inflation factors
(`table14_vif_predictors.csv`). The per-predictor decisions are in
`predictor_screen_decision.csv`.

| Removed predictor | Reason |
|---|---|
| `Flood_Escalation_5to25` | Exact identity (25-yr % − 5-yr %); the design matrix becomes singular |
| `Affected_Population_Increase_5to25` | Exact identity (25-yr exposure − 5-yr exposure); singular |
| `Affected_Population_5yr` | r = 0.931 with the 25-year exposure level; VIF = 19.08 |

The **8 final predictors** and their VIF in the retained set:

| Predictor | VIF |
|---|---|
| `Flood_PCT_5yr` | 5.39 |
| `Flood_PCT_25yr` | 5.64 |
| `Flood_Severity_Increase_5to25_Sqm` | 1.98 |
| `Population_2024` | 2.73 |
| `Affected_Population_25yr` | 3.32 |
| `Population_Density_per_Hectare` | 1.63 |
| `Population_Change_2020_2024_Pct` | 1.01 |
| `Elevation_Mean` | 1.24 |

The DPI and its classes are computed **before** this screen and do not change with it.
Setting `FEATURE_SPEC = "full"` in the notebook reproduces the original 11-predictor run.

## Model Training and Selection

- **Split:** stratified 80/20 train/test split (`random_state = 42`), giving **717 training**
  and **180 held-out** barangays (60 per class).
- **Preprocessing:** median imputation, plus standardization for the MLP and Logistic
  Regression. It runs inside sklearn `Pipeline`s, so it is fit on training folds only.
- **Tuning:** `GridSearchCV` with **5-fold stratified CV** on the training set, scored by
  **F1-macro**.
- **Selection rule:** the candidate with the highest **mean CV F1-macro** is selected. The
  held-out test set is evaluated only after selection and is never used to choose a model.

| Candidate | Grid |
|---|---|
| Random Forest (`class_weight="balanced"`) | `n_estimators` {200, 300}, `max_depth` {None, 12}, `min_samples_leaf` {1, 2} |
| Gradient Boosting | `n_estimators` {100, 200}, `learning_rate` {0.05, 0.1}, `max_depth` {2, 3} |
| MLP (`early_stopping=True`) | `hidden_layer_sizes` {(64, 32), (32,)}, `alpha` {1e-4, 1e-3} |

### Parsimony baselines

Three reference models are trained and tuned under the same split and CV folds. They are
marked `Eligible_For_Selection = False` in `model_comparison_results.csv` and are **not**
eligible for selection:

- **Multinomial Logistic Regression**, tuning `C` {0.01 … 100}
- **Shallow Decision Tree**, tuning `max_depth` {2, 3, 4} and `min_samples_leaf` {1, 5, 10}
- **No-information floor**, a most-frequent-class dummy

### Results (`model_comparison_results.csv`)

| Model | Role | CV F1-macro (mean ± sd) | Test accuracy | Test F1-macro |
|---|---|---|---|---|
| **Gradient Boosting** | **Candidate, selected** | **0.9318 ± 0.0198** | 0.9056 | 0.9053 |
| Random Forest | Candidate | 0.9286 ± 0.0243 | 0.9111 | 0.9110 |
| MLP | Candidate | 0.8064 ± 0.0868 | 0.9111 | 0.9123 |
| Logistic Regression | Parsimony baseline | 0.9818 ± 0.0034 | 0.9833 | 0.9834 |
| Shallow Decision Tree (depth 3) | Parsimony baseline | 0.9034 ± 0.0156 | 0.9056 | 0.9044 |
| No-information floor | Floor | 0.1656 ± 0.0009 | 0.3333 | 0.1667 |

**Gradient Boosting** is selected (`n_estimators=200`, `learning_rate=0.1`, `max_depth=3`).
It has the highest CV F1-macro among the RF/GB/MLP candidates.

### Interpreting the baselines

Multinomial Logistic Regression scores higher than every candidate. The DPI is a weighted sum
of normalized indicators, so a linear model on the same indicators can almost reconstruct it.
This confirms that the supervised task is classification **reproduction** of a deterministic
index. The ensemble models do not discover hidden structure.

The baselines are reported for transparency and as a performance floor and ceiling. They do
not replace the predefined candidate set.

### Feature importance

Gradient Boosting impurity importance and held-out permutation importance (30 repeats,
F1-macro) both rank `Affected_Population_25yr` first and `Flood_PCT_25yr` second. This is
consistent with the dominant Exposure entropy weight.

The predictors share information with the target by construction. Importances therefore
show which indicators carry information about the index, not independent causal effects.

## Spatial Robustness: Leave-One-District-Out Validation

To check whether performance depends on geographic grouping, each of the six City of Manila
districts is held out in turn. The selected Gradient Boosting specification (same 8
predictors, same tuned hyperparameters, **no re-tuning inside folds**) is refitted on the
other five districts and evaluated on the held-out one. Results are saved in
`district_spatial_validation_results.csv`.

| Held-out district | Train / Test | F1-macro | Balanced accuracy | Accuracy |
|---|---|---|---|---|
| District I | 760 / 137 | 0.9226 | 0.9285 | 0.9343 |
| District II | 775 / 122 | 0.9505 | 0.9489 | 0.9508 |
| District III | 774 / 123 | 0.9020 | 0.8962 | 0.9024 |
| District IV | 705 / 192 | 0.9106 | 0.9176 | 0.9115 |
| District V | 713 / 184 | 0.9039 | 0.8993 | 0.9130 |
| District VI | 758 / 139 | 0.9208 | 0.9170 | 0.9209 |

The unweighted mean F1-macro across districts is **0.918**, and the pooled out-of-district
F1-macro is **0.921**. Performance is stable across districts.

This is a spatial robustness check, **not external validation**: the DPI tertiles were built
from the same 897-barangay dataset.

## Supporting Diagnostics

| Output | Purpose |
|---|---|
| `dpi_component_class_summary.csv` | Mean Hazard, Exposure and Vulnerability by DPI class |
| `top_rank_explanation.csv` | Component breakdown for the top 25 DPI ranks |
| `high_dpi_medium_flood_audit.csv` | High-DPI barangays driven by exposure rather than flood extent |
| `elevation_outlier_audit.csv` | Elevation anomalies in the DTM summary |
| `population_change_sensitivity_audit.csv` | Sensitivity of classes to the population-change indicator |

## Limitations

1. **Modeled hazard, not observed floods.** LiPAD layers are hydrological model outputs, not
   event inundation records.
2. **Proxy labels.** DPI classes are index-derived and are not ground-truth flood impacts.
3. **Shared information by construction.** Predictors and the DPI come from the same
   indicators, so high agreement is expected and does not show real-world forecasting skill.
4. **Data-driven weights.** Entropy weights reflect dispersion in this dataset, not expert
   judgement or observed losses. Exposure dominates the index.
5. **Coarse elevation.** Barangay-level mean elevation does not capture micro-topography,
   drainage capacity, road depressions, or subsidence.
6. **Population vintage.** Exposure and density use PSA 2024. Change uses only two snapshots,
   2020 and 2024.
7. **Spatial autocorrelation.** Leave-one-district-out reduces, but does not remove,
   dependence between neighbouring barangays.
8. **Relative classes.** Tertiles always place 299 barangays in each class, regardless of
   absolute hazard levels.
9. **Ethics.** The scores could influence resource allocation. They should be used as one
   input among others, alongside official assessments and local knowledge.

## Prototype Evaluation

The manuscript reports that Tier 1 functional and consistency tests (T01–T14) were completed.
Tier 2 usability testing (T15) depends on participant recruitment and ethics clearance.

## Future Work

- Validate against event-based ground truth: SAR-derived inundation extents, official
  barangay impact records, and calibrated hydraulic models.
- Revisit the 100-year layer once a return-period-consistent source is available.
- Use finer spatial blocking, such as distance-based blocks, alongside leave-one-district-out.
- Benchmark DPI rankings against official NDRRMC / Manila DRRMO risk assessments.

## Legacy Implementation

`src/barangay_flood_risk_modeling.py` (run via `src/main.py` and `scripts/`) is the earlier
**Metro Manila (922-barangay) baseline**. It uses a different method: fixed-weight CSI/DPI
including the 100-year layer, PSA 2020, K-Means archetypes, and regression models. It is kept
for reference and its root tests. It is **not** the source of the data served by AGOS, and its
method does not describe the Ver. 2 study.

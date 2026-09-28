# Models and evidence

## Mastery and retention

The learner dashboard uses Bayesian knowledge tracing with hand-set prior .35, slip .12 (.22 when a hint is used), guess .25 and learning transition .08. These are not fitted parameters. Unassessed concepts remain neutral; overall mastery averages assessed concepts only, accompanied by coverage.

Retention is a scheduling heuristic: mastery × exp(-days / (7 + 2 × min(attempts,20))). Evidence-confidence labels count answers. Applied accuracy uses medium/hard MCQs; recall uses easy MCQs, including submitted assessments. These do not measure general coding ability or psychological confidence. The readiness slider is a labeled hypothetical improvement curve, not a trained forecast. The Wilson interval describes observed accuracy rather than predicted marks.

## Trained next-response models

- Classical candidates: standardized logistic regression and a bounded random forest.
- Deep learning: 16-dimensional event embeddings, 32-unit GRU, 32-unit dense head; history of up to 20 prior concept/outcome events plus nine pre-response features.
- Target: correct/incorrect response to the next MCQ.
- Features: target concept/difficulty, prior concept attempt count, smoothed prior accuracy, recent prior accuracy, prior hint rate, BKT prior, time since last concept attempt, prerequisite mastery.
- Current answer, current hint use and current response time are never inputs to the current prediction.
- Student IDs partition into disjoint 70/15/15 groups using seed 42. Histories are chronological within each student. Validation selects the classical model by Brier score and GRU checkpoint by log loss. Test students never fit parameters.
- Evaluation includes AUC, Brier, log loss, accuracy and reliability bins. A separate slice uses responses after at least ten earlier answers in held-out learners. That slice is not a calendar-time deployment test.

`backend/models/demo/report.json` contains the executed evaluation results, seed, data hash, split counts and limitations. The simulated dataset has 160 learners and 8,800 interactions. The artifacts are provided to make inference and the pipeline runnable without claiming real-world accuracy.

### Real data schema

UTF-8 CSV header:

```csv
student_id,concept,correct,hint,seconds,difficulty,created_at
```

- `student_id`: pseudonymous stable identifier within the dataset; never an email/name.
- `concept`: one of the IDs in `backend/app/course.json`.
- `correct`, `hint`: 0 or 1.
- `seconds`: integer 0–3600.
- `difficulty`: 1, 2 or 3.
- `created_at`: unique per student, timezone-aware ISO timestamp.

At least 30 distinct students and both response labels in each split are required. Use enough responses per student to study temporal patterns. The script rejects duplicate student/timestamp pairs and malformed values. Train authorized pseudonymous CSV from backend with `python -m ml.train --csv PATH --output models/local`, set MODEL_DIR to the result, and restart. Evaluate unseen-question generalization, broader cohorts, bias, drift and probability calibration before making educational outcome claims. User-supplied data does not automatically make a model validated.

## Retrieval

A one-time setup download installs `sentence-transformers/all-MiniLM-L6-v2`. Runtime loads only local weights with remote model code disabled. Authorization filters documents *before* ranking. Text is chunked with overlap; hybrid score is 0.65 × normalized semantic similarity + 0.35 × TF-IDF similarity. This weighting and threshold are heuristics, not tuned retrieval benchmarks. If weights are absent or unavailable the returned response identifies lexical mode.

The tutor sees retrieved text, recent chat and the learner's concept evidence. Citation validation checks that generated `[n]` references exist. It does **not** prove that the source entails every claim. Invalid citation IDs fall back to quoted reference excerpts. AI-generated assessments require student review.

## Model artifact trust

Only load artifacts trained by you or supplied in this project. Classical models use joblib, which is unsafe for untrusted files. There is no model-upload API. GRU weights load with `weights_only=True`. The MiniLM weights are downloaded separately, not included in the source ZIP.

## References

- [Sentence Transformers model API](https://sbert.net/docs/package_reference/sentence_transformer/model.html)
- [PyTorch GRU](https://docs.pytorch.org/docs/stable/generated/torch.nn.GRU.html)
- [scikit-learn group splits](https://scikit-learn.org/stable/modules/generated/sklearn.model_selection.GroupShuffleSplit.html)

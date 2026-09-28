# MasteryMap AI — Complete Student Edition

A student-only adaptive learning application: courses and modules, practice, a knowledge map, grounded tutoring, revision, exams, code exercises and transparent learning evidence. Runs locally without Docker.

## Start on Windows

Use regular **64-bit Python 3.12** and **Node.js 22.13 or newer**. Extract this folder on D: if you want caches and dependencies off C:.

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\setup.ps1
.\start.ps1
```

Open http://localhost:3000 and create an account. Setup installs dependencies and trains the bundled synthetic demonstration models. First-time downloads require internet and can take several minutes. To skip the optional sentence embedding download: `.\setup.ps1 -SkipEmbeddings`.

Fill `backend/.env` with your Groq OR Mistral key for generated tutoring, syllabus drafting, question generation and AI planning. Empty placeholders are included. Core practice, quizzes, mastery, revision, code exercise selection and reference-only tutoring work without a key. First Code Lab execution downloads Pyodide in the browser.

## Keep your existing data

Extract this edition into a NEW folder beside your working version. Stop the old app. Before registering an account in the new copy, run setup and then:

```powershell
.\.venv\Scripts\python.exe scripts\upgrade_from.py 'D:\MasteryMap-Student\MasteryMap-Student'
.\start.ps1
```

Substitute the actual old project path. This copies the old SQLite database and backend configuration; it does not change the old folder. The helper refuses to overwrite an existing destination database. If you used MASTERYMAP_DATA, supply `--database` with the absolute old student.db path and update the copied configuration to the new location. Keep your original project as a backup.

Existing users: open **Courses**, select your old Python subjects, and choose **Create unified Python course**. Matching answers and materials are copied into a single course; original subjects stay available. Repeated concept IDs share one history in the new course. Original chats, plans and quizzes remain in their original subjects. Custom/edited questions that do not match the built-in bank are not copied as evidence. Do not select unrelated subjects.

New accounts receive the unified course automatically. You do not need the older syllabus installer or any earlier patch.

## What is included

| Area | Implemented behavior |
|---|---|
| Courses | Five Python modules, 43 shared concepts, module overview and overall course progress; editable module membership in Subjects |
| Practice | 112 unique built-in MCQs across conceptual, code-output, debugging and scenario styles; module/concept/style filters, difficulty targeting, reduced repetition |
| Connected learning | Answer → explanation → prerequisite check → different follow-up question → updated mastery and revision schedule |
| AI Tutor | Current concept/problem context, three requested levels of hints, chat history, reference mode, clickable retrieved passages with available page numbers, bounded citation repair |
| Digital Twin | Existing mastery/retention views plus observed performance by question style, assisted/independent counts and before/after concept estimates |
| Revision | Due queue with intervals from independent correct streaks; mistakes/assistance shorten intervals; no mastery gain for checking off a task |
| Mistakes | Wrong-answer notebook with reasoning, explanations, targeted practice and independent-retry resolution |
| Exams | Timed quizzes, module weights, question navigation, unanswered filter, saved answers, deadline enforcement and module breakdown |
| Course Builder | Upload/paste syllabus → generated draft → editable review → explicit commit; graph and answer-format validation |
| Code Lab | 23 browser exercises, public tests, progressive hints and reference solutions for 20 added exercises; actual/expected feedback, cancel and timeout |
| Study Plan | Existing agent trace, plan approval, direct practice actions, completion tracking and explicit replan from latest answers |
| Learning Evidence | Chronological baseline/BKT comparison on observed responses; local CLI for frozen GRU evaluation on supported concepts |
| Model Lab | Existing classical model and GRU with explicit partial vocabulary coverage and synthetic-training disclosure |
| Materials and settings | Subject-scoped extraction/retrieval, exports, private accounts, password changes and persistent SQLite data |
| Login | Premium animated emerald/ivory design, compact viewport layout, reduced-motion support |

## Try the connected demo

1. Open Adaptive Practice, choose a concept and answer incorrectly.
2. Inspect its explanation and recommended prerequisite/follow-up.
3. Use a hint or reference-only tutor assistance, inspect the cited passage, then try the follow-up.
4. Open Mistakes, Revision and Digital Twin to see evidence and next actions.
5. Create a weighted timed quiz and inspect the module results.
6. Upload a syllabus in Course Builder, generate a draft with your configured key, review its answer keys and create the course.

## Tests and model evaluation

```powershell
Push-Location backend
..\.venv\Scripts\python.exe -m unittest discover -s tests -v
Pop-Location
Push-Location frontend
npm run build
Pop-Location
```

After exporting your account data from Progress/Settings:

```powershell
.\.venv\Scripts\python.exe scripts\evaluate_learning.py my-learning-data.json --output learning-evaluation.json
.\.venv\Scripts\python.exe scripts\evaluate_learning.py my-learning-data.json --gru --output learning-evaluation-gru.json
```

Evaluation uses the first 70% of a course's responses as warm-up and the final 30% chronologically. Each response is predicted before it enters history. At least 20 responses are required; small samples remain exploratory. No claim of improved real-student outcomes is made. The optional GRU remains frozen from synthetic training and only covers the original nine-concept vocabulary; unsupported concepts are skipped and reported, not assigned fake predictions. The BKT model handles all concepts. See docs/MODELS.md for existing training details.

## Practical limits

- Course Builder and generated questions require human review of academic correctness. Schema validation cannot prove an answer key is true.
- Citation checks validate source IDs, not semantic entailment. Clicking a source shows its extracted passage, not an embedded original PDF viewer.
- Revision, mastery and exam readiness are heuristics; they are not calibrated forecasts or diagnostic assessments.
- Tutor use marks answers on that concept within ten minutes as assisted. This conservative rule is visible in practice. Existing older answers retain their recorded assistance flag.
- Code Lab runs browser-compatible Python; no desktop GUI, live Selenium browser, OS multiprocessing or external database service is supplied. Output tests do not prove that a learner used a specified technique. Code results do not automatically alter mastery.
- The three oldest code exercises retain their public tests; the 20 new ones include hints and reference solutions.
- This is a local college-project application. Local user code is not a security sandbox for hostile code, and question keys are available through the student-owned course editor.
- Study replanning is explicit; no background notifications or unattended agents are implied.

See docs/TEST-EACH-TAB.md for a walkthrough and docs/VALIDATION.md for the exact checks performed.

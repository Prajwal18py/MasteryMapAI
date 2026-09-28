# Acceptance walkthrough

Use a new account or a copy of your database. Check the active course before each test.

| Tab | Test | Expected |
|---|---|---|
| Overview | Answer two questions, return | Answer count and relevant mastery update |
| Courses | Inspect five module cards; optionally unify old subjects | Shared concepts appear once in course data; originals preserved |
| Adaptive Practice | Filter module/style, answer, request hint, follow recommendation | Four choices, scored feedback, alternate or prerequisite question |
| Revision | Answer a concept correctly independently on separate attempts | Interval grows with streak; assisted/wrong responses reset streak |
| Mistakes | Answer wrong, then retry independently correctly | Entry appears, then is resolved; assisted correctness alone does not resolve |
| Mastery Map | Filter module, click a concept | Scoped graph and inspector; unassessed states stay unassessed |
| AI Tutor | Select concept, ask grounded question, click citation | Scoped context and retrieved passage; page where available |
| Digital Twin | Compare before and after a response | Evidence count, assistance counts, question-style breakdown and estimate change |
| Exam Readiness | Set exam date/weights, inspect estimate | Heuristic estimate reacts to course evidence and preferences |
| Study Plan | Generate rule plan, approve, launch a practice task, return and replan | Trace distinguishes rule/AI steps; latest answers inform new plan |
| Quizzes | Set module weights, create/start, answer, reload/resume, submit | Timer continues, choices persist, module breakdown, unanswered count |
| Progress | Inspect timeline and export | Only this account's activity exported |
| Materials | Upload a text PDF, query it in Tutor | Subject-scoped indexed text, correct source metadata |
| Subjects | Edit a module membership and save | Course module summary and filters reflect the change |
| Course Builder | Upload/paste syllabus, generate, inspect JSON, approve | No new course before commit; invalid graph rejected |
| Code Lab | Run reference solution, then intentionally wrong code | Public tests pass/fail accordingly; Stop cancels worker |
| Learning Evidence | Evaluate before/after at least 20 responses | Clear insufficient-data state, then chronological baseline/BKT metrics |
| Model Lab | Inspect supported-vocabulary notice | Partial predictions only; unsupported concepts use BKT |
| Settings | Export, change password, sign out/in | Private data preserved; current credentials work |

Also check mobile navigation, keyboard input, reduced motion, login viewport fit, invalid credentials and a second account's inability to open another account's material/source IDs.

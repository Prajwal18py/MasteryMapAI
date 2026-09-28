# Architecture

Next.js forwards same-origin /api requests to FastAPI. SQLite persists accounts, hashed sessions, private subjects, attempts, materials, chats, quizzes, plans, agent runs and reflection feedback. All routes enforce the authenticated owner's subject access. No role switching or class-management routes remain.

Passwords use salted PBKDF2; sessions are opaque HttpOnly cookies stored hashed. Origin checks protect browser mutations. Expensive operations have persisted rate limits. Set secure cookies for HTTPS.

Subjects contain acyclic prerequisite graphs and validated question banks. Adaptive practice ranks using mastery, difficulty and recent exposure. Attempt IDs make retries idempotent. Timed quizzes snapshot questions and atomically finalize; late requests can only score previously saved choices. Closed browsers finalize on the next interaction, not through a background timer.

Material extraction is synchronous with file/page/text limits. Original files are not retained. Retrieval is subject-filtered before lexical/semantic ranking. Citation checks validate source IDs, not entailment.

Study workflow: Supervisor → learner evidence → Planner → optional AI Critic and one revision → prerequisite repair → Retrieval → Assessment task selection → Reviewer → Reflection → student approval. Runs persist outputs; failed steps stop. Restart marks unfinished runs interrupted. Reading-task completion never manufactures mastery evidence.

BKT works with authored subjects; fitted next-response models use the Python vocabulary. Exam/retention scenarios are separately labeled heuristics.

## Connected student edition additions

Modules are memberships on concepts inside a subject/course; one concept ID has one history per course. The unified Python seed is assembled by app/curriculum.py. Existing courses are not silently migrated: the Courses screen creates a separate course and copies only matching question evidence and materials.

app/learning.py contains derived revision/mistake views, course import/copying, scoped source lookup, weighted exam sampling and evaluation endpoints. app/evaluation.py computes chronological predictive metrics without training on the holdout. assistance records short-lived tutoring context for response interpretation. course_imports stores proposed structures separately from committed subjects.

frontend/components/learning-studio.tsx implements the connected practice loop and new learning tabs. Browser Python runs in public/python-worker.mjs; it is not executed by the API server.

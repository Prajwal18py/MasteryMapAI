# Local operations

Use start.ps1 to start the native Python and Next.js services. Ctrl+C stops the children it started. Existing occupied ports are reported rather than terminated.

SQLite is stored in backend/data/student.db unless MASTERYMAP_DATA is set. Stop the app before copying a database manually. scripts/backup.py uses the SQLite backup API for the default database location. scripts/upgrade_from.py copies an existing database into a fresh installation without changing the old copy.

Keep backend/.env private. Setup preserves an existing configuration. First-time dependencies and browser Python need internet. A provider key is needed only for generative features; lexical retrieval and rule planning remain available offline after setup.

Do not delete backend/data while updating source. Do not overwrite a configured backend/.env with the blank distributed template. The edition contains no container setup.

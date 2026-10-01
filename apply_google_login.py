"""Run in the project root AFTER merging this patch's backend/frontend folders."""
from pathlib import Path
from datetime import datetime
import shutil

root = Path(__file__).resolve().parent
main = root/'backend/app/main.py'
login = root/'frontend/components/premium-login.tsx'
css = root/'frontend/components/premium-login.module.css'
if not main.exists() or not login.exists():
    raise SystemExit('Place this script in the existing MasteryMap root beside backend and frontend.')
changes = {}
s = main.read_text(encoding='utf-8')
if 'install_google(app,' not in s:
    if '    init()\n' not in s or 'def seed_subject(' not in s:
        raise SystemExit('Unexpected backend version. No files changed; provide your main.py for integration.')
    s = s.replace('    init()\n', '    init()\n    init_google()\n', 1)
    s += '\n\n# Google Identity Services integration\nfrom .google_login import init_google, install_google\ninstall_google(app, session, seed_subject, pw_hash, pw_ok, throttle)\n'
    changes[main] = s
s = login.read_text(encoding='utf-8')
if '<GoogleSignIn' not in s:
    anchor = '          <div className={styles.modeSwitch}'
    if anchor not in s:
        raise SystemExit('Unexpected login component. No files changed; provide premium-login.tsx for integration.')
    s = s.replace('import styles from', 'import GoogleSignIn from "./google-sign-in";\nimport styles from',1)
    s = s.replace(anchor, '          <GoogleSignIn onLogin={onLogin} disabled={busy} />\n'+anchor,1)
    changes[login] = s
for name in ('requirements.txt','requirements-cloud-base.txt'):
    p = root/'backend'/name
    if p.exists():
        s = p.read_text(encoding='utf-8')
        if '-r requirements-google.txt' not in s:
            changes[p] = s.rstrip()+'\n-r requirements-google.txt\n'
if css.exists():
    s = css.read_text(encoding='utf-8')
    if 'Google sign-in space' not in s:
        s += '''\n/* Google sign-in space: reduce decoration on laptop screens; never clip controls. */
@media (min-width:761px) and (max-height:900px) {
 .welcomeIcon,.features{display:none}
 .intro{margin-bottom:10px;font-size:12px}
 .formWrap h2{font-size:32px;margin-top:8px;margin-bottom:8px}
 .modeSwitch{margin-bottom:12px}
 .form{gap:10px}.field{height:42px}
 .entry{overflow-y:auto}
}
'''
        changes[css] = s
ignore = root/'.gitignore'
if ignore.exists():
    s = ignore.read_text(encoding='utf-8')
    if '/google-login-backup/' not in s:
        changes[ignore] = s.rstrip()+'\n/google-login-backup/\n'
if changes:
    backup = root/'google-login-backup'/datetime.now().strftime('%Y%m%d-%H%M%S')
    for p,contents in changes.items():
        dest=backup/p.relative_to(root);dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
        p.write_text(contents,encoding='utf-8')
        print('Updated',p.relative_to(root))
    print('Original files backed up in',backup.relative_to(root))
else:
    print('Google integration already applied.')
print('Next: install backend/requirements-google.txt, set GOOGLE_CLIENT_ID and restart.')

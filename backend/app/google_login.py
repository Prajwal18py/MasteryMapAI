"""Google Identity Services: verified tokens + one-use, browser-bound nonce."""
import hashlib
import hmac
import os
import secrets
import time
from fastapi import HTTPException, Request, Response
from pydantic import BaseModel, Field
from .database import db

COOKIE = 'masterymap_google_challenge'
TTL = 600


def digest(value):
    return hashlib.sha256(value.encode()).hexdigest()


def init_google():
    with db() as c:
        c.execute('BEGIN IMMEDIATE')
        c.execute('CREATE TABLE IF NOT EXISTS google_identities (sub TEXT PRIMARY KEY, user_id TEXT UNIQUE NOT NULL REFERENCES users(id))')
        c.execute('CREATE TABLE IF NOT EXISTS google_challenges (token TEXT PRIMARY KEY, nonce TEXT NOT NULL, expires INTEGER NOT NULL)')


def verify_token(credential, audience):
    from google.oauth2 import id_token
    from google.auth.transport.requests import Request as GoogleRequest
    # Official verifier checks signature, expiry, audience and Google issuer.
    class BoundedRequest(GoogleRequest):
        def __call__(self, *args, **kwargs):
            kwargs['timeout'] = 10
            return super().__call__(*args, **kwargs)
    return id_token.verify_oauth2_token(credential, BoundedRequest(), audience)


class GoogleCredential(BaseModel):
    credential: str = Field(min_length=10, max_length=12000)
    link_password: str | None = Field(default=None, max_length=128)


def install_google(app, session, seed_subject, pw_hash, pw_ok, throttle):
    def client_id():
        value = os.getenv('GOOGLE_CLIENT_ID', '').strip()
        if not value:
            raise HTTPException(503, 'Google sign-in is not configured yet. Use email and password.')
        return value

    @app.get('/api/auth/google/config')
    def configuration(req: Request, response: Response):
        cid = os.getenv('GOOGLE_CLIENT_ID', '').strip()
        if not cid:
            return {'enabled': False}
        throttle('google-init:' + str(req.client.host), 120)
        token, nonce = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
        with db() as c:
            c.execute('DELETE FROM google_challenges WHERE expires<=?', (int(time.time()),))
            old = req.cookies.get(COOKIE)
            if old:
                c.execute('DELETE FROM google_challenges WHERE token=?', (digest(old),))
            c.execute('INSERT INTO google_challenges VALUES (?,?,?)', (digest(token), nonce, int(time.time())+TTL))
        response.set_cookie(COOKIE, token, httponly=True, secure=os.getenv('COOKIE_SECURE') == 'true',
                            samesite='strict', max_age=TTL, path='/api/auth/google')
        response.headers['Cache-Control'] = 'no-store'
        return {'enabled': True, 'clientId': cid, 'nonce': nonce}

    @app.post('/api/auth/google')
    def google_login(body: GoogleCredential, req: Request, response: Response):
        cid = client_id()
        allowed = {x.strip().rstrip('/') for x in os.getenv('APP_ORIGINS', 'http://localhost:3000,http://127.0.0.1:3000').split(',')}
        if req.headers.get('origin') not in allowed:
            raise HTTPException(403, 'Untrusted origin')
        throttle('google-login:' + str(req.client.host), 30)
        token = req.cookies.get(COOKIE, '')
        if not token:
            raise HTTPException(401, 'Sign-in expired. Reload this page and try Google again.')
        with db() as c:
            challenge = c.execute('SELECT * FROM google_challenges WHERE token=? AND expires>?', (digest(token), int(time.time()))).fetchone()
        if not challenge:
            raise HTTPException(401, 'Sign-in expired. Reload this page and try Google again.')
        try:
            claims = verify_token(body.credential, cid)
        except ImportError:
            raise HTTPException(503, 'Install requirements-google.txt on the backend.') from None
        except ValueError:
            raise HTTPException(401, 'Google identity could not be verified. Please try again.') from None
        except Exception:
            raise HTTPException(503, 'Google verification is unavailable. Try again shortly.') from None
        if (claims.get('aud') != cid or claims.get('iss') not in ('accounts.google.com', 'https://accounts.google.com')
                or claims.get('email_verified') is not True or not isinstance(claims.get('sub'), str)
                or not 1 <= len(claims['sub']) <= 255
                or not isinstance(claims.get('nonce'), str)
                or not hmac.compare_digest(claims['nonce'], challenge['nonce'])):
            raise HTTPException(401, 'Google identity could not be verified. Please try again.')
        email = str(claims.get('email', '')).strip().lower()
        if '@' not in email or len(email) > 200:
            raise HTTPException(401, 'Google did not provide a usable verified email.')
        if body.link_password is not None:
            throttle('google-link:' + digest(email), 6)
        with db() as c:
            c.execute('BEGIN IMMEDIATE')
            # Re-check inside the transaction: concurrent callbacks cannot reuse a nonce.
            fresh = c.execute('SELECT token FROM google_challenges WHERE token=? AND expires>?', (digest(token), int(time.time()))).fetchone()
            if not fresh:
                raise HTTPException(401, 'Google sign-in was already used or expired. Reload to try again.')
            identity = c.execute('SELECT user_id FROM google_identities WHERE sub=?', (claims['sub'],)).fetchone()
            if identity:
                account = c.execute('SELECT id,email,name FROM users WHERE id=?', (identity['user_id'],)).fetchone()
            else:
                account = c.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
                if account:
                    # Password is required even for Gmail: prevent pre-hijacking of unverified local accounts.
                    if body.link_password is None:
                        raise HTTPException(409, 'An account already uses this email. Confirm its MasteryMap password to link Google and keep your progress.')
                    try:
                        valid = pw_ok(body.link_password, account['password'])
                    except (ValueError, TypeError):
                        valid = False
                    if not valid:
                        raise HTTPException(401, 'Incorrect MasteryMap password. Your account was not linked.')
                    other = c.execute('SELECT sub FROM google_identities WHERE user_id=?', (account['id'],)).fetchone()
                    if other:
                        raise HTTPException(409, 'This account is already linked to a different Google identity.')
                else:
                    ident = secrets.token_hex(16)
                    name = str(claims.get('name') or email.split('@')[0])[:80]
                    # An unknowable valid hash keeps the existing password-login code compatible.
                    c.execute('INSERT INTO users VALUES (?,?,?,?)', (ident,email,name,pw_hash(secrets.token_urlsafe(64))))
                    seed_subject(c, ident)
                    account = {'id':ident,'email':email,'name':name}
                c.execute('INSERT INTO google_identities VALUES (?,?)', (claims['sub'], account['id']))
            c.execute('DELETE FROM google_challenges WHERE token=?', (digest(token),))
            session(c, account['id'], response)
        response.delete_cookie(COOKIE, path='/api/auth/google', secure=os.getenv('COOKIE_SECURE') == 'true', httponly=True, samesite='strict')
        return {k:account[k] for k in ('id','name','email')}

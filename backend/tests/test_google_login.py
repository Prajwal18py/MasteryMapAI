import os
import tempfile
import unittest
import uuid
from pathlib import Path
from unittest.mock import patch
from fastapi.testclient import TestClient
from app.main import app
from app.database import db

ORIGIN = {'Origin':'http://localhost:3000'}
CID = 'test-client.apps.googleusercontent.com'

class GoogleLoginTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.env=patch.dict(os.environ,{'GOOGLE_CLIENT_ID':CID,'DATABASE_URL':'','COOKIE_SECURE':'false','APP_ORIGINS':'http://localhost:3000','RENDER':''})
        self.env.start()
        self.data=patch('app.database.DATA',Path(self.tmp.name));self.data.start()
        self.client=TestClient(app);self.client.__enter__()
        self.claims={'aud':CID,'iss':'https://accounts.google.com','email_verified':True,'sub':uuid.uuid4().hex,'email':'student@example.test','name':'Student'}
        self.challenge()
        self.verify=patch('app.google_login.verify_token',side_effect=lambda *a:dict(self.claims));self.verify.start()
    def challenge(self):
        r=self.client.get('/api/auth/google/config');self.assertEqual(r.status_code,200,r.text)
        self.claims['nonce']=r.json()['nonce']
    def post(self,**extra):
        return self.client.post('/api/auth/google',headers=ORIGIN,json={'credential':'fake-google-token-for-test',**extra})
    def tearDown(self):
        self.verify.stop();self.client.__exit__(None,None,None);self.data.stop();self.env.stop();self.tmp.cleanup()
    def test_new_user_and_repeat_signin(self):
        r=self.post();self.assertEqual(r.status_code,200,r.text);ident=r.json()['id']
        self.assertEqual(self.client.get('/api/auth/me').json()['id'],ident)
        self.assertGreater(len(self.client.get('/api/subjects').json()),0)
        self.client.post('/api/auth/logout');self.challenge()
        self.assertEqual(self.post().json()['id'],ident)
        with db() as c:self.assertEqual(c.execute('SELECT COUNT(*) AS n FROM users').fetchone()['n'],1)
    def test_replay(self):
        cookie=self.client.cookies.get('masterymap_google_challenge')
        self.assertEqual(self.post().status_code,200)
        self.client.cookies.set('masterymap_google_challenge',cookie,path='/api/auth/google')
        self.assertEqual(self.post().status_code,401)
    def test_wrong_nonce(self):
        self.claims['nonce']='wrong';self.assertEqual(self.post().status_code,401)
    def test_bad_claims(self):
        for key,value in [('aud','wrong'),('iss','https://attacker.test'),('email_verified',False),('sub','')]:
            with self.subTest(key=key):
                old=self.claims[key];self.claims[key]=value
                self.assertEqual(self.post().status_code,401)
                self.claims[key]=old
    def test_origin_and_no_cookie(self):
        r=self.client.post('/api/auth/google',json={'credential':'fake-google-token-for-test'})
        self.assertEqual(r.status_code,403)
        self.client.cookies.clear();self.assertEqual(self.post().status_code,401)
    def test_link_requires_existing_password(self):
        old=self.client.post('/api/auth/register',json={'name':'Original','email':self.claims['email'],'password':'existing-password'})
        self.assertEqual(old.status_code,200,old.text)
        self.assertEqual(self.post().status_code,409)
        self.assertEqual(self.post(link_password='wrong-password').status_code,401)
        r=self.post(link_password='existing-password');self.assertEqual(r.status_code,200,r.text)
        self.assertEqual(r.json()['id'],old.json()['id'])
    def test_google_sub_is_stable_identity(self):
        ident=self.post().json()['id'];self.challenge();self.claims['email']='changed@example.test'
        self.assertEqual(self.post().json()['id'],ident)
    def test_verifier_rejection_and_outage(self):
        with patch('app.google_login.verify_token',side_effect=ValueError('invalid')):self.assertEqual(self.post().status_code,401)
        with patch('app.google_login.verify_token',side_effect=TimeoutError()):self.assertEqual(self.post().status_code,503)
    def test_disabled(self):
        with patch.dict(os.environ,{'GOOGLE_CLIENT_ID':''}):
            self.assertFalse(self.client.get('/api/auth/google/config').json()['enabled'])
            self.assertEqual(self.post().status_code,503)
    def test_expired_challenge(self):
        with db() as c:c.execute('UPDATE google_challenges SET expires=0')
        self.assertEqual(self.post().status_code,401)


class GoogleSignatureTests(unittest.TestCase):
    def test_real_verifier_signature_audience_and_expiry(self):
        import time
        from google.auth import crypt, jwt
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.primitives import serialization
        from app.google_login import verify_token
        key=rsa.generate_private_key(public_exponent=65537,key_size=2048)
        private=key.private_bytes(serialization.Encoding.PEM,serialization.PrivateFormat.PKCS8,serialization.NoEncryption())
        public=key.public_key().public_bytes(serialization.Encoding.PEM,serialization.PublicFormat.SubjectPublicKeyInfo).decode()
        signer=crypt.RSASigner.from_string(private,key_id='test-key')
        claims={'iss':'https://accounts.google.com','aud':CID,'sub':'test-sub','iat':int(time.time())-10,'exp':int(time.time())+300}
        signed=jwt.encode(signer,claims).decode()
        with patch('google.oauth2.id_token._fetch_certs',return_value={'test-key':public}):
            self.assertEqual(verify_token(signed,CID)['sub'],'test-sub')
            with self.assertRaises(ValueError):verify_token(signed,'wrong-audience')
            expired=jwt.encode(signer,dict(claims,iat=int(time.time())-500,exp=int(time.time())-100)).decode()
            with self.assertRaises(ValueError):verify_token(expired,CID)
            parts=signed.split('.');parts[2]=('A' if parts[2][0]!='A' else 'B')+parts[2][1:]
            with self.assertRaises(ValueError):verify_token('.'.join(parts),CID)

if __name__=='__main__':unittest.main()

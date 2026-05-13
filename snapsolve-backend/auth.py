"""
SnapSolve Authentication — JWT-based user registration and login.
Uses SQLite for persistent user storage and bcrypt for password hashing.
"""

import os
import sqlite3
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from pydantic import BaseModel, Field


# ── Configuration ────────────────────────────────────────────────────

SECRET_KEY = os.getenv("JWT_SECRET_KEY", "snapsolve-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 72  # 3 days

DB_PATH = os.path.join(os.path.dirname(__file__), "users.db")

# Bearer token extractor
security = HTTPBearer()


# ── Password Helpers ─────────────────────────────────────────────────

def hash_password(password: str) -> str:
    """Hash a password using bcrypt."""
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


# ── Database ─────────────────────────────────────────────────────────

def get_db():
    """Get a SQLite connection with row_factory enabled."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Create users table if it doesn't exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()


# Initialize on import
init_db()


# ── Pydantic Models ──────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=30)
    password: str = Field(..., min_length=6)
    display_name: Optional[str] = None


class LoginRequest(BaseModel):
    username: str
    password: str


class AuthResponse(BaseModel):
    token: str
    user: dict


class UserProfile(BaseModel):
    id: int
    username: str
    display_name: Optional[str]
    created_at: str


# ── Token Helpers ────────────────────────────────────────────────────

def create_access_token(user_id: int, username: str) -> str:
    """Create a JWT access token."""
    expire = datetime.now(timezone.utc) + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {
        "sub": str(user_id),
        "username": username,
        "exp": expire,
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def verify_token(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """Dependency: extract and verify the JWT from the Authorization header."""
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        username = payload.get("username")
        if user_id is None or username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication token",
            )
        return {"user_id": int(user_id), "username": username}
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token expired or invalid. Please log in again.",
        )


# ── Auth Functions ───────────────────────────────────────────────────

def register_user(request: RegisterRequest) -> AuthResponse:
    """Register a new user and return a JWT token."""
    conn = get_db()
    try:
        # Check if username already exists
        existing = conn.execute(
            "SELECT id FROM users WHERE username = ?", (request.username.lower(),)
        ).fetchone()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Username already taken. Try another one.",
            )

        # Hash password and insert
        password_hash = hash_password(request.password)
        display_name = request.display_name or request.username
        cursor = conn.execute(
            "INSERT INTO users (username, password_hash, display_name) VALUES (?, ?, ?)",
            (request.username.lower(), password_hash, display_name),
        )
        conn.commit()
        user_id = cursor.lastrowid

        # Generate token
        token = create_access_token(user_id, request.username.lower())
        return AuthResponse(
            token=token,
            user={
                "id": user_id,
                "username": request.username.lower(),
                "display_name": display_name,
            },
        )
    finally:
        conn.close()


def login_user(request: LoginRequest) -> AuthResponse:
    """Authenticate a user and return a JWT token."""
    conn = get_db()
    try:
        row = conn.execute(
            "SELECT id, username, password_hash, display_name FROM users WHERE username = ?",
            (request.username.lower(),),
        ).fetchone()

        if not row or not verify_password(request.password, row["password_hash"]):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid username or password.",
            )

        token = create_access_token(row["id"], row["username"])
        return AuthResponse(
            token=token,
            user={
                "id": row["id"],
                "username": row["username"],
                "display_name": row["display_name"],
            },
        )
    finally:
        conn.close()

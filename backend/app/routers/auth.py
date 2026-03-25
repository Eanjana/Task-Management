"""
Authentication API router.

@description Endpoints for user registration, login, and profile retrieval
@author Developer
@date 24-03-2026
"""

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User
from ..schemas.user import UserCreate, UserLogin, UserResponse, Token
from ..services.auth import register_user, authenticate_user, get_current_user
from ..utils.security import create_access_token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])


@router.post("/register", response_model=UserResponse, status_code=201)
def register(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user account."""
    user = register_user(db, user_data)
    return user


@router.post("/login", response_model=Token)
def login(user_data: UserLogin, db: Session = Depends(get_db)):
    """Authenticate user and return JWT access token."""
    user = authenticate_user(db, user_data.email, user_data.password)
    access_token = create_access_token(data={"sub": str(user.id)})
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return current_user


@router.get("/users", response_model=List[UserResponse])
def get_all_users(
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Get all users (for assignee dropdown)."""
    return db.query(User).all()

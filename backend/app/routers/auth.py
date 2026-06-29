import logging
from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.deps import get_db, get_current_user
from app.models.user import User
from app.schemas.user import UserCreate, UserLogin, UserRead, Token, UserUpdate
from app.security import hash_password, verify_password, create_access_token

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/auth", tags=["auth"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> Token:
    """Register a new user and generate a JWT access token"""
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == payload.email).first()
    if existing_user:
        logger.warning("[router:auth] registration failed: email %s already registered", payload.email)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered"
        )

    # Create new user record
    hashed_pwd = hash_password(payload.password)
    new_user = User(
        full_name=payload.full_name,
        email=payload.email,
        password_hash=hashed_pwd
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    logger.info("[router:auth] user registered successfully: %s", new_user.email)

    # Generate JWT token
    access_token = create_access_token(data={"sub": new_user.email})
    return Token(access_token=access_token, token_type="bearer")


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)) -> Token:
    """Authenticate user and return JWT access token"""
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.password_hash):
        logger.warning("[router:auth] login failed: invalid credentials for email %s", payload.email)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    logger.info("[router:auth] user logged in successfully: %s", user.email)
    access_token = create_access_token(data={"sub": user.email})
    return Token(access_token=access_token, token_type="bearer")


@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)) -> UserRead:
    """Retrieve details of the authenticated user"""
    return current_user


@router.put("/profile", response_model=UserRead)
def update_profile(
    payload: UserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> UserRead:
    """Update profile details of the authenticated user"""
    logger.info("[router:auth] user %s updating profile details", current_user.email)
    
    # Check if email is being updated and is already taken
    if payload.email != current_user.email:
        existing_user = db.query(User).filter(User.email == payload.email).first()
        if existing_user:
            logger.warning("[router:auth] profile update failed: email %s already taken", payload.email)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email address already in use by another account"
            )
            
    current_user.full_name = payload.full_name
    current_user.email = payload.email
    db.commit()
    db.refresh(current_user)
    return current_user


@router.delete("/account", status_code=status.HTTP_204_NO_CONTENT)
def delete_account(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Permanently delete user account and all owned assets"""
    logger.info("[router:auth] user %s permanently deleting their account", current_user.email)
    db.delete(current_user)
    db.commit()
    return


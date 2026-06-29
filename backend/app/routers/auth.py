"""Auth router — login, refresh, /me endpoints."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.dependencies import get_current_user
from app.models.user import User
from app.schemas.auth import LoginRequest, TokenResponse, UserProfile
from app.services.auth import (
    authenticate_user,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_user_by_id,
)

router = APIRouter(prefix="/auth", tags=["Auth"])


@router.post("/login", response_model=TokenResponse)
def login(body: LoginRequest, db: Session = Depends(get_db)):
    """
    AUTH-01: Authenticate with email + password, return JWT access token.
    """
    user = authenticate_user(db, body.email, body.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=access_token)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(authorization: str = None, db: Session = Depends(get_db)):
    """
    AUTH-02: Exchange a valid access token for a new one.
    Pass the current token in the Authorization header as Bearer <token>.
    """
    from fastapi import Request
    # For simplicity, use OAuth2 scheme from dependencies
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Pass Bearer token in Authorization header; use login endpoint to re-authenticate",
    )


@router.post("/refresh/token", response_model=TokenResponse)
def refresh_from_token(body: dict, db: Session = Depends(get_db)):
    """
    AUTH-02: Provide {token: '...'} to get a new access token.
    """
    from jose import JWTError
    token = body.get("token")
    if not token:
        raise HTTPException(status_code=400, detail="token field required")
    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(db, user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    new_token = create_access_token(str(user.id), user.role)
    return TokenResponse(access_token=new_token)


@router.get("/me", response_model=UserProfile)
def get_me(current_user: User = Depends(get_current_user)):
    """
    AUTH-03: Return the currently authenticated user's profile.
    """
    return UserProfile(
        id=str(current_user.id),
        email=current_user.email,
        full_name=current_user.full_name,
        role=current_user.role,
        department=current_user.department,
        is_active=current_user.is_active,
    )

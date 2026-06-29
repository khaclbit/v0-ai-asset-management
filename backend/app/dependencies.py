"""
FastAPI dependencies — auth guards implemented in Phase 27.
Stubs are here so routers can import them now without circular errors.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(token: str = Depends(oauth2_scheme)):
    """
    Validate JWT and return current user.
    Implemented fully in Phase 27 — this stub raises 501 until then.
    """
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Authentication not yet implemented (Phase 27)",
    )


def require_role(*roles: str):
    """
    Role-checking dependency factory.
    Usage: Depends(require_role("Admin", "Asset Manager"))
    Implemented fully in Phase 27.
    """
    async def _checker(current_user=Depends(get_current_user)):
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Role guard not yet implemented (Phase 27)",
        )
    return _checker

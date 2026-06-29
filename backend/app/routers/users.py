from fastapi import APIRouter

router = APIRouter(prefix="/users", tags=["Users"])


@router.get("")
async def list_users():
    """Implemented in Phase 29."""
    return []


@router.post("")
async def create_user():
    """Implemented in Phase 29."""
    return {"detail": "Not yet implemented"}


@router.patch("/{user_id}/role")
async def update_user_role(user_id: str):
    """Implemented in Phase 29."""
    return {"detail": "Not yet implemented"}


@router.post("/{user_id}/deactivate")
async def deactivate_user(user_id: str):
    """Implemented in Phase 29."""
    return {"detail": "Not yet implemented"}

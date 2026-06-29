from fastapi import APIRouter

router = APIRouter(prefix="/assets", tags=["Assets"])


@router.get("")
async def list_assets():
    """Implemented in Phase 28."""
    return []


@router.post("")
async def create_asset():
    """Implemented in Phase 28."""
    return {"detail": "Not yet implemented"}


@router.get("/{asset_id}")
async def get_asset(asset_id: str):
    """Implemented in Phase 28."""
    return {"detail": "Not yet implemented"}


@router.patch("/{asset_id}")
async def update_asset(asset_id: str):
    """Implemented in Phase 28."""
    return {"detail": "Not yet implemented"}


@router.post("/{asset_id}/retire")
async def retire_asset(asset_id: str):
    """Implemented in Phase 28."""
    return {"detail": "Not yet implemented"}

"""
Attachment Pydantic schemas.

@description Schemas for attachment API responses
@author Anjana E
@date 24-03-2026
"""

from datetime import datetime

from pydantic import BaseModel


class AttachmentResponse(BaseModel):
    """Schema for attachment data in API responses."""
    id: int
    task_id: int
    file_path: str
    file_name: str
    created_at: datetime

    class Config:
        from_attributes = True

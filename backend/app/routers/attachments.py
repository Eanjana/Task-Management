import os
import uuid
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session
from supabase import create_client, Client

from ..config import settings, supabase
from ..database import get_db
from ..models.attachment import Attachment
from ..models.user import User
from ..schemas.attachment import AttachmentResponse
from ..services.auth import get_current_user
from ..services.task import get_task_by_id

router = APIRouter(prefix="/api/attachments", tags=["Attachments"])

ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp", ".avif"}

@router.post("/{task_id}", response_model=AttachmentResponse, status_code=201)
async def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Upload an image attachment for a specific task."""
    get_task_by_id(db, task_id)

    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File type '{ext}' not allowed. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )

    unique_name = f"{uuid.uuid4().hex}{ext}"
    content = await file.read()

    # --- SUPABASE STORAGE ---
    if supabase:
        try:
            bucket_name = "attachments"
            file_path = f"{task_id}/{unique_name}"
            
            # Upload to Supabase
            supabase.storage.from_(bucket_name).upload(
                path=file_path,
                file=content,
                file_options={"content-type": file.content_type}
            )
            
            # Get Public URL
            public_url = supabase.storage.from_(bucket_name).get_public_url(file_path)
            final_path = public_url
        except Exception as e:
            # Fallback to local if Supabase fails (or handle error)
            print(f"Supabase upload error: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to upload to Supabase: {str(e)}"
            )
    else:
        # --- LOCAL FALLBACK ---
        upload_dir = os.path.join(settings.UPLOAD_DIR, str(task_id))
        os.makedirs(upload_dir, exist_ok=True)
        final_path = os.path.join(upload_dir, unique_name)
        with open(final_path, "wb") as f:
            f.write(content)

    # Create DB record
    attachment = Attachment(
        task_id=task_id,
        file_path=final_path,
        file_name=file.filename or unique_name,
    )
    db.add(attachment)
    db.commit()
    db.refresh(attachment)
    return attachment


@router.get("/{task_id}", response_model=List[AttachmentResponse])
def list_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """List all attachments for a specific task."""
    get_task_by_id(db, task_id)
    return db.query(Attachment).filter(Attachment.task_id == task_id).all()


@router.delete("/{attachment_id}", status_code=204)
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    _current_user: User = Depends(get_current_user),
):
    """Delete an attachment by ID."""
    attachment = db.query(Attachment).filter(Attachment.id == attachment_id).first()
    if not attachment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Attachment not found")

    # Remove from Supabase if using full URL
    if supabase and "supabase.co" in attachment.file_path:
        try:
            # Extract path from URL (last 2 segments: task_id/filename)
            parts = attachment.file_path.split("/")
            storage_path = f"{parts[-2]}/{parts[-1]}"
            supabase.storage.from_("attachments").remove([storage_path])
        except Exception as e:
            print(f"Failed to delete from Supabase: {e}")
    # Remove from local disk if it exists
    elif os.path.exists(attachment.file_path):
        os.remove(attachment.file_path)

    db.delete(attachment)
    db.commit()

"""
Attachment database model.

@description SQLAlchemy model for file attachments linked to tasks
@author Developer
@date 24-03-2026
"""

from sqlalchemy import Column, ForeignKey, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from ..database import Base


class Attachment(Base):
    """Represents a file attachment linked to a task."""

    __tablename__ = "attachments"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    file_path = Column(String(500), nullable=False)
    file_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="attachments")

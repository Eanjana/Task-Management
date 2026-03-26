"""
ActiveTaskMember database model.

@description SQLAlchemy model for tracking active workers on a task
@author Antigravity
@date 26-03-2026
"""

from sqlalchemy import Column, ForeignKey, Integer, DateTime, func
from sqlalchemy.orm import relationship

from ..database import Base


class ActiveTaskMember(Base):
    """Represents a user currently working on a task."""

    __tablename__ = "active_task_members"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="active_members")
    user = relationship("User", lazy="selectin")

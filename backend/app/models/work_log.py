"""
WorkLog database model.

@description SQLAlchemy model for tracking work entries on tasks
@author Anjana E
@date 26-03-2026
"""

from sqlalchemy import Column, ForeignKey, Integer, String, Text, DateTime, Date, func
from sqlalchemy.orm import relationship

from ..database import Base


class WorkLog(Base):
    """Represents a work log entry for a task."""

    __tablename__ = "work_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    task_id = Column(Integer, ForeignKey("tasks.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    start_time = Column(String(20), nullable=False)
    end_time = Column(String(20), nullable=False)
    work_date = Column(Date, nullable=False, server_default=func.current_date())
    seconds_spent = Column(Integer, nullable=False, default=0)
    description = Column(Text, nullable=True, default="")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    task = relationship("Task", back_populates="work_logs")
    user = relationship("User", lazy="selectin")

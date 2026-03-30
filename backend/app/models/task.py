"""
Task database model.

@description SQLAlchemy model for the tasks table with status and priority enums
@author Anjana E
@date 24-03-2026
"""

import enum

from sqlalchemy import Boolean, Column, Enum, ForeignKey, Integer, String, Text, DateTime, func
from sqlalchemy.orm import relationship

from ..database import Base


class TaskStatus(str, enum.Enum):
    """Allowed task status values."""
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class TaskPriority(str, enum.Enum):
    """Allowed task priority values."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    URGENT = "urgent"


class Task(Base):
    """Represents a task in the management system."""

    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True, default="")
    status = Column(
        Enum(TaskStatus, name="task_status"),
        nullable=False,
        default=TaskStatus.TODO,
    )
    priority = Column(
        Enum(TaskPriority, name="task_priority"),
        nullable=False,
        default=TaskPriority.NORMAL,
    )
    assigned_time_seconds = Column(Integer, nullable=True, default=0)
    total_time_spent_seconds = Column(Integer, nullable=True, default=0)
    team = Column(String(100), nullable=True, default="")
    assignee_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    completed_by_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    hidden_from_list = Column(Boolean, nullable=False, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    due_at = Column(DateTime(timezone=True), nullable=True)
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    assignee = relationship("User", foreign_keys=[assignee_id], back_populates="tasks", lazy="selectin")
    completed_by = relationship("User", foreign_keys=[completed_by_id], lazy="selectin")
    attachments = relationship(
        "Attachment", back_populates="task", cascade="all, delete-orphan", lazy="selectin"
    )
    work_logs = relationship(
        "WorkLog", back_populates="task", cascade="all, delete-orphan", lazy="selectin",
        order_by="WorkLog.created_at"
    )
    active_members = relationship(
        "ActiveTaskMember", back_populates="task", cascade="all, delete-orphan", lazy="selectin"
    )

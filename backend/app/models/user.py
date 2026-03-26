"""
User database model.

@description SQLAlchemy model for the users table
@author Anjana E
@date 24-03-2026
"""

from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship

from ..database import Base


class User(Base):
    """Represents a user in the task management system."""

    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True, default=None)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    tasks = relationship("Task", foreign_keys="[Task.assignee_id]", back_populates="assignee", lazy="selectin")

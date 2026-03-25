"""
Task service layer.

@description Handles CRUD operations for tasks
@author Developer
@date 24-03-2026
"""

from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.task import Task, TaskStatus
from ..schemas.task import TaskCreate, TaskUpdate


def get_all_tasks(
    db: Session,
    status_filter: Optional[TaskStatus] = None,
) -> List[Task]:
    """Retrieve all tasks, optionally filtered by status."""
    query = db.query(Task)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    return query.order_by(Task.created_at.desc()).all()


def get_task_by_id(db: Session, task_id: int) -> Task:
    """
    Retrieve a single task by ID.

    Raises HTTPException if not found.
    """
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task with id {task_id} not found",
        )
    return task


def create_task(db: Session, task_data: TaskCreate) -> Task:
    """Create a new task."""
    new_task = Task(
        title=task_data.title,
        description=task_data.description,
        status=task_data.status,
        priority=task_data.priority,
        time_taken_minutes=task_data.time_taken_minutes or 0,
        assignee_id=task_data.assignee_id,
        team=task_data.team,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


def update_task(db: Session, task_id: int, task_data: TaskUpdate) -> Task:
    """
    Update an existing task.

    Only updates fields that are explicitly provided (non-None).
    """
    task = get_task_by_id(db, task_id)
    update_data = task_data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(task, field, value)

    db.commit()
    db.refresh(task)
    return task


def delete_task(db: Session, task_id: int) -> None:
    """Delete a task by ID."""
    task = get_task_by_id(db, task_id)
    db.delete(task)
    db.commit()

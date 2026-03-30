"""
Task service layer.

@description Handles CRUD operations for tasks
@author Anjana E
@date 24-03-2026
"""

from datetime import datetime
from typing import List, Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.task import Task, TaskStatus
from ..models.work_log import WorkLog
from ..models.task_member import ActiveTaskMember
from ..schemas.task import TaskCreate, TaskUpdate, WorkLogCreate, WorkLogUpdate


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
        assigned_time_seconds=task_data.assigned_time_seconds or 0,
        assignee_id=task_data.assignee_id,
        team=task_data.team,
        created_at=task_data.created_at,
        due_at=task_data.due_at,
        completed_at=datetime.now() if task_data.status == TaskStatus.COMPLETED else None,
    )
    db.add(new_task)
    db.commit()
    db.refresh(new_task)
    return new_task


def update_task(db: Session, task_id: int, task_data: TaskUpdate, current_user_id: Optional[int] = None) -> Task:
    """
    Update an existing task.

    Only updates fields that are explicitly provided (non-None).
    """
    task = get_task_by_id(db, task_id)
    update_data = task_data.model_dump(exclude_unset=True)

    # Set/Clear completed_at if status changes
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == TaskStatus.COMPLETED and task.status != TaskStatus.COMPLETED:
            task.completed_at = datetime.now()
            # Automatically set completed_by if not provided and we have current_user_id
            if "completed_by_id" not in update_data and current_user_id:
                task.completed_by_id = current_user_id
                
            # Stop all active members and auto-log their time
            active_users = [m.user_id for m in task.active_members]
            for uid in active_users:
                stop_working(db, task_id, uid)
            task = get_task_by_id(db, task_id) # Refresh
        elif new_status != TaskStatus.COMPLETED and task.status == TaskStatus.COMPLETED:
            task.completed_at = None
            task.completed_by_id = None

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


# ── Work Log operations ──

def add_work_log(db: Session, task_id: int, user_id: int, log_data: WorkLogCreate) -> WorkLog:
    """Add a work log entry to a task."""
    # 0. If this is a manual log (non-automatic), delete existing auto-logs for this user/task 
    # to prevent double-counting. We match by description pattern.
    auto_desc = "Automatic work log from 'Start Working' session"
    if log_data.description != auto_desc:
        auto_logs = db.query(WorkLog).filter(
            WorkLog.task_id == task_id,
            WorkLog.user_id == user_id,
            WorkLog.description == auto_desc
        ).all()
        for al in auto_logs:
            db.delete(al)
        db.flush()

    work_log = WorkLog(
        task_id=task_id,
        user_id=user_id,
        start_time=log_data.start_time,
        end_time=log_data.end_time,
        work_date=log_data.work_date or datetime.now().date(),
        seconds_spent=log_data.seconds_spent,
        description=log_data.description,
    )
    db.add(work_log)

    # Recalculate total time from all CURRENT work logs (after deletion)
    db.flush()
    task = db.query(Task).filter(Task.id == task_id).first()
    if task:
        total = sum(wl.seconds_spent for wl in task.work_logs)
        task.total_time_spent_seconds = total

    db.commit()
    db.refresh(task)
    db.refresh(work_log)
    return work_log


def update_work_log(db: Session, log_id: int, user_id: int, log_data: WorkLogUpdate) -> WorkLog:
    """Update an existing work log entry."""
    work_log = db.query(WorkLog).filter(WorkLog.id == log_id).first()
    if not work_log:
        raise HTTPException(status_code=404, detail="Work log not found")
    
    if work_log.user_id != user_id:
        raise HTTPException(status_code=403, detail="You can only edit your own work logs")

    update_data = log_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(work_log, field, value)

    db.flush()
    
    # Recalculate task total
    task = db.query(Task).filter(Task.id == work_log.task_id).first()
    if task:
        task.total_time_spent_seconds = sum(wl.seconds_spent for wl in task.work_logs)

    db.commit()
    db.refresh(work_log)
    return work_log


def get_work_logs(db: Session, task_id: int) -> List[WorkLog]:
    """Get all work logs for a task."""
    get_task_by_id(db, task_id)  # Validate task exists
    return db.query(WorkLog).filter(WorkLog.task_id == task_id).order_by(WorkLog.created_at).all()


# ── Active Task Member operations ──

def start_working(db: Session, task_id: int, user_id: int) -> ActiveTaskMember:
    """
    Mark a user as actively working on a task.
    Also transitions task from TODO to IN_PROGRESS if needed.
    """
    task = get_task_by_id(db, task_id)

    # Check if already active
    existing = db.query(ActiveTaskMember).filter(
        ActiveTaskMember.task_id == task_id,
        ActiveTaskMember.user_id == user_id,
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is already working on this task",
        )

    member = ActiveTaskMember(task_id=task_id, user_id=user_id)
    db.add(member)

    # Auto-transition todo → in_progress
    if task.status == TaskStatus.TODO:
        task.status = TaskStatus.IN_PROGRESS

    db.commit()
    db.refresh(member)
    db.refresh(task)
    return member


def stop_working(db: Session, task_id: int, user_id: int) -> None:
    """Remove a user from actively working on a task and log their work time."""
    member = db.query(ActiveTaskMember).filter(
        ActiveTaskMember.task_id == task_id,
        ActiveTaskMember.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User is not currently working on this task",
        )
        
    started_at = member.started_at
    if started_at:
        now = datetime.now(started_at.tzinfo)
        delta = now - started_at
        seconds_spent = int(delta.total_seconds())
        
        # Create work log
        work_log = WorkLog(
            task_id=task_id,
            user_id=user_id,
            start_time=started_at.strftime("%H:%M:%S"),
            end_time=now.strftime("%H:%M:%S"),
            work_date=now.date(),
            seconds_spent=seconds_spent,
            description="Automatic work log from 'Start Working' session"
        )
        db.add(work_log)
        
    db.delete(member)
    db.flush()
    
    task = get_task_by_id(db, task_id)
    if task:
        task.total_time_spent_seconds = sum(wl.seconds_spent for wl in task.work_logs)
        
    db.commit()


def delete_work_log(db: Session, log_id: int):
    """Delete a work log entry and recalculate task total time."""
    work_log = db.query(WorkLog).filter(WorkLog.id == log_id).first()
    if not work_log:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Work log not found",
        )
    
    task_id = work_log.task_id
    db.delete(work_log)
    db.flush()
    
    # Recalculate
    task = get_task_by_id(db, task_id)
    if task:
        task.total_time_spent_seconds = sum(wl.seconds_spent for wl in task.work_logs)
        
    db.commit()
    return True

"""Bug reports from the "Report a bug" form. Saved for the developer to read; never shown back."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from skinlog.db import get_db
from skinlog.deps import current_user
from skinlog.models import BugReport, User
from skinlog.schemas import BugReportCreate

router = APIRouter(prefix="/bug-reports")


@router.post("", status_code=204)
def create_bug_report(
    body: BugReportCreate, user: User = Depends(current_user), db: Session = Depends(get_db)
) -> None:
    db.add(BugReport(user_id=user.id, **body.model_dump()))
    db.commit()

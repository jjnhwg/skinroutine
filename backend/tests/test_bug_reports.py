from skinlog.models import BugReport
from tests.tokens import USER_2, auth_header


def test_report_is_saved_for_the_signed_in_user(client, db_session):
    response = client.post(
        "/api/bug-reports",
        json={"message": "  Photo won't upload  ", "page": "#/log", "user_agent": "Safari"},
    )

    assert response.status_code == 204
    report = db_session.query(BugReport).one()
    assert (report.user_id, report.message, report.page, report.user_agent) == (
        1, "Photo won't upload", "#/log", "Safari"
    )
    assert report.created_at is not None


def test_blank_message_is_rejected(client):
    response = client.post("/api/bug-reports", json={"message": "   "})

    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Can't be blank"


def test_needs_sign_in(client):
    response = client.post("/api/bug-reports", json={"message": "x"}, headers={"Authorization": ""})

    assert response.status_code == 401

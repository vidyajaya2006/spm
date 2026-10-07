from backend.app import app


def test_home_page():
    client = app.test_client()
    response = client.get("/")
    assert response.status_code == 200


def test_get_transactions():
    client = app.test_client()
    response = client.get("/transactions", follow_redirects=True)
    assert response.status_code == 200


def test_get_summary():
    client = app.test_client()
    response = client.get("/summary", follow_redirects=True)
    assert response.status_code == 200
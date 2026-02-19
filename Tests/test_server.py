import pytest
from fastapi.testclient import TestClient
from Backend.Server import app

client = TestClient(app)


def make_file(name: str, content: str):
    return ("uploaded_files", (name, content, "text/plain"))


class TestServer:

    def test_root_page(self):
        response = client.get("/")
        assert response.status_code in (200, 404)

    def test_upload_no_files(self):
        response = client.post("/upload/", files={})
        assert response.status_code == 422

    def test_upload_invalid_extension(self):
        files = [make_file("test.txt", "hello")]
        response = client.post("/upload/", files=files, follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/visualize"
        import os
        if os.path.exists("test.txt"):
            os.remove("test.txt")

    def test_upload_duplicate_filenames(self):
        files = [
            make_file("a.dpd", 'N: 1 "A" [];'),
            make_file("a.dpd", 'N: 2 "B" [];')
        ]
        response = client.post("/upload/", files=files, follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/visualize"

    def test_upload_single_dpd_graph(self):
        files = [make_file("a.dpd", 'N: 1 "A" [];')]
        response = client.post("/upload/", files=files, follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/visualize"

    def test_api_graph_empty(self):
        app.graph_data = {"nodes": [], "edges": []}
        app.node_types = {}
        response = client.get("/api/graph")
        assert response.status_code == 200
        data = response.json()
        assert "graph_data" in data
        assert "node_types" in data

    def test_api_graph_success(self):
        app.graph_data = {"nodes": [1], "edges": [2]}
        app.node_types = {"A": "Type"}
        response = client.get("/api/graph")
        assert response.status_code == 200
        data = response.json()
        assert data["graph_data"] == app.graph_data
        assert data["node_types"] == app.node_types

    def test_error_page(self):
        response = client.get("/error")
        assert response.status_code in (200, 404)

    def test_api_error_default(self):
        app.last_error = None
        response = client.get("/api/error")
        assert response.status_code == 200
        assert "error" in response.json()

'''
    def test_upload_coq_failure(self, monkeypatch):
        def fake_compile(filename):
            return False, "Coq error"
        from Backend import Server
        monkeypatch.setattr(Server, "compile_coq_code", fake_compile)
        files = [make_file("a.v", "Theorem A: True. Proof. exact I. Qed.")]
        response = client.post("/upload/", files=files, follow_redirects=False)
        assert response.status_code == 303
        assert response.headers["location"] == "/error"
'''

def test_visualize_page_missing(monkeypatch):
    from Backend import Server
    monkeypatch.setattr(Server.os.path, "exists", lambda _: False)
    response = client.get("/visualize")
    assert response.status_code in (200, 404)


def test_visualize_page_exists(monkeypatch):
    from Backend import Server
    monkeypatch.setattr(Server.os.path, "exists", lambda _: True)
    response = client.get("/visualize")
    assert response.status_code == 200


def test_error_page_exists(monkeypatch):
    from Backend import Server
    monkeypatch.setattr(Server.os.path, "exists", lambda _: True)
    response = client.get("/error")
    assert response.status_code == 200


def test_create_node_types(monkeypatch):
    class FakeParser:
        def parse_text(self, text):
            pass
        def to_dict(self):
            return {"X": "Type"}
    from Backend import Server
    monkeypatch.setattr(Server.RocqParser, "RocqParser", lambda: FakeParser())
    result = Server.create_node_types({"a.v": "content"})
    assert result == {"X": "Type"}

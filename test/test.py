# first, start up Node server normally
# then, run current file in pure python3
import unittest
import requests


class TestSpot(unittest.TestCase):
    def test_ping(self):
        r = requests.get("http://localhost:3000/ping")
        assert r.status_code == 200
        assert r.text == "pong"


class TestCoreAPI(unittest.TestCase):
    def test_aggregate(self):
        r = requests.post(
            "http://localhost:3000/aggregate",
            json={"points": [{"lat": 1, "lng": 1}, {"lat": 2, "lng": 2}]},
        )
        assert r.status_code == 200


class TestPOI(unittest.TestCase):
    def test_list(self):
        r = requests.get("http://localhost:3000/poi/list")
        assert r.status_code == 200

        r = requests.get("http://localhost:3000/poi/list?pageNum=1&pageSize=2")
        assert r.status_code == 200

    def test_create(self):
        source_id = 12345678

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": source_id, "lat": 1, "lng": 1},
        )
        assert r.status_code == 200

        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": source_id, "lat": 1, "lng": 1},
        )
        assert r.status_code == 409

        r = requests.get("http://localhost:3000/poi/info?source_id=%s" % source_id)
        assert r.status_code, 200
        assert r.json()["data"]["source_id"] == source_id

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

    def test_info(self):
        source_id = 12345678

        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": source_id, "lat": 1, "lng": 1},
        )
        assert r.status_code == 200

        r = requests.get("http://localhost:3000/poi/info?source_id=%s" % source_id)
        assert r.status_code == 200
        assert r.json()["data"]["lat"] == 1

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

        r = requests.get("http://localhost:3000/poi/info?source_id=%s" % source_id)
        assert r.status_code == 404

    def test_update(self):
        source_id = 12345678

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": source_id, "lat": 1, "lng": 1},
        )
        assert r.status_code == 200

        r = requests.post(
            "http://localhost:3000/poi/update?source_id=%s" % source_id,
            json={"source_id": 12345678, "lat": 2, "lng": 2},
        )
        assert r.status_code == 200

        r = requests.get("http://localhost:3000/poi/info?source_id=%s" % source_id)
        assert r.status_code, 200
        assert r.json()["data"]["lat"] == 2

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

        r = requests.post(
            "http://localhost:3000/poi/update?source_id=%s" % source_id,
            json={"source_id": 12345678, "lat": 3, "lng": 3},
        )
        assert r.status_code == 200

        r = requests.get("http://localhost:3000/poi/info?source_id=%s" % source_id)
        assert r.status_code, 200
        assert r.json()["data"]["lat"] == 3

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

    def test_remove(self):
        source_id = 12345678

        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": source_id, "lat": 1, "lng": 1},
        )
        assert r.status_code == 200

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

        r = requests.get("http://localhost:3000/poi/%s" % source_id)
        assert r.status_code, 404

        r = requests.post("http://localhost:3000/poi/delete?source_id=%s" % source_id)
        assert r.status_code, 200

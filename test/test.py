# first, start up Node server normally
# then, run current file in pure python3
import unittest
import requests


class Test(unittest.TestCase):
    def test_ping(self):
        r = requests.get("http://localhost:3000/ping")
        assert r.status_code, 200
        assert r.text, "pong"

    def aggregate(self):
        r = requests.post(
            "http://localhost:3000/aggregate",
            json={"points": [{"lat": 1, "lng": 1}, {"lat": 2, "lng": 2}]},
        )
        assert r.status_code, 200
        data = r.json()

    def test_poi(self):
        # list
        r = requests.get("http://localhost:3000/poi/list")
        assert r.status_code, 200

        # create
        r = requests.post(
            "http://localhost:3000/poi/create",
            json={"source_id": 12345678, "lat": 1, "lng": 1},
        )
        assert r.status_code, 200
        new_poi_id = r.json()["id"]
        assert type(new_poi_id), int

        # info
        r = requests.get("http://localhost:3000/poi/%s" % new_poi_id)
        assert r.status_code, 200
        assert r.json()["lat"], 1

        # update
        r = requests.post(
            "http://localhost:3000/poi/%s/update" % new_poi_id,
            json={"source_id": 12345678, "lat": 2, "lng": 2},
        )
        assert r.status_code, 200

        # info2
        r = requests.get("http://localhost:3000/poi/%s" % new_poi_id)
        assert r.status_code, 200
        assert r.json()["lat"], 2

        # delete
        r = requests.post("http://localhost:3000/poi/%s/delete" % new_poi_id)
        assert r.status_code, 200

        # info3
        r = requests.get("http://localhost:3000/poi/%s" % new_poi_id)
        assert r.status_code, 404

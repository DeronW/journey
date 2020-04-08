# Usage

API test and Load test. need Python3 and pip3 install first.

### install dependencies

```shell
pip3 install -r requirements.txt
```

### API test

```shell
pytest --capture=tee-sys test.py
```

### load test

```shell
locust -f locustfile.py
```

open your browser http://localhost:8089/，set test parameters.

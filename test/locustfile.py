from locust import HttpLocust, TaskSet, task, between

# from locust.contrib.fasthttp import FastHttpLocust


class UserBehaviour(TaskSet):
    @task()
    def aggregate(self):
        self.client.post(
            "/aggregate",
            # headers={"Content-Type": "application/json"},
            json={"points": [{"lat": 39, "lng": 120}, {"lat": 32, "lng": 110}]},
        )


class WebsiteUser(HttpLocust):
    task_set = UserBehaviour
    wait_time = between(1, 2)

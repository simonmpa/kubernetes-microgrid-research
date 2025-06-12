from kubernetes import client, config, utils
import yaml
import time
import datetime

configuration = client.Configuration()
configuration.host = "http://localhost:3131" # 
client.Configuration.set_default(configuration)

v1 = client.CoreV1Api()




def get_utc_timestamp(addMilliseconds: int):
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    combined_time = now_utc + datetime.timedelta(milliseconds=addMilliseconds)
    formatted_time = combined_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return formatted_time

def deploy_job(time: int):
    yaml_deployment = f"""
apiVersion: batch/v1
kind: Job
metadata:
  generateName: job-
  namespace: default

spec:
  template:
    metadata:
      annotations:
        stage-delay: "{get_utc_timestamp(time)}"
    spec:
      containers:
        - name: job-container
          image: registry.k8s.io/pause:3.5
          resources:
            limits:
              cpu: 100m
              memory: 16Gi
            requests:
              cpu: 100m
              memory: 16Gi
      restartPolicy: Never
  ttlSecondsAfterFinished: 5
    """


    job = yaml.safe_load(yaml_deployment)
    api = client.BatchV1Api()
    res = api.create_namespaced_job(namespace="default", body=job)
    print(res)


deploy_job(30000)
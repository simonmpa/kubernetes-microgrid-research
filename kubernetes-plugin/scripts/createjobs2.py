from kubernetes import client, config, utils
import datetime

configuration = client.Configuration()
configuration.host = "http://localhost:3131" # 
client.Configuration.set_default(configuration)


k8s_client = client.ApiClient()

def get_utc_timestamp(addMilliseconds: int):
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    combined_time = now_utc + datetime.timedelta(milliseconds=addMilliseconds)
    formatted_time = combined_time.strftime("%Y-%m-%dT%H:%M:%SZ")
    return formatted_time

def create_job(name = "name", time = 0, cpu = "1", memory = "1Gi", avg_cpu = "10.0"):


    example_dict = {'apiVersion': 'batch/v1',
                    'kind': 'Job',
                    'metadata': {
                        'name': name,
                        'namespace': 'default',
                    },
                    'spec': {
                        'template': {
                            'metadata': {
                                'annotations': {
                                    'stage-delay': str(get_utc_timestamp(time)),
                                    'avg-cpu': avg_cpu
                                }
                            },
                            'spec': {
                                'containers': [{
                                    'name': 'job-container',
                                    'image': 'registry.k8s.io/pause:3.5',
                                    'resources': {
                                        'limits': {
                                            'cpu': cpu,
                                            'memory': memory,
                                        },
                                        'requests': {
                                            'cpu': cpu,
                                            'memory': memory,
                                        }
                                    }
                                }],
                                'restartPolicy': 'Never'
                            }
                        },
                        'ttlSecondsAfterFinished': 0
                    }

                    }
    utils.create_from_dict(k8s_client, example_dict)
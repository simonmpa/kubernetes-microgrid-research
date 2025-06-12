from kubernetes import client, config, utils

configuration = client.Configuration()
configuration.host = "http://localhost:3131" # 
client.Configuration.set_default(configuration)


k8s_client = client.ApiClient()

def create_node(name = "default-name", microgrid = "default-location", cpu = "32", memory = "256Gi"):

    example_dict = {'apiVersion': 'v1',
                    'kind': 'Node',
                    'metadata': {
                        'annotations': {
                            'node.alpha.kubernetes.io/ttl': '0',
                            'kwok.x-k8s.io/node': 'fake'
                        },
                        'labels': {
                            'beta.kubernetes.io/arch': 'amd64',
                            'beta.kubernetes.io/os': 'linux',
                            'kubernetes.io/arch': 'amd64',
                            'kubernetes.io/hostname': name,
                            'kubernetes.io/os': 'linux',
                            'kubernetes.io/role': 'agent',
                            'node-role.kubernetes.io/agent': "",
                            'type': 'kwok',
                            'location': microgrid,
                        },
                        'name': name
                    },
                    'status': {
                        'allocatable': {
                            'cpu': cpu,
                            'memory': memory,
                            'pods': '110',
                        },
                        'capacity': {
                            'cpu': cpu,
                            'memory': memory,
                            'pods': '110',
                        },
                        'nodeInfo': {
                            'architecture': 'amd64',
                            'bootID': ' ',
                            'kernelVersion': ' ',
                            'kubeProxyVersion': 'fake',
                            'kubeletVersion': 'fake',
                            'machineID': ' ',
                            'operatingSystem': 'linux',
                            'osImage': ' ',
                            'systemUUID': ' ',
                        },
                        'phase': 'Running'
                    }
    }
    utils.create_from_dict(k8s_client, example_dict)

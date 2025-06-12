# Kubernetes Microgrid Scheduling Research Simulation
This repository presents a novel approach to workload scheduling in Kubernetes by simulating **data centers as microgrids** capable of operating both connected to and disconnected from the main power grid. These microgrids utilize **renewable energy production** and **battery storage** to improve computations sustainability.
We are extending the [*python-microgrid*](https://github.com/ahalev/python-microgrid) to include nodes with a variable power consumption based on scheduled workloads.
For more information, please refer to the [paper]().

## Prerequisites
To replicate the experiments, you will need:
- The [solarPV](https://data.dtu.dk/articles/dataset/Solar_PV_generation_time_series_PECD_2021_update_/19727239) data and place it in the `python-microgrid-simulation/data` folder.
- [Python 3.11.5](https://www.python.org/downloads/release/python-3115/) (as the experiment was conducted with this version).
- Install the required Python packages by running:
  ```bash
  pip install -r python-microgrid-simulation/requirements.txt
  ```
- The [Azure worktrace](https://azurepublicdatasettraces.blob.core.windows.net/azurepublicdataset/trace_data/vmtable/vmtable.csv.gz) and placed in the ``kubernetes-plugin/scripts/`` folder.
- Install [Make](https://sourceforge.net/projects/gnuwin32/files/make/3.81/make-3.81.exe/) and add it to your path (depending on operating system).
- Install [Docker](https://docs.docker.com/desktop/) and install for your given operating system.


## Running the Microgrid Simulation

Before getting started, create the database by running the following command:

```bash
python python-microgrid-simulation/src/database.py
```

To run the simulation, you will need two terminals. Open the first terminal in the root directory and run the following command:

```bash
flask --app python-microgrid-simulation/src/api run
```

Likewise, open the second terminal in the root directory and run the following command:

```bash
python python-microgrid-simulation/src/app.py
```

## Running the Kubernetes Plugin and Workload

### Running the Kubernetes Scheduler Simulator
First, ensure the Docker Engine is running.
To run the Kubernetes Scheduler Simulator, go to ``kubernetes-plugin/kubernetes-scheduler-simulator/`` and run the following command:
```bash
make docker_build_and_up
```
This should build the scheduler and run it has part of a kwok cluster in docker.

Then go to ``kubernetes-plugin/kwok-stages-fast/`` and run:

```bash
kubectl -s :3131 apply -f stage-fast.yaml
```
This applies the stages, that are used to decide how long a job runs.

To enable the plugin, go to ``localhost:3000`` and click on the cogwheel icon on the top left.

Add the plugin, which in this case is called ``NodeNumber``, and give it a desired weight. 
![Configuration](/images/plugin-weight.png)

### Running the worktrace

To emulate our test-setup, go to ``kubernetes-plugin/scripts/`` and run:

```bash
python createazurenodes.py
```

This will create the exact same nodes as used in our paper.

Sort the Azure worktrace by running the following command in the `kubernetes-plugin/scripts/` directory:

```bash
python datacleaning.py
```

The worktrace is then ready to be run, which is done with the following command:

**Important! This requires the microgrid simulation and flask api to be running**

```bash
python azureworktracerunner.py
```

## Evaluation of results
After you have run the simulation, you can inspect and evaluate the results the results stored in the `python-microgrid-simulation/logs` folder.
Here the results of the simulation for each microgrid is stored in a separate log file.

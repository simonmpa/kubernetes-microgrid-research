# Kubernetes Microgrid Scheduling Research Simulation
## Overview
This repository presents a novel approach to workload scheduling in Kubernetes by simulating **data centers as microgrids** capable of operating both connected to and disconnected from the main power grid. These microgrids utilize **renewable energy production** and **battery storage** to improve computations sustainability.

## Prerequisites
To replicate the experiments, you will need:
- The [solarPV](https://data.dtu.dk/articles/dataset/Solar_PV_generation_time_series_PECD_2021_update_/19727239) data and place it in the `python-microgrid-simulation/data` folder.
- [Python 3.11.5](https://www.python.org/downloads/release/python-3115/) (as the experiment was conducted with this version).
- Install the required Python packages by running:
  ```bash
  pip install -r python-microgrid-simulation/requirements.txt
  ```
- The [Azure worktrace]() and place it in the `kubernetes-plugin/data` folder.


## Running the Microgrid Simulation

Before getting started, create the database by running the following command:

```bash
python src/database.py
```

To run the simulation, you will need two terminals. Open the first terminal in the *python-microgrid-simulation* directory and run the following command:

```bash
flask --app src/api run
```

Likewise, open the second terminal in the *python-microgrid-simulation* directory and run the following command:

```bash
python src/app.py
```

## Running the Kubernetes Plugin and Workload


## Evaluation of results
After you have run the simulation, you can inspect and evaluate the results the results stored in the `python-microgrid-simulation/logs` folder.
Here the results of the simulation for each microgrid is stored in a separate log file.


```bash
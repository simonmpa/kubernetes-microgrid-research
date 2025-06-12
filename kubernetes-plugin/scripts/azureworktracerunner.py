import csv
import time
from createjobs2 import create_job

start_time = time.time()
end_time = 2591700 / 30
time_offset = 10


with open('vmtable2.csv', 'r', newline='') as csvfile:
    reader = csv.reader(csvfile)
    head = next(reader)
    i = 0

    while time.time() - start_time < end_time:
        if (float(head[0]) / 30) < (time.time() - start_time + time_offset):
            time_in_milliseconds = (float(head[1]) - float(head[0])) * 1000
            print("Starting job ", i, " - Start time: ", float(head[0]) / 30, " Duration in seconds: ", time_in_milliseconds / 1000)

            num_cores = int(head[6])
            # 16 is equal to core count of a server
            avg_cpu = float(head[3]) / (16 / num_cores)

            transformed_time_in_milliseconds = (time_in_milliseconds / 30)
            create_job(name='job-' + str(i), time=transformed_time_in_milliseconds, cpu=str(head[6]), memory=str(head[7]) + "Gi", avg_cpu=str(avg_cpu))
            head = next(reader)

            # For small test
            head = next(reader)
            head = next(reader)
            head = next(reader)
            head = next(reader)
            head = next(reader)

            i += 1


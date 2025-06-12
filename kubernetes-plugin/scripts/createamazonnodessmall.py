from createnodes import create_node
import csv


with open('gridnames.csv', mode='r') as csvfile:
    csvreader = csv.reader(csvfile)
    for row in csvreader:
        for i in range(2):
            create_node(name=row[0].lower() + "-" + str(i+1), microgrid=row[0], cpu="16", memory="112Gi")
            print(row[0])

#for i in range(880):
#    create_node(name="api-created-node-" + str(i), microgrid="Denmark", cpu="16", memory="112Gi")
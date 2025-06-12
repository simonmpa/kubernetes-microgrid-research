import pandas as pd
try:
    df = pd.read_csv("vmtable2.csv")
except FileNotFoundError:
    print("Error: The file 'hhhh.csv' was not found.")
    exit()
if df.shape[1] < 2:
    print("Error: The CSV file must have at least two columns.")
    exit()
subtraction_results = df.iloc[:, 1] - df.iloc[:, 0]
average_subtraction = subtraction_results.mean()
print(f"The average of (Column 2 - Column 1) for each row is: {average_subtraction}")
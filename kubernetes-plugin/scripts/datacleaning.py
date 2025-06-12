import pandas as pd

input_file = "./vmtable.csv"
output_file = "vmtable2.csv"
df = pd.read_csv(input_file)
df_trimmed = df.iloc[:, 3:]
df_sorted = df_trimmed.sort_values(by=df_trimmed.columns[0])
df_sorted = df_sorted[df_sorted.iloc[:, 0] != 0]
df_sorted.to_csv(output_file, index=False)
print(f"First 3 rows removed. Output saved to {output_file}")
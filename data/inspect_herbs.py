import pandas as pd

df = pd.read_excel('D:/game/med/data/herbs-0401.xlsx')

print("=== Columns ===")
print(list(df.columns))
print(f"\n=== Total rows: {len(df)} ===")
print(f"desc empty: {df['desc'].isna().sum()}")
print(f"use empty: {df['use'].isna().sum()}")

print("\n=== First 20 rows ===")
pd.set_option('display.max_columns', None)
pd.set_option('display.width', 200)
pd.set_option('display.max_colwidth', 50)
print(df.head(20).to_string())

print("\n=== Rows where desc is empty ===")
empty = df[df['desc'].isna()]
print(empty.to_string())

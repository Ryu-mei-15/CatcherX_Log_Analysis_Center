import pandas as pd
import glob
import json
import os

# 先ほどのグラフ描画コードに合わせて，CSVがあるディレクトリを絶対パスで指定します
DATA_DIR = '/Users/yamaguchimiyu/Downloads/Date'

# 指定ディレクトリ内のCSVを取得
csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
combined_data = []

speed_map = {
    '0_100.csv': '100 km/h', '0_130.csv': '130 km/h', '0_158.csv': '158 km/h',
    '1_100.csv': '100 km/h', '1_130.csv': '130 km/h', '1_158.csv': '158 km/h',
    '2_100.csv': '100 km/h', '2_130.csv': '130 km/h', '2_158.csv': '158 km/h',
    '3_100.csv': '100 km/h', '3_130.csv': '130 km/h', '3_158.csv': '158 km/h',
    '4_100.csv': '100 km/h', '4_130.csv': '130 km/h', '4_158.csv': '158 km/h',
    # 念のためテストログファイルも定義に入れておきます
    'Log_Sub_Test01_20260529_165524.csv': '100 km/h',
    'Log_Sub_Test01_20260529_165732.csv': '130 km/h',
    'Log_Sub_Test01_20260529_165916.csv': '158 km/h'
}

print(f"探索先ディレクトリ: {DATA_DIR}")
print(f"見つかったCSVファイル数: {len(csv_files)}\n")

for file_path in csv_files:
    file_name = os.path.basename(file_path) # パスからファイル名だけを抽出
    
    if file_name not in speed_map:
        print(f"[-] スキップ: {file_name} (speed_mapに定義がありません)")
        continue
        
    print(f"[+] 読み込み中: {file_name}")
    
    # Dataset名の抽出（Log_Sub系と数字始まりで分岐）
    if file_name.startswith('Log_Sub'):
        dataset_name = "Dataset Test"
    else:
        parts = file_name.replace(".csv", "").split("_")
        dataset_name = f"Dataset {parts[0]}"
        
    speed = speed_map[file_name]
    
    try:
        df = pd.read_csv(file_path)
        
        # 必要なカラムが存在するか確認しつつ抽出
        for _, row in df.iterrows():
            record = {
                "dataset": dataset_name,
                "speed": speed,
                "target_x": row.get("Target_Pos_X", 0),
                "target_y": row.get("Target_Pos_Y", 0),
                "target_z": row.get("Target_Pos_Z", 0),
                "mitt_x": row.get("Mitt_Catch_X", 0),
                "mitt_y": row.get("Mitt_Catch_Y", 0),
                "mitt_z": row.get("Mitt_Catch_Z", 0),
                "catch_result": str(row.get("Catch_Result", ""))
            }
            combined_data.append(record)
    except Exception as e:
        print(f"[!] エラー発生 ({file_name}): {e}")

# カレントディレクトリに data.json を出力
output_path = "data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(combined_data, f, ensure_ascii=False, indent=2)

print(f"\n==============================================")
print(f"完了: 合計 {len(combined_data)} 件のログを {output_path} に書き出しました．")
print(f"==============================================")
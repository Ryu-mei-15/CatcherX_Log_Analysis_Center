import pandas as pd
import glob
import json
import os
import math

# データの読み込み先をGitリポジトリ内のDataディレクトリに変更
DATA_DIR = '/Users/yamaguchimiyu/Git/CatcherX_Log_Analysis_Center/DataCourse'

# 指定ディレクトリ内のCSVを取得
csv_files = glob.glob(os.path.join(DATA_DIR, "*.csv"))
combined_data = []

print(f"探索先ディレクトリ: {DATA_DIR}")
print(f"見つかったCSVファイル数: {len(csv_files)}\n")

for file_path in csv_files:
    file_name = os.path.basename(file_path)
    parts = file_name.replace(".csv", "").split("_")
    
    # ファイル名から Player と 球速 を自動抽出
    if len(parts) == 2 and parts[1].isdigit():
        player_name = f"Player {parts[0]}"
        speed = f"{parts[1]} km/h"
    elif file_name.startswith('Log_Sub'):
        player_name = "Player Test"
        if '100' in file_name: speed = '100 km/h'
        elif '130' in file_name: speed = '130 km/h'
        elif '158' in file_name: speed = '158 km/h'
        else: speed = 'Unknown km/h'
    else:
        continue
        
    try:
        df = pd.read_csv(file_path)
        for _, row in df.iterrows():
            tx = row.get("Target_Pos_X", 0)
            ty = row.get("Target_Pos_Y", 0)
            tz = row.get("Target_Pos_Z", 0)
            mx = row.get("Mitt_Catch_X", 0)
            my = row.get("Mitt_Catch_Y", 0)
            mz = row.get("Mitt_Catch_Z", 0)

            # 誤差の算出 (cm単位に変換)
            diff_x = (mx - tx) * 100
            diff_y = (my - ty) * 100
            diff_z = (mz - tz) * 100

            # 補正量（目標点から実際のミット位置までの絶対的距離）
            correction_2d = math.sqrt(diff_x**2 + diff_y**2)
            correction_3d = math.sqrt(diff_x**2 + diff_y**2 + diff_z**2)

            record = {
                "player": player_name,
                "speed": speed,
                "course": str(row.get("Selected_Course_Zone", "Unknown")),
                "target_x": tx,
                "target_y": ty,
                "target_z": tz,
                "mitt_x": mx,
                "mitt_y": my,
                "mitt_z": mz,
                "diff_x_cm": diff_x,
                "diff_y_cm": diff_y,
                "diff_z_cm": diff_z,
                "correction_2d_cm": correction_2d,
                "correction_3d_cm": correction_3d,
                "catch_result": str(row.get("Catch_Result", ""))
            }
            combined_data.append(record)
    except Exception as e:
        print(f"[!] エラー発生 ({file_name}): {e}")

# data.json を出力
output_path = "data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(combined_data, f, ensure_ascii=False, indent=2)

print(f"完了: 合計 {len(combined_data)} 件のログを {output_path} に書き出し，ミット補正量を付与しました．")
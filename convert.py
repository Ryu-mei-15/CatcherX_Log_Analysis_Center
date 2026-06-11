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
            # 目標到達点
            tx = row.get("Target_Pos_X", 0.0)
            ty = row.get("Target_Pos_Y", 0.0)
            tz = row.get("Target_Pos_Z", 0.0)
            
            # 実際のボール到達点（Impact_Pos）
            ix = row.get("Impact_Pos_X", tx) # 欠損時は0になるようtxをデフォルトに
            iy = row.get("Impact_Pos_Y", ty)
            
            # ミットの捕球位置
            mx = row.get("Mitt_Catch_X", 0.0)
            my = row.get("Mitt_Catch_Y", 0.0)
            mz = row.get("Mitt_Catch_Z", 0.0)

            # 1. ミット補正量の算出 (cm単位)
            # (目標点から実際にミットを動かした距離)
            diff_x = (mx - tx) * 100
            diff_y = (my - ty) * 100
            diff_z = (mz - tz) * 100
            correction_2d = math.sqrt(diff_x**2 + diff_y**2)
            correction_3d = math.sqrt(diff_x**2 + diff_y**2 + diff_z**2)

            # 2. 制球誤差の算出 (cm単位)
            # (目標点と実際のボール到達点のズレ)
            pitch_err_x = (ix - tx) * 100
            pitch_err_y = (iy - ty) * 100
            control_error_2d = math.sqrt(pitch_err_x**2 + pitch_err_y**2)

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
                "control_error_2d_cm": control_error_2d, # 正常に計算された制球誤差
                "catch_result": str(row.get("Catch_Result", ""))
            }
            combined_data.append(record)
    except Exception as e:
        print(f"[!] エラー発生 ({file_name}): {e}")

output_path = "data.json"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(combined_data, f, ensure_ascii=False, indent=2)

print(f"完了: 合計 {len(combined_data)} 件のログを {output_path} に書き出しました．")
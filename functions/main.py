import datetime
import os
import io
import csv
from firebase_admin import initialize_app, storage
from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from openai import OpenAI
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)

# すべてのオリジンを許可する場合（開発環境向け）
CORS(app, origins="*")

# --- Firebase Admin SDKの初期化 ---
# Cloud Functions環境では、引数なしで初期化すると
# 自動的にプロジェクトの認証情報が使われます。
initialize_app()

# 関数のグローバルオプションを設定（例：最大インスタンス数）
set_global_options(max_instances=10)

# 環境変数からOpenAI APIキーを取得
openai_api_key = "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"
client = OpenAI(api_key=openai_api_key)
headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '3600',  # プリフライト結果をキャッシュする秒数
    'Content-Type': 'application/json'
}
# --- HTTPトリガーで起動する関数の定義 ---
# @https_fn.on_request()デコレータで関数を登録します
@https_fn.on_request()
def get_image(req: https_fn.Request) -> https_fn.Response:
    """
    Firebase Storageから画像リストを取得し、指定されたindexの画像を返すAPI。
    例： /get_image?index=0
    """
    try:
        # クエリパラメータから 'index' を取得し、整数に変換
        try:
            index = int(req.args.get('index', -1))
        except (ValueError, TypeError):
            return create_response(jsonify({"message": "index不正"}))

        if index < 0:
            return create_response(jsonify({"message": "index不正"}))

        # Storageバケットへの参照を取得
        bucket = storage.bucket()
        print(bucket)
        blobs = bucket.list_blobs(prefix="images/")
        for blob in blobs:
            print(f"ファイルが見つかりました: {blob.name}")

        # 指定したフォルダ内のファイル一覧を取得し、すぐにリストに変換
        all_blobs = list(bucket.list_blobs(prefix="images/"))
        print(len(all_blobs))

        # 取得できたオブジェクトの名前をすべて出力
        # フォルダ自体を除外する処理を追加
        image_blobs = sorted(
            [blob for blob in all_blobs if not blob.name.endswith('/')],
            key=lambda x: x.name
        )

        for blob in image_blobs:
            print(f"見つかったファイル: {blob.name}")

        # リストが空かどうか確認
        if not image_blobs:
            # ファイルがない場合はエラーレスポンスを返す
            return create_response(jsonify({"message": "指定されたプレフィックスにファイルが見つかりません。"}))

        print("インデックス:" + str(index))
        print("合計件数:" + str(len(image_blobs)))

        # Indexがリストの範囲内かチェック
        if not (0 <= index < len(image_blobs)):
            return create_response(jsonify({"message": '{"error": "Index out of range"}'}))

        # 指定されたIndexの画像Blobを取得
        target_blob = image_blobs[index]

        # 画像データをバイトとしてダウンロード
        image_data = target_blob.download_as_bytes()

        # 画像のMIMEタイプ（Content-Type）を決定
        mimetype = target_blob.content_type or 'application/octet-stream'

        # firebase_functions.Responseオブジェクトを使って画像データを直接返す
        return create_response(jsonify(image_data))

    except Exception as e:
        # エラーハンドリング
        return create_response(jsonify({"message": "エラー発生:" + str(e)}))

@https_fn.on_request()
def hello_world(req: https_fn.Request) -> https_fn.Response:
    # サーバーのログに出力
    print("サーバーテスト: Hello, World リクエストを受信")

    # 成功を示す HTTP ステータスコード200を明示的に返す
    return create_response(jsonify({"message": "こんにちは、テスト送信は成功しました。"}))


@https_fn.on_request()
def generate_images_from_csv(req: https_fn.Request) -> https_fn.Response:
    """
    POSTリクエストで受け取ったCSVファイルから画像を生成し、Firebase Storageに格納する関数。
    """
    # POSTリクエストか確認
    if req.method != 'POST':
        return create_response(jsonify({"message": "POST送信してください"}))

    # CSVファイルをリクエストボディから取得
    try:
        csv_data = req.data.decode('utf-8')
        csv_reader = csv.reader(io.StringIO(csv_data))
        # ヘッダー行をスキップ
        next(csv_reader)
    except Exception as e:
        return create_response(jsonify({"message": "エラー発生:" + str(e)}))

    # Storageバケットへの参照を取得
    bucket = storage.bucket()

    # CSVの各行を処理
    for i, row in enumerate(csv_reader):
        if not row:
            continue

        prompt = row[0]
        try:
            # OpenAI DALL-E 3 APIを呼び出し
            response = client.images.generate(
                model="dall-e-3",
                prompt=prompt,
                n=1,
                size="1024x1024"
            )
            image_url = response.data[0].url

            # 画像データをダウンロード
            import requests
            image_data = requests.get(image_url).content

            # ファイル名を生成
            file_name = f"image_{i + 1}_{os.path.basename(image_url).split('.')[0]}.png"
            blob = bucket.blob(f"images/{file_name}")

            # Storageに画像をアップロード
            blob.upload_from_string(image_data, content_type='image/png')
            print(f"画像 '{file_name}' を正常にアップロードしました。")

        except Exception as e:
            print(f"エラー: 画像の生成またはアップロードに失敗しました - {str(e)}")
            continue  # エラーが発生しても処理を続行

    return create_response(jsonify({"message": "成功しました！"}))

@https_fn.on_request()
def generate_and_save_image(req: https_fn.Request) -> https_fn.Response:

    # URLクエリパラメータからプロンプトを取得
    prompt = req.args.get('prompt')
    print('起動')
    print(prompt)
    if not prompt:
        return create_response(jsonify({"message": "promptがありません"}))

    # Storageバケットへの参照を取得
    bucket = storage.bucket()

    try:
        # OpenAI DALL-E 3 APIを呼び出し
        response = client.images.generate(
            model="dall-e-3",
            prompt=prompt,
            n=1,
            size="1024x1024"
        )
        image_url = response.data[0].url

        # 画像データをダウンロード
        import requests
        image_data = requests.get(image_url).content

        # ファイル名を生成（タイムスタンプとハッシュを含めることで重複を避ける）
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        import hashlib
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:8]
        file_name = f"image_{timestamp}_{prompt_hash}.png"
        blob = bucket.blob(f"images/{file_name}")

        # Storageに画像をアップロード
        blob.upload_from_string(image_data, content_type='image/png')

        response_message = f'画像 "{file_name}" を正常に生成・アップロードしました。'
        print(response_message)

        return create_response(jsonify({"message": "成功しました！"}))

    except Exception as e:
        error_message = f'エラー: 画像の生成またはアップロードに失敗しました - {str(e)}'
        print(error_message)
        return create_response(jsonify({"message": error_message}))

def create_response(res: jsonify):
    response = res
    response.headers.update(headers)
    return response
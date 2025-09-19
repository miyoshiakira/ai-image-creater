import base64
import datetime
import json
import mimetypes
import os
import io
import csv
from firebase_admin import initialize_app, storage
from firebase_functions import https_fn
from firebase_functions.options import set_global_options
from httpx import stream
from openai import OpenAI
from flask import Flask, jsonify, send_file
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
    Firebase Storageから指定した名称の画像のダウンロードURLを取得します。

    Args:
        image_name (str): 取得したい画像のファイル名（例: 'photo.jpg'）。

    Returns:
        str or None: 画像のダウンロードURL。ファイルが存在しない場合はNone。
    """
    try:
        # Storageバケットへの参照を取得
        bucket = storage.bucket()
        image_name = req.args.get('image_name')
        if image_name is None:
            return create_response(jsonify({"message": '"image_name" is nothing'}))

        # 画像のファイルパスを指定してBlob（ファイル）への参照を作成
        # 例: 'images/photo.jpg' のようにフォルダ名を含めることもできます
        blob = bucket.blob(f'votes/images/{image_name}')

        # ファイルが存在するか確認
        if not blob.exists():
            print(f"Error: File '{image_name}' not found.")
            return create_response(jsonify({"message": f"Error: File '{image_name}' not found."}))

        # ファイルのMIMEタイプを推測
        mimetype, _ = mimetypes.guess_type(image_name)
        if not mimetype:
            mimetype = 'application/octet-stream' # 推測できない場合は汎用タイプを使用

        stream_data = blob.download_as_bytes()
        return send_file(
            io.BytesIO(stream_data),
            mimetype=mimetype
        )

    except Exception as e:
        print(f"An error occurred: {e}")
        return jsonify({"message": f"An error occurred: {e}"})

@https_fn.on_request()
def hello_world(req: https_fn.Request) -> https_fn.Response:
    # サーバーのログに出力
    print("サーバーテスト: Hello, World リクエストを受信")

    # 成功を示す HTTP ステータスコード200を明示的に返す
    return create_response(jsonify({"message": "Success Test"}))

@https_fn.on_request(timeout_sec=300)
def generate_and_save_image(req: https_fn.Request) -> https_fn.Response:

    # URLクエリパラメータからプロンプトを取得
    prompt = req.args.get('prompt')
    size = req.args.get('size')
    print('起動')
    print(prompt)
    if not prompt:
        return create_response(jsonify({"message": "promptがありません"}))

    # Storageバケットへの参照を取得
    bucket = storage.bucket()

    try:
        # OpenAI gpt-image-1 APIを呼び出し
        response = client.images.generate(
            model="gpt-image-1",  # ←ここを変更
            prompt=prompt,
            size=size,
        )

        # base64エンコードされた画像データを取得し、バイトデータにデコード
        image_data = response.data[0].b64_json
        image_bytes = base64.b64decode(image_data)

        # ファイル名を生成（タイムスタンプとハッシュを含めることで重複を避ける）
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        import hashlib
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:8]
        file_name = f"image_{timestamp}_{prompt_hash}.png"
        blob = bucket.blob(f"images/{file_name}")

        # Storageに画像をアップロード
        blob.upload_from_string(image_bytes, content_type='image/png')

        response_message = f'画像 "{file_name}" を正常に生成・アップロードしました。'
        print(response_message)

        return create_response(jsonify({"message": "成功しました！"}))

    except Exception as e:
        error_message = f'エラー: 画像の生成またはアップロードに失敗しました - {str(e)}'
        print(error_message)
        return create_response(jsonify({"message": error_message}))


@https_fn.on_request(timeout_sec=300)
def chat_with_openai(req: https_fn.Request) -> https_fn.Response:
    try:
        # Get the user's message from the request
        prompt = req.args.get("prompt")
        if not prompt:
            return create_response(jsonify({"error": "Prompt is missing."}))

        # Create a conversation with a single user message
        chat_completion = client.chat.completions.create(
            messages=[
                # 以下のように、`role`と`content`を明確に指定する
                {
                    "role": "user",
                    "content": prompt,
                },
            ],
            model="gpt-4o",
            timeout=180.0
        )

        # Extract the assistant's reply
        reply = chat_completion.choices[0].message.content

        return create_response(jsonify({"success": True, "reply": reply}))

    except Exception as e:
        return create_response(jsonify({"error": str(e)}))


@https_fn.on_request(timeout_sec=300)
def vote_counter(req: https_fn.Request) -> https_fn.Response:

    # リクエストから投票項目を取得
    voted_item = req.args.get('item')
    if voted_item is None:
        return create_response(jsonify({"message": '"item" is nothing'}))

    # JSONファイル名とパス
    file_name = 'vote_counts.json'
    file_path = f'votes/{file_name}'

    # ストレージから現在の投票データを取得
    bucket = storage.bucket()
    blob = bucket.blob(file_path)

    try:
        # ファイルが存在する場合
        file_data = blob.download_as_text()
        vote_data = json.loads(file_data)
    except Exception:
        # ファイルが存在しない場合
        vote_data = {}

    # 投票数をインクリメント
    vote_data[voted_item] = vote_data.get(voted_item, 0) + 1

    # 更新されたデータをJSON形式で保存
    blob.upload_from_string(json.dumps(vote_data, indent=4), content_type='application/json')

    # 成功レスポンスを返す
    response = {
        'message': f'"{voted_item}"に投票しました。 現在：{vote_data}',
        'current_counts': vote_data
    }
    return create_response(jsonify(response))

@https_fn.on_request(timeout_sec=300)
def get_vote_counts(req: https_fn.Request) -> https_fn.Response:
    """
    Firebase StorageからJSONファイルを読み込み、その内容をJSONレスポンスとして返します。
    """
    try:
        # Storageバケットへの参照を取得
        bucket = storage.bucket()

        # 目的のファイルへの参照を作成
        blob = bucket.blob('votes/vote_counts.json')

        # ファイルが存在するか確認
        if not blob.exists():
            return create_response(jsonify({"message":"File not found"}))
        print('start reading vote_counts.json')
        # ファイルの中身を文字列としてダウンロード
        json_data_str = blob.download_as_string()
        print('start json convert')
        # 文字列をJSONオブジェクトにパース
        vote_counts = json.loads(json_data_str)
        print('end json convert -start')
        print(vote_counts)
        print('end json convert -end')
        # JSONレスポンスを返す
        return create_response(jsonify(vote_counts))

    except Exception as e:
        # エラーが発生した場合、500エラーとして返す
        return create_response(jsonify({"message": "Error:" + str(e)}))

def create_response(res: jsonify):
    response = res
    response.headers.update(headers)
    return response
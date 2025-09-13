import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  CircularProgress,
  Paper,
  Alert,
  Snackbar, } from '@mui/material';
import { CloudUpload as CloudUploadIcon, Send as SendIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
// APIからのレスポンスの型を定義
interface ApiResponse {
  reply: string;
  success: boolean;
}

const API_ENDPOINT = 'https://us-central1-ai-image-creater.cloudfunctions.net/chat_with_openai'; // あなたのFirebase FunctionsのURLに置き換えてください
interface TextChatProps {
  onChange: (csvStr: string) => void;
}
const TextChat: React.FC<TextChatProps> = (props: TextChatProps) => {
    const [inputText, setInputText] = useState<string>(`1.短く直感的（8～15文字）
2.友達に話したくなる／笑える／驚く要素を1つ入れる
3.ワクワク・ドキドキ感のある動詞を使う（例：「ひらく」「とぶ」「でてくる」）
4.想像をふくらませる曖昧さを入れる（例：「その先には…!?」）
5.流行ワードや小学生らしい言い回しも可（例：やばい、神、マジ）
6.長すぎ、説明的すぎ、漢字多すぎはNG`);
    const [apiResponse, setApiResponse] = useState<ApiResponse | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(false);

    //CSV関連
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
    const [csvStr, setCsvStr] = useState<string>('');

    const onDrop = useCallback((acceptedFiles: File[]) => {
        // 複数ファイルがドロップされた場合でも最初の1つだけを処理
        if (acceptedFiles.length > 0) {
        const file = acceptedFiles[0];
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
            setSelectedFile(file);
            setCsvStr(''); // 新しいファイルが選択されたら以前のAPIレスポンスをクリア

            //プロンプト抽出
            // FileReaderインスタンスを作成
            const reader = new FileReader();

            // ファイル読み込みが完了したときのイベントハンドラ
            reader.onload = (event: ProgressEvent<FileReader>) => {
            // ファイルの内容（文字列）を取得し、stateにセット
            const result = event.target?.result as string;
            setCsvStr(result);
            //ほかのコンポーネントに共有可能
            props.onChange(result);
            };

            // ファイルをテキストとして読み込む
            reader.readAsText(file, 'Shift_JIS');

        } else {
            setCsvStr('CSVファイルのみアップロード可能です。');
            setSnackbarOpen(true);
        }
        }
    }, []);
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });
  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    console.log(event);
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(event.target.value);
  };

  const handleSend = async () => {
    setIsLoading(true);
    setApiResponse(null);
    const prompt = `あなたは「小学生に刺さるPOPコピー＆デザインを作るプロフェッショナル」です。
以下の条件と、提供する「小学生による書籍の感想の文字起こし」をもとに、「キャッチコピー」を箇条書きで10個ほど提案をしてください。

コピー作成ルール:${encodeURIComponent(inputText)}

以下は本を読んだ方々の感想です参考にしてください。
感想:${csvStr}`;
    try {
      // fetch APIでGETリクエストを送信
      const response = await fetch(`${API_ENDPOINT}?prompt=${prompt}`);
      
      if (!response.ok) {
        throw new Error('API request failed with status: ' + response.status);
      }

      const data: ApiResponse = await response.json();
      setApiResponse(data);
      

    } catch (error){
            console.error('API call failed:', error);
        // ① まず、errorがErrorオブジェクトのインスタンスであるかを確認
        if (error instanceof Error) {
            // ② Error型として扱えるため、.messageに安全にアクセスできる
            const data = {reply:error.message,success: false}
            setApiResponse(data);
        } else {
            // ③ Errorオブジェクトではない場合
            const data = {reply:'予期せぬエラーが発生しました。',success: false}
            setApiResponse(data);
        }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 3,
        maxWidth: 600,
        margin: '0 auto',
        backgroundColor: 'background.paper',
        borderRadius: 2,
        boxShadow: 3,
      }}
    >
      <Typography variant="h5" component="h1" gutterBottom>
        キャッチコピー生成コーナー
      </Typography>
      
      {/* テキストボックス */}
      <TextField
        label="コピー作成ルール"
        variant="outlined"
        fullWidth
        multiline
        rows={4}
        value={inputText}
        onChange={handleInputChange}
      />
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
        アンケート結果アップロード
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
        アンケート結果のCSVファイルをアップロードしてAPIに送信します。
        </Typography>

        {/* ファイルドロップゾーン */}
        <Box
        {...getRootProps()}
        sx={{
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.400',
            borderRadius: 2,
            p: 4,
            mb: 3,
            backgroundColor: isDragActive ? 'primary.light' : 'grey.50',
            transition: 'background-color 0.3s ease-in-out',
            cursor: 'pointer',
            '&:hover': {
            borderColor: 'primary.dark',
            },
        }}
        >
        <input {...getInputProps()} />
        <CloudUploadIcon sx={{ fontSize: 60, color: 'grey.500', mb: 1 }} />
        {isDragActive ? (
            <Typography variant="h6" color="primary.main">
            ここにファイルをドロップしてください...
            </Typography>
        ) : (
            <Typography variant="h6" color="text.secondary">
            ファイルをドラッグ＆ドロップするか、クリックして選択
            </Typography>
        )}
        <Typography variant="body2" color="text.secondary">
            （.csv 形式のみ）
        </Typography>
        </Box>
        {/* 選択されたファイル表示 */}
        {selectedFile && (
        <Box sx={{ mb: 3, p: 2, border: '1px solid', borderColor: 'grey.300', borderRadius: 1, backgroundColor: 'background.paper' }}>
            <Typography variant="subtitle1" component="p" sx={{ fontWeight: 'medium' }}>
            選択されたファイル: <span style={{ color: 'primary.dark' }}>{selectedFile.name}</span> ({(selectedFile.size / 1024).toFixed(2)} KB)
            </Typography>
        </Box>
        )}
        {/* プロンプト */}
        <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'start' }}>
            <span>【みんなの感想】</span>
            <br />
            {csvStr == '' ? null: csvStr }
        </Paper>
        {/* APIレスポンス表示（Snackbarで通知） */}
        {csvStr != '' && (
        <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert
            onClose={handleSnackbarClose}
            severity={'success'}
            sx={{ width: '100%' }}
            >
            {'ファイルをロードました。'}
            </Alert>
        </Snackbar>
        )}

        {/* 送信ボタン */}
        <Button
            variant="contained"
            color="primary"
            onClick={handleSend}
            disabled={isLoading || !inputText}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
        >
            キャッチコピー案作成
        </Button>

        {/* 問い合わせ結果表示エリア */}
        <Box sx={{ mt: 3 }}>
            <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'start' }}>
                {isLoading && <CircularProgress />}
                {!apiResponse?.success && apiResponse?.reply && (
                <Typography color="error" variant="body1">
                    エラー: {apiResponse?.reply}
                </Typography>
                )}
                {apiResponse && (
                <Typography variant="body1">
                    【コピーの生成案】
                    <br/>
                    {apiResponse.reply}
                </Typography>
                )}
            </Paper>
        </Box>
    </Box>
  );
};

export default TextChat;
import React, { useState, useCallback } from 'react';
import {
  Container,
  Typography,
  Button,
  Box,
  Paper,
  CircularProgress,
  Alert,
  Snackbar,
} from '@mui/material';
import { CloudUpload as CloudUploadIcon, Send as SendIcon } from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';

// APIエンドポイントのURL（ご自身のAPIに合わせて変更してください）
const API_ENDPOINT = 'https://us-central1-ai-image-creater.cloudfunctions.net/generate_and_save_image';

interface ApiResponseMessage {
  type: 'success' | 'error' | 'info';
  message: string;
}

const CsvUploadPage: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [apiResponse, setApiResponse] = useState<ApiResponseMessage | null>(null);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const [prompt, setPrompt] = useState<string>('');

  const onDrop = useCallback((acceptedFiles: File[]) => {
    // 複数ファイルがドロップされた場合でも最初の1つだけを処理
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        setSelectedFile(file);
        setApiResponse(null); // 新しいファイルが選択されたら以前のAPIレスポンスをクリア

        //プロンプト抽出
        // FileReaderインスタンスを作成
        const reader = new FileReader();

        // ファイル読み込みが完了したときのイベントハンドラ
        reader.onload = (event: ProgressEvent<FileReader>) => {
          // ファイルの内容（文字列）を取得し、stateにセット
          const result = event.target?.result as string;
          setPrompt(result);
        };

        // ファイルをテキストとして読み込む
        reader.readAsText(file, 'Shift_JIS');

      } else {
        setApiResponse({ type: 'error', message: 'CSVファイルのみアップロード可能です。' });
        setSnackbarOpen(true);
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  const handleUpload = async () => {
    if (!selectedFile) {
      setApiResponse({ type: 'error', message: 'ファイルが選択されていません。' });
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    setApiResponse(null);

    const formData = new FormData();
    formData.append('csvFile', selectedFile);
    const url = API_ENDPOINT + '?prompt=' + prompt;
    const idToken = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        // 必要に応じてヘッダーを追加
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setApiResponse({ type: 'success', message: `アップロード成功: ${data.message || 'データが正常に処理されました。'}` });
      } else {
        setApiResponse({ type: 'error', message: `APIエラー: ${data.message || '不明なエラーが発生しました。'}` });
      }
    } catch (error) {
      console.error('API呼び出しエラー:', error);
      setApiResponse({ type: 'error', message: 'ネットワークエラーまたはサーバーへの接続に失敗しました。' });
    } finally {
      setLoading(false);
      setSnackbarOpen(true);
    }
  };

  const handleSnackbarClose = (event?: React.SyntheticEvent | Event, reason?: string) => {
    console.log(event);
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

  return (
    <Container maxWidth="md" sx={{ mt: 5, mb: 5 }}>
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, textAlign: 'center' }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', color: 'primary.main' }}>
          CSVファイルアップロード
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
          CSVファイルをアップロードしてAPIに送信します。
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
          <span>読み込まれたプロンプト</span>
          <br />
          {prompt == '' ? null: prompt }
        </Paper>
        {/* 決定ボタン */}
        <Button
          variant="contained"
          color="primary"
          size="large"
          onClick={handleUpload}
          disabled={!selectedFile || loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
          sx={{ mt: 2, py: 1.5, px: 4, borderRadius: 2, '&:hover': { transform: 'scale(1.02)' } }}
        >
          {loading ? '送信中...' : '決定（APIに送信）'}
        </Button>

        {/* APIレスポンス表示（Snackbarで通知） */}
        {apiResponse && (
          <Snackbar open={snackbarOpen} autoHideDuration={6000} onClose={handleSnackbarClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
            <Alert
              onClose={handleSnackbarClose}
              severity={apiResponse.type}
              sx={{ width: '100%' }}
            >
              {apiResponse.message}
            </Alert>
          </Snackbar>
        )}
      </Paper>
    </Container>
  );
};

export default CsvUploadPage;
import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  Stack,
  TextField,
  Typography,
  CircularProgress,
  Alert
} from '@mui/material';

const API_ENDPOINT = 'https://us-central1-ai-image-creater.cloudfunctions.net/generate_and_save_image'; // ⚠️ Your API endpoint URL

interface PopCreatePageProps {
  thoughts: string;
}
const PopCreatePage: React.FC<PopCreatePageProps> = (props: PopCreatePageProps) => {
  const [purpose, setPurpose] = useState('小学生が本を手に取りたくなるような、直感的でワクワクするPOPを作る。コピーと言葉の温度感は小学生のリアルな感覚に寄せる。');
  const [popSize, setPopSize] = useState({ width: '1536', height: '1024' });
  const [wordCount, setWordCount] = useState({ min: '8', max: '12' });
  const [extraText, setExtraText] = useState('ひらがな・カタカナ多め。難しい漢字は避ける。');
  const [colorScheme, setColorScheme] = useState('明るく元気な色（赤・オレンジ・黄・水色など）、背景と文字のコントラスト強め');
  const [illustrationStyle, setIllustrationStyle] = useState('子どもが親しみやすい手描き風・ポップ調。感想に出てきたモチーフやキャラを必ず反映');
  const [composition, setComposition] = useState('文字が一目で読め、イラストとバランスよく配置。余白も活かす');
  const [designInfo, setDesignInfo] = useState(`•イラストは感想に出てきた面白いシーンや特徴的なモチーフを反映（例：まんじゅう顔、鏡もちポーズ、魔法の本、回し車など）
•キャラは笑顔や驚きの表情で動きがあるポーズ
•背景や装飾はテーマカラーやモチーフに沿う
•書籍や物語の世界観を崩さず、可愛くポップに仕上げる`);
  const [outputFormat, setOutputFormat] = useState('');
  const [catchCopy, setCatchCopy] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [responseMessage, setResponseMessage] = useState<string | null>(null);
  const [isError, setIsError] = useState(false);

  const handleCreatePop = async () => {
    setIsLoading(true);
    setResponseMessage(null);
    setIsError(false);

    try {
      const prompt = `あなたは「小学生に刺さるPOPコピー＆デザインを作るプロフェッショナル」です。
以下の条件と、提供する「小学生による書籍の感想の文字起こし」をもとに、POPコピーとPOPデザインの提案をしてください。
目的 :${purpose}

POP仕様
・サイズ:幅は${popSize.width}px × 高さは${popSize.height}px
・文字:文字数は${wordCount.min}～${wordCount.max}。 ${extraText}
・色づかい:${colorScheme}
・イラスト／装飾:${illustrationStyle}
・構図:${composition}

デザイン作成ルール
・${designInfo}

利用する固定のキャッチコピー文言(必須)
・${catchCopy}

参考データ（感想の文字起こし）
${props.thoughts}
`;
      const response = await fetch(`${API_ENDPOINT}?prompt=${prompt}&size=${popSize.width}x${popSize.height}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // If your API requires an Authorization header, add it here.
          // 'Authorization': `Bearer YOUR_AUTH_TOKEN`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setResponseMessage(data.message || 'POP creation successful!');
      } else {
        throw new Error(data.error || 'Something went wrong on the server.');
      }

    } catch (error) {
      console.error('API call failed:', error);
        // ① まず、errorがErrorオブジェクトのインスタンスであるかを確認
        if (error instanceof Error) {
            // ② Error型として扱えるため、.messageに安全にアクセスできる
            setResponseMessage(error.message);
        } else {
            // ③ Errorオブジェクトではない場合
            setResponseMessage('予期せぬエラーが発生しました。');
        }
      setIsError(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4, p: 3, maxWidth: 600, boxShadow: 3, borderRadius: 2, bgcolor: 'background.paper' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center">
          POP 作成ページ
        </Typography>
        <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 2 }}>
          【目的】
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="目的"
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
        />

        <Typography variant="h5" component="h2" sx={{ mt: 3, mb: 2 }}>
          【POP仕様】
        </Typography>
        <Stack spacing={2}>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
              fullWidth
              label="幅 (px)"
              type="number"
              value={popSize.width}
              onChange={(e) => setPopSize({ ...popSize, width: e.target.value })}
            />
            <TextField
              fullWidth
              label="高さ (px)"
              type="number"
              value={popSize.height}
              onChange={(e) => setPopSize({ ...popSize, height: e.target.value })}
            />
          </Box>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField
                fullWidth
                label="最小文字数"
                type="number"
                value={wordCount.min}
                onChange={(e) => setWordCount({ ...wordCount, min: e.target.value })}
            />
            <TextField
                fullWidth
                label="最大文字数"
                type="number"
                value={wordCount.max}
                onChange={(e) => setWordCount({ ...wordCount, max: e.target.value })}
            />
          </Box>

          <TextField
            fullWidth
            label="文字の追加情報"
            placeholder="例: フォントは丸ゴシック、太字で"
            value={extraText}
            onChange={(e) => setExtraText(e.target.value)}
          />
          <TextField
            fullWidth
            label="色づかい"
            placeholder="例: 明るい黄色と赤色を基調に"
            value={colorScheme}
            onChange={(e) => setColorScheme(e.target.value)}
          />
          <TextField
            fullWidth
            label="イラストテイスト"
            placeholder="例: 手書き風、アニメ調、リアルな写真風"
            value={illustrationStyle}
            onChange={(e) => setIllustrationStyle(e.target.value)}
          />
          <TextField
            fullWidth
            label="構図"
            placeholder="例: 上部に商品画像を配置し、下部にキャッチコピーを"
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
          />
        </Stack>

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
          【デザイン作成ルール】
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={4}
          label="その他、デザインに関するご要望"
          value={designInfo}
          onChange={(e) => setDesignInfo(e.target.value)}
        />
        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
          【キャッチコピー】
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="上部で選定したキャッチコピー候補"
          value={catchCopy}
          onChange={(e) => setCatchCopy(e.target.value)}
        />

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
          【出力形式】
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="ファイル形式やサイズに関するご指定"
          value={outputFormat}
          onChange={(e) => setOutputFormat(e.target.value)}
          disabled
        />

        <Typography variant="h5" component="h2" sx={{ mt: 4, mb: 2 }}>
          【読みこんだ感想】
        </Typography>
        <TextField
          fullWidth
          multiline
          rows={2}
          label="上部でファイル取り込みしてください。"
          value={props.thoughts}
          disabled
        />

        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={handleCreatePop}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'POP を作成'}
          </Button>
        </Box>
        
        {responseMessage && (
          <Box sx={{ mt: 3 }}>
            <Alert severity={isError ? "error" : "success"}>
              {responseMessage}
            </Alert>
          </Box>
        )}
      </Box>
    </Container>
  );
};

export default PopCreatePage;
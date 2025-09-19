import React, { useEffect, useState } from 'react';
import { Container, Typography, Paper, Box, List, ListItem, ListItemText, Avatar } from '@mui/material';

// 投票結果の型定義
interface VoteCounts {
  [key: string]: number;
}

const API_ENDPOINT = 'https://us-central1-ai-image-creater.cloudfunctions.net/get_vote_counts';
const IMAGE_BASE_URL = 'https://us-central1-ai-image-creater.cloudfunctions.net/get_image?image_name='; // 画像を取得する関数のURL

// 投票結果をランキング形式で表示するコンポーネント
const Ranking: React.FC = () => {
  const [rankingData, setRankingData] = useState<[string, number][]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // データのフェッチ処理
    const fetchRankingData = async () => {
      try {
        const response = await fetch(API_ENDPOINT);
        if (!response.ok) {
          throw new Error(`HTTP Error! status: ${response.status}`);
        }
        const data: VoteCounts = await response.json();

        // JSONオブジェクトを配列に変換し、カウント数で降順にソート
        const sortedData = Object.entries(data).sort(([, countA], [, countB]) => countB - countA);
        
        setRankingData(sortedData);
      } catch (e) {
        setError("データの取得に失敗しました。");
        console.error("フェッチエラー:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRankingData();
  }, []);

  if (isLoading) {
    return (
      <Container maxWidth="sm">
        <Typography variant="h5" component="h1" gutterBottom align="center">
          ランキング
        </Typography>
        <Typography align="center">データを読み込み中...</Typography>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="sm">
        <Typography variant="h5" component="h1" gutterBottom align="center">
          ランキング
        </Typography>
        <Typography color="error" align="center">{error}</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 4 }}>
      <Box sx={{ p: 3, bgcolor: 'background.default' }}>
        <Typography variant="h4" component="h1" gutterBottom align="center" sx={{ fontWeight: 'bold' }}>
          ✨ ランキング ✨
        </Typography>
        <Paper elevation={3}>
          <List>
            {rankingData.map(([name, count], index) => (
              <React.Fragment key={name}>
                <ListItem sx={{ alignItems: 'center' }}>
                  <Avatar 
                    src={`${IMAGE_BASE_URL}${encodeURIComponent(name)}`} 
                    alt={name} 
                    sx={{ width: 56, height: 56, mr: 2 }} 
                  />
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                          {index + 1}. {name}
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {count}票
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < rankingData.length - 1 && <Box component="hr" sx={{ my: 1, borderTop: '1px solid #e0e0e0', borderBottom: 'none' }} />}
              </React.Fragment>
            ))}
          </List>
        </Paper>
      </Box>
    </Container>
  );
};

export default Ranking;
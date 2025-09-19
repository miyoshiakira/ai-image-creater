import './App.css';
import TextChat from './component/TextChat';
import PopCreatePage from './component/PopCreatePage';
import Ranking from './component/Ranking';
import { useState } from 'react';
import { Box, Button, Modal } from '@mui/material';

function App() {
  const [thoughts, setThoughts] = useState<string>('');
  const [open, setOpen] = useState(false); // ★モーダルの開閉を管理するstate

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  const modalStyle = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 800,
    bgcolor: 'background.paper',
    border: '2px solid #000',
    boxShadow: 24,
    p: 4,
  };

  return (
    <>
      <Box 
        sx={{
          width: '100%',
          display: 'flex',
          justifyContent: 'flex-end',
          p: 2,
          position: 'fixed', // ★ヘッダーを固定
          top: 0,
          right: 0,
          zIndex: 1000,
        }}
      >
        <Button onClick={handleOpen} variant="contained" color="primary">
          ランキングを表示
        </Button>
      </Box>

      <TextChat onChange={(res: string) => setThoughts(res)} />
      <PopCreatePage thoughts={thoughts} />

      {/* ★ランキングを表示するモーダル */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="ranking-modal-title"
        aria-describedby="ranking-modal-description"
      >
        <Box sx={modalStyle}>
          <Ranking />
        </Box>
      </Modal>
    </>
  );
}

export default App;
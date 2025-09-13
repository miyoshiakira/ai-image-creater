import './App.css'
import TextChat from './component/TextChat'
import PopCreatePage from './component/PopCreatePage'
import { useState } from 'react';
function App() {
  const [thoughts, setThoughts] = useState<string>('');
  return (
    <>
      <TextChat onChange={(res: string) => setThoughts(res)} />
      <PopCreatePage thoughts={thoughts} />
    </>
  )
}

export default App

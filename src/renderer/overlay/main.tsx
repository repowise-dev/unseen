import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initController } from './controller';

const root = createRoot(document.getElementById('root')!);
root.render(<App />);

void initController();

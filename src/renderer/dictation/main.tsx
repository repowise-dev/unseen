import { createRoot } from 'react-dom/client';
import { Hud } from './Hud';
import { initDictationController } from './controller';

const root = createRoot(document.getElementById('root')!);
root.render(<Hud />);

initDictationController();

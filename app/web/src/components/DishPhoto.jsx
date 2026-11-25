import { useState } from 'react';
import { IconToolsKitchen2 } from '@tabler/icons-react';

// The dish photo from web/public/food. A dish without one gets an icon.
export default function DishPhoto({ photo, size = '' }) {
  const [broken, setBroken] = useState(false);
  if (!photo || broken) {
    return <span className={`photo none ${size}`} aria-hidden="true"><IconToolsKitchen2 size={24} /></span>;
  }
  return <img className={`photo ${size}`} src={`/food/${photo}.jpg`} alt="" loading="lazy" onError={() => setBroken(true)} />;
}

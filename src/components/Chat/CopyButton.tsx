import { IconCheck, IconCopy } from '@tabler/icons-react';
import { FC } from 'react';

type Props = {
    messagedCopied: boolean;
    copyOnClick: () => void;
};

export const CopyButton: FC<Props> = ({ messagedCopied, copyOnClick }) => (
    <button className={`absolute ${window.innerWidth < 640 ? 'bottom-1 right-3' : 'right-[-20px] top-[26px] m-0'}`}>
        {messagedCopied ? <IconCheck size={20} className="text-green-500 dark:text-green-400" /> : <IconCopy size={20} className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300" onClick={copyOnClick} />}
    </button>
);

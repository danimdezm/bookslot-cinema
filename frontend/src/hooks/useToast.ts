import { toast } from 'sonner';
import type { Notify } from '@/types';

const notify: Notify = ({ title, body, tone = 'info' }) => {
  const show = tone === 'success' ? toast.success : tone === 'error' ? toast.error : toast.info;
  show(title, { description: body });
};

export const useToast = () => notify;

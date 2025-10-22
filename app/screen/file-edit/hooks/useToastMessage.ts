/**
 * @file useToastMessage.ts
 * @summary トーストメッセージの表示ロジックをカプセル化するカスタムフック
 * @description コンポーネントからトーストメッセージの表示・非表示ロジックを分離し、再利用性を高めます。
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { ToastMessageProps } from '../components/ToastMessage';

interface UseToastMessageResult {
  showToast: (message: string, duration?: number) => void;
  hideToast: () => void;
  toastProps: ToastMessageProps;
}

export const useToastMessage = (): UseToastMessageResult => {
  const [message, setMessage] = useState('');
  const [isVisible, setIsVisible] = useState(false);
  const [duration, setDuration] = useState<number | undefined>(undefined);
  const hideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, dur?: number) => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
    }
    setMessage(msg);
    setIsVisible(true);
    setDuration(dur);
  }, []);

  const hideToast = useCallback(() => {
    setIsVisible(false);
    setMessage('');
    setDuration(undefined);
  }, []);

  useEffect(() => {
    if (isVisible && duration) {
      hideTimeoutRef.current = setTimeout(() => {
        hideToast();
      }, duration);
    }
    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, [isVisible, duration, hideToast]);

  const toastProps: ToastMessageProps = {
    message,
    isVisible,
    duration,
    onHide: hideToast,
  };

  return { showToast, hideToast, toastProps };
};

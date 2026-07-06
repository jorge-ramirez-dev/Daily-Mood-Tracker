import { useCallback, useRef, useState } from "react";

export type TConfirmModalState = {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
};

const INITIAL_STATE: TConfirmModalState = { isOpen: false, title: "", message: "" };

export const useConfirmModal = () => {
  const [modal, setModal] = useState<TConfirmModalState>(INITIAL_STATE);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const showConfirm = useCallback(
    (title: string, message: string, confirmLabel?: string, cancelLabel?: string): Promise<boolean> => {
      return new Promise((resolve) => {
        resolverRef.current = resolve;
        setModal({ isOpen: true, title, message, confirmLabel, cancelLabel });
      });
    },
    []
  );

  const handleConfirm = useCallback(() => {
    resolverRef.current?.(true);
    resolverRef.current = null;
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleCancel = useCallback(() => {
    resolverRef.current?.(false);
    resolverRef.current = null;
    setModal((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return { modal, showConfirm, handleConfirm, handleCancel };
};

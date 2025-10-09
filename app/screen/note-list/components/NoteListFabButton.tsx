import React from 'react';
import { FabButton } from '../../../components/FabButton';
import { logger } from '../../../utils/logger';

interface NoteListFabButtonProps {
  isSelectionMode: boolean;
  onPress: () => void;
}

export const NoteListFabButton: React.FC<NoteListFabButtonProps> = ({
  isSelectionMode,
  onPress,
}) => {
  logger.debug('note', 'FAB render check:', { isSelectionMode, shouldShow: !isSelectionMode });
  return !isSelectionMode ? <FabButton onPress={onPress} /> : null;
};

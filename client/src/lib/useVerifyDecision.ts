import { useState } from 'react';

/**
 * The approve/reject decision flow a verifier goes through, without any of the markup.
 *
 * Tasks and Tickets both implement this: approving fires immediately, rejecting expands a textarea
 * first, "Send back" stays disabled until the note has non-whitespace content (the server enforces
 * the same rule), and cancelling clears both the panel and the draft. That much was duplicated
 * exactly. Everything else about the two — Tasks owns its own mutation and has a compact icon-only
 * mode for board cards, Tickets takes callbacks and draws the sheet footer — is genuinely
 * different, so only the state machine is shared here. Neither component's rendering or props
 * changed.
 */
export interface VerifyDecision {
  /** True once the verifier has chosen Reject and is being asked for a reason. */
  isRejecting: boolean;
  note: string;
  setNote: (note: string) => void;
  startReject: () => void;
  /** Closes the reject panel and discards the draft — a cancelled rejection shouldn't leave
   *  half a reason behind for the next time the panel opens. */
  cancelReject: () => void;
  /** The note as it will actually be submitted. */
  trimmedNote: string;
  /** False while the note is empty or whitespace-only, matching the server's own requirement. */
  canSubmitReject: boolean;
}

export const useVerifyDecision = (): VerifyDecision => {
  const [isRejecting, setIsRejecting] = useState(false);
  const [note, setNote] = useState('');

  const trimmedNote = note.trim();

  return {
    isRejecting,
    note,
    setNote,
    startReject: () => setIsRejecting(true),
    cancelReject: () => {
      setIsRejecting(false);
      setNote('');
    },
    trimmedNote,
    canSubmitReject: trimmedNote.length > 0,
  };
};

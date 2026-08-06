import { Sparkle } from "@phosphor-icons/react";

type TProps = {
  onOpen: () => void;
  hidden: boolean;
};

// Fixed floating launcher; hidden while the overlay panel is open so the two
// never stack. Keeps the home screen otherwise untouched.
export const AskAILauncher = ({ onOpen, hidden }: TProps) => {
  if (hidden) return null;

  return (
    <button type="button" className="ask-ai-launcher" onClick={onOpen} aria-label="Ask AI about your moods">
      <Sparkle weight="fill" aria-hidden="true" />
    </button>
  );
};

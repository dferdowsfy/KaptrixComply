"use client";

import {
  createContext,
  useContext,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";

type ChatPanelCtx = {
  open: boolean;
  setOpen: Dispatch<SetStateAction<boolean>>;
  fullscreen: boolean;
  setFullscreen: Dispatch<SetStateAction<boolean>>;
};

const Ctx = createContext<ChatPanelCtx>({
  open: false,
  setOpen: () => {},
  fullscreen: false,
  setFullscreen: () => {},
});

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  return (
    <Ctx.Provider value={{ open, setOpen, fullscreen, setFullscreen }}>
      {children}
    </Ctx.Provider>
  );
}

export function useChatPanel() {
  return useContext(Ctx);
}

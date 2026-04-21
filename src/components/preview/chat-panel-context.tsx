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
};

const Ctx = createContext<ChatPanelCtx>({
  open: false,
  setOpen: () => {},
});

export function ChatPanelProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return <Ctx.Provider value={{ open, setOpen }}>{children}</Ctx.Provider>;
}

export function useChatPanel() {
  return useContext(Ctx);
}

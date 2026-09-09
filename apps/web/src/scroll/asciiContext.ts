import { createContext } from "react";
export const AsciiContext = createContext<{ phase: "enter" | "exit" | "hidden"; epoch: string }>({ phase: "enter", epoch: "initial" });

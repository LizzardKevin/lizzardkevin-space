import { createContext } from "react";
import type { AudioDirector } from "./AudioDirector";

export const AudioDirectorContext = createContext<AudioDirector | null>(null);


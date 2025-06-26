import type { CssVariable } from "./domain/cssVariable.ts";

export type CssDirectivesWithPointers = {
    pointers: CssVariable[];
    directives: string[];
};

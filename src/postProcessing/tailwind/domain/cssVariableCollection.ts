import type { CssVariable } from "./cssVariable.ts";

export class CssVariableCollection implements Iterable<CssVariable> {
    private variables: CssVariable[] = [];
    name: string;

    constructor(name: string, variables: CssVariable[] = []) {
        this.variables = variables;
        this.name = name;
    }

    add(variable: CssVariable): void {
        this.variables.push(variable);
    }

    remove(variable: CssVariable): void {
        this.variables = this.variables.filter((v) => v.name !== variable.name);
    }

    clear(): void {
        this.variables = [];
    }

    [Symbol.iterator](): Iterator<CssVariable> {
        return this.variables[Symbol.iterator]();
    }
}

import path from "path";
import type { BuiltInParserName } from "prettier";
import { isRGB, isRGBA } from "../utils/figmaUtils.ts";
import { toKebabCase } from "../utils/namingUtils.ts";
import { BaseGenerator, type ResolvedVariableValue } from "./baseGenerator.ts";

export type CssGeneratorOptions = object;
export class CssGenerator extends BaseGenerator<CssGeneratorOptions> {
    protected _buffer: string[] = [];

    _getCssValue(value: ResolvedVariableValue): string | undefined {
        let cssValue: string | undefined;
        if (typeof value === "undefined") cssValue = "";
        if (typeof value === "string") cssValue = `'${value}'`;
        if (typeof value === "number") cssValue = `${value}`;
        if (typeof value === "boolean") cssValue = value ? "true" : "false";
        if (isRGBA(value) || isRGB(value)) {
            cssValue = `rgb(${Math.round(value.r * 255)} ${Math.round(value.g * 255)} ${Math.round(value.b * 255)}${"a" in value ? ` / ${value.a}` : ""})`;
        }

        return cssValue;
    }

    createVariable(
        variable: { name: string; value: ResolvedVariableValue },
        meta: { collectionId: string; modeId: string }
    ): string {
        const { name, value } = variable;
        let cssValue = this._getCssValue(value);

        if (!cssValue) {
            console.warn(`Unsupported value type for variable "${name}": ${typeof value}`);
        }

        const collectionName = toKebabCase(
            this.getCollection(meta.collectionId)?.name ?? "unknown"
        );
        const modeName = this.collectionHasMultipleModes(meta.collectionId)
            ? toKebabCase(this.getMode(meta.collectionId, meta.modeId)?.name ?? "default")
            : "";
        const variableName = toKebabCase(name);

        const cssVariableName = `--${[collectionName, modeName, variableName].filter((x) => x).join("-")}`;
        const cssVariable = `${cssVariableName}: ${cssValue};`;

        return cssVariable;
    }
    getPrettierParser(): BuiltInParserName {
        return "css";
    }
    getOutputDir(): string {
        return path.resolve(process.cwd());
    }
    async onModeCompleted(): Promise<void> {
        //Do nothing
    }
    async onCollectionCompleted(): Promise<void> {
        //Do nothing
    }
    async onCompleted(): Promise<void> {
        let fileContent = this._buffer.filter((x) => x.trim()).join("\n");
        this._buffer = [];

        // Wrap the content in :root selector for CSS variables
        fileContent = `:root {${fileContent}}`;

        const outputFile = path.resolve(this.getOutputDir(), process.env.CSS_OUTPUT_FILE);

        await this.writeToFile(outputFile, fileContent);
    }
    addToBuffer(str: string): void {
        this._buffer.push(str);
    }
}

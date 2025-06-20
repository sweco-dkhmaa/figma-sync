import path from "path";
import prettier from "prettier";
import { isRGBA } from "../utils/figmaUtils.ts";
import { BaseGenerator, type ResolvedVariableValue } from "./baseGenerator.ts";
import { capitalize, toCamelCase } from "../utils/namingUtils.ts";
import type { RGBA } from "@figma/rest-api-spec";

export interface ScssVariableOptions {
    appendDefault: boolean;
}

export class ScssGenerator extends BaseGenerator<ScssVariableOptions> {
    async onModeCompleted(modeId: string, collectionId: string): Promise<void> {
        const collectionMultipleModes =
            this._meta.variableCollections[collectionId].modes.length > 1;
        let fileName = toCamelCase(this._meta.variableCollections[collectionId].name);
        if (collectionMultipleModes) {
            let modeName =
                this._meta.variableCollections[collectionId].modes.find((m) => m.modeId === modeId)
                    ?.name ?? "";
            modeName = capitalize(toCamelCase(modeName));
            fileName += modeName;
        }

        fileName += ".scss";

        const fileContent = this._buffer.filter((x) => x.trim()).join("\n");
        this._buffer = [];

        if (!fileContent) {
            console.warn(`No variables to write for ${fileName}. Skipping.`);
            return;
        }

        await this.writeToFile(fileName, fileContent);
    }
    async onCollectionCompleted(): Promise<void> {
        // Do nothing
    }
    async onCompleted(): Promise<void> {
        //Do nothing
    }
    protected _buffer: string[] = [];
    addToBuffer(str: string): void {
        this._buffer.push(str);
    }
    protected _colorToRGBA(color: RGBA): string {
        return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)}, ${color.a ?? 1})`;
    }

    protected _toValueString(value: ResolvedVariableValue): string | undefined {
        if (typeof value === "undefined") return undefined;
        if (typeof value === "boolean") return value ? "true" : "false";
        if (typeof value === "number") return value.toString();
        if (typeof value === "string") return `"${value}"`;
        if (isRGBA(value)) return this._colorToRGBA(value);
    }

    createVariable(
        variable: {
            name: string;
            value: ResolvedVariableValue;
        },
    ): string {
        const { value, name: name } = variable;

        // Check if the name is a valid SCSS variable name
        // If the name is a number, return an empty string
        if (!isNaN(+name)) {
            return "";
        }

        let scssValue = this._toValueString(value);
        if (!scssValue) {
            throw new Error("SCSS value is undefined for variable: " + name);
        }

        let formattedName = toCamelCase(name);
        let variableString = `$${formattedName}: ${scssValue}`;
        if (this._options.appendDefault) {
            variableString += ` !default`;
        }
        variableString += ";";
        return variableString;
    }

    getPrettierParser(): prettier.BuiltInParserName {
        return "scss";
    }

    getOutputDir(): string {
        return path.resolve(process.cwd(), process.env.SCSS_OUTPUT_DIR);
    }
}

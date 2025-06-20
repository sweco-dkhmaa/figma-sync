import prettier from "prettier";
import { getPrettierConfig } from "../utils/prettierUtils.ts";
import type {
    Expression,
    GetLocalVariablesResponse,
    LocalVariableCollection,
    VariableAlias,
    VariableData
} from "@figma/rest-api-spec";
import path from "path";
import fs from "fs/promises";

export type ResolvedVariableValue = Exclude<VariableData["value"], VariableAlias | Expression>;

export abstract class BaseGenerator<TVariableOptions> {
    protected _options: TVariableOptions;
    protected readonly _meta: GetLocalVariablesResponse["meta"];

    constructor(options: TVariableOptions, meta: GetLocalVariablesResponse["meta"]) {
        this._meta = meta;
        this._options = options;
    }

    abstract createVariable(
        variable: {
            name: string;
            value: ResolvedVariableValue;
        },
        meta: { collectionId: string; modeId: string }
    ): string;

    abstract getPrettierParser(): prettier.BuiltInParserName;

    abstract getOutputDir(): string;

    async writeToFile(fileName: string, fileContent: string): Promise<void> {
        const prettierConfig = await getPrettierConfig();
        fileContent = await prettier.format(fileContent, {
            ...prettierConfig,
            parser: this.getPrettierParser()
        });

        const outputPath = path.resolve(this.getOutputDir(), fileName);

        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, fileContent, "utf-8");
    }

    abstract onModeCompleted(modeId: string, collectionId: string): Promise<void>;
    abstract onCollectionCompleted(collectionId: string): Promise<void>;
    abstract onCompleted(): Promise<void>;
    abstract addToBuffer(str: string): void;

    getMode(collectionId: string, modeId: string): LocalVariableCollection["modes"][number] | undefined {
        const mode = this._meta.variableCollections[collectionId].modes.find(
            (m) => m.modeId === modeId
        );
        if (mode) {
            return mode;
        }
        return undefined;
    }

    getCollection(collectionId: string): LocalVariableCollection | undefined {
        const collection = this._meta.variableCollections[collectionId];
        if (collection) {
            return collection;
        }
        return undefined;
    }

    collectionHasMultipleModes(collectionId: string): boolean {
        const modeCount: number | undefined = this._meta.variableCollections[collectionId]?.modes.length;
        return modeCount !== undefined && modeCount > 1;
    }
}

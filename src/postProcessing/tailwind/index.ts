import fs from "fs/promises";
import path from "path";
import prettier from "prettier";
import { getPrettierConfig } from "../../utils/prettierUtils.ts";
import { CssVariableCollection } from "./domain/cssVariableCollection.ts";
import { TailwindNamespace, TailwindTheme } from "./domain/tailwindTheme.ts";
import { simpleMapper } from "./simpleMapper.ts";
import { mapColorThemes } from "./themeMapper.ts";
import {
    getCssVariablesFromFile,
    ignoreNamespaces,
    numericToUnitModifier,
    PxToRem,
    wrapInRootDirective
} from "./utils.ts";

const tailwindPath = path.resolve(process.cwd(), process.env.TAILWIND_OUTPUT_DIR);

const ignoredNamespaces: string[] = ["--unit", "--spacing"];

(async () => {
    await fs.mkdir(path.dirname(tailwindPath), { recursive: true });

    const cssOutputFile = path.resolve(process.cwd(), process.env.CSS_OUTPUT_FILE);
    const cssVariables = await getCssVariablesFromFile(cssOutputFile);

    ignoreNamespaces(ignoredNamespaces, cssVariables);

    const tailwindTheme = new TailwindTheme(Object.values(TailwindNamespace));
    const cssContent: string[] = [];

    const themeDefinitions = await mapColorThemes(cssVariables);
    themeDefinitions.tailwindThemePointers.forEach((val) => {
        val.name = val.name.replace(/-+sweco-+sweco/, "-sweco");
    });

    tailwindTheme.addVariables(
        new CssVariableCollection("Color theme pointers", themeDefinitions.tailwindThemePointers)
    );
    cssContent.push(...themeDefinitions.themes);

    const primitiveColors = simpleMapper(cssVariables, {
        prefix: "--primitive-color-",
        tailwindNamespace: TailwindNamespace.color,
        collectionName: "Primitive Colors"
    });
    tailwindTheme.addVariables(primitiveColors);

    const breakpoints = simpleMapper(cssVariables, {
        prefix: "--layout-breakpoint",
        tailwindNamespace: TailwindNamespace.breakpoint,
        collectionName: "Breakpoints",
        variableModifier: [numericToUnitModifier("px")]
    });
    tailwindTheme.addVariables(breakpoints);

    const fontSizing = simpleMapper(cssVariables, {
        prefix: {
            "--primitive-type-size": /--primitive-type-size/,
            "--semantic-type-body": /--semantic-type-body-[\w-]+-size/,
            "--semantic-type-heading": /--semantic-type-heading-[\w-]+-size/
        },
        tailwindNamespace: TailwindNamespace.text,
        collectionName: "Font Sizes",
        variableModifier: [numericToUnitModifier("rem", PxToRem)]
    });
    tailwindTheme.addVariables(fontSizing);

    const fontWeights = simpleMapper(cssVariables, {
        prefix: {
            "--primitive-type-weight": /--primitive-type-weight/,
            // "--semantic-type-body": /--semantic-type-body-[\w-]+-weight/,
            // "--semantic-type-heading": /--semantic-type-heading-[\w-]+-weight/
        },
        tailwindNamespace: TailwindNamespace.fontWeight,
        collectionName: "Font Weights"
    });
    tailwindTheme.addVariables(fontWeights);

    const lineHeights = simpleMapper(cssVariables, {
        prefix: {
            "--primitive-type-line-height": /--primitive-type-line-height/,
            "--semantic-type-body": /--semantic-type-body-[\w-]+-line-height/,
            "--semantic-type-heading": /--semantic-type-heading-[\w-]+-line-height/
        },
        tailwindNamespace: TailwindNamespace.leading,
        collectionName: "Line Heights",
        variableModifier: [numericToUnitModifier("", PxToRem)]
    });
    tailwindTheme.addVariables(lineHeights);

    const fontFamilies = simpleMapper(cssVariables, {
        prefix: "--primitive-type-family",
        tailwindNamespace: TailwindNamespace.font,
        collectionName: "Font Families"
    });
    tailwindTheme.addVariables(fontFamilies);

    const borderRadii = simpleMapper(cssVariables, {
        prefix: "--border-radius",
        tailwindNamespace: TailwindNamespace.radius,
        collectionName: "Border Radii",
        variableModifier: [numericToUnitModifier("px")]
    });
    tailwindTheme.addVariables(borderRadii);

    const borderWidths = simpleMapper(cssVariables, {
        prefix: "--border-width",
        tailwindNamespace: TailwindNamespace.borderWidth,
        collectionName: "Border Widths",
        variableModifier: [numericToUnitModifier("px")]
    });
    tailwindTheme.addVariables(borderWidths);

    const prettierconfig = await getPrettierConfig();

    if (cssVariables.length > 0) {
        console.log(`${cssVariables.length} CSS variables was not bound`);
        const missingVariables = await prettier.format(
            wrapInRootDirective(cssVariables.join(" ")),
            {
                ...prettierconfig,
                parser: "css"
            }
        );
        await fs.writeFile(
            path.resolve(tailwindPath, "./missing-variables.css"),
            missingVariables,
            "utf-8"
        );
    }

    const content: Record<string, string> = {
        "theme.css": tailwindTheme.toString(),
        "variables.css": wrapInRootDirective(cssContent.join(" "))
    };

    for (const [name, fileContent] of Object.entries(content)) {
        try {
            let localContent = await prettier.format(fileContent, {
                ...prettierconfig,
                parser: "css"
            });
            await fs.writeFile(path.resolve(tailwindPath, name), localContent, "utf-8");
        } catch (error) {
            console.error(`Error formatting ${name}`, error);
        }
    }
})();

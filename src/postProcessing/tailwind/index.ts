import fs from "fs/promises";
import path from "path";
import prettier from "prettier";
import { getPrettierConfig } from "../../utils/prettierUtils.ts";
import { CssVariableCollection } from "./domain/cssVariableCollection.ts";
import { TailwindNamespace, TailwindTheme } from "./domain/tailwindTheme.ts";
import { simpleMapper } from "./simpleMapper.ts";
import {
    extractVariablesByPrefix,
    getCssVariablesFromFile,
    ignoreNamespaces,
    numericToUnitModifier,
    PxToRem,
    wrapInDataDirective,
    wrapInRootDirective
} from "./utils.ts";

const tailwindPath = path.resolve(process.cwd(), process.env.TAILWIND_OUTPUT_DIR);

const ignoredNamespaces: (string | RegExp)[] = ["--unit", /^--spacing-[\w]+-[\d]+/];

(async () => {
    await fs.mkdir(path.dirname(tailwindPath), { recursive: true });

    const cssOutputFile = path.resolve(process.cwd(), process.env.CSS_OUTPUT_FILE);
    const cssVariables = await getCssVariablesFromFile(cssOutputFile);

    ignoreNamespaces(ignoredNamespaces, cssVariables);

    const tailwindTheme = new TailwindTheme(Object.values(TailwindNamespace));
    const cssContent: string[] = [];

    // const themeDefinitions = await mapColorThemes(cssVariables);
    // themeDefinitions.pointers.forEach((val) => {
    //     val.name = val.name.replace(/-+sweco-+sweco/, "-sweco");
    // });

    let themePointers: CssVariableCollection | undefined = undefined;
    for (const theme of ["light", "dark"]) {
        const backgroundColorVariables = extractVariablesByPrefix(
            `--semantic-color-${theme}-background`,
            cssVariables
        ).map((variable) => {
            const variableClone = variable.clone();
            variableClone.replacePrefix(
                `--semantic-color-${theme}-background`,
                "--semantic-color-background"
            );
            return variableClone;
        });

        const textColorVariables = extractVariablesByPrefix(
            [`--semantic-color-${theme}-text`, `--semantic-color-${theme}-icon`],
            cssVariables
        ).map((variable) => {
            const variableClone = variable.clone();
            variableClone.replacePrefix(
                new RegExp(`--semantic-color-${theme}-(text)?`),
                `--semantic-color-text`
            );
            return variableClone;
        });

        const borderColorVariables = extractVariablesByPrefix(
            `--semantic-color-${theme}-border`,
            cssVariables
        ).map((variable) => {
            const variableClone = variable.clone();
            variableClone.replacePrefix(
                `--semantic-color-${theme}-border`,
                "--semantic-color-border"
            );
            return variableClone;
        });

        const genericColorVariables = extractVariablesByPrefix(
            new RegExp(`--semantic-color-${theme}-+(?!background|text|icon|border)[^:]*`),
            cssVariables
        ).map((variable) => {
            const variableClone = variable.clone();
            variableClone.replacePrefix(`--semantic-color-${theme}`, "--semantic-color");
            return variableClone;
        });

        let themeDirective = wrapInDataDirective(
            [
                ...backgroundColorVariables,
                ...textColorVariables,
                ...borderColorVariables,
                ...genericColorVariables
            ],
            { dataAttr: "theme", value: theme }
        );
        themeDirective = wrapInRootDirective(themeDirective);
        cssContent.push(themeDirective);

        if (themePointers !== undefined) continue;

        const backgroundThemePointers = [...backgroundColorVariables].map((variable) => {
            const pointer = variable.clone();
            pointer.replacePrefix("--semantic-color-background", TailwindNamespace.backgroundColor);
            pointer.setVarValue(variable.name);
            return pointer;
        });

        const textThemePointers = [...textColorVariables].map((variable) => {
            const pointer = variable.clone();
            pointer.replacePrefix(/--semantic-color-(text)?/, TailwindNamespace.textColor);
            pointer.setVarValue(variable.name);
            return pointer;
        });

        const borderThemePointers = [...borderColorVariables].flatMap((variable) => {
            const pointer = variable.clone();
            const ringPointer = variable.clone();
            pointer.replacePrefix("--semantic-color-border", TailwindNamespace.borderColor);
            ringPointer.replacePrefix("--semantic-color-border", TailwindNamespace.ringColor);
            pointer.setVarValue(variable.name);
            ringPointer.setVarValue(variable.name);
            return [pointer, ringPointer];
        });

        const genericThemePointers = [...genericColorVariables].map((variable) => {
            const pointer = variable.clone();
            pointer.replacePrefix("--semantic-color", TailwindNamespace.color);
            pointer.name = pointer.name
                .replace("--sweco-sweco", "-sweco")
                .replace("--special", "-special");
            pointer.setVarValue(variable.name);
            return pointer;
        });

        themePointers = new CssVariableCollection("Theme variable pointers", [
            ...backgroundThemePointers,
            ...textThemePointers,
            ...borderThemePointers,
            ...genericThemePointers
        ]);
    }

    tailwindTheme.addVariables(themePointers ?? []);

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
        prefix: [
            ["--primitive-type-size", /--primitive-type-size/],
            ["--semantic-type", /--semantic-type-body-[\w-]+-size/],
            ["--semantic-type", /--semantic-type-heading-[\w-]+-size/]
        ],
        tailwindNamespace: TailwindNamespace.text,
        collectionName: "Font Sizes",
        variableModifier: [numericToUnitModifier("rem", PxToRem)]
    });
    tailwindTheme.addVariables(fontSizing);

    const fontWeights = simpleMapper(cssVariables, {
        prefix: [
            ["--primitive-type-weight", /--primitive-type-weight/],
            ["--semantic-type", /--semantic-type-body-[\w-]+-weight/],
            ["--semantic-type", /--semantic-type-heading-[\w-]+-weight/]
        ],
        tailwindNamespace: TailwindNamespace.fontWeight,
        collectionName: "Font Weights"
    });
    tailwindTheme.addVariables(fontWeights);

    const lineHeights = simpleMapper(cssVariables, {
        prefix: [
            ["--primitive-type-line-height", /--primitive-type-line-height/],
            ["--semantic-type", /--semantic-type-body-[\w-]+-line-height/],
            ["--semantic-type", /--semantic-type-heading-[\w-]+-line-height/]
        ],
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

    const ringWidths = [...borderWidths].map((variable) => {
        const variableClone = variable.clone();
        variableClone.replacePrefix(TailwindNamespace.borderWidth, TailwindNamespace.ringWidth);
        return variableClone;
    });
    tailwindTheme.addVariables(new CssVariableCollection("Ring Widths", ringWidths));

    const spacing = simpleMapper(cssVariables, {
        prefix: "--spacing-desktop-space",
        tailwindNamespace: TailwindNamespace.spacing,
        collectionName: "Spacing",
        variableModifier: [numericToUnitModifier("px")]
    });
    tailwindTheme.addVariables(spacing);

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
        "variables.css": cssContent.join(" ")
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

import { extname } from "path";

import {
  PluginFunction,
  PluginValidateFn,
  Types,
} from "@graphql-codegen/plugin-helpers";
import { LoadedFragment } from "@graphql-codegen/visitor-plugin-common";
import { RawClientSideBasePluginConfig } from "@graphql-codegen/visitor-plugin-common";
import {
  FragmentDefinitionNode,
  GraphQLSchema,
  Kind,
  concatAST,
  visit,
} from "graphql";

import { ApolloCacheVisitor } from "./cacheVisitor";

export const plugin: PluginFunction<
  RawClientSideBasePluginConfig,
  Types.ComplexPluginOutput
> = (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: RawClientSideBasePluginConfig
) => {
  const allAst = concatAST(documents.map((v) => v.document));

  const allFragments: LoadedFragment[] = [
    ...(allAst.definitions.filter(
      (d) => d.kind === Kind.FRAGMENT_DEFINITION
    ) as FragmentDefinitionNode[]).map((fragmentDef) => ({
      node: fragmentDef,
      name: fragmentDef.name.value,
      onType: fragmentDef.typeCondition.name.value,
      isExternal: false,
    })),
    ...(config.externalFragments || []),
  ];

  const visitor = new ApolloCacheVisitor(
    schema,
    allFragments,
    config,
    documents
  );
  let visitorResult = visit(allAst, { leave: visitor });
  const fr = visitor.buildOperationReadFragmentCache();

  return {
    prepend: visitor.getImports(),
    content: [
      fr,
      ...visitorResult.definitions.filter((t) => typeof t === "string"),
    ].join("\n"),
  };
};

export const validate: PluginValidateFn<any> = async (
  schema: GraphQLSchema,
  documents: Types.DocumentFile[],
  config: RawClientSideBasePluginConfig,
  outputFile: string
) => {
  if (extname(outputFile) !== ".tsx") {
    throw new Error(`Plugin "react-apollo" requires extension to be ".tsx"!`);
  }
};

export { ApolloCacheVisitor };

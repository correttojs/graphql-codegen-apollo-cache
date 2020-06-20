import { Types } from "@graphql-codegen/plugin-helpers";
import {
  ClientSideBaseVisitor,
  ClientSideBasePluginConfig,
  getConfigValue,
  LoadedFragment,
  OMIT_TYPE,
  DocumentMode,
} from "@graphql-codegen/visitor-plugin-common";

import autoBind from "auto-bind";
import { GraphQLSchema, OperationDefinitionNode } from "graphql";
import { ApolloCacheRawPluginConfig, Config } from "./config";

export type ApolloCachePluginConfig = ClientSideBasePluginConfig & Config;

export class ApolloCacheVisitor extends ClientSideBaseVisitor<
  ApolloCacheRawPluginConfig,
  ApolloCachePluginConfig
> {
  private _externalImportPrefix: string;
  private imports = new Set<string>();

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: ApolloCacheRawPluginConfig,
    documents: Types.DocumentFile[]
  ) {
    super(schema, fragments, rawConfig, {
      withHooks: getConfigValue(rawConfig.withHooks, false),
      apolloReactCommonImportFrom: getConfigValue(
        rawConfig.apolloReactCommonImportFrom,
        rawConfig.apolloVersion === 3
          ? "@apollo/client"
          : "@apollo/react-common"
      ),

      apolloReactHooksImportFrom: getConfigValue(
        rawConfig.apolloReactHooksImportFrom,
        rawConfig.apolloVersion === 3 ? "@apollo/client" : "@apollo/react-hooks"
      ),
      apolloImportFrom: getConfigValue(
        rawConfig.apolloImportFrom,
        rawConfig.apolloVersion === 3 ? "@apollo/client" : "apollo-client"
      ),

      apolloCacheImportFrom: getConfigValue(
        rawConfig.apolloCacheImportFrom,
        "apollo-cache-inmemory"
      ),

      apolloVersion: getConfigValue(rawConfig.apolloVersion, 2),
      excludePatterns: getConfigValue(rawConfig.excludePatterns, null),
      excludePatternsOptions: getConfigValue(
        rawConfig.excludePatternsOptions,
        ""
      ),
      dataIdFromObjectImport: getConfigValue(
        rawConfig.dataIdFromObjectImport,
        null
      ),
      dataIdFromObjectName: getConfigValue(
        rawConfig.dataIdFromObjectName,
        "defaultDataIdFromObject"
      ),
      generateFragmentsRead: getConfigValue(
        rawConfig.generateFragmentsRead,
        true
      ),
      generateFragmentsWrite: getConfigValue(
        rawConfig.generateFragmentsWrite,
        true
      ),
      generateQueriesRead: getConfigValue(rawConfig.generateQueriesRead, true),
      generateQueriesWrite: getConfigValue(
        rawConfig.generateQueriesWrite,
        true
      ),
      pre: getConfigValue(rawConfig.pre, ""),
      post: getConfigValue(rawConfig.post, ""),
      customImports: getConfigValue(rawConfig.customImports, null),
    });

    this._externalImportPrefix = this.config.importOperationTypesFrom
      ? `${this.config.importOperationTypesFrom}.`
      : "";
    this._documents = documents;

    autoBind(this);
  }

  public getImports(): string[] {
    this.imports.add(
      `import * as Apollo from '${this.config.apolloImportFrom}';`
    );
    this.imports.add(
      `import { defaultDataIdFromObject, NormalizedCacheObject } from '${this.config.apolloCacheImportFrom}';`
    );
    if (this.config.dataIdFromObjectImport) {
      this.imports.add(
        `import { ${this.config.dataIdFromObjectName} } from '${this.config.dataIdFromObjectImport}';`
      );
    }
    if (this.config.customImports) {
      this.imports.add(this.config.customImports);
    }

    const baseImports = super.getImports();
    const hasOperations = this._collectedOperations.length > 0;

    if (!hasOperations) {
      return baseImports;
    }

    return [...baseImports, ...Array.from(this.imports)];
  }

  private _buildOperationReadCache(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string {
    if (node.operation === "mutation") {
      return "";
    }
    const operationName: string = this.convertName(node.name.value, {
      useTypesPrefix: false,
    });

    if (
      this.config.excludePatterns &&
      new RegExp(
        this.config.excludePatterns,
        this.config.excludePatternsOptions
      ).test(operationName)
    ) {
      return "";
    }

    const readString = this.config.generateQueriesRead
      ? `export function readQuery${operationName}(cache: Apollo.ApolloClient<NormalizedCacheObject>, variables?: ${operationVariablesTypes}):${operationResultType} {
            ${this.config.pre}
            return cache.readQuery({
                query: Operations.${documentVariableName},
                variables,
            });
            ${this.config.post}
            };`
      : "";

    const writeString = this.config.generateQueriesWrite
      ? `export function writeQuery${operationName}(cache: Apollo.ApolloClient<NormalizedCacheObject>, data: ${operationResultType}, variables?: ${operationVariablesTypes}) {
            ${this.config.pre}
            cache.writeQuery({
                query: Operations.${documentVariableName},
                variables,
                data,
            });

            ${this.config.post}
        }`
      : "";

    return [readString, writeString].filter((a) => a).join("\n");
  }

  protected buildOperation(
    node: OperationDefinitionNode,
    documentVariableName: string,
    operationType: string,
    operationResultType: string,
    operationVariablesTypes: string
  ): string {
    operationResultType = this._externalImportPrefix + operationResultType;
    operationVariablesTypes =
      this._externalImportPrefix + operationVariablesTypes;

    const cache = this._buildOperationReadCache(
      node,
      documentVariableName,
      operationResultType,
      operationVariablesTypes
    );
    return [cache].join("\n");
  }

  public buildOperationReadFragmentCache(): string {
    const res = this._fragments.map((fragment) => {
      const read = this.config.generateFragmentsRead
        ? `export function readFragment${fragment.name}(cache: Apollo.ApolloClient<NormalizedCacheObject>, fragmentId: string, fragmentIdProps?: Partial<Types.${fragment.name}Fragment>) {
                ${this.config.pre}
                const dataId = ${this.config.dataIdFromObjectName}({
                  id: fragmentId,
                  __typename: '${fragment.onType}',
                  ...(fragmentIdProps ? fragmentIdProps : {})
                })
                return cache.readFragment<Types.${fragment.name}Fragment>({
                    id: dataId,
                    fragment: Operations.${fragment.name}FragmentDoc,
                    fragmentName: '${fragment.name}',
                });
                ${this.config.post}
            };`
        : "";

      const write = this.config.generateFragmentsWrite
        ? `export function writeFragment${fragment.name}(cache: Apollo.ApolloClient<NormalizedCacheObject>, fragmentId: string, data: Partial<Types.${fragment.name}Fragment>, fragmentIdProps?: Partial<Types.${fragment.name}Fragment>) {
              ${this.config.pre}
              const dataId = ${this.config.dataIdFromObjectName}({
                  id: fragmentId,
                  __typename: '${fragment.onType}',
                  ...(fragmentIdProps ? fragmentIdProps : {})
              })
              cache.writeFragment({
                id: dataId,
                fragment: Operations.${fragment.name}FragmentDoc,
                data,
              })
              ${this.config.post}
            };
            `
        : "";
      return [read, write].filter((a) => a).join("\n");
    });
    return res.filter((a) => a).join("\n");
  }
}

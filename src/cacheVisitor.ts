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
import { ApolloCacheRawPluginConfig } from "./config";

export interface ApolloCachePluginConfig extends ClientSideBasePluginConfig {
  withHooks?: boolean;
  apolloImportFrom?: string;
  apolloCacheImportFrom?: string;
  apolloReactCommonImportFrom?: string;
  apolloReactHooksImportFrom?: string;
  apolloVersion?: 2 | 3;
  excludePatterns?: string;
  excludePatternsOptions?: string;
}

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
      `import { NormalizedCacheObject } from '${this.config.apolloCacheImportFrom}';`
    );

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

    const readString = `export function readQuery${operationName}(cache: Apollo.ApolloClient<NormalizedCacheObject>, variables?: ${operationVariablesTypes}):${operationResultType} {
            return cache.readQuery({
                query: Operations.${documentVariableName},
                variables,
            });
            };`;

    const writeString = `export function writeQuery${operationName}(cache: Apollo.ApolloClient<NormalizedCacheObject>, data: ${operationResultType}, variables?: ${operationVariablesTypes}) {
            cache.writeQuery({
                query: Operations.${documentVariableName},
                variables,
                data,
            });
        }`;

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
}

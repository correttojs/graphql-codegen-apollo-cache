import { Types } from "@graphql-codegen/plugin-helpers";
import {
  ClientSideBasePluginConfig,
  ClientSideBaseVisitor,
  LoadedFragment,
} from "@graphql-codegen/visitor-plugin-common";
import { RawClientSideBasePluginConfig } from "@graphql-codegen/visitor-plugin-common";
import autoBind from "auto-bind";
import { GraphQLSchema, OperationDefinitionNode } from "graphql";

export class ApolloCacheVisitor extends ClientSideBaseVisitor<
  RawClientSideBasePluginConfig,
  ClientSideBasePluginConfig
> {
  private _externalImportPrefix: string;
  private imports = new Set<string>();

  constructor(
    schema: GraphQLSchema,
    fragments: LoadedFragment[],
    rawConfig: RawClientSideBasePluginConfig,
    documents: Types.DocumentFile[]
  ) {
    super(schema, fragments, rawConfig, {});

    this._externalImportPrefix = this.config.importOperationTypesFrom
      ? `${this.config.importOperationTypesFrom}.`
      : "";
    this._documents = documents;

    autoBind(this);
  }

  public getImports(): string[] {
    this.imports.add(
      `import  { NormalizedCacheObject, defaultDataIdFromObject } from 'apollo-cache-inmemory';`
    );
    this.imports.add(`import type { ApolloClient } from 'apollo-client';`);

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

    const readString = `export function readQuery${operationName}(cache: ApolloClient<NormalizedCacheObject>, variables?: ${operationVariablesTypes}):${operationResultType} {
            return cache.readQuery({
                query,
                variables,
            });
            };`;

    const writeString = `export function writeQuery${operationName}(cache: ApolloClient<NormalizedCacheObject>, data: ${operationResultType}, variables?: ${operationVariablesTypes}) {
            cache.writeQuery({
                query: Operations.${documentVariableName},
                variables,
                data,
            });
        }`;

    return [readString, writeString].filter((a) => a).join("\n");
  }

  public buildOperationReadFragmentCache(): string {
    const res = this._fragments.map((fragment) => {
      return `export function readFragment${fragment.name}(cache: ApolloClient<NormalizedCacheObject>, fragmentId: string) {
                return cache.readFragment<Types.${fragment.name}Fragment>({
                    id: defaultDataIdFromObject({id: fragmentId, __typename: '${fragment.onType}'}),
                    fragment: Operations.${fragment.name}FragmentDoc,,
                    fragmentName: '${fragment.name}',
                })
            };`;
    });
    return res.filter((a) => a).join("\n");
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

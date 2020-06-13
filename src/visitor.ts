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
  public importedDocuments = [];
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
    operationVariablesTypes: string
  ): string {
    this.imports.add(
      `import { readQuery } from '../../components/withApollo/fnReadQuery';`
    );
    if (node.operation === "mutation") {
      return "";
    }
    const operationName: string = this.convertName(node.name.value, {
      useTypesPrefix: false,
    });

    this.importedDocuments.push(documentVariableName);
    this.importedDocuments.push(operationVariablesTypes);
    const readString = `export function readQuery${operationName}(variables?: ${operationVariablesTypes}) {
     return readQuery({
            query: ${documentVariableName},
            variables,
        });
    };`;

    return [readString].filter((a) => a).join("\n");
  }

  public buildOperationReadFragmentCache(): string {
    this.imports.add(
      `import { readFragment } from '../../components/withApollo/fnReadFragment';`
    );

    const res = this._fragments.map((fragment) => {
      this.importedDocuments.push(`${fragment.name}FragmentDoc`);
      this.importedDocuments.push(`${fragment.name}Fragment`);
      return `export function readFragment${fragment.name}(fragmentId: string) {
                return readFragment<${fragment.name}Fragment>({
                    id: fragmentId,
                    __typename: '${fragment.onType}',
                    fragment: ${fragment.name}FragmentDoc,
                    fragmentName: '${fragment.name}',
                });
            };`;
    });
    this.imports.add(
      `import {${this.importedDocuments.join(",")}} from './graphql'`
    );
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
      operationVariablesTypes
    );
    return [cache].join("\n");
  }
}

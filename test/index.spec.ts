import { validateTs } from "@graphql-codegen/testing";
import { plugin } from "../src/index";
import { parse, GraphQLSchema, buildClientSchema } from "graphql";
import { Types, mergeOutputs } from "@graphql-codegen/plugin-helpers";
import { plugin as tsPlugin } from "@graphql-codegen/typescript";
import { plugin as tsDocumentsPlugin } from "@graphql-codegen/typescript-operations";

describe("Apollo Cache", () => {
  let spyConsoleError: jest.SpyInstance;
  beforeEach(() => {
    spyConsoleError = jest.spyOn(console, "warn");
    spyConsoleError.mockImplementation();
  });

  afterEach(() => {
    spyConsoleError.mockRestore();
  });

  const schema = buildClientSchema(require("./schema.json"));
  const basicDoc = parse(/* GraphQL */ `
    query test {
      feed {
        id
        commentCount
        repository {
          full_name
          html_url
          owner {
            avatar_url
          }
        }
      }
    }
  `);

  const validateTypeScript = async (
    output: Types.PluginOutput,
    testSchema: GraphQLSchema,
    documents: Types.DocumentFile[],
    config: any,
    playground = false
  ) => {
    const tsOutput = await tsPlugin(testSchema, documents, config, {
      outputFile: "",
    });
    const tsDocumentsOutput = await tsDocumentsPlugin(
      testSchema,
      documents,
      config,
      { outputFile: "" }
    );
    const merged = mergeOutputs([tsOutput, tsDocumentsOutput, output]);
    validateTs(merged, undefined, true, false, playground);

    return merged;
  };

  describe("Imports", () => {
    it("should import apollo-cache-inmemory and apollo-client dependencies", async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.prepend).toContain("import gql from 'graphql-tag';");
      expect(content.prepend).toContain(
        "import { defaultDataIdFromObject, NormalizedCacheObject } from 'apollo-cache-inmemory';"
      );
      expect(content.prepend).toContain(
        "import * as Apollo from 'apollo-client';"
      );
      await validateTypeScript(content, schema, docs, {});
    });

    it("should import custom apollo-cache-inmemory and apollo-client dependencies", async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        {
          apolloCacheImportFrom: "cache",
          apolloImportFrom: "client",
        },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.prepend).toContain("import gql from 'graphql-tag';");
      expect(content.prepend).toContain(
        "import { defaultDataIdFromObject, NormalizedCacheObject } from 'cache';"
      );
      expect(content.prepend).toContain("import * as Apollo from 'client';");
      await validateTypeScript(content, schema, docs, {});
    });

    it("should import custom  apollo-client v3 dependencies", async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        {
          apolloVersion: 3,
        },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.prepend).toContain(
        "import * as Apollo from '@apollo/client';"
      );
      await validateTypeScript(content, schema, docs, {});
    });

    it("should import DocumentNode when using noGraphQLTag", async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        {
          noGraphQLTag: true,
        },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.prepend).toContain(
        `import { DocumentNode } from 'graphql';`
      );
      expect(content.prepend).not.toContain(`import gql from 'graphql-tag';`);
      await validateTypeScript(content, schema, docs, {});
    });

    it(`should use gql import from gqlImport config option`, async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        { gqlImport: "graphql.macro#gql" },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.prepend).toContain(`import { gql } from 'graphql.macro';`);
      await validateTypeScript(content, schema, docs, {});
    });
  });

  describe("ReadQuery", () => {
    it("Should generate ReadQuery and WriteQuery for query", async () => {
      const documents = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }

        mutation submitRepository($name: String) {
          submitRepository(repoFullName: $name) {
            id
          }
        }
      `);
      const docs = [{ location: "", document: documents }];

      const content = (await plugin(
        schema,
        docs,
        {},
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.content).toBeSimilarStringTo(`
export function readQueryFeed(cache: Apollo.ApolloClient<NormalizedCacheObject>, variables?: FeedQueryVariables):FeedQuery {
                 return cache.readQuery({
                    query: Operations.FeedDocument,
                     variables,
                 });
                 };`);
      expect(content.content).toBeSimilarStringTo(`
export function writeQueryFeed(cache: Apollo.ApolloClient<NormalizedCacheObject>, data: FeedQuery, variables?: FeedQueryVariables) {
                 cache.writeQuery({
                     query: Operations.FeedDocument,
                     variables,
                     data,
                 });
             }`);
      await validateTypeScript(content, schema, docs, {});
    });

    it("Should exclude query patterns", async () => {
      const documents = parse(/* GraphQL */ `
        query feed {
          feed {
            id
            commentCount
            repository {
              full_name
              html_url
              owner {
                avatar_url
              }
            }
          }
        }

        mutation submitRepository($name: String) {
          submitRepository(repoFullName: $name) {
            id
          }
        }
      `);
      const docs = [{ location: "", document: documents }];

      const content = (await plugin(
        schema,
        docs,
        { excludePatterns: "feed", excludePatternsOptions: "i" },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.content).not.toBeSimilarStringTo(`
export function readQueryFeed(cache: Apollo.ApolloClient<NormalizedCacheObject>, variables?: FeedQueryVariables):FeedQuery {
                 return cache.readQuery({
                    query: Operations.FeedDocument,
                     variables,
                 });
                 };`);
      expect(content.content).not.toBeSimilarStringTo(`
export function writeQueryFeed(cache: Apollo.ApolloClient<NormalizedCacheObject>, data: FeedQuery, variables?: FeedQueryVariables) {
                 cache.writeQuery({
                     query: Operations.FeedDocument,
                     variables,
                     data,
                 });
             }`);
      await validateTypeScript(content, schema, docs, {});
    });

    it("Should not add typesPrefix to hooks", async () => {
      const docs = [{ location: "", document: basicDoc }];
      const content = (await plugin(
        schema,
        docs,
        { typesPrefix: "I" },
        {
          outputFile: "graphql.tsx",
        }
      )) as Types.ComplexPluginOutput;

      expect(content.content).toContain(`export function readQueryTest`);
      expect(content.content).toContain(`export function writeQueryTest`);
    });
  });
});

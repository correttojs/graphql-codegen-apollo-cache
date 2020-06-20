# Graphql generator Apollo Cache Plugin

GraphQL Code Generator plugin for generating a functions to read and write from the apollo cache

## Install
`npm i graphql-codegen-apollo-cache`

## Configuration
- `excludePatterns` (default: null): regexp to exclude operation names
- `excludePatternsOptions` (default: ''): regexp flags to exclude operation names
- `apolloVersion` (default: 2): apollo client version
- `apolloCacheImportFrom` (default: apollo-cache-inmemory): apollo-cache-inmemory dependency
- `apolloImportFrom` (default: apollo-client v2 or @apollo/client v3): apollo client dependency
- `dataIdFromObjectImport` (default: apollo-cache-inmemory): custom dataIdFromObject dependency
- `dataIdFromObjectName`:  dataIdFromObject function name
- `generateFragmentsRead`(default: true): generate fragments read functions
- `generateFragmentsWrite`(default: true): generate fragments write functions
- `generateQueriesWrite`(default: true): generate query read functions
- `generateQueriesWrite`(default: true): generate query write functions
- `customImports` (default: ''): full custom import declaration
- `pre` (default: ''): custom code before each function
- `post` (default: ''):  custom code after each function

## Example config

```
overwrite: true
schema:
    - 'https://myschema/graphql'
documents:
    - 'src/**/*.graphql'
generates:
    src/@types/codegen/graphql.tsx:
        plugins:
            - 'typescript'
            - 'typescript-operations'
            - 'typescript-react-apollo'
    src/@types/codegen/cache.tsx:
        config:
            documentMode: external
            importDocumentNodeExternallyFrom: ./graphql
        preset: import-types
        presetConfig:
            typesPath: ./graphql
        plugins:
            - ./build/src/index.js
hooks:
    afterAllFileWrite:
        - prettier --write

```
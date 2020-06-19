# Graphql generator Apollo Cache Plugin

GraphQL Code Generator plugin for generating a functions to read and write from the apollo cache

## Install
`npm i graphql-codegen-apollo-cache`

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
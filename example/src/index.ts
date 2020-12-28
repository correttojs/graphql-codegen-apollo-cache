import { InMemoryCache, ApolloClient } from "@apollo/client";
import {
  GetUserDocument,
  UserMessageFragmentDoc,
} from "./generated/graphql-operations";

const cache = new InMemoryCache();

export const gqlClient = new ApolloClient({
  cache,
});

export const getAddress = () => {
  const users = gqlClient.readQuery({ query: GetUserDocument });
  return users.users[0].address;
};

export const getUserMessage = () => {
  const userMessage = gqlClient.readFragment({
    fragment: UserMessageFragmentDoc,
  });
  return userMessage.address;
};

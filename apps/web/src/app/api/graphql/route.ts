import { ApolloServer } from '@apollo/server';
import { startServerAndCreateNextHandler } from '@as-integrations/next';
import { readFileSync } from 'fs';
import { join } from 'path';
import { NextRequest } from 'next/server';
import { resolvers } from '@/graphql/resolvers';
import { createContext } from '@/graphql/context';

// Force dynamic rendering for this route (required for auth)
export const dynamic = 'force-dynamic';

// Read the schema file
const typeDefs = readFileSync(
  join(process.cwd(), 'src/graphql/schema.graphql'),
  'utf-8'
);

// Create Apollo Server instance
const server = new ApolloServer({
  typeDefs,
  resolvers,
  introspection: process.env.NODE_ENV !== 'production',
  formatError: (formattedError, error) => {
    // Log errors in development
    if (process.env.NODE_ENV !== 'production') {
      console.error('[GraphQL Error]', error);
    }

    // Don't expose internal errors in production
    if (
      process.env.NODE_ENV === 'production' &&
      formattedError.message.includes('prisma')
    ) {
      return {
        ...formattedError,
        message: 'An internal error occurred',
      };
    }

    return formattedError;
  },
});

// Create the Next.js handler
const handler = startServerAndCreateNextHandler(server, {
  context: async () => createContext(),
});

// Export handlers for GET (GraphQL Playground) and POST (queries/mutations)
export async function GET(request: NextRequest) {
  return handler(request);
}

export async function POST(request: NextRequest) {
  return handler(request);
}

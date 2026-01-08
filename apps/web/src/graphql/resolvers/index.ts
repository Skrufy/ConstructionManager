import { Query } from './query';
import { Mutation } from './mutation';
import * as Types from './types';
import { DateTimeResolver, DateResolver } from 'graphql-scalars';

/**
 * Combined resolvers for the GraphQL API
 */
export const resolvers = {
  // Custom scalars
  DateTime: DateTimeResolver,
  Date: DateResolver,

  // Root resolvers
  Query,
  Mutation,

  // Type resolvers
  User: Types.User,
  Project: Types.Project,
  DailyLog: Types.DailyLog,
  TimeEntry: Types.TimeEntry,
  Equipment: Types.Equipment,
  Incident: Types.Incident,
  Inspection: Types.Inspection,
  PunchList: Types.PunchList,
  PunchListItem: Types.PunchListItem,
  Document: Types.Document,
  Annotation: Types.Annotation,
};

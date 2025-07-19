import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  primaryKey,
  uuid,
  unique,
  index,
  json
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ========================================
// BETTER AUTH REQUIRED TABLES
// ========================================

export const user = pgTable("user", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  // Additional fields for uptime monitoring
  subPlan: text('sub_plan', { enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'] }).default('BASIC'),
  verifiedEmailSent: timestamp('verified_email_sent'),
});

export const session = pgTable("session", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' })
});

export const account = pgTable("account", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable("verification", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow()
});

// ========================================
// UPTIME MONITORING TABLES
// ========================================

export const monitor = pgTable("monitor", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  slug: text("slug").unique(),
  websiteName: text("website_name").notNull(),
  url: text("url").notNull(),
  method: text("method").notNull().default("GET"),
  expectedStatus: integer("expected_status").notNull().default(200),
  interval: integer("interval").notNull(), // in minutes
  timeout: integer("timeout").notNull(), // in seconds
  isPaused: boolean("is_paused").notNull().default(false),
  regions: text("regions").array(), // ['us-east-1', 'eu-west-1', 'ap-south-1']
  lastCheckedAt: timestamp("last_checked_at"),
  status: text("status", { enum: ['UP', 'DOWN', 'PAUSED'] }).default('UP'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  isDeleted: boolean("is_deleted").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("monitor_user_id_idx").on(table.userId),
  statusIdx: index("monitor_status_idx").on(table.status),
  lastCheckedIdx: index("monitor_last_checked_idx").on(table.lastCheckedAt),
}));

export const monitorResult = pgTable("monitor_result", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  monitorId: text("monitor_id").notNull().references(() => monitor.id, { onDelete: 'cascade' }),
  region: text("region").notNull(),
  statusCode: integer("status_code"),
  isUp: boolean("is_up").notNull(),
  responseTime: integer("response_time").notNull(), // in milliseconds
  checkedAt: timestamp("checked_at").notNull().defaultNow(),
  errorMessage: text("error_message"),
  rawResponse: text("raw_response"),
}, (table) => ({
  monitorRegionCheckedIdx: index("monitor_result_monitor_region_checked_idx").on(
    table.monitorId, 
    table.region, 
    table.checkedAt
  ),
  regionCheckedIdx: index("monitor_result_region_checked_idx").on(
    table.region, 
    table.checkedAt
  ),
  checkedAtIdx: index("monitor_result_checked_at_idx").on(table.checkedAt),
}));

export const monitorLog = pgTable("monitor_log", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  monitorId: text("monitor_id").notNull().references(() => monitor.id, { onDelete: 'cascade' }),
  region: text("region").notNull(),
  level: text("level").notNull(), // 'info', 'warn', 'error', 'debug'
  message: text("message").notNull(),
  meta: json("meta"), // Additional structured data
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  monitorRegionCreatedIdx: index("monitor_log_monitor_region_created_idx").on(
    table.monitorId, 
    table.region, 
    table.createdAt
  ),
  regionCreatedIdx: index("monitor_log_region_created_idx").on(
    table.region, 
    table.createdAt
  ),
  createdAtIdx: index("monitor_log_created_at_idx").on(table.createdAt),
}));

export const incident = pgTable("incident", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  monitorId: text("monitor_id").notNull().references(() => monitor.id, { onDelete: 'cascade' }),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  resolvedAt: timestamp("resolved_at"),
  status: text("status").notNull().default("OPEN"), // 'OPEN', 'RESOLVED', 'ACKNOWLEDGED'
  summary: text("summary"),
  lastNotifiedAt: timestamp("last_notified_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  monitorStatusIdx: index("incident_monitor_status_idx").on(table.monitorId, table.status),
  startedAtIdx: index("incident_started_at_idx").on(table.startedAt),
  statusIdx: index("incident_status_idx").on(table.status),
}));

export const monitorAlertRecipient = pgTable("monitor_alert_recipient", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  email: text("email").notNull(),
  monitorId: text("monitor_id").notNull().references(() => monitor.id, { onDelete: 'cascade' }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  emailMonitorUnique: unique("monitor_alert_recipient_email_monitor_unique").on(
    table.email, 
    table.monitorId
  ),
  monitorIdIdx: index("monitor_alert_recipient_monitor_id_idx").on(table.monitorId),
}));

export const slugTicket = pgTable("slug_ticket", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  rangeStart: integer("range_start").notNull(),
  rangeEnd: integer("range_end").notNull(),
  currentValue: integer("current_value").notNull(),
});

// ========================================
// RELATIONS
// ========================================

export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  monitors: many(monitor),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const monitorRelations = relations(monitor, ({ one, many }) => ({
  user: one(user, {
    fields: [monitor.userId],
    references: [user.id],
  }),
  results: many(monitorResult),
  logs: many(monitorLog),
  incidents: many(incident),
  alertRecipients: many(monitorAlertRecipient),
}));

export const monitorResultRelations = relations(monitorResult, ({ one }) => ({
  monitor: one(monitor, {
    fields: [monitorResult.monitorId],
    references: [monitor.id],
  }),
}));

export const monitorLogRelations = relations(monitorLog, ({ one }) => ({
  monitor: one(monitor, {
    fields: [monitorLog.monitorId],
    references: [monitor.id],
  }),
}));

export const incidentRelations = relations(incident, ({ one }) => ({
  monitor: one(monitor, {
    fields: [incident.monitorId],
    references: [monitor.id],
  }),
}));

export const monitorAlertRecipientRelations = relations(monitorAlertRecipient, ({ one }) => ({
  monitor: one(monitor, {
    fields: [monitorAlertRecipient.monitorId],
    references: [monitor.id],
  }),
}));

// ========================================
// TYPES
// ========================================

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;

export type Monitor = typeof monitor.$inferSelect;
export type NewMonitor = typeof monitor.$inferInsert;

export type MonitorResult = typeof monitorResult.$inferSelect;
export type NewMonitorResult = typeof monitorResult.$inferInsert;

export type MonitorLog = typeof monitorLog.$inferSelect;
export type NewMonitorLog = typeof monitorLog.$inferInsert;

export type Incident = typeof incident.$inferSelect;
export type NewIncident = typeof incident.$inferInsert;

export type MonitorAlertRecipient = typeof monitorAlertRecipient.$inferSelect;
export type NewMonitorAlertRecipient = typeof monitorAlertRecipient.$inferInsert;

export type SlugTicket = typeof slugTicket.$inferSelect;
export type NewSlugTicket = typeof slugTicket.$inferInsert;

// Subscription Plan Enum
export const SubscriptionPlan = {
  BASIC: 'BASIC',
  PREMIUM: 'PREMIUM',
  ENTERPRISE: 'ENTERPRISE',
} as const;

export type SubscriptionPlan = typeof SubscriptionPlan[keyof typeof SubscriptionPlan];

// Monitor Status Enum
export const MonitorStatus = {
  UP: 'UP',
  DOWN: 'DOWN',
  PAUSED: 'PAUSED',
} as const;

export type MonitorStatus = typeof MonitorStatus[keyof typeof MonitorStatus];

// Incident Status Enum
export const IncidentStatus = {
  OPEN: 'OPEN',
  RESOLVED: 'RESOLVED',
  ACKNOWLEDGED: 'ACKNOWLEDGED',
} as const;

export type IncidentStatus = typeof IncidentStatus[keyof typeof IncidentStatus];
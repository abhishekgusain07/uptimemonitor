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
  // Enhanced profile fields
  firstName: text('first_name'),
  lastName: text('last_name'),
  company: text('company'),
  jobTitle: text('job_title'),
  phone: text('phone'),
  website: text('website'),
  bio: text('bio'),
  location: text('location'),
  timezone: text('timezone').default('UTC'),
  // Security fields
  twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),
  twoFactorSecret: text('two_factor_secret'), // Encrypted
  backupCodes: json('backup_codes'), // Array of encrypted backup codes
  lastLoginAt: timestamp('last_login_at'),
  lastLoginIp: text('last_login_ip'),
  // Account status
  isActive: boolean('is_active').notNull().default(true),
  isSuspended: boolean('is_suspended').notNull().default(false),
  suspendedAt: timestamp('suspended_at'),
  suspensionReason: text('suspension_reason'),
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
// SUBSCRIPTION & BILLING TABLES
// ========================================

export const subscription = pgTable("subscription", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  plan: text("plan", { enum: ['BASIC', 'PREMIUM', 'ENTERPRISE'] }).notNull().default('BASIC'),
  status: text("status", { enum: ['ACTIVE', 'CANCELLED', 'PAST_DUE', 'PAUSED'] }).notNull().default('ACTIVE'),
  currentPeriodStart: timestamp("current_period_start").notNull().defaultNow(),
  currentPeriodEnd: timestamp("current_period_end").notNull().defaultNow(),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
  cancelledAt: timestamp("cancelled_at"),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  metadata: json("metadata"), // For storing additional subscription data
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("subscription_user_id_idx").on(table.userId),
  statusIdx: index("subscription_status_idx").on(table.status),
  periodEndIdx: index("subscription_period_end_idx").on(table.currentPeriodEnd),
}));

export const planUsage = pgTable("plan_usage", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: text("subscription_id").references(() => subscription.id, { onDelete: 'cascade' }),
  periodStart: timestamp("period_start").notNull(),
  periodEnd: timestamp("period_end").notNull(),
  monitorsUsed: integer("monitors_used").notNull().default(0),
  alertRecipientsUsed: integer("alert_recipients_used").notNull().default(0),
  apiCallsUsed: integer("api_calls_used").notNull().default(0),
  checksPerformed: integer("checks_performed").notNull().default(0),
  dataRetentionDays: integer("data_retention_days").notNull().default(30),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userPeriodIdx: index("plan_usage_user_period_idx").on(table.userId, table.periodStart, table.periodEnd),
  periodStartIdx: index("plan_usage_period_start_idx").on(table.periodStart),
}));

export const billingHistory = pgTable("billing_history", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  subscriptionId: text("subscription_id").references(() => subscription.id, { onDelete: 'set null' }),
  amount: integer("amount").notNull(), // Amount in cents
  currency: text("currency").notNull().default('USD'),
  status: text("status", { enum: ['PENDING', 'PAID', 'FAILED', 'REFUNDED'] }).notNull(),
  description: text("description").notNull(),
  periodStart: timestamp("period_start"),
  periodEnd: timestamp("period_end"),
  paidAt: timestamp("paid_at"),
  failedAt: timestamp("failed_at"),
  refundedAt: timestamp("refunded_at"),
  paymentMethod: text("payment_method"), // 'card', 'paypal', etc.
  transactionId: text("transaction_id"), // External payment processor ID
  metadata: json("metadata"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (table) => ({
  userIdIdx: index("billing_history_user_id_idx").on(table.userId),
  statusIdx: index("billing_history_status_idx").on(table.status),
  createdAtIdx: index("billing_history_created_at_idx").on(table.createdAt),
}));

export const userPreferences = pgTable("user_preferences", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }).unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(false),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  weeklyReport: boolean("weekly_report").notNull().default(true),
  maintenanceAlerts: boolean("maintenance_alerts").notNull().default(true),
  timezone: text("timezone").notNull().default('UTC'),
  dateFormat: text("date_format").notNull().default('MM/DD/YYYY'),
  timeFormat: text("time_format", { enum: ['12h', '24h'] }).notNull().default('12h'),
  language: text("language").notNull().default('en'),
  theme: text("theme", { enum: ['light', 'dark', 'system'] }).notNull().default('system'),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Profile change audit log
export const profileAuditLog = pgTable("profile_audit_log", {
  id: text("id").primaryKey().default('gen_random_uuid()'),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: 'cascade' }),
  action: text("action").notNull(), // 'profile_update', 'email_change', 'password_change', etc.
  fieldChanged: text("field_changed"), // Specific field that was changed
  oldValue: text("old_value"), // Previous value (encrypted for sensitive data)
  newValue: text("new_value"), // New value (encrypted for sensitive data)
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (table) => ({
  userActionIdx: index("profile_audit_log_user_action_idx").on(table.userId, table.action),
  createdAtIdx: index("profile_audit_log_created_at_idx").on(table.createdAt),
}));

// ========================================
// RELATIONS
// ========================================

export const userRelations = relations(user, ({ one, many }) => ({
  sessions: many(session),
  accounts: many(account),
  monitors: many(monitor),
  subscription: one(subscription, {
    fields: [user.id],
    references: [subscription.userId],
  }),
  preferences: one(userPreferences, {
    fields: [user.id],
    references: [userPreferences.userId],
  }),
  planUsage: many(planUsage),
  billingHistory: many(billingHistory),
  auditLogs: many(profileAuditLog),
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

export const subscriptionRelations = relations(subscription, ({ one, many }) => ({
  user: one(user, {
    fields: [subscription.userId],
    references: [user.id],
  }),
  planUsage: many(planUsage),
  billingHistory: many(billingHistory),
}));

export const planUsageRelations = relations(planUsage, ({ one }) => ({
  user: one(user, {
    fields: [planUsage.userId],
    references: [user.id],
  }),
  subscription: one(subscription, {
    fields: [planUsage.subscriptionId],
    references: [subscription.id],
  }),
}));

export const billingHistoryRelations = relations(billingHistory, ({ one }) => ({
  user: one(user, {
    fields: [billingHistory.userId],
    references: [user.id],
  }),
  subscription: one(subscription, {
    fields: [billingHistory.subscriptionId],
    references: [subscription.id],
  }),
}));

export const userPreferencesRelations = relations(userPreferences, ({ one }) => ({
  user: one(user, {
    fields: [userPreferences.userId],
    references: [user.id],
  }),
}));

export const profileAuditLogRelations = relations(profileAuditLog, ({ one }) => ({
  user: one(user, {
    fields: [profileAuditLog.userId],
    references: [user.id],
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

export type Subscription = typeof subscription.$inferSelect;
export type NewSubscription = typeof subscription.$inferInsert;

export type PlanUsage = typeof planUsage.$inferSelect;
export type NewPlanUsage = typeof planUsage.$inferInsert;

export type BillingHistory = typeof billingHistory.$inferSelect;
export type NewBillingHistory = typeof billingHistory.$inferInsert;

export type UserPreferences = typeof userPreferences.$inferSelect;
export type NewUserPreferences = typeof userPreferences.$inferInsert;

export type ProfileAuditLog = typeof profileAuditLog.$inferSelect;
export type NewProfileAuditLog = typeof profileAuditLog.$inferInsert;

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

// Subscription Status Enum
export const SubscriptionStatus = {
  ACTIVE: 'ACTIVE',
  CANCELLED: 'CANCELLED',
  PAST_DUE: 'PAST_DUE',
  PAUSED: 'PAUSED',
} as const;

export type SubscriptionStatus = typeof SubscriptionStatus[keyof typeof SubscriptionStatus];

// Billing Status Enum
export const BillingStatus = {
  PENDING: 'PENDING',
  PAID: 'PAID',
  FAILED: 'FAILED',
  REFUNDED: 'REFUNDED',
} as const;

export type BillingStatus = typeof BillingStatus[keyof typeof BillingStatus];

// Time Format Enum
export const TimeFormat = {
  TWELVE_HOUR: '12h',
  TWENTY_FOUR_HOUR: '24h',
} as const;

export type TimeFormat = typeof TimeFormat[keyof typeof TimeFormat];

// Theme Enum
export const Theme = {
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
} as const;

export type Theme = typeof Theme[keyof typeof Theme];
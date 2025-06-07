import { pgTable, text, serial, integer, boolean, timestamp, json, uuid } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull().unique(),
  telegramUsername: text("telegram_username"),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  middleName: text("middle_name"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActiveAt: timestamp("last_active_at").defaultNow().notNull(),
});

// Groups table
export const groups = pgTable("groups", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Group members table
export const groupMembers = pgTable("group_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  isLeader: boolean("is_leader").default(false).notNull(),
  isAssistant: boolean("is_assistant").default(false).notNull(),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Group invitations table
export const groupInvitations = pgTable("group_invitations", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  invitedByUserId: integer("invited_by_user_id").notNull().references(() => users.id),
  inviteToken: uuid("invite_token").defaultRandom().notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  isUsed: boolean("is_used").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Events table
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  isImportant: boolean("is_important").default(false).notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"), // 'image' | 'video'
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Viewed events table
export const viewedEvents = pgTable("viewed_events", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  eventId: integer("event_id").notNull().references(() => events.id, { onDelete: "cascade" }),
  viewedAt: timestamp("viewed_at").defaultNow().notNull(),
});

// Deadlines table
export const deadlines = pgTable("deadlines", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date").notNull(),
  isCompleted: boolean("is_completed").default(false).notNull(),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Queues table
export const queues = pgTable("queues", {
  id: serial("id").primaryKey(),
  groupId: integer("group_id").notNull().references(() => groups.id, { onDelete: "cascade" }),
  createdByUserId: integer("created_by_user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  description: text("description"),
  subject: text("subject"),
  date: timestamp("date").notNull(),
  maxParticipants: integer("max_participants").default(20).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Queue participants table
export const queueParticipants = pgTable("queue_participants", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => queues.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  position: integer("position").notNull(),
  selectedTopic: text("selected_topic"),
  joinedAt: timestamp("joined_at").defaultNow().notNull(),
});

// Topics table
export const topics = pgTable("topics", {
  id: serial("id").primaryKey(),
  queueId: integer("queue_id").notNull().references(() => queues.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  description: text("description"),
  maxParticipants: integer("max_participants").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Topic selections table
export const topicSelections = pgTable("topic_selections", {
  id: serial("id").primaryKey(),
  topicId: integer("topic_id").notNull().references(() => topics.id, { onDelete: "cascade" }),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  selectedAt: timestamp("selected_at").defaultNow().notNull(),
  isConfirmed: boolean("is_confirmed").default(false).notNull(),
  confirmedByUserId: integer("confirmed_by_user_id").references(() => users.id),
  confirmedAt: timestamp("confirmed_at"),
});

// Reminders table
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  deadlineId: integer("deadline_id").references(() => deadlines.id, { onDelete: "cascade" }),
  reminderTime: timestamp("reminder_time").notNull(),
  message: text("message").notNull(),
  isSent: boolean("is_sent").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Admin logs table
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  telegramId: text("telegram_id").notNull(),
  action: text("action").notNull(),
  details: json("details"),
  performedAt: timestamp("performed_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  groupMemberships: many(groupMembers),
  createdEvents: many(events),
  viewedEvents: many(viewedEvents),
  createdDeadlines: many(deadlines),
  createdQueues: many(queues),
  queueParticipations: many(queueParticipants),
  topicSelections: many(topicSelections),
  reminders: many(reminders),
  invitations: many(groupInvitations),
}));

export const groupsRelations = relations(groups, ({ many }) => ({
  members: many(groupMembers),
  events: many(events),
  deadlines: many(deadlines),
  queues: many(queues),
  invitations: many(groupInvitations),
}));

export const groupMembersRelations = relations(groupMembers, ({ one }) => ({
  user: one(users, { fields: [groupMembers.userId], references: [users.id] }),
  group: one(groups, { fields: [groupMembers.groupId], references: [groups.id] }),
}));

export const eventsRelations = relations(events, ({ one, many }) => ({
  group: one(groups, { fields: [events.groupId], references: [groups.id] }),
  createdBy: one(users, { fields: [events.createdByUserId], references: [users.id] }),
  viewedBy: many(viewedEvents),
}));

export const deadlinesRelations = relations(deadlines, ({ one, many }) => ({
  group: one(groups, { fields: [deadlines.groupId], references: [groups.id] }),
  createdBy: one(users, { fields: [deadlines.createdByUserId], references: [users.id] }),
  reminders: many(reminders),
}));

export const queuesRelations = relations(queues, ({ one, many }) => ({
  group: one(groups, { fields: [queues.groupId], references: [groups.id] }),
  createdBy: one(users, { fields: [queues.createdByUserId], references: [users.id] }),
  participants: many(queueParticipants),
  topics: many(topics),
}));

export const topicsRelations = relations(topics, ({ one, many }) => ({
  queue: one(queues, { fields: [topics.queueId], references: [queues.id] }),
  selections: many(topicSelections),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  lastActiveAt: true,
});

export const insertGroupSchema = createInsertSchema(groups).omit({
  id: true,
  createdAt: true,
});

export const insertEventSchema = createInsertSchema(events).omit({
  id: true,
  createdAt: true,
});

export const insertDeadlineSchema = createInsertSchema(deadlines).omit({
  id: true,
  createdAt: true,
});

export const insertQueueSchema = createInsertSchema(queues).omit({
  id: true,
  createdAt: true,
});

export const insertTopicSchema = createInsertSchema(topics).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Group = typeof groups.$inferSelect;
export type InsertGroup = z.infer<typeof insertGroupSchema>;
export type Event = typeof events.$inferSelect;
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Deadline = typeof deadlines.$inferSelect;
export type InsertDeadline = z.infer<typeof insertDeadlineSchema>;
export type Queue = typeof queues.$inferSelect;
export type InsertQueue = z.infer<typeof insertQueueSchema>;
export type Topic = typeof topics.$inferSelect;
export type InsertTopic = z.infer<typeof insertTopicSchema>;
export type GroupMember = typeof groupMembers.$inferSelect;
export type QueueParticipant = typeof queueParticipants.$inferSelect;
export type ViewedEvent = typeof viewedEvents.$inferSelect;
export type TopicSelection = typeof topicSelections.$inferSelect;
export type GroupInvitation = typeof groupInvitations.$inferSelect;
export type Reminder = typeof reminders.$inferSelect;

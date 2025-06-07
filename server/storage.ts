import { 
  users, groups, groupMembers, events, deadlines, queues, topics, 
  viewedEvents, queueParticipants, topicSelections, groupInvitations, reminders,
  type User, type InsertUser, type Group, type InsertGroup, 
  type Event, type InsertEvent, type Deadline, type InsertDeadline,
  type Queue, type InsertQueue, type Topic, type InsertTopic,
  type GroupMember, type QueueParticipant, type ViewedEvent,
  type TopicSelection, type GroupInvitation, type Reminder
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";

export interface IStorage {
  // Users
  getUserByTelegramId(telegramId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserActivity(userId: number): Promise<void>;

  // Groups
  createGroup(group: InsertGroup): Promise<Group>;
  getGroupById(id: number): Promise<Group | undefined>;
  getUserGroups(userId: number): Promise<Array<Group & { role: 'leader' | 'assistant' | 'member' }>>;
  
  // Group membership
  addUserToGroup(userId: number, groupId: number, isLeader?: boolean, isAssistant?: boolean): Promise<GroupMember>;
  getUserGroupRole(userId: number, groupId: number): Promise<{ isLeader: boolean; isAssistant: boolean } | null>;
  getGroupMembers(groupId: number): Promise<Array<User & { isLeader: boolean; isAssistant: boolean }>>;
  removeUserFromGroup(userId: number, groupId: number): Promise<void>;
  updateGroupMemberRole(userId: number, groupId: number, isLeader: boolean, isAssistant: boolean): Promise<void>;

  // Group invitations
  createGroupInvitation(groupId: number, invitedByUserId: number, expiresAt: Date): Promise<GroupInvitation>;
  getGroupInvitationByToken(token: string): Promise<GroupInvitation | undefined>;
  useGroupInvitation(token: string): Promise<void>;

  // Events
  createEvent(event: InsertEvent): Promise<Event>;
  getGroupEvents(groupId: number): Promise<Array<Event & { createdBy: User }>>;
  getEventById(id: number): Promise<Event | undefined>;
  updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event>;
  deleteEvent(id: number): Promise<void>;
  markEventAsViewed(userId: number, eventId: number): Promise<void>;
  getUserViewedEvents(userId: number, groupId: number): Promise<number[]>;

  // Deadlines
  createDeadline(deadline: InsertDeadline): Promise<Deadline>;
  getGroupDeadlines(groupId: number): Promise<Array<Deadline & { createdBy: User }>>;
  getDeadlineById(id: number): Promise<Deadline | undefined>;
  updateDeadline(id: number, updates: Partial<InsertDeadline>): Promise<Deadline>;
  deleteDeadline(id: number): Promise<void>;
  getUserUpcomingDeadlines(userId: number): Promise<Deadline[]>;

  // Queues
  createQueue(queue: InsertQueue): Promise<Queue>;
  getGroupQueues(groupId: number): Promise<Array<Queue & { createdBy: User }>>;
  getQueueById(id: number): Promise<Queue | undefined>;
  updateQueue(id: number, updates: Partial<InsertQueue>): Promise<Queue>;
  deleteQueue(id: number): Promise<void>;
  getQueuesForDate(groupId: number, date: Date): Promise<Array<Queue & { participantCount: number }>>;

  // Queue participation
  joinQueue(userId: number, queueId: number): Promise<QueueParticipant>;
  leaveQueue(userId: number, queueId: number): Promise<void>;
  getQueueParticipants(queueId: number): Promise<Array<QueueParticipant & { user: User }>>;
  updateQueueParticipantTopic(userId: number, queueId: number, topic: string): Promise<void>;

  // Topics
  createTopic(topic: InsertTopic): Promise<Topic>;
  getQueueTopics(queueId: number): Promise<Topic[]>;
  deleteTopic(id: number): Promise<void>;
  selectTopic(userId: number, topicId: number): Promise<TopicSelection>;
  getTopicSelections(topicId: number): Promise<Array<TopicSelection & { user: User }>>;

  // Reminders
  createReminder(userId: number, deadlineId: number, reminderTime: Date, message: string): Promise<Reminder>;
  getUserReminders(userId: number): Promise<Reminder[]>;
  getPendingReminders(): Promise<Reminder[]>;
  markReminderAsSent(id: number): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  // Users
  async getUserByTelegramId(telegramId: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.telegramId, telegramId));
    return user || undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [createdUser] = await db.insert(users).values(user).returning();
    return createdUser;
  }

  async updateUserActivity(userId: number): Promise<void> {
    await db.update(users)
      .set({ lastActiveAt: new Date() })
      .where(eq(users.id, userId));
  }

  // Groups
  async createGroup(group: InsertGroup): Promise<Group> {
    const [createdGroup] = await db.insert(groups).values(group).returning();
    return createdGroup;
  }

  async getGroupById(id: number): Promise<Group | undefined> {
    const [group] = await db.select().from(groups).where(eq(groups.id, id));
    return group || undefined;
  }

  async getUserGroups(userId: number): Promise<Array<Group & { role: 'leader' | 'assistant' | 'member' }>> {
    const result = await db
      .select({
        id: groups.id,
        name: groups.name,
        description: groups.description,
        createdAt: groups.createdAt,
        isLeader: groupMembers.isLeader,
        isAssistant: groupMembers.isAssistant,
      })
      .from(groups)
      .innerJoin(groupMembers, eq(groups.id, groupMembers.groupId))
      .where(eq(groupMembers.userId, userId));

    return result.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      createdAt: row.createdAt,
      role: row.isLeader ? 'leader' : row.isAssistant ? 'assistant' : 'member' as const,
    }));
  }

  // Group membership
  async addUserToGroup(userId: number, groupId: number, isLeader = false, isAssistant = false): Promise<GroupMember> {
    const [member] = await db.insert(groupMembers)
      .values({ userId, groupId, isLeader, isAssistant })
      .returning();
    return member;
  }

  async getUserGroupRole(userId: number, groupId: number): Promise<{ isLeader: boolean; isAssistant: boolean } | null> {
    const [member] = await db.select({ isLeader: groupMembers.isLeader, isAssistant: groupMembers.isAssistant })
      .from(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
    return member || null;
  }

  async getGroupMembers(groupId: number): Promise<Array<User & { isLeader: boolean; isAssistant: boolean }>> {
    const result = await db
      .select({
        id: users.id,
        telegramId: users.telegramId,
        telegramUsername: users.telegramUsername,
        firstName: users.firstName,
        lastName: users.lastName,
        middleName: users.middleName,
        createdAt: users.createdAt,
        lastActiveAt: users.lastActiveAt,
        isLeader: groupMembers.isLeader,
        isAssistant: groupMembers.isAssistant,
      })
      .from(users)
      .innerJoin(groupMembers, eq(users.id, groupMembers.userId))
      .where(eq(groupMembers.groupId, groupId));

    return result;
  }

  async removeUserFromGroup(userId: number, groupId: number): Promise<void> {
    await db.delete(groupMembers)
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
  }

  async updateGroupMemberRole(userId: number, groupId: number, isLeader: boolean, isAssistant: boolean): Promise<void> {
    await db.update(groupMembers)
      .set({ isLeader, isAssistant })
      .where(and(eq(groupMembers.userId, userId), eq(groupMembers.groupId, groupId)));
  }

  // Group invitations
  async createGroupInvitation(groupId: number, invitedByUserId: number, expiresAt: Date): Promise<GroupInvitation> {
    const [invitation] = await db.insert(groupInvitations)
      .values({ groupId, invitedByUserId, expiresAt })
      .returning();
    return invitation;
  }

  async getGroupInvitationByToken(token: string): Promise<GroupInvitation | undefined> {
    const [invitation] = await db.select().from(groupInvitations)
      .where(and(
        eq(groupInvitations.inviteToken, token),
        eq(groupInvitations.isUsed, false),
        gte(groupInvitations.expiresAt, new Date())
      ));
    return invitation || undefined;
  }

  async useGroupInvitation(token: string): Promise<void> {
    await db.update(groupInvitations)
      .set({ isUsed: true })
      .where(eq(groupInvitations.inviteToken, token));
  }

  // Events
  async createEvent(event: InsertEvent): Promise<Event> {
    const [createdEvent] = await db.insert(events).values(event).returning();
    return createdEvent;
  }

  async getGroupEvents(groupId: number): Promise<Array<Event & { createdBy: User }>> {
    const result = await db
      .select({
        id: events.id,
        groupId: events.groupId,
        createdByUserId: events.createdByUserId,
        title: events.title,
        description: events.description,
        subject: events.subject,
        isImportant: events.isImportant,
        mediaUrl: events.mediaUrl,
        mediaType: events.mediaType,
        createdAt: events.createdAt,
        createdBy: users,
      })
      .from(events)
      .innerJoin(users, eq(events.createdByUserId, users.id))
      .where(eq(events.groupId, groupId))
      .orderBy(desc(events.createdAt));

    return result;
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await db.select().from(events).where(eq(events.id, id));
    return event || undefined;
  }

  async updateEvent(id: number, updates: Partial<InsertEvent>): Promise<Event> {
    const [updatedEvent] = await db.update(events)
      .set(updates)
      .where(eq(events.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteEvent(id: number): Promise<void> {
    await db.delete(events).where(eq(events.id, id));
  }

  async markEventAsViewed(userId: number, eventId: number): Promise<void> {
    await db.insert(viewedEvents)
      .values({ userId, eventId })
      .onConflictDoNothing();
  }

  async getUserViewedEvents(userId: number, groupId: number): Promise<number[]> {
    const result = await db
      .select({ eventId: viewedEvents.eventId })
      .from(viewedEvents)
      .innerJoin(events, eq(viewedEvents.eventId, events.id))
      .where(and(eq(viewedEvents.userId, userId), eq(events.groupId, groupId)));

    return result.map(row => row.eventId);
  }

  // Deadlines
  async createDeadline(deadline: InsertDeadline): Promise<Deadline> {
    const [createdDeadline] = await db.insert(deadlines).values(deadline).returning();
    return createdDeadline;
  }

  async getGroupDeadlines(groupId: number): Promise<Array<Deadline & { createdBy: User }>> {
    const result = await db
      .select({
        id: deadlines.id,
        groupId: deadlines.groupId,
        createdByUserId: deadlines.createdByUserId,
        title: deadlines.title,
        description: deadlines.description,
        subject: deadlines.subject,
        startDate: deadlines.startDate,
        endDate: deadlines.endDate,
        isCompleted: deadlines.isCompleted,
        mediaUrl: deadlines.mediaUrl,
        mediaType: deadlines.mediaType,
        createdAt: deadlines.createdAt,
        createdBy: users,
      })
      .from(deadlines)
      .innerJoin(users, eq(deadlines.createdByUserId, users.id))
      .where(eq(deadlines.groupId, groupId))
      .orderBy(asc(deadlines.endDate));

    return result;
  }

  async getDeadlineById(id: number): Promise<Deadline | undefined> {
    const [deadline] = await db.select().from(deadlines).where(eq(deadlines.id, id));
    return deadline || undefined;
  }

  async updateDeadline(id: number, updates: Partial<InsertDeadline>): Promise<Deadline> {
    const [updatedDeadline] = await db.update(deadlines)
      .set(updates)
      .where(eq(deadlines.id, id))
      .returning();
    return updatedDeadline;
  }

  async deleteDeadline(id: number): Promise<void> {
    await db.delete(deadlines).where(eq(deadlines.id, id));
  }

  async getUserUpcomingDeadlines(userId: number): Promise<Deadline[]> {
    const now = new Date();
    const result = await db
      .select()
      .from(deadlines)
      .innerJoin(groupMembers, eq(deadlines.groupId, groupMembers.groupId))
      .where(and(
        eq(groupMembers.userId, userId),
        gte(deadlines.endDate, now),
        eq(deadlines.isCompleted, false)
      ))
      .orderBy(asc(deadlines.endDate));

    return result.map(row => row.deadlines);
  }

  // Queues
  async createQueue(queue: InsertQueue): Promise<Queue> {
    const [createdQueue] = await db.insert(queues).values(queue).returning();
    return createdQueue;
  }

  async getGroupQueues(groupId: number): Promise<Array<Queue & { createdBy: User }>> {
    const result = await db
      .select({
        id: queues.id,
        groupId: queues.groupId,
        createdByUserId: queues.createdByUserId,
        title: queues.title,
        description: queues.description,
        subject: queues.subject,
        date: queues.date,
        maxParticipants: queues.maxParticipants,
        createdAt: queues.createdAt,
        createdBy: users,
      })
      .from(queues)
      .innerJoin(users, eq(queues.createdByUserId, users.id))
      .where(eq(queues.groupId, groupId))
      .orderBy(asc(queues.date));

    return result;
  }

  async getQueueById(id: number): Promise<Queue | undefined> {
    const [queue] = await db.select().from(queues).where(eq(queues.id, id));
    return queue || undefined;
  }

  async updateQueue(id: number, updates: Partial<InsertQueue>): Promise<Queue> {
    const [updatedQueue] = await db.update(queues)
      .set(updates)
      .where(eq(queues.id, id))
      .returning();
    return updatedQueue;
  }

  async deleteQueue(id: number): Promise<void> {
    await db.delete(queues).where(eq(queues.id, id));
  }

  async getQueuesForDate(groupId: number, date: Date): Promise<Array<Queue & { participantCount: number }>> {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const result = await db
      .select({
        id: queues.id,
        groupId: queues.groupId,
        createdByUserId: queues.createdByUserId,
        title: queues.title,
        description: queues.description,
        subject: queues.subject,
        date: queues.date,
        maxParticipants: queues.maxParticipants,
        createdAt: queues.createdAt,
        participantCount: sql<number>`count(${queueParticipants.id})::int`,
      })
      .from(queues)
      .leftJoin(queueParticipants, eq(queues.id, queueParticipants.queueId))
      .where(and(
        eq(queues.groupId, groupId),
        gte(queues.date, startOfDay),
        lte(queues.date, endOfDay)
      ))
      .groupBy(queues.id)
      .orderBy(asc(queues.date));

    return result;
  }

  // Queue participation
  async joinQueue(userId: number, queueId: number): Promise<QueueParticipant> {
    const maxPosition = await db
      .select({ max: sql<number>`coalesce(max(${queueParticipants.position}), 0)` })
      .from(queueParticipants)
      .where(eq(queueParticipants.queueId, queueId));

    const position = (maxPosition[0]?.max || 0) + 1;

    const [participant] = await db.insert(queueParticipants)
      .values({ userId, queueId, position })
      .returning();
    return participant;
  }

  async leaveQueue(userId: number, queueId: number): Promise<void> {
    await db.delete(queueParticipants)
      .where(and(eq(queueParticipants.userId, userId), eq(queueParticipants.queueId, queueId)));
  }

  async getQueueParticipants(queueId: number): Promise<Array<QueueParticipant & { user: User }>> {
    const result = await db
      .select({
        id: queueParticipants.id,
        queueId: queueParticipants.queueId,
        userId: queueParticipants.userId,
        position: queueParticipants.position,
        selectedTopic: queueParticipants.selectedTopic,
        joinedAt: queueParticipants.joinedAt,
        user: users,
      })
      .from(queueParticipants)
      .innerJoin(users, eq(queueParticipants.userId, users.id))
      .where(eq(queueParticipants.queueId, queueId))
      .orderBy(asc(queueParticipants.position));

    return result;
  }

  async updateQueueParticipantTopic(userId: number, queueId: number, topic: string): Promise<void> {
    await db.update(queueParticipants)
      .set({ selectedTopic: topic })
      .where(and(eq(queueParticipants.userId, userId), eq(queueParticipants.queueId, queueId)));
  }

  // Topics
  async createTopic(topic: InsertTopic): Promise<Topic> {
    const [createdTopic] = await db.insert(topics).values(topic).returning();
    return createdTopic;
  }

  async getQueueTopics(queueId: number): Promise<Topic[]> {
    return await db.select().from(topics).where(eq(topics.queueId, queueId));
  }

  async deleteTopic(id: number): Promise<void> {
    await db.delete(topics).where(eq(topics.id, id));
  }

  async selectTopic(userId: number, topicId: number): Promise<TopicSelection> {
    const [selection] = await db.insert(topicSelections)
      .values({ userId, topicId })
      .returning();
    return selection;
  }

  async getTopicSelections(topicId: number): Promise<Array<TopicSelection & { user: User }>> {
    const result = await db
      .select({
        id: topicSelections.id,
        topicId: topicSelections.topicId,
        userId: topicSelections.userId,
        selectedAt: topicSelections.selectedAt,
        isConfirmed: topicSelections.isConfirmed,
        confirmedByUserId: topicSelections.confirmedByUserId,
        confirmedAt: topicSelections.confirmedAt,
        user: users,
      })
      .from(topicSelections)
      .innerJoin(users, eq(topicSelections.userId, users.id))
      .where(eq(topicSelections.topicId, topicId));

    return result;
  }

  // Reminders
  async createReminder(userId: number, deadlineId: number, reminderTime: Date, message: string): Promise<Reminder> {
    const [reminder] = await db.insert(reminders)
      .values({ userId, deadlineId, reminderTime, message })
      .returning();
    return reminder;
  }

  async getUserReminders(userId: number): Promise<Reminder[]> {
    return await db.select().from(reminders)
      .where(eq(reminders.userId, userId))
      .orderBy(asc(reminders.reminderTime));
  }

  async getPendingReminders(): Promise<Reminder[]> {
    const now = new Date();
    return await db.select().from(reminders)
      .where(and(
        lte(reminders.reminderTime, now),
        eq(reminders.isSent, false)
      ));
  }

  async markReminderAsSent(id: number): Promise<void> {
    await db.update(reminders)
      .set({ isSent: true })
      .where(eq(reminders.id, id));
  }
}

export const storage = new DatabaseStorage();

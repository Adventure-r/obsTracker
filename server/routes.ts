import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertUserSchema, insertGroupSchema, insertEventSchema, insertDeadlineSchema, insertQueueSchema, insertTopicSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Telegram auth endpoint
  app.post("/api/auth/telegram", async (req, res) => {
    try {
      const { telegram_id, username, first_name, last_name, middle_name } = req.body;
      
      if (!telegram_id || !first_name || !last_name) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      let user = await storage.getUserByTelegramId(telegram_id);
      
      if (!user) {
        const userData = insertUserSchema.parse({
          telegramId: telegram_id,
          telegramUsername: username,
          firstName: first_name,
          lastName: last_name,
          middleName: middle_name,
        });
        user = await storage.createUser(userData);
      } else {
        await storage.updateUserActivity(user.id);
      }

      const groups = await storage.getUserGroups(user.id);

      res.json({ user, groups });
    } catch (error) {
      console.error("Auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Groups
  app.post("/api/groups", async (req, res) => {
    try {
      const groupData = insertGroupSchema.parse(req.body);
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({ message: "User ID required" });
      }

      const group = await storage.createGroup(groupData);
      await storage.addUserToGroup(userId, group.id, true); // Add as leader

      res.json(group);
    } catch (error) {
      console.error("Create group error:", error);
      res.status(500).json({ message: "Failed to create group" });
    }
  });

  app.get("/api/groups/:id/members", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const members = await storage.getGroupMembers(groupId);
      res.json(members);
    } catch (error) {
      console.error("Get members error:", error);
      res.status(500).json({ message: "Failed to get group members" });
    }
  });

  app.post("/api/groups/:id/invitations", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const { userId } = req.body;
      
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const invitation = await storage.createGroupInvitation(groupId, userId, expiresAt);
      res.json(invitation);
    } catch (error) {
      console.error("Create invitation error:", error);
      res.status(500).json({ message: "Failed to create invitation" });
    }
  });

  app.post("/api/invitations/:token/use", async (req, res) => {
    try {
      const { token } = req.params;
      const { userId } = req.body;

      const invitation = await storage.getGroupInvitationByToken(token);
      
      if (!invitation) {
        return res.status(404).json({ message: "Invalid or expired invitation" });
      }

      await storage.addUserToGroup(userId, invitation.groupId);
      await storage.useGroupInvitation(token);

      const group = await storage.getGroupById(invitation.groupId);
      res.json({ group, message: "Successfully joined group" });
    } catch (error) {
      console.error("Use invitation error:", error);
      res.status(500).json({ message: "Failed to join group" });
    }
  });

  // Events
  app.get("/api/groups/:id/events", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const events = await storage.getGroupEvents(groupId);
      res.json(events);
    } catch (error) {
      console.error("Get events error:", error);
      res.status(500).json({ message: "Failed to get events" });
    }
  });

  app.post("/api/events", async (req, res) => {
    try {
      const eventData = insertEventSchema.parse(req.body);
      const event = await storage.createEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Create event error:", error);
      res.status(500).json({ message: "Failed to create event" });
    }
  });

  app.patch("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const updates = req.body;
      const event = await storage.updateEvent(eventId, updates);
      res.json(event);
    } catch (error) {
      console.error("Update event error:", error);
      res.status(500).json({ message: "Failed to update event" });
    }
  });

  app.delete("/api/events/:id", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      await storage.deleteEvent(eventId);
      res.json({ message: "Event deleted successfully" });
    } catch (error) {
      console.error("Delete event error:", error);
      res.status(500).json({ message: "Failed to delete event" });
    }
  });

  app.post("/api/events/:id/view", async (req, res) => {
    try {
      const eventId = parseInt(req.params.id);
      const { userId } = req.body;
      await storage.markEventAsViewed(userId, eventId);
      res.json({ message: "Event marked as viewed" });
    } catch (error) {
      console.error("Mark viewed error:", error);
      res.status(500).json({ message: "Failed to mark event as viewed" });
    }
  });

  app.get("/api/users/:id/viewed-events/:groupId", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const groupId = parseInt(req.params.groupId);
      const viewedEvents = await storage.getUserViewedEvents(userId, groupId);
      res.json(viewedEvents);
    } catch (error) {
      console.error("Get viewed events error:", error);
      res.status(500).json({ message: "Failed to get viewed events" });
    }
  });

  // Deadlines/Tasks
  app.get("/api/groups/:id/deadlines", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const deadlines = await storage.getGroupDeadlines(groupId);
      res.json(deadlines);
    } catch (error) {
      console.error("Get deadlines error:", error);
      res.status(500).json({ message: "Failed to get deadlines" });
    }
  });

  app.post("/api/deadlines", async (req, res) => {
    try {
      const deadlineData = insertDeadlineSchema.parse(req.body);
      const deadline = await storage.createDeadline(deadlineData);
      res.json(deadline);
    } catch (error) {
      console.error("Create deadline error:", error);
      res.status(500).json({ message: "Failed to create deadline" });
    }
  });

  app.patch("/api/deadlines/:id", async (req, res) => {
    try {
      const deadlineId = parseInt(req.params.id);
      const updates = req.body;
      const deadline = await storage.updateDeadline(deadlineId, updates);
      res.json(deadline);
    } catch (error) {
      console.error("Update deadline error:", error);
      res.status(500).json({ message: "Failed to update deadline" });
    }
  });

  app.delete("/api/deadlines/:id", async (req, res) => {
    try {
      const deadlineId = parseInt(req.params.id);
      await storage.deleteDeadline(deadlineId);
      res.json({ message: "Deadline deleted successfully" });
    } catch (error) {
      console.error("Delete deadline error:", error);
      res.status(500).json({ message: "Failed to delete deadline" });
    }
  });

  app.get("/api/users/:id/upcoming-deadlines", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const deadlines = await storage.getUserUpcomingDeadlines(userId);
      res.json(deadlines);
    } catch (error) {
      console.error("Get upcoming deadlines error:", error);
      res.status(500).json({ message: "Failed to get upcoming deadlines" });
    }
  });

  // Queues
  app.get("/api/groups/:id/queues", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const queues = await storage.getGroupQueues(groupId);
      res.json(queues);
    } catch (error) {
      console.error("Get queues error:", error);
      res.status(500).json({ message: "Failed to get queues" });
    }
  });

  app.get("/api/groups/:id/queues/date/:date", async (req, res) => {
    try {
      const groupId = parseInt(req.params.id);
      const date = new Date(req.params.date);
      const queues = await storage.getQueuesForDate(groupId, date);
      res.json(queues);
    } catch (error) {
      console.error("Get queues for date error:", error);
      res.status(500).json({ message: "Failed to get queues for date" });
    }
  });

  app.post("/api/queues", async (req, res) => {
    try {
      const queueData = insertQueueSchema.parse(req.body);
      const queue = await storage.createQueue(queueData);
      res.json(queue);
    } catch (error) {
      console.error("Create queue error:", error);
      res.status(500).json({ message: "Failed to create queue" });
    }
  });

  app.post("/api/queues/:id/join", async (req, res) => {
    try {
      const queueId = parseInt(req.params.id);
      const { userId } = req.body;
      const participant = await storage.joinQueue(userId, queueId);
      res.json(participant);
    } catch (error) {
      console.error("Join queue error:", error);
      res.status(500).json({ message: "Failed to join queue" });
    }
  });

  app.post("/api/queues/:id/leave", async (req, res) => {
    try {
      const queueId = parseInt(req.params.id);
      const { userId } = req.body;
      await storage.leaveQueue(userId, queueId);
      res.json({ message: "Left queue successfully" });
    } catch (error) {
      console.error("Leave queue error:", error);
      res.status(500).json({ message: "Failed to leave queue" });
    }
  });

  app.get("/api/queues/:id/participants", async (req, res) => {
    try {
      const queueId = parseInt(req.params.id);
      const participants = await storage.getQueueParticipants(queueId);
      res.json(participants);
    } catch (error) {
      console.error("Get queue participants error:", error);
      res.status(500).json({ message: "Failed to get queue participants" });
    }
  });

  // Topics
  app.get("/api/queues/:id/topics", async (req, res) => {
    try {
      const queueId = parseInt(req.params.id);
      const topics = await storage.getQueueTopics(queueId);
      res.json(topics);
    } catch (error) {
      console.error("Get topics error:", error);
      res.status(500).json({ message: "Failed to get topics" });
    }
  });

  app.post("/api/topics", async (req, res) => {
    try {
      const topicData = insertTopicSchema.parse(req.body);
      const topic = await storage.createTopic(topicData);
      res.json(topic);
    } catch (error) {
      console.error("Create topic error:", error);
      res.status(500).json({ message: "Failed to create topic" });
    }
  });

  app.post("/api/topics/:id/select", async (req, res) => {
    try {
      const topicId = parseInt(req.params.id);
      const { userId } = req.body;
      const selection = await storage.selectTopic(userId, topicId);
      res.json(selection);
    } catch (error) {
      console.error("Select topic error:", error);
      res.status(500).json({ message: "Failed to select topic" });
    }
  });

  // Reminders
  app.post("/api/reminders", async (req, res) => {
    try {
      const { userId, deadlineId, reminderTime, message } = req.body;
      const reminder = await storage.createReminder(userId, deadlineId, new Date(reminderTime), message);
      res.json(reminder);
    } catch (error) {
      console.error("Create reminder error:", error);
      res.status(500).json({ message: "Failed to create reminder" });
    }
  });

  app.get("/api/users/:id/reminders", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const reminders = await storage.getUserReminders(userId);
      res.json(reminders);
    } catch (error) {
      console.error("Get reminders error:", error);
      res.status(500).json({ message: "Failed to get reminders" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

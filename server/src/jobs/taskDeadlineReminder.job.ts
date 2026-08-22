import cron from 'node-cron';
import { and, eq, ne, isNull, isNotNull, inArray } from 'drizzle-orm';
import { db } from '../config/db.js';
import { tasks, taskAdditionalAssignees, users } from '../db/schema/index.js';
import { notificationService } from '../modules/notifications/notification.service.js';
import { sendMail } from '../config/mailer.js';

// Mirrors slaSweep.job.ts's shape: a recurring background sweep, since nothing else would ever
// check "is it time to remind someone about this deadline" — nobody has to be looking at the
// task for the reminder to fire.
export const startTaskDeadlineReminder = () => {
  cron.schedule('*/5 * * * *', async () => {
    try {
      const now = new Date();

      // Only tasks that asked for a reminder, haven't already gotten one, and aren't already
      // finished (a done task has nothing left to be reminded about).
      const candidates = await db.select().from(tasks).where(and(
        isNotNull(tasks.dueDate),
        isNotNull(tasks.reminderMinutesBefore),
        isNull(tasks.reminderSentAt),
        ne(tasks.status, 'done'),
      ));

      const due = candidates.filter((task) => {
        const fireAt = new Date(task.dueDate!.getTime() - task.reminderMinutesBefore! * 60_000);
        return fireAt <= now;
      });

      if (!due.length) return;

      // additionalAssigneeIds used to be an embedded array on the Task document; it's a junction
      // table now (TaskAdditionalAssignee) — batch-fetch every due task's additional assignees in
      // one query instead of one per task.
      const dueTaskIds = due.map((task) => task.id);
      const additionalAssigneeRows = await db.select({ taskId: taskAdditionalAssignees.taskId, userId: taskAdditionalAssignees.userId })
        .from(taskAdditionalAssignees)
        .where(inArray(taskAdditionalAssignees.taskId, dueTaskIds));
      const additionalAssigneeIdsByTask = new Map<string, string[]>();
      for (const row of additionalAssigneeRows) {
        const list = additionalAssigneeIdsByTask.get(row.taskId) ?? [];
        list.push(row.userId);
        additionalAssigneeIdsByTask.set(row.taskId, list);
      }

      for (const task of due) {
        const recipientIds: string[] = [];
        if (task.assigneeId) recipientIds.push(task.assigneeId);
        recipientIds.push(...(additionalAssigneeIdsByTask.get(task.id) ?? []));
        if (task.userId && task.userId !== task.assigneeId) {
            recipientIds.push(task.userId);
        }
        if (!recipientIds.length) continue;

        const uniqueRecipientIds = [...new Set(recipientIds)];
        const channel = task.reminderChannel ?? 'notification';
        const title = 'Task deadline approaching';
        const message = `"${task.title}" is due ${task.dueDate!.toLocaleString()}.`;

        if (channel === 'email') {
          const recipients = await db.select({ email: users.email, firstName: users.firstName })
            .from(users)
            .where(inArray(users.id, uniqueRecipientIds));
          await Promise.all(
            recipients.map((r) =>
              sendMail({ to: r.email, subject: title, html: `<p>Hi ${r.firstName},</p><p>${message}</p>` })
                .catch((err) => console.error(`Task deadline reminder: email to ${r.email} failed:`, err)),
            ),
          );
        } else if (channel === 'sms') {
          // No SMS gateway is configured in this app (no Twilio/MSG91 keys in env.ts) — fall back
          // to the in-app notification below rather than silently dropping the reminder.
          console.warn(`Task deadline reminder: SMS channel requested for task ${task.id} but no SMS provider is configured — falling back to in-app notification.`);
        }

        // 'notification' and 'alarm' both surface in-app/over-socket; 'alarm' gets a distinct type
        // so the client can eventually give it a louder treatment (sound/persistent modal). Email
        // and the sms-fallback case also get this so there's always a record in the notification
        // center even when the other channel succeeds or isn't configured.
        await notificationService.notifyMany(uniqueRecipientIds, {
          type: channel === 'alarm' ? 'TASK_DEADLINE_ALARM' : 'TASK_DEADLINE_REMINDER',
          title,
          message,
          taskId: task.id,
        });
      }

      await db.update(tasks)
        .set({ reminderSentAt: now, updatedAt: new Date() })
        .where(inArray(tasks.id, due.map((task) => task.id)));

      console.log(`Task deadline reminder: notified for ${due.length} task(s)`);
    } catch (err) {
      console.error('Task deadline reminder sweep failed:', err);
    }
  });
};

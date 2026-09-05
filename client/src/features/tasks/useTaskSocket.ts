import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../../context/AuthContext"
import { connectSocket, disconnectSocket, releaseSocket } from "../../lib/socket";

/**
 * Keeps the delegation board/list live.
 *
 * This used to listen for 'task:created' only, so the board updated when a colleague *added* a
 * delegation but not when one was moved between columns, edited, verified or deleted — the exact
 * changes a shared kanban board exists to show. The server now emits 'task:updated' and
 * 'task:deleted' too; all three invalidate the same ['tasks'] tree.
 *
 * Invalidate rather than patch the cache by hand: the payload is the raw task row, while the list
 * and detail queries carry assembled shapes (checklists, attachments, assignees), so writing the
 * row straight in would replace richer cached objects with thinner ones. React Query dedupes the
 * refetches, so a burst of events from someone dragging several cards doesn't become a burst of
 * requests.
 */
export const useTaskSocket = () => {
    const { token } = useAuth()
    const queryClient = useQueryClient();

    useEffect(() => {
        if (!token) return;

        const socket = connectSocket(token);
        const invalidateTasks = () => queryClient.invalidateQueries({ queryKey: ["tasks"] })
        const events = ["task:created", "task:updated", "task:deleted"] as const;

        events.forEach((event) => socket.on(event, invalidateTasks));

        return () => {
            events.forEach((event) => socket.off(event, invalidateTasks));
            releaseSocket()
            disconnectSocket()
        };

    }, [token, queryClient])

}

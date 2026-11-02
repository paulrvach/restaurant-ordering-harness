import { createChatHandler } from "@/server/chat-handler";
import { streamRestaurantReply } from "@/server/restaurant-agent";
import { prepareConversation } from "@/server/conversation-store";

export const runtime = "nodejs";
export const maxDuration = 60;
export const POST = createChatHandler({
  getApiKey: () => process.env.META_MODEL_API_KEY || process.env.MODEL_API_KEY,
  prepare: prepareConversation,
  run: streamRestaurantReply,
});

import { auth, defineMcp } from "@lovable.dev/mcp-js";
import getProfileTool from "./tools/get_profile";
import listFriendsTool from "./tools/list_friends";
import listQuestsTool from "./tools/list_quests";
import sendMessageTool from "./tools/send_message";
import recentMessagesTool from "./tools/recent_messages";

const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "friendchat-mcp",
  title: "FriendChat",
  version: "0.1.0",
  instructions:
    "Tools for FriendChat: read the signed-in user's profile, friends, and quests; read recent messages in a chat room; and post a message to a room on their behalf. Room codes are short alphanumeric strings (e.g. 'C6ZC9N').",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [getProfileTool, listFriendsTool, listQuestsTool, recentMessagesTool, sendMessageTool],
});

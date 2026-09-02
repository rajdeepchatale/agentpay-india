import type { Metadata } from "next";
import { ChatContainer } from "@/components/chat/ChatContainer";

export const metadata: Metadata = {
  title: "Sakhi Sarees — AgentPay India",
  description:
    "Shop sarees by chatting in Hindi, Marathi, Hinglish or English. Spending limits and consent are enforced in code, not by the model.",
};

export default function ChatPage() {
  return <ChatContainer />;
}

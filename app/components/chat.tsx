"use client";

import React, { useState, useEffect, useRef } from "react";
import styles from "./chat.module.css";
import { AssistantStream } from "openai/lib/AssistantStream"; // Streaming handler
import Markdown from "react-markdown"; // Markdown for assistant message formatting
import { AssistantStreamEvent } from "openai/resources/beta/assistants/assistants"; // Event listener helpers
import { RequiredActionFunctionToolCall } from "openai/resources/beta/threads/runs/runs"; // Tool call handling

type MessageProps = {
  role: "user" | "assistant" | "code";
  text: string;
};

// Component for user messages
const UserMessage = ({ text }: { text: string }) => {
  return <div className={styles.userMessage}>{text}</div>;
};

// Component for assistant messages (formatted with Markdown)
const AssistantMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.assistantMessage}>
      <Markdown>{text}</Markdown>
    </div>
  );
};

// Component for code messages (shows line numbers and code)
const CodeMessage = ({ text }: { text: string }) => {
  return (
    <div className={styles.codeMessage}>
      {text.split("\n").map((line, index) => (
        <div key={index}>
          <span>{`${index + 1}. `}</span>
          {line}
        </div>
      ))}
    </div>
  );
};

// Generic Message component that decides what type of message to show
const Message = ({ role, text }: { role: "user" | "assistant" | "code"; text: string }) => {
  switch (role) {
    case "user":
      return <UserMessage text={text} />;
    case "assistant":
      return <AssistantMessage text={text} />;
    case "code":
      return <CodeMessage text={text} />;
    default:
      return null;
  }
};

const Chat = ({ functionCallHandler = () => Promise.resolve("") }: { functionCallHandler?: (toolCall: RequiredActionFunctionToolCall) => Promise<string> }) => {
  const [userInput, setUserInput] = useState(""); // For storing user input
  const [messages, setMessages] = useState<any[]>([]); // For storing all messages
  const [inputDisabled, setInputDisabled] = useState(false); // Disables input while waiting for a response
  const [threadId, setThreadId] = useState(""); // Stores the thread ID for the conversation

  const messagesEndRef = useRef<HTMLDivElement | null>(null); // Auto-scroll to the bottom when a new message is added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom(); // Scroll to bottom on new message
  }, [messages]);

  // Create a new thread when the component is mounted
  useEffect(() => {
    const createThread = async () => {
      const res = await fetch(`/api/assistants/threads`, { method: "POST" });
      const data = await res.json();
      setThreadId(data.threadId); // Save the new thread ID
    };
    createThread();
  }, []);

  const sendMessage = async (text: string) => {
    const response = await fetch(`/api/assistants/threads/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ content: text }),
    });

    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream); // Handle the streamed response
  };

  const handleReadableStream = (stream: AssistantStream) => {
    stream.on("textCreated", handleTextCreated);
    stream.on("textDelta", handleTextDelta);
    stream.on("imageFileDone", handleImageFileDone);
    stream.on("toolCallCreated", toolCallCreated);
    stream.on("toolCallDelta", toolCallDelta);

    stream.on("event", (event) => {
      if (event.event === "thread.run.requires_action") handleRequiresAction(event);
      if (event.event === "thread.run.completed") handleRunCompleted();
    });
  };

  const handleTextCreated = () => {
    appendMessage("assistant", ""); // Add a new message from assistant
  };

  const handleTextDelta = (delta: { value: string }) => {
    if (delta.value != null) {
      appendToLastMessage(delta.value); // Append to last message being typed
    }
  };

  const handleImageFileDone = (image: { file_id: string }) => {
    appendToLastMessage(`\n![${image.file_id}](/api/files/${image.file_id})\n`); // Show image in chat
  };

  const toolCallCreated = (toolCall: any) => {
    if (toolCall.type !== "code_interpreter") return;
    appendMessage("code", ""); // Log code-related actions
  };

  const toolCallDelta = (delta: any) => {
    if (delta.type !== "code_interpreter" || !delta.code_interpreter.input) return;
    appendToLastMessage(delta.code_interpreter.input); // Append code output
  };

  const handleRequiresAction = async (event: AssistantStreamEvent.ThreadRunRequiresAction) => {
    const runId = event.data.id;
    const toolCalls = event.data.required_action.submit_tool_outputs.tool_calls;

    const toolCallOutputs = await Promise.all(
      toolCalls.map(async (toolCall) => {
        const result = await functionCallHandler(toolCall);
        return { output: result, tool_call_id: toolCall.id };
      })
    );

    setInputDisabled(true);
    submitActionResult(runId, toolCallOutputs);
  };

  const handleRunCompleted = () => {
    setInputDisabled(false); // Re-enable input after the action is complete
  };

  const submitActionResult = async (runId: string, toolCallOutputs: any) => {
    const response = await fetch(`/api/assistants/threads/${threadId}/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        runId: runId,
        toolCallOutputs: toolCallOutputs,
      }),
    });

    const stream = AssistantStream.fromReadableStream(response.body);
    handleReadableStream(stream);
  };

  const appendToLastMessage = (text: string) => {
    setMessages((prevMessages) => {
      const lastMessage = prevMessages[prevMessages.length - 1];
      const updatedLastMessage = { ...lastMessage, text: lastMessage.text + text };
      return [...prevMessages.slice(0, -1), updatedLastMessage];
    });
  };

  const appendMessage = (role: string, text: string) => {
    setMessages((prevMessages) => [...prevMessages, { role, text }]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    sendMessage(userInput);
    setMessages((prevMessages) => [
      ...prevMessages,
      { role: "user", text: userInput },
    ]);
    setUserInput("");
    setInputDisabled(true);
    scrollToBottom();
  };

  return (
    <div className={styles.chatContainer}>
      <div className={styles.messages}>
        {messages.map((msg, index) => (
          <Message key={index} role={msg.role} text={msg.text} />
        ))}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className={`${styles.inputForm} ${styles.clearfix}`}>
        <input
          type="text"
          className={styles.input}
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Enter your question"
        />
        <button type="submit" className={styles.button} disabled={inputDisabled}>
          Send
        </button>
      </form>
    </div>
  );
};

export default Chat;

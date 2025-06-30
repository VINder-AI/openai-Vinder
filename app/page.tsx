// FILE: app/page.tsx
export default function Home() {
  return (
    <main>
      <Chat />
    </main>
  );
}

// Make sure this import is at the top:
import Chat from "@/components/chat";
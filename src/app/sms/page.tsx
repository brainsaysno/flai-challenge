"use client";

import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { ScrollArea } from "~/components/ui/scroll-area";
import { Card } from "~/components/ui/card";
import { Avatar, AvatarFallback } from "~/components/ui/avatar";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  getSmsMessages,
  sendSmsMessage,
  searchContacts,
  type Contact,
  type SmsMessage,
} from "./actions";

export default function SmsPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<Contact[]>([]);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const fetchMessages = async () => {
    try {
      if (selectedContact) {
        const fetchedMessages = await getSmsMessages(selectedContact.id);
        setMessages(fetchedMessages);
      }
    } catch (error) {
      console.error("Failed to fetch messages:", error);
    }
  };

  const initializeContact = async () => {
    try {
      const contacts = await searchContacts("");
      if (contacts.length > 0 && contacts[0]) {
        setSelectedContact(contacts[0]);
      }
    } catch (error) {
      console.error("Failed to load initial contact:", error);
    }
  };

  useEffect(() => {
    initializeContact();
  }, []);

  useEffect(() => {
    if (!selectedContact) return;

    fetchMessages();

    const interval = setInterval(() => {
      fetchMessages();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const handleSend = async () => {
    if (!inputValue.trim() || isSending || !selectedContact) return;

    const messageText = inputValue.trim();
    const optimisticMessage: SmsMessage = {
      id: `temp-${Date.now()}`,
      contactId: selectedContact.id,
      direction: "inbound",
      body: messageText,
      createdAt: new Date(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      await sendSmsMessage(selectedContact.id, messageText);
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) => prev.filter((msg) => msg.id !== optimisticMessage.id));
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSearchChange = async (search: string) => {
    try {
      const results = await searchContacts(search);
      setSearchResults(results);
    } catch (error) {
      console.error("Failed to search contacts:", error);
    }
  };

  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setCommandOpen(false);
    setMessages([]);
  };

  useEffect(() => {
    if (commandOpen) {
      handleSearchChange("");
    }
  }, [commandOpen]);

  if (!selectedContact) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading contacts...</p>
      </div>
    );
  }

  const customerName = `${selectedContact.firstName} ${selectedContact.lastName}`;
  const customerInitials = `${selectedContact.firstName[0]}${selectedContact.lastName[0]}`;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="border-b px-6 py-4 bg-card">
        <button
          onClick={() => setCommandOpen(true)}
          className="flex items-center gap-3 hover:bg-muted/50 rounded-lg p-2 -m-2 transition-colors w-full text-left"
        >
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {customerInitials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p>Acting as: <span className="font-semibold">{customerName}</span></p>
            <p className="text-sm text-muted-foreground">
              {selectedContact.phone}
            </p>
          </div>
        </button>
      </div>

      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput
          placeholder="Search contacts..."
          onValueChange={handleSearchChange}
        />
        <CommandList>
          <CommandEmpty>No contacts found.</CommandEmpty>
          <CommandGroup heading="Contacts">
            {searchResults.map((contact) => (
              <CommandItem
                key={contact.id}
                onSelect={() => handleContactSelect(contact)}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      {contact.firstName[0]}
                      {contact.lastName[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {contact.firstName} {contact.lastName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {contact.phone}
                    </p>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <ScrollArea className="flex-1 px-6 py-4">
        <div className="space-y-4 max-w-3xl mx-auto">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start a conversation!
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.direction === "outbound" ? "justify-end" : "justify-start"}`}
            >
              <Card
                className={`max-w-[70%] px-4 py-2 ${message.direction === "outbound"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap break-words">
                  {message.body}
                </p>
                <p
                  className={`text-xs mt-1 ${message.direction === "outbound"
                    ? "text-primary-foreground/70"
                    : "text-muted-foreground"
                    }`}
                >
                  {isMounted
                    ? new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                    : ""}
                </p>
              </Card>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="border-t px-6 py-4 bg-card">
        <div className="flex gap-2 max-w-3xl mx-auto">
          <Input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
            disabled={isSending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!inputValue.trim() || isSending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

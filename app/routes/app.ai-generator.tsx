import { useState, useCallback, useRef, useEffect } from "react";
import { useNavigate } from "react-router";
import {
    Page,
    TextField,
    Button,
    BlockStack,
    InlineStack,
    Text,
    Card,
    Tabs,
    Badge,
    Spinner,
    Thumbnail,
    Icon,
} from "@shopify/polaris";
import { SendIcon, AttachmentIcon, DeleteIcon, ClockIcon, PlusIcon } from "@shopify/polaris-icons";

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
    attachments?: FileAttachment[];
}

interface FileAttachment {
    name: string;
    type: string;
    size: number;
    dataUrl: string;
}

interface GeneratedSection {
    sectionName: string;
    sectionType: string;
    htmlCode: string;
    cssCode?: string;
    jsCode?: string;
    liquidCode?: string;
    explanation?: string;
}

interface ChatConversation {
    id: string;
    title: string;
    lastMessageAt: string;
    createdAt: string;
}

export default function AIGenerator() {
    const navigate = useNavigate();
    const [active, setActive] = useState(true);
    const [messages, setMessages] = useState<ChatMessage[]>([
        {
            role: "assistant",
            content: "✨ Hi! I'm Temply AI, your intelligent Shopify section assistant. Describe the section you want to create, and I'll generate beautiful, production-ready code for you.\n\nFor example:\n• \"Create a testimonial section with 3 customer reviews\"\n• \"Build a countdown timer for sales\"\n• \"Design a trust badges section with payment icons\"\n• \"Make an animated product showcase carousel\"",
        },
    ]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [currentSection, setCurrentSection] = useState<GeneratedSection | null>(null);
    const [currentPrompt, setCurrentPrompt] = useState("");
    const [selectedTab, setSelectedTab] = useState(0);
    const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");
    const [attachedFiles, setAttachedFiles] = useState<FileAttachment[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Chat history state
    const [conversations, setConversations] = useState<ChatConversation[]>([]);
    const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
    const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load chat history on mount
    useEffect(() => {
        loadChatHistory();
    }, []);

    const loadChatHistory = useCallback(async () => {
        try {
            const response = await fetch("/app/api/ai-chat-history");
            const data = await response.json();
            if (data.success) {
                setConversations(data.conversations);
            }
        } catch (error) {
            console.error("Error loading chat history:", error);
        }
    }, []);

    const saveConversation = useCallback(async () => {
        try {
            const response = await fetch("/app/api/ai-chat-save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages,
                    conversationId: currentConversationId,
                }),
            });
            const data = await response.json();
            if (data.success) {
                setCurrentConversationId(data.conversation.id);
                await loadChatHistory();
            }
        } catch (error) {
            console.error("Error saving conversation:", error);
        }
    }, [messages, currentConversationId]);

    const loadConversation = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/app/api/ai-chat-load/${id}`);
            const data = await response.json();
            if (data.success) {
                setMessages(data.conversation.messages);
                setCurrentConversationId(id);
                setCurrentSection(null);
                setShowHistoryDropdown(false);
            }
        } catch (error) {
            console.error("Error loading conversation:", error);
        }
    }, []);

    const deleteConversation = useCallback(async (id: string) => {
        try {
            const response = await fetch(`/app/api/ai-chat-delete/${id}`, {
                method: "POST",
            });
            const data = await response.json();
            if (data.success) {
                await loadChatHistory();
                if (currentConversationId === id) {
                    handleNewChat();
                }
            }
        } catch (error) {
            console.error("Error deleting conversation:", error);
        }
    }, [currentConversationId]);

    const handleNewChat = useCallback(() => {
        setMessages([{
            role: "assistant",
            content: "✨ Hi! I'm Temply AI, your intelligent Shopify section assistant. Describe the section you want to create, and I'll generate beautiful, production-ready code for you.\n\nFor example:\n• \"Create a testimonial section with 3 customer reviews\"\n• \"Build a countdown timer for sales\"\n• \"Design a trust badges section with payment icons\"\n• \"Make an animated product showcase carousel\"",
        }]);
        setCurrentConversationId(null);
        setCurrentSection(null);
        setInputValue("");
        setAttachedFiles([]);
        setShowHistoryDropdown(false);
    }, []);

    const handleClose = useCallback(() => {
        setActive(false);
        setTimeout(() => navigate("/app"), 200);
    }, [navigate]);

    const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (!files || files.length === 0) return;

        const file = files[0];

        // Validate file type (images, PDFs, text files)
        const isImage = file.type.startsWith('image/');
        const isPDF = file.type === 'application/pdf';
        const isText = file.type === 'text/plain';

        if (!isImage && !isPDF && !isText) {
            alert('Please select an image, PDF, or text file');
            return;
        }

        // Validate file size (5MB for images, 10MB for PDFs/text)
        const maxSize = isImage ? 5 * 1024 * 1024 : 10 * 1024 * 1024;
        if (file.size > maxSize) {
            alert(`File size must be less than ${maxSize / 1024 / 1024}MB`);
            return;
        }

        // Read file as data URL
        const reader = new FileReader();
        reader.onload = (e) => {
            const dataUrl = e.target?.result as string;
            const attachment: FileAttachment = {
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl,
            };
            setAttachedFiles((prev) => [...prev, attachment]);
        };
        reader.readAsDataURL(file);

        // Reset input
        if (event.target) {
            event.target.value = '';
        }
    }, []);

    const handleRemoveFile = useCallback((index: number) => {
        setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSendMessage = useCallback(async () => {
        if ((!inputValue.trim() && attachedFiles.length === 0) || isLoading) return;

        const userMessage: ChatMessage = {
            role: "user",
            content: inputValue || "[Image attached]",
            attachments: attachedFiles.length > 0 ? [...attachedFiles] : undefined,
        };
        setMessages((prev) => [...prev, userMessage]);
        setCurrentPrompt(inputValue);
        setInputValue("");
        setAttachedFiles([]);
        setIsLoading(true);

        // Add a streaming message placeholder
        const streamingMessage: ChatMessage = {
            role: "assistant",
            content: "⏳ Generating section...",
        };
        setMessages((prev) => [...prev, streamingMessage]);

        try {
            // Use fetch to POST the message, then read the stream
            const response = await fetch("/app/api/ai-chat-stream", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, userMessage],
                }),
            });

            if (!response.ok) {
                const responseText = await response.text();
                let errorMessage = `API error: ${response.status} ${response.statusText}`;

                try {
                    const errorData = JSON.parse(responseText);
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch {
                    console.error("Non-JSON error response:", responseText.substring(0, 200));
                }

                throw new Error(errorMessage);
            }

            // Read the SSE stream
            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let buffer = '';
            let section: GeneratedSection | null = null;

            if (!reader) {
                throw new Error('No reader available');
            }

            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n\n');
                buffer = lines.pop() || '';

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));

                            if (data.type === 'chunk') {
                                // Update streaming message with chunks (optional - could show token count)
                                setMessages((prev) => {
                                    const newMessages = [...prev];
                                    newMessages[newMessages.length - 1] = {
                                        role: "assistant",
                                        content: "⏳ Generating section... (streaming)"
                                    };
                                    return newMessages;
                                });
                            } else if (data.type === 'complete') {
                                // Final section received
                                section = data.section;
                            } else if (data.type === 'error') {
                                throw new Error(data.error);
                            }
                        } catch (parseError) {
                            console.error('Error parsing SSE data:', parseError);
                        }
                    }
                }
            }

            if (!section) {
                throw new Error('No section received from stream');
            }

            setCurrentSection(section);

            const assistantMessage: ChatMessage = {
                role: "assistant",
                content: section.explanation || "✓ Section generated! Check the preview on the right.",
            };
            setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = assistantMessage;
                return newMessages;
            });
            setSelectedTab(0);

            // Auto-save conversation after successful generation
            setTimeout(() => saveConversation(), 500);
        } catch (error) {
            console.error("Error generating section:", error);
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: `❌ Sorry, I encountered an error: ${error instanceof Error ? error.message : "Unknown error"}. Please try again.`,
            };
            setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = errorMessage;
                return newMessages;
            });
        } finally {
            setIsLoading(false);
        }
    }, [inputValue, isLoading, messages, attachedFiles, saveConversation]);

    const handleApply = useCallback(async () => {
        if (!currentSection) return;

        setIsApplying(true);

        try {
            const saveResponse = await fetch("/app/api/ai-sections/save", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sectionData: {
                        ...currentSection,
                        prompt: currentPrompt,
                    },
                }),
            });

            const saveData = await saveResponse.json();

            if (saveData.error) {
                throw new Error(saveData.error);
            }

            const applyResponse = await fetch("/app/api/ai-sections/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    aiSectionId: saveData.id,
                }),
            });

            const applyData = await applyResponse.json();

            if (applyData.error) {
                throw new Error(applyData.error);
            }

            const successMessage: ChatMessage = {
                role: "assistant",
                content: "✅ Section applied successfully! Redirecting to Theme Sections...",
            };
            setMessages((prev) => [...prev, successMessage]);

            setTimeout(() => {
                navigate("/app/theme-sections");
            }, 1500);
        } catch (error) {
            console.error("Error applying section:", error);
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: `❌ Failed to apply section: ${error instanceof Error ? error.message : "Unknown error"}`,
            };
            setMessages((prev) => [...prev, errorMessage]);
        } finally {
            setIsApplying(false);
        }
    }, [currentSection, currentPrompt, navigate]);

    // Parse Liquid code and replace variables with mock data
    const parseLiquidCode = useCallback((liquidCode: string): string => {
        try {
            // Extract schema from liquidCode
            const schemaMatch = liquidCode.match(/{% schema %}([\s\S]*?){% endschema %}/);
            if (!schemaMatch) {
                return liquidCode;
            }

            const schema = JSON.parse(schemaMatch[1]);
            const mockData: Record<string, any> = {
                section: {
                    id: "preview-123",
                    settings: {},
                },
            };

            // Build mock settings from schema defaults
            if (schema.settings && Array.isArray(schema.settings)) {
                schema.settings.forEach((setting: any) => {
                    if (setting.id) {
                        mockData.section.settings[setting.id] = setting.default || getDefaultValueForType(setting.type);
                    }
                });
            }

            // Replace Liquid variables
            let processedCode = liquidCode;

            // Replace {{ section.settings.* }} variables
            processedCode = processedCode.replace(
                /\{\{\s*section\.settings\.(\w+)\s*\}\}/g,
                (match, settingId) => {
                    return mockData.section.settings[settingId] || match;
                }
            );

            // Replace {{ section.id }}
            processedCode = processedCode.replace(/\{\{\s*section\.id\s*\}\}/g, mockData.section.id);

            return processedCode;
        } catch (error) {
            console.error("Error parsing Liquid code:", error);
            return liquidCode;
        }
    }, []);

    // Get default value for setting type
    const getDefaultValueForType = (type: string): any => {
        switch (type) {
            case "text":
            case "textarea":
            case "richtext":
                return "Sample Text";
            case "number":
            case "range":
                return 50;
            case "color":
                return "#000000";
            case "color_background":
                return "linear-gradient(135deg, #667eea 0%, #764ba2 100%)";
            case "image_picker":
                return "https://via.placeholder.com/400x300";
            case "url":
                return "#";
            case "checkbox":
                return true;
            default:
                return "";
        }
    };

    const renderPreview = () => {
        if (!currentSection) {
            return (
                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    height: "400px",
                    color: "#6D7175",
                }}>
                    <BlockStack gap="200" align="center">
                        <Text as="p" variant="bodyMd" tone="subdued">
                            No section generated yet
                        </Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                            Send a message to generate a section
                        </Text>
                    </BlockStack>
                </div>
            );
        }

        // Use liquidCode if available, otherwise fall back to htmlCode
        let htmlContent = currentSection.htmlCode;
        if (currentSection.liquidCode) {
            const processedLiquid = parseLiquidCode(currentSection.liquidCode);
            // Extract HTML from processed Liquid (remove schema and script tags for preview)
            htmlContent = processedLiquid
                .replace(/{% schema %}[\s\S]*?{% endschema %}/g, "")
                .replace(/<script[\s\S]*?<\/script>/g, "");
        }

        const combinedCode = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            }
            ${currentSection.cssCode || ""}
          </style>
        </head>
        <body>
          ${htmlContent}
          ${currentSection.jsCode ? `<script>${currentSection.jsCode}</script>` : ""}
        </body>
      </html>
    `;

        return (
            <div style={{ padding: "16px", background: "#F6F6F7", minHeight: "400px" }}>
                <BlockStack gap="300">
                    <InlineStack gap="200">
                        <Button
                            size="slim"
                            pressed={viewMode === "desktop"}
                            onClick={() => setViewMode("desktop")}
                        >
                            Desktop
                        </Button>
                        <Button
                            size="slim"
                            pressed={viewMode === "mobile"}
                            onClick={() => setViewMode("mobile")}
                        >
                            Mobile
                        </Button>
                    </InlineStack>

                    <div style={{
                        maxWidth: viewMode === "mobile" ? "375px" : "100%",
                        margin: "0 auto",
                        transition: "max-width 0.3s",
                    }}>
                        <iframe
                            srcDoc={combinedCode}
                            style={{
                                width: "100%",
                                height: "500px",
                                border: "1px solid #E1E3E5",
                                borderRadius: "8px",
                                background: "white",
                            }}
                            title="Section Preview"
                            sandbox="allow-scripts"
                        />
                    </div>
                </BlockStack>
            </div>
        );
    };

    const renderCode = () => {
        if (!currentSection) {
            return (
                <div style={{
                    padding: "16px",
                    color: "#6D7175",
                    textAlign: "center",
                }}>
                    No code generated yet
                </div>
            );
        }

        return (
            <div style={{ padding: "16px" }}>
                <BlockStack gap="400">
                    {currentSection.htmlCode && (
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingSm" fontWeight="semibold">
                                    HTML
                                </Text>
                                <div style={{
                                    background: "#1F2937",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    overflow: "auto",
                                    maxHeight: "300px",
                                }}>
                                    <code style={{
                                        color: "#E5E7EB",
                                        fontSize: "13px",
                                        fontFamily: "Monaco, monospace",
                                        whiteSpace: "pre-wrap",
                                    }}>
                                        {currentSection.htmlCode}
                                    </code>
                                </div>
                            </BlockStack>
                        </Card>
                    )}

                    {currentSection.cssCode && (
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingSm" fontWeight="semibold">
                                    CSS
                                </Text>
                                <div style={{
                                    background: "#1F2937",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    overflow: "auto",
                                    maxHeight: "300px",
                                }}>
                                    <code style={{
                                        color: "#E5E7EB",
                                        fontSize: "13px",
                                        fontFamily: "Monaco, monospace",
                                        whiteSpace: "pre-wrap",
                                    }}>
                                        {currentSection.cssCode}
                                    </code>
                                </div>
                            </BlockStack>
                        </Card>
                    )}

                    {currentSection.jsCode && (
                        <Card>
                            <BlockStack gap="200">
                                <Text as="h3" variant="headingSm" fontWeight="semibold">
                                    JavaScript
                                </Text>
                                <div style={{
                                    background: "#1F2937",
                                    padding: "16px",
                                    borderRadius: "8px",
                                    overflow: "auto",
                                    maxHeight: "300px",
                                }}>
                                    <code style={{
                                        color: "#E5E7EB",
                                        fontSize: "13px",
                                        fontFamily: "Monaco, monospace",
                                        whiteSpace: "pre-wrap",
                                    }}>
                                        {currentSection.jsCode}
                                    </code>
                                </div>
                            </BlockStack>
                        </Card>
                    )}
                </BlockStack>
            </div>
        );
    };

    const tabs = [
        {
            id: "preview",
            content: "Preview",
            panelID: "preview-panel",
        },
        {
            id: "code",
            content: "Code",
            panelID: "code-panel",
        },
    ];

    if (!active) return null;

    return (
        <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 10000,
            background: "white",
            display: "flex",
            flexDirection: "column",
        }}>
            {/* Header Bar */}
            <div style={{
                height: "56px",
                background: "#F6F6F7",
                borderBottom: "1px solid #E1E3E5",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "0 16px",
                position: "relative",
            }}>
                <InlineStack gap="300" blockAlign="center">
                    <Text as="h1" variant="headingMd" fontWeight="semibold">
                        ✨ Temply AI
                    </Text>

                    {/* History Dropdown */}
                    <div style={{ position: "relative" }}>
                        <Button
                            icon={ClockIcon}
                            onClick={() => setShowHistoryDropdown(!showHistoryDropdown)}
                        >
                            History ({String(conversations.length)})
                        </Button>

                        {showHistoryDropdown && (
                            <div style={{
                                position: "absolute",
                                top: "calc(100% + 8px)",
                                left: 0,
                                width: "350px",
                                maxHeight: "400px",
                                overflowY: "auto",
                                background: "white",
                                border: "1px solid #E1E3E5",
                                borderRadius: "8px",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                                zIndex: 1000,
                            }}>
                                {conversations.length === 0 ? (
                                    <div style={{ padding: "16px", textAlign: "center" }}>
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            No chat history yet
                                        </Text>
                                    </div>
                                ) : (
                                    conversations.map((conv) => (
                                        <div
                                            key={conv.id}
                                            style={{
                                                padding: "12px 16px",
                                                borderBottom: "1px solid #F6F6F7",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "8px",
                                                cursor: "pointer",
                                                background: currentConversationId === conv.id ? "#F6F6F7" : "white",
                                            }}
                                            onMouseEnter={(e) => {
                                                if (currentConversationId !== conv.id) {
                                                    e.currentTarget.style.background = "#FAFAFA";
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (currentConversationId !== conv.id) {
                                                    e.currentTarget.style.background = "white";
                                                }
                                            }}
                                        >
                                            <div
                                                style={{ flex: 1, minWidth: 0 }}
                                                onClick={() => loadConversation(conv.id)}
                                            >
                                                <Text as="p" variant="bodyMd" fontWeight="semibold" truncate>
                                                    {conv.title}
                                                </Text>
                                                <Text as="p" variant="bodySm" tone="subdued">
                                                    {new Date(conv.lastMessageAt).toLocaleDateString()}
                                                </Text>
                                            </div>
                                            <div onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    size="slim"
                                                    icon={DeleteIcon}
                                                    onClick={() => {
                                                        if (confirm("Delete this conversation?")) {
                                                            deleteConversation(conv.id);
                                                        }
                                                    }}
                                                    accessibilityLabel="Delete conversation"
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>

                    {/* New Chat Button */}
                    <Button
                        icon={PlusIcon}
                        onClick={handleNewChat}
                    >
                        New Chat
                    </Button>
                </InlineStack>

                <InlineStack gap="200">
                    <Button onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleApply}
                        loading={isApplying}
                        disabled={!currentSection}
                    >
                        Apply Section
                    </Button>
                </InlineStack>
            </div>

            {/* Main Content */}
            <div style={{
                flex: 1,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                overflow: "hidden",
            }}>
                {/* Chat Panel */}
                <div style={{
                    borderRight: "1px solid #E1E3E5",
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                }}>
                    {/* Messages */}
                    <div style={{
                        flex: 1,
                        overflowY: "auto",
                        padding: "20px",
                        background: "#F6F6F7",
                    }}>
                        <BlockStack gap="400">
                            {messages.map((message, index) => (
                                <div
                                    key={index}
                                    style={{
                                        maxWidth: message.role === "user" ? "85%" : "100%",
                                        marginLeft: message.role === "user" ? "auto" : "0",
                                    }}
                                >
                                    <Card>
                                        <BlockStack gap="200">
                                            <InlineStack gap="200" blockAlign="center">
                                                {message.role === "assistant" && (
                                                    <Badge tone="success">Temply AI</Badge>
                                                )}
                                                {message.role === "user" && (
                                                    <Badge>You</Badge>
                                                )}
                                            </InlineStack>
                                            <div style={{ whiteSpace: "pre-wrap" }}>
                                                <Text as="p" variant="bodyMd">
                                                    {message.content}
                                                </Text>
                                            </div>
                                            {message.attachments && message.attachments.length > 0 && (
                                                <div style={{ marginTop: "8px" }}>
                                                    <BlockStack gap="200">
                                                        {message.attachments.map((file, fileIndex) => {
                                                            const isImage = file.type.startsWith('image/');
                                                            const isPDF = file.type === 'application/pdf';

                                                            if (isImage) {
                                                                return (
                                                                    <div key={fileIndex} style={{
                                                                        maxWidth: "200px",
                                                                        border: "1px solid #E1E3E5",
                                                                        borderRadius: "8px",
                                                                        overflow: "hidden",
                                                                    }}>
                                                                        <img
                                                                            src={file.dataUrl}
                                                                            alt={file.name}
                                                                            style={{
                                                                                width: "100%",
                                                                                height: "auto",
                                                                                display: "block",
                                                                            }}
                                                                        />
                                                                    </div>
                                                                );
                                                            } else {
                                                                return (
                                                                    <div key={fileIndex} style={{
                                                                        padding: "8px 12px",
                                                                        border: "1px solid #E1E3E5",
                                                                        borderRadius: "8px",
                                                                        background: "#F6F6F7",
                                                                        display: "flex",
                                                                        alignItems: "center",
                                                                        gap: "8px",
                                                                    }}>
                                                                        <span style={{ fontSize: "24px" }}>
                                                                            {isPDF ? '📄' : '📝'}
                                                                        </span>
                                                                        <Text as="span" variant="bodySm">
                                                                            {file.name}
                                                                        </Text>
                                                                    </div>
                                                                );
                                                            }
                                                        })}
                                                    </BlockStack>
                                                </div>
                                            )}
                                        </BlockStack>
                                    </Card>
                                </div>
                            ))}
                            {isLoading && (
                                <Card>
                                    <InlineStack gap="200" blockAlign="center">
                                        <Spinner size="small" />
                                        <Text as="p" variant="bodyMd" tone="subdued">
                                            Temply AI is generating your section...
                                        </Text>
                                    </InlineStack>
                                </Card>
                            )}
                            <div ref={messagesEndRef} />
                        </BlockStack>
                    </div>

                    {/* Input */}
                    <div style={{
                        padding: "16px",
                        background: "white",
                        borderTop: "1px solid #E1E3E5",
                    }}>
                        <BlockStack gap="200">
                            {/* File Attachments Preview */}
                            {attachedFiles.length > 0 && (
                                <div style={{
                                    padding: "8px",
                                    background: "#F6F6F7",
                                    borderRadius: "8px",
                                }}>
                                    <BlockStack gap="200">
                                        <Text as="p" variant="bodySm" fontWeight="semibold">
                                            Attached files:
                                        </Text>
                                        {attachedFiles.map((file, index) => {
                                            const isImage = file.type.startsWith('image/');
                                            const isPDF = file.type === 'application/pdf';

                                            return (
                                                <div key={index} style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "8px",
                                                    padding: "8px",
                                                    background: "white",
                                                    borderRadius: "4px",
                                                }}>
                                                    {isImage ? (
                                                        <img
                                                            src={file.dataUrl}
                                                            alt={file.name}
                                                            style={{
                                                                width: "40px",
                                                                height: "40px",
                                                                objectFit: "cover",
                                                                borderRadius: "4px",
                                                            }}
                                                        />
                                                    ) : (
                                                        <span style={{ fontSize: "32px" }}>
                                                            {isPDF ? '📄' : '📝'}
                                                        </span>
                                                    )}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <Text as="p" variant="bodySm" truncate>
                                                            {file.name}
                                                        </Text>
                                                        <Text as="p" variant="bodySm" tone="subdued">
                                                            {(file.size / 1024).toFixed(1)} KB
                                                        </Text>
                                                    </div>
                                                    <Button
                                                        size="slim"
                                                        icon={DeleteIcon}
                                                        onClick={() => handleRemoveFile(index)}
                                                        accessibilityLabel="Remove file"
                                                    />
                                                </div>
                                            );
                                        })}
                                    </BlockStack>
                                </div>
                            )}

                            <div style={{ display: "flex", gap: "8px" }}>
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*,.pdf,.txt"
                                    onChange={handleFileSelect}
                                    style={{ display: "none" }}
                                />
                                <Button
                                    size="large"
                                    icon={AttachmentIcon}
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isLoading}
                                    accessibilityLabel="Attach file"
                                />
                                <div style={{ flex: 1 }}>
                                    <TextField
                                        label=""
                                        labelHidden
                                        value={inputValue}
                                        onChange={setInputValue}
                                        placeholder="Describe the section you want to create..."
                                        multiline={3}
                                        autoComplete="off"
                                        disabled={isLoading}
                                    />
                                </div>
                                <Button
                                    variant="primary"
                                    size="large"
                                    onClick={handleSendMessage}
                                    loading={isLoading}
                                    disabled={!inputValue.trim() && attachedFiles.length === 0}
                                    icon={SendIcon}
                                >
                                    Send
                                </Button>
                            </div>
                            <Text as="p" variant="bodySm" tone="subdued">
                                💡 Attach images for visual reference to help Temply AI understand your needs.
                            </Text>
                        </BlockStack>
                    </div>
                </div>

                {/* Preview Panel */}
                <div style={{
                    display: "flex",
                    flexDirection: "column",
                    height: "100%",
                    background: "white",
                }}>
                    <Tabs tabs={tabs} selected={selectedTab} onSelect={setSelectedTab}>
                        <div style={{ height: "calc(100vh - 106px)", overflowY: "auto" }}>
                            {selectedTab === 0 ? renderPreview() : renderCode()}
                        </div>
                    </Tabs>
                </div>
            </div>
        </div>
    );
}

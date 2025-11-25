"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

interface Project {
  id: string;
  name: string;
  status: string;
  ports?: {
    frontend: number;
    backend: number;
  };
  urls?: {
    frontend: string;
    backend: string;
  };
  outputPath: string;
  generatedFiles?: string[];
}

interface FileNode {
  name: string;
  path: string;
  type: "file" | "folder";
  children?: FileNode[];
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export default function IDEPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileTree, setFileTree] = useState<FileNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [activeTab, setActiveTab] = useState<"preview" | "files" | "terminal">("preview");
  const [leftPanelWidth, setLeftPanelWidth] = useState(40); // percentage
  const [isResizing, setIsResizing] = useState(false);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/projects/${projectId}`);
      const data = await response.json();

      if (data.success) {
        setProject(data.data);
        buildFileTree(data.data.generatedFiles || []);
      }
    } catch (err) {
      console.error("Failed to load project:", err);
    } finally {
      setLoading(false);
    }
  };

  const buildFileTree = (files: string[]) => {
    const root: FileNode[] = [];

    files.forEach(filePath => {
      const parts = filePath.split(/[\/\\]/);
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        let existingNode = currentLevel.find(node => node.name === part);

        if (!existingNode) {
          const newNode: FileNode = {
            name: part,
            path: parts.slice(0, index + 1).join('/'),
            type: isFile ? 'file' : 'folder',
            children: isFile ? undefined : []
          };
          currentLevel.push(newNode);
          existingNode = newNode;
        }

        if (!isFile && existingNode.children) {
          currentLevel = existingNode.children;
        }
      });
    });

    setFileTree(root);
  };

  const handleFileSelect = async (filePath: string) => {
    setSelectedFile(filePath);

    try {
      const response = await fetch(`${API_URL}/api/files/${projectId}/read?path=${encodeURIComponent(filePath)}`);
      const data = await response.json();

      if (data.success) {
        setFileContent(data.content);
        setActiveTab("files");
      }
    } catch (err) {
      console.error("Failed to read file:", err);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");

    // TODO: Send to AI endpoint with project context
    // For now, just echo back
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "AI response will be implemented here. I'll have access to your project files and can help you modify code.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, aiMessage]);
    }, 500);
  };

  const handleMouseDown = () => {
    setIsResizing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isResizing) {
      const newWidth = (e.clientX / window.innerWidth) * 100;
      if (newWidth > 20 && newWidth < 80) {
        setLeftPanelWidth(newWidth);
      }
    }
  };

  const handleMouseUp = () => {
    setIsResizing(false);
  };

  useEffect(() => {
    if (isResizing) {
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
  }, [isResizing]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-white">Loading IDE...</div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <p className="text-red-400 mb-4">Project not found</p>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="h-screen flex flex-col bg-slate-900 text-white"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* Header */}
      <div className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projects/${projectId}`)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-lg font-semibold">{project.name}</h1>
          <span className={`px-2 py-1 rounded text-xs ${
            project.status === 'deployed' ? 'bg-green-900/50 text-green-300' : 'bg-blue-900/50 text-blue-300'
          }`}>
            {project.status}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {project.ports && (
            <span className="text-sm text-slate-400">
              :{project.ports.frontend} / :{project.ports.backend}
            </span>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Chat */}
        <div style={{ width: `${leftPanelWidth}%` }} className="flex flex-col border-r border-slate-700">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-slate-500 mt-8">
                <p className="mb-2">Start a conversation</p>
                <p className="text-sm">Ask me to help you build, fix, or explain code</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-slate-200'
                  }`}>
                    {msg.content}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Chat Input */}
          <div className="border-t border-slate-700 p-4">
            {selectedFile && (
              <div className="mb-2 text-xs text-slate-400 bg-slate-800 px-2 py-1 rounded flex items-center justify-between">
                <span>Context: {selectedFile}</span>
                <button onClick={() => setSelectedFile(null)} className="hover:text-white">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask me anything about your project..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-700 disabled:text-slate-500 rounded-lg transition-colors"
              >
                Send
              </button>
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          onMouseDown={handleMouseDown}
          className="w-1 bg-slate-700 hover:bg-indigo-600 cursor-col-resize transition-colors"
        />

        {/* Right Panel - Preview/Code/Terminal */}
        <div style={{ width: `${100 - leftPanelWidth}%` }} className="flex flex-col">
          {/* Tabs */}
          <div className="h-12 bg-slate-800 border-b border-slate-700 flex items-center px-4 gap-4">
            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === "preview" ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setActiveTab("files")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === "files" ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Files
            </button>
            <button
              onClick={() => setActiveTab("terminal")}
              className={`px-3 py-1.5 rounded transition-colors ${
                activeTab === "terminal" ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Terminal
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === "preview" && (
              <div className="h-full bg-white">
                {project.urls?.frontend ? (
                  <iframe
                    src={project.urls.frontend}
                    className="w-full h-full border-none"
                    title="App Preview"
                  />
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400">
                    <div className="text-center">
                      <p>App not deployed</p>
                      <button
                        onClick={() => router.push(`/projects/${projectId}`)}
                        className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg"
                      >
                        Deploy App
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "files" && (
              <div className="h-full flex">
                {/* File Tree */}
                <div className="w-64 bg-slate-800 border-r border-slate-700 overflow-y-auto p-2">
                  <FileTreeView nodes={fileTree} onSelect={handleFileSelect} selectedFile={selectedFile} />
                </div>

                {/* Code Editor */}
                <div className="flex-1 overflow-auto">
                  {selectedFile ? (
                    <pre className="p-4 text-sm font-mono text-slate-300 whitespace-pre-wrap">
                      {fileContent || "Loading..."}
                    </pre>
                  ) : (
                    <div className="h-full flex items-center justify-center text-slate-500">
                      Select a file to view
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "terminal" && (
              <div className="h-full bg-black p-4 overflow-y-auto font-mono text-sm text-green-400">
                <div>Terminal output will appear here...</div>
                <div className="text-slate-500 mt-2">Logs from server processes will be streamed in real-time</div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileTreeView({
  nodes,
  onSelect,
  selectedFile,
  level = 0
}: {
  nodes: FileNode[];
  onSelect: (path: string) => void;
  selectedFile: string | null;
  level?: number;
}) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpanded(newExpanded);
  };

  return (
    <div>
      {nodes.map(node => (
        <div key={node.path}>
          <div
            className={`flex items-center gap-2 px-2 py-1 rounded cursor-pointer hover:bg-slate-700 ${
              selectedFile === node.path ? 'bg-slate-700' : ''
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
            onClick={() => {
              if (node.type === 'folder') {
                toggleExpand(node.path);
              } else {
                onSelect(node.path);
              }
            }}
          >
            {node.type === 'folder' && (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={expanded.has(node.path) ? "M19 9l-7 7-7-7" : "M9 5l7 7-7 7"}
                />
              </svg>
            )}
            <span className="text-sm text-slate-300">{node.name}</span>
          </div>
          {node.type === 'folder' && expanded.has(node.path) && node.children && (
            <FileTreeView
              nodes={node.children}
              onSelect={onSelect}
              selectedFile={selectedFile}
              level={level + 1}
            />
          )}
        </div>
      ))}
    </div>
  );
}

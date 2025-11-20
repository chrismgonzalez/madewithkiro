interface ShowcaseItem {
  id: number;
  userName: string;
  userAvatar: string;
  appName: string;
  description: string;
  tags: string[];
  link: string;
}

const showcaseData: ShowcaseItem[] = [
  {
    id: 1,
    userName: "Sarah Chen",
    userAvatar: "👩‍💻",
    appName: "TaskFlow Pro",
    description:
      "A productivity app that helps teams manage projects with AI-powered insights.",
    tags: ["React", "Node.js", "AI"],
    link: "#",
  },
  {
    id: 2,
    userName: "Marcus Johnson",
    userAvatar: "👨‍💼",
    appName: "DataViz Studio",
    description:
      "Interactive data visualization platform for business analytics.",
    tags: ["D3.js", "Python", "FastAPI"],
    link: "#",
  },
  {
    id: 3,
    userName: "Elena Rodriguez",
    userAvatar: "👩‍🎨",
    appName: "DesignSync",
    description:
      "Collaborative design tool with real-time feedback and version control.",
    tags: ["Vue.js", "WebSocket", "Canvas"],
    link: "#",
  },
];

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-slate-900">Kiro Showcase</h1>
          <p className="mt-2 text-slate-600">
            Discover amazing apps built by developers using Kiro
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {showcaseData.map((item) => (
            <ShowcaseCard key={item.id} {...item} />
          ))}
        </div>
      </main>
    </div>
  );
}

interface ShowcaseCardProps {
  userName: string;
  userAvatar: string;
  appName: string;
  description: string;
  tags: string[];
  link: string;
}

function ShowcaseCard({
  userName,
  userAvatar,
  appName,
  description,
  tags,
  link,
}: ShowcaseCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 overflow-hidden">
      <div className="p-6">
        {/* User Info */}
        <div className="flex items-center mb-4">
          <div className="text-4xl mr-3">{userAvatar}</div>
          <div>
            <h3 className="font-semibold text-slate-900">{userName}</h3>
            <p className="text-sm text-slate-500">Builder</p>
          </div>
        </div>

        {/* App Info */}
        <h2 className="text-xl font-bold text-slate-900 mb-2">{appName}</h2>
        <p className="text-slate-600 mb-4 line-clamp-3">{description}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, index) => (
            <span
              key={index}
              className="px-3 py-1 bg-slate-100 text-slate-700 text-sm rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Link */}
        <a
          href={link}
          className="inline-block w-full text-center px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          View Project
        </a>
      </div>
    </div>
  );
}

export default App;

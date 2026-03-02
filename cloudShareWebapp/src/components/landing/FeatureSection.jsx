import {
  Upload,
  ShieldCheck,
  Share2,
  CreditCard,
  FolderKanban,
  Receipt,
} from "lucide-react";

const features = [
  {
    icon: Upload,
    title: "Easy File Upload",
    description:
      "Quickly upload your files with our intuitive drag-and-drop interface.",
    gradient: "from-purple-500 to-indigo-500",
    bg: "bg-purple-50",
  },
  {
    icon: ShieldCheck,
    title: "Secure Storage",
    description:
      "Your files are encrypted and stored securely in our cloud infrastructure.",
    gradient: "from-emerald-500 to-teal-500",
    bg: "bg-emerald-50",
  },
  {
    icon: Share2,
    title: "Smart Sharing",
    description:
      "Share files with anyone using secure links that you control.",
    gradient: "from-blue-500 to-cyan-500",
    bg: "bg-blue-50",
  },
  {
    icon: CreditCard,
    title: "Flexible Plans",
    description:
      "Pay only for what you use with our subscription-based system.",
    gradient: "from-amber-500 to-orange-500",
    bg: "bg-amber-50",
  },
  {
    icon: FolderKanban,
    title: "File Management",
    description:
      "Organize, preview, and manage your files from any device.",
    gradient: "from-pink-500 to-rose-500",
    bg: "bg-pink-50",
  },
  {
    icon: Receipt,
    title: "Transaction History",
    description:
      "Keep track of all your payments and usage in real time.",
    gradient: "from-violet-500 to-purple-500",
    bg: "bg-violet-50",
  },
];

const FeatureSection = () => {
  return (
    <div className="py-24 bg-white relative overflow-hidden">
      {/* Subtle bg decoration */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-purple-50/50 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-purple-600 tracking-wide uppercase mb-3">
            Features
          </p>
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Everything you need for
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              {" "}file sharing
            </span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
            CloudShare provides all the tools you need to manage your digital content.
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div
                key={index}
                className={`animate-fade-in-up stagger-${index + 1} group relative p-8 rounded-2xl border border-gray-100 bg-white hover:shadow-xl hover:shadow-purple-100/30 hover:-translate-y-1 transition-all duration-300 cursor-default`}
              >
                {/* Icon */}
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon size={22} className="text-white" />
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default FeatureSection;

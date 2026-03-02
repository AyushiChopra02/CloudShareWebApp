import { Star, Quote } from "lucide-react";
import { testimonials } from "../../assets/data";

const TestimonialsSection = () => {
  return (
    <div className="py-24 bg-gray-50/50 relative overflow-hidden">
      {/* Decoration */}
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-100/30 rounded-full blur-3xl" />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Heading */}
        <div className="text-center mb-16">
          <p className="text-sm font-semibold text-purple-600 tracking-wide uppercase mb-3">
            Testimonials
          </p>
          <h2 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Loved by{" "}
            <span className="bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              Thousands
            </span>
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-gray-500">
            See what our users have to say about CloudShare.
          </p>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t, index) => (
            <div
              key={index}
              className="relative bg-white rounded-2xl p-8 border border-gray-100 hover:shadow-xl hover:shadow-purple-100/20 hover:-translate-y-1 transition-all duration-300"
            >
              <Quote size={32} className="absolute top-6 right-6 text-purple-100" />
              <div className="flex items-center gap-1 mb-4">
                {Array.from({ length: t.rating }).map((_, i) => (
                  <Star
                    key={i}
                    size={15}
                    className="text-amber-400 fill-amber-400"
                  />
                ))}
              </div>
              <p className="text-gray-600 leading-relaxed mb-6">
                &ldquo;{t.quote}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                <img
                  src={t.image}
                  alt={t.name}
                  className="w-11 h-11 rounded-full object-cover ring-2 ring-purple-100"
                />
                <div>
                  <p className="text-sm font-bold text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400">
                    {t.role}, {t.company}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TestimonialsSection;
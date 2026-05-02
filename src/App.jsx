import { useMemo, useState, useEffect } from "react";
import productsData from "./data/transformed_products.json";

const WHATSAPP_URL = "https://wa.me/919871621921";

// CHANGED 4: Expanded to 10 items
const popularHrSearches = [
  "Welcome kits",
  "Eco friendly",
  "Premium bags",
  "Bluetooth speakers",
  "Drinkware sets",
  "Tech gadgets",
  "Diwali hampers",
  "Onboarding boxes",
  "Award trophies",
  "Corporate hoodies"
];

const animatedHeroWords = ["teams", "clients", "partners", "employees"];

const proofPoints = [
  "AI catalog matching",
  "India-wide shipping",
  "Premium branding",
];

const processSteps = [
  {
    title: "Tell AI the brief",
    body: "Share quantity, occasion, budget, and audience in one natural sentence.",
  },
  {
    title: "Get catalog picks",
    body: "The system shortlists real products from your uploaded GiftsZone catalog.",
  },
  {
    title: "Connect with Expert",
    body: "Every recommended product has a direct WhatsApp action for quick buying.",
  },
];

const deliveredBrandLogos = ["adidas", "KPMG", "Coca-Cola", "Deloitte", "Infosys"];
const giftInputPlaceholder = "e.g. Diwali gifts for 200 employees...";

/* ------------------ SMART ENGINE ------------------ */

function getScore(product, query, selectedWords) {
  let score = 0;
  const q = query.toLowerCase();
  const searchWords = (product.leader_search_words || []).map(w => w.toLowerCase());

  if (selectedWords.length > 0) {
    const hasAll = selectedWords.every(word => searchWords.includes(word));
    const hasSome = selectedWords.some(word => searchWords.includes(word));
    
    if (hasAll) {
      score += 50; 
    } else if (hasSome) {
      score += 10; 
    } else {
      return 0; 
    }
  }

  if (q && product.name && product.name.toLowerCase().includes(q)) {
    score += 20;
  }

  if (q && searchWords.length > 0) {
    searchWords.forEach((word) => {
      if (word.includes(q) || q.includes(word)) score += 10;
    });
  }

  if (q && score === 0) {
    const nameWords = product.name ? product.name.toLowerCase().split(" ") : [];
    if (nameWords.some(nw => q.includes(nw))) score += 5;
  }

  if (!q && selectedWords.length > 0 && score > 0) {
    return score;
  }

  return score;
}

function getRecommendations(input, productsList, selectedWords) {
  const query = input.trim().toLowerCase();
  
  if (!query && selectedWords.length === 0) return [];

  return productsList
    .map((p) => ({
      ...p,
      score: getScore(p, query, selectedWords),
    }))
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score);
}

/* ------------------ MAIN APP ------------------ */

export default function App() {
  const [input, setInput] = useState("");
  const [selectedWords, setSelectedWords] = useState([]);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  
  // CHANGED 1: State for Hero rotating text
  const [heroWordIndex, setHeroWordIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroWordIndex((prev) => (prev + 1) % animatedHeroWords.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const { allProducts, uniqueWords } = useMemo(() => {
    const rawList = Array.isArray(productsData) ? productsData : (productsData?.products || []);
    const wordsSet = new Set();
    
    const processed = rawList.map((p, index) => {
      if (Array.isArray(p.leader_search_words)) {
        p.leader_search_words.forEach(w => wordsSet.add(w.toLowerCase()));
      }
      return { ...p, uniqueId: p.id || `prod-${index}` };
    });

    return { 
      allProducts: processed, 
      uniqueWords: Array.from(wordsSet).sort() 
    };
  }, []);

  const showcaseProducts = useMemo(() => allProducts.slice(0, 4), [allProducts]);
  const scrollerProducts = useMemo(() => [...allProducts.slice(0, 12), ...allProducts.slice(0, 12)], [allProducts]);
  const canSubmit = (input.trim().length > 1 || selectedWords.length > 0) && !isLoading;
  const giftOptions = (result?.giftOptions || []).slice(0, 20);

  const executeSearch = (currentInput, currentWords) => {
    if (currentInput.trim().length < 2 && currentWords.length === 0) {
      setResult(null);
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const filtered = getRecommendations(currentInput, allProducts, currentWords);

      if (filtered.length === 0) {
        setError("No matching products found. Try adjusting your keywords.");
        setResult(null);
      } else {
        const conditions = [];
        if (currentWords.length > 0) conditions.push(`the tags [${currentWords.join(" + ")}]`);
        if (currentInput.trim()) conditions.push(`"${currentInput.trim()}"`);
        
        const summaryText = `We analyzed the catalog and curated ${filtered.length} perfect matches based on ${conditions.join(" and ")}.`;

        setResult({
          summary: summaryText,
          giftOptions: filtered.map((p, index) => ({
            ...p,
            badge: index === 0 ? "Top Pick" : "Recommended",
            whatsappUrl: `${WHATSAPP_URL}?text=${encodeURIComponent(`Hi, I'm interested in ${p.name}`)}`,
          })),
        });

        // CHANGED 2: Auto-scroll to results after setting state
        setTimeout(() => {
          document.getElementById("ai-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 100);
      }
    } catch (err) {
      setError("An error occurred during search.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (val) => {
    setInput(val);
    
    if (val.trim().length > 1) {
      const q = val.toLowerCase();
      const matches = allProducts
        .filter(p => p.name.toLowerCase().includes(q))
        .map(p => p.name);
      
      setSuggestions(Array.from(new Set(matches)).slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }

    if (typingTimeout) clearTimeout(typingTimeout);
    
    setTypingTimeout(setTimeout(() => {
      if (val.trim().length > 1 || selectedWords.length > 0) {
        executeSearch(val, selectedWords);
      } else if (val.trim().length === 0 && selectedWords.length === 0) {
        setResult(null);
      }
    }, 500));
  };

  const handleSuggestionClick = (suggestionText) => {
    setInput(suggestionText);
    setShowSuggestions(false);
    if (typingTimeout) clearTimeout(typingTimeout);
    executeSearch(suggestionText, selectedWords);
  };

  const toggleWord = (word) => {
    const newWords = selectedWords.includes(word) 
      ? selectedWords.filter(w => w !== word) 
      : [...selectedWords, word];
    
    setSelectedWords(newWords);
    executeSearch(input, newWords); 
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (typingTimeout) clearTimeout(typingTimeout);
    setShowSuggestions(false);
    if (canSubmit) executeSearch(input, selectedWords);
  };

  // CHANGED 3: Scroll handlers
  const scrollToTop = () => window.scrollTo({ top: 0, behavior: "smooth" });
  const scrollToBottom = () => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });

  return (
    <main className="overflow-x-hidden min-h-screen bg-slate-50 pb-32 text-slate-900 md:pb-0 font-sans w-full selection:bg-orange-200">
      
      {/* Inline styles for custom animations */}
      <style>{`
        .animate-fade-scroll {
          animation: fadeScroll 3s ease-in-out infinite;
        }
        @keyframes fadeScroll {
          0%, 10% { opacity: 0; transform: translateY(15px); }
          20%, 80% { opacity: 1; transform: translateY(0); }
          90%, 100% { opacity: 0; transform: translateY(-15px); }
        }
        .animate-marquee-slow {
          animation: marquee 40s linear infinite;
        }
        @keyframes marquee {
          0% { transform: translateX(0%); }
          100% { transform: translateX(-50%); }
        }
      `}</style>

      {/* HEADER */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200/50">
        <nav className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <a className="flex items-center gap-2 group" href="#top">
            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm sm:text-base shadow-sm group-active:scale-95 transition-transform">
              GZ
            </div>
            <span className="text-base sm:text-xl font-black tracking-tight text-slate-900">
              GiftsZone.
            </span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-bold text-slate-500 md:flex">
            <a href="#premium" className="hover:text-slate-900 transition-colors">Premium</a>
            <a href="#catalog" className="hover:text-slate-900 transition-colors">Catalog</a>
            <a href="#how-it-works" className="hover:text-slate-900 transition-colors">How it works</a>
          </div>
          <a
            className="flex items-center justify-center h-10 sm:h-12 px-5 sm:px-6 rounded-full bg-slate-900 text-xs sm:text-sm font-bold text-white shadow-md active:scale-95 transition-all hover:bg-slate-800"
            href={WHATSAPP_URL}
            rel="noreferrer"
            target="_blank"
          >
            Contact
          </a>
        </nav>
      </header>

      {/* HERO SECTION */}
      <section className="relative mx-auto grid w-full max-w-7xl items-center gap-8 overflow-hidden px-4 pb-12 pt-8 sm:px-6 sm:py-16 grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] lg:px-8" id="top">
        <div className="relative z-10 w-full flex flex-col items-start min-w-0">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-600 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
            AI-Powered Corporate Gifting
          </div>

          <h1 className="w-full text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-black leading-[1.1] tracking-tight text-slate-900 min-h-[90px] sm:min-h-[140px]">
            Real products your <br className="hidden sm:block"/>
            {/* CHANGED 1: Animated scrolling/fading word */}
            <span className="text-orange-500 inline-block animate-fade-scroll">
              {animatedHeroWords[heroWordIndex]}
            </span> will love.
          </h1>

          <p className="mt-2 w-full max-w-xl text-base sm:text-lg leading-relaxed text-slate-600 mb-8">
            Tell our AI what you need. We'll search the GiftsZone catalog and curate the perfect branded merchandise in seconds.
          </p>

          <div className="mb-6 w-full">
             <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1 pb-1 scrollbar-hide">
               {uniqueWords.slice(0, 15).map(word => (
                  <button
                    key={word}
                    onClick={() => toggleWord(word)}
                    type="button"
                    className={`px-4 py-2 rounded-full text-xs sm:text-sm font-bold transition-all active:scale-95 ${
                      selectedWords.includes(word) 
                      ? "bg-slate-900 text-white shadow-md ring-2 ring-slate-900 ring-offset-2 ring-offset-slate-50" 
                      : "bg-white text-slate-600 shadow-sm ring-1 ring-slate-900/5 hover:ring-slate-900/20"
                    }`}
                  >
                    {word}
                  </button>
               ))}
             </div>
          </div>

          <div className="w-full max-w-2xl min-w-0">
            <GiftSearchForm
              canSubmit={canSubmit}
              input={input}
              isLoading={isLoading}
              onChange={handleInputChange}
              onSubmit={handleFormSubmit}
              variant="hero"
              suggestions={suggestions}
              showSuggestions={showSuggestions}
              onSuggestionClick={handleSuggestionClick}
              onFocus={() => input.trim().length > 1 && setShowSuggestions(true)}
              onBlur={() => setShowSuggestions(false)}
            />
          </div>

          <div className="mt-8 w-full min-w-0">
            <p className="mb-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400">
              Popular Searches
            </p>
            {/* CHANGED 4: Smaller text and 10 items */}
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-4 sm:mx-0 sm:flex-wrap sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
              {popularHrSearches.map((brief) => (
                <button
                  className="shrink-0 rounded-lg bg-white px-3 py-2 text-[10px] sm:text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-900/5 transition-all active:scale-95 hover:shadow-md flex items-center gap-1.5"
                  key={brief}
                  onClick={() => {
                    setInput(brief);
                    executeSearch(brief, selectedWords);
                  }}
                  type="button"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  {brief}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="mt-6 w-full rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-600 border border-red-100 flex items-center gap-3">
               <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
              {error}
            </div>
          )}
        </div>

        <HeroProductBoard products={showcaseProducts} />
      </section>

      {/* PREMIUM SCROLLER */}
      {!result && (
        <section id="premium" className="w-full bg-white py-16 sm:py-20">
          <div className="px-4 max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between mb-8 sm:mb-10 sm:px-6 lg:px-8 gap-4">
            <div>
              <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">Premium Collection</h2>
              <p className="text-base text-slate-500 mt-2">Executive gifts designed to leave an impression.</p>
            </div>
          </div>

          <div className="flex overflow-x-auto gap-4 sm:gap-6 px-4 pb-12 pt-2 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] sm:px-6 lg:px-8">
            {allProducts.slice(0, 8).map((item) => (
              <div key={item.uniqueId} className="snap-center shrink-0 w-[260px] sm:w-[320px] bg-white rounded-[2rem] p-3 sm:p-4 shadow-sm ring-1 ring-slate-900/5 transition-all duration-300 group hover:shadow-xl hover:ring-slate-900/10 flex flex-col">
                <div className="relative aspect-[4/5] bg-slate-50 rounded-[1.5rem] overflow-hidden mb-4 p-6 flex items-center justify-center">
                  <div className="absolute top-4 left-4 bg-yellow-400 text-yellow-950 text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest z-10">Premium</div>
                  <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-700 ease-out" onError={(e) => { e.target.src = buildFallbackImageUrl(item.id); }} />
                </div>
                <div className="px-2 flex-1 flex flex-col">
                  <h3 className="font-bold text-base sm:text-lg leading-snug line-clamp-2 text-slate-900 mb-2">{item.name}</h3>
                  <div className="mt-auto pt-4">
                    <a href={`${WHATSAPP_URL}?text=${encodeURIComponent(`Hi, I'm interested in the premium ${item.name}`)}`} target="_blank" rel="noreferrer" className="flex items-center justify-center w-full h-12 bg-slate-900 text-white text-sm rounded-full font-bold transition-all active:scale-95 hover:bg-slate-800">
                      Inquire Now
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* RESULTS GRID */}
      {result && (
        <section className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 scroll-mt-24" id="ai-results">
          <div className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-8 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-orange-100 text-orange-600 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-3">
                 <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"></path><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                 AI Results
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900">Your curated picks</h2>
              <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-600">{result.summary}</p>
            </div>
            <span className="inline-flex items-center justify-center h-10 px-4 rounded-full bg-slate-100 text-sm font-bold text-slate-700 shrink-0">
              {giftOptions.length} Items Found
            </span>
          </div>
          {isLoading ? <LoadingGrid /> : <ProductGrid products={giftOptions} />}
        </section>
      )}

      {!result && <ProductScroller products={scrollerProducts} />}

      <section className="mx-auto grid w-full max-w-7xl gap-4 sm:gap-6 px-4 py-16 sm:py-24 sm:px-6 md:grid-cols-3 lg:px-8" id="how-it-works">
        {processSteps.map((step, index) => (
          <article className="rounded-[2rem] bg-white p-8 shadow-sm ring-1 ring-slate-900/5 flex flex-col items-start" key={step.title}>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-orange-100 text-orange-600 font-black text-lg mb-6">
              {index + 1}
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-slate-900">{step.title}</h3>
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-slate-500">{step.body}</p>
          </article>
        ))}
      </section>

      <Footer />

      {/* FLOATING MOBILE SEARCH ISLAND */}
      <div className="fixed bottom-6 left-4 right-4 z-40 md:hidden transition-transform duration-300">
        <div className="bg-white/80 backdrop-blur-xl p-2 rounded-[2rem] shadow-2xl ring-1 ring-slate-900/10">
          <GiftSearchForm
            canSubmit={canSubmit}
            input={input}
            isLoading={isLoading}
            onChange={handleInputChange}
            onSubmit={handleFormSubmit}
            variant="sticky"
          />
        </div>
      </div>

      {/* CHANGED 3: FLOATING NAVIGATION PANEL (Up, Down, WA) */}
      <div className="fixed bottom-[110px] right-4 md:bottom-8 md:right-8 z-50 flex flex-col gap-2">
        <button onClick={scrollToTop} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-90" title="Scroll to Top">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 15l-6-6-6 6"/></svg>
        </button>
        <button onClick={scrollToBottom} className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-white text-slate-600 shadow-lg ring-1 ring-slate-900/10 hover:bg-slate-50 hover:text-slate-900 transition-all active:scale-90" title="Scroll to Bottom">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        </button>
        <a href={WHATSAPP_URL} rel="noreferrer" target="_blank" className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 hover:bg-[#20bd5a] transition-all active:scale-90 mt-1" title="Talk to expert">
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413Z"/></svg>
        </a>
      </div>
    </main>
  );
}

/* ------------------ UI COMPONENTS ------------------ */

function GiftSearchForm({ canSubmit, input, isLoading, onChange, onSubmit, variant, suggestions, showSuggestions, onSuggestionClick, onFocus, onBlur }) {
  const isSticky = variant === "sticky";

  return (
    <form className={`relative w-full min-w-0 ${isSticky ? "flex items-center" : ""}`} id={isSticky ? "sticky-ai-gifting" : "ai-gifting"} onSubmit={onSubmit}>
      <div className={`flex w-full relative ${isSticky ? "gap-2" : "flex-col sm:flex-row gap-3"}`}>
        <div className="relative flex-1 min-w-0">
          <div className="absolute inset-y-0 left-0 pl-4 sm:pl-5 flex items-center pointer-events-none">
             <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </div>
          <input
            id={isSticky ? "sticky-gift-brief" : "gift-brief"}
            type="text"
            placeholder={isSticky ? "Search gifts..." : giftInputPlaceholder}
            className={`w-full min-w-0 border bg-white font-semibold text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 ${
              isSticky ? "h-14 rounded-full pl-12 pr-4 text-base border-slate-200" : "h-14 sm:h-16 rounded-full pl-12 sm:pl-14 pr-5 text-base sm:text-lg border-slate-200 shadow-sm"
            }`}
            value={input}
            onChange={(event) => onChange(event.target.value)}
            onFocus={onFocus}
            onBlur={onBlur}
            autoComplete="off"
          />
          
          {showSuggestions && suggestions?.length > 0 && (
            <ul className="absolute left-0 right-0 bottom-full mb-3 sm:bottom-auto sm:top-full sm:mt-3 z-50 rounded-[1.5rem] border border-slate-100 bg-white shadow-2xl overflow-hidden py-2">
              {suggestions.map((sug, index) => (
                <li key={`${sug}-${index}`} onMouseDown={(e) => { e.preventDefault(); onSuggestionClick(sug); }} className="px-5 py-3.5 text-sm font-bold text-slate-600 cursor-pointer hover:bg-slate-50 hover:text-orange-500 transition-colors flex items-center gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-300"><polyline points="9 10 4 15 9 20"></polyline><path d="M20 4v7a4 4 0 0 1-4 4H4"></path></svg>
                  <span className="truncate">{sug}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
        <button className={`shrink-0 flex items-center justify-center bg-orange-500 text-white font-black transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100 hover:bg-orange-600 ${isSticky ? "h-14 w-14 rounded-full" : "w-full sm:w-auto h-14 sm:h-16 px-8 rounded-full shadow-lg shadow-orange-500/20 text-base"}`} disabled={!canSubmit} type="submit">
          {isLoading ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : isSticky ? <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg> : "Find Gifts"}
        </button>
      </div>
    </form>
  );
}

function HeroProductBoard({ products }) {
  const featured = products.length ? products : Array.from({ length: 4 });
  return (
    <div className="relative min-h-[300px] sm:min-h-[400px] w-full flex items-center justify-center">
      <div className="absolute right-0 sm:right-10 top-0 sm:top-10 h-40 w-40 rounded-full bg-orange-200 blur-3xl opacity-50" />
      <div className="absolute bottom-0 sm:bottom-10 left-0 sm:left-10 h-40 w-40 rounded-full bg-blue-200 blur-3xl opacity-50" />
      <div className="relative grid grid-cols-2 gap-3 sm:gap-5 p-2 sm:p-4 w-full max-w-md mx-auto min-w-0">
        {featured.slice(0,4).map((product, index) => (
          <article className={`overflow-hidden rounded-[2rem] bg-white shadow-sm ring-1 ring-slate-900/5 aspect-square p-4 flex items-center justify-center ${index % 2 === 0 ? "translate-y-4 sm:translate-y-8" : ""}`} key={product?.uniqueId || index}>
            <img alt={product?.name || `Gift`} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={product?.imageUrl || buildFallbackImageUrl(index)} />
          </article>
        ))}
      </div>
    </div>
  );
}

function ProductScroller({ products }) {
  return (
    <section className="border-y border-slate-200 bg-white py-12 sm:py-16 w-full overflow-hidden" id="catalog">
      <div className="mx-auto mb-6 sm:mb-8 flex max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">Live Catalog</h2>
      </div>
      <div className="overflow-hidden w-full relative">
        <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none"></div>
        <div className="flex w-max gap-4 sm:gap-6 px-4 animate-marquee hover:pause">
          {products.map((product, index) => (
            <article className="w-48 sm:w-64 shrink-0 overflow-hidden rounded-[2rem] bg-slate-50 ring-1 ring-slate-900/5 p-2" key={`${product?.uniqueId || "placeholder"}-${index}`}>
              <div className="aspect-[4/3] w-full bg-white rounded-[1.5rem] p-4 flex items-center justify-center shadow-sm">
                 <img alt={product?.name || "Catalog product"} className="w-full h-full object-contain mix-blend-multiply" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={product?.imageUrl || buildFallbackImageUrl(index)} />
              </div>
              <div className="p-4 text-center">
                <p className="line-clamp-1 text-sm font-bold text-slate-700">{product?.name || "Catalog product"}</p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProductGrid({ products }) {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((gift, index) => (
        <article className="flex flex-col overflow-hidden rounded-[2rem] bg-white p-2 shadow-sm ring-1 ring-slate-900/5 transition-all hover:shadow-lg hover:ring-slate-900/10" key={gift.uniqueId}>
          <div className="relative aspect-square w-full bg-slate-50 rounded-[1.5rem] p-6 flex items-center justify-center overflow-hidden">
            <span className="absolute top-4 left-4 bg-white text-slate-900 text-[10px] font-black px-3 py-1.5 rounded-full uppercase z-10 shadow-sm border border-slate-100">{gift.badge || "Pick"}</span>
            <img alt={gift.name} className="max-h-full max-w-full object-contain mix-blend-multiply hover:scale-105 transition-transform duration-500" loading="lazy" onError={(e) => { e.currentTarget.src = buildFallbackImageUrl(index); }} src={gift.imageUrl || buildFallbackImageUrl(index)} />
          </div>
          <div className="flex flex-col flex-1 p-4 pb-2">
            <div className="flex-1 mb-4">
              <p className="text-base font-bold leading-snug text-slate-900 line-clamp-2">{gift.name}</p>
            </div>
            <a className="flex h-12 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-900 transition-all active:scale-95 hover:bg-slate-200" href={gift.whatsappUrl || WHATSAPP_URL} rel="noreferrer" target="_blank">Request Quote</a>
          </div>
        </article>
      ))}
    </div>
  );
}

function Footer() {
  // CHANGED 5: Replicated array to make seamless infinite marquee
  const seamlessLogos = [...deliveredBrandLogos, ...deliveredBrandLogos, ...deliveredBrandLogos, ...deliveredBrandLogos];

  return (
    <footer className="bg-slate-900 text-white w-full rounded-t-[2rem] sm:rounded-t-[3rem] mt-10 relative overflow-hidden" id="contact">
      <div className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white font-black text-sm">GZ</div>
              <span className="text-xl font-black tracking-tight">GiftsZone.</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight mb-4">Your Branding Partner.</h2>
            <p className="max-w-md text-base leading-relaxed text-slate-400 mb-10">
              Leading provider of promotional gifts and corporate branding solutions across India. Quality products, seamless execution.
            </p>
            
            <p className="text-[10px] sm:text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Trusted By</p>
            
            {/* CHANGED 5: Infinite Marquee for Footer Logos */}
            <div className="w-full relative overflow-hidden flex -ml-4">
               {/* Faded edges for sleek look */}
               <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-900 to-transparent z-10 pointer-events-none"></div>
               <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-900 to-transparent z-10 pointer-events-none"></div>
               
               <div className="flex w-max gap-3 animate-marquee-slow py-1">
                 {seamlessLogos.map((brand, i) => (
                   <div className="flex h-10 sm:h-12 items-center justify-center rounded-full border border-slate-700 bg-slate-800/50 px-5 text-xs sm:text-sm font-bold text-slate-300 shrink-0" key={`${brand}-${i}`}>
                     {brand}
                   </div>
                 ))}
               </div>
            </div>
          </div>

          <div className="rounded-[2rem] bg-slate-800/50 border border-slate-700 p-8 sm:p-10 flex flex-col justify-center">
            <h3 className="text-lg font-black mb-6 flex items-center gap-2">
               <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-orange-500"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
               Contact Us
            </h3>
            <div className="grid gap-4 text-base text-slate-300">
              <p className="flex items-start gap-3">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-500 shrink-0 mt-0.5"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                <span>SG Alpha Tower, 6th Floor<br />Vasundhara, Ghaziabad<br />India</span>
              </p>
              <div className="h-px w-full bg-slate-700/50 my-2"></div>
              <a className="flex items-center gap-3 hover:text-white transition-colors" href="tel:+919871621921"><span className="font-bold">+91 98716 21921</span></a>
              <a className="flex items-center gap-3 hover:text-white transition-colors" href="mailto:vishal.giftszone@gmail.com"><span className="font-bold">vishal.giftszone@gmail.com</span></a>
            </div>
          </div>
        </div>
      </div>
      <div className="h-24 md:h-0 w-full bg-transparent"></div>
    </footer>
  );
}

function buildFallbackImageUrl(index) {
  const label = `Gift ${String(index + 1).padStart(2, "0")}`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="480" viewBox="0 0 640 480"><rect width="640" height="480" fill="#f8fafc"/><rect x="48" y="48" width="544" height="384" rx="40" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/><text x="320" y="246" text-anchor="middle" font-family="system-ui, sans-serif" font-size="24" font-weight="800" fill="#94a3b8">${label}</text></svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function LoadingGrid() {
  return (
    <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div className="h-72 animate-pulse rounded-[2rem] bg-slate-100" key={index} />
      ))}
    </div>
  );
}
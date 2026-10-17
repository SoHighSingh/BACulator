# 🍻 BACulator

<div align="center">
  <img src="https://img.shields.io/badge/Cloudflare_Workers_AI-F38020?style=for-the-badge&logo=cloudflare&logoColor=white" alt="Cloudflare Workers AI" />
  <img src="https://img.shields.io/badge/Next.js-15.4.1-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tRPC-10.0-398ccb?style=for-the-badge&logo=trpc&logoColor=white" alt="tRPC" />
  <img src="https://img.shields.io/badge/Prisma-5.0-2d3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38b2ac?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<div align="center">
  <h3>🧮 Advanced Blood Alcohol Content Calculator</h3>
  <p><em>Real-time BAC tracking with sophisticated pharmacokinetic modeling</em></p>
</div>

---

## ⚠️ **IMPORTANT LEGAL DISCLAIMER**

> **🚨 FOR ENTERTAINMENT PURPOSES ONLY 🚨**
> 
> This application is **NOT** a medical device and should **NEVER** be used to determine your fitness to drive or operate machinery. BAC calculations are estimates only and can vary significantly based on numerous factors not accounted for in this application.
> 
> **DO NOT** use this app to make decisions about:
> - ✗ Driving or operating vehicles
> - ✗ Operating heavy machinery  
> - ✗ Making legal or safety decisions
> - ✗ Medical or health-related choices
> 
> **Always use designated drivers, rideshare services, or public transportation when consuming alcohol.**
> 
> The developers assume no liability for any consequences resulting from the use of this application.

---

## 🎯 **Why Choose BACulator?**

### The Problem with Traditional BAC Calculators
Most BAC calculators oversimplify alcohol metabolism, leading to dangerous inaccuracies. They assume:
- Instant alcohol absorption
- Linear elimination rates
- One-size-fits-all calculations

### BACulator's Advanced Solution
Built with cutting-edge pharmacokinetic science, BACulator provides:

🔬 **Scientific Precision** - Advanced absorption curve modeling with exponential uptake functions  
🤖 **AI-Powered Input** - Natural language drink recognition with intelligent parsing  
⏱️ **Real-Time Accuracy** - Live BAC calculations updated every minute  
📈 **Peak Prediction** - Know exactly when your BAC will peak and plateau  
🎯 **Intelligent Elimination** - Proper zero-order kinetics with continuous metabolism modeling  
📱 **Beautiful Interface** - Intuitive design with animated visualizations  
🔒 **Secure & Private** - Google OAuth with encrypted data storage  

Experience the difference that scientific accuracy makes in BAC calculation.

---

## ✨ **Core Features**

### 🧮 **Advanced Pharmacokinetic Modeling**
- **Widmark Formula Enhancement**: Modified for real-world accuracy
- **30-Minute Absorption Curve**: Exponential uptake function `1 - e^(-3×t)`
- **Zero-Order Elimination**: Constant 0.015% BAC per hour processing
- **Gender-Specific Distribution**: Male (0.68) vs Female (0.55) body water ratios
- **Timeline Reconstruction**: Adaptive time-step algorithm for precise BAC tracking

### 🤖 **Drink Recognition (the "bartender")**
- **Mostly deterministic, free to run**: text is matched against your recent drinks, a parse cache, then a curated Australian catalog (~250 brands plus generic beers, wines, spirits, RTDs and cocktails) with Australian serve sizes (pot 285 ml, schooner 425, pint 570, SA pint 425, can 375, longneck 750, wine glass 150, nip 30) and typo tolerance
- **Code does the maths**: standards = count × ml × ABV × 0.789 / 10, rounded up to the next 0.1, never down; unknown strength is assumed full strength
- **AI only as a last resort**: text the catalog can't read goes to Cloudflare Workers AI with a JSON schema, treated as data (prompt-injection resistant), validated and clamped, and cached
- **Never a silent zero**: if the AI is unavailable you get size chips for manual entry
- **Shows its working**: the confirm step lists the assumed volume, ABV and count

### 📊 **Intelligent Tracking & Predictions**
- **Real-Time BAC Monitoring**: Live updates with minute-by-minute precision
- **Peak BAC Calculation**: Scientifically determine when maximum intoxication occurs
- **Sobriety Timeline**: Accurate countdown to 0.00% BAC
- **Legal Driving Status**: Track when BAC drops below 0.05%
- **Rising/Falling Detection**: Know if your BAC is still increasing

### 🎨 **Premium User Experience**
- **Natural Language Input**: Type drinks as you'd describe them - "2 beers and a shot"
- **Animated BAC Visualizations**: Dynamic water-level indicators and trend graphs
- **Session Management**: Start/stop drinking periods with comprehensive drink logging
- **Mobile-First Design**: Optimized touch interface with responsive layouts
- **Real-Time Sync**: Seamless data persistence across devices
- **Intuitive Controls**: AI-powered drink logging with smart time defaults

### 🔐 **Enterprise-Grade Security**
- **Google OAuth Integration**: Secure authentication without password management
- **Encrypted Data Storage**: All personal information protected with industry standards
- **Privacy by Design**: No tracking, no ads, no data monetization

---

## 🧬 **The Science Behind BACulator**

### Advanced Pharmacokinetic Model

BACulator implements a sophisticated multi-phase alcohol metabolism model that far exceeds traditional BAC calculators:

#### **Phase 1: Absorption Modeling**
```
Absorption Rate = 1 - e^(-3 × (time_elapsed / 30_minutes))
Peak Absorption: 30 minutes post-consumption
Curve Shape: Exponential approach to maximum
```

Unlike instant-absorption calculators, BACulator models the realistic 30-minute uptake period where alcohol gradually enters your bloodstream through gastric and intestinal absorption.

#### **Phase 2: Distribution Calculation** 
```
BAC = (alcohol_grams) / (body_weight_grams × distribution_ratio) × 100
Male Distribution Ratio: 0.68 (higher water content)
Female Distribution Ratio: 0.55 (biological differences in body composition)
```

Gender-specific calculations account for physiological differences in total body water content, ensuring accurate BAC estimates for all users.

#### **Phase 3: Elimination Kinetics**
```
Elimination Rate: 0.015% BAC per hour (zero-order kinetics)
Timeline Tracking: Continuous metabolism from first alcohol detection
Adaptive Sampling: Dense calculations during absorption, sparse during elimination
```

BACulator tracks elimination continuously rather than applying simple time-based reductions, ensuring accuracy even with complex drinking patterns.

### **Critical Time Point Algorithm**

The calculator uses intelligent sampling at critical moments:
- **Drink Consumption Times**: When alcohol enters the system
- **Peak Absorption Points**: 30 minutes after each drink
- **Elimination Milestones**: Key BAC threshold crossings
- **User Query Time**: Precise calculation at requested moment

This approach delivers laboratory-grade accuracy while maintaining real-time performance.

---

## 📈 **BAC Level Reference**

Understanding what different BAC levels mean for your body:

| BAC Range | Physical Effects | Cognitive Impact | Legal Status |
|-----------|------------------|------------------|--------------|
| **0.00-0.03%** | 🟢 No noticeable effects | Normal function | ✅ Legal everywhere |
| **0.03-0.05%** | 🟡 Mild relaxation, slight euphoria | Slightly reduced inhibition | ⚠️ Some driving restrictions |
| **0.05-0.08%** | 🟠 Impaired coordination, reduced reaction time | Poor judgment, reduced concentration | 🚫 Illegal to drive (most locations) |
| **0.08-0.15%** | 🔴 Significant motor impairment, slurred speech | Severely impaired decision-making | 🚨 Criminal charges likely |
| **0.15%+** | 💀 Life-threatening symptoms | Potential loss of consciousness | 🚨 Medical emergency - call 911 |

> **Critical Reminder**: Individual tolerance varies dramatically. These effects can occur at lower BAC levels depending on body weight, metabolism, medications, food intake, and drinking experience.

---

## 🏗️ **Technical Architecture**

### **Modern T3 Stack Foundation**
- **⚡ Next.js 15**: React framework with App Router for optimal performance
- **🔷 TypeScript**: End-to-end type safety eliminating runtime errors
- **🌐 tRPC**: Typesafe API layer with automatic client generation
- **🗄️ Prisma ORM**: Type-safe database operations with automatic migrations
- **🔐 NextAuth.js**: Production-ready authentication with Google OAuth
- **🎨 Tailwind CSS**: Utility-first styling with shadcn/ui components
- **🐘 PostgreSQL**: Robust relational database for complex data relationships
- **🤖 Cloudflare Workers AI**: Last-resort parsing for drinks the catalog doesn't know (src/lib/drinks)

### **Core Algorithm Implementation**

#### **BAC Calculation Engine**
```typescript
function calculateBACWithProperElimination(
  drinks: Drink[],
  userWeight: number,
  userSex: string,
  targetTime: Date
): number {
  // Timeline reconstruction with critical point sampling
  // Exponential absorption curve modeling
  // Continuous elimination tracking
  // Precision rounding to 4 decimal places
}
```

#### **AI Drink Analysis Engine**
```typescript
async function parseDrinks(text: string, deps: BartenderDeps): Promise<ParseResult> {
  // recents (D1) -> parse cache (D1) -> catalog + serve sizes -> Workers AI (leftover text only)
  // standards computed in code, rounded up; "unavailable" instead of a silent 0
}
// Catalog: src/lib/drinks/catalog.ts -> `npm run db:catalog-sql` -> migrations/0003_seed_catalog.sql
// Accuracy: `npm run eval:drinks` runs scripts/drinks.eval.json
```

#### **Peak Detection System**
```typescript
function findPeakBAC(drinks: Drink[], ...params): {peakBAC: number, timeToPeak: number} {
  // Intelligent sampling: dense during absorption, sparse during elimination
  // Critical time point identification
  // Binary search optimization for large datasets
  // Sub-minute precision timing
}
```

### **Database Schema Design**
```sql
-- User profiles with BAC calculation parameters
User {
  id: String @id @default(cuid())
  email: String @unique
  weight: Float? -- Body weight in kg
  sex: String? -- "male" | "female" for distribution calculations
}

-- Drinking session management
Tab {
  id: String @id @default(cuid()) 
  userId: String
  startTime: DateTime
  endTime: DateTime?
  isActive: Boolean @default(true)
}

-- Individual drink tracking with precise timing
Drink {
  id: String @id @default(cuid())
  tabId: String
  standards: Float -- Australian standard drinks (10g alcohol each)
  finishedAt: DateTime -- When consumption completed
}
```

---

## 🎨 **User Experience Excellence**

### **Visual Design Philosophy**
- **🌊 Fluid Animations**: Realistic BAC level visualization with animated water effects
- **✨ Micro-Interactions**: Satisfying button presses and state transitions
- **📱 Mobile-First**: Touch-optimized interface with gesture support
- **🌙 Dark Theme**: Elegant glassmorphism design with subtle blur effects
- **⚡ Performance**: 60fps animations with hardware acceleration

### **Accessibility Standards**
- **♿ WCAG 2.1 AA Compliance**: High contrast ratios and screen reader support
- **⌨️ Keyboard Navigation**: Complete functionality without mouse/touch
- **🎯 Focus Management**: Clear visual indicators and logical tab order
- **📖 Semantic HTML**: Proper heading structure and ARIA labels

### **Performance Optimization**
- **🚀 Core Web Vitals**: Optimized for Google's performance metrics
- **📦 Code Splitting**: Lazy loading for improved initial page load
- **💾 Smart Caching**: Efficient data fetching with React Query
- **⚡ Edge Computing**: Vercel Edge Functions for global low latency

---

## 🎯 **Why BACulator Matters**

### **Real-World Impact**
Traditional BAC calculators can be dangerously misleading. BACulator's scientific approach provides:

- **Educational Value**: Understand how alcohol actually affects your body over time
- **Harm Reduction**: Better awareness of intoxication patterns and timing
- **Social Responsibility**: Encourage safer drinking decisions through accurate information
- **Scientific Literacy**: Learn about pharmacokinetics in an engaging, practical way

### **Perfect for Various Scenarios**
- **📚 Educational**: Students studying pharmacology or toxicology
- **🍺 Social Events**: Party planning with responsible drinking awareness
- **🏥 Healthcare**: Professionals explaining alcohol metabolism to patients
- **🔬 Research**: Accurate BAC modeling for academic or clinical studies

### **Competitive Advantages**
- **🤖 Natural Language Processing**: First BAC calculator with AI-powered drink recognition
- **⏱️ Time-Aware Calculations**: Accounts for when drinks were consumed, not just quantity
- **📈 Peak Prediction**: Know when maximum intoxication will occur
- **🔄 Session Continuity**: Resume calculations across app restarts
- **🎯 Precision**: 4-decimal-place accuracy vs typical 2-decimal competitors
- **🧠 Smart Input**: Type drinks naturally - no complex menus or conversions needed

---

## 📊 **Standard Drink Reference**

BACulator uses Australian standard drink measurements (10g pure alcohol per standard):

### **Common Alcoholic Beverages**
| Beverage Type | Serving Size | Alcohol % | Standard Drinks |
|---------------|-------------|-----------|-----------------|
| **Beer (Mid-strength)** | 375ml can | 3.5% | 0.9 standards |
| **Beer (Full-strength)** | 375ml can | 4.8% | 1.2 standards |
| **Wine** | 150ml glass | 12% | 1.4 standards |
| **Champagne** | 150ml glass | 12% | 1.4 standards |
| **Spirits (Neat)** | 30ml shot | 40% | 1.0 standard |
| **Pre-mixed Drinks** | 375ml bottle | 5% | 1.5 standards |
| **Cider** | 375ml bottle | 4.5% | 1.3 standards |

### **Quick Calculation Formula**
```
Standard Drinks = (Volume in ml × Alcohol % × 0.789) ÷ 10
```

---

<div align="center">

### 🍻 **Experience the Future of BAC Calculation** 🍻

*BACulator represents the evolution of alcohol awareness tools - combining rigorous science with beautiful design to create an educational experience that promotes responsible drinking decisions.*

**Remember: This tool is for educational purposes only. Never drink and drive.**

---

</div>
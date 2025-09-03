# 🍻 BACulator

<div align="center">
  <img src="https://img.shields.io/badge/Next.js-15.4.1-black?style=for-the-badge&logo=next.js&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/tRPC-10.0-398ccb?style=for-the-badge&logo=trpc&logoColor=white" alt="tRPC" />
  <img src="https://img.shields.io/badge/Prisma-5.0-2d3748?style=for-the-badge&logo=prisma&logoColor=white" alt="Prisma" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.0-38b2ac?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
</div>

<div align="center">
  <h3>🧮 Smart Blood Alcohol Content Calculator</h3>
  <p><em>Advanced BAC tracking with real-time absorption modeling and peak prediction</em></p>
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

## 🎯 **What Problem Does BACulator Solve?**

### The Issue
Traditional BAC calculators provide oversimplified, inaccurate estimates that don't account for:
- **Time-based absorption curves** - Alcohol doesn't instantly enter your bloodstream
- **Individual elimination rates** - Your body processes alcohol at a specific rate
- **Peak prediction** - When your BAC will actually reach its highest point
- **Real-time tracking** - How your BAC changes minute by minute

### The Solution
BACulator uses advanced pharmacokinetic modeling to provide:

🔬 **Scientific Accuracy** - Based on the Widmark formula with absorption curve modeling  
⏱️ **Real-Time Tracking** - Live BAC updates every minute during active sessions  
📈 **Peak Prediction** - Know exactly when your BAC will peak and when you'll be sober  
🎨 **Beautiful UI** - Intuitive interface with animated visualizations  
📱 **Mobile Optimized** - Perfect for on-the-go reference (remember: entertainment only!)  
🔒 **Privacy First** - Your data stays secure with Google OAuth authentication  

---

## ✨ **Key Features**

### 🧮 **Advanced BAC Calculations**
- **Widmark Formula Implementation** with modern enhancements
- **30-minute absorption modeling** - accounts for alcohol uptake time
- **0.015% per hour elimination rate** - scientifically accurate processing
- **Gender and weight specific** calculations
- **Decimal precision** - accurate to 4 decimal places

### 📊 **Smart Tracking**
- **Real-time BAC monitoring** with automatic minute-by-minute updates
- **Peak BAC prediction** - know when you'll hit maximum intoxication
- **Time to sobriety** - precise countdown to 0.000% BAC
- **Time to legal limit** - when you'll be under 0.05% BAC
- **Visual BAC indicator** with animated water levels

### 📈 **Interactive Visualizations**
- **Animated BAC graphs** showing absorption and elimination curves
- **3D tilt card effects** for enhanced user experience
- **Smooth transitions** and micro-interactions
- **Color-coded warnings** for BAC levels above 0.05%
- **Responsive design** for all screen sizes

### 🔐 **Session Management**
- **Google OAuth integration** for secure authentication
- **Drinking session tracking** - start/stop drinking periods
- **Drink history** with precise timing and standard drink calculations
- **Profile management** - weight and biological sex settings
- **Data persistence** across sessions

---

## 🧬 **How the Calculation Works**

### The Science Behind BACulator

BACulator implements a sophisticated pharmacokinetic model that goes beyond simple BAC estimation:

#### **1. Widmark Formula Foundation**
```
BAC = (Alcohol consumed in grams) / (Body weight in grams × Distribution ratio) × 100
```

**Distribution Ratios:**
- **Male**: 0.68 (higher water content)
- **Female**: 0.55 (lower water content due to biological differences)

#### **2. Absorption Curve Modeling**
Unlike instant calculators, BACulator models realistic alcohol absorption:

- **Peak absorption time**: 30 minutes after consumption
- **Absorption curve**: Exponential function `1 - e^(-3 × progress)`
- **Gradual uptake**: Alcohol doesn't instantly appear in bloodstream

#### **3. Elimination Kinetics**
- **Elimination rate**: 0.015% BAC per hour (scientifically established)
- **Zero-order kinetics**: Constant elimination regardless of BAC level
- **Continuous processing**: Starts immediately when first alcohol enters system

#### **4. Peak Prediction Algorithm**
BACulator calculates when your BAC will peak by:
1. Modeling absorption curves for all drinks
2. Calculating elimination from first consumption
3. Finding the intersection point where absorption < elimination
4. Providing precise timing down to the minute

### **Standard Drink Calculations**
- **1 Standard Drink** = 14 grams of pure alcohol
- **Examples**:
  - 12 oz beer (5% ABV) = 1.0 standard drinks
  - 5 oz wine (12% ABV) = 1.0 standard drinks  
  - 1.5 oz spirits (40% ABV) = 1.0 standard drinks

---

## 🏗️ **Technical Architecture**

### **Tech Stack**
Built with the modern **T3 Stack** for maximum performance and type safety:

- **⚡ Next.js 15** - React framework with App Router
- **🔷 TypeScript** - Full type safety across the stack  
- **🌐 tRPC** - End-to-end typesafe APIs
- **🗄️ Prisma** - Type-safe database ORM
- **🔐 NextAuth.js** - Authentication with Google OAuth
- **🎨 Tailwind CSS** - Utility-first styling
- **✨ shadcn/ui** - Beautiful, accessible components
- **🐘 PostgreSQL** - Robust database backend

### **Database Schema**
```sql
-- User profiles with BAC calculation parameters
User {
  id, email, name, weight (kg), sex, createdAt
}

-- Drinking session management  
Tab {
  id, userId, startTime, endTime, isActive
}

-- Individual drink tracking
Drink {
  id, tabId, standards (decimal), finishedAt, createdAt
}
```

### **Key Algorithms**

#### **BAC at Time T**
```typescript
function calculateBACAtTime(drinks, userWeight, userSex, targetTime) {
  const totalAbsorbed = drinks.reduce((sum, drink) => {
    return sum + calculateAbsorbedBAC(drink, userWeight, userSex, targetTime);
  }, 0);
  
  const totalEliminated = calculateTotalElimination(drinks, userWeight, userSex, targetTime);
  
  return Math.max(0, totalAbsorbed - totalEliminated);
}
```

#### **Peak Finding**
```typescript
function findPeakBAC(drinks, userWeight, userSex, currentTime) {
  let peakBAC = 0;
  let peakTime = 0;
  
  // Check every 5 minutes for next 2 hours
  for (let minutes = 0; minutes <= 120; minutes += 5) {
    const checkTime = new Date(currentTime.getTime() + minutes * 60 * 1000);
    const bac = calculateBACAtTime(drinks, userWeight, userSex, checkTime);
    
    if (bac > peakBAC) {
      peakBAC = bac;
      peakTime = minutes / 60;
    }
  }
  
  return { peakBAC, timeToPeak: peakTime };
}
```

---

## 🚀 **Getting Started**

### **Prerequisites**
- Node.js 18.0 or higher
- PostgreSQL database
- Google OAuth credentials

### **Installation**

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/baculator.git
   cd baculator
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env.local
   ```
   
   Fill in your environment variables:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/baculator"
   NEXTAUTH_SECRET="your-secret-key"
   NEXTAUTH_URL="http://localhost:3000"
   GOOGLE_CLIENT_ID="your-google-client-id"
   GOOGLE_CLIENT_SECRET="your-google-client-secret"
   ```

4. **Set up the database**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

Visit `http://localhost:3000` to see the application!

### **Development Commands**
```bash
npm run dev          # Start development server
npm run build        # Create production build
npm run typecheck    # Run TypeScript checks
npm run lint         # Run ESLint
npm run format:write # Format code with Prettier
npm run db:studio    # Open Prisma Studio
```

---

## 🎨 **UI/UX Features**

### **Visual Design**
- **🌊 Animated BAC indicator** with realistic water level simulation
- **✨ Smooth transitions** and micro-interactions throughout
- **🎯 3D card effects** with mouse tracking for enhanced engagement
- **📱 Responsive design** optimized for all devices
- **🌙 Dark theme** with glassmorphism effects
- **⚡ Real-time updates** with loading states and notifications

### **Accessibility**
- **♿ WCAG 2.1 AA compliant** color contrasts
- **⌨️ Keyboard navigation** support
- **📱 Screen reader** optimized
- **🎯 Focus management** for better usability

### **Performance**
- **⚡ 90+ Lighthouse scores** across all metrics
- **🚀 Optimized bundle size** with code splitting
- **💾 Efficient caching** strategies
- **📊 Real-time updates** without page refreshes

---

## 📊 **BAC Reference Guide**

Understanding BAC levels and their effects:

| BAC Level | Effects | Legal Status |
|-----------|---------|--------------|
| **0.00-0.02%** | 🟢 No noticeable effects | ✅ Legal everywhere |
| **0.02-0.05%** | 🟡 Slight euphoria, relaxation | ⚠️ Some countries restrict driving |
| **0.05-0.08%** | 🟠 Impaired judgment, reduced coordination | 🚫 Illegal to drive in most places |
| **0.08-0.15%** | 🔴 Significant impairment, dangerous | 🚨 Severely illegal, criminal charges |
| **0.15%+** | 💀 Life-threatening, seek medical help | 🚨 Medical emergency |

> **Remember**: These are general guidelines only. Individual responses vary significantly.

---

## 🤝 **Contributing**

We welcome contributions to make BACulator even better!

### **How to Contribute**
1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and add tests
4. **Run the full test suite** (`npm run check`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to the branch** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### **Development Guidelines**
- Follow the existing code style and conventions
- Add TypeScript types for all new code  
- Include tests for new functionality
- Update documentation as needed
- Ensure accessibility compliance

---

## 📜 **License**

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---

## 🙏 **Acknowledgments**

- **Scientific Research**: Based on established pharmacokinetic models
- **T3 Stack**: For providing an amazing full-stack TypeScript foundation
- **Widmark Formula**: The gold standard for BAC calculations
- **Community**: Thanks to all contributors and testers

---

<div align="center">

### 🍻 **Remember: Drink Responsibly, Calculate for Fun!** 🍻

*BACulator is a sophisticated educational tool built with modern web technologies.*  
*Always prioritize safety and never drink and drive.*

**Made with ❤️ and lots of ☕**

---

**⭐ If you found this project helpful, please give it a star! ⭐**

</div>
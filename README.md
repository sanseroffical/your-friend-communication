# Your Friend Communication

A modern, full-featured communication platform built with React, TypeScript, Vite, and Supabase. This application provides a comprehensive solution for real-time messaging, user authentication, and interactive 3D environments.

## 🎯 Features

### Core Communication
- **Real-time Messaging**: Instant message delivery with WebSocket support
- **User Authentication**: Secure authentication via Lovable Cloud Auth
- **User Profiles**: Create and customize user profiles with avatars
- **Message History**: Full message history with persistent storage
- **Status Indicators**: Real-time online/offline status

### User Interface
- **Modern Design**: Built with Radix UI components and Tailwind CSS
- **Dark/Light Themes**: Support for multiple color schemes via next-themes
- **Responsive Layout**: Mobile-friendly design with resizable panels
- **Accessibility**: WCAG compliant with proper ARIA attributes
- **Toast Notifications**: User feedback via Sonner toast notifications

### Advanced Features
- **3D Environments**: Interactive 3D scenes powered by Three.js and React Three Fiber
- **Data Visualization**: Charts and graphs using Recharts
- **Rich Forms**: Form management with React Hook Form and Zod validation
- **State Management**: Query management with TanStack React Query
- **File Uploads**: Cloud storage integration via Supabase

## 🚀 Tech Stack

### Frontend
- **React 18.3**: Latest React features and hooks
- **TypeScript 5.8**: Type-safe development
- **Vite 5.4**: Lightning-fast build tool
- **Tailwind CSS 3.4**: Utility-first CSS framework
- **Radix UI**: Headless component library

### Backend & Services
- **Supabase**: PostgreSQL database and authentication
- **React Router DOM 6.30**: Client-side routing

### 3D & Visualization
- **Three.js**: 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **Drei**: Useful helpers for React Three Fiber

### Form & Validation
- **React Hook Form 7.61**: Performant form library
- **Zod 3.25**: TypeScript-first schema validation
- **React Markdown 10.1**: Markdown rendering

### UI Components & Styling
- **Shadcn UI**: High-quality React components
- **Lucide React**: Beautiful icon set
- **Class Variance Authority**: CSS class composition
- **Tailwind Merge**: Merge Tailwind classes
- **Embla Carousel**: Carousel component
- **Recharts**: Composable charting library

### Development Tools
- **ESLint 9.32**: Code quality
- **TypeScript ESLint**: TypeScript linting
- **Autoprefixer**: CSS vendor prefixes
- **PostCSS**: CSS transformations

## 📋 Prerequisites

- **Node.js**: v16 or higher
- **npm** or **bun**: Package manager
- **Git**: Version control
- **Supabase Account**: Backend services (optional)

## 🛠️ Installation

### 1. Clone the Repository

```bash
git clone https://github.com/sanseroffical/your-friend-communication.git
cd your-friend-communication
```

### 2. Install Dependencies

Using npm:
```bash
npm install
```

Or using bun:
```bash
bun install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with your configuration:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Authentication
VITE_AUTH_REDIRECT_URL=http://localhost:5173

# API Endpoints
VITE_API_URL=your_api_url
```

### 4. Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173`
if on ipad/iphone, open the attached link and click add to home screen.
## 📦 Available Scripts

### Development
```bash
npm run dev           # Start development server with hot reload
```

### Production Build
```bash
npm run build         # Build for production
npm run build:dev     # Build with development mode enabled
npm run preview       # Preview production build locally
```

### Code Quality
```bash
npm run lint          # Run ESLint to check code quality
```

## 📁 Project Structure

```plaintext
your-friend-communication/
├── src/
│   ├── components/       # Reusable React components
│   ├── pages/            # Page components (Plaza, Dashboard, etc.)
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   ├── types/            # TypeScript type definitions
│   ├── styles/           # Global styles
│   ├── App.tsx           # Main App component
│   └── main.tsx          # Application entry point
├── public/               # Static assets
├── index.html            # HTML entry point
├── vite.config.ts        # Vite configuration
├── tailwind.config.ts    # Tailwind CSS configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Project dependencies
```

## 🔧 Configuration Files

### Vite Config (`vite.config.ts`)
- React plugin with SWC compilation
- Optimized build settings
- Development server configuration

### Tailwind Config (`tailwind.config.ts`)
- Extended color palette
- Custom animations
- Plugin integrations (typography)

### TypeScript Config (`tsconfig.json`)
- Strict type checking enabled
- Module resolution configured
- JSX support enabled

### ESLint Config (`eslint.config.js`)
- React-specific rules
- React Hooks validation
- Code quality standards

## 🎨 Customization

### Theming
The application supports dark and light themes via `next-themes`. Customize colors in:
- `tailwind.config.ts` - Tailwind color palette
- `src/styles/` - Global style overrides

### Components
Radix UI components can be customized in:
- `src/components/ui/` - Base component definitions
- Component-specific Tailwind classes

### Typography
Tailwind Typography plugin is included. Add prose classes to markdown-rendered content:
```jsx
<div className="prose dark:prose-invert">
  <ReactMarkdown>{content}</ReactMarkdown>
</div>
```

## 🚀 Deployment

### Building for Production
```bash
npm run build
```

This creates an optimized build in the `dist/` directory.

### Deployment Options
- **Vercel**: Recommended for React + Vite projects
- **Netlify**: Full support for static site hosting
- **GitHub Pages**: Simple static hosting
- **Docker**: Containerize for any platform

### Environment Variables for Production
Update your `.env` file with production URLs before deployment.

## 📚 API Documentation

### Supabase Integration
The app connects to Supabase for:
- User authentication
- Database operations
- Real-time subscriptions
- File storage

Configure your Supabase project and add credentials to `.env`.

### Authentication Flow
1. User initiates login via Lovable Cloud Auth
2. Supabase authenticates and returns session token
3. Tokens stored securely in browser
4. Automatic token refresh on expiration

## 🐛 Troubleshooting

### Common Issues

**Issue**: Port 5173 already in use
```bash
npm run dev -- --port 5174
```

**Issue**: Dependencies not installing
```bash
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Tailwind styles not applying
- Check `tailwind.config.ts` content paths
- Ensure CSS is imported in main entry point
- Rebuild the project

**Issue**: TypeScript errors
```bash
npm run lint
```

## 📖 Learning Resources

- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Radix UI](https://www.radix-ui.com/)
- [Supabase Docs](https://supabase.com/docs)
- [Three.js Documentation](https://threejs.org/docs/)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines
- Follow the existing code style
- Write meaningful commit messages
- Add comments for complex logic
- Test your changes before submitting
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 👥 Support

For issues, questions, or suggestions:
- Open an [issue on GitHub](https://github.com/sanseroffical/your-friend-communication/issues)
- Check existing documentation
- Review closed issues for solutions

## 🎉 Acknowledgments

- Built with [React](https://react.dev)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide React](https://lucide.dev)
- Backend powered by [Supabase](https://supabase.com)
- 3D graphics via [Three.js](https://threejs.org)

---

**Last Updated**: March 19, 2026
**Version**: 0.0.0

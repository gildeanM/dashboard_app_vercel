import type { NextAuthConfig } from 'next-auth';
 
export const authConfig = {
  
  pages: {
    signIn: '/login',
    newUser: '/register'

  },
  callbacks: {
    authorized({ auth , request: { nextUrl }}){
        const isLoggedIn = !!auth?.user
        const isOnDashboard = nextUrl.pathname.includes('/dashboard')
        if(isOnDashboard){
            if(isLoggedIn) return true;
            return false;
        }
        if(isLoggedIn){
          return Response.redirect(new URL('/dashboard', nextUrl));
        }
        return true;

    },
    redirect({url, baseUrl}){

      if (url.startsWith("/")) return `${baseUrl}${url}`;

      if (new URL(url).origin === baseUrl) return url;

      return baseUrl;
    },
    
    
  },
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  providers: [],
  
  
} satisfies NextAuthConfig;